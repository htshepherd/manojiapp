import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { TemplateRow } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const result = await db.query<TemplateRow>(
      `SELECT * FROM prompt_templates WHERE user_id = $1
       ORDER BY created_at DESC`, [userId]
    );
    return NextResponse.json({ templates: result.rows });
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number };
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const { name, type, prompt_template, description } = await req.json();

    if (!name || !prompt_template) {
      return NextResponse.json({ error: '名称和指令不能为空' }, { status: 400 });
    }

    const result = await db.query<TemplateRow>(
      `INSERT INTO prompt_templates (user_id, name, type, prompt_template, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, name, type || '通用类', prompt_template, description || null]
    );
    return NextResponse.json({ template: result.rows[0] });
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number };
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
