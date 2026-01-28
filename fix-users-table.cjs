// Fix users table columns to be compatible with IndexedDB schema
const mysql = require('mysql2/promise');

async function fixUsersTable() {
  console.log('🔄 Connecting...');
  
  const conn = await mysql.createConnection({
    host: process.env.DO_DB_HOST || 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
    port: parseInt(process.env.DO_DB_PORT || '25060'),
    user: process.env.DO_DB_USER || 'doadmin',
    password: process.env.DO_DB_PASSWORD,
    database: process.env.DO_DB_NAME || 'defaultdb',
    ssl: { rejectUnauthorized: false }
  });

  console.log('✅ Connected! Fixing users table...');

  // Make password nullable
  await conn.query('ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL');
  console.log('  ✓ Made password nullable');
  
  // Change role from ENUM to VARCHAR
  await conn.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'doctor'");
  console.log('  ✓ Changed role to VARCHAR');
  
  // Also rename password to password_hash if needed for consistency
  // await conn.query('ALTER TABLE users CHANGE COLUMN password password_hash VARCHAR(255) NULL');

  await conn.end();
  console.log('✅ Done!');
}

fixUsersTable().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
