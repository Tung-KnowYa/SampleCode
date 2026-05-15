import rawWidgetContent from '../../config/chat-widget-content.json';

export function normalizeSuggestedPrompts(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter((p) => typeof p === 'string' && p.trim());
}

export function resolveWidgetContent(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const mode = c.defaultSourceMode === 'knowledge' ? 'knowledge' : 'data';
  const rootWelcome = typeof c.welcomeMessage === 'string' ? c.welcomeMessage : '';
  const rootPrompts = normalizeSuggestedPrompts(c.suggestedPrompts);
  const dataTab = c.sourceTabs?.data;
  const knowledgeTab = c.sourceTabs?.knowledge;
  const dataWelcome =
    typeof dataTab?.welcomeMessage === 'string' && dataTab.welcomeMessage.trim()
      ? dataTab.welcomeMessage
      : rootWelcome;
  const knowledgeWelcome =
    typeof knowledgeTab?.welcomeMessage === 'string' && knowledgeTab.welcomeMessage.trim()
      ? knowledgeTab.welcomeMessage
      : rootWelcome;
  const dataPrompts = normalizeSuggestedPrompts(dataTab?.suggestedPrompts);
  const knowledgePrompts = normalizeSuggestedPrompts(knowledgeTab?.suggestedPrompts);
  const fallbackPrompts = rootPrompts.length ? rootPrompts : ['Ask the assistant a question'];
  const dataPromptsResolved = dataPrompts.length ? dataPrompts : fallbackPrompts;
  const knowledgePromptsResolved = knowledgePrompts.length
    ? knowledgePrompts
    : rootPrompts.length
      ? rootPrompts
      : dataPromptsResolved;
  const chatTags = Array.isArray(c.chatTags)
    ? c.chatTags.filter((t) => typeof t === 'string' && t.trim())
    : [];
  return {
    panelWidth: typeof c.panelWidth === 'string' && c.panelWidth.trim() ? c.panelWidth.trim() : '75vw',
    panelMinWidth:
      typeof c.panelMinWidth === 'string' && c.panelMinWidth.trim() ? c.panelMinWidth.trim() : '400px',
    panelMaxWidth:
      typeof c.panelMaxWidth === 'string' && c.panelMaxWidth.trim() ? c.panelMaxWidth.trim() : '100%',
    assistantBrandTitle:
      typeof c.assistantBrandTitle === 'string' && c.assistantBrandTitle.trim()
        ? c.assistantBrandTitle.trim()
        : 'AI Assistant',
    modelLabel: typeof c.modelLabel === 'string' ? c.modelLabel.trim() : '',
    newChatHeading: typeof c.newChatHeading === 'string' && c.newChatHeading.trim() ? c.newChatHeading.trim() : 'New Chat',
    chatTags,
    emptyStateMessage:
      typeof c.emptyStateMessage === 'string' && c.emptyStateMessage.trim()
        ? c.emptyStateMessage.trim()
        : 'No messages yet. Say hello to start.',
    composerDisclaimer:
      typeof c.composerDisclaimer === 'string' && c.composerDisclaimer.trim()
        ? c.composerDisclaimer.trim()
        : 'AI can make mistakes. Check important info.',
    composerPlaceholder:
      typeof c.composerPlaceholder === 'string' && c.composerPlaceholder.trim()
        ? c.composerPlaceholder.trim()
        : 'How can I help you today?',
    searchPlaceholder:
      typeof c.searchPlaceholder === 'string' && c.searchPlaceholder.trim() ? c.searchPlaceholder.trim() : 'Search...',
    startNewChatLabel:
      typeof c.startNewChatLabel === 'string' && c.startNewChatLabel.trim()
        ? c.startNewChatLabel.trim()
        : 'Start New Chat',
    userInitials: typeof c.userInitials === 'string' ? c.userInitials.trim() : '',
    userDisplayName: typeof c.userDisplayName === 'string' ? c.userDisplayName.trim() : '',
    userPlanLabel: typeof c.userPlanLabel === 'string' ? c.userPlanLabel.trim() : '',
    title: typeof c.title === 'string' ? c.title : 'AI Chat',
    welcomeMessageBySource: {
      data: dataWelcome,
      knowledge: knowledgeWelcome || dataWelcome,
    },
    suggestedPromptsLabel:
      typeof c.suggestedPromptsLabel === 'string' ? c.suggestedPromptsLabel : 'Suggested prompts',
    suggestedPromptsBySource: {
      data: dataPromptsResolved,
      knowledge: knowledgePromptsResolved,
    },
    dataLabel: typeof dataTab?.label === 'string' ? dataTab.label : 'Data',
    knowledgeLabel: typeof knowledgeTab?.label === 'string' ? knowledgeTab.label : 'Knowledge',
    defaultSourceMode: mode,
    textareaPlaceholder: typeof c.textareaPlaceholder === 'string' ? c.textareaPlaceholder : 'Type your message here.',
    textareaPlaceholderWithTool:
      typeof c.textareaPlaceholderWithTool === 'string'
        ? c.textareaPlaceholderWithTool
        : 'Ask a question (formatting as {tool})...',
    closeAriaLabel: typeof c.closeAriaLabel === 'string' ? c.closeAriaLabel : 'Close panel',
    backdropAriaLabel: typeof c.backdropAriaLabel === 'string' ? c.backdropAriaLabel : 'Close chat',
  };
}

export function resolveKnowledgeOnlyContent(raw) {
  const c = raw && typeof raw === 'object' ? raw : {};
  const knowledgeTab = c.sourceTabs?.knowledge;
  const rootWelcome = typeof c.welcomeMessage === 'string' ? c.welcomeMessage : '';
  const knowledgeWelcome =
    typeof knowledgeTab?.welcomeMessage === 'string' && knowledgeTab.welcomeMessage.trim()
      ? knowledgeTab.welcomeMessage
      : rootWelcome;
  const knowledgePrompts = normalizeSuggestedPrompts(knowledgeTab?.suggestedPrompts);
  const rootPrompts = normalizeSuggestedPrompts(c.suggestedPrompts);
  const prompts = knowledgePrompts.length
    ? knowledgePrompts
    : rootPrompts.length
      ? rootPrompts
      : ['Ask about the knowledge base'];
  return {
    panelWidth: typeof c.panelWidth === 'string' && c.panelWidth.trim() ? c.panelWidth.trim() : '75vw',
    panelMinWidth:
      typeof c.panelMinWidth === 'string' && c.panelMinWidth.trim() ? c.panelMinWidth.trim() : '400px',
    panelMaxWidth:
      typeof c.panelMaxWidth === 'string' && c.panelMaxWidth.trim() ? c.panelMaxWidth.trim() : '100%',
    title:
      typeof knowledgeTab?.label === 'string' && knowledgeTab.label.trim()
        ? `${knowledgeTab.label} · KnowYa!`
        : typeof c.title === 'string'
          ? c.title
          : 'Knowledge only',
    welcomeMessage: knowledgeWelcome,
    suggestedPromptsLabel:
      typeof c.suggestedPromptsLabel === 'string' ? c.suggestedPromptsLabel : 'Suggested prompts',
    suggestedPrompts: prompts,
    textareaPlaceholder: typeof c.textareaPlaceholder === 'string' ? c.textareaPlaceholder : 'Type your message here.',
    textareaPlaceholderWithTool:
      typeof c.textareaPlaceholderWithTool === 'string'
        ? c.textareaPlaceholderWithTool
        : 'Ask a question (formatting as {tool})...',
    closeAriaLabel: typeof c.closeAriaLabel === 'string' ? c.closeAriaLabel : 'Close panel',
    backdropAriaLabel: typeof c.backdropAriaLabel === 'string' ? c.backdropAriaLabel : 'Close chat',
  };
}

export const WIDGET_CONTENT = resolveWidgetContent(rawWidgetContent);
export const KNOWLEDGE_WIDGET_CONTENT = resolveKnowledgeOnlyContent(rawWidgetContent);
