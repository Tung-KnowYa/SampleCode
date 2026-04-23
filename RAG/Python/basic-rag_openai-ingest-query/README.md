# My RAG Project
A Retrieval-Augmented Generation (RAG) knowledge base built with LlamaIndex, ChromaDB, and OpenAI.

## Project Structure

```
my_rag_project/
├── data/                  ← Put your documents here (.txt, .pdf, .docx)
│   └── returns_policy.txt ← Sample document for testing
├── chroma_db/             ← Created automatically by ChromaDB
├── config.py              ← Settings: models, chunk size, system prompt
├── ingest.py              ← Ingestion pipeline: load → chunk → embed → store
├── query.py               ← Query pipeline: question → retrieve → answer
├── app.py                 ← Streamlit web interface
├── requirements.txt       ← Python dependencies
├── .env.example           ← Copy to .env and add your API key
└── .gitignore
```

## Quick Start

### 1. Set up Python environment
```bash
python -m venv venv             # Or: python3 -m venv venv
source venv/bin/activate        # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure your API key
```bash
cp .env.example .env
# Open .env and replace the placeholder with your real OpenAI API key
```

### 3. Add your documents
Place your `.txt`, `.pdf`, or `.docx` files in the `data/` folder.
A sample `returns_policy.txt` is included for testing.

### 4. Run the ingestion pipeline
```bash
python ingest.py
```
This loads your documents, splits them into chunks, generates embeddings,
and stores everything in ChromaDB. Run again whenever your documents change.

### 5. Query via terminal
```bash
python query.py
```

### 6. Query via web interface
```bash
streamlit run app.py
```
Opens a chat interface in your browser at http://localhost:8501

## Configuration
Edit `config.py` to adjust:
- `EMBED_MODEL` — embedding model (default: text-embedding-3-small)
- `LLM_MODEL` — language model (default: gpt-4o-mini)
- `CHUNK_SIZE` — tokens per chunk (default: 400)
- `CHUNK_OVERLAP` — overlap between chunks (default: 60)
- `TOP_K` — number of chunks retrieved per query (default: 4)
- `SYSTEM_PROMPT` — instructions that shape the AI's behavior

## Debug Mode
To inspect retrieved chunks for any query, call:
```python
result = query_knowledge_base("your question", index, debug=True)
```

## Logs
- `query_log.txt` — every question, answer, and source logged automatically

## Next Steps
- Automated Evaluation With RAGAS (`pip install ragas`)
- Improve Retrieval Quality: Add cross-encoder re-ranking (`pip install sentence-transformers`)
- Deploy with FastAPI and Docker
- Production Monitoring: Add Langfuse observability (`pip install langfuse`)
