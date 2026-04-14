import * as fs from 'fs';
import * as path from 'path';

export function sanitizeDirName(name: string): string {
  return name.trim().replace(/\s+/g, '_').replace(/[^\w\u4e00-\u9fa5-]/g, '');
}

export async function createRawDir(categoryName: string): Promise<string> {
  const dirPath = path.resolve(
    process.env.RAW_NOTES_DIR!,
    sanitizeDirName(categoryName)
  );
  await fs.promises.mkdir(dirPath, { recursive: true });
  return dirPath;
}

export async function deleteRawDir(rawDir: string): Promise<void> {
  try {
    await fs.promises.rm(rawDir, { recursive: true, force: true });
  } catch {
    // 忽略目录不存在等非核心错误
  }
}

export async function renameRawDir(oldDir: string, newCategoryName: string): Promise<string> {
  const newDir = path.resolve(
    process.env.RAW_NOTES_DIR!,
    sanitizeDirName(newCategoryName)
  );
  try {
    await fs.promises.rename(oldDir, newDir);
  } catch {
    // 忽略旧目录不存在的情况
  }
  return newDir;
}

export async function writeRawNote(
  rawDir: string,
  noteId: string,
  title: string,
  categoryName: string,
  createdAt: string,
  content: string
): Promise<string> {
  const filePath = path.join(rawDir, `${noteId}.md`);
  const frontmatter = `---
id: ${noteId}
title: ${title}
category: ${categoryName}
created_at: ${createdAt}
---

`;
  await fs.promises.writeFile(filePath, frontmatter + content, 'utf-8');
  return filePath;
}

export async function deleteRawNote(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // 忽略文件不存在等错误
  }
}
