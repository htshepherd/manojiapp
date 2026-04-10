import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { handleError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    let query = `SELECT id, title, tags,
                        LEFT(content, 200) AS preview,
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
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, offset);

    const result = await db.query(query, values);

    // 同时查总数（用于前端分页）
    let countQuery = `SELECT COUNT(*) FROM notes WHERE user_id = $1 AND status = 'active'`;
    const countValues: any[] = [userId];
    if (categoryId) {
      countQuery += ` AND category_id = $2`;
      countValues.push(categoryId);
    }
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

    return NextResponse.json({
      notes: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err: any) {
    return handleError(err);
  }
}
