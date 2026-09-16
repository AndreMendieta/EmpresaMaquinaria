const dotenv = require('dotenv');

const isTest = process.env.NODE_ENV === 'test';
const envPath = isTest ? '.env.test' : '.env';
dotenv.config({path: envPath});

if (isTest && !process.env.DATABASE_URL && process.env.DATABASE_NAME) {
  dotenv.config({path: '.env'});
  const databaseUrl = new URL(process.env.DATABASE_URL);
  databaseUrl.pathname = `/${process.env.DATABASE_NAME}`;
  process.env.DATABASE_URL = databaseUrl.toString();
}

module.exports = {envPath};
