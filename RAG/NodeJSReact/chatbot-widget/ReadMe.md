# Embeddable AI Chatbot Widget - Quick Start Guide

This project contains a highly scalable Node.js Backend utilizing Pgvector for RAG, and a Web-Component encapsulated React Frontend designed to be embedded on any 3rd party website without CSS conflicts.

## 1. Backend Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL with `pgvector` extension installed.
- Azure OpenAI credentials.

### Installation
1. Navigate to the backend directory.
2. Run `npm install`.
3. Create a `.env` file matching the provided `.env` template in the prompt.
4. Ensure your PostgreSQL instance is running and `knowledge_base` table existed with data indexed by another program or create the `knowledge_base` table:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   CREATE TABLE knowledge_base (
       chunk_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       document_name varchar(255),
       chunk_index integer,
       content text,
       semantic_vector vector(1536)
   );
5. Start the server: node server.js
6. Access Swagger API documentation at: http://localhost:3001/api-docs

## 2. Frontend Setup & Bundling

### Prerequisites
- Node.js (v18+)

### Installation & Build
1. Navigate to the frontend directory.
2. Run `npm install`.
3. Build the widget into a single Javascript file:
`npm run build  # Ensure package.json scripts point to "webpack --mode production"`
4. This will generate `dist/chatbot-widget.bundle.js`. This single file contains React, Tailwind CSS, and all logic securely isolated.

## 3. Embedding the Widget
To embed the widget into any website (Wordpress, React, Plain HTML), simply include the script and use the custom element HTML tag.

HTML
<script src="path/to/chatbot-widget.bundle.js"></script>
<ai-chatbot-widget theme="dark-gold"></ai-chatbot-widget>

### Features Triggering
- Charts: When clicking `+` and selecting "Chart Report", ask "Compare sales of Product A and B". The AI is instructed to return JSON, which Recharts parses automatically.
- Shadow DOM: Ensures that the host website's global CSS cannot break the layout of the chatbot.