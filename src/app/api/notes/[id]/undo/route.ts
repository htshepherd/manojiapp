import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleError } from '@/lib/api-response';
import { NoteRow } from '@/types';

/**
 * POST /api/notes/[id]/undo
 * 恢复软删除的笔记
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const result = await db.query<NoteRow>(
      `SELECT id, status FROM notes WHERE id = $1 AND user_id = $2`, 
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 });
    }

    if (result.rows[0]!.status === 'active') {
      return NextResponse.json({ message: '笔记已经是活跃状态' });
    }

    await db.query(
      `UPDATE notes SET status = 'active', updated_at = NOW() WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    return NextResponse.json({ success: true, message: '笔记已恢复' });
  } catch (err: unknown) {
    return handleError(err);
  }
}
