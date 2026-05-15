const OpenAI = require('openai').OpenAI;

const OPENAI_VOICE_ALLOWLIST = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']);
const RESPONSE_FORMAT_ALLOWLIST = new Set(['mp3', 'aac', 'opus', 'wav', 'pcm', 'flac']);

/** @typedef {{ baseURL: string, apiKey: string, model: string, voice: string, responseFormat: string, timeoutSec: number, maxChars: number }} ResolvedTTSConfig */

/**
 * Matches LiteLLM / OpenAI base URL normalization.
 * @param {string} raw
 */
function normalizeOpenAIV1BaseURL(raw) {
  const base = String(raw || '').trim().replace(/\/+$/, '');
  if (!base) return '';
  return base.endsWith('/v1') ? base : `${base}/v1`;
}

/**
 * @param {{ baseURL?: string, apiKey?: string, timeoutSec?: number }} envTts — from env.js `tts`; merge `baseURL` / `apiKey` with liteLLM in server if empty.
 */
function resolveTTSClientConfig(envAi, envTts) {
  const provider = String(envAi.provider || '').toLowerCase();

  /** @type {string} */
  let baseURL = String(envTts.baseURL || '').trim();
  /** @type {string} */
  let apiKey = String(envTts.apiKey || '').trim();

  if ((!baseURL || !apiKey) && provider === 'litellm') {
    baseURL = baseURL || String(envAi.litellm?.baseURL || '').trim();
    apiKey = apiKey || String(envAi.litellm?.apiKey || '').trim();
  }

  const normalized = normalizeOpenAIV1BaseURL(baseURL);
  if (!normalized || !apiKey) return null;

  const rawMax = Number(envTts.maxChars);
  const maxChars =
    Number.isFinite(rawMax) && rawMax > 0 ? Math.min(16000, Math.max(200, Math.floor(rawMax))) : 4096;

  /**
   * @type {ResolvedTTSConfig}
   */
  const resolved = {
    baseURL: normalized,
    apiKey,
    model: String(envTts.model || 'tts-1').trim() || 'tts-1',
    voice: OPENAI_VOICE_ALLOWLIST.has(String(envTts.voice || '').trim().toLowerCase())
      ? String(envTts.voice).trim().toLowerCase()
      : 'alloy',
    responseFormat: RESPONSE_FORMAT_ALLOWLIST.has(String(envTts.responseFormat || '').trim().toLowerCase())
      ? String(envTts.responseFormat).trim().toLowerCase()
      : 'mp3',
    timeoutSec: Number.isFinite(envTts.timeoutSec) ? Number(envTts.timeoutSec) : 45,
    maxChars,
  };
  resolved.timeoutSec = Math.min(Math.max(resolved.timeoutSec, 10), 120);
  return resolved;
}

/** @param {string} fmt */
function mimeForSpeechFormat(fmt) {
  switch (fmt) {
    case 'aac':
      return 'audio/aac';
    case 'opus':
      return 'audio/opus';
    case 'wav':
      return 'audio/wav';
    case 'flac':
      return 'audio/flac';
    case 'pcm':
      return 'audio/pcm';
    default:
      return 'audio/mpeg';
  }
}

/**
 * @param {{ config: ResolvedTTSConfig, text: string }} p
 * @returns {Promise<{ mimeType: string, buffer: Buffer }>}
 */
async function synthesizeSpeech({ config, text }) {
  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
    timeout: config.timeoutSec * 1000,
  });

  const response = await client.audio.speech.create({
    model: config.model,
    voice: config.voice,
    input: text,
    response_format: /** @type {'mp3' | 'wav' | 'aac' | 'opus' | 'pcm' | 'flac'} */ (config.responseFormat),
  });

  const buffer = Buffer.from(await response.arrayBuffer());
  return { buffer, mimeType: mimeForSpeechFormat(config.responseFormat) };
}

module.exports = {
  resolveTTSClientConfig,
  normalizeOpenAIV1BaseURL,
  synthesizeSpeech,
};
