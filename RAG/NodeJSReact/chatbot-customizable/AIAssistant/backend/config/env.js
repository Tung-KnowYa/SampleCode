require('dotenv').config();

const { sanitizePgIdentifier } = require('../lib/operationalDataSource');

const EMBEDDING_DIMENSIONS = parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10);

const azureEmbedding = {
  endpoint: process.env.OPENAI_ENDPOINT,
  key: process.env.OPENAI_API_KEY,
  deployment: process.env.OPENAI_DEPLOYMENT_NAME,
  model: process.env.OPENAI_MODEL_NAME,
  version: process.env.OPENAI_API_VERSION,
};

const azureChat = {
  endpoint: process.env.OPENAI_CHAT_ENDPOINT,
  key: process.env.OPENAI_CHAT_API_KEY,
  deployment: process.env.OPENAI_CHAT_DEPLOYMENT_NAME,
  model: process.env.OPENAI_CHAT_MODEL_NAME,
  version: process.env.OPENAI_CHAT_API_VERSION,
};

const litellmTimeoutSec = parseInt(process.env.LITELLM_TIMEOUT_SEC || '20', 10);
const litellmMaxTokensRaw = parseInt(process.env.LITELLM_MAX_TOKENS || '2048', 10);
const litellmMaxTokens =
  Number.isFinite(litellmMaxTokensRaw) && litellmMaxTokensRaw > 0
    ? Math.min(Math.max(litellmMaxTokensRaw, 256), 32000)
    : 2048;
const litellmTemperature = parseFloat(process.env.LITELLM_TEMPERATURE || '0.1');

const itemDbTable = sanitizePgIdentifier(process.env.ITEM_DB_TABLE) || 'items';
const itemDbColId = sanitizePgIdentifier(process.env.ITEM_DB_COL_ID) || 'item_id';
const ttsMaxCharsParsed = parseInt(process.env.TTS_MAX_CHARS || '4096', 10);
const ttsTimeoutSecParsed = parseInt(process.env.TTS_TIMEOUT_SEC || '45', 10);

module.exports = {
  PORT: process.env.PORT || 3002,
  /** Optional full origin for export download links (e.g. https://api.example.com). Defaults to request Host. */
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
  vector: {
    dimensions: EMBEDDING_DIMENSIONS,
  },
  ai: {
    /** Default matches [.env.sample](.env.sample): Azure needs many vars; empty Docker env used to crash on startup. */
    provider: process.env.AI_PROVIDER || 'azure',
    azure: {
      embedding: azureEmbedding,
      chat: azureChat,
    },
    litellm: {
      baseURL: process.env.LITELLM_BASE_URL,
      apiKey: process.env.LITELLM_API_KEY,
      aiChatModel: process.env.LITELLM_CHAT_MODEL,
      aiEmbeddingModel: process.env.LITELLM_EMBEDDING_MODEL,
      timeoutSec: litellmTimeoutSec,
      maxTokens: litellmMaxTokens,
      temperature: litellmTemperature,
    },
  },
  /** Data-tab demo dataset (`demo-datasets.json` root key). Overridable per request: `itemDbTbl` / `itemDbColId`. */
  itemDb: {
    table: itemDbTable,
    idColumn: itemDbColId,
  },
  /**
   * OpenAI-compatible Speech API (`POST /v1/audio/speech`).
   * If `TTS_BASE_URL` / `TTS_API_KEY` are empty and `AI_PROVIDER=litellm`, LiteLLM base URL + API key are reused.
   */
  tts: {
    baseURL: process.env.TTS_BASE_URL || '',
    apiKey: process.env.TTS_API_KEY || '',
    model: process.env.TTS_MODEL || 'tts-1',
    voice: process.env.TTS_VOICE || 'alloy',
    responseFormat: process.env.TTS_RESPONSE_FORMAT || 'mp3',
    timeoutSec:
      Number.isFinite(ttsTimeoutSecParsed) && ttsTimeoutSecParsed > 0 ? ttsTimeoutSecParsed : 45,
    maxChars:
      Number.isFinite(ttsMaxCharsParsed) && ttsMaxCharsParsed > 0 ? ttsMaxCharsParsed : 4096,
  },
};
