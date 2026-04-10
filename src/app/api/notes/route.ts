import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');

    let query = `SELECT id, title, content, tags,
                        category_id AS "categoryId",
                        category_name AS "categoryName",
                        created_at AS "createdAt", 
                        updated_at AS "updatedAt"
                 FROM notes WHERE user_id = $1 AND status = 'active'`;
    const values: any[] = [userId];

    if (categoryId) {
      query += ` AND category_id = $${values.length + 1}`;
      values.push(categoryId);
    }
    query += ` ORDER BY created_at DESC`;

    const result = await db.query(query, values);
    return NextResponse.json({ notes: result.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
