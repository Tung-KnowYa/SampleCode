import { initDb, pool } from './services/db.js';
import { config } from './config/env.js';
import { createLLMProvider } from './lib/ai/factory.js';
import { existsSync } from 'fs';
//Data indexing & searching
import { createIndex4Items, createIndex4KnowledgeBase, uploadDocuments } from './lib/indexer.js';
//Knowledge base
import { ingestDocument } from './lib/kb-indexer.js';
import { keywordSearch, filteredSearch, semanticSearch } from './queries/search.js';
import { knowledgeSearch } from './queries/search.js';

async function main() {
    try {
        const llm = createLLMProvider(config);

        await initDb();
        await createIndex4Items();
        await createIndex4KnowledgeBase();
        
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


        console.log("\n--- Starting Knowledge Base Ingesting Process ---");        
        // Define the documents to ingest
        const documents = [
            './documents/Doc1.docx',
            './documents/Doc2.pdf'
        ];
        //TODO: Clear old indexed data for the same document before indexing new data, OR just overwrite the existing data with new data
        for (const docPath of documents) {
            // Check if the file exists before attempting ingestion
            if (existsSync(docPath)) {
                console.log(`Ingesting: ${docPath}`);
                await ingestDocument(docPath, llm);
            } else {
                console.warn(`⚠️ Warning: Skipping ingestion. File not found: ${docPath}`);
            }
        }

        // Simulate a user asking the chatbot
        await knowledgeSearch("What is the company's policy on protecting personal data?", llm);
        await knowledgeSearch("What is the company's compensation policy for workers?", llm);

    } catch (err) {
        console.error("Error running application:", err);
    } finally {
        await pool.end();
    }
}

main();