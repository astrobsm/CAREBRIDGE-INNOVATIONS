// Quick script to describe a table
const mysql = require('mysql2/promise');

async function describeTable(tableName) {
  const connection = await mysql.createConnection({
    host: process.env.DO_DB_HOST,
    port: parseInt(process.env.DO_DB_PORT || '25060'),
    user: process.env.DO_DB_USER || 'doadmin',
    password: process.env.DO_DB_PASSWORD,
    database: process.env.DO_DB_NAME || 'defaultdb',
    ssl: { rejectUnauthorized: false }
  });

  const [rows] = await connection.query(`DESCRIBE ${tableName}`);
  console.log(`\nColumns in ${tableName}:`);
  rows.forEach(r => console.log(`  - ${r.Field} (${r.Type})`));
  
  await connection.end();
}

const table = process.argv[2] || 'users';
describeTable(table).catch(console.error);
