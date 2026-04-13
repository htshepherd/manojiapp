import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { embedText, searchSimilar } from '@/lib/qdrant';
import { generatePreview } from '@/lib/text';
import { z } from 'zod';
import { handleError } from '@/lib/api-response';

const SearchSchema = z.object({
  query: z.string().min(1).max(6000),
  category_id: z.string().uuid().optional().nullable(),
  top_k: z.number().int().min(1).max(20).optional().default(10),
});

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();
    
    const result = SearchSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: '无效的搜索请求参数', details: result.error.format() }, { status: 400 });
    }
    const { query, category_id, top_k: topK } = result.data;

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
      queryVector, userId, category_id ?? undefined, topK
    );
    if (qdrantResults.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // 批量查询 PostgreSQL
    const noteIds = qdrantResults.map(r => r.note_id);
    const dbResult = await db.query(
      `SELECT id, title, content, tags, category_id, category_name, created_at
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
          id: note.id,
          title: note.title,
          content: note.content,
          tags: note.tags,
          categoryId: note.category_id,
          categoryName: note.category_name,
          score: r.score,
          createdAt: note.created_at
        };
      });

    return NextResponse.json({ results });
  } catch (err: any) {
    return handleError(err);
  }
}
