import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleError } from '@/lib/api-response';
import { NotePreview } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 10);

    const result = await db.query<NotePreview>(
      `SELECT id, 
              category_id AS "categoryId", 
              category_name AS "categoryName", 
              title, tags, 
              SUBSTRING(content, 1, 100) AS preview,
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM notes WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return NextResponse.json({ notes: result.rows });
  } catch (err: unknown) {
    return handleError(err);
  }
}
