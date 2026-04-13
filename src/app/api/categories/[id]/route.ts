import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { renameRawDir, deleteRawDir } from '@/lib/filesystem';
import { deleteVectors } from '@/lib/qdrant';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const existing = await db.query(
      `SELECT * FROM categories WHERE id = $1 AND user_id = $2`, [id, userId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: '分类不存在或无权操作' }, { status: 403 });
    }
    const category = existing.rows[0];

    // 显式解析前端发来的字段
    const body = await req.json();
    const name = body.name || category.name;
    const granularity = body.granularity || category.granularity;
    const promptTemplate = body.promptTemplate || category.prompt_template;
    const linkThreshold = body.linkThreshold !== undefined ? body.linkThreshold : category.link_threshold;
    const synthesisTriggerCount = body.synthesisTriggerCount !== undefined ? body.synthesisTriggerCount : category.synthesis_trigger_count;

    let newRawDir = category.raw_dir;

    if (name && name !== category.name) {
      const dup = await db.query(
        `SELECT id FROM categories WHERE user_id = $1 AND name = $2 AND id != $3`,
        [userId, name, id]
      );
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: '分类名称已存在' }, { status: 400 });
      }
      newRawDir = renameRawDir(category.raw_dir, name);
      // 同步更新所有笔记中的冗余分类名称
      await db.query(
        `UPDATE notes SET category_name = $1 WHERE category_id = $2`,
        [name, id]
      );
    }

    // 执行更新，并强制返回 camelCase 字段
    const result = await db.query(
      `UPDATE categories SET
        name = $1,
        granularity = $2,
        prompt_template = $3,
        link_threshold = $4,
        synthesis_trigger_count = $5,
        raw_dir = $6,
        updated_at = NOW()
       WHERE id = $7 
       RETURNING 
        id, name, granularity,
        prompt_template AS "promptTemplate",
        link_threshold AS "linkThreshold",
        synthesis_trigger_count AS "synthesisTriggerCount",
        created_at AS "createdAt"`,
      [name, granularity, promptTemplate, linkThreshold, synthesisTriggerCount, newRawDir, id]
    );
    return NextResponse.json({ category: result.rows[0] });
  } catch (err: any) {
    console.error('Category Update Error:', err);
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const existing = await db.query(
      `SELECT * FROM categories WHERE id = $1 AND user_id = $2`, [id, userId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: '分类不存在或无权操作' }, { status: 403 });
    }
    const category = existing.rows[0];

    const notes = await db.query(
      `SELECT id, vector_id FROM notes WHERE category_id = $1`, [id]
    );
    const vectorIds = notes.rows.map((n: any) => n.vector_id).filter(Boolean);

    if (vectorIds.length > 0) await deleteVectors(vectorIds);
    deleteRawDir(category.raw_dir);

    await db.query(`DELETE FROM categories WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
