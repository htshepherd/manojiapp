import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import * as fs from 'fs';
import * as path from 'path';
import { handleError } from '@/lib/api-response';
import { SynthesisRow, Synthesis } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  try {
    const userId = await requireAuth(req);
    const { categoryId } = await params;

    const catResult = await db.query<{ name: string }>(
      `SELECT name FROM categories WHERE id = $1 AND user_id = $2`,
      [categoryId, userId]
    );
    if (catResult.rows.length === 0) {
      return NextResponse.json({ error: '无权操作' }, { status: 403 });
    }
    const { name } = catResult.rows[0]!;

    // 实时 COUNT （替代可能过时的 note_count 冒余字段）
    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM notes WHERE category_id = $1 AND user_id = $2 AND status = 'active'`,
      [categoryId, userId]
    );
    const basedOnCount = parseInt(countResult.rows[0]!.count) || 0;

    // 问题 7: GRAPHIFY_OUT_DIR 未配置时用相对路径可能指向错误位置，消除静默失败。
    const outDir = process.env.GRAPHIFY_OUT_DIR;
    if (!outDir) {
      console.error('[synthesis-api] GRAPHIFY_OUT_DIR 未配置');
      return NextResponse.json({ error: '服务器配置错误' }, { status: 500 });
    }

    // 修复：读取以 userId_categoryId 命名的专属 Wiki，彻底解决租户隔离和分类改名问题
    const wikiDir = path.resolve(outDir, 'wiki');
    const wikiFileName = `${userId}_${categoryId}.md`;
    const wikiPath = path.join(wikiDir, wikiFileName);

    // 问题 6: 用 path.relative 替代 startsWith
    // startsWith 在 wikiDir 末尾无斜杠时，攻击者可构造 wikiDir + '-evil/...' 绕过
    const relative = path.relative(wikiDir, wikiPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      console.error(`[synthesis-api] 路径穿越嵌疑，已拒绝：${wikiPath}`);
      return NextResponse.json({ error: '非法请求' }, { status: 400 });
    }

    console.log(`[synthesis-api] 尝试读取 Wiki: ${wikiPath}`);

    let ai_content: string | null = null;
    try {
      ai_content = await fs.promises.readFile(wikiPath, 'utf-8');
    } catch (err: unknown) {
      const error = err as Error;
      console.warn(`[synthesis-api] Wiki 文件不可读: ${wikiPath}`, error.message);
    }
    
    if (!ai_content) {
      console.warn(`[synthesis-api] Wiki 内容为空或文件不存在: ${wikiPath}`);
    }

    // 读取用户批注（SELECT 字段与响应结构一一对应）
    const synthResult = await db.query<SynthesisRow>(
      `SELECT id, user_annotation, generated_at, updated_at FROM synthesis WHERE category_id = $1`,
      [categoryId]
    );
    const synth = synthResult.rows[0];

    const synthesis: Synthesis = {
      id: synth?.id || `temp-${categoryId}`,
      categoryId,
      categoryName: name,
      aiContent: ai_content,
      userAnnotation: synth?.user_annotation || '',
      basedOnCount,
      generatedAt: synth?.generated_at || null,
      updatedAt: synth?.updated_at || new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      synthesis
    });
  } catch (err: unknown) {
    return handleError(err);
  }
}
