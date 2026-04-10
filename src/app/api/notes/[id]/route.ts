import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const noteResult = await db.query(
      `SELECT 
        id, title, content, tags, status,
        source_text AS "sourceText",
        category_id AS "categoryId",
        category_name AS "categoryName",
        vector_id AS "vectorId",
        raw_file_path AS "rawFilePath",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
       FROM notes WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (noteResult.rows.length === 0) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }
    const note = noteResult.rows[0];

    // 拉取双向关联并去重
    const linksResult = await db.query(
      `SELECT DISTINCT ON (
          CASE WHEN nl.note_id = $1 THEN nl.target_note_id ELSE nl.note_id END
       )
          nl.id,
          CASE WHEN nl.note_id = $1 THEN nl.target_note_id ELSE nl.note_id END AS "targetNoteId",
          nl.relation_type AS "relationType",
          nl.relation_confidence AS "relationConfidence",
          nl.source_category_name AS "sourceCategoryName",
          nl.similarity_score AS "similarityScore",
          n.title AS "targetNoteTitle"
       FROM note_links nl
       JOIN notes n ON n.id = CASE WHEN nl.note_id = $1 THEN nl.target_note_id ELSE nl.note_id END
       WHERE (nl.note_id = $1 OR nl.target_note_id = $1) AND nl.user_deleted = false
       ORDER BY
          CASE WHEN nl.note_id = $1 THEN nl.target_note_id ELSE nl.note_id END,
          nl.similarity_score DESC`,
      [id]
    );

    return NextResponse.json({ note: { ...note, links: linksResult.rows } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const noteResult = await db.query(
      `SELECT raw_file_path, vector_id FROM notes WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (noteResult.rows.length === 0) {
      return NextResponse.json({ error: '笔记不存在或无权操作' }, { status: 403 });
    }
    const { raw_file_path, vector_id } = noteResult.rows[0];

    if (vector_id) {
      const { deleteVectors } = await import('@/lib/qdrant');
      await deleteVectors([vector_id]);
    }

    if (raw_file_path) {
      const fs = await import('fs/promises');
      try {
        await fs.unlink(raw_file_path);
      } catch (e) {
        console.warn('File deletion failed:', e);
      }
    }

    await db.query(`DELETE FROM notes WHERE id = $1 AND user_id = $2`, [id, userId]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
