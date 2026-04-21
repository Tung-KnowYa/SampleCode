const OpenAI = require('openai').OpenAI;
const { LLMProvider } = require('./llm-provider');

/**
 * OpenAI-compatible client pointed at a LiteLLM proxy.
 */
class LiteLLMService extends LLMProvider {
  /**
   * @param {object} options
   * @param {string} options.baseURL
   * @param {string} options.apiKey
   * @param {string} options.aiChatModel
   * @param {string} options.aiEmbeddingModel
   * @param {number} [options.timeoutSec]
   * @param {number} [options.maxTokens]
   * @param {number} [options.temperature]
   * @param {number} [options.embeddingDimensions]
   */
  constructor(options) {
    super();
    this._chatModel = options.aiChatModel;
    this._embeddingModel = options.aiEmbeddingModel;
    this._maxTokens = options.maxTokens ?? 500;
    this._temperature = options.temperature ?? 0.1;
    this._embeddingDimensions = options.embeddingDimensions;

    const base = (options.baseURL || '').replace(/\/$/, '');
    const baseURL = base.endsWith('/v1') ? base : `${base}/v1`;

    this._client = new OpenAI({
      baseURL,
      apiKey: options.apiKey,
      timeout: (options.timeoutSec ?? 20) * 1000,
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
        model: this._embeddingModel,
      };
      if (this._embeddingDimensions) {
        params.dimensions = this._embeddingDimensions;
      }
      const response = await this._client.embeddings.create(params);
      return response.data[0].embedding;
    } catch (error) {
      console.error('LiteLLM Embedding Error:', error.message);
      throw new Error('Failed to generate embeddings.');
    }
  }

  /**
   * @param {{ role: string, content: string }[]} messages
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async chatComplete(messages, options = {}) {
    try {
      const response = await this._client.chat.completions.create({
        model: this._chatModel,
        messages,
        max_tokens: options.maxTokens ?? this._maxTokens,
        temperature: options.temperature ?? this._temperature,
      });
      const content = response.choices[0]?.message?.content;
      return content ?? '';
    } catch (error) {
      console.error('LiteLLM Chat Error:', error.message);
      throw new Error('Failed to connect to AI Service.');
    }
  }

  /**
   * @param {string} prompt
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async generateText(prompt, options) {
    return this.chatComplete([{ role: 'user', content: prompt }], options);
  }
}

module.exports = { LiteLLMService };
