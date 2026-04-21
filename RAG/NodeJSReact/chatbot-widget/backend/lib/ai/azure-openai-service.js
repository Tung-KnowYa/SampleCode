const { AzureOpenAI } = require('openai');
const { LLMProvider } = require('./llm-provider');

class AzureOpenAIService extends LLMProvider {
  /**
   * @param {object} options
   * @param {object} options.embedding
   * @param {string} options.embedding.endpoint
   * @param {string} options.embedding.key
   * @param {string} options.embedding.version
   * @param {string} options.embedding.deployment
   * @param {string} options.embedding.model
   * @param {object} options.chat
   * @param {string} options.chat.endpoint
   * @param {string} options.chat.key
   * @param {string} options.chat.version
   * @param {string} options.chat.deployment
   * @param {string} options.chat.model
   */
  constructor(options) {
    super();
    const e = options.embedding;
    const c = options.chat;
    this._embeddingModel = e.model;
    this._chatModel = c.model;

    this._embedClient = new AzureOpenAI({
      endpoint: e.endpoint,
      apiKey: e.key,
      apiVersion: e.version,
      deployment: e.deployment,
    });

    this._chatClient = new AzureOpenAI({
      endpoint: c.endpoint,
      apiKey: c.key,
      apiVersion: c.version,
      deployment: c.deployment,
    });
  }

  /**
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async embedText(text) {
    try {
      const sanitizedText = text.replace(/\n/g, ' ').trim();

      const response = await this._embedClient.embeddings.create({
        model: this._embeddingModel,
        input: sanitizedText,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
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
      const response = await this._chatClient.chat.completions.create({
        model: this._chatModel,
        messages,
        temperature: options.temperature ?? 0.3,
      });
      const content = response.choices[0]?.message?.content;
      return content ?? '';
    } catch (error) {
      console.error('AI Chat Error:', error);
      throw new Error('Failed to connect to AI Service.');
    }
  }
}

module.exports = { AzureOpenAIService };
