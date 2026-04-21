import fs from 'fs';
import { pool } from '../services/db.js';
import { config } from '../config/env.js';

export async function createIndex4Items() {
    const dim = config.vector.dimensions;
    
    const ddl = `
        CREATE TABLE IF NOT EXISTS items (
            item_id VARCHAR PRIMARY KEY,
            item_name TEXT,
            category TEXT,
            severity TEXT,
            priority TEXT,
            source TEXT,
            action TEXT,
            status TEXT,
            client TEXT,
            project TEXT,
            reporter TEXT,
            assignee TEXT,
            note TEXT,
            tags TEXT[],
            item_origin_url TEXT,
            item_detail_01 TEXT,
            item_detail_02 TEXT,
            score DOUBLE PRECISION,
            created_timestamp TIMESTAMPTZ,
            updated_timestamp TIMESTAMPTZ,
            semantic_vector vector(${dim})
        );

        -- HNSW Index for fast semantic search (cosine distance)
        CREATE INDEX IF NOT EXISTS items_vector_idx ON items USING hnsw (semantic_vector vector_cosine_ops);
        
        -- GIN Index for keyword search on ItemName
        CREATE INDEX IF NOT EXISTS items_name_idx ON items USING GIN (to_tsvector('english', item_name));
    `;

    await pool.query(ddl);
    console.log("DB Schema and DB Indexes (Semantic Configuration) for Items created.");
}

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
export async function uploadDocuments(filePath, llm) {
    const rawData = fs.readFileSync(filePath);
    const documents = JSON.parse(rawData);

    for (const doc of documents) {
        // Create a combined string for our "Semantic Configuration" target fields
        const textToEmbed = `Note: ${doc.Note}. Detail 1: ${doc.ItemDetail01}. Detail 2: ${doc.ItemDetail02}`;
        const embedding = await llm.embedText(textToEmbed);

        const query = `
            INSERT INTO items (
                item_id, item_name, category, severity, priority, source, 
                action, status, client, project, reporter, assignee, note, 
                tags, item_origin_url, item_detail_01, item_detail_02, score, created_timestamp, 
                updated_timestamp, semantic_vector
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
            ) ON CONFLICT (item_id) DO NOTHING;
        `;
        
        const values = [
            doc.ItemID, doc.ItemName, doc.Category, doc.Severity, doc.Priority, doc.Source,
            doc.Action, doc.Status, doc.Client, doc.Project, doc.Reporter, doc.Assignee, doc.Note,
            doc.Tags, doc.ItemOriginUrl, doc.ItemDetail01, doc.ItemDetail02, doc.Score, doc.CreatedTimestamp,
            doc.UpdatedTimestamp, JSON.stringify(embedding)
        ];

        await pool.query(query, values);
    }
    console.log(`Successfully uploaded ${documents.length} documents.`);
}