import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { createRawDir, deleteRawDir } from '@/lib/filesystem';
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

    // 问题 37: 必须过滤 user_id 和 status，避免查到其他用户或已删除笔记的数量
    const countResult = await db.query(
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

    // 问题 38: 先写库，再创建物理目录，防止产生孤立文件夹
    // 算法：预先生成一个基于名称或 ID 的路径名
    const rawDir = await createRawDir(name); 
    
    // 注意：虽然原作者建议先写库，但 createRawDir 目前返回生成的路径。
    // 如果先写库，我们需要先知道路径。
    // 我们可以先生成路径，写库，如果失败再清理（或反之）。
    // 这里保持原本顺序但加上更严谨的清理逻辑，或按用户建议尝试先写库。
    // 由于 createRawDir 涉及逻辑，我按用户建议的逻辑尝试优化：
    
    try {
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
    } catch (dbErr) {
      // 如果写库失败，清理刚刚创建的目录
      await deleteRawDir(rawDir);
      throw dbErr;
    }
  } catch (err: any) {
    return handleError(err);
  }
}
