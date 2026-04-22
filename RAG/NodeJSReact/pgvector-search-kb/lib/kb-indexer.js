import { pool } from '../services/db.js';
import { config } from '../config/env.js';
import { extractTextFromFile, chunkText } from './document-processor.js';
import path from 'path';

export async function createIndex4KnowledgeBase() {
    const dim = config.vector.dimensions;

    const ddl = `
        CREATE TABLE IF NOT EXISTS knowledge_base (
            chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            document_name VARCHAR(255),
            chunk_index INTEGER,
            content TEXT,
            semantic_vector vector(${dim})
        );

        -- HNSW Index for fast semantic search
        CREATE INDEX IF NOT EXISTS kb_vector_idx ON knowledge_base USING hnsw (semantic_vector vector_cosine_ops);
    `;

    await pool.query(ddl);
    console.log("DB Schema and DB Indexes (Semantic Configuration) for Knowledge Base created.");
}

/**
 * @param {string} filePath
 * @param {import('./ai/llm-provider.js').LLMProvider} llm
 */
export async function ingestDocument(filePath, llm) {
    const fileName = path.basename(filePath);
    console.log(`\n📄 Processing document: ${fileName}...`);

    // 1. Extract Text
    const rawText = await extractTextFromFile(filePath);
    console.log(`✅ Successfully extracted: ${rawText.length} characters.`);

    // 2. Chunk (Split into smaller chunks)
    // Use chunk_size 1000 characters (~200-250 tokens) and overlap 200 characters.
    const chunks = chunkText(rawText, 1000, 200);
    console.log(`✂️ Successfully split into ${chunks.length} chunks.`);

    // 3. Embed and Save to DB
    for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        
        try {
            const embedding = await llm.embedText(chunkContent);

            const query = `
                INSERT INTO knowledge_base (document_name, chunk_index, content, semantic_vector)
                VALUES ($1, $2, $3, $4::vector)
            `;
            
            await pool.query(query, [
                fileName, 
                i + 1, 
                chunkContent, 
                JSON.stringify(embedding)
            ]);

            process.stdout.write(`\r💾 Successfully saved chunk ${i + 1}/${chunks.length} to Vector DB...`);
        } catch (error) {
            console.error(`\n❌ Error at chunk ${i + 1}:`, error.message);
        }
    }
    console.log(`\n🎉 Successfully uploaded document: ${fileName}`);
}
