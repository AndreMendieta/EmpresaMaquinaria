const fs = require('fs');
const path = require('path');
const {envPath} = require('./load-env');
const pool = require('./pool');

async function migrate() {
  try {
    const schemaPath = path.join(__dirname, 'schema.multiempresa.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log(`Esquema multi-tenant aplicado usando ${envPath}.`);
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error(`No se pudo aplicar el esquema multi-tenant usando ${envPath}:`, error.message);
  process.exitCode = 1;
});
