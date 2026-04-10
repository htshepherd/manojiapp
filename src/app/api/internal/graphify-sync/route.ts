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
  // 验证 webhook 密钥（使用常量时间比较，防止时序攻击）
  const secret = req.headers.get('x-graphify-secret') ?? '';
  const expected = process.env.GRAPHIFY_WEBHOOK_SECRET ?? '';
  const a = Buffer.from(secret);
  const b = Buffer.from(expected);
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
  let synced = 0;
  let skipped = 0;

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const edge of edges) {
    // 基础格式校验：source/target 必须是合法 UUID
    if (!UUID_RE.test(edge.source) || !UUID_RE.test(edge.target)) {
      console.warn(`[graphify-sync] 跳过非法 edge（source/target 格式错误）: ${edge.source} -> ${edge.target}`);
      skipped++;
      continue;
    }

    // 关联数据校验：校验 source 和 target 属于同一用户，防止跨用户污染
    const notesCheck = await db.query(
      `SELECT id, user_id FROM notes WHERE id = ANY($1::uuid[]) AND status = 'active'`,
      [[edge.source, edge.target]]
    );
    if (notesCheck.rows.length !== 2) {
      // 两条笔记必须都存在
      skipped++;
      continue;
    }
    const [n1, n2] = notesCheck.rows;
    if (n1.user_id !== n2.user_id) {
      // 跨用户关联，直接丢弃
      console.warn(`[graphify-sync] 检测到跨用户关联，已拒绝: ${edge.source} -> ${edge.target}`);
      skipped++;
      continue;
    }

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
