const { Pool } = require('pg');

class PostgresDB {
  constructor(config) {
    this._pool = new Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });
  }

  async query(text, params) {
    return this._pool.query(text, params);
  }
}

module.exports = PostgresDB;
