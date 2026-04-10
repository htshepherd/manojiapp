import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateNote } from '@/lib/claude';
import { embedText, upsertVector } from '@/lib/qdrant';
import { writeRawNote } from '@/lib/filesystem';
import { incrementNoteCount } from '@/lib/noteCount';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { handleError } from '@/lib/api-response';

const GenerateSchema = z.object({
  category_id: z.string().uuid(),
  input_text: z.string().min(10).max(6000),
  overwrite_note_id: z.string().uuid().optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    console.log('>>> [API] Received generation request');
    const userId = await requireAuth(req);
    const body = await req.json();

    const validation = GenerateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: '无效的生成请求参数', details: validation.error.format() }, { status: 400 });
    }
    const { category_id, input_text, overwrite_note_id } = validation.data;

    // 环境检查
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes('xxxx')) {
        return NextResponse.json({ error: '请在 .env.local 中填入有效的 ANTHROPIC_API_KEY' }, { status: 500 });
    }

    const catResult = await db.query(
      `SELECT id, name, granularity, prompt_template, link_threshold, synthesis_trigger_count, raw_dir
       FROM categories WHERE id = $1 AND user_id = $2`,
      [category_id, userId]
    );
    if (catResult.rows.length === 0) {
      return NextResponse.json({ error: '找不到对应的分类' }, { status: 404 });
    }
    const category = catResult.rows[0];

    // 调用 AI
    console.log('>>> [AI] Calling Claude...');
    let generated;
    try {
        generated = await generateNote(category.prompt_template, input_text);
    } catch (aiErr: any) {
        console.error('>>> [AI ERROR]', aiErr);
        return NextResponse.json({ 
            error: `AI 提炼失败: ${aiErr.message}`,
            debug: '请检查 Claude API Key 或网络代理'
        }, { status: 500 });
    }

    // 越权写入防护：若为更正操作，必须先校验该笔记归属当前用户
    if (overwrite_note_id) {
      const ownerCheck = await db.query(
        `SELECT id FROM notes WHERE id = $1 AND user_id = $2 AND status = 'active'`,
        [overwrite_note_id, userId]
      );
      if (ownerCheck.rows.length === 0) {
        return NextResponse.json({ error: '无权操作该笔记' }, { status: 403 });
      }
    }

    const noteId = overwrite_note_id || uuidv4();
    const result = await db.query(
      `INSERT INTO notes
       (id, user_id, category_id, category_name, title, content, tags, source_text, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')
       ON CONFLICT (id) DO UPDATE SET
         title=EXCLUDED.title, content=EXCLUDED.content, tags=EXCLUDED.tags, 
         source_text=EXCLUDED.source_text, updated_at=NOW()
       RETURNING *`,
      [noteId, userId, category_id, category.name, generated.title, generated.content, generated.tags, input_text]
    );
    const note = result.rows[0];

    // 物理文件同步
    try {
        const rawFilePath = await writeRawNote(category.raw_dir, noteId, generated.title, category.name, new Date().toISOString(), generated.content);
        await db.query(`UPDATE notes SET raw_file_path = $1 WHERE id = $2`, [rawFilePath, noteId]);
    } catch (fsErr) {
        console.warn('>>> [FS WARNING]', fsErr);
    }

    // 向量化与知识图谱连线 (同步等待以确保不被框架强杀进程)
    if (process.env.EMBEDDING_API_KEY && !process.env.EMBEDDING_API_KEY.includes('xxxx')) {
        try {
            const v = await embedText(generated.content);
            const { searchSimilar, ensureCollection } = await import('@/lib/qdrant');
            
            // 确保向量集合存在
            await ensureCollection();
            
            await upsertVector(noteId, v, { note_id: noteId, user_id: userId, category_id });
            await db.query(`UPDATE notes SET vector_id = $1 WHERE id = $2`, [noteId, noteId]);

            // 如果是更正操作，先清理旧的系统推测链接
            if (overwrite_note_id) {
                await db.query(`DELETE FROM note_links WHERE note_id = $1 AND user_deleted = false`, [noteId]);
            }

            const threshold = category.link_threshold || 0.6;
            const similarNotes = await searchSimilar(v, userId, undefined, 10); 
            
            for (const sim of similarNotes) {
                if (sim.note_id === noteId || sim.score < threshold) continue;
                
                await db.query(
                    `INSERT INTO note_links 
                     (id, note_id, target_note_id, relation_type, relation_confidence, similarity_score, source_category_name)
                     VALUES ($1, $2, $3, 'supplement', 'inferred', $4, $5)
                     ON CONFLICT DO NOTHING`,
                    [uuidv4(), noteId, sim.note_id, sim.score, category.name]
                );
            }
        } catch (e) {
            console.error('>>> [VECTOR/LINK ERROR]', e);
        }
    }

    if (!overwrite_note_id) await incrementNoteCount(category_id);

    return NextResponse.json({ 
        note, 
        pending_until: new Date(Date.now() + 5000).toISOString() 
    });
  } catch (globalErr: any) {
    return handleError(globalErr);
  }
}
