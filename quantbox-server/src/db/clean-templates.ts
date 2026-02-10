import { db } from './index.js';
import { strategies } from './schema.js';
import { eq } from 'drizzle-orm';

async function main() {
    console.log('🧹 Cleaning old templates...');
    try {
        const result = await db.delete(strategies).where(eq(strategies.isTemplate, true));
        console.log(`✨ All templates removed.`);
    } catch (error) {
        console.error('❌ Failed to delete templates:', error);
        process.exit(1);
    }
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Cleanup unexpected error:', err);
    process.exit(1);
});
