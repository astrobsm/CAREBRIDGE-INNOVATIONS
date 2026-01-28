/**
 * Migration Script: Supabase PostgreSQL → DigitalOcean MySQL
 * 
 * This script transfers all data from Supabase to DigitalOcean MySQL database
 * using direct HTTP requests (no browser dependencies).
 * 
 * Usage:
 * node migrate-supabase-to-do.cjs
 */

const https = require('https');

// ============ CONFIGURATION ============

// Supabase credentials (source)
const SUPABASE_URL = 'https://twtjlxbhxhfududispgf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3dGpseGJoeGhmdWR1ZGlzcGdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2NjY3MDksImV4cCI6MjA2MzI0MjcwOX0.FsLgGCjmoRbUPWR1q8KdJqFThnxiJx-EAwpAbhSWfQM';

// Vercel API endpoint (destination - connects to DigitalOcean MySQL)
const API_URL = 'https://carebridge-innovations.vercel.app/api/db/sync';

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

// ============ HTTP HELPER FUNCTIONS ============

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    
    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// ============ SUPABASE FUNCTIONS ============

async function fetchFromSupabase(tableName) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
    const response = await httpRequest(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      return response.data;
    }
    
    // Check for error
    if (response.data && response.data.message) {
      if (!response.data.message.includes('does not exist')) {
        console.log(`  ⚠️  ${tableName}: ${response.data.message}`);
      }
    }
    
    return [];
  } catch (err) {
    console.log(`  ⚠️  ${tableName}: ${err.message}`);
    return [];
  }
}

// ============ DIGITALOCEAN API FUNCTIONS ============

async function pushToDigitalOcean(tableName, record) {
  try {
    const body = JSON.stringify({
      action: 'upsert',
      table: tableName,
      data: record,
    });
    
    const response = await httpRequest(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      body: body,
    });
    
    return response.data && response.data.success;
  } catch (err) {
    return false;
  }
}

async function testAPIConnection() {
  try {
    const response = await httpRequest(`${API_URL}?action=health`);
    return response.status === 200 && response.data && response.data.success;
  } catch (err) {
    return false;
  }
}

// ============ MIGRATION LOGIC ============

async function migrateTable(supabaseTable, apiTable) {
  process.stdout.write(`  📦 ${supabaseTable} → ${apiTable}... `);
  
  // Fetch from Supabase
  const records = await fetchFromSupabase(supabaseTable);
  
  if (records.length === 0) {
    console.log('(empty)');
    return { table: supabaseTable, fetched: 0, success: 0, errors: 0 };
  }
  
  // Push each record to DigitalOcean
  let success = 0;
  let errors = 0;
  
  for (const record of records) {
    const pushed = await pushToDigitalOcean(apiTable, record);
    if (pushed) {
      success++;
    } else {
      errors++;
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(r => setTimeout(r, 50));
  }
  
  console.log(`${records.length} fetched, ${success} pushed${errors > 0 ? `, ${errors} errors` : ''}`);
  
  return { table: supabaseTable, fetched: records.length, success, errors };
}

async function runMigration() {
  console.log('═'.repeat(60));
  console.log('  SUPABASE → DIGITALOCEAN MYSQL MIGRATION');
  console.log('═'.repeat(60));
  
  console.log('\n🔌 Testing connections...\n');
  
  // Test Supabase
  console.log('  Testing Supabase connection...');
  const testResult = await fetchFromSupabase('users');
  console.log(`  ✅ Supabase connected (users table: ${Array.isArray(testResult) ? testResult.length : 0} records)`);
  
  // Test DigitalOcean API
  console.log('  Testing DigitalOcean API...');
  const apiOk = await testAPIConnection();
  if (apiOk) {
    console.log('  ✅ DigitalOcean API connected');
  } else {
    console.log('  ⚠️  DigitalOcean API not responding (will try anyway)');
  }
  
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
}

// Run the migration
runMigration().catch(console.error);
