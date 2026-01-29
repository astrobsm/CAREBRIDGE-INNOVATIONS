/**
 * Auto-Sync MySQL Schema Script
 * 
 * This script automatically detects missing columns in MySQL tables
 * by comparing with the IndexedDB/Dexie schema and adds them.
 * 
 * Run with: 
 *   $env:DO_DB_PASSWORD="your_password"; node auto-sync-mysql-schema.cjs
 */

const mysql = require('mysql2/promise');

// Check for required password
if (!process.env.DO_DB_PASSWORD) {
  console.error('❌ Error: DO_DB_PASSWORD environment variable is required');
  console.error('');
  console.error('Usage:');
  console.error('  PowerShell: $env:DO_DB_PASSWORD="your_db_password"; node auto-sync-mysql-schema.cjs');
  console.error('  Bash: DO_DB_PASSWORD="your_db_password" node auto-sync-mysql-schema.cjs');
  process.exit(1);
}

// Database connection config - uses environment variable for password
const dbConfig = {
  host: process.env.DO_DB_HOST || 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
  port: parseInt(process.env.DO_DB_PORT || '25060'),
  user: process.env.DO_DB_USER || 'doadmin',
  password: process.env.DO_DB_PASSWORD,
  database: process.env.DO_DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false }
};

// Complete schema definition - all tables with their columns and types
// This matches the IndexedDB/Dexie schema in src/database/db.ts
const SCHEMA = {
  hospitals: {
    id: 'VARCHAR(36) PRIMARY KEY',
    name: 'VARCHAR(255) NOT NULL',
    address: 'TEXT',
    city: 'VARCHAR(100)',
    state: 'VARCHAR(100)',
    country: 'VARCHAR(100)',
    phone: 'VARCHAR(50)',
    email: 'VARCHAR(255)',
    website: 'VARCHAR(255)',
    type: 'VARCHAR(50)',
    license_number: 'VARCHAR(100)',
    is_active: 'BOOLEAN DEFAULT TRUE',
    bed_capacity: 'INT',
    departments: 'JSON',
    facilities: 'JSON',
    operating_hours: 'JSON',
    logo_url: 'TEXT',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  },
  
  users: {
    id: 'VARCHAR(36) PRIMARY KEY',
    email: 'VARCHAR(255) NOT NULL',
    password_hash: 'VARCHAR(255)',
    first_name: 'VARCHAR(100)',
    last_name: 'VARCHAR(100)',
    role: 'VARCHAR(50)',
    hospital_id: 'VARCHAR(36)',
    department: 'VARCHAR(100)',
    specialization: 'VARCHAR(100)',
    phone: 'VARCHAR(50)',
    license_number: 'VARCHAR(100)',
    is_active: 'BOOLEAN DEFAULT TRUE',
    last_login: 'DATETIME',
    avatar_url: 'TEXT',
    permissions: 'JSON',
    preferences: 'JSON',
    agreement_accepted: 'BOOLEAN DEFAULT FALSE',
    agreement_date: 'DATETIME',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  },
  
  patients: {
    id: 'VARCHAR(36) PRIMARY KEY',
    hospital_id: 'VARCHAR(36)',
    hospital_number: 'VARCHAR(50)',
    first_name: 'VARCHAR(100)',
    last_name: 'VARCHAR(100)',
    middle_name: 'VARCHAR(100)',
    date_of_birth: 'DATE',
    age: 'INT',
    gender: 'VARCHAR(20)',
    blood_group: 'VARCHAR(10)',
    genotype: 'VARCHAR(10)',
    marital_status: 'VARCHAR(20)',
    occupation: 'VARCHAR(100)',
    religion: 'VARCHAR(50)',
    nationality: 'VARCHAR(50)',
    state_of_origin: 'VARCHAR(100)',
    lga: 'VARCHAR(100)',
    tribe: 'VARCHAR(50)',
    address: 'TEXT',
    city: 'VARCHAR(100)',
    state: 'VARCHAR(100)',
    phone: 'VARCHAR(50)',
    email: 'VARCHAR(255)',
    emergency_contact_name: 'VARCHAR(200)',
    emergency_contact_phone: 'VARCHAR(50)',
    emergency_contact_relationship: 'VARCHAR(50)',
    next_of_kin_name: 'VARCHAR(200)',
    next_of_kin_phone: 'VARCHAR(50)',
    next_of_kin_relationship: 'VARCHAR(50)',
    next_of_kin_address: 'TEXT',
    insurance_provider: 'VARCHAR(100)',
    insurance_policy_number: 'VARCHAR(100)',
    allergies: 'JSON',
    chronic_conditions: 'JSON',
    current_medications: 'JSON',
    past_medical_history: 'TEXT',
    past_surgical_history: 'TEXT',
    family_history: 'TEXT',
    social_history: 'TEXT',
    immunization_history: 'JSON',
    photo_url: 'TEXT',
    is_active: 'BOOLEAN DEFAULT TRUE',
    registered_hospital_id: 'VARCHAR(36)',
    registration_date: 'DATE',
    registered_by: 'VARCHAR(36)',
    dvt_risk_score: 'INT',
    dvt_risk_level: 'VARCHAR(20)',
    pressure_sore_risk_score: 'INT',
    pressure_sore_risk_level: 'VARCHAR(20)',
    malnutrition_risk_score: 'INT',
    malnutrition_risk_level: 'VARCHAR(20)',
    comorbidities: 'JSON',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    sync_status: 'VARCHAR(20) DEFAULT "pending"'
  },
  
  surgeries: {
    id: 'VARCHAR(36) PRIMARY KEY',
    patient_id: 'VARCHAR(36)',
    hospital_id: 'VARCHAR(36)',
    encounter_id: 'VARCHAR(36)',
    admission_id: 'VARCHAR(36)',
    procedure_name: 'VARCHAR(255)',
    procedure_code: 'VARCHAR(50)',
    type: 'VARCHAR(50)',
    category: 'VARCHAR(100)',
    pre_operative_assessment: 'JSON',
    scheduled_date: 'DATETIME',
    actual_start_time: 'DATETIME',
    actual_end_time: 'DATETIME',
    status: 'VARCHAR(50)',
    priority: 'VARCHAR(20)',
    surgeon: 'VARCHAR(200)',
    surgeon_id: 'VARCHAR(36)',
    assistant: 'VARCHAR(200)',
    assistant_id: 'VARCHAR(36)',
    anaesthetist: 'VARCHAR(200)',
    anaesthetist_id: 'VARCHAR(36)',
    scrub_nurse: 'VARCHAR(200)',
    scrub_nurse_id: 'VARCHAR(36)',
    circulating_nurse: 'VARCHAR(200)',
    circulating_nurse_id: 'VARCHAR(36)',
    anaesthesia_type: 'VARCHAR(50)',
    operative_notes: 'TEXT',
    findings: 'TEXT',
    complications: 'JSON',
    specimens: 'JSON',
    estimated_blood_loss: 'VARCHAR(50)',
    fluids_given: 'JSON',
    implants_used: 'JSON',
    consumables: 'JSON',
    post_operative_orders: 'TEXT',
    post_operative_diagnosis: 'TEXT',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    sync_status: 'VARCHAR(20) DEFAULT "pending"'
  },
  
  wounds: {
    id: 'VARCHAR(36) PRIMARY KEY',
    patient_id: 'VARCHAR(36)',
    hospital_id: 'VARCHAR(36)',
    encounter_id: 'VARCHAR(36)',
    admission_id: 'VARCHAR(36)',
    location: 'VARCHAR(100)',
    type: 'VARCHAR(50)',
    etiology: 'VARCHAR(100)',
    length: 'DECIMAL(10,2)',
    width: 'DECIMAL(10,2)',
    depth: 'DECIMAL(10,2)',
    area: 'DECIMAL(10,2)',
    tissue_type: 'VARCHAR(50)',
    exudate_amount: 'VARCHAR(50)',
    exudate_type: 'VARCHAR(50)',
    odor: 'BOOLEAN',
    peri_wound_condition: 'VARCHAR(100)',
    periwound_skin: 'VARCHAR(100)',
    pain_level: 'INT',
    photos: 'JSON',
    photo_urls: 'JSON',
    infection_signs: 'JSON',
    healing_progress: 'VARCHAR(50)',
    dressing_type: 'VARCHAR(100)',
    dressing_frequency: 'VARCHAR(50)',
    treatment_plan: 'TEXT',
    notes: 'TEXT',
    assessed_by: 'VARCHAR(36)',
    assessed_by_name: 'VARCHAR(200)',
    assessed_at: 'DATETIME',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    sync_status: 'VARCHAR(20) DEFAULT "pending"'
  },
  
  admissions: {
    id: 'VARCHAR(36) PRIMARY KEY',
    patient_id: 'VARCHAR(36)',
    hospital_id: 'VARCHAR(36)',
    encounter_id: 'VARCHAR(36)',
    admission_date: 'DATE',
    admission_time: 'TIME',
    admission_type: 'VARCHAR(50)',
    admitted_from: 'VARCHAR(100)',
    ward_name: 'VARCHAR(100)',
    ward_type: 'VARCHAR(50)',
    bed_number: 'VARCHAR(20)',
    attending_physician: 'VARCHAR(200)',
    attending_physician_id: 'VARCHAR(36)',
    primary_nurse: 'VARCHAR(200)',
    primary_nurse_id: 'VARCHAR(36)',
    consultants: 'JSON',
    admission_diagnosis: 'TEXT',
    chief_complaint: 'TEXT',
    severity: 'VARCHAR(20)',
    allergies: 'JSON',
    comorbidities: 'JSON',
    status: 'VARCHAR(50)',
    discharge_date: 'DATE',
    discharge_time: 'TIME',
    discharge_type: 'VARCHAR(50)',
    discharge_diagnosis: 'TEXT',
    discharge_summary: 'TEXT',
    discharged_by: 'VARCHAR(36)',
    admitted_by: 'VARCHAR(36)',
    created_by: 'VARCHAR(36)',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    sync_status: 'VARCHAR(20) DEFAULT "pending"'
  },
  
  treatment_progress: {
    id: 'VARCHAR(36) PRIMARY KEY',
    treatment_plan_id: 'VARCHAR(36)',
    patient_id: 'VARCHAR(36)',
    hospital_id: 'VARCHAR(36)',
    date: 'DATE',
    observations: 'TEXT',
    measurements: 'JSON',
    orders_executed: 'JSON',
    outcome_assessment: 'TEXT',
    clinician_notes: 'TEXT',
    photos: 'JSON',
    recorded_by: 'VARCHAR(36)',
    recorded_by_name: 'VARCHAR(200)',
    recorded_at: 'DATETIME',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  },
  
  investigations: {
    id: 'VARCHAR(100) PRIMARY KEY',
    patient_id: 'VARCHAR(36)',
    patient_name: 'VARCHAR(200)',
    hospital_number: 'VARCHAR(50)',
    hospital_id: 'VARCHAR(36)',
    hospital_name: 'VARCHAR(255)',
    encounter_id: 'VARCHAR(36)',
    admission_id: 'VARCHAR(36)',
    type: 'VARCHAR(50)',
    type_name: 'VARCHAR(100)',
    category: 'VARCHAR(100)',
    name: 'VARCHAR(255)',
    description: 'TEXT',
    priority: 'VARCHAR(20)',
    status: 'VARCHAR(50)',
    fasting: 'BOOLEAN',
    clinical_details: 'TEXT',
    clinical_info: 'TEXT',
    requested_by: 'VARCHAR(36)',
    requested_by_name: 'VARCHAR(200)',
    requested_at: 'DATETIME',
    collected_at: 'DATETIME',
    collected_by: 'VARCHAR(36)',
    processed_at: 'DATETIME',
    processed_by: 'VARCHAR(36)',
    result: 'JSON',
    result_text: 'TEXT',
    result_date: 'DATETIME',
    reported_by: 'VARCHAR(36)',
    verified_by: 'VARCHAR(36)',
    comments: 'TEXT',
    attachments: 'JSON',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    sync_status: 'VARCHAR(20) DEFAULT "pending"'
  },
  
  video_conferences: {
    id: 'VARCHAR(36) PRIMARY KEY',
    title: 'VARCHAR(255)',
    description: 'TEXT',
    hospital_id: 'VARCHAR(36)',
    host_id: 'VARCHAR(36)',
    host_name: 'VARCHAR(200)',
    participants: 'JSON',
    invited_users: 'JSON',
    patient_id: 'VARCHAR(36)',
    scheduled_start: 'DATETIME',
    scheduled_end: 'DATETIME',
    actual_start: 'DATETIME',
    actual_end: 'DATETIME',
    status: 'VARCHAR(50)',
    room_id: 'VARCHAR(100)',
    room_code: 'VARCHAR(50)',
    join_url: 'TEXT',
    settings: 'JSON',
    presentation: 'JSON',
    recordings: 'JSON',
    chat_enabled: 'BOOLEAN DEFAULT TRUE',
    chat_messages: 'JSON',
    meeting_notes: 'TEXT',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  },
  
  appointments: {
    id: 'VARCHAR(36) PRIMARY KEY',
    patient_id: 'VARCHAR(36)',
    patient_name: 'VARCHAR(200)',
    patient_phone: 'VARCHAR(50)',
    patient_email: 'VARCHAR(255)',
    hospital_id: 'VARCHAR(36)',
    clinician_id: 'VARCHAR(36)',
    clinician_name: 'VARCHAR(200)',
    department: 'VARCHAR(100)',
    type: 'VARCHAR(50)',
    appointment_date: 'DATE',
    appointment_time: 'TIME',
    scheduled_start: 'DATETIME',
    scheduled_end: 'DATETIME',
    duration: 'INT',
    status: 'VARCHAR(50)',
    priority: 'VARCHAR(20)',
    location: 'VARCHAR(200)',
    notes: 'TEXT',
    reason: 'TEXT',
    outcome_notes: 'TEXT',
    booked_by: 'VARCHAR(36)',
    booked_at: 'DATETIME',
    confirmed_at: 'DATETIME',
    checked_in_at: 'DATETIME',
    seen_at: 'DATETIME',
    completed_at: 'DATETIME',
    cancelled_at: 'DATETIME',
    cancellation_reason: 'TEXT',
    reminder_sent: 'BOOLEAN',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
    sync_status: 'VARCHAR(20) DEFAULT "pending"'
  },
  
  appointment_reminders: {
    id: 'VARCHAR(36) PRIMARY KEY',
    appointment_id: 'VARCHAR(36)',
    patient_id: 'VARCHAR(36)',
    hospital_id: 'VARCHAR(36)',
    channel: 'VARCHAR(20)',
    scheduled_for: 'DATETIME',
    sent_at: 'DATETIME',
    delivered_at: 'DATETIME',
    status: 'VARCHAR(50)',
    message_template: 'VARCHAR(100)',
    message_content: 'TEXT',
    whats_app_number: 'VARCHAR(50)',
    whatsapp_message_id: 'VARCHAR(100)',
    patient_response: 'TEXT',
    response_received_at: 'DATETIME',
    failure_reason: 'TEXT',
    retry_count: 'INT DEFAULT 0',
    max_retries: 'INT DEFAULT 3',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  },
  
  medication_charts: {
    id: 'VARCHAR(36) PRIMARY KEY',
    patient_id: 'VARCHAR(36)',
    hospital_id: 'VARCHAR(36)',
    admission_id: 'VARCHAR(36)',
    chart_date: 'DATE',
    shift_type: 'VARCHAR(20)',
    assigned_nurse_id: 'VARCHAR(36)',
    assigned_nurse_name: 'VARCHAR(200)',
    medications: 'JSON',
    scheduled_medications: 'JSON',
    prn_medications: 'JSON',
    administrations: 'JSON',
    allergies: 'JSON',
    is_completed: 'BOOLEAN DEFAULT FALSE',
    reviewed_by: 'VARCHAR(36)',
    reviewed_at: 'DATETIME',
    notes: 'TEXT',
    total_medications: 'INT',
    administered_count: 'INT',
    pending_count: 'INT',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  },
  
  transfusion_orders: {
    id: 'VARCHAR(36) PRIMARY KEY',
    order_id: 'VARCHAR(50)',
    patient_id: 'VARCHAR(36)',
    hospital_id: 'VARCHAR(36)',
    request_id: 'VARCHAR(36)',
    order_date: 'DATETIME',
    ordered_by: 'VARCHAR(36)',
    orderer_designation: 'VARCHAR(100)',
    urgency: 'VARCHAR(20)',
    patient_blood_group: 'VARCHAR(10)',
    patient_rh_factor: 'VARCHAR(10)',
    patient_genotype: 'VARCHAR(10)',
    antibody_screen_result: 'VARCHAR(50)',
    crossmatch_result: 'VARCHAR(50)',
    crossmatch_date: 'DATETIME',
    indication: 'TEXT',
    hemoglobin_level: 'DECIMAL(5,2)',
    platelet_count: 'INT',
    inr_value: 'DECIMAL(5,2)',
    products_ordered: 'JSON',
    special_requirements: 'JSON',
    transfusion_history: 'JSON',
    reactions_history: 'JSON',
    consent_obtained: 'BOOLEAN',
    consent_date: 'DATETIME',
    consent_witness: 'VARCHAR(200)',
    status: 'VARCHAR(50)',
    verifying_nurse1: 'VARCHAR(200)',
    verifying_nurse1_id: 'VARCHAR(36)',
    verifying_nurse2: 'VARCHAR(200)',
    verifying_nurse2_id: 'VARCHAR(36)',
    verification_time: 'DATETIME',
    notes: 'TEXT',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  },
  
  transfusion_monitoring_charts: {
    id: 'VARCHAR(36) PRIMARY KEY',
    chart_id: 'VARCHAR(50)',
    patient_id: 'VARCHAR(36)',
    hospital_id: 'VARCHAR(36)',
    transfusion_order_id: 'VARCHAR(36)',
    patient_name: 'VARCHAR(200)',
    hospital_number: 'VARCHAR(50)',
    ward_bed: 'VARCHAR(50)',
    chart_date: 'DATE',
    product_type: 'VARCHAR(50)',
    unit_number: 'VARCHAR(50)',
    blood_group: 'VARCHAR(10)',
    start_time: 'TIME',
    end_time: 'TIME',
    entries: 'JSON',
    total_volume_transfused: 'INT',
    complications: 'JSON',
    outcome: 'VARCHAR(50)',
    nurse_signature: 'VARCHAR(200)',
    nurse_id: 'VARCHAR(36)',
    doctor_review: 'TEXT',
    doctor_id: 'VARCHAR(36)',
    status: 'VARCHAR(50)',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  },
  
  preoperative_assessments: {
    id: 'VARCHAR(100) PRIMARY KEY',
    patient_id: 'VARCHAR(36)',
    patient_name: 'VARCHAR(200)',
    hospital_number: 'VARCHAR(50)',
    hospital_id: 'VARCHAR(36)',
    surgery_id: 'VARCHAR(36)',
    surgery_name: 'VARCHAR(255)',
    surgery_type: 'VARCHAR(50)',
    scheduled_date: 'DATETIME',
    asa_class: 'VARCHAR(10)',
    asa_emergency: 'BOOLEAN',
    airway_assessment: 'JSON',
    cardiac_risk: 'JSON',
    vte_risk: 'JSON',
    bleeding_risk: 'JSON',
    functional_capacity: 'VARCHAR(50)',
    exercise_tolerance: 'TEXT',
    vital_signs: 'JSON',
    lab_results: 'JSON',
    ecg_findings: 'TEXT',
    chest_xray_findings: 'TEXT',
    anesthesia_plan: 'JSON',
    medication_review: 'JSON',
    fasting_instructions: 'JSON',
    consent_status: 'VARCHAR(50)',
    status: 'VARCHAR(50)',
    clearance_status: 'VARCHAR(50)',
    clearance_notes: 'TEXT',
    assessed_by: 'VARCHAR(36)',
    assessed_by_name: 'VARCHAR(200)',
    assessed_at: 'DATETIME',
    reviewed_by: 'VARCHAR(36)',
    reviewed_at: 'DATETIME',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  },
  
  external_reviews: {
    id: 'VARCHAR(36) PRIMARY KEY',
    patient_id: 'VARCHAR(36)',
    patient_name: 'VARCHAR(200)',
    hospital_id: 'VARCHAR(36)',
    hospital_name: 'VARCHAR(255)',
    folder_number: 'VARCHAR(50)',
    service_date: 'DATE',
    diagnoses: 'JSON',
    surgeries: 'JSON',
    pathology_results: 'JSON',
    radiology_results: 'JSON',
    lab_results: 'JSON',
    medications: 'JSON',
    clinical_notes: 'TEXT',
    discharge_summary: 'TEXT',
    follow_up_plan: 'TEXT',
    attachments: 'JSON',
    created_by: 'VARCHAR(36)',
    created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  }
};

// Helper function to convert camelCase to snake_case
function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Helper function to extract just the column type (without constraints for comparison)
function getBaseType(columnDef) {
  const match = columnDef.match(/^(\w+(\(\d+,?\d*\))?)/i);
  return match ? match[1].toUpperCase() : columnDef.toUpperCase();
}

async function syncSchema() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');
    
    let totalAdded = 0;
    let totalModified = 0;
    let totalTables = 0;
    
    for (const [tableName, columns] of Object.entries(SCHEMA)) {
      console.log(`\n📋 Checking table: ${tableName}`);
      
      // Check if table exists
      const [tables] = await connection.query(
        `SHOW TABLES LIKE ?`, [tableName]
      );
      
      if (tables.length === 0) {
        console.log(`  ⚠️  Table ${tableName} does not exist - skipping`);
        continue;
      }
      
      totalTables++;
      
      // Get existing columns
      const [existingColumns] = await connection.query(
        `SHOW COLUMNS FROM \`${tableName}\``
      );
      
      const existingColumnNames = new Set(
        existingColumns.map(col => col.Field.toLowerCase())
      );
      
      // Check for missing columns
      let tableAdded = 0;
      for (const [columnName, columnDef] of Object.entries(columns)) {
        const snakeColumnName = columnName.includes('_') ? columnName : toSnakeCase(columnName);
        
        if (!existingColumnNames.has(snakeColumnName.toLowerCase()) && 
            !existingColumnNames.has(columnName.toLowerCase())) {
          
          // Skip primary key columns (they should already exist)
          if (columnDef.includes('PRIMARY KEY')) {
            continue;
          }
          
          // Add the missing column
          const alterSQL = `ALTER TABLE \`${tableName}\` ADD COLUMN \`${snakeColumnName}\` ${columnDef}`;
          
          try {
            await connection.query(alterSQL);
            console.log(`  ✅ Added column: ${snakeColumnName}`);
            tableAdded++;
            totalAdded++;
          } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
              console.log(`  ℹ️  Column ${snakeColumnName} already exists`);
            } else {
              console.log(`  ❌ Error adding ${snakeColumnName}: ${err.message}`);
            }
          }
        }
      }
      
      if (tableAdded === 0) {
        console.log(`  ✓ All columns present`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(50));
    console.log(`Tables checked: ${totalTables}`);
    console.log(`Columns added: ${totalAdded}`);
    console.log(`Columns modified: ${totalModified}`);
    console.log('='.repeat(50));
    
    // Special fixes for data type issues
    console.log('\n🔧 Applying special fixes...');
    
    // Fix transfusion_monitoring_charts start_time and end_time to TIME type
    try {
      await connection.query(`
        ALTER TABLE transfusion_monitoring_charts 
        MODIFY COLUMN start_time TIME,
        MODIFY COLUMN end_time TIME
      `);
      console.log('  ✅ Fixed transfusion_monitoring_charts time columns');
    } catch (err) {
      if (!err.message.includes('Unknown column')) {
        console.log(`  ℹ️  transfusion_monitoring_charts time columns: ${err.message}`);
      }
    }
    
    // Fix preoperative_assessments bleeding_risk to JSON
    try {
      await connection.query(`
        ALTER TABLE preoperative_assessments 
        MODIFY COLUMN bleeding_risk JSON
      `);
      console.log('  ✅ Fixed preoperative_assessments bleeding_risk column');
    } catch (err) {
      console.log(`  ℹ️  preoperative_assessments bleeding_risk: ${err.message}`);
    }
    
    console.log('\n✅ Schema sync completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed.');
    }
  }
}

// Run the sync
syncSchema();
