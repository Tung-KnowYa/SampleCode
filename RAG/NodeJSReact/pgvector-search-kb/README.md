# PgVector Search Proof-of-Concept

This Node.js application is a Proof-of-Concept (PoC) demonstrating how to ingest structured JSON data into a PostgreSQL database and perform keyword, filtered, and semantic searches using the `pgvector` extension.

## Architecture Highlights
- **ES Modules:** Clean import/export structure.
- **PgVector:** Uses HNSW indexes for fast approximate nearest neighbor (ANN) vector search.
- **Semantic Configuration Strategy:** Embeddings are generated dynamically by concatenating the `Note`, `ItemDetail01`, and `ItemDetail02` fields, allowing semantic queries against the context of all three fields simultaneously.

## Prerequisites
- Node.js (v18+)
- PostgreSQL (v15+)
- `pgvector` PostgreSQL extension installed on your database server.

### Installing pgvector via Docker (Fastest for local dev)
If you don't have postgres locally, you can spin up a pgvector-enabled instance via Docker. For example: `docker run --name pgvector-poc -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d ankane/pgvector`

### Setup
Clone the repository and install dependencies: `npm install`

### Run the Knowledge Base App
Run the main application flow: `node app.js`

### Run the Data App that works with data items.
Run the main application flow: `node item-app.js`

### Tool: Generate Dummy Data
Run the included tool to generate a data.json file: `node tools/generate-item-data.js`

### Environment Variables
For CI/CD pipelines (e.g., GitHub Actions, Azure DevOps), ensure the following secrets are injected into the environment prior to running integration tests or deployment scripts:
1. DB_HOST
2. DB_USER
3. DB_PASSWORD

### Security Notes
Do not commit `.env` files or hardcode DB_USER and DB_PASSWORD.
