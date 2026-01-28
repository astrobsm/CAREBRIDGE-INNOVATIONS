// ============================================
// Complete Missing Tables Migration Script
// Runs supabase-complete-missing-tables.sql on DigitalOcean MySQL
// ============================================

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DO_DB_HOST || 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
  port: parseInt(process.env.DO_DB_PORT || '25060'),
  user: process.env.DO_DB_USER || 'doadmin',
  password: process.env.DO_DB_PASSWORD, // Set via DO_DB_PASSWORD environment variable
  database: process.env.DO_DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false },
  multipleStatements: true
};

// Tables that should exist after migration
const EXPECTED_TABLES = [
  'audit_logs',
  'sync_status',
  'admission_notes',
  'bed_assignments',
  'doctor_assignments',
  'nurse_assignments',
  'staff_patient_assignments',
  'burn_monitoring_records',
  'escharotomy_records',
  'skin_graft_records',
  'burn_care_plans',
  'appointment_reminders',
  'appointment_slots',
  'clinic_sessions',
  'activity_billing_records',
  'payroll_periods',
  'staff_payroll_records',
  'payslips',
  'transfusion_orders',
  'transfusion_monitoring_charts',
  'npwt_notifications',
  'nutrition_plans',
  'enhanced_video_conferences',
  'referrals',
  'patient_education_records',
  'calculator_results',
  'user_settings',
  'hospital_settings',
  'meeting_minutes'
];

async function checkExistingTables(connection) {
  console.log('\n📊 Checking existing tables...');
  const [tables] = await connection.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
    ['defaultdb']
  );
  return tables.map(t => t.TABLE_NAME.toLowerCase());
}

async function runMigration() {
  console.log('🚀 Starting Complete Missing Tables Migration');
  console.log('=' .repeat(60));
  
  if (!DB_CONFIG.password) {
    console.error('❌ Error: DO_DB_PASSWORD environment variable is not set');
    console.log('Set it with: $env:DO_DB_PASSWORD="your_password"');
    process.exit(1);
  }

  let connection;
  try {
    console.log('\n📡 Connecting to DigitalOcean MySQL...');
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected successfully!\n');

    // Check which tables already exist
    const existingTables = await checkExistingTables(connection);
    console.log(`Found ${existingTables.length} existing tables.`);
    
    const missingTables = EXPECTED_TABLES.filter(t => !existingTables.includes(t.toLowerCase()));
    console.log(`\n📋 Tables to be created: ${missingTables.length}`);
    missingTables.forEach(t => console.log(`   - ${t}`));

    if (missingTables.length === 0) {
      console.log('\n✨ All expected tables already exist!');
    }

    // Read SQL file
    const sqlFilePath = path.join(__dirname, 'supabase-complete-missing-tables.sql');
    if (!fs.existsSync(sqlFilePath)) {
      console.error('❌ SQL file not found:', sqlFilePath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Split into individual statements
    const statements = sqlContent
      .split(/;[\r\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`\n📝 Executing ${statements.length} SQL statements...\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments-only statements
      if (!statement || statement.startsWith('--') || statement.startsWith('/*')) {
        continue;
      }

      try {
        await connection.query(statement);
        
        // Determine statement type for logging
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
          if (match) {
            console.log(`✅ Created table: ${match[1]}`);
          }
          successCount++;
        } else if (statement.toUpperCase().includes('ALTER TABLE')) {
          const match = statement.match(/ALTER TABLE (\w+)/i);
          if (match) {
            console.log(`✅ Altered table: ${match[1]}`);
          }
          successCount++;
        } else if (statement.toUpperCase().includes('SELECT')) {
          // Status message, skip
          skipCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        // Handle common expected errors
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          console.log(`⏭️  Table already exists, skipped`);
          skipCount++;
        } else if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⏭️  Column already exists, skipped`);
          skipCount++;
        } else if (error.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
          console.log(`⏭️  Column/key doesn't exist, skipped`);
          skipCount++;
        } else if (error.message.includes('Duplicate column name')) {
          console.log(`⏭️  Column already exists, skipped`);
          skipCount++;
        } else if (error.message.includes("Unknown column 'IF'")) {
          // MySQL 5.x doesn't support IF NOT EXISTS for columns
          // Try running without IF NOT EXISTS
          console.log(`⚠️  Retrying without IF NOT EXISTS...`);
          try {
            const alteredStatement = statement.replace(/IF NOT EXISTS\s+/gi, '');
            await connection.query(alteredStatement);
            console.log(`✅ Retry successful`);
            successCount++;
          } catch (retryError) {
            if (retryError.code === 'ER_DUP_FIELDNAME') {
              console.log(`⏭️  Column already exists, skipped`);
              skipCount++;
            } else {
              console.error(`❌ Error: ${retryError.message}`);
              errorCount++;
            }
          }
        } else {
          console.error(`❌ Error: ${error.message}`);
          errorCount++;
        }
      }
    }

    // Final verification
    console.log('\n' + '=' .repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    // Verify final state
    const finalTables = await checkExistingTables(connection);
    console.log(`\n📋 Final table count: ${finalTables.length}`);
    
    const stillMissing = EXPECTED_TABLES.filter(t => !finalTables.includes(t.toLowerCase()));
    if (stillMissing.length > 0) {
      console.log('\n⚠️  Still missing tables:');
      stillMissing.forEach(t => console.log(`   - ${t}`));
    } else {
      console.log('\n✨ All expected tables now exist!');
    }

    console.log('\n🎉 Migration completed!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📡 Connection closed.');
    }
  }
}

// Run migration
runMigration().catch(console.error);
