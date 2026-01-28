// Comprehensive script to fix all table columns to be sync-compatible
// Makes NOT NULL columns allow NULL to prevent errors during sync
const mysql = require('mysql2/promise');

async function fixAllTables() {
  console.log('🔄 Connecting to DigitalOcean MySQL...');
  
  const conn = await mysql.createConnection({
    host: process.env.DO_DB_HOST || 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
    port: parseInt(process.env.DO_DB_PORT || '25060'),
    user: process.env.DO_DB_USER || 'doadmin',
    password: process.env.DO_DB_PASSWORD,
    database: process.env.DO_DB_NAME || 'defaultdb',
    ssl: { rejectUnauthorized: false }
  });

  console.log('✅ Connected!\n');

  // Get all tables
  const [tables] = await conn.query('SHOW TABLES');
  const tableNames = tables.map(t => Object.values(t)[0]);

  let modifiedColumns = 0;
  let errors = [];

  for (const tableName of tableNames) {
    console.log(`\n📋 Processing: ${tableName}`);
    
    // Get column info
    const [columns] = await conn.query(`DESCRIBE ${tableName}`);
    
    for (const col of columns) {
      // Skip primary keys and already nullable columns
      if (col.Key === 'PRI' || col.Null === 'YES') {
        continue;
      }
      
      // Skip if it has a default value
      if (col.Default !== null) {
        continue;
      }

      try {
        // Make the column nullable
        let type = col.Type;
        
        // Handle ENUM type - convert to VARCHAR
        if (type.startsWith('enum(')) {
          type = 'VARCHAR(100)';
        }
        
        const query = `ALTER TABLE ${tableName} MODIFY COLUMN \`${col.Field}\` ${type} NULL`;
        await conn.query(query);
        console.log(`  ✓ Made ${col.Field} nullable`);
        modifiedColumns++;
      } catch (err) {
        console.log(`  ✗ Error on ${col.Field}: ${err.message}`);
        errors.push({ table: tableName, column: col.Field, error: err.message });
      }
    }
  }

  console.log(`\n📊 Summary: ${modifiedColumns} columns modified`);
  if (errors.length > 0) {
    console.log(`⚠️ ${errors.length} errors`);
  }

  await conn.end();
  console.log('✅ Done!');
}

fixAllTables().catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
