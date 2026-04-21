/**
 * @typedef {object} ChatMessage
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 */

/**
 * Base contract for LLM / embedding providers. Subclasses implement the operations they support.
 */
export class LLMProvider {
    /**
     * @param {string} text
     * @returns {Promise<number[]>}
     */
    async embedText(text) {
        throw new Error('embedText is not implemented for this provider');
    }

    /**
     * @param {ChatMessage[]} messages
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
