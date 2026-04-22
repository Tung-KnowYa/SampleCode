import { initDb, pool } from './services/db.js';
import { config } from './config/env.js';
import { createLLMProvider } from './lib/ai/factory.js';
import { existsSync } from 'fs';
//Knowledge base indexing & searching
import { createIndex4KnowledgeBase, ingestDocument } from './lib/kb-indexer.js';
import { knowledgeSearch } from './queries/search.js';

async function main() {
    try {
        const llm = createLLMProvider(config);

        await initDb();
        await createIndex4KnowledgeBase();
        
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