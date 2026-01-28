// Vercel Serverless Function for DigitalOcean MySQL Sync
// This API route handles all database sync operations

import mysql from 'mysql2/promise';
import * as fs from 'fs';
import * as path from 'path';

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

// Define allowed tables for security
const ALLOWED_TABLES = [
  'users', 'patients', 'vital_signs', 'clinical_encounters', 'surgeries',
  'admissions', 'ward_rounds', 'wounds', 'wound_measurements', 'burn_assessments',
  'burn_monitoring', 'lab_requests', 'investigations', 'prescriptions',
  'treatment_plans', 'treatment_progress', 'discharge_summaries', 'nutrition_assessments',
  'appointments', 'invoices', 'invoice_items', 'hospitals', 'chat_rooms',
  'chat_messages', 'chat_participants', 'video_conferences', 'video_participants',
  'preoperative_assessments', 'postoperative_notes', 'surgical_notes',
  'external_reviews', 'mdt_meetings', 'blood_transfusions', 'histopathology_requests',
  'npwt_sessions', 'limb_salvage_assessments', 'medication_charts',
  'medication_administrations', 'shift_assignments', 'consumable_boms',
  'consumable_bom_items', 'comorbidities', 'nurse_notes', 'webrtc_signaling'
];

// Validate table name to prevent SQL injection
function isValidTable(table: string): boolean {
  return ALLOWED_TABLES.includes(table.toLowerCase());
}

// Convert camelCase to snake_case
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

// Convert snake_case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Convert object keys from camelCase to snake_case
function objectToSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const value = obj[key];
    // Convert arrays and objects to JSON strings for MySQL
    if (Array.isArray(value) || (value !== null && typeof value === 'object' && !(value instanceof Date))) {
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
    const { method } = req;
    const { action, table, data, filters, since } = req.body || {};

    // Validate table name
    if (table && !isValidTable(table)) {
      return res.status(400).json({ error: `Invalid table name: ${table}` });
    }

    switch (action) {
      case 'pull':
        return await handlePull(res, table, since);
      
      case 'push':
        return await handlePush(res, table, data);
      
      case 'upsert':
        return await handleUpsert(res, table, data);
      
      case 'delete':
        return await handleDelete(res, table, filters);
      
      case 'query':
        return await handleQuery(res, table, filters);
      
      case 'health':
        return await handleHealth(res);
      
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
