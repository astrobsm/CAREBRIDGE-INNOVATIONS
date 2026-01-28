/**
 * Create Super Admin User
 * Adds a super admin user to both IndexedDB and DigitalOcean MySQL
 */

const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const dbConfig = {
  host: 'dbaas-db-3645547-do-user-23752526-0.e.db.ondigitalocean.com',
  port: 25060,
  user: 'doadmin',
  password: process.env.DO_DB_PASSWORD,
  database: 'defaultdb',
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 30000
};

// Super Admin user details
const superAdmin = {
  id: uuidv4(),
  email: 'douglas@carebridge.edu.ng',
  password: 'BLACK@2velvet', // In production, this should be hashed
  first_name: 'Douglas',
  last_name: 'Admin',
  role: 'super_admin',
  is_active: true,
  has_accepted_agreement: true,
  agreement_accepted_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  agreement_version: '1.0',
  created_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
};

async function createSuperAdmin() {
  if (!dbConfig.password) {
    console.error('ERROR: DO_DB_PASSWORD environment variable is required');
    console.error('Set it with: $env:DO_DB_PASSWORD="your-password"');
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('CREATE SUPER ADMIN USER');
  console.log('='.repeat(50));
  console.log(`Email: ${superAdmin.email}`);
  console.log(`Role: ${superAdmin.role}`);
  console.log('');

  let connection;
  try {
    console.log('Connecting to DigitalOcean MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected successfully\n');

    // Check if user already exists
    const [existing] = await connection.query(
      'SELECT id, email FROM users WHERE email = ?',
      [superAdmin.email]
    );

    if (existing.length > 0) {
      console.log(`⚠️  User with email ${superAdmin.email} already exists`);
      console.log(`   ID: ${existing[0].id}`);
      
      // Update the existing user to ensure they're a super_admin and active
      await connection.query(
        `UPDATE users SET 
          role = ?,
          is_active = ?,
          password = ?,
          has_accepted_agreement = ?,
          updated_at = ?
        WHERE email = ?`,
        [
          superAdmin.role,
          superAdmin.is_active,
          superAdmin.password,
          superAdmin.has_accepted_agreement,
          superAdmin.updated_at,
          superAdmin.email
        ]
      );
      console.log('✅ Updated existing user to super_admin with new password');
    } else {
      // Insert new user
      const columns = Object.keys(superAdmin).join(', ');
      const placeholders = Object.keys(superAdmin).map(() => '?').join(', ');
      const values = Object.values(superAdmin);

      await connection.query(
        `INSERT INTO users (${columns}) VALUES (${placeholders})`,
        values
      );
      console.log('✅ Super admin user created successfully');
      console.log(`   ID: ${superAdmin.id}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('LOGIN CREDENTIALS');
    console.log('='.repeat(50));
    console.log(`Email:    ${superAdmin.email}`);
    console.log(`Password: ${superAdmin.password}`);
    console.log(`Role:     ${superAdmin.role}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

createSuperAdmin();
