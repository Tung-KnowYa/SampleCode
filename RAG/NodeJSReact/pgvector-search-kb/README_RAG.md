## RAG (Retrieval-Augmented Generation)
To turn documents (PDF, Word, etc.) into a Knowledge Base, the processing pipeline must be adjusted. You cannot send an entire 100-page PDF directly to an AI model or a vector database due to token limits and reduced precision. Use this 4-step flow instead:
1.	Extract: Read PDF/Word files into plain text.
2.	Chunking: Split long text into smaller chunks with overlap to preserve context.
Chunking strategy is the most important tuning point in RAG. You can adjust the 1000 and 200 parameters in kb-indexer.js based on document complexity.
3.	Embed: Use OpenAI to generate vectors for each chunk.
4.	Index: Store chunk text and vectors in PostgreSQL.

## How to Test
1.	Create a documents/ folder in the project and place a .pdf or .docx file in it (for example: documents/hr_policy.pdf).
2.	Open app.js and call:
// ... (inside main)
await ingestDocument('./documents/sec_policy.docx');
await ingestDocument('./documents/hr_policy.pdf');

// Simulate a user asking the chatbot
await knowledgeSearch("What is the company's leave policy?");