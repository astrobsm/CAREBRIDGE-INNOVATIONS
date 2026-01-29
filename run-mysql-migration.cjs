// MySQL Migration Script - Add missing columns
// Run with: node run-mysql-migration.cjs <password>

const mysql = require('mysql2/promise');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node run-mysql-migration.cjs <password>');
  process.exit(1);
}

const dbConfig = {
  host: process.env.DO_DB_HOST || 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
  port: parseInt(process.env.DO_DB_PORT || '25060'),
  user: process.env.DO_DB_USER || 'doadmin',
  password: password,
  database: process.env.DO_DB_NAME || 'defaultdb',
  ssl: { rejectUnauthorized: false }
};

const migrations = [
  // 1. SURGERIES - Add assistant column
  {
    table: 'surgeries',
    column: 'assistant',
    sql: `ALTER TABLE surgeries ADD COLUMN assistant VARCHAR(255) NULL`
  },
  
  // 2. WOUNDS - Add photo_urls column
  {
    table: 'wounds',
    column: 'photo_urls',
    sql: `ALTER TABLE wounds ADD COLUMN photo_urls JSON NULL`
  },
  
  // 3. ADMISSIONS - Add created_by column
  {
    table: 'admissions',
    column: 'created_by',
    sql: `ALTER TABLE admissions ADD COLUMN created_by VARCHAR(100) NULL`
  },
  
  // 4. TREATMENT_PROGRESS - Add recorded_at column
  {
    table: 'treatment_progress',
    column: 'recorded_at',
    sql: `ALTER TABLE treatment_progress ADD COLUMN recorded_at DATETIME NULL`
  },
  
  // 5. INVESTIGATIONS - Add name column
  {
    table: 'investigations',
    column: 'name',
    sql: `ALTER TABLE investigations ADD COLUMN name VARCHAR(255) NULL`
  },
  
  // 6. VIDEO_CONFERENCES - Add room_code column
  {
    table: 'video_conferences',
    column: 'room_code',
    sql: `ALTER TABLE video_conferences ADD COLUMN room_code VARCHAR(100) NULL`
  },
  
  // 7. APPOINTMENTS - Add appointment_date column
  {
    table: 'appointments',
    column: 'appointment_date',
    sql: `ALTER TABLE appointments ADD COLUMN appointment_date DATE NULL`
  },
  
  // 8. APPOINTMENT_REMINDERS - Add whatsapp_message_id column
  {
    table: 'appointment_reminders',
    column: 'whatsapp_message_id',
    sql: `ALTER TABLE appointment_reminders ADD COLUMN whatsapp_message_id VARCHAR(255) NULL`
  },
  
  // 9. MEDICATION_CHARTS - Add prn_medications column
  {
    table: 'medication_charts',
    column: 'prn_medications',
    sql: `ALTER TABLE medication_charts ADD COLUMN prn_medications JSON NULL`
  },
  
  // 10. TRANSFUSION_ORDERS - Add verifying nurse columns
  {
    table: 'transfusion_orders',
    column: 'verifying_nurse1',
    sql: `ALTER TABLE transfusion_orders ADD COLUMN verifying_nurse1 VARCHAR(255) NULL`
  },
  {
    table: 'transfusion_orders',
    column: 'verifying_nurse1_id',
    sql: `ALTER TABLE transfusion_orders ADD COLUMN verifying_nurse1_id VARCHAR(100) NULL`
  },
  {
    table: 'transfusion_orders',
    column: 'verifying_nurse2',
    sql: `ALTER TABLE transfusion_orders ADD COLUMN verifying_nurse2 VARCHAR(255) NULL`
  },
  {
    table: 'transfusion_orders',
    column: 'verifying_nurse2_id',
    sql: `ALTER TABLE transfusion_orders ADD COLUMN verifying_nurse2_id VARCHAR(100) NULL`
  },
  
  // 13. EXTERNAL_REVIEWS - Add pathology_results and related columns
  {
    table: 'external_reviews',
    column: 'pathology_results',
    sql: `ALTER TABLE external_reviews ADD COLUMN pathology_results JSON NULL`
  },
  {
    table: 'external_reviews',
    column: 'radiology_results',
    sql: `ALTER TABLE external_reviews ADD COLUMN radiology_results JSON NULL`
  },
  {
    table: 'external_reviews',
    column: 'lab_results',
    sql: `ALTER TABLE external_reviews ADD COLUMN lab_results JSON NULL`
  }
];

const columnModifications = [
  // 11. TRANSFUSION_MONITORING_CHARTS - Change start_time/end_time to VARCHAR
  {
    table: 'transfusion_monitoring_charts',
    description: 'Change start_time to VARCHAR',
    sql: `ALTER TABLE transfusion_monitoring_charts MODIFY COLUMN start_time VARCHAR(20) NULL`
  },
  {
    table: 'transfusion_monitoring_charts',
    description: 'Change end_time to VARCHAR',
    sql: `ALTER TABLE transfusion_monitoring_charts MODIFY COLUMN end_time VARCHAR(20) NULL`
  },
  
  // 12. PREOPERATIVE_ASSESSMENTS - Increase bleeding_risk size
  {
    table: 'preoperative_assessments',
    description: 'Increase bleeding_risk to TEXT',
    sql: `ALTER TABLE preoperative_assessments MODIFY COLUMN bleeding_risk TEXT NULL`
  }
];

async function checkColumnExists(connection, tableName, columnName) {
  try {
    const [rows] = await connection.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [dbConfig.database, tableName, columnName]
    );
    return rows.length > 0;
  } catch (error) {
    return false;
  }
}

async function runMigration() {
  let connection;
  
  try {
    console.log('🔌 Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully!\n');
    
    // Run ADD COLUMN migrations
    console.log('📋 Adding missing columns...\n');
    
    for (const migration of migrations) {
      const exists = await checkColumnExists(connection, migration.table, migration.column);
      
      if (exists) {
        console.log(`⏭️  ${migration.table}.${migration.column} - Already exists, skipping`);
      } else {
        try {
          await connection.execute(migration.sql);
          console.log(`✅ ${migration.table}.${migration.column} - Added successfully`);
        } catch (error) {
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`⏭️  ${migration.table}.${migration.column} - Already exists`);
          } else {
            console.log(`❌ ${migration.table}.${migration.column} - Error: ${error.message}`);
          }
        }
      }
    }
    
    // Run MODIFY COLUMN migrations
    console.log('\n📋 Modifying column types...\n');
    
    for (const modification of columnModifications) {
      try {
        await connection.execute(modification.sql);
        console.log(`✅ ${modification.table} - ${modification.description}`);
      } catch (error) {
        console.log(`❌ ${modification.table} - ${modification.description}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
