import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const existing = await db.query(
      `SELECT id FROM prompt_templates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    const { name, type, prompt_template, description } = await req.json();
    const result = await db.query(
      `UPDATE prompt_templates
       SET name = COALESCE($1, name),
           type = COALESCE($2, type),
           prompt_template = COALESCE($3, prompt_template),
           description = COALESCE($4, description),
           updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, type, prompt_template, description, id]
    );
    return NextResponse.json({ template: result.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const existing = await db.query(
      `SELECT id FROM prompt_templates WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }

    await db.query(`DELETE FROM prompt_templates WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
