// Test DigitalOcean MySQL Connection
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read CA certificate
const caCert = fs.readFileSync(path.join(__dirname, 'ca-certificate.crt')).toString();

async function testConnection() {
  try {
    console.log('Connecting to DigitalOcean MySQL...');
    console.log('Node version:', process.version);
    
    // Use environment variables for credentials
    const connection = await mysql.createConnection({
      host: process.env.DO_DB_HOST || 'localhost',
      port: parseInt(process.env.DO_DB_PORT || '25060'),
      user: process.env.DO_DB_USER || 'doadmin',
      password: process.env.DO_DB_PASSWORD,
      database: process.env.DO_DB_NAME || 'defaultdb',
      ssl: {
        ca: caCert,
        rejectUnauthorized: true
      }
    });
    
    const [rows] = await connection.execute('SELECT NOW() as time, DATABASE() as db, VERSION() as version');
    console.log('✅ Connection successful!');
    console.log('Database:', rows[0].db);
    console.log('Server time:', rows[0].time);
    console.log('MySQL version:', rows[0].version);
    
    // Check if tables exist
    const [tables] = await connection.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'defaultdb' 
      ORDER BY table_name
    `);
    
    if (tables.length === 0) {
      console.log('\n⚠️  No tables found. You need to run the schema SQL file.');
      console.log('Run the digitalocean-mysql-schema.sql file in your DigitalOcean database console.');
    } else {
      console.log('\n📋 Existing tables:', tables.map(r => r.TABLE_NAME || r.table_name).join(', '));
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    process.exit(1);
  }
}

testConnection();
