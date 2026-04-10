import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * POST /api/internal/graphify-sync
 * Graphify 编译完成后调用此端点，同步 graph.json 中的 edges 到 PostgreSQL note_links 表
 */
export async function POST(req: NextRequest) {
  // 验证 webhook 密钥
  const expected = process.env.GRAPHIFY_WEBHOOK_SECRET;
  if (!expected || expected.length < 16) {
    console.error('[CRITICAL] GRAPHIFY_WEBHOOK_SECRET 未配置或强度不足（需至少16位）');
    return NextResponse.json({ error: '服务器鉴权配置内部错误' }, { status: 500 });
  }

  const secret = req.headers.get('x-graphify-secret');
  if (!secret) {
    return NextResponse.json({ error: '缺少鉴权凭证' }, { status: 401 });
  }

  const a = Buffer.from(secret);
  const b = Buffer.from(expected);
  
  // 使用 timingSafeEqual 防止时序攻击
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!valid) {
    return NextResponse.json({ error: '无效的 Webhook 密钥' }, { status: 401 });
  }

  const graphPath = path.resolve(process.env.GRAPHIFY_OUT_DIR!, 'graph.json');
  try {
    await fs.promises.access(graphPath);
  } catch {
    return NextResponse.json({ error: 'graph.json 不存在' }, { status: 404 });
  }

  let graph: any;
  try {
    const data = await fs.promises.readFile(graphPath, 'utf-8');
    graph = JSON.parse(data);
  } catch (e: any) {
    console.error('[graphify-sync] graph.json 解析失败:', e.message);
    return NextResponse.json({ error: 'graph.json 解析失败' }, { status: 500 });
  }

  const edges: any[] = graph.edges || [];
  if (edges.length === 0) {
    return NextResponse.json({ success: true, synced: 0, total: 0 });
  }

  let synced = 0;
  let skipped = 0;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  // 优化：批量预查所有涉及的笔记（去重 & 格式检查）
  const allNoteIds = Array.from(new Set(
    edges.flatMap(e => [e.source, e.target]).filter(id => UUID_RE.test(id))
  ));

  const notesResult = await db.query(
    `SELECT id, user_id FROM notes WHERE id = ANY($1::uuid[]) AND status = 'active'`,
    [allNoteIds]
  );
  const noteOwnerMap = new Map(notesResult.rows.map(r => [r.id, r.user_id]));

  for (const edge of edges) {
    const { source, target } = edge;

    // 格式校验
    if (!UUID_RE.test(source) || !UUID_RE.test(target)) {
      skipped++;
      continue;
    }

    // 鉴权校验（批量结果内存化检查）
    const sourceUser = noteOwnerMap.get(source);
    const targetUser = noteOwnerMap.get(target);

    if (!sourceUser || !targetUser || sourceUser !== targetUser) {
      skipped++;
      continue; // 笔记不存在、不活跃或跨用户关联
    }

    // 检查用户是否手动撤销过（目前保留点查询，因涉及复合键冲突逻辑）
    const existing = await db.query(
      `SELECT id, user_deleted FROM note_links WHERE note_id = $1 AND target_note_id = $2`,
      [source, target]
    );

    if (existing.rows.length > 0 && existing.rows[0].user_deleted) {
      skipped++;
      continue;
    }

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
        source,
        target,
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
