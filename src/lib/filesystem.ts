import * as fs from 'fs';
import * as path from 'path';

export function sanitizeDirName(name: string): string {
  return name.trim().replace(/\s+/g, '_').replace(/[^\w\u4e00-\u9fa5-]/g, '');
}

export function createRawDir(categoryName: string): string {
  const dirPath = path.resolve(
    process.env.RAW_NOTES_DIR!,
    sanitizeDirName(categoryName)
  );
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function deleteRawDir(rawDir: string): void {
  if (fs.existsSync(rawDir)) {
    fs.rmSync(rawDir, { recursive: true, force: true });
  }
}

export function renameRawDir(oldDir: string, newCategoryName: string): string {
  const newDir = path.resolve(
    process.env.RAW_NOTES_DIR!,
    sanitizeDirName(newCategoryName)
  );
  if (fs.existsSync(oldDir)) {
    fs.renameSync(oldDir, newDir);
  }
  return newDir;
}

export function writeRawNote(
  rawDir: string,
  noteId: string,
  title: string,
  categoryName: string,
  createdAt: string,
  content: string
): string {
  const filePath = path.join(rawDir, `${noteId}.md`);
  const frontmatter = `---
id: ${noteId}
title: ${title}
category: ${categoryName}
created_at: ${createdAt}
---

`;
  fs.writeFileSync(filePath, frontmatter + content, 'utf-8');
  return filePath;
}

export function deleteRawNote(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
