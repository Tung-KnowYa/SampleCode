/** @typedef {{ id: string; title: string; updatedAt: number | null; pinned: boolean }} ChatConversation */

const STORAGE_KEY = 'embeddable-assistant-chat-conversations-v1';

function normalizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : null;
  let title = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!id) return null;
  if (!title) title = 'Untitled';
  const updatedAtRaw = raw.updatedAt;
  let updatedAt = null;
  if (typeof updatedAtRaw === 'number' && Number.isFinite(updatedAtRaw)) updatedAt = updatedAtRaw;
  const pinned = Boolean(raw.pinned);
  return { id, title, updatedAt, pinned };
}

/**
 * @returns {ChatConversation[]}
 */
export function loadChatConversations() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const list = [];
    for (const item of parsed) {
      const n = normalizeItem(item);
      if (n) list.push(n);
    }
    return list;
  } catch {
    return [];
  }
}

/**
 * @param {ChatConversation[]} conversations
 */
export function saveChatConversations(conversations) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    /* quota, private mode, etc. */
  }
}

export function createConversationId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Placeholder label for an empty thread from "New chat" (unique vs existing list titles).
 * @param {ChatConversation[]} list
 * @returns {string}
 */
export function nextUntitledPlaceholderTitle(list) {
  const used = new Set(
    (list || [])
      .map((c) => (typeof c.title === 'string' ? c.title.trim() : ''))
      .filter(Boolean)
  );
  const base = 'Untitled chat';
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base} (${n})`)) n += 1;
  return `${base} (${n})`;
}

/** Single-line title for the history list (first user line). */
export function truncateChatListTitle(text, maxLen = 52) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return 'New chat';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

/**
 * @param {number | null | undefined} ts
 */
export function formatChatRelativeTime(ts) {
  if (ts == null || typeof ts !== 'number' || !Number.isFinite(ts)) return '';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 10) return 'Just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  return `${day} day${day === 1 ? '' : 's'} ago`;
}
