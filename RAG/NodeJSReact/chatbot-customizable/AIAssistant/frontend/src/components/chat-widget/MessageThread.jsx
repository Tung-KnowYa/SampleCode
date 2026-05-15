import React from 'react';
import { MessageMarkdownContent } from './MessageMarkdownContent';
import { AssistantSpeakButton } from './AssistantSpeakButton';
import { THINKING_STEPS_DATA, THINKING_STEPS_KNOWLEDGE } from './thinkingSteps';
import { useThinkingSteps } from './useThinkingSteps';

function UserToolBadge({ label }) {
  return (
    <div className="mb-2 w-fit rounded-md bg-black/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight opacity-90 dark:bg-white/15">
      {label}
    </div>
  );
}

export function MessageThread({
  messages,
  isThinking,
  themeClasses,
  messagesEndRef,
  chartBarFill,
  /** `'mainChat'` = `<ai-chatbot-widget>` only; uses `bubbleAssistantMain` / `bubbleUserMain` when set */
  messageBubbleVariant = 'default',
  apiBase = '',
  /** `'data'` vs `'knowledge'` — orders the loading-step copy for the active tab */
  thinkingSource = 'data',
}) {
  const thinkingSteps = thinkingSource === 'knowledge' ? THINKING_STEPS_KNOWLEDGE : THINKING_STEPS_DATA;
  const thinking = useThinkingSteps(isThinking, thinkingSteps);

  if (messages.length === 0 && !isThinking) return null;

  const useMainChatBubbles = messageBubbleVariant === 'mainChat';
  const assistantBubble = useMainChatBubbles
    ? themeClasses.bubbleAssistantMain || themeClasses.bubbleAssistant
    : themeClasses.bubbleAssistant;
  const userBubble = useMainChatBubbles
    ? themeClasses.bubbleUserMain || themeClasses.bubbleUser
    : themeClasses.bubbleUser;

  return (
    <div className="space-y-5">
      {messages.map((m, idx) => (
        <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[min(90%,42rem)] ${
              m.role === 'user'
                ? userBubble || 'rounded-3xl bg-blue-600 px-4 py-3.5 text-white shadow-lg'
                : assistantBubble
            }`}
          >
            {m.role === 'user' && m.tool && <UserToolBadge label={m.tool} />}
            <MessageMarkdownContent
              content={m.content}
              chartBarFill={chartBarFill}
              variant={m.role === 'user' ? 'user' : 'assistant'}
            />
            {m.role === 'assistant' && String(m.content || '').trim().length > 0 && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <AssistantSpeakButton apiBase={apiBase} markdownSource={String(m.content)} />
              </div>
            )}
          </div>
        </div>
      ))}
      {isThinking && (
        <div className="flex justify-start">
          <div className={`max-w-[min(90%,42rem)] rounded-2xl px-4 py-3.5 ${assistantBubble}`}>
            <p className="text-[15px] font-medium leading-snug tracking-tight" aria-live="polite">
              {thinking.label}
            </p>
            <div
              className="mt-3 flex gap-1.5"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={thinking.total}
              aria-valuenow={thinking.index + 1}
              aria-label="Assistant progress"
            >
              {Array.from({ length: thinking.total }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-[opacity,transform] duration-300 ${
                    i <= thinking.index ? 'bg-current opacity-85' : 'bg-current opacity-20'
                  }`}
                />
              ))}
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 opacity-65">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0.12s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:0.24s]" />
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
