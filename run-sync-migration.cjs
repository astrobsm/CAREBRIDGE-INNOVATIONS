// Script to run the missing tables SQL migration on DigitalOcean database
const mysql = require('mysql2/promise');
const fs = require('fs');

async function runMigration() {
  console.log('🔄 Connecting to DigitalOcean MySQL...');
  
  // Use environment variables for credentials
  const connection = await mysql.createConnection({
    host: process.env.DO_DB_HOST || 'localhost',
    port: parseInt(process.env.DO_DB_PORT || '25060'),
    user: process.env.DO_DB_USER || 'doadmin',
    password: process.env.DO_DB_PASSWORD,
    database: process.env.DO_DB_NAME || 'defaultdb',
    ssl: {
      rejectUnauthorized: false
    },
    multipleStatements: true
  });

  console.log('✅ Connected! Running migration...');

  // Read the migration file
  const migration = fs.readFileSync('./supabase-sync-missing-tables.sql', 'utf8');
  
  // Split by CREATE TABLE and run each statement separately
  const statements = migration.split(/(?=CREATE TABLE IF NOT EXISTS)/g)
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
    console.log(`⚠️ ${errors.length} errors occurred:`);
    errors.forEach(e => console.log(`   - ${e.table}: ${e.error}`));
  }

  await connection.end();
  console.log('\n✅ Migration complete!');
}

runMigration().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
