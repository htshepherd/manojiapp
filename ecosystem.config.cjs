// PM2 生产配置文件
// 敏感环境变量（DATABASE_URL, JWT_SECRET 等）建议通过系统环境变量提供，
// 或在启动命令中指定：pm2 start ecosystem.config.cjs --env production

module.exports = {
  apps: [
    {
      name: 'manoai-app',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 20,
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
    },
    {
      name: 'graphify-watcher',
      script: 'graphify.ts',
      interpreter: './node_modules/.bin/tsx',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: process.env.DATABASE_URL,
        RAW_NOTES_DIR: process.env.RAW_NOTES_DIR || './notes/raw',
        GRAPHIFY_OUT_DIR: process.env.GRAPHIFY_OUT_DIR || './graphify-out',
        GRAPHIFY_WEBHOOK_URL: 'http://localhost:3000/api/internal/graphify-sync',
        GRAPHIFY_WEBHOOK_SECRET: process.env.GRAPHIFY_WEBHOOK_SECRET,
      },
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
      error_file: './logs/graphify-error.log',
      out_file: './logs/graphify-out.log',
    }
  ]
};
