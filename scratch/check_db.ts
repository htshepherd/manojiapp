
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(async () => {
    try {
        const { db } = await import('../src/lib/db');
        const r = await db.query('SELECT name, id, note_count FROM categories');
        console.log('Categories:', JSON.stringify(r.rows, null, 2));
        
        const l = await db.query('SELECT COUNT(*) FROM note_links');
        console.log('Links Count:', l.rows[0].count);
        
        const n = await db.query('SELECT COUNT(*) FROM notes WHERE status = \'active\'');
        console.log('Active Notes:', n.rows[0].count);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
