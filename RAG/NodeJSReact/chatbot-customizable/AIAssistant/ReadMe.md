# Embeddable AI Chatbot Widget - How To

This project includes a Node.js backend that performs Retrieval-Augmented Generation (RAG) from **bundled JSON** files (`backend/data/demo-knowledge-base.json` and `demo-datasets.json`)—no database required—along with a React frontend encapsulated as a Web Component for seamless embedding into third-party websites without CSS conflicts.

## 1. Backend Setup

### Prerequisites

- Node.js (v18+; Docker image uses Node 22)
- An AI provider configured via env: **Azure OpenAI** (default), **LiteLLM**, or **mock** (see `backend/.env.sample`)

### Installation

1. Open a terminal and go to **`AIAssistant/backend`** (the folder that contains `server.js`).
2. Run `npm install`.
3. Create a **`.env`** file in that folder. Copy **`.env.sample`** from the same folder and fill in the AI variables for your chosen `AI_PROVIDER`.
4. (Optional) Point **`DEMO_DATA_DIR`** at a folder that contains **`demo-knowledge-base.json`** and **`demo-datasets.json`** if you want to customize data outside the repo copy.
5. Start the API from **`backend`**:
   - **`npm start`** or **`npm run dev`** (both run `node server.js`), or run **`node server.js`** directly.
   - Default port is **3002** unless `PORT` is set in `.env`.
6. Open Swagger at **`http://localhost:<PORT>/api-docs`** (for example `http://localhost:3002/api-docs`).

### Demo data layout

| File | Role |
|------|------|
| `backend/data/demo-knowledge-base.json` | Array of chunks with `document_name` and `content`. Optional **`embedding`** per chunk enables semantic ranking with your embedding model; otherwise lexical matching is used. |
| `backend/data/demo-datasets.json` | Object whose keys are **dataset ids** (default key **`items`**) and whose values are row arrays compatible with **`ITEM_DB_COL_ID`** (often `item_id` plus fields like **`item_name`**, **`note`**, **`severity`**, **`status`**, **`score`**). Rows may optionally include **`semantic_vector`** for vector matching. |

### Docker (optional)

From **`AIAssistant/backend`**:

```bash
docker build -t embeddable-assistant-api .
docker run --rm -p 3002:3002 --env-file .env embeddable-assistant-api
```

Pass **`PUBLIC_BASE_URL`** when export download links must point at a public API URL.

## 2. Frontend Setup & Bundling

### Prerequisites

- Node.js (v18+)

### Installation & Build

1. Navigate to **`AIAssistant/frontend`**.
2. Run `npm install`.
3. **Production bundle** (minified widget for embedding):

   ```bash
   npm run build
   ```

   **`package.json` uses webpack** in production mode for this step. The build then runs **`frontend/scripts/copy-embedded-to-board.js`**, which copies everything under **`frontend/dist/`** into **`ExampleHostApp/frontend/public/embedded/`** when that sibling folder exists—useful if you maintain a separate host SPA that serves the widget at **`/embedded/chatbot-widget.bundle.js`**. Adjust the folder name in **`copy-embedded-to-board.js`** for your repo layout.

4. **Development (optional):** while editing widget code, run **`npm start`** or **`npm run dev`** (same script): webpack **development** mode with **`--watch`** rebuilds **`frontend/dist/chatbot-widget.bundle.js`** on file changes. Reload sample HTML or host pages to pick up the new bundle. The watch script does **not** copy into the optional host app; run **`npm run build`** when you need that **`public/embedded`** copy updated.

5. Output for embedding: **`frontend/dist/chatbot-widget.bundle.js`**. That file includes React, Tailwind CSS, and widget logic in Shadow DOM, and registers both custom elements below.

## 3. Embedding the Widget

Include the built bundle once. It registers **two** custom elements; pick one per page.

```html
<script src="path/to/chatbot-widget.bundle.js"></script>
```

### Full Data Chat widget (`<ai-chatbot-widget>`)

Locked to **Data** mode (knowledge logic internally mapped to data for operational focus). Features suggested prompts, tools (`+`), and themes (`light`, `dark`, `dark-emerald`, `light-emerald`).

```html
<ai-chatbot-widget theme="dark-emerald"></ai-chatbot-widget>
```

### Knowledge-only widget (`<knowledge-chatbot-widget>`)

Knowledge-base answers only (every request uses `source: 'knowledge'`). Same **tools** (`+` for reports and file export) and **themes** as the full widget (`light`, `dark`, `dark-emerald`, `light-emerald`). Default theme is **`light-emerald`**. Draggable black-and-emerald **robot** launcher; tap to open/close. Welcome text and suggested prompts come from `sourceTabs.knowledge` in **`frontend/src/config/chat-widget-content.json`**.

```html
<knowledge-chatbot-widget theme="dark-emerald" api-base=""></knowledge-chatbot-widget>
```

Optional attribute **`theme`** on `<knowledge-chatbot-widget>`: same values as `<ai-chatbot-widget>`; defaults to `light-emerald` if omitted.

Optional attribute **`api-base`** (both tags): API **origin** only (no trailing slash), e.g. `https://api.example.com`. Requests go to `{api-base}/api/chat`.

- **Omit** `api-base` to use defaults from **`frontend/src/components/chat-widget/defaultApiBases.js`**: **`DEFAULT_API_BASE_AI_CHATBOT`** is empty (same page origin); **`DEFAULT_API_BASE_KNOWLEDGE_CHATBOT`** is set to **`http://localhost:3002`** in the repo so local dev hits the backend—change it or set **`api-base`** when embedding on another host.
- Set **`api-base=""`** explicitly to force the **current page origin** for `/api/chat`, ignoring those defaults.

If `api-base` is omitted and the effective default is empty, the bundle resolves the chat URL to **`window.location.origin` + `/api/chat`** so calls work inside Shadow DOM.

### Data tab — operational dataset key and id field

By default, **Data** mode loads the **`items`** array from **`demo-datasets.json`**, keyed by **`item_id`**. Another top-level JSON key behaves like switching “tables”.

1. **Server default (all clients)** — in **`backend/.env`**:
   - **`ITEM_DB_TABLE`** — dataset key in `demo-datasets.json` (e.g. `hotel_reservations`); default **`items`**.
   - **`ITEM_DB_COL_ID`** — field used as the row identifier (e.g. `reservation_id`). Must exist on each object in that dataset.
   - **`ITEM_ID`** — if set, pins that specific row on the **Data** tab when the widget loads.

### 4. Direct DOM Attributes (Vanilla JS)
You can embed the web component and control it via HTML attributes or JS methods.

```html
<ai-chatbot-widget
  theme="dark-emerald"
  api-base="https://your-api.example.com"
  item-db-tbl="reservations"
  item-db-col-id="reservation_id"
  item-id="RES-10045"
></ai-chatbot-widget>
```

**Limits:** Only JSON-safe identifiers are accepted: **`[a-zA-Z_][a-zA-Z0-9_]*`**, max length **63**.

**Behavior:** The backend maps common fields (`item_name`, `guest_name`, `note`, `description`, `severity`, `semantic_vector`, etc.). Retrieval uses severity keywords in the query, optional **`semantic_vector`** on rows, lexical overlap, plus an exact **`itemId`** lookup when pinned by the embed host.

### External launcher (your own buttons)

By default each widget shows its built-in launcher (blue/emerald bubble for `<ai-chatbot-widget>`, draggable emerald robot for `<knowledge-chatbot-widget>`). Set **`launcher="external"`** to hide that launcher and drive the panel from your page:

- **`element.open()`** — show the panel  
- **`element.open('prompt')`** — show panel and auto-send prompt  
- **`element.close()`** — hide it  
- **`element.toggle()`** — toggle  

Example: **`SampleIntegrations/light-theme-button-click.html`**.

### Features

- **Shadow DOM** (both widgets): Host-site global CSS does not override the chat UI.
- **Charts** (both widgets): Use `+` → **Chart Report** and ask for data the model can return as chart JSON; **Recharts** renders it in the widget.
- **Emerald Branding**: Premium dark/light emerald themes designed for modern hotel and corporate dashboards.
