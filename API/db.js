const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'database-1.cx0cycky89of.sa-east-1.rds.amazonaws.com',
  database: 'postgres',
  password: 'carlosfelipe',
  port: 5432,
  ssl: {
    require: true,
    rejectUnauthorized: false // ← isso aqui evita erro com certificado
  }
});

module.exports = pool;
