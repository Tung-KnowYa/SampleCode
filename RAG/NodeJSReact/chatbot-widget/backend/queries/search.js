const db = require('../services/db');

/**
 * @param {string} userQuery
 * @param {{ embedText: (text: string) => Promise<number[]> }} llm
 * @param {number} [limit]
 */
async function searchKnowledgeBase(userQuery, llm, limit = 5) {
  const queryEmbedding = await llm.embedText(userQuery);
  const vectorStr = `[${queryEmbedding.join(',')}]`;

  // Cosine distance (<=>) for pgvector
  const sql = `
    SELECT content, document_name 
    FROM knowledge_base 
    ORDER BY semantic_vector <=> $1 
    LIMIT $2;
  `;
  
  const { rows } = await db.query(sql, [vectorStr, limit]);
  return rows.map(r => r.content).join('\n\n');
}

module.exports = { searchKnowledgeBase };