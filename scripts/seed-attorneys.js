/**
 * Seed attorneys: Kevin Lipton and Michael Falsafi
 */
const { Pool } = require('pg');

async function seedAttorneys() {
  const pool = new Pool({
    host: process.env.DB_HOST || '/cloudsql/docmosis-tornado:us-central1:legal-forms-db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || 'W88PZ3z0w9HEv7E5ha4hgMUTQ',
    database: process.env.DB_NAME || 'legal_forms_db',
    port: process.env.DB_PORT || 5432
  });

  try {
    console.log('Connecting to database...');

    // Check current attorneys
    const existing = await pool.query('SELECT id, full_name, email FROM attorneys ORDER BY id');
    console.log('Existing attorneys:', existing.rows);

    // Insert Kevin Lipton with ID 1
    await pool.query(`
      INSERT INTO attorneys (id, email, full_name, password_hash, role, active)
      VALUES (1, 'kevin@liptonlegal.com', 'Kevin Lipton', '$2b$10$placeholder', 'attorney', true)
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, active = EXCLUDED.active
    `);
    console.log('Added/updated Kevin Lipton (ID: 1)');

    // Insert Michael Falsafi with ID 2
    await pool.query(`
      INSERT INTO attorneys (id, email, full_name, password_hash, role, active)
      VALUES (2, 'michael@liptonlegal.com', 'Michael Falsafi', '$2b$10$placeholder', 'attorney', true)
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, active = EXCLUDED.active
    `);
    console.log('Added/updated Michael Falsafi (ID: 2)');

    // Reset sequence to be safe
    await pool.query(`SELECT setval('attorneys_id_seq', GREATEST((SELECT MAX(id) FROM attorneys), 2))`);

    // Verify
    const result = await pool.query('SELECT id, full_name, email, active FROM attorneys ORDER BY id');
    console.log('\nAttorneys in database:');
    result.rows.forEach(r => console.log(`  ${r.id}: ${r.full_name} (${r.email}) - active: ${r.active}`));

    console.log('\nDone!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

seedAttorneys();
