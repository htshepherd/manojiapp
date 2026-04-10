import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { qdrant } from '@/lib/qdrant';

export async function GET(req: NextRequest) {
  try {
    const notesResult = await db.query('SELECT id, title, vector_id FROM notes');
    const linksResult = await db.query('SELECT * FROM note_links');
    
    let qdrantStatus = 'Checking...';
    let qdrantCollections = null;
    let pointsCount = -1;
    try {
        qdrantCollections = await qdrant.getCollections();
        qdrantStatus = 'Connected';
        const col = await qdrant.getCollection(process.env.QDRANT_COLLECTION!);
        pointsCount = col.vectors_count || 0;
    } catch (e: any) {
        qdrantStatus = `Error: ${e.message}`;
    }

    let searchResults: any = [];
    if (pointsCount > 0) {
        try {
            // Get the vector for the first note to test similarity
            const testNote = notesResult.rows[0];
            const pointRes = await qdrant.retrieve(process.env.QDRANT_COLLECTION!, { ids: [testNote.vector_id], with_vector: true, with_payload: true });
            
            if (pointRes.length > 0 && pointRes[0].vector) {
                const vector = Array.isArray(pointRes[0].vector) ? pointRes[0].vector : (pointRes[0].vector as any).default;
                const userId = pointRes[0].payload?.user_id as string;
                
                const { searchSimilar } = await import('@/lib/qdrant');
                searchResults = await searchSimilar(vector, userId, undefined, 5);
            }
        } catch (e: any) {
            searchResults = { error: e.message };
        }
    }

    return NextResponse.json({
      db_notes: notesResult.rows.map(r => ({ ...r, title: r.title.substring(0, 20) })),
      db_links: linksResult.rows,
      searchResults,
      meta: {
        qdrantStatus,
        qdrantCollections,
        pointsCount
      }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message });
  }
}
