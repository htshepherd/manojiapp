import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createRawDir } from '@/lib/filesystem';
import { z } from 'zod';
import { handleError } from '@/lib/api-response';

const CategorySchema = z.object({
  name: z.string().min(1).max(50),
  granularity: z.string().min(1),
  promptTemplate: z.string().min(10),
  linkThreshold: z.number().min(0).max(1).optional().default(0.75),
  synthesisTriggerCount: z.number().int().min(1).max(100).optional().default(5),
});

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
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();

    const validation = CategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: '无效的分参数', details: validation.error.format() }, { status: 400 });
    }
    const { name, granularity, promptTemplate, linkThreshold, synthesisTriggerCount } = validation.data;

    // 重名校验
    const dup = await db.query(
      `SELECT id FROM categories WHERE user_id = $1 AND name = $2`,
      [userId, name]
    );
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: '该分类名称已存在' }, { status: 400 });
    }

    const rawDir = await createRawDir(name);
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
    return handleError(err);
  }
}
