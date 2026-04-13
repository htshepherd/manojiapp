
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(async () => {
    try {
        const { db } = await import('../src/lib/db');
        const r = await db.query('SELECT DISTINCT category_id, category_name FROM notes');
        console.log('Notes distinct names:', JSON.stringify(r.rows, null, 2));
        
        const c = await db.query('SELECT id, name FROM categories');
        console.log('Categories table names:', JSON.stringify(c.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
