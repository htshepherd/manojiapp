
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

async function run() {
    try {
        const potentialFiles = ['.env.production', '.env.local', '.env'];
        let content = '';
        let foundFile = '';

        for (const f of potentialFiles) {
            const p = path.resolve(process.cwd(), f);
            if (fs.existsSync(p)) {
                content = fs.readFileSync(p, 'utf-8');
                foundFile = f;
                break;
            }
        }

        if (!foundFile) {
            console.error(`❌ 未能找到任何配置文件 (${potentialFiles.join(', ')})。请确认你在项目根目录下执行，或文件确实存在。`);
            process.exit(1);
        }

        console.log(`[Info] 正在从 ${foundFile} 读取配置...`);
        
        const match = content.match(/^DATABASE_URL=(.+)$/m);
        if (!match || !match[1]) {
            console.error(`❌ 在 ${foundFile} 中未找到 DATABASE_URL 字段。`);
            process.exit(1);
        }
        
        const dbUrl = match[1].trim().replace(/^["']|["']$/g, '');

        const pool = new Pool({ connectionString: dbUrl });
        console.log('[1/2] 正在强制同步数据库分类名称...');
        const syncResult = await pool.query(`
            UPDATE notes 
            SET category_name = c.name 
            FROM categories c 
            WHERE notes.category_id = c.id
        `);
        console.log(`✅ 同步完成，影响行数: ${syncResult.rowCount}`);
        
        await pool.end();
        console.log('[2/2] 请务必重启服务: pm2 restart graphify-watcher');
        process.exit(0);

    } catch (err: any) {
        console.error('❌ 执行失败:', err.message);
        process.exit(1);
    }
}

run();
