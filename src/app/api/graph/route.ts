import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');

    const outDir = process.env.GRAPHIFY_OUT_DIR;
    if (!outDir) {
      console.warn('[graph-api] GRAPHIFY_OUT_DIR 环境变量未配置，使用数据库模式。');
      return await fallbackFromDB(userId, categoryId);
    }

    const graphPath = path.resolve(outDir, 'graph.json');
    let graphify: any = null;
    try {
      await fs.promises.access(graphPath);
      const data = await fs.promises.readFile(graphPath, 'utf-8');
      graphify = JSON.parse(data);
    } catch (err) {
      console.warn('[graph-api] graph.json 不存在或解析失败，使用数据库 fallback:', err);
      return await fallbackFromDB(userId, categoryId);
    }

    // 查询当前用户的有效笔记，用于过滤（跨用户隔离）
    const userNotes = await db.query(
      `SELECT id, category_id FROM notes WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    const userNoteIds = new Set(userNotes.rows.map((n: any) => n.id));

    // 过滤出属于当前用户的节点
    let nodes = (graphify.nodes || []).filter((n: any) => userNoteIds.has(n.id));

    const validNodeIds = new Set(nodes.map((n: any) => n.id));

    // 过滤边（只保留两端都属于当前用户的边，且 source < target 去重）
    let edges = (graphify.edges || []).filter(
      (e: any) =>
        validNodeIds.has(e.source) &&
        validNodeIds.has(e.target) &&
        e.source < e.target
    );

    // 按分类过滤
    if (categoryId) {
      const catNodeIds = new Set(
        nodes.filter((n: any) => n.categoryId === categoryId).map((n: any) => n.id)
      );
      nodes = nodes.filter((n: any) => catNodeIds.has(n.id));
      edges = edges.filter(
        (e: any) => catNodeIds.has(e.source) || catNodeIds.has(e.target)
      );
    }

    return NextResponse.json({
      nodes,
      edges,
      generated_at: graphify.generated_at || null,
      source: 'graphify',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

// Fallback：Graphify 未运行时，直接从数据库构建图谱数据返回
async function fallbackFromDB(userId: string, categoryId: string | null) {
  const nodesResult = await db.query(
    `SELECT n.id, n.title, n.category_id AS "categoryId", n.category_name AS "categoryName",
            n.tags, n.created_at AS "createdAt",
            COUNT(nl.id) FILTER (WHERE nl.user_deleted = false) AS link_count
     FROM notes n
     LEFT JOIN note_links nl ON (nl.note_id = n.id OR nl.target_note_id = n.id)
     WHERE n.user_id = $1 AND n.status = 'active'
     GROUP BY n.id`,
    [userId]
  );

  let nodes = nodesResult.rows.map((n: any) => ({
    ...n,
    linkCount: parseInt(n.link_count) || 0,
  }));

  const validNodeIds = new Set(nodes.map((n: any) => n.id));

  const edgesResult = await db.query(
    `SELECT nl.id, nl.note_id AS source, nl.target_note_id AS target,
            nl.relation_type AS "relationType",
            nl.relation_confidence AS "relationConfidence",
            nl.similarity_score AS "similarityScore",
            nl.source_category_name AS "sourceCategoryName"
     FROM note_links nl
     JOIN notes n ON n.id = nl.note_id
     WHERE n.user_id = $1 AND nl.user_deleted = false
       AND nl.note_id < nl.target_note_id`,
    [userId]
  );

  let edges = edgesResult.rows.filter(
    (e: any) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
  );

  if (categoryId) {
    const catIds = new Set(nodes.filter((n: any) => n.categoryId === categoryId).map((n: any) => n.id));
    nodes = nodes.filter((n: any) => catIds.has(n.id));
    edges = edges.filter((e: any) => catIds.has(e.source) || catIds.has(e.target));
  }

  return NextResponse.json({
    nodes,
    edges,
    generated_at: new Date().toISOString(),
    source: 'database-fallback',
  });
}
