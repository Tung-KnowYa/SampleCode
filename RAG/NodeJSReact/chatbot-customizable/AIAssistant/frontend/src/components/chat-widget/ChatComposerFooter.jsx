import React from 'react';
import { X, Plus, Send, Mic } from 'lucide-react';
import { REPORT_FORMAT_TOOLS, FILE_EXPORT_TOOLS } from './tools';
import { toolsPopoverSurfaceClass } from './themes';

export function ChatComposerFooter({
  theme,
  themeClasses,
  input,
  setInput,
  handleSend,
  isThinking,
  selectedTool,
  setSelectedTool,
  showTools,
  setShowTools,
  textareaPlaceholder,
  textareaPlaceholderWithTool,
  disclaimerText,
}) {
  return (
    <footer className={`relative shrink-0 space-y-3 px-5 pb-4 pt-2 ${themeClasses.footer}`}>
      {selectedTool && (
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold shadow-sm ${
              theme.includes('gold')
                ? 'border-[#d4af37]/50 bg-[#d4af37]/20 text-[#d4af37]'
                : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
            }`}
          >
            <span className="uppercase tracking-wider">Mode: {selectedTool}</span>
            <button
              type="button"
              onClick={() => setSelectedTool(null)}
              className="rounded-full p-0.5 transition-colors hover:bg-black/10"
              title="Remove tool"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {showTools && (
        <div
          className={`absolute bottom-full left-5 right-5 z-20 mb-2 min-w-[220px] rounded-xl border-2 p-2 shadow-lg ${toolsPopoverSurfaceClass(
            theme
          )}`}
        >
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest opacity-50">
            Reports &amp; formats
          </div>
          {REPORT_FORMAT_TOOLS.map((tool) => (
            <button
              key={tool.name}
              type="button"
              onClick={() => {
                setSelectedTool(tool.name);
                setShowTools(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            >
              <tool.icon size={16} /> {tool.name}
            </button>
          ))}
          <div className="my-2 border-t border-current opacity-10" />
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest opacity-50">
            Download as file
          </div>
          {FILE_EXPORT_TOOLS.map((tool) => (
            <button
              key={tool.name}
              type="button"
              onClick={() => {
                setSelectedTool(tool.name);
                setShowTools(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            >
              <tool.icon size={16} /> {tool.label}
            </button>
          ))}
        </div>
      )}

      <div
        className={`rounded-3xl border-2 pb-3 pl-4 pr-3 pt-4 transition-[box-shadow] focus-within:ring-2 focus-within:ring-gray-900/15 dark:focus-within:ring-white/20 ${themeClasses.inputWrap}`}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className={`mb-2 min-h-[44px] w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none ${themeClasses.textarea}`}
          placeholder={
            selectedTool ? textareaPlaceholderWithTool.replace('{tool}', selectedTool) : textareaPlaceholder
          }
          rows={1}
        />

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowTools(!showTools)}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition-all active:scale-95 ${
              selectedTool
                ? 'border-blue-500 bg-blue-600 text-white dark:border-blue-400'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-white/12 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:bg-white/10'
            }`}
            aria-label="Formatting options"
          >
            <Plus size={20} strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-transparent transition-all active:scale-95 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10`}
              aria-label="Voice input (coming soon)"
            >
              <Mic size={20} strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() || isThinking}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all active:scale-95 ${themeClasses.send}`}
              aria-label="Send message"
            >
              <Send size={20} strokeWidth={2} className="-translate-x-px translate-y-px rotate-[-18deg]" />
            </button>
          </div>
        </div>
      </div>

      {typeof disclaimerText === 'string' && disclaimerText.trim() ? (
        <p className={`${themeClasses.assistantDisclaimer} text-center leading-snug`}>{disclaimerText}</p>
      ) : null}
    </footer>
  );
}
