/**
 * Migration Script: Supabase PostgreSQL → DigitalOcean MySQL
 * 
 * This script transfers all data from Supabase to DigitalOcean MySQL database
 * via the Vercel API endpoint (to bypass local firewall restrictions).
 * 
 * Usage:
 * node migrate-supabase-via-api.cjs
 */

const { createClient } = require('@supabase/supabase-js');

// ============ CONFIGURATION ============

// Supabase credentials (source)
const SUPABASE_URL = 'https://twtjlxbhxhfududispgf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dGpseGJoeGhmdWR1ZGlzcGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjY3MDksImV4cCI6MjA2MzI0MjcwOX0.FsLgGCjmoRbUPWR1q8KdJqFThnxiJx-EAwpAbhSWfQM';

// Vercel API endpoint (destination - connects to DigitalOcean MySQL)
const API_BASE_URL = 'https://carebridge-innovations.vercel.app/api/db/sync';

// Table mappings: Supabase table name → API table name
const TABLE_MAPPINGS = {
  'users': 'users',
  'hospitals': 'hospitals',
  'patients': 'patients',
  'vital_signs': 'vitalSigns',
  'clinical_encounters': 'clinicalEncounters',
  'surgeries': 'surgeries',
  'wounds': 'wounds',
  'burn_assessments': 'burnAssessments',
  'lab_requests': 'labRequests',
  'prescriptions': 'prescriptions',
  'nutrition_assessments': 'nutritionAssessments',
  'nutrition_plans': 'nutritionPlans',
  'invoices': 'invoices',
  'admissions': 'admissions',
  'admission_notes': 'admissionNotes',
  'bed_assignments': 'bedAssignments',
  'treatment_plans': 'treatmentPlans',
  'treatment_progress': 'treatmentProgress',
  'ward_rounds': 'wardRounds',
  'doctor_assignments': 'doctorAssignments',
  'nurse_assignments': 'nurseAssignments',
  'investigations': 'investigations',
  'chat_rooms': 'chatRooms',
  'chat_messages': 'chatMessages',
  'video_conferences': 'videoConferences',
  'enhanced_video_conferences': 'enhancedVideoConferences',
  'discharge_summaries': 'dischargeSummaries',
  'consumable_boms': 'consumableBOMs',
  'histopathology_requests': 'histopathologyRequests',
  'blood_transfusions': 'bloodTransfusions',
  'mdt_meetings': 'mdtMeetings',
  'limb_salvage_assessments': 'limbSalvageAssessments',
  'burn_monitoring_records': 'burnMonitoringRecords',
  'escharotomy_records': 'escharotomyRecords',
  'skin_graft_records': 'skinGraftRecords',
  'burn_care_plans': 'burnCarePlans',
  'appointments': 'appointments',
  'appointment_reminders': 'appointmentReminders',
  'appointment_slots': 'appointmentSlots',
  'clinic_sessions': 'clinicSessions',
  'npwt_sessions': 'npwtSessions',
  'npwt_notifications': 'npwtNotifications',
  'medication_charts': 'medicationCharts',
  'nurse_patient_assignments': 'nursePatientAssignments',
  'transfusion_orders': 'transfusionOrders',
  'transfusion_monitoring_charts': 'transfusionMonitoringCharts',
  'audit_logs': 'auditLogs',
  'sync_status': 'syncStatus',
  'staff_patient_assignments': 'staffPatientAssignments',
  'activity_billing_records': 'activityBillingRecords',
  'payroll_periods': 'payrollPeriods',
  'staff_payroll_records': 'staffPayrollRecords',
  'payslips': 'payslips',
  'post_operative_notes': 'postOperativeNotes',
  'preoperative_assessments': 'preoperativeAssessments',
  'external_reviews': 'externalReviews',
  'referrals': 'referrals',
  'patient_education_records': 'patientEducationRecords',
  'calculator_results': 'calculatorResults',
  'user_settings': 'userSettings',
  'hospital_settings': 'hospitalSettings',
};

// ============ MIGRATION LOGIC ============

let supabase;

async function init() {
  console.log('\n🔌 Initializing Supabase client...\n');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('✅ Supabase client initialized');
  
  // Test API connection
  console.log('🔌 Testing DigitalOcean API connection...');
  try {
    const response = await fetch(`${API_BASE_URL}?action=health`);
    const result = await response.json();
    if (result.success) {
      console.log('✅ DigitalOcean API connected');
    } else {
      throw new Error(result.error || 'API health check failed');
    }
  } catch (err) {
    console.log('⚠️  API health check failed:', err.message);
    console.log('   Continuing anyway - will try to push data...');
  }
}

async function fetchSupabaseTable(tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      // Don't log common errors for empty/non-existent tables
      if (!error.message.includes('does not exist')) {
        console.log(`  ⚠️  Error fetching ${tableName}: ${error.message}`);
      }
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.log(`  ⚠️  Exception fetching ${tableName}: ${err.message}`);
    return [];
  }
}

async function pushToAPI(tableName, records) {
  if (!records || records.length === 0) {
    return { success: 0, errors: 0 };
  }
  
  let success = 0;
  let errors = 0;
  
  // Push in batches of 10 to avoid timeout
  const batchSize = 10;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    for (const record of batch) {
      try {
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'upsert',
            table: tableName,
            data: record,
          }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          success++;
        } else {
          errors++;
          if (errors <= 3) {
            console.log(`    ❌ Error: ${result.error}`);
          }
        }
      } catch (err) {
        errors++;
        if (errors <= 3) {
          console.log(`    ❌ Network error: ${err.message}`);
        }
      }
    }
    
    // Small delay between batches
    if (i + batchSize < records.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return { success, errors };
}

async function migrateTable(supabaseTable, apiTable) {
  process.stdout.write(`  📦 ${supabaseTable} → ${apiTable}... `);
  
  // Fetch from Supabase
  const records = await fetchSupabaseTable(supabaseTable);
  
  if (records.length === 0) {
    console.log('(empty)');
    return { table: supabaseTable, fetched: 0, success: 0, errors: 0 };
  }
  
  // Push to API
  const { success, errors } = await pushToAPI(apiTable, records);
  
  console.log(`${records.length} fetched, ${success} pushed${errors > 0 ? `, ${errors} errors` : ''}`);
  
  return { table: supabaseTable, fetched: records.length, success, errors };
}

async function runMigration() {
  console.log('═'.repeat(60));
  console.log('  SUPABASE → DIGITALOCEAN MYSQL MIGRATION (via API)');
  console.log('═'.repeat(60));
  
  try {
    await init();
    
    console.log('\n📋 Starting data migration...\n');
    
    const results = [];
    let totalFetched = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    
    // Migrate each table
    for (const [supabaseTable, apiTable] of Object.entries(TABLE_MAPPINGS)) {
      const result = await migrateTable(supabaseTable, apiTable);
      results.push(result);
      totalFetched += result.fetched;
      totalSuccess += result.success;
      totalErrors += result.errors;
    }
    
    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('  MIGRATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  Tables processed: ${results.length}`);
    console.log(`  Total records fetched from Supabase: ${totalFetched}`);
    console.log(`  Total records pushed to DigitalOcean: ${totalSuccess}`);
    console.log(`  Total errors: ${totalErrors}`);
    
    // Show tables with data
    const tablesWithData = results.filter(r => r.fetched > 0);
    if (tablesWithData.length > 0) {
      console.log('\n  Tables with data:');
      tablesWithData.forEach(r => {
        console.log(`    • ${r.table}: ${r.fetched} records → ${r.success} pushed`);
      });
    } else {
      console.log('\n  ℹ️  No data found in Supabase tables');
    }
    
    console.log('\n✅ Migration complete!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
  }
}

// Run the migration
runMigration();
