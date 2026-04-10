import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量，支持脚本直接运行
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

declare global {
  var _pgPool: Pool | undefined;
}

export const db = global._pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = db;
}
