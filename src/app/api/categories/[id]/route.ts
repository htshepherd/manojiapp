import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { renameRawDir, deleteRawDir } from '@/lib/filesystem';
import { deleteVectors } from '@/lib/qdrant';
import { CategoryRow, NoteRow } from '@/types';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const existing = await db.query<CategoryRow>(
      `SELECT * FROM categories WHERE id = $1 AND user_id = $2`, [id, userId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: '分类不存在或无权操作' }, { status: 403 });
    }
    const category = existing.rows[0]!;

    const body = await req.json();
    const name = body.name || category.name;
    const granularity = body.granularity || category.granularity;
    const promptTemplate = body.promptTemplate || category.prompt_template;
    const linkThreshold = body.linkThreshold !== undefined ? body.linkThreshold : category.link_threshold;
    const synthesisTriggerCount = body.synthesisTriggerCount !== undefined ? body.synthesisTriggerCount : category.synthesis_trigger_count;

    let newRawDir = category.raw_dir;

    // 开启事务处理所有更新
    await db.query('BEGIN');
    try {
      if (name && name !== category.name) {
        const dup = await db.query(
          `SELECT id FROM categories WHERE user_id = $1 AND name = $2 AND id != $3`,
          [userId, name, id]
        );
        if (dup.rows.length > 0) {
          await db.query('ROLLBACK');
          return NextResponse.json({ error: '分类名称已存在' }, { status: 400 });
        }
        // 问题 35: 必须 await renameRawDir，否则 newRawDir 是 Promise 对象
        newRawDir = await renameRawDir(category.raw_dir, name);
        
        await db.query(
          `UPDATE notes SET category_name = $1 WHERE category_id = $2`,
          [name, id]
        );
      }

      await db.query(
        `UPDATE categories SET
          name = $1,
          granularity = $2,
          prompt_template = $3,
          link_threshold = $4,
          synthesis_trigger_count = $5,
          raw_dir = $6,
          updated_at = NOW()
         WHERE id = $7`,
        [name, granularity, promptTemplate, linkThreshold, synthesisTriggerCount, newRawDir, id]
      );
      
      await db.query('COMMIT');
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }

    const finalResult = await db.query<CategoryRow>(
      `SELECT id, name, granularity,
        prompt_template AS "promptTemplate",
        link_threshold AS "linkThreshold",
        synthesis_trigger_count AS "synthesisTriggerCount",
        created_at AS "createdAt"
       FROM categories WHERE id = $1`, [id]
    );
    return NextResponse.json({ category: finalResult.rows[0] });
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number };
    console.error('Category Update Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { id } = await params;

    const existing = await db.query<CategoryRow>(
      `SELECT * FROM categories WHERE id = $1 AND user_id = $2`, [id, userId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: '分类不存在或无权操作' }, { status: 403 });
    }
    const category = existing.rows[0]!;

    const notes = await db.query<NoteRow>(
      `SELECT id, vector_id FROM notes WHERE category_id = $1`, [id]
    );
    const vectorIds = notes.rows.map((n: NoteRow) => n.vector_id).filter((v): v is string => !!v);

    if (vectorIds.length > 0) await deleteVectors(vectorIds);
    // 问题 36: 必须 await deleteRawDir，否则物理目录不会被删除
    await deleteRawDir(category.raw_dir);

    await db.query(`DELETE FROM categories WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number };
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
