require('dotenv').config();

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
const litellmMaxTokens = parseInt(process.env.LITELLM_MAX_TOKENS || '500', 10);
const litellmTemperature = parseFloat(process.env.LITELLM_TEMPERATURE || '1');

module.exports = {
  PORT: process.env.PORT || 3001,
  DB: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
  vector: {
    dimensions: EMBEDDING_DIMENSIONS,
  },
  ai: {
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
};
