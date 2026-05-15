import { useState, useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import { resolveChatEndpoint } from './api';
import { loadMessagesForConversation, saveMessagesForConversation } from './chatMessagesStorage';

/**
 * Parse SSE `data: {...}` blocks from a buffer; returns unconsumed tail.
 * @param {string} buffer
 * @param {(ev: Record<string, unknown>) => void} onEvent
 * @returns {string}
 */
function consumeSseBuffer(buffer, onEvent) {
  let rest = buffer;
  let idx;
  while ((idx = rest.indexOf('\n\n')) !== -1) {
    const block = rest.slice(0, idx);
    rest = rest.slice(idx + 2);
    const lines = block.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      const trimmed = lines[i].trimEnd();
      if (!trimmed.startsWith('data:')) continue;
      const json = trimmed.slice(trimmed.startsWith('data: ') ? 6 : 5).trim();
      if (!json) continue;
      try {
        onEvent(JSON.parse(json));
      } catch {
        /* ignore malformed */
      }
    }
  }
  return rest;
}

/**
 * @typedef {{ role: 'user' | 'assistant', content: string, tool?: unknown }} ChatMessage
 */

/**
 * Shared chat POST flow for both widgets. `source` is the API field (`data` | `knowledge`).
 * Refs are updated synchronously each render so `fetch` always sees the latest `apiBase` /
 * `source` / `input` / `selectedTool` (no stale reads from `useEffect` ordering).
 * Sends prior transcript as `history` on `/api/chat` so the model can answer follow-ups in-thread.
 *
 * @param {object} opts
 * @param {string} opts.apiBase
 * @param {'data' | 'knowledge'} opts.source
 * @param {string | null} [opts.conversationId] When set, messages load from / persist to localStorage for that id.
 * @param {string | null | undefined} [opts.itemId] Data mode — primary key value for the configured id column; sent as `itemId` on `/api/chat` when using the Data tab.
 * @param {string | null | undefined} [opts.itemDbTbl] Optional operational table (JSON `itemDbTbl`). DOM `item-db-tbl` on `<ai-chatbot-widget>`.
 * @param {string | null | undefined} [opts.itemDbColId] Optional id column name (`itemDbColId`). DOM `item-db-col-id`.
 * @param {React.MutableRefObject<string | null>} [opts.skipLoadForConversationIdRef] Set to a new id before
 *   activating it during the first `handleSend` so the load effect does not clobber in-flight messages.
 * @returns {object} Including `handleSend(content?, options?)`. Pass `{ initialPrompt: true }` only for the
 *   host‑preset opening turn (`initial-prompt` attribute or programmatic `open(prompt)` auto-send).
 */
export function useChatSession({
  apiBase,
  source,
  conversationId = null,
  skipLoadForConversationIdRef,
  itemId = null,
  itemDbTbl = null,
  itemDbColId = null,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  const apiBaseRef = useRef(apiBase);
  const sourceRef = useRef(source);
  const itemIdRef = useRef(itemId);
  const itemDbTblRef = useRef(itemDbTbl);
  const itemDbColIdRef = useRef(itemDbColId);
  const inputRef = useRef(input);
  const selectedToolRef = useRef(selectedTool);
  /** Set in layout after `messages` matches `conversationId` (avoids save/title using a stale id + old thread). */
  const transcriptForConversationIdRef = useRef(null);
  const messagesRef = useRef(messages);

  apiBaseRef.current = apiBase;
  sourceRef.current = source;
  itemIdRef.current = itemId;
  itemDbTblRef.current = itemDbTbl;
  itemDbColIdRef.current = itemDbColId;
  inputRef.current = input;
  selectedToolRef.current = selectedTool;
  messagesRef.current = messages;

  useLayoutEffect(() => {
    transcriptForConversationIdRef.current = null;
    if (!conversationId) {
      setMessages([]);
      return;
    }
    if (skipLoadForConversationIdRef?.current === conversationId) {
      skipLoadForConversationIdRef.current = null;
      transcriptForConversationIdRef.current = conversationId;
      return;
    }
    setMessages(loadMessagesForConversation(conversationId));
    transcriptForConversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    if (transcriptForConversationIdRef.current !== conversationId) return;
    saveMessagesForConversation(conversationId, messagesRef.current);
  }, [conversationId, messages]);

  const handleSend = useCallback(async (contentOverride, options = {}) => {
    const raw = contentOverride !== undefined ? String(contentOverride) : inputRef.current;
    const text = raw.trim();
    if (!text) return;

    const flagInitialPreset = Boolean(options && options.initialPrompt);
    const tool = selectedToolRef.current;
    const userMsg = { role: 'user', content: text, tool };

    const historyForApi = messagesRef.current
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role,
        content: String(m.content ?? ''),
      }));

    setMessages((prev) => [...prev, userMsg]);
    if (contentOverride === undefined) setInput('');
    setShowTools(false);
    setIsThinking(true);

    const rawFocus =
      sourceRef.current === 'data'
        ? String(itemIdRef.current ?? '')
            .trim()
            .slice(0, 2048)
        : '';
    const itemIdPayload = rawFocus || undefined;

    const rawTbl =
      sourceRef.current === 'data'
        ? String(itemDbTblRef.current ?? '')
            .trim()
            .slice(0, 128)
        : '';
    const rawCol =
      sourceRef.current === 'data'
        ? String(itemDbColIdRef.current ?? '')
            .trim()
            .slice(0, 128)
        : '';
    const itemDbTblPayload = rawTbl || undefined;
    const itemDbColIdPayload = rawCol || undefined;

    try {
      const response = await fetch(resolveChatEndpoint(apiBaseRef.current), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          tool: userMsg.tool,
          source: sourceRef.current,
          history: historyForApi,
          stream: true,
          initialPrompt:
            Boolean(flagInitialPreset) &&
            Array.isArray(historyForApi) &&
            historyForApi.length === 0,
          ...(itemIdPayload ? { itemId: itemIdPayload } : {}),
          ...(itemDbTblPayload ? { itemDbTbl: itemDbTblPayload } : {}),
          ...(itemDbColIdPayload ? { itemDbColId: itemDbColIdPayload } : {}),
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantStarted = false;

        /** @param {string} text */
        const appendAssistantChunk = (text) => {
          if (!text) return;
          setMessages((prev) => {
            const next = [...prev];
            const last = next.length - 1;
            if (last >= 0 && next[last].role === 'assistant') {
              const cur = String(next[last].content ?? '');
              next[last] = { ...next[last], content: cur + text };
            }
            return next;
          });
        };

        /** @param {string} text */
        const setAssistantContent = (text) => {
          setMessages((prev) => {
            const next = [...prev];
            const last = next.length - 1;
            if (last >= 0 && next[last].role === 'assistant') {
              next[last] = { ...next[last], content: text };
            } else {
              next.push({ role: 'assistant', content: text });
            }
            return next;
          });
        };

        /** @param {Record<string, unknown>} ev */
        const handleSseEvent = (ev) => {
          const t = ev && ev.type;
          if (t === 'delta' && typeof ev.text === 'string') {
            if (!assistantStarted) {
              assistantStarted = true;
              setIsThinking(false);
              setMessages((prev) => [...prev, { role: 'assistant', content: ev.text }]);
            } else {
              appendAssistantChunk(ev.text);
            }
            return;
          }
          if (t === 'done' && typeof ev.reply === 'string') {
            if (!assistantStarted) {
              assistantStarted = true;
              setIsThinking(false);
              setMessages((prev) => [...prev, { role: 'assistant', content: ev.reply }]);
            } else {
              setAssistantContent(ev.reply);
            }
            return;
          }
          if (t === 'error') {
            setIsThinking(false);
            const base =
              typeof ev.error === 'string' && ev.error
                ? ev.error
                : 'We could not complete this reply.';
            const detail =
              typeof ev.detail === 'string' && ev.detail ? ` — ${ev.detail}` : '';
            const errLine = `Oops! ${base}${detail}`;
            if (!assistantStarted) {
              assistantStarted = true;
              setMessages((prev) => [...prev, { role: 'assistant', content: errLine }]);
            } else {
              setAssistantContent(errLine);
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          buffer = consumeSseBuffer(buffer, handleSseEvent);
        }
        if (buffer.trim().length) {
          consumeSseBuffer(`${buffer}\n\n`, handleSseEvent);
        }

        if (!response.ok && !assistantStarted) {
          throw new Error(`Request failed (${response.status})`);
        }
        if (response.ok && !assistantStarted) {
          throw new Error('The assistant returned an empty response.');
        }
      } else {
        let data = {};
        try {
          data = await response.json();
        } catch {
          data = {};
        }

        if (!response.ok) {
          const base = data.error || `Request failed (${response.status})`;
          const detail = data.detail ? ` — ${data.detail}` : '';
          throw new Error(`${base}${detail}`);
        }

        setMessages((prev) => [...prev, { role: 'assistant', content: String(data.reply ?? '') }]);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setMessages((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: `Oops! ${msg}` };
          return next;
        }
        return [...prev, { role: 'assistant', content: `Oops! ${msg}` }];
      });
    } finally {
      setIsThinking(false);
      setSelectedTool(null);
    }
  }, []);

  return {
    messages,
    setMessages,
    messagesRef,
    input,
    setInput,
    isThinking,
    showTools,
    setShowTools,
    selectedTool,
    setSelectedTool,
    handleSend,
    transcriptForConversationIdRef,
  };
}
