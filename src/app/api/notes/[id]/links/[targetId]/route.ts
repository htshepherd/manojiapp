import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; targetId: string } }
) {
  try {
    const userId = await requireAuth(req);
    const { id, targetId } = await params;

    const noteCheck = await db.query(
      `SELECT id FROM notes WHERE id = $1 AND user_id = $2`, [id, userId]
    );
    if (noteCheck.rows.length === 0) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    const linkCheck = await db.query(
      `SELECT id FROM note_links WHERE note_id = $1 AND target_note_id = $2`,
      [id, targetId]
    );
    if (linkCheck.rows.length === 0) {
      return NextResponse.json({ error: '关联不存在' }, { status: 404 });
    }

    // 双向标记 user_deleted
    await db.query(
      `UPDATE note_links SET user_deleted = true
       WHERE (note_id = $1 AND target_note_id = $2)
          OR (note_id = $2 AND target_note_id = $1)`,
      [id, targetId]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
