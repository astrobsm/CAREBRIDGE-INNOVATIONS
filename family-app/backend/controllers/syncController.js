const db = require('../config/db');

// Push sync changes from client
exports.push = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { changes, device_id } = req.body;

    if (!Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ error: 'No changes to sync.' });
    }

    const results = [];
    for (const change of changes) {
      const { table_name, record_id, action, payload, client_timestamp } = change;

      // Validate table name against whitelist
      const allowedTables = [
        'children', 'tasks', 'task_assignments', 'wallets', 'transactions',
        'plans', 'plan_goals', 'assignments', 'prayer_schedules', 'prayer_logs',
        'events', 'growth_records', 'health_records'
      ];
      if (!allowedTables.includes(table_name)) {
        results.push({ record_id, status: 'rejected', reason: 'Invalid table' });
        continue;
      }

      // Check for conflicts (version-based)
      if (action === 'update' && payload.version) {
        const existing = await client.query(
          `SELECT version FROM ${table_name} WHERE id = $1`, [record_id]
        );
        if (existing.rows.length > 0 && existing.rows[0].version > payload.version) {
          // Server version is newer - conflict
          results.push({
            record_id,
            status: 'conflict',
            server_version: existing.rows[0].version,
            client_version: payload.version,
          });
          continue;
        }
      }

      // Log the sync action
      await client.query(
        `INSERT INTO sync_log (user_id, table_name, record_id, action, payload, client_timestamp, device_id, is_processed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
        [req.user.id, table_name, record_id, action, JSON.stringify(payload), client_timestamp, device_id]
      );

      results.push({ record_id, status: 'synced' });
    }

    await client.query('COMMIT');
    res.json({ results, server_timestamp: new Date().toISOString() });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Sync push error:', err);
    res.status(500).json({ error: 'Sync failed.' });
  } finally {
    client.release();
  }
};

// Pull changes from server since last sync
exports.pull = async (req, res) => {
  try {
    const { last_sync, device_id } = req.query;
    const since = last_sync || '1970-01-01T00:00:00Z';

    const tables = [
      'children', 'tasks', 'task_assignments', 'wallets',
      'plans', 'plan_goals', 'assignments', 'prayer_schedules',
      'events', 'growth_records', 'health_records'
    ];

    const changes = {};
    for (const table of tables) {
      const result = await db.query(
        `SELECT * FROM ${table} WHERE updated_at > $1`,
        [since]
      );
      if (result.rows.length > 0) {
        changes[table] = result.rows;
      }
    }

    // Also pull transactions (no updated_at, use created_at)
    const txResult = await db.query(
      'SELECT * FROM transactions WHERE created_at > $1',
      [since]
    );
    if (txResult.rows.length > 0) {
      changes.transactions = txResult.rows;
    }

    res.json({
      changes,
      server_timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Sync pull error:', err);
    res.status(500).json({ error: 'Failed to pull changes.' });
  }
};
