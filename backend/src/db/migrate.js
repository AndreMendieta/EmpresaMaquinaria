const fs = require('fs');
const path = require('path');
const {envPath} = require('./load-env');

const pool = require('./pool');

async function migrate() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log(`Esquema aplicado usando ${envPath}.`);
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(`No se pudo aplicar el esquema usando ${envPath}:`, error.message);
  process.exitCode = 1;
});
