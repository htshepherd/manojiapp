
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

(async () => {
    try {
        const { db } = await import('../src/lib/db');
        await db.query('UPDATE notes SET category_name = c.name FROM categories c WHERE notes.category_id = c.id');
        console.log('Sync completed successfully');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
