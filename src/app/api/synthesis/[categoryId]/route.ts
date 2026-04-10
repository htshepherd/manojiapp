import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  req: NextRequest,
  { params }: { params: { categoryId: string } }
) {
  try {
    const userId = await requireAuth(req);
    const { categoryId } = await params;

    const catResult = await db.query(
      `SELECT name, note_count FROM categories WHERE id = $1 AND user_id = $2`,
      [categoryId, userId]
    );
    if (catResult.rows.length === 0) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }
    const { name, note_count } = catResult.rows[0];

    // 读取 wiki 文件 (使用与 Graphify 相同的安全文件名逻辑)
    const safeFileName = name.replace(/[\/\\:*?"<>|]/g, '_');
    const wikiPath = path.resolve(
      process.env.GRAPHIFY_OUT_DIR || './graphify-out', 
      'wiki', 
      `${safeFileName}.md`
    );

    console.log(`[synthesis-api] 尝试读取 Wiki: ${wikiPath}`);

    const ai_content = fs.existsSync(wikiPath)
      ? fs.readFileSync(wikiPath, 'utf-8')
      : null;
    
    if (!ai_content) {
      console.warn(`[synthesis-api] Wiki 文件不存在或内容为空: ${wikiPath}`);
    }

    // 读取用户批注
    const synthResult = await db.query(
      `SELECT user_annotation, generated_at FROM synthesis WHERE category_id = $1`,
      [categoryId]
    );
    const synth = synthResult.rows[0];

    const synthesis = {
      id: synth?.id || `temp-${categoryId}`,
      categoryId,
      categoryName: name,
      aiContent: ai_content,
      userAnnotation: synth?.user_annotation || '',
      based_on_count: note_count, // wait, should be basedOnCount?
      basedOnCount: note_count,
      generatedAt: synth?.generated_at || null,
      updatedAt: synth?.updated_at || new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      synthesis
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
