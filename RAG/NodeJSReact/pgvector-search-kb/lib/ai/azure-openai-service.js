import { AzureOpenAI } from 'openai';
import { LLMProvider } from './llm-provider.js';

export class AzureOpenAIService extends LLMProvider {
    /**
     * @param {object} options
     * @param {string} options.endpoint
     * @param {string} options.apiKey
     * @param {string} options.apiVersion
     * @param {string} options.deployment
     * @param {number} options.embeddingDimensions
     */
    constructor(options) {
        super();
        this._deploymentEmbedding = options.deploymentEmbedding;
        this._embeddingDimensions = options.embeddingDimensions;
        this._client = new AzureOpenAI({
            endpoint: options.endpoint,
            apiKey: options.apiKey,
            apiVersion: options.apiVersion,
            deployment: options.deploymentEmbedding,
        });
    }

    /**
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    async embedText(text) {
        try {
            const sanitizedText = text.replace(/\n/g, ' ').trim();

            const params = {
                input: sanitizedText,
                model: this._deploymentEmbedding,
            };
            // Only add dimensions if specifically requested
            if (this._embeddingDimensions) {
                params.dimensions = this._embeddingDimensions;
            }

            const response = await this._client.embeddings.create(params);
            return response.data[0].embedding;
        } catch (error) {
            console.error('Error calling Azure OpenAI API:', error.message);
            throw error;
        }
    }
}
