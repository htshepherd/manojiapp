import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '4'), 10);

    const result = await db.query(
      `SELECT id, 
              category_id AS "categoryId", 
              category_name AS "categoryName", 
              title, content, tags, 
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM notes WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC LIMIT $2`,
      [userId, limit]
    );
    return NextResponse.json({ notes: result.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
