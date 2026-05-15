const PostgresDB = require('./postgres-db');
const MockDB = require('./mock-db');

/**
 * @param {object} config
 * @param {string} config.provider
 */
function createDBProvider(config) {
  const { provider } = config;

  if (provider === 'mock') {
    return new MockDB(config);
  }

  return new PostgresDB(config);
}

module.exports = { createDBProvider };
