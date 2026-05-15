const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const env = require('./config/env');
const { PORT } = env;
const { resolveTTSClientConfig, synthesizeSpeech } = require('./lib/ai/tts-speech');
const { createLLMProvider } = require('./lib/ai/factory');
const { resolveOperationalTableConfig } = require('./lib/operationalDataSource');
const { searchKnowledgeBase, searchDataItemsContext } = require('./queries/search');
const { isExportTool, buildExportFile } = require('./lib/exportDocuments');
const { sanitizeChatHistory, buildRetrievalQuery } = require('./lib/chatHistory');

const llm = createLLMProvider(env);

/** OpenAI-compatible TTS (`/v1/audio/speech`). Null when unset (no liteLLM key / no overrides). */
const ttsResolved = resolveTTSClientConfig(env.ai, env.tts);

const app = express();
app.use(cors());
app.use(express.json());

/** Short-lived generated exports (binary); id -> { buffer, mimeType, downloadName, expires } */
const exportCache = new Map();

function putExportInCache({ buffer, mimeType, downloadName }) {
  const id = crypto.randomBytes(24).toString('hex');
  exportCache.set(id, {
    buffer,
    mimeType,
    downloadName,
    expires: Date.now() + 30 * 60 * 1000,
  });
  return id;
}

/**
 * Swap raw item ids inside [Source: …] for labels from the current retrieval set.
 * @param {string} text
 * @param {Record<string, string>} citeByItemId
 */
function rewriteDataSourceCitations(text, citeByItemId) {
  if (typeof text !== 'string' || !citeByItemId) return text;
  const keys = Object.keys(citeByItemId);
  if (keys.length === 0) return text;

  return text.replace(/\[Source:\s*([^\]]+)]/gi, (full, innerRaw) => {
    let inner = String(innerRaw).trim();
    try {
      const dec = decodeURIComponent(inner);
      if (dec) inner = dec.trim();
    } catch {
      /* ignore */
    }

    if (citeByItemId[inner]) return `[Source: ${citeByItemId[inner]}]`;

    const norm = inner.replace(/…+$/u, '').replace(/\.{2,}$/, '').trim();
    if (citeByItemId[norm]) return `[Source: ${citeByItemId[norm]}]`;

    for (const k of keys) {
      if (norm.length >= 8 && k.startsWith(norm)) return `[Source: ${citeByItemId[k]}]`;
    }
    for (const k of keys) {
      if (inner.length >= 8 && inner.length <= k.length && k.startsWith(inner)) {
        return `[Source: ${citeByItemId[k]}]`;
      }
    }
    return full;
  });
}

/**
 * Drop a trailing "Sources" / "References" block the model often prints after the answerBody.
 * @param {string} text
 */
function stripTrailingSourcesSection(text) {
  if (typeof text !== 'string') return text;
  const re = /\n(?:#{1,6}\s*)?(?:\*\*)?\s*(sources|references)(?:\*\*)?\s*:/gi;
  let last = -1;
  let m;
  while ((m = re.exec(text)) !== null) last = m.index;
  if (last === -1) return text;
  const tail = text.slice(last);
  if (tail.length > 8000) return text;
  return text.slice(0, last).trimEnd();
}

/**
 * Remove a trailing cut-off citation (model hit max_tokens mid–`[Source: …]`).
 * @param {string} text
 */
function stripIncompleteTrailingCitation(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  const re = /\[Source\b/gi;
  let lastStart = -1;
  let m;
  while ((m = re.exec(text)) !== null) lastStart = m.index;
  if (lastStart === -1) return text;
  const tail = text.slice(lastStart);
  if (tail.includes(']')) return text;
  return text
    .slice(0, lastStart)
    .replace(/[ \t\u00a0]+$/, '')
    .replace(/(?:[.,;:!?\-–—…]\s*)+$/u, '')
    .trimEnd();
}

/**
 * Data tab only: append a section with ideas from knowledge-base RAG plus general best practices.
 * Enabled by default (equivalent to CHAT_DATA_MODE_SUGGESTION=1). Disable with 0 / false / off / no.
 *
 * @param {{ userMessage: string, dataReply: string, retrievalQuery: string, llm: { chatComplete: Function, embedText?: Function } }} p
 * @returns {Promise<string>}
 */
async function buildDataModeSuggestedSolutionSection(p) {
  const { userMessage, dataReply, retrievalQuery, llm } = p;
  const flag = String(process.env.CHAT_DATA_MODE_SUGGESTION ?? '1')
    .trim()
    .toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'off' || flag === 'no') {
    return '';
  }

  let kbContext = '';
  try {
    kbContext = await searchKnowledgeBase(retrievalQuery, llm);
  } catch (e) {
    console.warn('Knowledge retrieval for suggested solutions skipped:', e?.message || e);
  }

  const excerpt = String(dataReply || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 6000);
  const kbBlock =
    kbContext && String(kbContext).trim()
      ? String(kbContext).trim()
      : '(No knowledge-base excerpts were retrieved for this query. Use general operational best practices only.)';

  const system = `You write one optional continuation for an enterprise operations assistant.
The user already received a primary answer from **operational data (items / tickets)**. Your job is to add **suggested / possible solutions**: next steps, checks, mitigations, escalation, verification, or prevention for the same underlying issue.

Combine:
1) **Knowledge base** text in the user message (when it is not the empty-retrieval notice). For facts from those documents, cite inline using \`[Source: <exact document name>]\` exactly as in the \`[Document: ...]\` line.
2) **General knowledge** and widely accepted IT/ops practice. Present these as general guidance, not as if they were company-specific facts from the KB.

Rules:
- Use the same language as the user's question when you can.
- Do not repeat the data reply; add new actionable value.
- Do not invent ticket IDs, metrics, or field values unless they appear in the data-reply excerpt or the knowledge context.
- Stay concise: about 4–10 bullet points or two short paragraphs.
- Do **not** output a markdown heading (no # line); the app supplies the section title. Body only: paragraphs and/or bullet lists.`;

  const userPayload = `User question:\n${userMessage}\n\nData-focused reply (may be truncated):\n${excerpt}\n\n---\n\nKnowledge base context:\n${kbBlock}`;

  try {
    const cap =
      typeof env.ai?.litellm?.maxTokens === 'number' && Number.isFinite(env.ai.litellm.maxTokens)
        ? env.ai.litellm.maxTokens
        : 2048;
    const body = await llm.chatComplete(
      [
        { role: 'system', content: system },
        { role: 'user', content: userPayload },
      ],
      { maxTokens: Math.min(1536, cap) }
    );
    const trimmed = stripIncompleteTrailingCitation(String(body || '').trim());
    if (!trimmed) return '';
    return `\n\n---\n\n**Suggested / possible solutions**\n\n${trimmed}`;
  } catch (e) {
    console.warn('Suggested solutions chat failed:', e?.message || e);
    return '';
  }
}

app.get('/api/exports/:id', (req, res) => {
  const entry = exportCache.get(req.params.id);
  if (!entry || entry.expires < Date.now()) {
    return res.status(404).type('text/plain').send('Download link expired or is invalid.');
  }
  res.setHeader('Content-Type', entry.mimeType);
  const safeName = String(entry.downloadName || 'download').replace(/[^\w.\-]+/g, '_');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.send(entry.buffer);
});

/**
 * @swagger
 * /api/tts:
 *  post:
 *    summary: Text-to-speech (OpenAI-compatible audio model via proxy / provider)
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - text
 *            properties:
 *              text:
 *                type: string
 *                description: Plain text to synthesize (markdown should be stripped client-side).
 *                maxLength: 16000
 *    responses:
 *      '200':
 *        description: Audio stream (default MP3).
 *        content:
 *          audio/mpeg:
 *            schema:
 *              type: string
 *              format: binary
 *          audio/wav:
 *            schema:
 *              type: string
 *              format: binary
 *      '400':
 *        description: Missing or invalid payload
 *      '503':
 *        description: TTS not configured or upstream failure
 */
app.post('/api/tts', async (req, res) => {
  try {
    if (!ttsResolved) {
      return res.status(503).json({
        error:
          'Text-to-speech is not configured. Set TTS_BASE_URL and TTS_API_KEY (OpenAI-compatible), or use AI_PROVIDER=litellm with a proxy that exposes /v1/audio/speech.',
      });
    }

    const body = req.body;
    const textRaw =
      body && typeof body.text === 'string'
        ? body.text
        : body && typeof body.text === 'number'
          ? String(body.text)
          : '';
    const textIn = textRaw.normalize('NFKC').trim().slice(0, ttsResolved.maxChars);

    if (!textIn.length) {
      return res.status(400).json({ error: '`text` is required and cannot be empty after trimming.' });
    }

    const { buffer, mimeType } = await synthesizeSpeech({
      config: ttsResolved,
      text: textIn,
    });
    res.status(200).type(mimeType).setHeader('Cache-Control', 'no-store').send(buffer);
  } catch (e) {
    console.error('TTS Error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    const detail =
      String(process.env.TTS_ERROR_DETAIL || '').trim() === '1'
        ? { detail: String(msg || 'unknown_error').slice(0, 500) }
        : {};
    res.status(503).json({
      error: 'Text-to-speech failed. Verify TTS_* settings and proxy model access.',
      ...detail,
    });
  }
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/chat:
 *  post:
 *    summary: Chat with the AI using RAG
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - message
 *            properties:
 *              message:
 *                type: string
 *                example: "What should I know about data protection?"
 *              tool:
 *                type: string
 *              source:
 *                type: string
 *                enum: [data, knowledge]
 *                description: Question source tab — data reads bundled `demo-datasets.json` (`ITEM_DB_TABLE` key, default items); knowledge reads `demo-knowledge-base.json`.
 *              history:
 *                type: array
 *                description: Prior turns in this conversation (user/assistant), excluding the current `message`. Optional; capped server-side.
 *                items:
 *                  type: object
 *                  properties:
 *                    role:
 *                      type: string
 *                      enum: [user, assistant]
 *                    content:
 *                      type: string
 *              itemId:
 *                type: string
 *                description: Data mode — exact primary key value for `itemDbColId` (default `items.item_id`), from the embed host.
 *              item_id:
 *                type: string
 *                description: Snake_case alias of `itemId`.
 *              itemDbTbl:
 *                type: string
 *                description: Optional. Logical dataset key in `demo-datasets.json` instead of env `ITEM_DB_TABLE` / default `items`. Safe identifier [a-zA-Z_][a-zA-Z0-9_]*
 *              item_db_tbl:
 *                type: string
 *                description: Snake_case alias of `itemDbTbl`.
 *              itemDbColId:
 *                type: string
 *                description: Optional. Column treated as the row id / `itemId` pin (default `item_id`). Example `device_id` for `intune_managed_devices`.
 *              item_db_col_id:
 *                type: string
 *                description: Snake_case alias of `itemDbColId`.
 *              initialPrompt:
 *                type: boolean
 *                description: Set true when this request is the host-preset opening turn (DOM `initial-prompt`, or `open(prompt)` auto-send); server may tune first-reply tone. Ignored for shaping when synthetic history exists.
 *              initial_prompt:
 *                type: boolean
 *                description: Snake_case alias of `initialPrompt` for non-JSON-typical clients.
 *              stream:
 *                type: boolean
 *                description: When true, the response is `text/event-stream` with SSE `data:` JSON events (`delta`, `done`, `error`) instead of a single JSON body.
 *    responses:
 *      '200':
 *        description: AI response (JSON `{ reply }`, or SSE when `stream` is true)
 */

/** @param {unknown} body */
function readFocusItemId(body) {
  if (!body || typeof body !== 'object') return '';
  /** @type {unknown} */
  const raw = Object.prototype.hasOwnProperty.call(body, 'itemId') ? body.itemId : body.item_id;
  if (raw === undefined || raw === null) return '';
  const s = String(raw).trim();
  if (!s || s.length > 2048) return '';
  return s;
}

/**
 * Dashboard embeds `item_id: …` inside the opening message when no JSON `itemId` is sent.
 * Take the last `item_id:` line so accidental duplicates still resolve to the final id.
 * @param {unknown} message
 * @returns {string}
 */
function extractFocusItemIdFromMessage(message) {
  const s = String(message ?? '');
  let last = '';
  const re = /(?:^|[\r\n])item_id:\s*([^\r\n]+)/gi;
  let m;
  while ((m = re.exec(s)) !== null) {
    const cand = String(m[1] ?? '')
      .trim()
      .slice(0, 2048);
    if (cand) last = cand;
  }
  return last;
}

/** @param {unknown} body @param {string} source */
function resolveFocusItemId(body, source) {
  const direct = readFocusItemId(body);
  if (direct) return direct;
  if (source !== 'data' || !body || typeof body !== 'object') return '';
  const msg = /** @type {{ message?: unknown }} */ (body).message;
  if (typeof msg !== 'string') return '';
  return extractFocusItemIdFromMessage(msg);
}

/** @param {unknown} body */
function readInitialPromptFlag(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.initialPrompt === true) return true;
  if (body.initial_prompt === true) return true;
  return false;
}

/** @param {unknown} body */
function readStreamFlag(body) {
  if (!body || typeof body !== 'object') return false;
  if (body.stream === true) return true;
  return false;
}

/**
 * Citation cleanup, data-mode suggestions, and optional exports — shared by JSON and SSE chat responses.
 * @param {object} args
 * @param {string} args.replyRaw
 * @param {'data' | 'knowledge'} args.source
 * @param {Record<string, string>} args.dataCiteByItemId
 * @param {string} args.userMessage
 * @param {string} args.retrievalQuery
 * @param {object} args.llm
 * @param {unknown} args.tool
 * @param {import('express').Request} args.req
 */
async function finalizeAssistantReply(args) {
  const {
    replyRaw,
    source,
    dataCiteByItemId,
    userMessage,
    retrievalQuery,
    llm: llmInstance,
    tool,
    req,
  } = args;

  let reply = replyRaw;
  if (source === 'data') {
    reply = rewriteDataSourceCitations(reply, dataCiteByItemId);
  }
  reply = stripIncompleteTrailingCitation(stripTrailingSourcesSection(reply));

  if (source === 'data') {
    const suggestionSection = await buildDataModeSuggestedSolutionSection({
      userMessage,
      dataReply: reply,
      retrievalQuery,
      llm: llmInstance,
    });
    if (suggestionSection) {
      reply += suggestionSection;
      reply = stripIncompleteTrailingCitation(stripTrailingSourcesSection(reply));
    }
  }

  if (isExportTool(tool)) {
    try {
      const file = await buildExportFile(tool, reply, userMessage);
      if (file) {
        const id = putExportInCache({
          buffer: file.buffer,
          mimeType: file.mimeType,
          downloadName: file.downloadName,
        });
        const base =
          (env.publicBaseUrl && String(env.publicBaseUrl).trim()) ||
          `${req.protocol}://${req.get('host')}`;
        const basePath = base.replace(/\/$/, '');
        const url = `${basePath}/api/exports/${id}`;
        const shortLabel =
          tool === 'Excel workbook'
            ? 'Excel'
            : tool === 'PowerPoint'
              ? 'PowerPoint'
              : tool.replace(' document', '');
        reply = `${reply}\n\n---\n\n**Download** (${shortLabel}): [${file.downloadName}](${url})`;
      }
    } catch (exportErr) {
      console.error('Export build failed:', exportErr);
      reply = `${reply}\n\n_(Could not generate the downloadable file. Please try again or pick another format.)_`;
    }
  }

  return reply;
}

app.post('/api/chat', async (req, res) => {
  const { message, tool, source: sourceRaw, history: historyRaw } = req.body;
  const source = sourceRaw === 'data' ? 'data' : 'knowledge';

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const history = sanitizeChatHistory(historyRaw);
  const presetOpeningTurn =
    readInitialPromptFlag(req.body) && Array.isArray(history) && history.length === 0;
  const retrievalQuery = buildRetrievalQuery(String(message).trim(), history);
  const focusItemId = resolveFocusItemId(req.body, source);

  try {
    // 1. Retrieve context: bundled knowledge chunks vs bundled operational rows
    /** @type {Record<string, string>} */
    const dataCiteByItemId = Object.create(null);
    let context;
    const operationalDataSource = resolveOperationalTableConfig(req.body, env.itemDb);
    if (source === 'data') {
      const dataCtx = await searchDataItemsContext(
        retrievalQuery,
        llm,
        5,
        focusItemId,
        operationalDataSource
      );
      context = dataCtx.context;
      Object.assign(dataCiteByItemId, dataCtx.citeByItemId);
    } else {
      context = await searchKnowledgeBase(retrievalQuery, llm);
    }

    // 2. Format Tool Instructions
    let toolInstruction = "Answer the user clearly using Markdown.";
    if (tool === 'Chart Report') {
      toolInstruction = `You must provide a JSON chart format wrapped in \`\`\`json chart ... \`\`\`. Example format: [{"name": "A", "value": 400}, {"name": "B", "value": 300}]. Provide brief text context before the chart.`;
    } else if (tool === 'Table Report') {
      toolInstruction = "You must output the relevant data strictly as a Markdown Table.";
    } else if (tool === 'Insights Report') {
      toolInstruction = "Provide a deep dive structural insight report using H3 (###), bullet points, and actionable takeaways.";
    } else if (
      tool === 'Word document' ||
      tool === 'PDF document' ||
      tool === 'PowerPoint' ||
      tool === 'Excel workbook'
    ) {
      toolInstruction =
        'Structure the answer as a professional document in Markdown: a one-line summary first, then ## section headings (gold-style emphasis in headings is ok in text), use bullet lists with leading - , short paragraphs, and Markdown tables where they clarify data. No fenced code blocks unless a tiny example is essential. The same content will be placed into an export file for the user.';
    } else {
        toolInstruction = `
Choose the most appropriate format for each response. For example:
- For 'how to' or 'list' or step-by-step questions: use a numbered list
- For policy, regulation or rule questions: use 2-3 prose sentences with citations
- For comparison questions: use a brief comparison Markdown table
- For simple factual questions: use a single sentence or short paragraph but not too short
- For complex multi-part questions: use short sections with subheadings and Markdown tables where appropriate
But ensure to cover all important information in every case.
        `;
    }

    // 3. Generate Completion
    const contextLabel = source === 'data' ? 'Items dataset (tickets / records)' : 'Knowledge base documents';

    let systemPrompt = `You are an AI assistant. Use the following context to answer the query accurately.\nContext (${contextLabel}):\n${context}\n\nInstruction: ${toolInstruction}\nEarlier user and assistant messages may appear before the latest question — use them for follow-ups, pronouns, and continued threads.\n\n`;

    if (source === 'data') {
      systemPrompt += `
Guidelines:
- Markdown Table format is preferred for tabular data where appropriate.
- Only use information from the provided item records in the context. Each block starts with a line like \`[Item <item_id>] <item_name>\` followed by optional fields (\`severity\`, \`status\`, etc.) and the note text.
- NEVER use the phrase "I don't have that information in my current knowledge base." — that is wrong for this mode. If context is empty or insufficient, explain in the user's language that no matching **items** were found, and switching to the **Knowledge** tab may help for documentation or policy.
- When citing a fact from an item, copy **exactly** the bracket from the line \`Use this citation (verbatim): [Source: …]\` in that item’s block. Never paste the raw \`item_id\` (long \`AAMk…\` strings) into citations.
- Complete the sentence or paragraph **before** you start an inline \`[Source: …]\` citation — do not let the reply stop inside \`[Source\` or mid-citation.
- Do **not** add a trailing "Sources:", "References:", or bullet list of citations at the end of the answer. Keep citations inline next to the relevant sentences or table rows only; avoid repeating the same source many times.
- Do NOT cite fake document filenames (e.g. *.txt) unless that exact string appears inside an item's text.
- If the context is empty or the answer is not supported by it, do not invent items or numbers. Reply briefly in the same language as the user's message: explain that no matching operational records were found in the demo dataset (see \`demo-datasets.json\` / \`ITEM_DB_TABLE\`) or the question did not match any rows. Suggest trying the **Knowledge** tab for documentation or policy questions. Keep the tone helpful.
- Prefer summarizing counts, severities, statuses, and key fields from the context when the user asks analytical questions.
- Do not invent items, metrics, or ticket details not present in the context.
${focusItemId ? '- When a specific item_id was supplied (JSON `itemId` / `item_id`, or an `item_id:` line in the user message), prioritize that record’s block in context for entity-specific answers (still cite using the verbatim [Source: …] line).' : ''}
- If the question is ambiguous, ask for clarification.`;
    } else {
      systemPrompt += `
Guidelines:
- Only use information from the provided context to answer questions.
- If the answer is not clearly present in the context, respond with:
  "I don’t have that information in my current knowledge base, or the network connection may have been temporarily interrupted. Please try again or rephrase your request slightly."
- For short policy or list questions, if the context contains only partial lines, quote or summarize what is present; do not invent lists that are not supported by the text.
- Each context block starts with a line \`[Document: ...]\`. That value is the exact \`document_name\` stored in the knowledge base (file path, label, or URL). When you cite, copy it verbatim inside the citation — no invented filenames.
- When you use information from a specific document, add a brief inline citation: \`[Source: <exact Document name>]\`
  Examples: \`[Source: policies/returns_policy.txt]\` or \`[Source: https://example.com/docs/handbook]\` (use the exact string from the \`[Document: ...]\` line).
- Finish the sentence **before** the \`[Source: …]\` token; never end the answer with an unfinished \`[Source\` or a citation missing its closing bracket.
- Do **not** add a trailing "Sources:" or "References:" section; keep citations inline only.
- Keep answers clear and concise. Use bullet points for lists.
- Do not make up information or draw on general knowledge outside the provided context.
- Do not provide legal/medical/financial advice.
- If the question is ambiguous, ask for clarification.`;
    }

    if (presetOpeningTurn) {
      systemPrompt += `
Session note:
- The user's first message in this thread was supplied by the host application (preset / initial prompt when the panel opened), not typed live in this moment.
- Answer the question fully and directly first; optionally add **one brief** inviting sentence offering follow‑up — keep tone professional and light.`;
    }

    /** @type {{ role: string, content: string }[]} */
    const completionMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ];

    const userMessage = String(message).trim();
    const wantStream = readStreamFlag(req.body);

    if (wantStream) {
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      /** @param {Record<string, unknown>} obj */
      function sendSse(obj) {
        res.write(`data: ${JSON.stringify(obj)}\n\n`);
      }

      try {
        const replyRaw = await llm.chatCompleteStream(completionMessages, {}, (text) => {
          if (text) sendSse({ type: 'delta', text });
        });
        const reply = await finalizeAssistantReply({
          replyRaw,
          source,
          dataCiteByItemId,
          userMessage,
          retrievalQuery,
          llm,
          tool,
          req,
        });
        sendSse({ type: 'done', reply });
      } catch (streamErr) {
        console.error('Chat Error (stream):', streamErr);
        const payload = {
          type: 'error',
          error:
            'We are currently experiencing issues connecting to the service. Please try again later.',
        };
        if (String(process.env.CHAT_ERROR_DETAIL || '').trim() === '1') {
          const msg = streamErr?.message || String(streamErr);
          payload.detail = msg.slice(0, 500);
        }
        sendSse(payload);
      }
      res.end();
      return;
    }

    let reply = await llm.chatComplete(completionMessages);
    reply = await finalizeAssistantReply({
      replyRaw: reply,
      source,
      dataCiteByItemId,
      userMessage,
      retrievalQuery,
      llm,
      tool,
      req,
    });

    res.json({ reply });

  } catch (error) {
    console.error("Chat Error:", error);
    const payload = {
      error:
        'We are currently experiencing issues connecting to the service. Please try again later.',
    };
    if (String(process.env.CHAT_ERROR_DETAIL || '').trim() === '1') {
      const msg = error?.message || String(error);
      payload.detail = msg.slice(0, 500);
    }
    res.status(500).json(payload);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});
