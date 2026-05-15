import React, { useMemo, useState } from 'react';

import { Search, Star, Clock, PanelLeftClose, Moon, Sun, Sparkles, Trash2 } from 'lucide-react';

import { formatChatRelativeTime } from './chatConversationStorage';

/**
 * @param {'light' | 'dark' | 'light-gold' | 'dark-gold'} effectiveTheme Matches the palette actually rendered (sidebar + panel).
 */
function appearanceToggleMeta(effectiveTheme) {
  switch (effectiveTheme) {
    case 'dark':
      return {
        Icon: Sun,
        currentLabel: 'Dark',
        ariaLabel: 'Appearance is Dark. Activate to switch to Light.',
      };
    case 'light-gold':
      return {
        Icon: Moon,
        currentLabel: 'Light gold',
        ariaLabel: 'Appearance is Light gold. Activate to switch to Dark gold.',
      };
    case 'dark-gold':
      return {
        Icon: Sun,
        currentLabel: 'Dark gold',
        ariaLabel: 'Appearance is Dark gold. Activate to switch to Light gold.',
      };
    case 'light':
    default:
      return {
        Icon: Moon,
        currentLabel: 'Light',
        ariaLabel: 'Appearance is Light. Activate to switch to Dark.',
      };
  }
}

/**

 * Left sidebar: search, sessions, appearance toggle — grouped into inset cards.

 */

export function ChatHistorySidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewChat,
  onTogglePin,
  themeClasses,
  brandTitle,
  searchPlaceholder,
  startNewChatLabel,
  effectiveTheme,
  onToggleAppearance,
  messageCountsById,
  onCollapseSidebar,
  onDeleteConversation,
}) {

  const [query, setQuery] = useState('');

  const { Icon: AppearanceIcon, currentLabel, ariaLabel } = appearanceToggleMeta(effectiveTheme);



  const { pinned, recent } = useMemo(() => {

    const q = query.trim().toLowerCase();

    const filtered = !q

      ? conversations

      : conversations.filter((c) => (c.title || '').toLowerCase().includes(q));

    const sortByTime = (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);

    const pin = filtered.filter((c) => c.pinned).sort(sortByTime);

    const rec = filtered.filter((c) => !c.pinned).sort(sortByTime);

    return { pinned: pin, recent: rec };

  }, [conversations, query]);



  function renderRow(c) {
    const active = selectedConversationId === c.id;
    const count = messageCountsById[c.id] ?? 0;
    const time = formatChatRelativeTime(c.updatedAt);

    return (
      <div key={c.id} className="group relative px-1">
        <button
          type="button"
          onClick={() => onSelectConversation(c.id)}
          className={`${themeClasses.assistantChatRow} flex w-full flex-col gap-0.5 px-3 py-2.5 ${
            active ? themeClasses.assistantChatRowActive : ''
          }`}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
            {time ? <span className="shrink-0 text-[11px] opacity-70">{time}</span> : null}
          </div>
          <span className="text-[11px] opacity-60">
            {count} message{count === 1 ? '' : 's'}
          </span>
        </button>

        <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            className={`rounded-md p-1 ${
              c.pinned ? 'opacity-100' : ''
            } ${themeClasses.assistantSubtleBtn}`}
            aria-label={c.pinned ? 'Unpin chat' : 'Pin chat'}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin(c.id);
            }}
          >
            <Star
              size={14}
              strokeWidth={1.75}
              className={c.pinned ? 'fill-current' : ''}
              aria-hidden
            />
          </button>
          <button
            type="button"
            className={`rounded-md p-1 hover:text-red-500 ${themeClasses.assistantSubtleBtn}`}
            aria-label="Delete chat"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm('Are you sure you want to delete this conversation?')) {
                onDeleteConversation(c.id);
              }
            }}
          >
            <Trash2 size={14} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
    );
  }



  return (

    <nav

      className={`flex h-full w-[min(288px,100%)] shrink-0 flex-col ${themeClasses.assistantSidebar}`}

      aria-label="Chat history"

    >

      <div className={`mx-2 mt-3 space-y-4 p-3 ${themeClasses.assistantSidebarInset}`}>

        <div className="flex items-center justify-between gap-2">

          <div className="flex min-w-0 items-center gap-2">

            <span

              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-cyan-500/20 ring-1 ring-white/15"

              aria-hidden

            >

              <Sparkles size={18} strokeWidth={1.75} className="opacity-95" />

            </span>

            <span className="truncate font-semibold tracking-tight">{brandTitle}</span>

          </div>

          <button

            type="button"

            className={`shrink-0 ${themeClasses.assistantSubtleBtn}`}

            aria-label="Collapse sidebar"

            onClick={onCollapseSidebar}

          >

            <PanelLeftClose size={20} strokeWidth={1.75} aria-hidden />

          </button>

        </div>



        <div className={`flex items-center gap-2 px-3 py-2 ${themeClasses.assistantSearch}`}>

          <Search size={16} className="shrink-0 opacity-55" aria-hidden />

          <input

            type="search"

            value={query}

            onChange={(e) => setQuery(e.target.value)}

            placeholder={searchPlaceholder}

            className="min-w-0 flex-1 bg-transparent text-sm outline-none"

            aria-label={searchPlaceholder}

          />

        </div>



        <button

          type="button"

          onClick={onNewChat}

          className={`flex w-full items-center justify-center gap-2 px-4 py-3 font-semibold shadow-sm transition-transform active:scale-[0.98] ${themeClasses.assistantNewChat}`}

        >

          + {startNewChatLabel}

        </button>

      </div>



      <div

        className={`mx-2 mt-3 flex min-h-0 flex-1 flex-col overflow-hidden ${themeClasses.assistantSidebarListWell}`}

      >

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-2 py-3">

          <div>

            <div className={`mb-2 flex items-center gap-2 px-1 ${themeClasses.assistantSectionLabel}`}>

              <Star size={14} aria-hidden /> Pinned chats

            </div>

            {pinned.length === 0 ? (

              <p className={`px-2 py-1 text-[13px] opacity-55`}>Nothing pinned yet</p>

            ) : (

              <div className="space-y-1">{pinned.map(renderRow)}</div>

            )}

          </div>

          <div>

            <div className={`mb-2 flex items-center gap-2 px-1 ${themeClasses.assistantSectionLabel}`}>

              <Clock size={14} aria-hidden /> Recent

            </div>

            {recent.length === 0 ? (

              <p className={`px-2 py-1 text-[13px] opacity-55`}>No chats yet</p>

            ) : (

              <div className="space-y-1">{recent.map(renderRow)}</div>

            )}

          </div>

        </div>

      </div>



      <div className={`mx-2 mb-3 mt-2 p-2 ${themeClasses.assistantSidebarFooterCard}`}>

        <button

          type="button"

          className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-medium transition-colors ${themeClasses.assistantChatRow}`}

          onClick={onToggleAppearance}

          aria-label={ariaLabel}

        >

          <AppearanceIcon size={18} strokeWidth={1.75} aria-hidden />

          {currentLabel}

        </button>

      </div>

    </nav>

  );

}

