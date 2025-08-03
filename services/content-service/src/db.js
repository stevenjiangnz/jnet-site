const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://dev:devpass@localhost:5432/jnetsolution'
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};