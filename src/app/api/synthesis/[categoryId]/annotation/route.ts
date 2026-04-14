import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { CategoryRow, SynthesisRow } from '@/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { categoryId } = await params;

    const catCheck = await db.query<CategoryRow>(
      `SELECT id FROM categories WHERE id = $1 AND user_id = $2`,
      [categoryId, userId]
    );
    if (catCheck.rows.length === 0) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    const { user_annotation } = await req.json();

    const result = await db.query<SynthesisRow>(
      `INSERT INTO synthesis (category_id, user_annotation, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (category_id) DO UPDATE
       SET user_annotation = $2, updated_at = NOW()
       RETURNING updated_at`,
      [categoryId, user_annotation]
    );

    return NextResponse.json({
      success: true,
      updated_at: result.rows[0]!.updated_at
    });
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number };
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
