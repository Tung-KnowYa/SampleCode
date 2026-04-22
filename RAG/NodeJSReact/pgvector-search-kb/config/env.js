import dotenv from 'dotenv';
dotenv.config();

export const config = {
    db: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    },
    vector: {
        dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536', 10)
    },
    ai: {
        provider: process.env.AI_PROVIDER || 'mock',
        azure: {
            endpoint: process.env.AZURE_OPENAI_ENDPOINT,
            apiKey: process.env.AZURE_OPENAI_API_KEY,
            apiVersion: process.env.AZURE_OPENAI_API_VERSION,
            deploymentEmbedding: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME,
        },
        litellm: {
            baseURL: process.env.LITELLM_BASE_URL,
            apiKey: process.env.LITELLM_API_KEY,
            aiChatModel: process.env.LITELLM_CHAT_MODEL,
            aiEmbeddingModel: process.env.LITELLM_EMBEDDING_MODEL,
            timeoutSec: process.env.LITELLM_TIMEOUT_SEC,
            maxTokens: process.env.LITELLM_MAX_TOKENS,
            temperature: process.env.LITELLM_TEMPERATURE,
        },
    },
};