import { LLMProvider } from './llm-provider.js';

export class MockLLMProvider extends LLMProvider {
    /**
     * @param {object} options
     * @param {number} options.dimensions
     */
    constructor(options) {
        super();
        this._dimensions = options.dimensions;
    }

    /**
     * @param {string} _text
     * @returns {Promise<number[]>}
     */
    async embedText(_text) {
        const vector = Array.from({ length: this._dimensions }, () => Math.random() - 0.5);
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return vector.map((val) => val / magnitude);
    }
}
