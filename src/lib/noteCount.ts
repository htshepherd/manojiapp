// src/lib/noteCount.ts
import { db } from './db';

export async function incrementNoteCount(categoryId: string) {
  await db.query(
    `UPDATE categories SET note_count = note_count + 1, updated_at = NOW()
     WHERE id = $1`, [categoryId]
  );
}

export async function decrementNoteCount(categoryId: string) {
  await db.query(
    `UPDATE categories SET note_count = GREATEST(note_count - 1, 0), updated_at = NOW()
     WHERE id = $1`, [categoryId]
  );
}
