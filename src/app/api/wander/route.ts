import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { qdrant } from "@/lib/qdrant";
import { Note } from "@/types";

const COLLECTION = process.env.QDRANT_COLLECTION!;

interface WanderRequest {
  excludeIds: string[];
  lastNoteVectorId?: string;
}

interface WanderNote {
  id: string;
  title: string;
  preview: string;
  categoryName: string;
  tags: string[];
  createdAt: string;
  lastViewedAt: string | null;
  vectorId: string;
  reason: string;
  reasonType: 'dormant' | 'related' | 'random';
}

function stripMarkdown(text: string): string {
  return text
    .replace(/[#*`~_\[\]()]/g, "")
    .replace(/\n+/g, " ")
    .trim();
}

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    userId = await requireAuth(request);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unauthorized" }, { status: error.status || 401 });
  }

  const { excludeIds = [], lastNoteVectorId }: WanderRequest = await request.json();

  try {
    const finalNotes: WanderNote[] = [];
    const usedIds = new Set<string>(excludeIds);

    // 1. 沉睡推荐 (2条)
    const dormantQuery = `
      SELECT id, title, content, category_name as "categoryName", tags, vector_id as "vectorId", created_at as "createdAt", last_viewed_at as "lastViewedAt"
      FROM notes
      WHERE user_id = $1 AND status = 'active'
      ${usedIds.size > 0 ? `AND id NOT IN (${Array.from(usedIds).map((id) => `'${id}'`).join(',')})` : ''}
      ORDER BY last_viewed_at ASC NULLS FIRST, created_at ASC
      LIMIT 4
    `;
    const dormantResult = await db.query(dormantQuery, [userId]);
    const dormantNotes = dormantResult.rows.slice(0, 2).map((row: any) => {
      const lastViewedAt = row.lastViewedAt;
      const createdAt = row.createdAt;
      const days = lastViewedAt
        ? Math.floor((Date.now() - new Date(lastViewedAt).getTime()) / 86400000)
        : Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);

      return {
        ...row,
        preview: stripMarkdown(row.content).slice(0, 120),
        reason: `这条笔记已沉睡 ${days} 天了`,
        reasonType: 'dormant' as const
      };
    });
    
    dormantNotes.forEach(n => {
        finalNotes.push(n);
        usedIds.add(n.id);
    });

    // 2. 语义关联 (2条)
    if (lastNoteVectorId && finalNotes.length < 5) {
      try {
        const points = await qdrant.retrieve(COLLECTION, { ids: [lastNoteVectorId], with_vector: true });
        if (points.length > 0 && points[0].vector) {
          const vector = points[0].vector as number[];
          const results = await qdrant.search(COLLECTION, {
            vector,
            filter: {
              must: [{ key: 'user_id', match: { value: userId } }]
            },
            limit: 10,
            with_payload: true
          });

          const relatedIds = results
            .map(r => r.payload?.note_id as string)
            .filter(id => id && !usedIds.has(id));

          if (relatedIds.length > 0) {
            const relatedQuery = `
              SELECT id, title, content, category_name as "categoryName", tags, vector_id as "vectorId", created_at as "createdAt", last_viewed_at as "lastViewedAt"
              FROM notes
              WHERE id IN (${relatedIds.map(id => `'${id}'`).join(',')})
              LIMIT 2
            `;
            const relatedResult = await db.query(relatedQuery);
            relatedResult.rows.forEach((row: any) => {
              if (finalNotes.length < 4) { // 保持比例，最多2条来自语义
                finalNotes.push({
                  ...row,
                  preview: stripMarkdown(row.content).slice(0, 120),
                  reason: '与你刚刚阅读的笔记属于同一知识域',
                  reasonType: 'related' as const
                });
                usedIds.add(row.id);
              }
            });
          }
        }
      } catch (err) {
        console.error('[API/wander] Qdrant search failed:', err);
      }
    }

    // 3. 随机补充 (补齐 5 条)
    if (finalNotes.length < 5) {
      const remainingCount = 5 - finalNotes.length;
      const randomQuery = `
        SELECT id, title, content, category_name as "categoryName", tags, vector_id as "vectorId", created_at as "createdAt", last_viewed_at as "lastViewedAt"
        FROM notes
        WHERE user_id = $1 AND status = 'active'
        ${usedIds.size > 0 ? `AND id NOT IN (${Array.from(usedIds).map((id) => `'${id}'`).join(',')})` : ''}
        ORDER BY RANDOM()
        LIMIT $2
      `;
      const randomResult = await db.query(randomQuery, [userId, remainingCount]);
      randomResult.rows.forEach((row: any) => {
        finalNotes.push({
          ...row,
          preview: stripMarkdown(row.content).slice(0, 120),
          reason: '随机为你发现了这条笔记',
          reasonType: 'random' as const
        });
        usedIds.add(row.id);
      });
    }

    return NextResponse.json({ notes: finalNotes });
  } catch (error) {
    console.error('[API/wander] Error:', error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
