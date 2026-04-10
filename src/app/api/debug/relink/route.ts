import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { qdrant, searchSimilar } from '@/lib/qdrant';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const notesResult = await db.query(
      `SELECT id, user_id, category_id, category_name, vector_id FROM notes WHERE vector_id IS NOT NULL`
    );
    const notes = notesResult.rows;

    if (notes.length === 0) {
      return NextResponse.json({ message: 'No notes with vectors found.' });
    }

    let totalLinksCreated = 0;

    for (const note of notes) {
      // Get the vector for this note from Qdrant
      const pointRes = await qdrant.retrieve(process.env.QDRANT_COLLECTION!, {
        ids: [note.vector_id],
        with_vector: true,
        with_payload: true,
      });

      if (pointRes.length === 0 || !pointRes[0].vector) continue;

      const rawVec = pointRes[0].vector;
      const vector: number[] = Array.isArray(rawVec) ? rawVec : (rawVec as any).default;

      // Search for similar notes across the user's library
      const similarNotes = await searchSimilar(vector, note.user_id, undefined, 10);

      // Get category threshold
      const catResult = await db.query(
        `SELECT link_threshold FROM categories WHERE id = $1`,
        [note.category_id]
      );
      const threshold = catResult.rows[0]?.link_threshold || 0.6;

      for (const sim of similarNotes) {
        if (sim.note_id === note.id || sim.score < threshold) continue;

        const result = await db.query(
          `INSERT INTO note_links 
           (id, note_id, target_note_id, relation_type, relation_confidence, similarity_score, source_category_name)
           VALUES ($1, $2, $3, 'supplement', 'inferred', $4, $5)
           ON CONFLICT DO NOTHING
           RETURNING id`,
          [uuidv4(), note.id, sim.note_id, sim.score, note.category_name]
        );

        if (result.rows.length > 0) {
          totalLinksCreated++;
          console.log(`>>> Linked: ${note.id.substring(0, 8)} -> ${sim.note_id.substring(0, 8)} (score: ${sim.score.toFixed(3)})`);
        }
      }
    }

    const allLinks = await db.query('SELECT COUNT(*) FROM note_links');

    return NextResponse.json({
      success: true,
      notesProcessed: notes.length,
      linksCreated: totalLinksCreated,
      totalLinksInDB: parseInt(allLinks.rows[0].count),
    });
  } catch (e: any) {
    console.error('>>> [RELINK ERROR]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
