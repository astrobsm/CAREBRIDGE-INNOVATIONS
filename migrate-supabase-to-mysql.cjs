/**
 * Migration Script: Supabase PostgreSQL → DigitalOcean MySQL
 * 
 * This script transfers all data from Supabase to DigitalOcean MySQL database.
 * 
 * Prerequisites:
 * - npm install @supabase/supabase-js mysql2
 * - Set environment variables or update credentials below
 * 
 * Usage:
 * node migrate-supabase-to-mysql.cjs
 */

const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// ============ CONFIGURATION ============

// Supabase credentials (source)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://twtjlxbhxhfududispgf.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dGpseGJoeGhmdWR1ZGlzcGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjY3MDksImV4cCI6MjA2MzI0MjcwOX0.FsLgGCjmoRbUPWR1q8KdJqFThnxiJx-EAwpAbhSWfQM';

// DigitalOcean MySQL credentials (destination)
const DO_DB_CONFIG = {
  host: process.env.DO_DB_HOST || 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
  port: parseInt(process.env.DO_DB_PORT || '25060'),
  user: process.env.DO_DB_USER || 'doadmin',
  password: process.env.DO_DB_PASSWORD,
  database: process.env.DO_DB_NAME || 'defaultdb',
  ssl: {
    ca: fs.readFileSync(path.join(__dirname, 'ca-certificate.crt')),
    rejectUnauthorized: true
  },
  connectTimeout: 30000,
};

// Table mappings: Supabase table name → MySQL table name
const TABLE_MAPPINGS = {
  'users': 'users',
  'hospitals': 'hospitals',
  'patients': 'patients',
  'vital_signs': 'vital_signs',
  'clinical_encounters': 'clinical_encounters',
  'surgeries': 'surgeries',
  'wounds': 'wounds',
  'burn_assessments': 'burn_assessments',
  'lab_requests': 'lab_requests',
  'prescriptions': 'prescriptions',
  'nutrition_assessments': 'nutrition_assessments',
  'nutrition_plans': 'nutrition_plans',
  'invoices': 'invoices',
  'admissions': 'admissions',
  'admission_notes': 'admission_notes',
  'bed_assignments': 'bed_assignments',
  'treatment_plans': 'treatment_plans',
  'treatment_progress': 'treatment_progress',
  'ward_rounds': 'ward_rounds',
  'doctor_assignments': 'doctor_assignments',
  'nurse_assignments': 'nurse_assignments',
  'investigations': 'investigations',
  'chat_rooms': 'chat_rooms',
  'chat_messages': 'chat_messages',
  'video_conferences': 'video_conferences',
  'enhanced_video_conferences': 'enhanced_video_conferences',
  'discharge_summaries': 'discharge_summaries',
  'consumable_boms': 'consumable_boms',
  'histopathology_requests': 'histopathology_requests',
  'blood_transfusions': 'blood_transfusions',
  'mdt_meetings': 'mdt_meetings',
  'limb_salvage_assessments': 'limb_salvage_assessments',
  'burn_monitoring_records': 'burn_monitoring_records',
  'escharotomy_records': 'escharotomy_records',
  'skin_graft_records': 'skin_graft_records',
  'burn_care_plans': 'burn_care_plans',
  'appointments': 'appointments',
  'appointment_reminders': 'appointment_reminders',
  'appointment_slots': 'appointment_slots',
  'clinic_sessions': 'clinic_sessions',
  'npwt_sessions': 'npwt_sessions',
  'npwt_notifications': 'npwt_notifications',
  'medication_charts': 'medication_charts',
  'nurse_patient_assignments': 'nurse_patient_assignments',
  'transfusion_orders': 'transfusion_orders',
  'transfusion_monitoring_charts': 'transfusion_monitoring_charts',
  'audit_logs': 'audit_logs',
  'sync_status': 'sync_status',
  'staff_patient_assignments': 'staff_patient_assignments',
  'activity_billing_records': 'activity_billing_records',
  'payroll_periods': 'payroll_periods',
  'staff_payroll_records': 'staff_payroll_records',
  'payslips': 'payslips',
  'post_operative_notes': 'post_operative_notes',
  'preoperative_assessments': 'preoperative_assessments',
  'external_reviews': 'external_reviews',
  'referrals': 'referrals',
  'patient_education_records': 'patient_education_records',
  'calculator_results': 'calculator_results',
  'user_settings': 'user_settings',
  'hospital_settings': 'hospital_settings',
};

// ============ MIGRATION LOGIC ============

let supabase;
let mysqlConnection;

async function initConnections() {
  console.log('\n🔌 Initializing connections...\n');
  
  // Initialize Supabase client
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
  
  // Initialize MySQL connection
  if (!DO_DB_CONFIG.password) {
    throw new Error('DO_DB_PASSWORD environment variable is required');
  }
  
  mysqlConnection = await mysql.createConnection(DO_DB_CONFIG);
  console.log('✅ MySQL connection established');
}

async function fetchSupabaseTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.log(`  ⚠️  Error fetching ${tableName}: ${error.message}`);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.log(`  ⚠️  Exception fetching ${tableName}: ${err.message}`);
    return [];
  }
}

function convertValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

async function insertIntoMySQL(tableName, records) {
  if (!records || records.length === 0) {
    return { inserted: 0, errors: 0 };
  }
  
  let inserted = 0;
  let errors = 0;
  
  for (const record of records) {
    try {
      const columns = Object.keys(record);
      const values = columns.map(col => convertValue(record[col]));
      
      // Build INSERT ... ON DUPLICATE KEY UPDATE query
      const placeholders = columns.map(() => '?').join(', ');
      const updateClauses = columns.map(col => `\`${col}\` = VALUES(\`${col}\`)`).join(', ');
      
      const query = `
        INSERT INTO \`${tableName}\` (${columns.map(c => `\`${c}\``).join(', ')})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClauses}
      `;
      
      await mysqlConnection.execute(query, values);
      inserted++;
    } catch (err) {
      errors++;
      if (errors <= 3) {
        console.log(`    ❌ Error inserting record: ${err.message}`);
      }
    }
  }
  
  return { inserted, errors };
}

async function migrateTable(supabaseTable, mysqlTable) {
  process.stdout.write(`  📦 ${supabaseTable} → ${mysqlTable}... `);
  
  // Fetch from Supabase
  const records = await fetchSupabaseTable(supabaseTable);
  
  if (records.length === 0) {
    console.log('(empty)');
    return { table: supabaseTable, fetched: 0, inserted: 0, errors: 0 };
  }
  
  // Insert into MySQL
  const { inserted, errors } = await insertIntoMySQL(mysqlTable, records);
  
  console.log(`${records.length} fetched, ${inserted} inserted${errors > 0 ? `, ${errors} errors` : ''}`);
  
  return { table: supabaseTable, fetched: records.length, inserted, errors };
}

async function runMigration() {
  console.log('═'.repeat(60));
  console.log('  SUPABASE → DIGITALOCEAN MYSQL MIGRATION');
  console.log('═'.repeat(60));
  
  try {
    await initConnections();
    
    console.log('\n📋 Starting data migration...\n');
    
    const results = [];
    let totalFetched = 0;
    let totalInserted = 0;
    let totalErrors = 0;
    
    // Migrate each table
    for (const [supabaseTable, mysqlTable] of Object.entries(TABLE_MAPPINGS)) {
      const result = await migrateTable(supabaseTable, mysqlTable);
      results.push(result);
      totalFetched += result.fetched;
      totalInserted += result.inserted;
      totalErrors += result.errors;
    }
    
    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('  MIGRATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  Tables processed: ${results.length}`);
    console.log(`  Total records fetched: ${totalFetched}`);
    console.log(`  Total records inserted: ${totalInserted}`);
    console.log(`  Total errors: ${totalErrors}`);
    
    // Show tables with data
    const tablesWithData = results.filter(r => r.fetched > 0);
    if (tablesWithData.length > 0) {
      console.log('\n  Tables with data:');
      tablesWithData.forEach(r => {
        console.log(`    • ${r.table}: ${r.fetched} records`);
      });
    }
    
    console.log('\n✅ Migration complete!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  } finally {
    if (mysqlConnection) {
      await mysqlConnection.end();
      console.log('🔌 MySQL connection closed');
    }
  }
}

// Run the migration
runMigration();
