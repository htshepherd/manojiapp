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
      interpreter: 'node',
      // 使用 tsx 注册器以直接运行 ts 文件，这是目前最工程化的做法
      interpreter_args: '--import tsx',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 30,
      error_file: './logs/graphify-error.log',
      out_file: './logs/graphify-out.log',
    }
  ]
};
