const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, w.balance, w.base_stipend
       FROM children c
       LEFT JOIN wallets w ON w.child_id = c.id
       WHERE c.parent_id = $1 AND c.is_active = TRUE
       ORDER BY c.first_name`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get children error:', err);
    res.status(500).json({ error: 'Failed to fetch children.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, w.balance, w.base_stipend
       FROM children c
       LEFT JOIN wallets w ON w.child_id = c.id
       WHERE c.id = $1 AND c.parent_id = $2`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get child error:', err);
    res.status(500).json({ error: 'Failed to fetch child.' });
  }
};

exports.create = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { first_name, last_name, date_of_birth, gender, notes, base_stipend } = req.body;

    if (!first_name || !last_name || !date_of_birth || !gender) {
      return res.status(400).json({ error: 'First name, last name, date of birth, and gender are required.' });
    }

    const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

    const childResult = await client.query(
      `INSERT INTO children (parent_id, first_name, last_name, date_of_birth, gender, photo_url, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, first_name, last_name, date_of_birth, gender, photo_url, notes || null]
    );

    const child = childResult.rows[0];

    await client.query(
      `INSERT INTO wallets (child_id, balance, base_stipend) VALUES ($1, 0, $2)`,
      [child.id, base_stipend || 0]
    );

    await client.query('COMMIT');

    const fullResult = await db.query(
      `SELECT c.*, w.balance, w.base_stipend
       FROM children c LEFT JOIN wallets w ON w.child_id = c.id WHERE c.id = $1`,
      [child.id]
    );

    res.status(201).json(fullResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create child error:', err);
    res.status(500).json({ error: 'Failed to create child.' });
  } finally {
    client.release();
  }
};

exports.update = async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, gender, notes } = req.body;
    const photo_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    const fields = [];
    const values = [];
    let idx = 1;

    if (first_name) { fields.push(`first_name = $${idx++}`); values.push(first_name); }
    if (last_name) { fields.push(`last_name = $${idx++}`); values.push(last_name); }
    if (date_of_birth) { fields.push(`date_of_birth = $${idx++}`); values.push(date_of_birth); }
    if (gender) { fields.push(`gender = $${idx++}`); values.push(gender); }
    if (notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(notes); }
    if (photo_url) { fields.push(`photo_url = $${idx++}`); values.push(photo_url); }

    fields.push(`version = version + 1`);
    values.push(req.params.id, req.user.id);

    const result = await db.query(
      `UPDATE children SET ${fields.join(', ')} WHERE id = $${idx++} AND parent_id = $${idx} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found.' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update child error:', err);
    res.status(500).json({ error: 'Failed to update child.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE children SET is_active = FALSE WHERE id = $1 AND parent_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Child not found.' });
    }

    res.json({ message: 'Child deactivated successfully.' });
  } catch (err) {
    console.error('Remove child error:', err);
    res.status(500).json({ error: 'Failed to remove child.' });
  }
};
