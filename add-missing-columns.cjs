// Script to add missing columns to existing tables in DigitalOcean MySQL
const mysql = require('mysql2/promise');

// Define all missing columns by table
const MISSING_COLUMNS = {
  users: [
    { name: 'first_name', definition: 'VARCHAR(100)' },
    { name: 'last_name', definition: 'VARCHAR(100)' },
    { name: 'phone', definition: 'VARCHAR(50)' },
    { name: 'license_number', definition: 'VARCHAR(100)' },
    { name: 'specialty', definition: 'VARCHAR(100)' },
    { name: 'department', definition: 'VARCHAR(100)' },
    { name: 'profile_image', definition: 'TEXT' },
    { name: 'agreement_accepted', definition: 'BOOLEAN DEFAULT false' },
    { name: 'agreement_accepted_at', definition: 'TIMESTAMP NULL' },
    { name: 'last_login', definition: 'TIMESTAMP NULL' },
  ],
  hospitals: [
    { name: 'type', definition: "VARCHAR(50) DEFAULT 'general'" },
    { name: 'website', definition: 'VARCHAR(255)' },
    { name: 'license_number', definition: 'VARCHAR(100)' },
    { name: 'logo', definition: 'TEXT' },
    { name: 'settings', definition: 'JSON' },
    { name: 'subscription_tier', definition: "VARCHAR(50) DEFAULT 'basic'" },
    { name: 'subscription_expires_at', definition: 'TIMESTAMP NULL' },
  ],
  patients: [
    { name: 'ward', definition: 'VARCHAR(100)' },
    { name: 'bed_number', definition: 'VARCHAR(50)' },
    { name: 'admission_status', definition: "VARCHAR(50) DEFAULT 'outpatient'" },
    { name: 'risk_factors', definition: 'JSON' },
    { name: 'dvt_risk_score', definition: 'INT' },
    { name: 'waterlow_score', definition: 'INT' },
    { name: 'must_score', definition: 'INT' },
    { name: 'profile_image', definition: 'TEXT' },
  ],
  vital_signs: [
    { name: 'encounter_id', definition: 'VARCHAR(36)' },
    { name: 'admission_id', definition: 'VARCHAR(36)' },
    { name: 'recorded_by', definition: 'VARCHAR(36)' },
    { name: 'oxygen_flow_rate', definition: 'DECIMAL(5,1)' },
    { name: 'oxygen_delivery', definition: 'VARCHAR(50)' },
    { name: 'fio2', definition: 'DECIMAL(3,2)' },
    { name: 'urine_output', definition: 'INT' },
    { name: 'gcs_score', definition: 'INT' },
    { name: 'gcs_components', definition: 'JSON' },
    { name: 'avpu', definition: 'VARCHAR(10)' },
  ],
  clinical_encounters: [
    { name: 'type', definition: 'VARCHAR(100)' },
    { name: 'encounter_type', definition: 'VARCHAR(100)' },
    { name: 'admission_id', definition: 'VARCHAR(36)' },
    { name: 'status', definition: "VARCHAR(50) DEFAULT 'in_progress'" },
    { name: 'attending_clinician', definition: 'VARCHAR(36)' },
    { name: 'chief_complaint', definition: 'TEXT' },
    { name: 'history_of_present_illness', definition: 'TEXT' },
    { name: 'past_medical_history', definition: 'JSON' },
    { name: 'medications', definition: 'JSON' },
    { name: 'allergies', definition: 'JSON' },
    { name: 'review_of_systems', definition: 'JSON' },
    { name: 'physical_examination', definition: 'JSON' },
    { name: 'diagnosis', definition: 'JSON' },
    { name: 'differential_diagnosis', definition: 'JSON' },
    { name: 'plan', definition: 'TEXT' },
    { name: 'disposition', definition: 'VARCHAR(50)' },
    { name: 'follow_up_date', definition: 'DATE' },
    { name: 'notes', definition: 'TEXT' },
  ],
  surgeries: [
    { name: 'type', definition: 'VARCHAR(100)' },
    { name: 'surgery_type', definition: 'VARCHAR(100)' },
    { name: 'encounter_id', definition: 'VARCHAR(36)' },
    { name: 'admission_id', definition: 'VARCHAR(36)' },
    { name: 'status', definition: "VARCHAR(50) DEFAULT 'scheduled'" },
    { name: 'priority', definition: "VARCHAR(50) DEFAULT 'routine'" },
    { name: 'scheduled_date', definition: 'TIMESTAMP NULL' },
    { name: 'actual_start', definition: 'TIMESTAMP NULL' },
    { name: 'actual_end', definition: 'TIMESTAMP NULL' },
    { name: 'surgeon', definition: 'VARCHAR(36)' },
    { name: 'assistant_surgeon', definition: 'VARCHAR(36)' },
    { name: 'anesthesiologist', definition: 'VARCHAR(36)' },
    { name: 'scrub_nurse', definition: 'VARCHAR(36)' },
    { name: 'circulating_nurse', definition: 'VARCHAR(36)' },
    { name: 'anesthesia_type', definition: 'VARCHAR(100)' },
    { name: 'procedure_name', definition: 'TEXT' },
    { name: 'procedure_code', definition: 'VARCHAR(50)' },
    { name: 'preop_diagnosis', definition: 'TEXT' },
    { name: 'postop_diagnosis', definition: 'TEXT' },
    { name: 'findings', definition: 'TEXT' },
    { name: 'complications', definition: 'TEXT' },
    { name: 'estimated_blood_loss', definition: 'INT' },
    { name: 'specimens', definition: 'JSON' },
    { name: 'implants', definition: 'JSON' },
    { name: 'notes', definition: 'TEXT' },
  ],
  admissions: [
    { name: 'severity', definition: 'VARCHAR(50)' },
    { name: 'admission_type', definition: 'VARCHAR(100)' },
    { name: 'admission_source', definition: 'VARCHAR(100)' },
    { name: 'attending_doctor', definition: 'VARCHAR(36)' },
    { name: 'primary_doctor', definition: 'VARCHAR(36)' },
    { name: 'primary_nurse', definition: 'VARCHAR(36)' },
    { name: 'admission_diagnosis', definition: 'TEXT' },
    { name: 'reason_for_admission', definition: 'TEXT' },
    { name: 'expected_los', definition: 'INT' },
    { name: 'actual_los', definition: 'INT' },
    { name: 'discharge_disposition', definition: 'VARCHAR(100)' },
    { name: 'discharge_date', definition: 'TIMESTAMP NULL' },
    { name: 'discharged_by', definition: 'VARCHAR(36)' },
  ],
  wounds: [
    { name: 'encounter_id', definition: 'VARCHAR(36)' },
    { name: 'admission_id', definition: 'VARCHAR(36)' },
    { name: 'type', definition: 'VARCHAR(100)' },
    { name: 'wound_type', definition: 'VARCHAR(100)' },
    { name: 'location', definition: 'VARCHAR(200)' },
    { name: 'side', definition: 'VARCHAR(20)' },
    { name: 'etiology', definition: 'VARCHAR(100)' },
    { name: 'onset_date', definition: 'DATE' },
    { name: 'length_cm', definition: 'DECIMAL(6,2)' },
    { name: 'width_cm', definition: 'DECIMAL(6,2)' },
    { name: 'depth_cm', definition: 'DECIMAL(6,2)' },
    { name: 'area_cm2', definition: 'DECIMAL(10,2)' },
    { name: 'wound_bed', definition: 'JSON' },
    { name: 'exudate', definition: 'JSON' },
    { name: 'edges', definition: 'JSON' },
    { name: 'periwound', definition: 'JSON' },
    { name: 'pain_score', definition: 'INT' },
    { name: 'odor', definition: 'VARCHAR(50)' },
    { name: 'infection_signs', definition: 'JSON' },
    { name: 'healing_stage', definition: 'VARCHAR(50)' },
    { name: 'treatment_plan', definition: 'TEXT' },
    { name: 'photos', definition: 'JSON' },
    { name: 'status', definition: "VARCHAR(50) DEFAULT 'active'" },
  ],
  lab_requests: [
    { name: 'encounter_id', definition: 'VARCHAR(36)' },
    { name: 'admission_id', definition: 'VARCHAR(36)' },
    { name: 'requested_by', definition: 'VARCHAR(36)' },
    { name: 'tests_requested', definition: 'JSON' },
    { name: 'clinical_info', definition: 'TEXT' },
    { name: 'urgency', definition: "VARCHAR(50) DEFAULT 'routine'" },
    { name: 'fasting_required', definition: 'BOOLEAN DEFAULT false' },
    { name: 'specimen_type', definition: 'VARCHAR(100)' },
    { name: 'specimen_collected_at', definition: 'TIMESTAMP NULL' },
    { name: 'collected_by', definition: 'VARCHAR(36)' },
    { name: 'status', definition: "VARCHAR(50) DEFAULT 'pending'" },
    { name: 'results', definition: 'JSON' },
    { name: 'result_date', definition: 'TIMESTAMP NULL' },
    { name: 'reported_by', definition: 'VARCHAR(36)' },
    { name: 'notes', definition: 'TEXT' },
    { name: 'requested_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
  ],
  investigations: [
    { name: 'patient_name', definition: 'VARCHAR(200)' },
    { name: 'encounter_id', definition: 'VARCHAR(36)' },
    { name: 'admission_id', definition: 'VARCHAR(36)' },
    { name: 'type', definition: 'VARCHAR(100)' },
    { name: 'investigation_type', definition: 'VARCHAR(100)' },
    { name: 'category', definition: 'VARCHAR(100)' },
    { name: 'requested_by', definition: 'VARCHAR(36)' },
    { name: 'clinical_indication', definition: 'TEXT' },
    { name: 'status', definition: "VARCHAR(50) DEFAULT 'pending'" },
    { name: 'scheduled_date', definition: 'TIMESTAMP NULL' },
    { name: 'performed_date', definition: 'TIMESTAMP NULL' },
    { name: 'performed_by', definition: 'VARCHAR(36)' },
    { name: 'findings', definition: 'TEXT' },
    { name: 'impression', definition: 'TEXT' },
    { name: 'images', definition: 'JSON' },
    { name: 'report_url', definition: 'TEXT' },
    { name: 'notes', definition: 'TEXT' },
    { name: 'requested_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP' },
  ],
  prescriptions: [
    { name: 'diagnosis', definition: 'TEXT' },
  ],
  medication_charts: [
    { name: 'allergies', definition: 'JSON' },
    { name: 'shift_type', definition: 'VARCHAR(20)' },
    { name: 'assigned_nurse_id', definition: 'VARCHAR(36)' },
    { name: 'is_completed', definition: 'BOOLEAN DEFAULT false' },
    { name: 'completed_at', definition: 'TIMESTAMP NULL' },
    { name: 'completed_by', definition: 'VARCHAR(36)' },
  ],
  treatment_plans: [
    { name: 'related_entity_id', definition: 'VARCHAR(36)' },
    { name: 'related_entity_type', definition: 'VARCHAR(50)' },
  ],
  treatment_progress: [
    { name: 'date', definition: 'DATE' },
  ],
  appointments: [
    { name: 'type', definition: 'VARCHAR(100)' },
    { name: 'appointment_number', definition: 'VARCHAR(100)' },
    { name: 'clinician_id', definition: 'VARCHAR(36)' },
    { name: 'booked_by', definition: 'VARCHAR(36)' },
  ],
  invoices: [
    { name: 'items', definition: 'JSON' },
  ],
  video_conferences: [
    { name: 'host_name', definition: 'VARCHAR(200)' },
    { name: 'patient_id', definition: 'VARCHAR(36)' },
  ],
  preoperative_assessments: [
    { name: 'patient_name', definition: 'VARCHAR(200)' },
    { name: 'surgery_name', definition: 'VARCHAR(200)' },
    { name: 'surgery_type', definition: 'VARCHAR(100)' },
    { name: 'scheduled_date', definition: 'TIMESTAMP NULL' },
    { name: 'status', definition: "VARCHAR(50) DEFAULT 'pending'" },
    { name: 'clearance_status', definition: 'VARCHAR(50)' },
  ],
  external_reviews: [
    { name: 'folder_number', definition: 'VARCHAR(100)' },
    { name: 'service_date', definition: 'TIMESTAMP NULL' },
    { name: 'created_by', definition: 'VARCHAR(36)' },
  ],
};

async function addMissingColumns() {
  console.log('🔄 Connecting to DigitalOcean MySQL...');
  
  const connection = await mysql.createConnection({
    host: process.env.DO_DB_HOST || 'localhost',
    port: parseInt(process.env.DO_DB_PORT || '25060'),
    user: process.env.DO_DB_USER || 'doadmin',
    password: process.env.DO_DB_PASSWORD,
    database: process.env.DO_DB_NAME || 'defaultdb',
    ssl: {
      rejectUnauthorized: false
    },
  });

  console.log('✅ Connected!\n');

  let added = 0;
  let skipped = 0;
  let errors = [];

  for (const [table, columns] of Object.entries(MISSING_COLUMNS)) {
    console.log(`\n📋 Processing table: ${table}`);
    
    // Get existing columns for this table
    let existingColumns = [];
    try {
      const [rows] = await connection.query(`DESCRIBE ${table}`);
      existingColumns = rows.map(r => r.Field.toLowerCase());
    } catch (err) {
      console.log(`  ⚠️ Table ${table} doesn't exist, skipping...`);
      continue;
    }

    for (const col of columns) {
      if (existingColumns.includes(col.name.toLowerCase())) {
        // console.log(`  ⚡ Column exists: ${col.name}`);
        skipped++;
        continue;
      }

      try {
        const query = `ALTER TABLE ${table} ADD COLUMN ${col.name} ${col.definition}`;
        await connection.query(query);
        console.log(`  ✓ Added column: ${col.name}`);
        added++;
      } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
          skipped++;
        } else {
          console.log(`  ✗ Error adding ${col.name}: ${err.message}`);
          errors.push({ table, column: col.name, error: err.message });
        }
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✓ Added: ${added} columns`);
  console.log(`   ⚡ Skipped (already exist): ${skipped} columns`);
  if (errors.length > 0) {
    console.log(`   ✗ Errors: ${errors.length}`);
    errors.forEach(e => console.log(`      - ${e.table}.${e.column}: ${e.error}`));
  }

  await connection.end();
  console.log('\n✅ Migration complete!');
}

addMissingColumns().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
