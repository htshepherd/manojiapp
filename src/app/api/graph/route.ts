import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import { GraphNode, GraphEdge, NoteRow, NoteLinkRow, Note } from '@/types';

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
    let graphify: { nodes: GraphNode[]; edges: GraphEdge[]; generated_at: string } | null = null;
    try {
      await fs.promises.access(graphPath);
      const data = await fs.promises.readFile(graphPath, 'utf-8');
      graphify = JSON.parse(data);
    } catch (err) {
      console.warn('[graph-api] graph.json 不存在或解析失败，使用数据库 fallback:', err);
      return await fallbackFromDB(userId, categoryId);
    }

    if (!graphify) return await fallbackFromDB(userId, categoryId);

    // 查询当前用户的有效笔记，用于过滤（跨用户隔离）
    const userNotes = await db.query<NoteRow>(
      `SELECT id, category_id FROM notes WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );
    const userNoteIds = new Set(userNotes.rows.map(n => n.id));

    // 过滤出属于当前用户的节点
    let nodes = (graphify.nodes || []).filter(n => userNoteIds.has(n.id));

    const validNodeIds = new Set(nodes.map(n => n.id));

    // 过滤边（只保留两端都属于当前用户的边，且 source < target 去重）
    let edges = (graphify.edges || []).filter(
      e =>
        validNodeIds.has(e.source) &&
        validNodeIds.has(e.target) &&
        e.source < e.target
    );

    // 按分类过滤
    if (categoryId) {
      const catNodeIds = new Set(
        nodes.filter(n => n.categoryId === categoryId).map(n => n.id)
      );
      nodes = nodes.filter(n => catNodeIds.has(n.id));
      edges = edges.filter(
        e => catNodeIds.has(e.source) || catNodeIds.has(e.target)
      );
    }

    return NextResponse.json({
      nodes,
      edges,
      generated_at: graphify.generated_at || null,
      source: 'graphify',
    });
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number };
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

// Fallback：Graphify 未运行时，直接从数据库构建图谱数据返回
async function fallbackFromDB(userId: string, categoryId: string | null) {
  const nodesResult = await db.query<NoteRow & { link_count: string }>(
    `SELECT n.id, n.title, n.content, n.status, n.category_id AS "categoryId", n.category_name AS "categoryName",
            n.tags, n.created_at AS "createdAt", n.updated_at AS "updatedAt",
            COUNT(nl.id) FILTER (WHERE nl.user_deleted = false) AS link_count
     FROM notes n
     LEFT JOIN note_links nl ON (nl.note_id = n.id OR nl.target_note_id = n.id)
     WHERE n.user_id = $1 AND n.status = 'active'
     GROUP BY n.id`,
    [userId]
  );

  let nodes: (Note & { linkCount: number })[] = nodesResult.rows.map(n => ({
    id: n.id,
    userId: n.user_id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categoryId: (n as any).categoryId, // From SQL alias
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categoryName: (n as any).categoryName, // From SQL alias
    title: n.title,
    content: n.content,
    tags: n.tags || [],
    status: n.status,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: (n as any).createdAt, // From SQL alias
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updatedAt: (n as any).updatedAt || n.updated_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    linkCount: parseInt((n as any).link_count) || 0,
  }));

  const validNodeIds = new Set(nodes.map(n => n.id));

  const edgesResult = await db.query<NoteLinkRow & { source: string; target: string }>(
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
    e => validNodeIds.has(e.source) && validNodeIds.has(e.target)
  );

  if (categoryId) {
    const catIds = new Set(nodes.filter(n => n.categoryId === categoryId).map(n => n.id));
    nodes = nodes.filter(n => catIds.has(n.id));
    edges = edges.filter(e => catIds.has(e.source) || catIds.has(e.target));
  }

  return NextResponse.json({
    nodes,
    edges,
    generated_at: new Date().toISOString(),
    source: 'database-fallback',
  });
}
