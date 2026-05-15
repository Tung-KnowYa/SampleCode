const STORAGE_KEY = 'embeddable-assistant-chat-transcripts-v1';

function normalizeMessage(m) {
  if (!m || typeof m !== 'object') return null;
  const role = m.role === 'user' || m.role === 'assistant' ? m.role : null;
  if (!role) return null;
  const content = typeof m.content === 'string' ? m.content : String(m.content ?? '');
  const out = { role, content };
  if (m.tool !== undefined && m.tool !== null) {
    out.tool = m.tool;
  }
  return out;
}

function readMap() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

/**
 * @param {string} conversationId
 * @returns {{ role: string, content: string, tool?: unknown }[]}
 */
export function loadMessagesForConversation(conversationId) {
  if (typeof window === 'undefined' || !conversationId) return [];
  try {
    const map = readMap();
    const list = map[conversationId];
    if (!Array.isArray(list)) return [];
    return list.map(normalizeMessage).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * @param {string} conversationId
 * @param {{ role: string, content: string, tool?: unknown }[]} messages
 */
export function saveMessagesForConversation(conversationId, messages) {
  if (typeof window === 'undefined' || !conversationId) return;
  try {
    const next = readMap();
    next[conversationId] = messages.map(normalizeMessage).filter(Boolean);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota, private mode */
  }
}
export function deleteMessagesForConversation(conversationId) {
  if (typeof window === 'undefined' || !conversationId) return;
  try {
    const next = readMap();
    delete next[conversationId];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota, private mode */
  }
}
