// Vercel Serverless Function for DigitalOcean MySQL Sync
// This API route handles all database sync operations

import mysql from 'mysql2/promise';

// Create MySQL connection pool
let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    const sslCa = process.env.DO_DB_CA_CERT || '';
    
    pool = mysql.createPool({
      user: process.env.DO_DB_USER || 'doadmin',
      password: process.env.DO_DB_PASSWORD,
      host: process.env.DO_DB_HOST || 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
      port: parseInt(process.env.DO_DB_PORT || '25060'),
      database: process.env.DO_DB_NAME || 'defaultdb',
      ssl: sslCa ? { ca: sslCa, rejectUnauthorized: true } : { rejectUnauthorized: false },
      connectionLimit: 10,
      waitForConnections: true,
      queueLimit: 0,
    });
  }
  return pool;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Define allowed tables for security (snake_case names)
const ALLOWED_TABLES = [
  // Core entities
  'users', 'hospitals', 'patients', 
  // Vital signs and clinical encounters
  'vital_signs', 'clinical_encounters',
  // Surgeries and operative notes
  'surgeries', 'preoperative_assessments', 'postoperative_notes', 'surgical_notes',
  // Admissions and ward management
  'admissions', 'admission_notes', 'bed_assignments', 'ward_rounds', 'nurse_notes',
  // Wounds and burns
  'wounds', 'wound_measurements', 'burn_assessments', 'burn_monitoring', 
  'burn_monitoring_records', 'escharotomy_records', 'skin_graft_records', 'burn_care_plans',
  // Labs and investigations
  'lab_requests', 'investigations', 'histopathology_requests',
  // Medications and prescriptions
  'prescriptions', 'medication_charts', 'medication_administrations',
  // Treatment and discharge
  'treatment_plans', 'treatment_progress', 'discharge_summaries',
  // Nutrition
  'nutrition_assessments', 'nutrition_plans',
  // Appointments
  'appointments', 'appointment_reminders', 'appointment_slots', 'clinic_sessions',
  // Billing and invoices
  'invoices', 'invoice_items', 'activity_billing_records', 
  'payroll_periods', 'staff_payroll_records', 'payslips',
  // Communication
  'chat_rooms', 'chat_messages', 'chat_participants', 
  'video_conferences', 'video_participants', 'enhanced_video_conferences', 'webrtc_signaling',
  // Blood transfusions
  'blood_transfusions', 'transfusion_orders', 'transfusion_monitoring_charts',
  // Specialized assessments
  'external_reviews', 'mdt_meetings', 'limb_salvage_assessments',
  // NPWT (Negative Pressure Wound Therapy)
  'npwt_sessions', 'npwt_notifications',
  // Staffing and assignments
  'shift_assignments', 'doctor_assignments', 'nurse_assignments', 
  'nurse_patient_assignments', 'staff_patient_assignments',
  // Consumables
  'consumable_boms', 'consumable_bom_items',
  // Other
  'comorbidities', 'referrals', 'patient_education_records', 
  'calculator_results', 'meeting_minutes',
  // Settings and logs
  'user_settings', 'hospital_settings', 'audit_logs', 'sync_status'
];

// Convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert table name to snake_case and validate
function normalizeTableName(table: string): string {
  // Convert camelCase to snake_case (e.g., vitalSigns -> vital_signs)
  return toSnakeCase(table).toLowerCase();
}

// Validate table name to prevent SQL injection
function isValidTable(table: string): boolean {
  // Table name should already be normalized to snake_case
  return ALLOWED_TABLES.includes(table);
}

// Convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert ISO 8601 datetime to MySQL DATETIME format
function toMySQLDateTime(value: any): any {
  if (typeof value === 'string') {
    // Check if it's an ISO 8601 date string
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    if (isoDatePattern.test(value)) {
      // Convert to MySQL DATETIME format: 'YYYY-MM-DD HH:MM:SS'
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      }
    }
  }
  return value;
}

// Convert object keys from camelCase to snake_case
function objectToSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    let value = obj[key];
    
    // Convert Date objects to MySQL format
    if (value instanceof Date) {
      value = value.toISOString().slice(0, 19).replace('T', ' ');
    }
    // Convert ISO 8601 date strings to MySQL format
    else if (typeof value === 'string') {
      value = toMySQLDateTime(value);
    }
    
    // Convert arrays and objects to JSON strings for MySQL
    if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
      result[toSnakeCase(key)] = JSON.stringify(value);
    } else {
      result[toSnakeCase(key)] = value;
    }
  }
  return result;
}

// Convert object keys from snake_case to camelCase and parse JSON fields
function objectToCamelCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    let value = obj[key];
    // Try to parse JSON strings back to objects/arrays
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        value = JSON.parse(value);
      } catch (e) {
        // Keep as string if parse fails
      }
    }
    result[toCamelCase(key)] = value;
  }
  return result;
}

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(200).json({});
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const { method: _method } = req;
    const { action, table: rawTable, data, filters, since } = req.body || {};

    // Normalize table name from camelCase to snake_case
    const table = rawTable ? normalizeTableName(rawTable) : null;

    // Validate table name
    if (table && !isValidTable(table)) {
      return res.status(400).json({ error: `Invalid table name: ${rawTable} (normalized: ${table})` });
    }

    switch (action) {
      case 'pull':
        if (!table) return res.status(400).json({ error: 'Table name is required for pull' });
        return await handlePull(res, table, since);
      
      case 'push':
        if (!table) return res.status(400).json({ error: 'Table name is required for push' });
        return await handlePush(res, table, data);
      
      case 'upsert':
        if (!table) return res.status(400).json({ error: 'Table name is required for upsert' });
        return await handleUpsert(res, table, data);
      
      case 'delete':
        if (!table) return res.status(400).json({ error: 'Table name is required for delete' });
        return await handleDelete(res, table, filters);
      
      case 'query':
        if (!table) return res.status(400).json({ error: 'Table name is required for query' });
        return await handleQuery(res, table, filters);
      
      case 'health':
        return await handleHealth(res);
      
      case 'migrate':
        return await handleMigrate(res);
      
      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error: any) {
    console.error('[DB API] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      code: error.code 
    });
  }
}

// Pull data from a table (optionally since a timestamp)
async function handlePull(res: any, table: string, since?: string) {
  const dbPool = getPool();
  let query = `SELECT * FROM ${table}`;
  const params: any[] = [];

  if (since) {
    query += ` WHERE updated_at > ?`;
    params.push(since);
  }

  query += ` ORDER BY updated_at DESC`;

  const [rows] = await dbPool.query(query, params);
  const data = (rows as any[]).map(objectToCamelCase);

  return res.status(200).json({ 
    data,
    count: data.length,
    table 
  });
}

// Push (insert) new data with upsert behavior
async function handlePush(res: any, table: string, data: any[]) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: 'No data provided' });
  }

  const dbPool = getPool();
  const connection = await dbPool.getConnection();
  
  try {
    await connection.beginTransaction();

    let insertedCount = 0;
    for (const item of data) {
      const snakeItem = objectToSnakeCase(item);
      const keys = Object.keys(snakeItem);
      const values = Object.values(snakeItem);
      const placeholders = keys.map(() => '?').join(', ');
      
      // MySQL upsert syntax: INSERT ... ON DUPLICATE KEY UPDATE
      const updateClauses = keys
        .filter(k => k !== 'id')
        .map(k => `${k} = VALUES(${k})`)
        .join(', ');

      const query = `
        INSERT INTO ${table} (${keys.join(', ')})
        VALUES (${placeholders})
        ON DUPLICATE KEY UPDATE ${updateClauses || 'id = id'}
      `;

      await connection.query(query, values);
      insertedCount++;
    }

    await connection.commit();
    return res.status(200).json({ 
      success: true, 
      inserted: insertedCount 
    });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

// Upsert single item
async function handleUpsert(res: any, table: string, data: any) {
  if (!data) {
    return res.status(400).json({ error: 'No data provided' });
  }

  const dbPool = getPool();
  const snakeItem = objectToSnakeCase(data);
  const keys = Object.keys(snakeItem);
  const values = Object.values(snakeItem);
  const placeholders = keys.map(() => '?').join(', ');

  // MySQL upsert
  const updateClauses = keys
    .filter(k => k !== 'id')
    .map(k => `${k} = VALUES(${k})`)
    .join(', ');

  const query = `
    INSERT INTO ${table} (${keys.join(', ')})
    VALUES (${placeholders})
    ON DUPLICATE KEY UPDATE ${updateClauses || 'id = id'}
  `;

  await dbPool.query(query, values);
  
  // Fetch the inserted/updated row
  const [rows] = await dbPool.query(`SELECT * FROM ${table} WHERE id = ?`, [data.id]);
  const result = (rows as any[])[0];

  return res.status(200).json({ 
    success: true, 
    data: result ? objectToCamelCase(result) : null 
  });
}

// Delete by filters
async function handleDelete(res: any, table: string, filters: Record<string, any>) {
  if (!filters || Object.keys(filters).length === 0) {
    return res.status(400).json({ error: 'No filters provided for delete' });
  }

  const dbPool = getPool();
  const snakeFilters = objectToSnakeCase(filters);
  const conditions = Object.keys(snakeFilters).map(k => `${k} = ?`).join(' AND ');
  const values = Object.values(snakeFilters);

  const query = `DELETE FROM ${table} WHERE ${conditions}`;
  const [result] = await dbPool.query(query, values);

  return res.status(200).json({ 
    success: true, 
    deleted: (result as any).affectedRows 
  });
}

// Query with filters
async function handleQuery(res: any, table: string, filters: Record<string, any>) {
  const dbPool = getPool();
  let query = `SELECT * FROM ${table}`;
  const params: any[] = [];

  if (filters && Object.keys(filters).length > 0) {
    const snakeFilters = objectToSnakeCase(filters);
    const conditions = Object.keys(snakeFilters).map(k => `${k} = ?`).join(' AND ');
    query += ` WHERE ${conditions}`;
    params.push(...Object.values(snakeFilters));
  }

  query += ` ORDER BY updated_at DESC`;

  const [rows] = await dbPool.query(query, params);
  const data = (rows as any[]).map(objectToCamelCase);

  return res.status(200).json({ 
    data,
    count: data.length 
  });
}

// Health check
async function handleHealth(res: any) {
  try {
    const dbPool = getPool();
    const [rows] = await dbPool.query('SELECT NOW() as time, DATABASE() as db, VERSION() as version');
    const result = (rows as any[])[0];
    
    return res.status(200).json({ 
      status: 'healthy',
      database: result.db,
      serverTime: result.time,
      version: result.version,
      provider: 'DigitalOcean MySQL'
    });
  } catch (error: any) {
    return res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
}

// Migration handler to add missing columns
async function handleMigrate(res: any) {
  const dbPool = getPool();
  const migrations: string[] = [];
  const errors: string[] = [];

  // List of columns to add (table, column, definition)
  const columnsToAdd = [
    // patients table
    { table: 'patients', column: 'alternate_phone', definition: 'VARCHAR(50) NULL' },
    { table: 'patients', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    { table: 'patients', column: 'emergency_contact_name', definition: 'VARCHAR(255) NULL' },
    { table: 'patients', column: 'emergency_contact_phone', definition: 'VARCHAR(50) NULL' },
    { table: 'patients', column: 'emergency_contact_relationship', definition: 'VARCHAR(100) NULL' },
    { table: 'patients', column: 'next_of_kin_name', definition: 'VARCHAR(255) NULL' },
    { table: 'patients', column: 'next_of_kin_phone', definition: 'VARCHAR(50) NULL' },
    { table: 'patients', column: 'next_of_kin_relationship', definition: 'VARCHAR(100) NULL' },
    { table: 'patients', column: 'next_of_kin_address', definition: 'TEXT NULL' },
    { table: 'patients', column: 'insurance_provider', definition: 'VARCHAR(255) NULL' },
    { table: 'patients', column: 'insurance_policy_number', definition: 'VARCHAR(100) NULL' },
    { table: 'patients', column: 'insurance_group_number', definition: 'VARCHAR(100) NULL' },
    { table: 'patients', column: 'insurance_expiry_date', definition: 'DATE NULL' },
    { table: 'patients', column: 'allergies', definition: 'TEXT NULL' },
    { table: 'patients', column: 'chronic_conditions', definition: 'TEXT NULL' },
    { table: 'patients', column: 'current_medications', definition: 'TEXT NULL' },
    { table: 'patients', column: 'blood_group', definition: 'VARCHAR(10) NULL' },
    { table: 'patients', column: 'genotype', definition: 'VARCHAR(10) NULL' },
    { table: 'patients', column: 'marital_status', definition: 'VARCHAR(50) NULL' },
    { table: 'patients', column: 'occupation', definition: 'VARCHAR(255) NULL' },
    { table: 'patients', column: 'nationality', definition: 'VARCHAR(100) NULL' },
    { table: 'patients', column: 'religion', definition: 'VARCHAR(100) NULL' },
    { table: 'patients', column: 'tribe', definition: 'VARCHAR(100) NULL' },
    { table: 'patients', column: 'language', definition: 'VARCHAR(100) NULL' },
    { table: 'patients', column: 'photo_url', definition: 'TEXT NULL' },
    { table: 'patients', column: 'notes', definition: 'TEXT NULL' },
    { table: 'patients', column: 'is_active', definition: 'BOOLEAN DEFAULT TRUE' },
    { table: 'patients', column: 'referring_facility', definition: 'VARCHAR(255) NULL' },
    { table: 'patients', column: 'referral_notes', definition: 'TEXT NULL' },
    { table: 'patients', column: 'dvt_risk_score', definition: 'INT NULL' },
    { table: 'patients', column: 'dvt_risk_level', definition: 'VARCHAR(50) NULL' },
    { table: 'patients', column: 'pressure_sore_score', definition: 'INT NULL' },
    { table: 'patients', column: 'pressure_sore_risk', definition: 'VARCHAR(50) NULL' },
    { table: 'patients', column: 'must_score', definition: 'INT NULL' },
    { table: 'patients', column: 'must_risk', definition: 'VARCHAR(50) NULL' },
    
    // users table
    { table: 'users', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    { table: 'users', column: 'synced_at', definition: 'DATETIME NULL' },
    { table: 'users', column: 'password_hash', definition: 'VARCHAR(255) NULL' },
    { table: 'users', column: 'specialty', definition: 'VARCHAR(255) NULL' },
    { table: 'users', column: 'license_number', definition: 'VARCHAR(100) NULL' },
    { table: 'users', column: 'department', definition: 'VARCHAR(255) NULL' },
    { table: 'users', column: 'phone', definition: 'VARCHAR(50) NULL' },
    { table: 'users', column: 'avatar_url', definition: 'TEXT NULL' },
    { table: 'users', column: 'signature_url', definition: 'TEXT NULL' },
    { table: 'users', column: 'is_active', definition: 'BOOLEAN DEFAULT TRUE' },
    { table: 'users', column: 'last_login_at', definition: 'DATETIME NULL' },
    { table: 'users', column: 'agreed_to_terms', definition: 'BOOLEAN DEFAULT FALSE' },
    { table: 'users', column: 'agreed_at', definition: 'DATETIME NULL' },
    
    // hospitals table  
    { table: 'hospitals', column: 'is24_hours', definition: 'BOOLEAN DEFAULT FALSE' },
    { table: 'hospitals', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // vital_signs table
    { table: 'vital_signs', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // clinical_encounters table
    { table: 'clinical_encounters', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // surgeries table
    { table: 'surgeries', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // wounds table
    { table: 'wounds', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // lab_requests table
    { table: 'lab_requests', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // prescriptions table
    { table: 'prescriptions', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // invoices table
    { table: 'invoices', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // admissions table
    { table: 'admissions', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // treatment_plans table
    { table: 'treatment_plans', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // investigations table
    { table: 'investigations', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // video_conferences table
    { table: 'video_conferences', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // appointments table
    { table: 'appointments', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // medication_charts table
    { table: 'medication_charts', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // transfusion_orders table
    { table: 'transfusion_orders', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // preoperative_assessments table
    { table: 'preoperative_assessments', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // external_reviews table
    { table: 'external_reviews', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
    
    // hospital_settings table
    { table: 'hospital_settings', column: 'synced_status', definition: "VARCHAR(20) DEFAULT 'pending'" },
  ];

  for (const { table, column, definition } of columnsToAdd) {
    try {
      // Check if column exists
      const [cols] = await dbPool.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [table, column]
      );
      
      if ((cols as any[]).length === 0) {
        // Column doesn't exist, add it
        await dbPool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        migrations.push(`Added ${column} to ${table}`);
      } else {
        migrations.push(`Column ${column} already exists in ${table}`);
      }
    } catch (error: any) {
      errors.push(`Error adding ${column} to ${table}: ${error.message}`);
    }
  }

  return res.status(200).json({
    success: errors.length === 0,
    migrations,
    errors
  });
}
