// Script to run the MySQL schema on DigitalOcean database
const mysql = require('mysql2/promise');
const fs = require('fs');

async function runSchema() {
  console.log('🔄 Connecting to DigitalOcean MySQL...');
  
  // Use environment variables for credentials
  const connection = await mysql.createConnection({
    host: process.env.DO_DB_HOST || 'localhost',
    port: parseInt(process.env.DO_DB_PORT || '25060'),
    user: process.env.DO_DB_USER || 'doadmin',
    password: process.env.DO_DB_PASSWORD,
    database: process.env.DO_DB_NAME || 'defaultdb',
    ssl: {
      ca: fs.readFileSync('./ca-certificate.crt'),
      rejectUnauthorized: true
    },
    multipleStatements: true
  });

  console.log('✅ Connected! Running schema...');

  // Read the schema file
  const schema = fs.readFileSync('./digitalocean-mysql-schema.sql', 'utf8');
  
  // Split by CREATE TABLE and run each statement separately
  const statements = schema.split(/(?=CREATE TABLE IF NOT EXISTS)/g)
    .filter(s => s.trim())
    .map(s => s.trim());

  let created = 0;
  let errors = [];

  for (const stmt of statements) {
    if (!stmt.startsWith('CREATE TABLE')) continue;
    
    // Extract table name for logging
    const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
    const tableName = match ? match[1] : 'unknown';
    
    try {
      await connection.query(stmt);
      console.log(`  ✓ Created table: ${tableName}`);
      created++;
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`  ⚡ Table exists: ${tableName}`);
      } else {
        console.log(`  ✗ Error on ${tableName}: ${err.message}`);
        errors.push({ table: tableName, error: err.message });
      }
    }
  }

  console.log(`\n📊 Summary: ${created} tables created/verified`);
  if (errors.length > 0) {
    console.log(`⚠️ ${errors.length} errors occurred`);
  }

  // List all tables
  const [tables] = await connection.query('SHOW TABLES');
  console.log(`\n📋 Current tables in database (${tables.length}):`);
  tables.forEach((t, i) => {
    const tableName = Object.values(t)[0];
    console.log(`   ${i + 1}. ${tableName}`);
  });

  await connection.end();
  console.log('\n✅ Schema setup complete!');
}

runSchema().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
