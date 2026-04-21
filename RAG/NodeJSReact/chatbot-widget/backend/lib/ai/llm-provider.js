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
   * @param {string} prompt
   * @param {object} [options]
   * @returns {Promise<string>}
   */
  async generateText(prompt, options) {
    throw new Error('generateText is not implemented for this provider');
  }
}

module.exports = { LLMProvider };
