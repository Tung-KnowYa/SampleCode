const { DB } = require('../config/env');
const { createDBProvider } = require('./db-factory');

const dbInstance = createDBProvider(DB);

module.exports = {
  query: (text, params) => dbInstance.query(text, params),
};