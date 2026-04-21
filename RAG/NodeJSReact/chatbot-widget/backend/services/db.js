const { Pool } = require('pg');
const { DB } = require('../config/env');

const pool = new Pool({
  host: DB.host,
  port: DB.port,
  user: DB.user,
  password: DB.password,
  database: DB.database,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};