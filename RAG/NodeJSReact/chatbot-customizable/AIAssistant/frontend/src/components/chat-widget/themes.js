/**
 * Tailwind class bundles per theme. Bubble classes are tuned for depth and readability.
 */
export const themes = {
  light: {
    panel: 'bg-white text-gray-900 border-l-2 border-indigo-300/80 shadow-[-20px_0_48px_rgba(0,0,0,0.14)] ring-1 ring-indigo-500/15',
    /** Full-width gradient strip at top of panel (contrasts with host page) */
    panelTopAccent: 'from-sky-500 via-indigo-500 to-emerald-400 shadow-[0_0_24px_rgba(59,130,246,0.25)]',
    assistantToolbarCard:
      'rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]',
    assistantHeroCard:
      'rounded-2xl border border-indigo-200/90 border-l-[4px] border-l-indigo-600 bg-gradient-to-br from-white via-slate-50/80 to-sky-50/50 shadow-sm ring-1 ring-indigo-500/10',
    assistantScrollWell:
      'rounded-2xl border border-slate-200 bg-white/80 shadow-inner ring-1 ring-slate-900/[0.03]',
    assistantComposerShelf:
      'rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 to-white shadow-sm ring-1 ring-emerald-600/10',
    assistantSidebarInset:
      'rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-indigo-500/[0.06]',
    assistantSidebarListWell:
      'rounded-xl border border-slate-200 bg-white/90 shadow-inner ring-1 ring-slate-900/[0.04]',
    assistantSidebarFooterCard:
      'rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-violet-500/10',
    header: 'border-b-2 border-gray-200 bg-gray-100',
    body: 'bg-slate-100',
    welcome: 'text-gray-800',
    promptLabel: 'text-gray-700 font-semibold',
    promptCard:
      'bg-white border-2 border-gray-200 text-gray-900 shadow-sm hover:border-gray-300 hover:bg-gray-50',
    inputWrap: 'bg-white border-2 border-gray-300 shadow-inner',
    textarea: 'text-gray-900 placeholder:text-gray-500',
    send: 'bg-gray-900 text-white hover:bg-black disabled:opacity-30 border-2 border-gray-900',
    bubbleAssistant:
      'rounded-3xl border border-gray-200/90 bg-white px-4 py-3.5 text-gray-900 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.08)] ring-1 ring-inset ring-gray-900/[0.04]',
    bubbleUser:
      'rounded-3xl border-2 border-gray-300 bg-white px-4 py-3.5 text-gray-900 shadow-[0_4px_20px_-6px_rgba(15,23,42,0.12)] ring-1 ring-inset ring-gray-900/[0.06]',
    footer: 'border-t border-slate-200/70 bg-transparent pt-2',
    segmentShell: 'border border-gray-300 bg-gray-200',
    segmentDivider: 'bg-gray-300',
    segmentActive: 'bg-white text-blue-600 font-bold shadow-sm',
    segmentInactive: 'bg-[#eceff3] text-gray-600 font-normal',
    /** Main `<ai-chatbot-widget>` message bubbles only (cool / blue accent, not gold robot style) */
    bubbleAssistantMain:
      'rounded-2xl border border-gray-200/90 border-l-[4px] border-l-blue-600 bg-gradient-to-br from-white to-slate-50/90 px-4 py-3.5 text-gray-900 shadow-[0_4px_20px_-6px_rgba(15,23,42,0.12)]',
    bubbleUserMain:
      'rounded-2xl border-2 border-blue-400/45 bg-blue-50 px-4 py-3.5 text-blue-950 shadow-[0_4px_18px_-6px_rgba(37,99,235,0.14)] ring-1 ring-blue-800/10',
    /** In-panel chat history / sessions menu (light: white strip like reference UI) */
    chatHistoryMenu:
      'border-r border-gray-200 bg-white text-slate-700 shadow-[4px_0_24px_-4px_rgba(15,23,42,0.12)]',
    chatHistoryMenuButton:
      'rounded-lg p-2 text-slate-600 transition-colors hover:bg-gray-100 hover:text-slate-900',
    chatHistoryMenuRow:
      'w-full rounded-lg py-2.5 pl-3 pr-2 text-left text-sm transition-colors hover:bg-gray-50',
    chatHistoryMenuRowActive: 'bg-slate-100 font-medium text-slate-900',
    chatHistoryMenuSectionLabel: 'text-slate-600',
    assistantSidebar: 'border-r border-zinc-200 bg-zinc-100 text-zinc-900',
    assistantMain: 'bg-white text-zinc-900',
    assistantSearch:
      'rounded-full border border-zinc-300 bg-white text-sm text-zinc-900 shadow-sm placeholder:text-zinc-500',
    assistantNewChat: 'rounded-full bg-zinc-900 py-3 text-center text-sm font-semibold text-white hover:bg-black',
    assistantChatRow: 'rounded-xl text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-200/80',
    assistantChatRowActive: 'bg-zinc-200/90 font-medium text-zinc-950',
    assistantSectionLabel: 'text-xs font-semibold uppercase tracking-wide text-zinc-500',
    assistantFooter: 'border-t border-zinc-200 bg-zinc-50 text-zinc-600',
    assistantUserCard: 'rounded-2xl border border-zinc-200 bg-white',
    assistantTagPill: 'rounded-full border border-zinc-300 bg-transparent px-3 py-1 text-xs font-medium text-zinc-600',
    assistantEmptyDash: 'rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500',
    assistantTopBar: 'border-b border-zinc-200 bg-white/95',
    assistantDisclaimer: 'text-[11px] text-zinc-500',
    assistantSubtleBtn: 'rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900',
  },
  dark: {
    panel:
      'bg-[#141414] text-gray-100 border-l-2 border-violet-500/45 shadow-[-20px_0_48px_rgba(0,0,0,0.55)] ring-1 ring-violet-400/25',
    panelTopAccent:
      'from-violet-500 via-sky-400 to-teal-400 shadow-[0_0_28px_rgba(139,92,246,0.45)]',
    assistantToolbarCard:
      'rounded-xl border border-sky-500/30 bg-[#0c1018]/95 shadow-inner ring-1 ring-sky-400/15',
    assistantHeroCard:
      'rounded-2xl border border-violet-400/25 border-l-[4px] border-l-violet-400 bg-gradient-to-br from-[#16161f] via-[#0d0d12] to-black/70 shadow-[0_8px_32px_-12px_rgba(139,92,246,0.35)] ring-1 ring-violet-500/15',
    assistantScrollWell:
      'rounded-2xl border border-white/[0.1] bg-[#070708]/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-teal-500/10',
    assistantComposerShelf:
      'rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-[#0a1210]/95 to-[#060808] shadow-[0_-8px_28px_-14px_rgba(52,211,153,0.25)] ring-1 ring-emerald-500/15',
    assistantSidebarInset:
      'rounded-xl border border-violet-500/20 bg-[#101018]/90 shadow-inner ring-1 ring-sky-500/10',
    assistantSidebarListWell:
      'rounded-xl border border-white/[0.08] bg-black/35 shadow-inner ring-1 ring-violet-400/10',
    assistantSidebarFooterCard:
      'rounded-xl border border-teal-500/20 bg-[#0a1010]/90 ring-1 ring-emerald-500/15',
    header: 'border-b-2 border-white/15 bg-[#1c1c1c]',
    body: 'bg-[#0a0a0a]',
    welcome: 'text-gray-300',
    promptLabel: 'text-gray-400 font-semibold',
    promptCard:
      'bg-[#1f1f1f] border-2 border-white/15 text-gray-100 hover:border-white/25 hover:bg-[#252525]',
    inputWrap: 'bg-[#1a1a1a] border-2 border-white/20',
    textarea: 'text-gray-100 placeholder:text-gray-500',
    send: 'bg-white text-gray-900 hover:bg-gray-100 disabled:opacity-30 border-2 border-white',
    bubbleAssistant:
      'rounded-3xl border border-white/12 bg-[#1c1c1c] px-4 py-3.5 text-gray-100 shadow-[0_4px_28px_-8px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-white/[0.06]',
    bubbleUser:
      'rounded-3xl border-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 px-4 py-3.5 text-white shadow-[0_6px_28px_-6px_rgba(37,99,235,0.45)]',
    footer: 'border-t border-white/[0.08] bg-transparent pt-2',
    segmentShell: 'border border-white/20 bg-black/40',
    segmentDivider: 'bg-white/20',
    segmentActive: 'bg-white/15 text-blue-400 font-bold',
    segmentInactive: 'bg-transparent text-gray-500 font-normal',
    bubbleAssistantMain:
      'rounded-2xl border border-white/10 border-l-[4px] border-l-sky-400 bg-gradient-to-br from-[#1c1c1f] to-[#0f0f12] px-4 py-3.5 text-gray-100 shadow-[0_6px_28px_-10px_rgba(0,0,0,0.65)]',
    bubbleUserMain:
      'rounded-2xl border border-indigo-400/25 bg-gradient-to-br from-indigo-500 via-violet-600 to-fuchsia-800 px-4 py-3.5 text-white shadow-[0_8px_28px_-8px_rgba(99,102,241,0.45)]',
    chatHistoryMenu:
      'border-r border-white/15 bg-[#1c1c1c] text-gray-200 shadow-[4px_0_28px_-4px_rgba(0,0,0,0.5)]',
    chatHistoryMenuButton:
      'rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-100',
    chatHistoryMenuRow:
      'w-full rounded-lg py-2.5 pl-3 pr-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5',
    chatHistoryMenuRowActive: 'bg-white/10 font-medium text-white',
    chatHistoryMenuSectionLabel: 'text-gray-400',
    assistantSidebar: 'border-r border-white/[0.08] bg-[#0a0a0a] text-zinc-200',
    assistantMain: 'bg-[#000000] text-zinc-100',
    assistantSearch:
      'rounded-full border border-white/10 bg-[#111111] text-sm text-zinc-100 shadow-inner placeholder:text-zinc-500',
    assistantNewChat: 'rounded-full bg-white py-3 text-center text-sm font-semibold text-black hover:bg-zinc-200',
    assistantChatRow:
      'rounded-xl text-left text-sm text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100',
    assistantChatRowActive: 'bg-white/[0.08] font-medium text-white',
    assistantSectionLabel: 'text-[11px] font-semibold uppercase tracking-wide text-zinc-500',
    assistantFooter: 'border-t border-white/[0.08] bg-[#0a0a0a] text-zinc-500',
    assistantUserCard: 'rounded-2xl border border-white/10 bg-[#141414]',
    assistantTagPill:
      'rounded-full border border-violet-400/30 bg-violet-500/[0.12] px-3 py-1 text-xs font-medium text-violet-200/90',
    assistantEmptyDash: 'rounded-2xl border border-dashed border-white/15 bg-transparent text-zinc-500',
    assistantTopBar: 'border-b border-white/[0.08] bg-[#050505]',
    assistantDisclaimer: 'text-[11px] text-zinc-600',
    assistantSubtleBtn: 'rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-100',
  },
  'dark-emerald': {
    panel:
      'bg-[#020617] text-[#10b981] border-l-2 border-[#10b981]/55 shadow-[-20px_0_48px_rgba(0,0,0,0.65)] ring-1 ring-[#10b981]/25',
    panelTopAccent:
      'from-[#34d399] via-[#10b981] to-sky-400 shadow-[0_0_26px_rgba(16,185,129,0.35)]',
    assistantToolbarCard:
      'rounded-xl border border-[#10b981]/35 bg-[#010413]/95 shadow-inner ring-1 ring-sky-500/20',
    assistantHeroCard:
      'rounded-2xl border border-[#10b981]/40 border-l-[4px] border-l-sky-400 bg-gradient-to-br from-[#020617] to-black/80 ring-1 ring-[#10b981]/15',
    assistantScrollWell:
      'rounded-2xl border border-[#10b981]/28 bg-black/40 shadow-inner ring-1 ring-cyan-500/10',
    assistantComposerShelf:
      'rounded-2xl border border-[#10b981]/35 bg-gradient-to-b from-[#020617] to-[#010413] ring-1 ring-emerald-600/15',
    assistantSidebarInset:
      'rounded-xl border border-[#10b981]/32 bg-[#020617]/95 ring-1 ring-emerald-600/10',
    assistantSidebarListWell:
      'rounded-xl border border-[#10b981]/25 bg-black/30 ring-1 ring-sky-400/10',
    assistantSidebarFooterCard:
      'rounded-xl border border-[#10b981]/30 bg-[#010413]/95 ring-1 ring-teal-500/10',
    header: 'border-b-2 border-[#10b981]/35 bg-[#0f172a]',
    body: 'bg-[#020617]',
    welcome: 'text-[#d1fae5]',
    promptLabel: 'text-[#10b981] font-semibold',
    promptCard:
      'bg-[#0f172a] border-2 border-[#10b981]/35 text-[#ecfdf5] hover:border-[#10b981]/55 hover:bg-[#1e293b]',
    inputWrap: 'bg-[#020617] border-2 border-[#10b981]/45',
    textarea: 'text-[#ecfdf5] placeholder:text-[#10b981]/45',
    send: 'bg-[#10b981] text-[#020617] hover:bg-[#34d399] disabled:opacity-30 border-2 border-[#059669]',
    bubbleAssistant:
      'rounded-3xl border border-[#10b981]/30 bg-[#0f172a] px-4 py-3.5 text-[#ecfdf5] shadow-[0_6px_32px_-10px_rgba(0,0,0,0.65)] ring-1 ring-inset ring-[#10b981]/[0.12]',
    bubbleUser:
      'rounded-3xl border border-[#059669]/80 bg-gradient-to-br from-[#10b981] via-[#059669] to-[#064e3b] px-4 py-3.5 text-white shadow-[0_6px_28px_-8px_rgba(0,0,0,0.5)]',
    footer: 'border-t border-[#10b981]/22 bg-transparent pt-2',
    segmentShell: 'border border-[#10b981]/40 bg-black/50',
    segmentDivider: 'bg-[#10b981]/40',
    segmentActive: 'bg-[#0f172a] text-[#34d399] font-bold',
    segmentInactive: 'bg-transparent text-[#065f46] font-normal',
    bubbleAssistantMain:
      'rounded-2xl border border-sky-500/25 border-l-[4px] border-l-sky-400 bg-[#0f172a] px-4 py-3.5 text-gray-100 shadow-[0_6px_32px_-10px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-sky-500/10',
    bubbleUserMain:
      'rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-600 via-blue-700 to-slate-900 px-4 py-3.5 text-white shadow-[0_8px_30px_-10px_rgba(56,189,248,0.35)]',
    chatHistoryMenu:
      'border-r border-[#10b981]/35 bg-[#0f172a] text-[#d1fae5] shadow-[4px_0_28px_-4px_rgba(0,0,0,0.45)]',
    chatHistoryMenuButton:
      'rounded-lg p-2 text-[#10b981]/80 transition-colors hover:bg-[#10b981]/10 hover:text-[#ecfdf5]',
    chatHistoryMenuRow:
      'w-full rounded-lg py-2.5 pl-3 pr-2 text-left text-sm transition-colors hover:bg-[#10b981]/10',
    chatHistoryMenuRowActive: 'bg-[#10b981]/15 font-medium text-[#ecfdf5]',
    chatHistoryMenuSectionLabel: 'text-[#059669]',
    assistantSidebar: 'border-r border-[#10b981]/25 bg-[#010413] text-[#d1fae5]',
    assistantMain: 'bg-[#020617] text-[#ecfdf5]',
    assistantSearch:
      'rounded-full border border-[#10b981]/30 bg-[#0f172a] text-sm text-[#ecfdf5] placeholder:text-[#065f46]',
    assistantNewChat:
      'rounded-full bg-[#10b981] py-3 text-center text-sm font-semibold text-[#020617] hover:bg-[#34d399]',
    assistantChatRow: 'rounded-xl text-sm text-[#059669] transition-colors hover:bg-[#10b981]/12',
    assistantChatRowActive: 'bg-[#10b981]/14 font-medium text-[#ecfdf5]',
    assistantSectionLabel: 'text-[11px] font-semibold uppercase tracking-wide text-[#065f46]',
    assistantFooter: 'border-t border-[#10b981]/20 bg-transparent pt-2 text-[#059669]',
    assistantUserCard: 'rounded-2xl border border-[#10b981]/35 bg-[#0f172a]',
    assistantTagPill:
      'rounded-full border border-[#10b981]/35 bg-transparent px-3 py-1 text-xs font-medium text-[#10b981]',
    assistantEmptyDash:
      'rounded-2xl border border-dashed border-[#10b981]/35 bg-transparent text-[#065f46]',
    assistantTopBar: 'border-b border-[#10b981]/30 bg-[#010413]',
    assistantDisclaimer: 'text-[11px] text-[#065f46]',
    assistantSubtleBtn:
      'rounded-lg p-2 text-[#059669] transition-colors hover:bg-[#10b981]/12 hover:text-[#ecfdf5]',
  },
  'light-emerald': {
    panel:
      'bg-[#f0fdf4] text-[#064e3b] border-l-2 border-teal-700/35 shadow-[-20px_0_40px_rgba(6,78,59,0.12)] ring-1 ring-[#10b981]/25',
    panelTopAccent:
      'from-teal-600 via-[#10b981] to-violet-500 shadow-[0_0_22px_rgba(16,185,129,0.2)]',
    assistantToolbarCard:
      'rounded-xl border border-[#059669]/55 bg-white shadow-sm ring-1 ring-teal-600/15',
    assistantHeroCard:
      'rounded-2xl border border-[#10b981]/45 border-l-[4px] border-l-teal-700 bg-gradient-to-br from-white via-emerald-50/60 to-teal-50/40 ring-1 ring-[#10b981]/20',
    assistantScrollWell:
      'rounded-2xl border border-[#10b981]/40 bg-[#fafffb]/95 shadow-inner ring-1 ring-violet-400/10',
    assistantComposerShelf:
      'rounded-2xl border border-teal-600/25 bg-gradient-to-b from-teal-50/50 to-[#f0fdf4] ring-1 ring-[#059669]/25',
    assistantSidebarInset:
      'rounded-xl border border-[#10b981]/45 bg-white shadow-sm ring-1 ring-emerald-700/10',
    assistantSidebarListWell:
      'rounded-xl border border-[#10b981]/38 bg-[#fafffb]/90 shadow-inner ring-1 ring-teal-600/10',
    assistantSidebarFooterCard:
      'rounded-xl border border-[#10b981]/45 bg-white ring-1 ring-violet-400/15',
    header: 'border-b-2 border-[#10b981]/45 bg-[#dcfce7]',
    body: 'bg-[#f0fdf4]',
    welcome: 'text-[#065f46]',
    promptLabel: 'text-[#065f46] font-semibold',
    promptCard:
      'bg-white border-2 border-[#10b981]/40 text-[#064e3b] shadow-sm hover:border-[#059669] hover:bg-[#fafffb]',
    inputWrap: 'bg-white border-2 border-[#059669]/60',
    textarea: 'text-[#064e3b] placeholder:text-[#065f46]/55',
    send: 'bg-[#064e3b] text-white hover:bg-[#065f46] disabled:opacity-30 border-2 border-[#022c22]',
    bubbleAssistant:
      'rounded-3xl border border-[#10b981]/35 bg-white px-4 py-3.5 text-[#064e3b] shadow-[0_4px_22px_-6px_rgba(6,78,59,0.12)] ring-1 ring-inset ring-[#059669]/[0.15]',
    bubbleUser:
      'rounded-3xl border-2 border-[#059669]/75 bg-white px-4 py-3.5 text-[#022c22] shadow-[0_4px_22px_-6px_rgba(6,78,59,0.1)] ring-1 ring-inset ring-[#10b981]/25',
    footer: 'border-t border-[#10b981]/38 bg-transparent pt-2',
    segmentShell: 'border border-[#059669]/70 bg-[#dcfce7]',
    segmentDivider: 'bg-[#059669]/60',
    segmentActive: 'bg-white text-[#059669] font-bold shadow-sm',
    segmentInactive: 'bg-[#f0fdf4] text-[#065f46] font-normal',
    bubbleAssistantMain:
      'rounded-2xl border border-blue-200/80 border-l-[4px] border-l-blue-700 bg-gradient-to-br from-white to-blue-50/40 px-4 py-3.5 text-[#0f172a] shadow-[0_4px_18px_-6px_rgba(30,64,175,0.15)]',
    bubbleUserMain:
      'rounded-2xl border-2 border-[#059669]/65 bg-[#fafffb] px-4 py-3.5 text-[#022c22] shadow-[0_4px_18px_-6px_rgba(6,78,59,0.12)] ring-1 ring-[#059669]/30',
    chatHistoryMenu:
      'border-r border-[#059669]/50 bg-white text-[#065f46] shadow-[4px_0_24px_-4px_rgba(6,78,59,0.14)]',
    chatHistoryMenuButton:
      'rounded-lg p-2 text-[#065f46] transition-colors hover:bg-[#dcfce7] hover:text-[#022c22]',
    chatHistoryMenuRow:
      'w-full rounded-lg py-2.5 pl-3 pr-2 text-left text-sm transition-colors hover:bg-[#f0fdf4]',
    chatHistoryMenuRowActive: 'bg-[#dcfce7] font-medium text-[#022c22]',
    chatHistoryMenuSectionLabel: 'text-[#065f46]',
    assistantSidebar: 'border-r border-[#10b981]/40 bg-[#f0fdf4] text-[#065f46]',
    assistantMain: 'bg-[#f0fdf4] text-[#064e3b]',
    assistantSearch:
      'rounded-full border border-[#10b981]/45 bg-white text-sm text-[#064e3b] placeholder:text-[#065f46]/70',
    assistantNewChat: 'rounded-full bg-[#064e3b] py-3 text-center text-sm font-semibold text-white hover:bg-[#022c22]',
    assistantChatRow:
      'rounded-xl text-sm text-[#065f46] transition-colors hover:bg-white/70',
    assistantChatRowActive: 'bg-white font-semibold text-[#022c22] shadow-sm',
    assistantSectionLabel: 'text-[11px] font-semibold uppercase tracking-wide text-[#065f46]',
    assistantFooter: 'border-t border-[#10b981]/30 bg-transparent pt-2 text-[#065f46]',
    assistantUserCard: 'rounded-2xl border border-[#10b981]/45 bg-white',
    assistantTagPill: 'rounded-full border border-[#059669]/65 px-3 py-1 text-xs font-medium text-[#065f46]',
    assistantEmptyDash:
      'rounded-2xl border border-dashed border-[#10b981]/50 bg-[#fafffb] text-[#065f46]/80',
    assistantTopBar: 'border-b border-[#10b981]/40 bg-[#f0fdf4]',
    assistantDisclaimer: 'text-[11px] text-[#065f46]',
    assistantSubtleBtn:
      'rounded-lg p-2 text-[#065f46] transition-colors hover:bg-[#dcfce7] hover:text-[#022c22]',
  },
};

export function getThemeClasses(themeKey, fallbackKey = 'light') {
  return themes[themeKey] || themes[fallbackKey];
}

/** Popover surface behind the `+` tools menu */
export function chartBarFillForTheme(theme) {
  return theme === 'dark-emerald' || theme === 'light-emerald' ? '#10b981' : '#3b82f6';
}

export function toolsPopoverSurfaceClass(theme) {
  switch (theme) {
    case 'light':
      return 'border-gray-200 bg-gray-100';
    case 'dark':
      return 'border-white/20 bg-[#242424]';
    case 'dark-emerald':
      return 'border-[#10b981]/50 bg-[#0f172a]';
    case 'light-emerald':
      return 'border-[#10b981]/60 bg-[#f0fdf4]';
    default:
      return 'border-gray-200 bg-gray-100';
  }
}
