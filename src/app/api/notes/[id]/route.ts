import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleError } from '@/lib/api-response';

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
        category_id AS "categoryId",
        category_name AS "categoryName",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
       FROM notes WHERE id = $1 AND user_id = $2 AND status = 'active'`,
      [id, userId]
    );
    if (noteResult.rows.length === 0) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }
    const note = noteResult.rows[0];

    // 拉取双向关联并去重，同时限制关联笔记必须属于当前用户且为活跃状态
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
         AND n.user_id = $2
         AND n.status = 'active'
       WHERE (nl.note_id = $1 OR nl.target_note_id = $1) AND nl.user_deleted = false
       ORDER BY
          CASE WHEN nl.note_id = $1 THEN nl.target_note_id ELSE nl.note_id END,
          nl.similarity_score DESC`,
      [id, userId]
    );

    return NextResponse.json({ note: { ...note, links: linksResult.rows } });
  } catch (err: any) {
    return handleError(err);
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

    await db.query(`DELETE FROM notes WHERE id = $1 AND user_id = $2`, [id, userId]);

    // DB 删除成功后，异步进行外部资源清理（即使失败也不影响主流程结果）
    // 注意：由于已经从 DB 删除了，即使清理失败，用户也看不见该笔记了。
    if (vector_id) {
      const { deleteVectors } = await import('@/lib/qdrant');
      deleteVectors([vector_id]).catch(e => console.error('[Cleanup] Qdrant vector deletion failed:', e));
    }

    if (raw_file_path) {
      const fs = await import('fs/promises');
      fs.unlink(raw_file_path).catch(e => console.error('[Cleanup] File deletion failed:', e));
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return handleError(err);
  }
}
