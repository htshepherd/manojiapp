import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { deleteVector } from '@/lib/qdrant';
import { deleteRawNote } from '@/lib/filesystem';
import { decrementNoteCount } from '@/lib/noteCount';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const result = await db.query(
      `SELECT * FROM notes WHERE id = $1 AND user_id = $2`, [id, userId]
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }
    const note = result.rows[0];

    if (note.raw_file_path) deleteRawNote(note.raw_file_path);
    if (note.vector_id) await deleteVector(note.vector_id);

    await db.query(`DELETE FROM notes WHERE id = $1`, [id]);
    await decrementNoteCount(note.category_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
