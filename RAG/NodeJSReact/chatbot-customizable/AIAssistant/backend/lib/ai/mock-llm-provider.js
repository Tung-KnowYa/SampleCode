const { LLMProvider } = require('./llm-provider');

class MockLLMProvider extends LLMProvider {
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

  /**
   * @param {{ role: string, content: string }[]} messages
   * @returns {Promise<string>}
   */
  async chatComplete(messages) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const preview = lastUser ? String(lastUser.content).slice(0, 120) : '';
    return [
      '**[Mock AI]** No live model is configured (`AI_PROVIDER=mock`).',
      preview ? `Your message (preview): _${preview}${preview.length >= 120 ? '…' : ''}_` : '',
      'Set `AI_PROVIDER=azure` or `litellm` and configure credentials for real answers.',
    ].filter(Boolean).join('\n\n');
  }

  /**
   * @param {{ role: string, content: string }[]} messages
   * @param {object} [_options]
   * @param {(chunk: string) => void} onChunk
   * @returns {Promise<string>}
   */
  async chatCompleteStream(messages, _options, onChunk) {
    const full = await this.chatComplete(messages);
    const step = 12;
    for (let i = 0; i < full.length; i += step) {
      const piece = full.slice(i, i + step);
      if (piece && typeof onChunk === 'function') onChunk(piece);
      await new Promise((r) => setTimeout(r, 18));
    }
    return full;
  }
}

module.exports = { MockLLMProvider };
