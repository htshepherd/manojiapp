import { db } from '../lib/db';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function fixOnboarding() {
  try {
    const res = await db.query(`
      UPDATE users SET is_onboarded = TRUE 
      WHERE id IN (SELECT DISTINCT user_id FROM prompt_templates)
    `);
    console.log(`✅ Success: Updated ${res.rowCount} users`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

fixOnboarding();
