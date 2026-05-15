/**
 * Base contract for LLM / embedding providers. Subclasses implement the operations they support.
 */
class LLMProvider {
  /**
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async embedText(text) {
    throw new Error('embedText is not implemented for this provider');
  }

  /**
   * @param {{ role: string, content: string }[]} messages
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async chatComplete(messages, options) {
    throw new Error('chatComplete is not implemented for this provider');
  }

  /**
   * Stream chat completion as token/text chunks. Default falls back to a single {@link chatComplete} call.
   * @param {{ role: string, content: string }[]} messages
   * @param {object} [options]
   * @param {(chunk: string) => void} onChunk
   * @returns {Promise<string>} full concatenated assistant text (before server-side post-processing)
   */
  async chatCompleteStream(messages, options, onChunk) {
    const text = await this.chatComplete(messages, options);
    if (text && typeof onChunk === 'function') onChunk(text);
    return text;
  }

  /**
   * @param {string} prompt
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async generateText(prompt, options) {
    throw new Error('generateText is not implemented for this provider');
  }
}

module.exports = { LLMProvider };
