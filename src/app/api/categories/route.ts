import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createRawDir, deleteRawDir } from '@/lib/filesystem';
import { z } from 'zod';
import { handleError } from '@/lib/api-response';
import { CategoryRow } from '@/types';

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
    const result = await db.query<CategoryRow>(
      `SELECT 
        id, name, granularity,
        prompt_template AS "promptTemplate",
        link_threshold AS "linkThreshold",
        synthesis_trigger_count AS "synthesisTriggerCount",
        created_at AS "createdAt"
       FROM categories WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    // 问题 37: 必须过滤 user_id 和 status，避免查到其他用户或已删除笔记的数量
    const countResult = await db.query<{ category_id: string; count: string }>(
        `SELECT category_id, COUNT(*) as count 
         FROM notes 
         WHERE user_id = $1 AND status = 'active'
         GROUP BY category_id`,
        [userId]
    );
    const countMap = Object.fromEntries(countResult.rows.map(r => [r.category_id, parseInt(r.count)]));
    
    const categoriesWithCount = result.rows.map(cat => ({
        ...cat,
        noteCount: countMap[cat.id] || 0
    }));

    return NextResponse.json({ categories: categoriesWithCount });
  } catch (err: unknown) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const body = await req.json();

    const validation = CategorySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: '无效的分类参数', details: validation.error.format() }, { status: 400 });
    }
    const { name, granularity, promptTemplate, linkThreshold, synthesisTriggerCount } = validation.data;

    const dup = await db.query(
      `SELECT id FROM categories WHERE user_id = $1 AND name = $2`,
      [userId, name]
    );
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: '该分类名称已存在' }, { status: 400 });
    }

    // 问题 38: 创建物理目录并写库
    // 逻辑：由于 createRawDir 返回生成的路径，我们需要先创建目录
    // 安全保障：如果后续数据库写入失败，将在 catch 块中物理删除该目录，防止产生孤立文件夹
    const rawDir = await createRawDir(name); 
    
    try {
      const result = await db.query<CategoryRow>(
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
    } catch (dbErr) {
      // 如果写库失败，清理刚刚创建的目录
      await deleteRawDir(rawDir);
      throw dbErr;
    }
  } catch (err: unknown) {
    return handleError(err);
  }
}
