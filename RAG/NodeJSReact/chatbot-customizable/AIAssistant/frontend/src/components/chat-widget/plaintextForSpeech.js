/**
 * Best-effort markdown → plain utterance text for neural TTS.
 * Does not perfectly parse Markdown; suffices for stripping noise from assistant replies.
 * @param {string} markdown
 * @param {number} maxChars — server also caps payload length
 */
export function plaintextForSpeech(markdown, maxChars = 4096) {
  if (typeof markdown !== 'string') return '';
  let s = markdown;
  s = s.replace(/```(?:json chart|json|[^\n`]*)?\n[\s\S]*?```/gi, ' ');
  s = s.replace(/```[^`]*```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/!\[[^\]]*]\([^)]*\)/g, ' ');
  s = s.replace(/\[([^\]]+)]\([^)]*\)/g, '$1');
  s = s.replace(/\[Source:\s*[^\]]+]/gi, ' ');
  s = s.replace(/^\s{0,3}[#>]+\s?/gm, '');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');
  s = s.replace(/^\s*[-*+]\s+/gm, '');
  s = s.replace(/^\s*\d+\.\s+/gm, '');
  return s.replace(/\s+/g, ' ').trim().slice(0, maxChars);
}
