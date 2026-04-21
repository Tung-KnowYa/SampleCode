const { AzureOpenAIService } = require('./azure-openai-service');
const { LiteLLMService } = require('./lite-llm-service');
const { MockLLMProvider } = require('./mock-llm-provider');

/**
 * @param {object} env - application env from config/env.js
 */
function createLLMProvider(env) {
  const provider = (env.ai.provider || 'azure').toLowerCase();

  if (provider === 'mock') {
    console.log('Using Mock LLM Provider');
    return new MockLLMProvider({ dimensions: env.vector.dimensions });
  }

  if (provider === 'azure') {
    console.log('Using Azure LLM Provider');
    return new AzureOpenAIService({
      embedding: env.ai.azure.embedding,
      chat: env.ai.azure.chat,
    });
  }

  if (provider === 'litellm') {
    console.log('Using LiteLLM Provider');
    return new LiteLLMService({
      baseURL: env.ai.litellm.baseURL,
      apiKey: env.ai.litellm.apiKey,
      aiChatModel: env.ai.litellm.aiChatModel,
      aiEmbeddingModel: env.ai.litellm.aiEmbeddingModel,
      timeoutSec: env.ai.litellm.timeoutSec,
      maxTokens: env.ai.litellm.maxTokens,
      temperature: env.ai.litellm.temperature,
      embeddingDimensions: env.vector.dimensions,
    });
  }

  throw new Error(`Unknown AI_PROVIDER: ${provider}`);
}

module.exports = { createLLMProvider };
