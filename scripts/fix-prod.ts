
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

async function run() {
    try {
        const envPath = path.resolve(process.cwd(), '.env.production');
        console.log(`[Info] 正在原始读取文件: ${envPath}`);
        
        const content = fs.readFileSync(envPath, 'utf-8');
        
        // 使用正则直接抓取，忽略任何环境变量注入
        const match = content.match(/^DATABASE_URL=(.+)$/m);
        if (!match || !match[1]) {
            console.error('[Error] 在文件中没找到 DATABASE_URL=xxx 这一行。内容预览:', content.substring(0, 50));
            process.exit(1);
        }
        
        const dbUrl = match[1].trim().replace(/^["']|["']$/g, '');
        console.log(`[Info] 连接字符串提取成功 (长度: ${dbUrl.length})`);

        const pool = new Pool({
            connectionString: dbUrl,
        });

        console.log('[1/2] 正在强制同步数据库分类名称...');
        const syncResult = await pool.query(`
            UPDATE notes 
            SET category_name = c.name 
            FROM categories c 
            WHERE notes.category_id = c.id
        `);
        console.log(`✅ 同步完成，影响行数: ${syncResult.rowCount}`);
        
        await pool.end();
        console.log('[2/2] 请务必执行: pm2 restart graphify-watcher');
        process.exit(0);

    } catch (err: any) {
        console.error('❌ 执行失败:', err.message);
        process.exit(1);
    }
}

run();
