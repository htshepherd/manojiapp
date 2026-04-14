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

  // 问题 5: 先 HMAC hash 再比较，彻底消除长度泄露
  // a.length === b.length 短路运算会泄露密锂长度信息
  const compareKey = 'graphify-secret-compare';
  const aHash = crypto.createHmac('sha256', compareKey).update(secret).digest();
  const bHash = crypto.createHmac('sha256', compareKey).update(expected).digest();
  const valid = crypto.timingSafeEqual(aHash, bHash);
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

  // 批量预查所有涉及的笔记（去重 & 格式检查）
  const allNoteIds = Array.from(new Set(
    edges.flatMap(e => [e.source, e.target]).filter(id => UUID_RE.test(id))
  ));

  const notesResult = await db.query(
    `SELECT id, user_id FROM notes WHERE id = ANY($1::uuid[]) AND status = 'active'`,
    [allNoteIds]
  );
  const noteOwnerMap = new Map(notesResult.rows.map(r => [r.id, r.user_id]));

  // 问题 4: 消除 N+1 —— 批量预查所有 user_deleted=true 的连线
  // 使用 unnest 双列 + JOIN 安全参数化，避免逐条 SELECT
  const validPairs = edges.filter(e => UUID_RE.test(e.source) && UUID_RE.test(e.target));
  const deletedPairSet = new Set<string>();
  if (validPairs.length > 0) {
    const sources = validPairs.map(e => e.source);
    const targets = validPairs.map(e => e.target);
    const deletedResult = await db.query(
      `SELECT nl.note_id, nl.target_note_id
       FROM note_links nl
       JOIN unnest($1::uuid[], $2::uuid[]) AS p(src, tgt)
         ON nl.note_id = p.src AND nl.target_note_id = p.tgt
       WHERE nl.user_deleted = true`,
      [sources, targets]
    );
    deletedResult.rows.forEach((r: any) => {
      deletedPairSet.add(`${r.note_id}::${r.target_note_id}`);
    });
  }

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

    // 用户已手动撤销过此连线，跳过（O(1) Map 查找，无额外 DB 查询）
    if (deletedPairSet.has(`${source}::${target}`)) {
      skipped++;
      continue;
    }

    const relationType = mapRelationType(edge.relationType, edge.relationConfidence);

    // 问题 11: id 改用数据库端 gen_random_uuid()，避免 graphify 生成的 id 与已有主键碰撞
    await db.query(
      `INSERT INTO note_links 
       (id, note_id, target_note_id, relation_type, relation_confidence, similarity_score, source_category_name)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
       ON CONFLICT (note_id, target_note_id) 
       DO UPDATE SET 
         relation_type = EXCLUDED.relation_type,
         relation_confidence = EXCLUDED.relation_confidence,
         similarity_score = EXCLUDED.similarity_score
       WHERE note_links.user_deleted = false`,
      [
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
