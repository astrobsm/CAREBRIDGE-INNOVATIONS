/**
 * MySQL Migration Script - Add Missing Columns
 * 
 * This script adds missing columns to the MySQL database.
 * It checks if columns exist before adding them.
 * 
 * Run with: 
 *   node run-mysql-add-columns.cjs <password>
 * 
 * Example:
 *   node run-mysql-add-columns.cjs "your_database_password"
 */

const mysql = require('mysql2/promise');

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Password is required');
  console.error('');
  console.error('Usage: node run-mysql-add-columns.cjs <password>');
  console.error('');
  console.error('Example: node run-mysql-add-columns.cjs "AVNS_xxxxx"');
  process.exit(1);
}

// Database configurations to try
const dbConfigs = [
  {
    name: 'DigitalOcean Primary',
    host: 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
    port: 25060,
    user: 'doadmin',
    password: password,
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false }
  },
  {
    name: 'DigitalOcean AstroHealth',
    host: 'astrohealth-mysql-server-do-user-18697102-0.i.db.ondigitalocean.com',
    port: 25060,
    user: 'doadmin',
    password: password,
    database: 'astrohealth_db',
    ssl: { rejectUnauthorized: false }
  }
];

// Columns to add - format: { table, column, definition }
const COLUMNS_TO_ADD = [
  // SURGERIES
  { table: 'surgeries', column: 'assistant', definition: 'VARCHAR(255)' },
  { table: 'surgeries', column: 'assistant_id', definition: 'VARCHAR(36)' },
  { table: 'surgeries', column: 'anaesthetist', definition: 'VARCHAR(255)' },
  { table: 'surgeries', column: 'anaesthetist_id', definition: 'VARCHAR(36)' },
  { table: 'surgeries', column: 'scrub_nurse', definition: 'VARCHAR(255)' },
  { table: 'surgeries', column: 'scrub_nurse_id', definition: 'VARCHAR(36)' },
  { table: 'surgeries', column: 'circulating_nurse', definition: 'VARCHAR(255)' },
  { table: 'surgeries', column: 'circulating_nurse_id', definition: 'VARCHAR(36)' },
  { table: 'surgeries', column: 'anaesthesia_type', definition: 'VARCHAR(100)' },
  { table: 'surgeries', column: 'operative_notes', definition: 'TEXT' },
  { table: 'surgeries', column: 'complications', definition: 'TEXT' },
  { table: 'surgeries', column: 'blood_loss', definition: 'VARCHAR(50)' },
  { table: 'surgeries', column: 'specimens', definition: 'JSON' },
  { table: 'surgeries', column: 'implants', definition: 'JSON' },
  { table: 'surgeries', column: 'post_op_instructions', definition: 'TEXT' },
  
  // WOUNDS
  { table: 'wounds', column: 'photo_urls', definition: 'JSON' },
  { table: 'wounds', column: 'treatment', definition: 'TEXT' },
  { table: 'wounds', column: 'treatment_plan', definition: 'TEXT' },
  { table: 'wounds', column: 'wound_bed', definition: 'VARCHAR(100)' },
  { table: 'wounds', column: 'wound_edges', definition: 'VARCHAR(100)' },
  { table: 'wounds', column: 'tunneling', definition: 'VARCHAR(100)' },
  { table: 'wounds', column: 'undermining', definition: 'VARCHAR(100)' },
  
  // ADMISSIONS
  { table: 'admissions', column: 'created_by', definition: 'VARCHAR(36)' },
  { table: 'admissions', column: 'admitted_by', definition: 'VARCHAR(255)' },
  { table: 'admissions', column: 'admitted_by_id', definition: 'VARCHAR(36)' },
  { table: 'admissions', column: 'consultants', definition: 'JSON' },
  { table: 'admissions', column: 'admitted_from', definition: 'VARCHAR(100)' },
  { table: 'admissions', column: 'comorbidities', definition: 'JSON' },
  { table: 'admissions', column: 'discharged_by', definition: 'VARCHAR(255)' },
  { table: 'admissions', column: 'discharged_by_id', definition: 'VARCHAR(36)' },
  { table: 'admissions', column: 'primary_nurse', definition: 'VARCHAR(255)' },
  { table: 'admissions', column: 'primary_nurse_id', definition: 'VARCHAR(36)' },
  { table: 'admissions', column: 'admission_date', definition: 'DATE' },
  { table: 'admissions', column: 'admission_time', definition: 'TIME' },
  { table: 'admissions', column: 'admission_type', definition: 'VARCHAR(50)' },
  { table: 'admissions', column: 'discharge_date', definition: 'DATE' },
  { table: 'admissions', column: 'discharge_time', definition: 'TIME' },
  { table: 'admissions', column: 'discharge_type', definition: 'VARCHAR(50)' },
  { table: 'admissions', column: 'discharge_destination', definition: 'VARCHAR(100)' },
  { table: 'admissions', column: 'length_of_stay', definition: 'INT' },
  
  // TREATMENT_PROGRESS
  { table: 'treatment_progress', column: 'recorded_at', definition: 'DATETIME' },
  { table: 'treatment_progress', column: 'recorded_by_name', definition: 'VARCHAR(200)' },
  
  // INVESTIGATIONS
  { table: 'investigations', column: 'name', definition: 'VARCHAR(255)' },
  { table: 'investigations', column: 'description', definition: 'TEXT' },
  { table: 'investigations', column: 'clinical_info', definition: 'TEXT' },
  { table: 'investigations', column: 'attachments', definition: 'JSON' },
  
  // VIDEO_CONFERENCES
  { table: 'video_conferences', column: 'room_code', definition: 'VARCHAR(50)' },
  { table: 'video_conferences', column: 'room_id', definition: 'VARCHAR(100)' },
  { table: 'video_conferences', column: 'join_url', definition: 'TEXT' },
  { table: 'video_conferences', column: 'meeting_notes', definition: 'TEXT' },
  { table: 'video_conferences', column: 'presentation', definition: 'JSON' },
  { table: 'video_conferences', column: 'recordings', definition: 'JSON' },
  
  // APPOINTMENTS
  { table: 'appointments', column: 'appointment_date', definition: 'DATE' },
  { table: 'appointments', column: 'appointment_time', definition: 'TIME' },
  { table: 'appointments', column: 'scheduled_start', definition: 'DATETIME' },
  { table: 'appointments', column: 'scheduled_end', definition: 'DATETIME' },
  { table: 'appointments', column: 'department', definition: 'VARCHAR(100)' },
  { table: 'appointments', column: 'reason', definition: 'TEXT' },
  { table: 'appointments', column: 'confirmed_at', definition: 'DATETIME' },
  { table: 'appointments', column: 'cancelled_at', definition: 'DATETIME' },
  { table: 'appointments', column: 'cancellation_reason', definition: 'TEXT' },
  { table: 'appointments', column: 'reminder_sent', definition: 'BOOLEAN' },
  
  // APPOINTMENT_REMINDERS
  { table: 'appointment_reminders', column: 'whatsapp_message_id', definition: 'VARCHAR(100)' },
  
  // MEDICATION_CHARTS
  { table: 'medication_charts', column: 'prn_medications', definition: 'JSON' },
  { table: 'medication_charts', column: 'scheduled_medications', definition: 'JSON' },
  { table: 'medication_charts', column: 'administrations', definition: 'JSON' },
  { table: 'medication_charts', column: 'total_medications', definition: 'INT' },
  { table: 'medication_charts', column: 'administered_count', definition: 'INT' },
  { table: 'medication_charts', column: 'pending_count', definition: 'INT' },
  
  // TRANSFUSION_ORDERS
  { table: 'transfusion_orders', column: 'verifying_nurse1', definition: 'VARCHAR(200)' },
  { table: 'transfusion_orders', column: 'verifying_nurse1_id', definition: 'VARCHAR(36)' },
  { table: 'transfusion_orders', column: 'verifying_nurse2', definition: 'VARCHAR(200)' },
  { table: 'transfusion_orders', column: 'verifying_nurse2_id', definition: 'VARCHAR(36)' },
  { table: 'transfusion_orders', column: 'verification_time', definition: 'DATETIME' },
  
  // TRANSFUSION_MONITORING_CHARTS
  { table: 'transfusion_monitoring_charts', column: 'blood_group', definition: 'VARCHAR(10)' },
  { table: 'transfusion_monitoring_charts', column: 'nurse_id', definition: 'VARCHAR(36)' },
  { table: 'transfusion_monitoring_charts', column: 'doctor_id', definition: 'VARCHAR(36)' },
  
  // PREOPERATIVE_ASSESSMENTS
  { table: 'preoperative_assessments', column: 'functional_capacity', definition: 'VARCHAR(50)' },
  { table: 'preoperative_assessments', column: 'exercise_tolerance', definition: 'TEXT' },
  { table: 'preoperative_assessments', column: 'vital_signs', definition: 'JSON' },
  { table: 'preoperative_assessments', column: 'lab_results', definition: 'JSON' },
  { table: 'preoperative_assessments', column: 'ecg_findings', definition: 'TEXT' },
  { table: 'preoperative_assessments', column: 'chest_xray_findings', definition: 'TEXT' },
  { table: 'preoperative_assessments', column: 'anesthesia_plan', definition: 'JSON' },
  { table: 'preoperative_assessments', column: 'medication_review', definition: 'JSON' },
  { table: 'preoperative_assessments', column: 'fasting_instructions', definition: 'JSON' },
  { table: 'preoperative_assessments', column: 'consent_status', definition: 'VARCHAR(50)' },
  { table: 'preoperative_assessments', column: 'assessed_by_name', definition: 'VARCHAR(200)' },
  
  // EXTERNAL_REVIEWS
  { table: 'external_reviews', column: 'pathology_results', definition: 'JSON' },
  { table: 'external_reviews', column: 'radiology_results', definition: 'JSON' },
  { table: 'external_reviews', column: 'lab_results', definition: 'JSON' },
  { table: 'external_reviews', column: 'medications', definition: 'JSON' },
  { table: 'external_reviews', column: 'clinical_notes', definition: 'TEXT' },
  { table: 'external_reviews', column: 'discharge_summary', definition: 'TEXT' },
  { table: 'external_reviews', column: 'follow_up_plan', definition: 'TEXT' },
  { table: 'external_reviews', column: 'attachments', definition: 'JSON' },
  { table: 'external_reviews', column: 'diagnoses', definition: 'JSON' },
  { table: 'external_reviews', column: 'surgeries', definition: 'JSON' },
];

// Column type modifications
const COLUMN_MODIFICATIONS = [
  { table: 'transfusion_monitoring_charts', column: 'start_time', newType: 'TIME' },
  { table: 'transfusion_monitoring_charts', column: 'end_time', newType: 'TIME' },
  { table: 'preoperative_assessments', column: 'bleeding_risk', newType: 'JSON' },
];

async function tryConnect(configs) {
  for (const config of configs) {
    try {
      console.log(`🔌 Trying to connect to ${config.name}...`);
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        ssl: config.ssl
      });
      console.log(`✅ Connected to ${config.name}!`);
      return { connection, config };
    } catch (err) {
      console.log(`  ❌ Failed: ${err.message}`);
    }
  }
  return null;
}

async function columnExists(connection, table, column) {
  try {
    const [rows] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column]
    );
    return rows.length > 0;
  } catch (err) {
    return false;
  }
}

async function tableExists(connection, table) {
  try {
    const [rows] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
      [table]
    );
    return rows.length > 0;
  } catch (err) {
    return false;
  }
}

async function runMigration() {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  MySQL Migration - Add Missing Columns');
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  
  // Try to connect
  const result = await tryConnect(dbConfigs);
  
  if (!result) {
    console.error('');
    console.error('❌ Could not connect to any database.');
    console.error('');
    console.error('Please check:');
    console.error('1. Your password is correct');
    console.error('2. Your IP is whitelisted in DigitalOcean');
    console.error('3. The database server is running');
    process.exit(1);
  }
  
  const { connection, config } = result;
  
  console.log('');
  console.log(`📊 Database: ${config.database}`);
  console.log('');
  
  let added = 0;
  let skipped = 0;
  let errors = 0;
  let modified = 0;
  
  // Add missing columns
  console.log('📝 Adding missing columns...');
  console.log('');
  
  for (const { table, column, definition } of COLUMNS_TO_ADD) {
    // Check if table exists
    if (!(await tableExists(connection, table))) {
      console.log(`  ⚠️  Table ${table} does not exist - skipping`);
      continue;
    }
    
    // Check if column already exists
    if (await columnExists(connection, table, column)) {
      skipped++;
      continue;
    }
    
    // Add the column
    try {
      await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`  ✅ Added ${table}.${column}`);
      added++;
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        skipped++;
      } else {
        console.log(`  ❌ Error adding ${table}.${column}: ${err.message}`);
        errors++;
      }
    }
  }
  
  // Modify column types
  console.log('');
  console.log('🔧 Modifying column types...');
  console.log('');
  
  for (const { table, column, newType } of COLUMN_MODIFICATIONS) {
    if (!(await tableExists(connection, table))) {
      continue;
    }
    
    if (!(await columnExists(connection, table, column))) {
      continue;
    }
    
    try {
      await connection.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${newType}`);
      console.log(`  ✅ Modified ${table}.${column} to ${newType}`);
      modified++;
    } catch (err) {
      console.log(`  ⚠️  Could not modify ${table}.${column}: ${err.message}`);
    }
  }
  
  // Summary
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Columns added:    ${added}`);
  console.log(`  Columns skipped:  ${skipped} (already exist)`);
  console.log(`  Columns modified: ${modified}`);
  console.log(`  Errors:           ${errors}`);
  console.log('═══════════════════════════════════════════════════');
  console.log('');
  
  await connection.end();
  console.log('🔌 Connection closed.');
  
  if (errors === 0) {
    console.log('');
    console.log('✅ Migration completed successfully!');
  } else {
    console.log('');
    console.log('⚠️  Migration completed with some errors.');
    process.exit(1);
  }
}

runMigration().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
