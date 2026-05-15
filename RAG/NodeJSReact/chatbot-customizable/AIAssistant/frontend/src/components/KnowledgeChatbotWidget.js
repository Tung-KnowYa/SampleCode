import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { X, LineChart, ChevronDown } from 'lucide-react';
import { KNOWLEDGE_WIDGET_CONTENT } from './chat-widget/content';
import { getThemeClasses, chartBarFillForTheme } from './chat-widget/themes';
import { useChatSession } from './chat-widget/useChatSession';
import { MessageThread } from './chat-widget/MessageThread';
import { ChatComposerFooter } from './chat-widget/ChatComposerFooter';
import { KnowledgeRobotBubble } from './chat-widget/KnowledgeRobotBubble';
import { KNOWLEDGE_ROBOT_W } from './chat-widget/knowledgeRobotDimensions';
import { useDraggableLauncher } from './chat-widget/useDraggableLauncher';

function cssLengthToPx(value, viewportW) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (v.endsWith('vw')) return (parseFloat(v) / 100) * viewportW;
  if (v.endsWith('px')) return parseFloat(v);
  if (v.endsWith('%')) return (parseFloat(v) / 100) * viewportW;
  return null;
}

/**
 * Resolves simple CSS width expressions used in config (`min(960px, 96vw)`, etc.).
 * Nested calls are not supported; suffices for `chat-widget-content.json`.
 */
function evalCssWidthToPx(expr, viewportW) {
  if (typeof expr !== 'string') return null;
  const s = expr.trim();
  const minMatch = /^min\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i.exec(s);
  if (minMatch) {
    const a = evalCssWidthToPx(minMatch[1], viewportW) ?? cssLengthToPx(minMatch[1], viewportW);
    const b = evalCssWidthToPx(minMatch[2], viewportW) ?? cssLengthToPx(minMatch[2], viewportW);
    if (a != null && b != null) return Math.min(a, b);
    return a ?? b ?? null;
  }
  const maxMatch = /^max\(\s*(.+?)\s*,\s*(.+?)\s*\)$/i.exec(s);
  if (maxMatch) {
    const a = evalCssWidthToPx(maxMatch[1], viewportW) ?? cssLengthToPx(maxMatch[1], viewportW);
    const b = evalCssWidthToPx(maxMatch[2], viewportW) ?? cssLengthToPx(maxMatch[2], viewportW);
    if (a != null && b != null) return Math.max(a, b);
    return a ?? b ?? null;
  }
  return cssLengthToPx(s, viewportW);
}

/** Mirrors the knowledge panel aside width (`width` / `min-width` / `max-width`). */
function estimateKnowledgePanelWidthPx(viewportW) {
  const c = KNOWLEDGE_WIDGET_CONTENT;
  const w =
    evalCssWidthToPx(c.panelWidth, viewportW) ?? cssLengthToPx(c.panelWidth, viewportW) ?? 0.75 * viewportW;
  const minW = cssLengthToPx(c.panelMinWidth, viewportW) ?? 400;
  const maxW = cssLengthToPx(c.panelMaxWidth, viewportW) ?? viewportW;
  return Math.min(maxW, Math.max(minW, w));
}

function computePanelLeftAnchorX(viewportW, gapPx) {
  const pw = estimateKnowledgePanelWidthPx(viewportW);
  return Math.round(viewportW - pw - gapPx - KNOWLEDGE_ROBOT_W / 2);
}

/**
 * Knowledge-only assistant. `launcherMode="external"` hides the robot; use `.open()` on `<knowledge-chatbot-widget>`.
 *
 * Pass `initialPrompt` (DOM: `initial-prompt`) or `open('question')` / `open({ prompt: '…' })` to send a first message when the panel opens.
 *
 * Floating launcher placement (DOM on `<knowledge-chatbot-widget>`):
 * - `launcher-position` — `center-top` (default) or `bottom-right`.
 * - `launcher-x` / `launcher-y` — optional pixel coordinates of the launcher center (override preset axes you set).
 * - `launcher-anchor` — `panel-left` keeps the launcher just left of the knowledge panel (uses live panel width from config).
 * - `launcher-panel-gap` — pixels between panel edge and launcher center when using `panel-left` (default 24). Ignored if `launcher-x` is set.
 *   Panel width follows `chat-widget-content.json` (including values like `min(960px, 96vw)`).
 */
const KnowledgeChatbotWidget = forwardRef(function KnowledgeChatbotWidget(
  {
    theme = 'light-emerald',
    apiBase = '',
    launcherMode = 'floating',
    initialPrompt = '',
    launcherPosition = 'center-top',
    launcherX,
    launcherY,
    launcherAnchor = 'none',
    launcherPanelGap = 24,
  },
  ref
) {
  const [isOpen, setIsOpen] = useState(false);
  const [welcomePanelExpanded, setWelcomePanelExpanded] = useState(true);
  const messagesEndRef = useRef(null);
  const welcomePanelId = 'knowledge-only-welcome-panel';

  const themeClasses = getThemeClasses(theme, 'light-emerald');
  const useExternalLauncher = launcherMode === 'external';

  const pendingOpenPromptRef = useRef(null);
  const autoSendConsumedRef = useRef(false);

  useImperativeHandle(
    ref,
    () => ({
      /**
       * @param {string | { prompt?: string }} [opts]
       */
      open: (opts) => {
        let q = '';
        if (typeof opts === 'string') q = opts.trim();
        else if (opts && typeof opts === 'object' && opts.prompt != null)
          q = String(opts.prompt).trim();
        pendingOpenPromptRef.current = q || null;
        setIsOpen(true);
      },
      close: () => setIsOpen(false),
      toggle: () => setIsOpen((o) => !o),
    }),
    []
  );

  const toggleOpen = useCallback(() => {
    setIsOpen((o) => !o);
  }, []);

  const [panelAnchorX, setPanelAnchorX] = useState(() =>
    launcherAnchor === 'panel-left' && typeof window !== 'undefined'
      ? computePanelLeftAnchorX(window.innerWidth, launcherPanelGap)
      : null
  );

  useLayoutEffect(() => {
    if (launcherAnchor !== 'panel-left') {
      setPanelAnchorX(null);
      return undefined;
    }
    const gap = launcherPanelGap;
    const sync = () => setPanelAnchorX(computePanelLeftAnchorX(window.innerWidth, gap));
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, [launcherAnchor, launcherPanelGap]);

  const explicitX =
    typeof launcherX === 'number' && Number.isFinite(launcherX) ? launcherX : undefined;
  const effectiveDefaultX =
    explicitX ??
    (launcherAnchor === 'panel-left' && panelAnchorX != null ? panelAnchorX : undefined);

  const preset = launcherPosition === 'bottom-right' ? 'bottom-right' : 'center-top';
  const { launcherPos, isDragging, launcherPointerHandlers } = useDraggableLauncher({
    onTap: toggleOpen,
    enabled: !useExternalLauncher,
    preset,
    defaultX: effectiveDefaultX,
    defaultY: launcherY,
  });

  const {
    messages,
    input,
    setInput,
    isThinking,
    showTools,
    setShowTools,
    selectedTool,
    setSelectedTool,
    handleSend,
  } = useChatSession({ apiBase, source: 'knowledge' });

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
    void handleSend(promptToSend, { initialPrompt: true });
  }, [isOpen, initialPrompt, isThinking, handleSend]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  return (
    <>
      {!useExternalLauncher && (
        <div
          className="fixed z-[60] select-none"
          style={{
            left: launcherPos.x,
            top: launcherPos.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <button
            type="button"
            title={isOpen ? 'Close assistant' : 'Open knowledge assistant — drag to move'}
            className={`group touch-none relative rounded-none bg-transparent p-0 shadow-none outline-none ring-0 transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
              isDragging ? 'cursor-grabbing scale-[1.04]' : 'cursor-grab hover:scale-[1.02]'
            } ${isOpen ? 'ring-2 ring-[#10b981]/75 ring-offset-2 ring-offset-transparent rounded-[1.25rem]' : ''}`}
            aria-label={isOpen ? 'Close knowledge assistant' : 'Open knowledge assistant'}
            aria-expanded={isOpen}
            {...launcherPointerHandlers}
          >
            <KnowledgeRobotBubble isDragging={isDragging} />
          </button>
        </div>
      )}

      {isOpen && (
        <>
          <button
            type="button"
            aria-label={KNOWLEDGE_WIDGET_CONTENT.backdropAriaLabel}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          <aside
            className={`fixed top-0 right-0 z-50 flex h-dvh max-h-[100dvh] min-h-0 flex-col shadow-xl ${themeClasses.panel}`}
            style={{
              width: KNOWLEDGE_WIDGET_CONTENT.panelWidth,
              minWidth: KNOWLEDGE_WIDGET_CONTENT.panelMinWidth,
              maxWidth: KNOWLEDGE_WIDGET_CONTENT.panelMaxWidth,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="knowledge-only-dialog-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <header className={`flex shrink-0 flex-col gap-4 px-6 py-5 ${themeClasses.header}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <h2
                    id="knowledge-only-dialog-title"
                    className="min-w-0 truncate font-serif text-2xl font-bold text-inherit"
                  >
                    {KNOWLEDGE_WIDGET_CONTENT.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="shrink-0 rounded-lg p-2 text-inherit opacity-60 transition-colors hover:bg-black/10 hover:opacity-100 dark:hover:bg-white/10"
                  aria-label={KNOWLEDGE_WIDGET_CONTENT.closeAriaLabel}
                >
                  <X size={20} strokeWidth={1.75} />
                </button>
              </div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-70">Hello! I am your AI Assistant. I can answer questions from organization's knowledge base and documentation.</p>
            </header>

            <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-5 ${themeClasses.body}`}>
            {messages.length === 0 && (
              <div className="mb-6">
                <button
                  type="button"
                  id="knowledge-only-welcome-toggle"
                  aria-expanded={welcomePanelExpanded}
                  aria-controls={welcomePanelId}
                  onClick={() => setWelcomePanelExpanded((v) => !v)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors ${themeClasses.promptCard}`}
                >
                  <span className={`text-sm font-semibold ${themeClasses.promptLabel}`}>
                    {KNOWLEDGE_WIDGET_CONTENT.suggestedPromptsLabel}
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
                    aria-labelledby="knowledge-only-welcome-toggle"
                    className="mt-3"
                  >
                    <p className={`mb-6 text-[15px] leading-relaxed ${themeClasses.welcome}`}>
                      {KNOWLEDGE_WIDGET_CONTENT.welcomeMessage}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {KNOWLEDGE_WIDGET_CONTENT.suggestedPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(prompt)}
                          disabled={isThinking}
                          className={`flex items-start gap-3 rounded-xl p-3.5 text-left text-sm leading-snug transition-colors disabled:pointer-events-none disabled:opacity-50 ${themeClasses.promptCard}`}
                        >
                          <LineChart className="mt-0.5 shrink-0 opacity-70" size={18} strokeWidth={1.75} aria-hidden />
                          <span>{prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

              {(messages.length > 0 || isThinking) && (
                <MessageThread
                  messages={messages}
                  isThinking={isThinking}
                  themeClasses={themeClasses}
                  messagesEndRef={messagesEndRef}
                  chartBarFill={chartBarFillForTheme(theme)}
                  apiBase={apiBase}
                  thinkingSource="knowledge"
                />
              )}
            </div>

            <ChatComposerFooter
              theme={theme}
              themeClasses={themeClasses}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              isThinking={isThinking}
              selectedTool={selectedTool}
              setSelectedTool={setSelectedTool}
              showTools={showTools}
              setShowTools={setShowTools}
              textareaPlaceholder={KNOWLEDGE_WIDGET_CONTENT.textareaPlaceholder}
              textareaPlaceholderWithTool={KNOWLEDGE_WIDGET_CONTENT.textareaPlaceholderWithTool}
            />
          </aside>
        </>
      )}
    </>
  );
});

export default KnowledgeChatbotWidget;
