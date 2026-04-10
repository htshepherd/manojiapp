import bcrypt from 'bcrypt';
import { db } from '../lib/db';

async function seedAdmin() {
  const account = process.env.ADMIN_ACCOUNT!;
  const password = process.env.ADMIN_PASSWORD!;
  const hash = await bcrypt.hash(password, 10);

  await db.query(`
    INSERT INTO users (account, password_hash)
    VALUES ($1, $2)
    ON CONFLICT (account) DO NOTHING
  `, [account, hash]);

  console.log('✅ Admin account ready');
  process.exit(0);
}

seedAdmin();
