import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import { handleError } from '@/lib/api-response';

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

    // 读取 wiki 文件 (使用与 Graphify 相同的安全文件名逻辑 + path.basename 防路径穿越)
    const safeFileName = path.basename(name.replace(/[\/\\:*?"<>|]/g, '_'));
    const wikiDir = path.resolve(process.env.GRAPHIFY_OUT_DIR || './graphify-out', 'wiki');
    const wikiPath = path.join(wikiDir, `${safeFileName}.md`);

    // 额外校验：确保最终路径仍在 wiki 目录内（防止 .. 绕过）
    if (!wikiPath.startsWith(wikiDir)) {
      console.error(`[synthesis-api] 路径穿越嫌疑，已拒绝：${wikiPath}`);
      return NextResponse.json({ error: '非法请求' }, { status: 400 });
    }

    console.log(`[synthesis-api] 尝试读取 Wiki: ${wikiPath}`);

    let ai_content = null;
    try {
      ai_content = await fs.promises.readFile(wikiPath, 'utf-8');
    } catch (err: any) {
      console.warn(`[synthesis-api] Wiki 文件不可读: ${wikiPath}`, err.message);
    }
    
    if (!ai_content) {
      console.warn(`[synthesis-api] Wiki 内容为空或文件不存在: ${wikiPath}`);
    }

    // 读取用户批注（SELECT 字段与响应结构一一对应）
    const synthResult = await db.query(
      `SELECT id, user_annotation, generated_at, updated_at FROM synthesis WHERE category_id = $1`,
      [categoryId]
    );
    const synth = synthResult.rows[0];

    const synthesis = {
      id: synth?.id || `temp-${categoryId}`,
      categoryId,
      categoryName: name,
      aiContent: ai_content,
      userAnnotation: synth?.user_annotation || '',
      basedOnCount: note_count,
      generatedAt: synth?.generated_at || null,
      updatedAt: synth?.updated_at || new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      synthesis
    });
  } catch (err: any) {
    return handleError(err);
  }
}
