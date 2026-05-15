import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
} from 'react';
import { X, LineChart, ChevronDown, PanelLeft, MoreHorizontal } from 'lucide-react';
import { WIDGET_CONTENT } from './chat-widget/content';
import { getThemeClasses, chartBarFillForTheme } from './chat-widget/themes';
import { useChatSession } from './chat-widget/useChatSession';
import { MessageThread } from './chat-widget/MessageThread';
import { ChatComposerFooter } from './chat-widget/ChatComposerFooter';
import { LauncherBubbleIcon } from './chat-widget/LauncherBubbleIcon';
import { ChatHistorySidebar } from './chat-widget/ChatHistorySidebar';
import {
  loadChatConversations,
  saveChatConversations,
  createConversationId,
  nextUntitledPlaceholderTitle,
  truncateChatListTitle,
  formatChatRelativeTime,
} from './chat-widget/chatConversationStorage';
import { loadMessagesForConversation, deleteMessagesForConversation } from './chat-widget/chatMessagesStorage';

/**
 * @typedef {'floating' | 'external'} LauncherMode
 * - `floating` (default): built-in launcher button when the panel is closed.
 * - `external`: no launcher; open via `<ai-chatbot-widget>.open()` from your page (set `launcher="external"`).
 */

/** @typedef {{ prompt?: string }} ChatWidgetOpenOpts */

/**
 * Embed chat panel; ref exposes `open` / `close` / `toggle`. Use `launcherMode="external"` with `open()`, or pass `initialPrompt` / `itemId` (DOM `initial-prompt` / `item-id`) for declarative presets; optional `item-db-tbl` / `item-db-col-id` select which demo JSON dataset key and id field the backend uses (default `items` / `item_id`). Set `showHistorySidebar={false}` or DOM `history-sidebar="false"` to hide the left session/history sidebar (single-thread UI).
 */
function primaryHeading(conv) {
  if (!conv) return WIDGET_CONTENT.newChatHeading;
  const t = (conv.title || '').trim();
  if (!t || /^untitled\b/i.test(t)) return WIDGET_CONTENT.newChatHeading;
  return t;
}

const DataChatbotWidget = forwardRef(function DataChatbotWidget(
  {
    theme = 'dark',
    apiBase = '',
    launcherMode = 'floating',
    initialPrompt = '',
    itemId = '',
    itemDbTbl = '',
    itemDbColId = '',
    /** When false, hides the left chat history / session sidebar for a narrower single-purpose layout. */
    showHistorySidebar = true,
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const [sourceMode] = useState('data');
  const [welcomePanelExpanded, setWelcomePanelExpanded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const emeraldTheme = theme === 'dark-emerald' || theme === 'light-emerald';

  /** In-panel light vs dark palette pair (blue/slate themes or emerald pair). Stored in React state only — not localStorage (only chat transcripts + session titles use LS). Syncs again when host `theme` attribute changes. */
  const [useLightAppearance, setUseLightAppearance] = useState(
    theme === 'light' || theme === 'light-emerald'
  );

  useEffect(() => {
    setUseLightAppearance(theme === 'light' || theme === 'light-emerald');
  }, [theme]);

  const effectiveTheme = emeraldTheme
    ? useLightAppearance
      ? 'light-emerald'
      : 'dark-emerald'
    : useLightAppearance
      ? 'light'
      : 'dark';

  const [conversations, setConversations] = useState(loadChatConversations);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const skipLoadForConversationIdRef = useRef(null);
  const messagesEndRef = useRef(null);
  const welcomePanelId = 'chat-welcome-suggested-panel';

  const themeClasses = getThemeClasses(effectiveTheme, 'light');

  const useExternalLauncher = launcherMode === 'external';

  /** Highest priority prompt for the next opened session (see `initialPrompt`). */
  const pendingOpenPromptRef = useRef(null);
  /** One auto-send per open cycle (avoids repeat sends while the panel stays open). */
  const autoSendConsumedRef = useRef(false);

  useImperativeHandle(
    ref,
    () => ({
      /**
       * @param {string | ChatWidgetOpenOpts} [opts]
       * - `open()` — opens only.
       * - `open('Your question')` or `open({ prompt: '...' })` — opens and sends that message immediately.
       */
      open: (opts) => {
        let q = '';
        if (typeof opts === 'string') q = opts.trim();
        else if (opts && typeof opts === 'object' && opts.prompt != null) q = String(opts.prompt).trim();
        pendingOpenPromptRef.current = q || null;
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((o) => !o),
    }),
    []
  );

  useEffect(() => {
    saveChatConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId && !conversations.some((c) => c.id === activeConversationId)) {
      setActiveConversationId(null);
    }
  }, [conversations, activeConversationId]);

  const {
    messages,
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
  } = useChatSession({
    apiBase,
    source: sourceMode,
    conversationId: activeConversationId,
    skipLoadForConversationIdRef,
    itemId,
    itemDbTbl,
    itemDbColId,
  });

  const messageCountsById = useMemo(() => {
    const map = {};
    for (const c of conversations) {
      map[c.id] = loadMessagesForConversation(c.id).length;
    }
    if (activeConversationId) {
      map[activeConversationId] = messages.length;
    }
    return map;
  }, [conversations, activeConversationId, messages]);

  const handleSendWithThread = useCallback(
    async (contentOverride, options) => {
      const raw = contentOverride !== undefined ? String(contentOverride) : input;
      const text = raw.trim();
      if (!text) return;

      let id = activeConversationId;
      if (!id) {
        id = createConversationId();
        skipLoadForConversationIdRef.current = id;
        const title = truncateChatListTitle(text);
        setConversations((prev) => [
          { id, title, updatedAt: Date.now(), pinned: false },
          ...prev,
        ]);
        setActiveConversationId(id);
      }
      await handleSend(contentOverride, options);
    },
    [activeConversationId, handleSend, input]
  );

  useEffect(() => {
    if (!isOpen) {
      autoSendConsumedRef.current = false;
      return;
    }
    if (autoSendConsumedRef.current) return;

    const capturedPending = pendingOpenPromptRef.current;
    pendingOpenPromptRef.current = null;
    const imperative = capturedPending != null ? String(capturedPending).trim() : '';
    const fromProp = String(initialPrompt ?? '').trim();
    const promptToSend = imperative || fromProp;
    if (!promptToSend) return;

    if (isThinking) {
      if (imperative) pendingOpenPromptRef.current = imperative;
      return;
    }

    autoSendConsumedRef.current = true;
    void handleSendWithThread(promptToSend, { initialPrompt: true });
  }, [isOpen, initialPrompt, isThinking, handleSendWithThread]);

  const handleHistoryNewChat = useCallback(() => {
    const id = createConversationId();
    setConversations((prev) => [
      { id, title: nextUntitledPlaceholderTitle(prev), updatedAt: Date.now(), pinned: false },
      ...prev,
    ]);
    setActiveConversationId(id);
  }, []);

  const handleTogglePin = useCallback((id) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  }, []);

  const handleDeleteConversation = useCallback((id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    deleteMessagesForConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (transcriptForConversationIdRef.current !== activeConversationId) return;
    const firstUser = messagesRef.current.find((m) => m.role === 'user');
    if (!firstUser?.content) return;
    const snippet = truncateChatListTitle(firstUser.content);
    setConversations((prev) => {
      const i = prev.findIndex((c) => c.id === activeConversationId);
      if (i < 0) {
        return [
          {
            id: activeConversationId,
            title: snippet,
            updatedAt: Date.now(),
            pinned: false,
          },
          ...prev,
        ];
      }
      if (prev[i].title === snippet) return prev;
      const next = [...prev];
      next[i] = { ...next[i], title: snippet };
      return next;
    });
  }, [messages, activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    if (transcriptForConversationIdRef.current !== activeConversationId) return;
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId ? { ...c, updatedAt: Date.now() } : c
      )
    );
  }, [messages, activeConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const activeConversation =
    activeConversationId == null
      ? null
      : conversations.find((c) => c.id === activeConversationId);

  const headingTitle = primaryHeading(activeConversation);

  const msgCountHeading =
    activeConversationId != null ? messageCountsById[activeConversationId] ?? 0 : messages.length;

  const msgLabel = `${msgCountHeading} message${msgCountHeading === 1 ? '' : 's'}`;
  const rel =
    activeConversation?.updatedAt != null
      ? formatChatRelativeTime(activeConversation.updatedAt)
      : '';
  const subtitleMeta = rel ? `Updated ${rel} · ${msgLabel}` : msgLabel;

  useEffect(() => {
    if (!isOpen) setSidebarCollapsed(false);
  }, [isOpen]);

  useEffect(() => {
    if (!showHistorySidebar) setSidebarCollapsed(false);
  }, [showHistorySidebar]);

  if (!isOpen) {
    if (useExternalLauncher) {
      return null;
    }
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#10b981] text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition-[transform,background-color] hover:-translate-y-0.5 hover:bg-[#34d399] hover:shadow-[0_6px_18px_rgba(0,0,0,0.22)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        aria-label={`Open ${WIDGET_CONTENT.title}`}
      >
        <LauncherBubbleIcon size={26} />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label={WIDGET_CONTENT.backdropAriaLabel}
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={`fixed top-0 right-0 z-50 flex h-dvh max-h-[100dvh] min-h-0 flex-col shadow-xl ${themeClasses.panel}`}
        style={{
          width: WIDGET_CONTENT.panelWidth,
          minWidth: `min(100vw, ${WIDGET_CONTENT.panelMinWidth})`,
          maxWidth: WIDGET_CONTENT.panelMaxWidth,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-chat-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`h-1.5 w-full shrink-0 bg-gradient-to-r ${themeClasses.panelTopAccent}`}
          aria-hidden
        />

        <div className="flex min-h-0 flex-1 flex-row">
        {showHistorySidebar && !sidebarCollapsed && (
          <ChatHistorySidebar
            themeClasses={themeClasses}
            conversations={conversations}
            selectedConversationId={activeConversationId}
            onSelectConversation={(id) => setActiveConversationId(id)}
            onNewChat={handleHistoryNewChat}
            onTogglePin={handleTogglePin}
            brandTitle={WIDGET_CONTENT.assistantBrandTitle}
            searchPlaceholder={WIDGET_CONTENT.searchPlaceholder}
            startNewChatLabel={WIDGET_CONTENT.startNewChatLabel}
            effectiveTheme={effectiveTheme}
            onToggleAppearance={() => setUseLightAppearance((v) => !v)}
            messageCountsById={messageCountsById}
            onCollapseSidebar={() => setSidebarCollapsed(true)}
            onDeleteConversation={handleDeleteConversation}
          />
        )}

        <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${themeClasses.assistantMain}`}>
          <div className={`shrink-0 ${themeClasses.assistantTopBar}`}>
            <div className="px-3 pb-2 pt-3 sm:px-4">
              <div className={`${themeClasses.assistantToolbarCard}`}>
            <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
              {showHistorySidebar && sidebarCollapsed ? (
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className={`shrink-0 ${themeClasses.assistantSubtleBtn}`}
                  aria-label="Expand sidebar"
                >
                  <PanelLeft size={22} strokeWidth={1.75} aria-hidden />
                </button>
              ) : null}
              {WIDGET_CONTENT.modelLabel ? (
                <button
                  type="button"
                  className="flex shrink-0 items-center gap-2 rounded-full border border-black/10 bg-black/[0.04] px-3 py-2 text-[13px] font-semibold dark:border-white/12 dark:bg-white/[0.05]"
                >
                  <span>{WIDGET_CONTENT.modelLabel}</span>
                  <ChevronDown size={16} strokeWidth={1.75} className="opacity-65" aria-hidden />
                </button>
              ) : null}
              <div className="min-w-[8px] flex-1" />
              <button
                type="button"
                className={`hidden shrink-0 sm:inline-flex ${themeClasses.assistantSubtleBtn}`}
                aria-label="More options"
              >
                <MoreHorizontal size={22} strokeWidth={1.75} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={`shrink-0 ${themeClasses.assistantSubtleBtn}`}
                aria-label={WIDGET_CONTENT.closeAriaLabel}
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
              </div>

              <div className={`mt-3 px-1 sm:px-0 ${themeClasses.assistantHeroCard}`}>
            <div className="px-4 pb-5 pt-4 sm:px-5">
              <h2 id="ai-chat-title" className="text-[1.65rem] font-semibold tracking-tight sm:text-3xl">
                {headingTitle}
              </h2>
              <p className={`mt-2 text-sm opacity-65`}>{subtitleMeta}</p>
              {WIDGET_CONTENT.chatTags.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {WIDGET_CONTENT.chatTags.map((tag) => (
                    <span key={tag} className={`shrink-0 ${themeClasses.assistantTagPill}`}>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
              </div>
            </div>
          </div>

          <div className={`min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4 ${themeClasses.body}`}>
            <div className={`min-h-full p-3 sm:p-4 ${themeClasses.assistantScrollWell}`}>
            {messages.length === 0 && (
              <div className="mb-5">
                <button
                  type="button"
                  id="chat-welcome-toggle"
                  aria-expanded={welcomePanelExpanded}
                  aria-controls={welcomePanelId}
                  onClick={() => setWelcomePanelExpanded((v) => !v)}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition-colors ${themeClasses.promptCard}`}
                >
                  <span className={`text-sm font-semibold ${themeClasses.promptLabel}`}>
                    {WIDGET_CONTENT.suggestedPromptsLabel}
                  </span>
                  <ChevronDown
                    className={`shrink-0 opacity-70 transition-transform duration-200 ${
                      welcomePanelExpanded ? 'rotate-180' : ''
                    }`}
                    size={20}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>
                {welcomePanelExpanded && (
                  <div
                    id={welcomePanelId}
                    role="region"
                    aria-labelledby="chat-welcome-toggle"
                    className="mt-3 space-y-3"
                  >
                    <p className={`text-[15px] leading-relaxed ${themeClasses.welcome}`}>
                      {WIDGET_CONTENT.welcomeMessageBySource[sourceMode]}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {WIDGET_CONTENT.suggestedPromptsBySource[sourceMode].map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendWithThread(prompt)}
                          disabled={isThinking}
                          className={`flex items-start gap-3 rounded-xl p-3 text-left text-sm leading-snug transition-colors disabled:pointer-events-none disabled:opacity-50 ${themeClasses.promptCard}`}
                        >
                          <LineChart
                            className="mt-0.5 shrink-0 opacity-70"
                            size={18}
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {messages.length === 0 && !isThinking && (
              <div className="mt-8 space-y-4">
                <div
                  className={`flex min-h-[120px] flex-col justify-center px-6 py-10 text-center text-sm leading-relaxed sm:min-h-[140px] ${themeClasses.assistantEmptyDash}`}
                >
                  {WIDGET_CONTENT.emptyStateMessage}
                </div>
                <div className="flex flex-wrap gap-2">
                  {WIDGET_CONTENT.suggestedPromptsBySource[sourceMode].slice(0, 6).map((prompt, idx) => (
                    <button
                      key={`chip-${idx}`}
                      type="button"
                      onClick={() => handleSendWithThread(prompt)}
                      disabled={isThinking}
                      className={`rounded-full px-4 py-2 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${themeClasses.assistantTagPill}`}
                    >
                      {prompt.length > 40 ? `${prompt.slice(0, 39)}…` : prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {(messages.length > 0 || isThinking) && (
              <MessageThread
                messages={messages}
                isThinking={isThinking}
                themeClasses={themeClasses}
                messagesEndRef={messagesEndRef}
                chartBarFill={chartBarFillForTheme(effectiveTheme)}
                messageBubbleVariant="mainChat"
                apiBase={apiBase}
                thinkingSource={sourceMode}
              />
            )}
          </div>
          </div>

          <div className={`shrink-0 px-3 pb-3 pt-1 sm:px-4 ${themeClasses.assistantMain}`}>
            <div className={`${themeClasses.assistantComposerShelf}`}>
          <ChatComposerFooter
            theme={effectiveTheme}
            themeClasses={themeClasses}
            input={input}
            setInput={setInput}
            handleSend={handleSendWithThread}
            isThinking={isThinking}
            selectedTool={selectedTool}
            setSelectedTool={setSelectedTool}
            showTools={showTools}
            setShowTools={setShowTools}
            textareaPlaceholder={WIDGET_CONTENT.composerPlaceholder}
            textareaPlaceholderWithTool={WIDGET_CONTENT.textareaPlaceholderWithTool}
            disclaimerText={WIDGET_CONTENT.composerDisclaimer}
          />
            </div>
          </div>
        </div>
        </div>
      </aside>
    </>
  );
});

export default DataChatbotWidget;
