
import dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';

// 1. 强制按优先级寻找配置文件
const envPath = path.resolve(process.cwd(), '.env.production');
console.log(`[Info] 正在加载配置文件: ${envPath}`);
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
    console.error('[Error] 无法从 .env.production 读取 DATABASE_URL，请确认文件路径或内容正确。');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function run() {
    try {
        console.log('[1/2] 正在同步数据库分类名称...');
        const syncResult = await pool.query(`
            UPDATE notes 
            SET category_name = c.name 
            FROM categories c 
            WHERE notes.category_id = c.id
        `);
        console.log(`✅ 同步完成，影响行数: ${syncResult.rowCount}`);

        console.log('[2/2] 数据已准备就绪。');
        console.log('\n--- 接下来请执行 ---');
        console.log('pm2 restart graphify-watcher');
        console.log('--------------------\n');

    } catch (err) {
        console.error('❌ 执行失败:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

run();
