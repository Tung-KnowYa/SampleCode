import { pool } from '../services/db.js';

export async function keywordSearch(searchTerm) {
    console.log(`\n--- Keyword Search: "${searchTerm}" ---`);
    const query = `
        SELECT item_id, item_name 
        FROM items 
        WHERE to_tsvector('english', item_name) @@ plainto_tsquery('english', $1)
        LIMIT 5;
    `;
    const res = await pool.query(query, [searchTerm]);
    console.table(res.rows);
}

export async function filteredSearch(severity) {
    console.log(`\n--- Filtered Search: Severity == '${severity}' ---`);
    const query = `
        SELECT item_id, item_name, severity, status 
        FROM items 
        WHERE severity = $1 
        ORDER BY score DESC
        LIMIT 5;
    `;
    const res = await pool.query(query, [severity]);
    console.table(res.rows);
}

/**
 * @param {string} userQueryText
 * @param {import('../lib/ai/llm-provider.js').LLMProvider} llm
 */
export async function semanticSearch(userQueryText, llm) {
    console.log(`\n--- Semantic Search (Note & Details): "${userQueryText}" ---`);
    const vector = await llm.embedText(userQueryText);
    
    // <=> is the cosine distance operator in PgVector
    const query = `
        SELECT item_id, note, 
               1 - (semantic_vector <=> $1::vector) AS similarity_score
        FROM items
        ORDER BY semantic_vector <=> $1::vector
        LIMIT 5;
    `;
    const res = await pool.query(query, [JSON.stringify(vector)]);
    console.table(res.rows);
}

/**
 * @param {string} userQuestion
 * @param {import('../lib/ai/llm-provider.js').LLMProvider} llm
 */
export async function knowledgeSearch(userQuestion, llm) {
    console.log(`\n🤖 Chatbot searching for context for question: "${userQuestion}"`);
    
    // Convert the user's question into a Vector
    const questionVector = await llm.embedText(userQuestion);
    
    // Find 3 chunks (text segments) most semantically similar to the user's question in the Knowledge Base
    const query = `
        SELECT document_name, content, 
               1 - (semantic_vector <=> $1::vector) AS similarity_score
        FROM knowledge_base
        ORDER BY semantic_vector <=> $1::vector
        LIMIT 3;
    `;
    
    const res = await pool.query(query, [JSON.stringify(questionVector)]);
    
    // Combine the found content into a Context section to load into the Prompt for LLM
    const contextLines = res.rows.map(row => 
        `[From document: ${row.document_name}] ${row.content}`
    );
    
    const combinedContext = contextLines.join('\n\n');
    console.log("\n--- Collected Context ---");
    console.log(combinedContext);
    
    return combinedContext;
}