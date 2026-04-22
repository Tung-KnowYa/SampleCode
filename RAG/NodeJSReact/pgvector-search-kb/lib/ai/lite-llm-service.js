import OpenAI from 'openai';
import { LLMProvider } from './llm-provider.js';

/**
 * LiteLLM implementation of the LLMProvider.
 * Interfaces with a LiteLLM Proxy server using the OpenAI SDK: Since LiteLLM provides an OpenAI-compatible API, you can use the standard openai library to interface with it. You simply point the baseURL to your LiteLLM proxy server.
 */
export class LiteLLMService extends LLMProvider {
    /**
     * @param {object} options
     * @param {string} options.baseURL - The LiteLLM server URL (e.g., https://your-server.com)
     * @param {string} options.apiKey - Your LiteLLM API key
     * @param {string} options.aiChatModel - The model identifier (e.g., gemini-2.5-flash)
     * @param {string} options.aiEmbeddingModel - e.g., 'text-embedding-3-small'
     * @param {number} [options.timeoutSec] - Request timeout in milliseconds
     * @param {number} [options.maxTokens] - Max tokens for generation
     * @param {number} [options.temperature] - Sampling temperature
     * @param {number} options.embeddingDimensions
     */
    constructor(options) {
        super();
        this._chatModel = options.aiChatModel;
        this._embeddingModel = options.aiEmbeddingModel;
        this._maxTokens = options.maxTokens || 500;
        this._temperature = options.temperature ?? 0.1;
        this._embeddingDimensions = options.embeddingDimensions;

        this._client = new OpenAI({
            // Ensure this doesn't have a trailing slash
            baseURL: options.baseURL.endsWith('/v1') ? options.baseURL : `${options.baseURL}/v1`,
            apiKey: options.apiKey,
            timeout: (options.timeoutSec || 20) * 1000, // Default 20s
            // Note: TLS verification (LITELLM_VERIFY_TLS) is usually handled 
            // via environment variables (NODE_TLS_REJECT_UNAUTHORIZED) 
            // or custom fetch agents in Node.js.
        });
    }

    /**
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    async embedText(text) {
        try {
            const sanitizedText = text.replace(/\n/g, ' ').trim();

            //Ref: https://developers.openai.com/api/reference/resources/embeddings/methods/create
            const params = {
                input: sanitizedText,
                model: this._embeddingModel,
            };
            // Only add dimensions if specifically requested
            if (this._embeddingDimensions) {
                params.dimensions = this._embeddingDimensions;
            }

            const response = await this._client.embeddings.create(params);
            return response.data[0].embedding;
        } catch (error) {
            console.error('LiteLLM Embedding Error: [', this._embeddingModel, '] ', error.message);
            throw error;
        }
    }

    /**
     * @param {import('./llm-provider.js').ChatMessage[]} messages
     * @param {object} [options]
     * @returns {Promise<string>}
     */
    async chatComplete(messages, options = {}) {
        try {
            const response = await this._client.chat.completions.create({
                model: this._model,
                messages: messages,
                max_tokens: options.maxTokens || this._maxTokens,
                temperature: options.temperature ?? this._temperature,
                ...options
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('LiteLLM Chat Error: [', this._chatModel, '] ', error.message);
            throw error;
        }
    }

    /**
     * @param {string} prompt
     * @param {object} [options]
     * @returns {Promise<string>}
     */
    async generateText(prompt, options = {}) {
        const messages = [{ role: 'user', content: prompt }];
        return this.chatComplete(messages, options);
    }
}