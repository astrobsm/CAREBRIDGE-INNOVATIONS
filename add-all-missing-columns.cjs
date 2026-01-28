// Comprehensive column addition script for DigitalOcean MySQL
// Adds all missing columns identified from sync errors

const mysql = require('mysql2/promise');
const fs = require('fs');

const DB_CONFIG = {
  host: process.env.DO_DB_HOST || 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
  port: parseInt(process.env.DO_DB_PORT || '25060'),
  user: process.env.DO_DB_USER || 'doadmin',
  password: process.env.DO_DB_PASSWORD, // Set via DO_DB_PASSWORD environment variable
  database: process.env.DO_DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false }
};

// Define all columns to add for each table
const COLUMNS_TO_ADD = {
  users: [
    { name: 'avatar', type: 'TEXT' },
    { name: 'phone', type: 'VARCHAR(50)' },
    { name: 'specialization', type: 'VARCHAR(255)' },
    { name: 'license_number', type: 'VARCHAR(100)' },
    { name: 'department', type: 'VARCHAR(255)' },
    { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE' },
    { name: 'last_login', type: 'DATETIME' },
    { name: 'agreed_to_terms', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'agreed_at', type: 'DATETIME' }
  ],
  hospitals: [
    { name: 'bed_capacity', type: 'INT' },
    { name: 'logo', type: 'TEXT' },
    { name: 'website', type: 'VARCHAR(255)' },
    { name: 'license_number', type: 'VARCHAR(100)' },
    { name: 'accreditation', type: 'VARCHAR(255)' },
    { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE' },
    { name: 'settings', type: 'JSON' }
  ],
  patients: [
    { name: 'care_type', type: 'VARCHAR(50)' },
    { name: 'tribe', type: 'VARCHAR(100)' },
    { name: 'religion', type: 'VARCHAR(100)' },
    { name: 'occupation', type: 'VARCHAR(255)' },
    { name: 'marital_status', type: 'VARCHAR(50)' },
    { name: 'nationality', type: 'VARCHAR(100)' },
    { name: 'state_of_origin', type: 'VARCHAR(100)' },
    { name: 'lga', type: 'VARCHAR(100)' },
    { name: 'next_of_kin_name', type: 'VARCHAR(255)' },
    { name: 'next_of_kin_relationship', type: 'VARCHAR(100)' },
    { name: 'next_of_kin_phone', type: 'VARCHAR(50)' },
    { name: 'next_of_kin_address', type: 'TEXT' },
    { name: 'allergies', type: 'JSON' },
    { name: 'chronic_conditions', type: 'JSON' },
    { name: 'blood_group', type: 'VARCHAR(10)' },
    { name: 'genotype', type: 'VARCHAR(10)' },
    { name: 'rhesus_factor', type: 'VARCHAR(10)' },
    { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE' },
    { name: 'photo', type: 'TEXT' }
  ],
  vital_signs: [
    { name: 'pulse', type: 'INT' },
    { name: 'heart_rate', type: 'INT' },
    { name: 'respiratory_rate', type: 'INT' },
    { name: 'oxygen_saturation', type: 'DECIMAL(5,2)' },
    { name: 'systolic_bp', type: 'INT' },
    { name: 'diastolic_bp', type: 'INT' },
    { name: 'blood_pressure', type: 'VARCHAR(20)' },
    { name: 'temperature', type: 'DECIMAL(4,1)' },
    { name: 'weight', type: 'DECIMAL(5,2)' },
    { name: 'height', type: 'DECIMAL(5,2)' },
    { name: 'bmi', type: 'DECIMAL(5,2)' },
    { name: 'pain_score', type: 'INT' },
    { name: 'consciousness_level', type: 'VARCHAR(50)' },
    { name: 'urine_output', type: 'INT' },
    { name: 'blood_glucose', type: 'DECIMAL(5,2)' },
    { name: 'notes', type: 'TEXT' },
    { name: 'recorded_by', type: 'VARCHAR(255)' }
  ],
  clinical_encounters: [
    { name: 'treatment_plan', type: 'TEXT' },
    { name: 'chief_complaint', type: 'TEXT' },
    { name: 'history_of_present_illness', type: 'TEXT' },
    { name: 'past_medical_history', type: 'TEXT' },
    { name: 'family_history', type: 'TEXT' },
    { name: 'social_history', type: 'TEXT' },
    { name: 'review_of_systems', type: 'JSON' },
    { name: 'physical_examination', type: 'JSON' },
    { name: 'diagnosis', type: 'TEXT' },
    { name: 'differential_diagnosis', type: 'JSON' },
    { name: 'assessment', type: 'TEXT' },
    { name: 'plan', type: 'TEXT' },
    { name: 'follow_up_date', type: 'DATE' },
    { name: 'clinician_name', type: 'VARCHAR(255)' },
    { name: 'clinician_signature', type: 'TEXT' }
  ],
  surgeries: [
    { name: 'category', type: 'VARCHAR(100)' },
    { name: 'procedure_name', type: 'VARCHAR(255)' },
    { name: 'procedure_code', type: 'VARCHAR(50)' },
    { name: 'indication', type: 'TEXT' },
    { name: 'preoperative_diagnosis', type: 'TEXT' },
    { name: 'postoperative_diagnosis', type: 'TEXT' },
    { name: 'surgeon_name', type: 'VARCHAR(255)' },
    { name: 'assistant_surgeon', type: 'VARCHAR(255)' },
    { name: 'anesthetist', type: 'VARCHAR(255)' },
    { name: 'anesthesia_type', type: 'VARCHAR(100)' },
    { name: 'scrub_nurse', type: 'VARCHAR(255)' },
    { name: 'circulating_nurse', type: 'VARCHAR(255)' },
    { name: 'start_time', type: 'DATETIME' },
    { name: 'end_time', type: 'DATETIME' },
    { name: 'duration_minutes', type: 'INT' },
    { name: 'blood_loss_ml', type: 'INT' },
    { name: 'complications', type: 'TEXT' },
    { name: 'specimens', type: 'JSON' },
    { name: 'implants', type: 'JSON' },
    { name: 'operative_notes', type: 'TEXT' },
    { name: 'postoperative_instructions', type: 'TEXT' }
  ],
  admissions: [
    { name: 'allergies', type: 'JSON' },
    { name: 'admission_type', type: 'VARCHAR(100)' },
    { name: 'admitting_diagnosis', type: 'TEXT' },
    { name: 'admitting_doctor', type: 'VARCHAR(255)' },
    { name: 'ward', type: 'VARCHAR(100)' },
    { name: 'bed_number', type: 'VARCHAR(50)' },
    { name: 'expected_los_days', type: 'INT' },
    { name: 'diet_instructions', type: 'TEXT' },
    { name: 'activity_level', type: 'VARCHAR(100)' },
    { name: 'isolation_precautions', type: 'VARCHAR(100)' },
    { name: 'discharge_date', type: 'DATETIME' },
    { name: 'discharge_diagnosis', type: 'TEXT' },
    { name: 'discharge_disposition', type: 'VARCHAR(100)' },
    { name: 'discharge_instructions', type: 'TEXT' }
  ],
  wounds: [
    { name: 'length', type: 'DECIMAL(10,2)' },
    { name: 'width', type: 'DECIMAL(10,2)' },
    { name: 'depth', type: 'DECIMAL(10,2)' },
    { name: 'area', type: 'DECIMAL(10,2)' },
    { name: 'volume', type: 'DECIMAL(10,2)' },
    { name: 'wound_type', type: 'VARCHAR(100)' },
    { name: 'wound_location', type: 'VARCHAR(255)' },
    { name: 'wound_stage', type: 'VARCHAR(50)' },
    { name: 'wound_bed_description', type: 'TEXT' },
    { name: 'exudate_type', type: 'VARCHAR(100)' },
    { name: 'exudate_amount', type: 'VARCHAR(50)' },
    { name: 'periwound_condition', type: 'TEXT' },
    { name: 'odor', type: 'VARCHAR(50)' },
    { name: 'pain_level', type: 'INT' },
    { name: 'infection_signs', type: 'JSON' },
    { name: 'photos', type: 'JSON' },
    { name: 'treatment_notes', type: 'TEXT' },
    { name: 'dressing_type', type: 'VARCHAR(255)' },
    { name: 'next_assessment_date', type: 'DATE' }
  ],
  lab_requests: [
    { name: 'tests', type: 'JSON' },
    { name: 'test_type', type: 'VARCHAR(100)' },
    { name: 'priority', type: 'VARCHAR(50)' },
    { name: 'clinical_notes', type: 'TEXT' },
    { name: 'fasting_required', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'specimen_type', type: 'VARCHAR(100)' },
    { name: 'specimen_collected_at', type: 'DATETIME' },
    { name: 'specimen_collected_by', type: 'VARCHAR(255)' },
    { name: 'results', type: 'JSON' },
    { name: 'result_date', type: 'DATETIME' },
    { name: 'result_notes', type: 'TEXT' },
    { name: 'abnormal_flags', type: 'JSON' },
    { name: 'reviewed_by', type: 'VARCHAR(255)' },
    { name: 'reviewed_at', type: 'DATETIME' }
  ],
  investigations: [
    { name: 'hospital_number', type: 'VARCHAR(100)' },
    { name: 'investigation_type', type: 'VARCHAR(100)' },
    { name: 'investigation_name', type: 'VARCHAR(255)' },
    { name: 'indication', type: 'TEXT' },
    { name: 'priority', type: 'VARCHAR(50)' },
    { name: 'scheduled_date', type: 'DATETIME' },
    { name: 'performed_date', type: 'DATETIME' },
    { name: 'performed_by', type: 'VARCHAR(255)' },
    { name: 'findings', type: 'TEXT' },
    { name: 'conclusion', type: 'TEXT' },
    { name: 'recommendations', type: 'TEXT' },
    { name: 'images', type: 'JSON' },
    { name: 'report_url', type: 'TEXT' }
  ],
  prescriptions: [
    { name: 'medications', type: 'JSON' },
    { name: 'prescription_type', type: 'VARCHAR(50)' },
    { name: 'prescriber_name', type: 'VARCHAR(255)' },
    { name: 'prescriber_designation', type: 'VARCHAR(100)' },
    { name: 'prescriber_license', type: 'VARCHAR(100)' },
    { name: 'pharmacy_notes', type: 'TEXT' },
    { name: 'dispensed_at', type: 'DATETIME' },
    { name: 'dispensed_by', type: 'VARCHAR(255)' },
    { name: 'is_controlled', type: 'BOOLEAN DEFAULT FALSE' }
  ],
  medication_charts: [
    { name: 'reviewed_at', type: 'DATETIME' },
    { name: 'reviewed_by', type: 'VARCHAR(255)' },
    { name: 'medication_name', type: 'VARCHAR(255)' },
    { name: 'dose', type: 'VARCHAR(100)' },
    { name: 'route', type: 'VARCHAR(50)' },
    { name: 'frequency', type: 'VARCHAR(100)' },
    { name: 'start_date', type: 'DATE' },
    { name: 'end_date', type: 'DATE' },
    { name: 'administrations', type: 'JSON' },
    { name: 'special_instructions', type: 'TEXT' },
    { name: 'prn_reason', type: 'TEXT' },
    { name: 'is_discontinued', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'discontinued_reason', type: 'TEXT' },
    { name: 'discontinued_at', type: 'DATETIME' },
    { name: 'discontinued_by', type: 'VARCHAR(255)' }
  ],
  treatment_plans: [
    { name: 'title', type: 'VARCHAR(255)' },
    { name: 'description', type: 'TEXT' },
    { name: 'goals', type: 'JSON' },
    { name: 'interventions', type: 'JSON' },
    { name: 'medications', type: 'JSON' },
    { name: 'therapies', type: 'JSON' },
    { name: 'diet_plan', type: 'TEXT' },
    { name: 'activity_restrictions', type: 'TEXT' },
    { name: 'monitoring_parameters', type: 'JSON' },
    { name: 'follow_up_schedule', type: 'JSON' },
    { name: 'estimated_duration', type: 'VARCHAR(100)' },
    { name: 'physician_name', type: 'VARCHAR(255)' },
    { name: 'physician_signature', type: 'TEXT' },
    { name: 'patient_consent', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'consent_date', type: 'DATETIME' }
  ],
  treatment_progress: [
    { name: 'observations', type: 'TEXT' },
    { name: 'progress_notes', type: 'TEXT' },
    { name: 'vital_signs', type: 'JSON' },
    { name: 'pain_assessment', type: 'JSON' },
    { name: 'medications_given', type: 'JSON' },
    { name: 'treatments_performed', type: 'JSON' },
    { name: 'patient_response', type: 'TEXT' },
    { name: 'complications', type: 'TEXT' },
    { name: 'next_steps', type: 'TEXT' },
    { name: 'recorded_by', type: 'VARCHAR(255)' }
  ],
  appointments: [
    { name: 'seen_at', type: 'DATETIME' },
    { name: 'appointment_type', type: 'VARCHAR(100)' },
    { name: 'purpose', type: 'VARCHAR(255)' },
    { name: 'duration_minutes', type: 'INT' },
    { name: 'provider_name', type: 'VARCHAR(255)' },
    { name: 'provider_type', type: 'VARCHAR(100)' },
    { name: 'location', type: 'VARCHAR(255)' },
    { name: 'room', type: 'VARCHAR(50)' },
    { name: 'check_in_time', type: 'DATETIME' },
    { name: 'check_out_time', type: 'DATETIME' },
    { name: 'cancellation_reason', type: 'TEXT' },
    { name: 'rescheduled_from', type: 'VARCHAR(36)' },
    { name: 'reminder_sent', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'visit_notes', type: 'TEXT' }
  ],
  invoices: [
    { name: 'discount', type: 'DECIMAL(10,2) DEFAULT 0' },
    { name: 'discount_reason', type: 'TEXT' },
    { name: 'discount_approved_by', type: 'VARCHAR(255)' },
    { name: 'tax_amount', type: 'DECIMAL(10,2) DEFAULT 0' },
    { name: 'subtotal', type: 'DECIMAL(12,2)' },
    { name: 'total_amount', type: 'DECIMAL(12,2)' },
    { name: 'amount_paid', type: 'DECIMAL(12,2) DEFAULT 0' },
    { name: 'balance_due', type: 'DECIMAL(12,2)' },
    { name: 'payment_method', type: 'VARCHAR(50)' },
    { name: 'payment_reference', type: 'VARCHAR(255)' },
    { name: 'payment_date', type: 'DATETIME' },
    { name: 'due_date', type: 'DATE' },
    { name: 'items', type: 'JSON' },
    { name: 'billing_address', type: 'TEXT' },
    { name: 'insurance_claim_number', type: 'VARCHAR(100)' },
    { name: 'insurance_approved_amount', type: 'DECIMAL(12,2)' },
    { name: 'cashier_name', type: 'VARCHAR(255)' },
    { name: 'receipt_number', type: 'VARCHAR(100)' }
  ],
  video_conferences: [
    { name: 'participants', type: 'JSON' },
    { name: 'title', type: 'VARCHAR(255)' },
    { name: 'description', type: 'TEXT' },
    { name: 'scheduled_start', type: 'DATETIME' },
    { name: 'scheduled_end', type: 'DATETIME' },
    { name: 'actual_start', type: 'DATETIME' },
    { name: 'actual_end', type: 'DATETIME' },
    { name: 'host_id', type: 'VARCHAR(36)' },
    { name: 'host_name', type: 'VARCHAR(255)' },
    { name: 'room_id', type: 'VARCHAR(100)' },
    { name: 'meeting_link', type: 'TEXT' },
    { name: 'recording_url', type: 'TEXT' },
    { name: 'notes', type: 'TEXT' },
    { name: 'meeting_type', type: 'VARCHAR(50)' }
  ],
  preoperative_assessments: [
    { name: 'hospital_number', type: 'VARCHAR(100)' },
    { name: 'patient_name', type: 'VARCHAR(255)' },
    { name: 'age', type: 'INT' },
    { name: 'sex', type: 'VARCHAR(20)' },
    { name: 'weight', type: 'DECIMAL(5,2)' },
    { name: 'height', type: 'DECIMAL(5,2)' },
    { name: 'bmi', type: 'DECIMAL(5,2)' },
    { name: 'asa_class', type: 'VARCHAR(10)' },
    { name: 'planned_procedure', type: 'VARCHAR(255)' },
    { name: 'medical_history', type: 'JSON' },
    { name: 'surgical_history', type: 'JSON' },
    { name: 'allergies', type: 'JSON' },
    { name: 'current_medications', type: 'JSON' },
    { name: 'airway_assessment', type: 'JSON' },
    { name: 'cardiovascular_assessment', type: 'JSON' },
    { name: 'respiratory_assessment', type: 'JSON' },
    { name: 'laboratory_results', type: 'JSON' },
    { name: 'ecg_findings', type: 'TEXT' },
    { name: 'chest_xray_findings', type: 'TEXT' },
    { name: 'anesthetic_plan', type: 'TEXT' },
    { name: 'risk_assessment', type: 'JSON' },
    { name: 'consent_obtained', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'fasting_instructions', type: 'TEXT' },
    { name: 'preoperative_orders', type: 'JSON' },
    { name: 'assessor_name', type: 'VARCHAR(255)' },
    { name: 'assessor_designation', type: 'VARCHAR(100)' }
  ],
  external_reviews: [
    { name: 'diagnoses', type: 'JSON' },
    { name: 'patient_name', type: 'VARCHAR(255)' },
    { name: 'hospital_number', type: 'VARCHAR(100)' },
    { name: 'referring_hospital', type: 'VARCHAR(255)' },
    { name: 'referring_doctor', type: 'VARCHAR(255)' },
    { name: 'reason_for_referral', type: 'TEXT' },
    { name: 'clinical_summary', type: 'TEXT' },
    { name: 'investigations', type: 'JSON' },
    { name: 'current_treatment', type: 'TEXT' },
    { name: 'recommendations', type: 'TEXT' },
    { name: 'reviewer_name', type: 'VARCHAR(255)' },
    { name: 'reviewer_designation', type: 'VARCHAR(100)' },
    { name: 'review_date', type: 'DATETIME' },
    { name: 'follow_up_plan', type: 'TEXT' },
    { name: 'attachments', type: 'JSON' }
  ],
  appointment_reminders: [
    { name: 'delivered_at', type: 'DATETIME' },
    { name: 'reminder_type', type: 'VARCHAR(50)' },
    { name: 'channel', type: 'VARCHAR(50)' },
    { name: 'message', type: 'TEXT' },
    { name: 'recipient_phone', type: 'VARCHAR(50)' },
    { name: 'recipient_email', type: 'VARCHAR(255)' },
    { name: 'scheduled_for', type: 'DATETIME' },
    { name: 'sent_at', type: 'DATETIME' },
    { name: 'delivery_status', type: 'VARCHAR(50)' },
    { name: 'failure_reason', type: 'TEXT' },
    { name: 'retry_count', type: 'INT DEFAULT 0' }
  ],
  transfusion_orders: [
    { name: 'orderer_designation', type: 'VARCHAR(100)' },
    { name: 'orderer_name', type: 'VARCHAR(255)' },
    { name: 'patient_name', type: 'VARCHAR(255)' },
    { name: 'hospital_number', type: 'VARCHAR(100)' },
    { name: 'blood_type', type: 'VARCHAR(10)' },
    { name: 'rhesus', type: 'VARCHAR(10)' },
    { name: 'product_type', type: 'VARCHAR(100)' },
    { name: 'units_ordered', type: 'INT' },
    { name: 'indication', type: 'TEXT' },
    { name: 'urgency', type: 'VARCHAR(50)' },
    { name: 'special_requirements', type: 'TEXT' },
    { name: 'crossmatch_status', type: 'VARCHAR(50)' },
    { name: 'blood_bank_notes', type: 'TEXT' },
    { name: 'consent_obtained', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'consent_date', type: 'DATETIME' }
  ],
  transfusion_monitoring_charts: [
    { name: 'chart_id', type: 'VARCHAR(36)' },
    { name: 'transfusion_order_id', type: 'VARCHAR(36)' },
    { name: 'unit_number', type: 'VARCHAR(100)' },
    { name: 'start_time', type: 'DATETIME' },
    { name: 'end_time', type: 'DATETIME' },
    { name: 'pre_vitals', type: 'JSON' },
    { name: 'intra_vitals', type: 'JSON' },
    { name: 'post_vitals', type: 'JSON' },
    { name: 'reactions', type: 'JSON' },
    { name: 'reaction_management', type: 'TEXT' },
    { name: 'transfusion_completed', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'volume_transfused', type: 'INT' },
    { name: 'nurse_name', type: 'VARCHAR(255)' },
    { name: 'verifying_nurse', type: 'VARCHAR(255)' },
    { name: 'notes', type: 'TEXT' }
  ]
};

async function getExistingColumns(connection, tableName) {
  try {
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      ['defaultdb', tableName]
    );
    return columns.map(col => col.COLUMN_NAME.toLowerCase());
  } catch (error) {
    console.error(`  Error getting columns for ${tableName}:`, error.message);
    return [];
  }
}

async function addMissingColumns() {
  console.log('Connecting to DigitalOcean MySQL...');
  const connection = await mysql.createConnection(DB_CONFIG);
  console.log('Connected!\n');

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const [tableName, columns] of Object.entries(COLUMNS_TO_ADD)) {
    console.log(`\n=== Processing table: ${tableName} ===`);
    
    // Check if table exists
    try {
      const [tables] = await connection.query(
        `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        ['defaultdb', tableName]
      );
      
      if (tables.length === 0) {
        console.log(`  Table ${tableName} does not exist, skipping...`);
        continue;
      }
    } catch (error) {
      console.error(`  Error checking table ${tableName}:`, error.message);
      continue;
    }

    const existingColumns = await getExistingColumns(connection, tableName);
    console.log(`  Existing columns: ${existingColumns.length}`);

    for (const column of columns) {
      const columnNameLower = column.name.toLowerCase();
      
      if (existingColumns.includes(columnNameLower)) {
        console.log(`  ✓ Column ${column.name} already exists`);
        totalSkipped++;
        continue;
      }

      try {
        const sql = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${column.name}\` ${column.type} NULL`;
        await connection.query(sql);
        console.log(`  ✓ Added column ${column.name}`);
        totalAdded++;
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`  ✓ Column ${column.name} already exists (duplicate)`);
          totalSkipped++;
        } else {
          console.error(`  ✗ Error adding ${column.name}: ${error.message}`);
          totalErrors++;
        }
      }
    }
  }

  console.log('\n========================================');
  console.log('SUMMARY');
  console.log('========================================');
  console.log(`Columns added: ${totalAdded}`);
  console.log(`Columns skipped (already exist): ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);
  console.log('========================================\n');

  await connection.end();
  console.log('Connection closed.');
}

addMissingColumns().catch(console.error);
