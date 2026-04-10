import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { seedDefaultTemplates } from '@/scripts/seed-templates';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    await seedDefaultTemplates(userId);  // 幂等初始化
    const result = await db.query(
      `SELECT * FROM prompt_templates WHERE user_id = $1
       ORDER BY created_at DESC`, [userId]
    );
    return NextResponse.json({ templates: result.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const { name, type, prompt_template, description } = await req.json();

    if (!name || !prompt_template) {
      return NextResponse.json({ error: '名称和指令不能为空' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO prompt_templates (user_id, name, type, prompt_template, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, name, type || '通用类', prompt_template, description || null]
    );
    return NextResponse.json({ template: result.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
