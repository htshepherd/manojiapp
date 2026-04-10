import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createRawDir } from '@/lib/filesystem';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    // 移除 icon 字段
    const result = await db.query(
      `SELECT 
        id, name, granularity,
        prompt_template AS "promptTemplate",
        link_threshold AS "linkThreshold",
        synthesis_trigger_count AS "synthesisTriggerCount",
        created_at AS "createdAt"
       FROM categories WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const countResult = await db.query(
        `SELECT category_id, COUNT(*) as count FROM notes GROUP BY category_id`
    );
    const countMap = Object.fromEntries(countResult.rows.map(r => [r.category_id, parseInt(r.count)]));
    
    const categoriesWithCount = result.rows.map(cat => ({
        ...cat,
        noteCount: countMap[cat.id] || 0
    }));

    return NextResponse.json({ categories: categoriesWithCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const {
      name, granularity, promptTemplate,
      linkThreshold = 0.75, synthesisTriggerCount = 5
    } = await req.json();

    // 基础校验：只针对核心字段
    if (!name || !granularity || !promptTemplate) {
      return NextResponse.json({ error: '分类名称、粒度和提炼指令不能为空' }, { status: 400 });
    }

    // 重名校验
    const dup = await db.query(
      `SELECT id FROM categories WHERE user_id = $1 AND name = $2`,
      [userId, name]
    );
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: '该分类名称已存在' }, { status: 400 });
    }

    const rawDir = createRawDir(name);
    const result = await db.query(
      `INSERT INTO categories
       (user_id, name, granularity, prompt_template, link_threshold, synthesis_trigger_count, raw_dir)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING 
        id, name, granularity,
        prompt_template AS "promptTemplate",
        link_threshold AS "linkThreshold",
        synthesis_trigger_count AS "synthesisTriggerCount",
        created_at AS "createdAt"`,
      [userId, name, granularity, promptTemplate, linkThreshold, synthesisTriggerCount, rawDir]
    );
    return NextResponse.json({ category: result.rows[0] }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
