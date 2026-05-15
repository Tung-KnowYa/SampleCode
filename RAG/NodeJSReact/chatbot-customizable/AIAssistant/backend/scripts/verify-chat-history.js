/**
 * Smoke checks for chat history sanitization. Run: npm run verify:chat-history
 */
const assert = require('assert');
const { sanitizeChatHistory, buildRetrievalQuery } = require('../lib/chatHistory');

assert.deepStrictEqual(sanitizeChatHistory(null), []);
assert.deepStrictEqual(sanitizeChatHistory([{ role: 'user', content: ' hi ' }]), [{ role: 'user', content: 'hi' }]);
assert.deepStrictEqual(sanitizeChatHistory([{ role: 'system', content: 'x' }]), []);
assert.deepStrictEqual(
  sanitizeChatHistory(
    [
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ],
    { maxMessages: 1 }
  ),
  [{ role: 'assistant', content: 'b' }]
);

const long = 'z'.repeat(9000);
const trimmed = sanitizeChatHistory([{ role: 'user', content: long }], { maxCharsPerMessage: 100 });
assert.strictEqual(trimmed[0].content.endsWith('…'), true);
assert.strictEqual(trimmed[0].content.length, 101);

assert.strictEqual(buildRetrievalQuery('follow up', []), 'follow up');
assert.strictEqual(
  buildRetrievalQuery('follow up', [{ role: 'user', content: 'first question' }]).includes('first question'),
  true
);

console.log('verify-chat-history: ok');
