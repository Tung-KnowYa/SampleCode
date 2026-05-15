/** Shown sequentially while the assistant request is in flight (Data tab). */
export const THINKING_STEPS_DATA = [
  'AI is looking for data…',
  'AI is searching for information…',
  'AI is consolidating information…',
  'AI is coming up with a solution…',
  'AI is summarizing…',
];

/** Knowledge tab — search-oriented first step. */
export const THINKING_STEPS_KNOWLEDGE = [
  'AI is searching for information…',
  'AI is looking for data…',
  'AI is consolidating information…',
  'AI is coming up with a solution…',
  'AI is summarizing…',
];

/**
 * @param {'data' | 'knowledge'} source
 * @returns {readonly string[]}
 */
export function getThinkingSteps(source) {
  return source === 'knowledge' ? THINKING_STEPS_KNOWLEDGE : THINKING_STEPS_DATA;
}
