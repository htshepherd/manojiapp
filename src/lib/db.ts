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

// 不在模块顶层 exit：next build 阶段 NODE_ENV=production 但环境变量可能尚未注入，
// 在此 exit 会直接杀死 build 进程。具体 API 路由在运行时自行验证。
if (!process.env.GRAPHIFY_WEBHOOK_SECRET || process.env.GRAPHIFY_WEBHOOK_SECRET.length < 16) {
  console.warn('[db] GRAPHIFY_WEBHOOK_SECRET 未配置或强度不足（需至少16位），webhook 鉴权将失败');
}

export const db = global._pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// 无论生产/开发都缓存：防止多次 import（HMR / 多 Worker）重复创建 Pool
global._pgPool = db;
