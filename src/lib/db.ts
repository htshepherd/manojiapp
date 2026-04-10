import { Pool } from 'pg';

// 注意：不在此处手动加载 .env.local。
// Next.js 在开发环境下自动读取 .env.local；
// 生产环境由部署平台（PM2 / Docker / Vercel）直接注入环境变量。
// 若需要在独立脚本中运行此模块，请在脚本入口处自行调用 dotenv.config()。

declare global {
  var _pgPool: Pool | undefined;
}

if (!process.env.DATABASE_URL) {
  throw new Error('[db] 缺少必要环境变量：DATABASE_URL');
}

if (!process.env.GRAPHIFY_WEBHOOK_SECRET || process.env.GRAPHIFY_WEBHOOK_SECRET.length < 16) {
  console.error('[db] CRITICAL: GRAPHIFY_WEBHOOK_SECRET 必须配置且长度超过16位');
  if (process.env.NODE_ENV === 'production') process.exit(1);
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
