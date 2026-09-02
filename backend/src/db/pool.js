const { Pool } = require('pg');

// DATABASE_URL viene de tu proveedor (Neon, Render, Railway, etc.)
// Formato: postgresql://usuario:password@host:5432/nombre_bd
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'false'
      ? false
      : { rejectUnauthorized: false }, // necesario para la mayoría de hostings en la nube
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = pool;
