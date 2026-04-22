import { AzureOpenAIService } from './azure-openai-service.js';
import { LiteLLMService } from './lite-llm-service.js';
import { MockLLMProvider } from './mock-llm-provider.js';

/**
 * @param {object} config - from config/env.js
 * @returns {import('./llm-provider.js').LLMProvider}
 */
export function createLLMProvider(config) {
    const provider = (config.ai.provider || 'mock').toLowerCase();

    if (provider === 'mock') {
        console.log('Using Mock LLM Provider');
        return new MockLLMProvider({ dimensions: config.vector.dimensions });
    }

    if (provider === 'azure') {
        console.log('Using Azure LLM Provider');
        return new AzureOpenAIService({
            endpoint: config.ai.azure.endpoint,
            apiKey: config.ai.azure.apiKey,
            apiVersion: config.ai.azure.apiVersion,
            deployment: config.ai.azure.deployment,
            embeddingDimensions: config.vector.dimensions,
        });
    }

    if (provider === 'litellm') {
        console.log('Using LiteLLM Provider');
        return new LiteLLMService({
            baseURL: config.ai.litellm.baseURL,
            apiKey: config.ai.litellm.apiKey,
            aiChatModel: config.ai.litellm.aiChatModel,
            aiEmbeddingModel: config.ai.litellm.aiEmbeddingModel,
            timeoutSec: config.ai.litellm.timeoutSec,
            maxTokens: config.ai.litellm.maxTokens,
            temperature: config.ai.litellm.temperature,
            embeddingDimensions: config.vector.dimensions,
        });
    }

    throw new Error(`Unknown AI_PROVIDER: ${provider}`);
}
