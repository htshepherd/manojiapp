import "dotenv/config";
import * as fs from 'fs';
import * as path from 'path';
import { db } from '../lib/db';

const MIGRATIONS_DIR = path.resolve('./migrations');
const FILES = [
  '001_create_users.sql',
  '002_create_templates.sql',
  '003_create_categories.sql',
  '004_create_notes.sql',
  '005_create_synthesis.sql',
  '006_create_migrations_history.sql',
  '007_add_user_onboarding.sql',
  '008_add_last_viewed_at.sql'
];

async function migrate() {
  // 确保 history 表存在
  await db.query(`
    CREATE TABLE IF NOT EXISTS migrations_history (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(200) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  for (const file of FILES) {
    const { rows } = await db.query(
      `SELECT id FROM migrations_history WHERE filename = $1`, [file]
    );
    if (rows.length > 0) {
      console.log(`⏭  Skipped: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    await db.query(sql);
    await db.query(
      `INSERT INTO migrations_history (filename) VALUES ($1)`, [file]
    );
    console.log(`✅ Executed: ${file}`);
  }

  console.log('🎉 Migration complete');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
