import { initDb, pool } from './services/db.js';
import { config } from './config/env.js';
import { createLLMProvider } from './lib/ai/factory.js';
//Data indexing & searching
import { createIndex4Items, uploadDocuments } from './lib/indexer.js';
import { keywordSearch, filteredSearch, semanticSearch } from './queries/search.js';

async function main() {
    try {
        const llm = createLLMProvider(config);

        await initDb();
        await createIndex4Items();
        
        console.log("\n--- Starting Indexing Process ---");
        //TODO: Shall we overwrite the existing data with new data if the ItemID is the same?
        await uploadDocuments('./data/sampleData.json', llm);
        //await uploadDocuments('./data/data.json', llm);
        
        console.log("\n--- Running Queries ---");
        // 1. Keyword search on ItemName
        await keywordSearch("database lag");
        // 2. Filtered search
        await filteredSearch("High");        
        // 3. Semantic search targeting ItemDetail and Note fields
        await semanticSearch("I need details about connection timeouts and latency issues.", llm);

    } catch (err) {
        console.error("Error running application:", err);
    } finally {
        await pool.end();
    }
}

main();