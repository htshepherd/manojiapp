// src/instrumentation.ts
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const { ensureCollection } = await import('./lib/qdrant');
      try {
        await ensureCollection();
        console.log('✅ Qdrant collection ready');
      } catch (err) {
        console.error('❌ Qdrant init failed:', err);
      }
    }
  }
