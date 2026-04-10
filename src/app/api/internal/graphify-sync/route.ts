import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

/**
 * POST /api/internal/graphify-sync
 * Graphify 编译完成后调用此端点，同步 graph.json 中的 edges 到 PostgreSQL note_links 表
 */
export async function POST(req: NextRequest) {
  // 验证 webhook 密钥
  const secret = req.headers.get('x-graphify-secret');
  if (secret !== process.env.GRAPHIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: '无效的 Webhook 密钥' }, { status: 401 });
  }

  const graphPath = path.resolve(process.env.GRAPHIFY_OUT_DIR!, 'graph.json');
  if (!fs.existsSync(graphPath)) {
    return NextResponse.json({ error: 'graph.json 不存在' }, { status: 404 });
  }

  let graph: any;
  try {
    graph = JSON.parse(fs.readFileSync(graphPath, 'utf-8'));
  } catch (e: any) {
    console.error('[graphify-sync] graph.json 解析失败:', e.message);
    return NextResponse.json({ error: 'graph.json 解析失败' }, { status: 500 });
  }

  const edges: any[] = graph.edges || [];
  let synced = 0;
  let skipped = 0;

  for (const edge of edges) {
    // 跳过用户已手动撤销的链接（user_deleted = true）
    const existing = await db.query(
      `SELECT id, user_deleted FROM note_links WHERE note_id = $1 AND target_note_id = $2`,
      [edge.source, edge.target]
    );

    if (existing.rows.length > 0 && existing.rows[0].user_deleted) {
      skipped++;
      continue; // 用户已撤销，不覆盖
    }

    // 将 Graphify 的 relation_confidence 映射到合法的 relation_type
    const relationType = mapRelationType(edge.relationType, edge.relationConfidence);

    await db.query(
      `INSERT INTO note_links 
       (id, note_id, target_note_id, relation_type, relation_confidence, similarity_score, source_category_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (note_id, target_note_id) 
       DO UPDATE SET 
         relation_type = EXCLUDED.relation_type,
         relation_confidence = EXCLUDED.relation_confidence,
         similarity_score = EXCLUDED.similarity_score
       WHERE note_links.user_deleted = false`,
      [
        edge.id,
        edge.source,
        edge.target,
        relationType,
        mapConfidence(edge.relationConfidence),
        edge.similarityScore || 0,
        edge.sourceCategoryName || '',
      ]
    );
    synced++;
  }

  console.log(`[graphify-sync] 同步完成：${synced} 条新增/更新，${skipped} 条跳过（用户已撤销）`);

  return NextResponse.json({
    success: true,
    synced,
    skipped,
    total: edges.length,
    generated_at: graph.generated_at,
  });
}

/**
 * relation_type CHECK: ('supplement', 'extend', 'conflict', 'example')
 */
function mapRelationType(relationType: string, _confidence: string): string {
  if (relationType === 'conflict') return 'conflict';
  if (relationType === 'example') return 'example';
  if (relationType === 'extend') return 'extend';
  return 'supplement';
}

/**
 * relation_confidence CHECK: ('direct', 'inferred', 'uncertain')
 */
function mapConfidence(confidence: string): string {
  if (confidence === 'direct') return 'direct';
  if (confidence === 'uncertain') return 'uncertain';
  return 'inferred'; // default
}
