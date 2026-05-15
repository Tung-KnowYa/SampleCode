/** @typedef {{ role: 'user' | 'assistant', content: string }} ChatTurn */

const DEFAULT_MAX_MESSAGES = 48;
const DEFAULT_MAX_CHARS = 8000;

/**
 * Normalizes client-supplied transcript for LLM + retrieval (abuse caps).
 * @param {unknown} raw
 * @param {{ maxMessages?: number, maxCharsPerMessage?: number }} [opts]
 * @returns {ChatTurn[]}
 */
function sanitizeChatHistory(raw, opts = {}) {
  const maxMessages = opts.maxMessages ?? DEFAULT_MAX_MESSAGES;
  const maxChars = opts.maxCharsPerMessage ?? DEFAULT_MAX_CHARS;

  if (!Array.isArray(raw)) return [];

  /** @type {ChatTurn[]} */
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const role = item.role === 'assistant' ? 'assistant' : item.role === 'user' ? 'user' : null;
    if (!role) continue;
    let content = typeof item.content === 'string' ? item.content : '';
    content = content.trim();
    if (!content) continue;
    if (content.length > maxChars) content = `${content.slice(0, maxChars)}…`;
    out.push({ role, content });
  }
  return out.length > maxMessages ? out.slice(-maxMessages) : out;
}

/**
 * Improves RAG when the latest message is a short follow-up ("expand that", "same for Q2").
 * @param {string} message
 * @param {ChatTurn[]} sanitizedHistory
 */
function buildRetrievalQuery(message, sanitizedHistory) {
  const msg = String(message || '').trim();
  if (!msg) return msg;
  const lastUser = [...sanitizedHistory].reverse().find((m) => m.role === 'user');
  if (!lastUser?.content) return msg;
  const prev = lastUser.content.trim();
  if (!prev || prev === msg) return msg;
  const combined = `${prev}\n${msg}`;
  return combined.length > 12000 ? combined.slice(0, 12000) : combined;
}

module.exports = { sanitizeChatHistory, buildRetrievalQuery };
