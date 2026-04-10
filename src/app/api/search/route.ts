import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { embedText, searchSimilar } from '@/lib/qdrant';
import { generatePreview } from '@/lib/text';

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const { query, category_id, top_k = 10 } = await req.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: '搜索词不能为空' }, { status: 400 });
    }
    const topK = Math.min(top_k, 20);

    // 向量化查询词
    let queryVector: number[];
    try {
      queryVector = await embedText(query);
    } catch (error) {
      console.error('Embedding failed:', error);
      return NextResponse.json(
        { error: '搜索暂时不可用，请稍后重试' }, { status: 500 }
      );
    }

    // Qdrant 语义检索
    const qdrantResults = await searchSimilar(
      queryVector, userId, category_id, topK
    );
    if (qdrantResults.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 批量查询 PostgreSQL
    const noteIds = qdrantResults.map(r => r.note_id);
    const dbResult = await db.query(
      `SELECT id, title, content, tags, category_name, created_at
       FROM notes
       WHERE id = ANY($1) AND status = 'active' AND user_id = $2`,
      [noteIds, userId]
    );

    const noteMap = new Map(dbResult.rows.map((n: any) => [n.id, n]));

    // 按 Qdrant score 顺序排列
    const results = qdrantResults
      .filter(r => noteMap.has(r.note_id))
      .map(r => {
        const note = noteMap.get(r.note_id);
        return {
          noteId: note.id,
          title: note.title,
          preview: generatePreview(note.content, 100),
          tags: note.tags,
          categoryName: note.category_name,
          similarityScore: r.score,
          createdAt: note.created_at
        };
      });

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
