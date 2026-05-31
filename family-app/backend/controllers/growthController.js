const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { child_id } = req.query;
    let query = `SELECT gr.*, gr.record_date as date, c.first_name, c.last_name FROM growth_records gr
      JOIN children c ON c.id = gr.child_id WHERE c.parent_id = $1`;
    const params = [req.user.id];
    if (child_id) { query += ' AND gr.child_id = $2'; params.push(child_id); }
    query += ' ORDER BY gr.record_date DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get growth records error:', err);
    res.status(500).json({ error: 'Failed to fetch growth records.' });
  }
};

exports.create = async (req, res) => {
  try {
    const child_id = req.body.child_id;
    const record_date = req.body.date || req.body.record_date;
    const { weight_kg, height_cm, notes } = req.body;
    if (!child_id || !record_date) return res.status(400).json({ error: 'child_id and date are required.' });

    // Verify child
    const child = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (child.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });

    const result = await db.query(
      `INSERT INTO growth_records (child_id, recorded_by, record_date, weight_kg, height_cm, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *, record_date as date`,
      [child_id, req.user.id, record_date, weight_kg, height_cm, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create growth record error:', err);
    res.status(500).json({ error: 'Failed to create growth record.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { weight_kg, height_cm, notes } = req.body;
    const result = await db.query(
      `UPDATE growth_records SET weight_kg=COALESCE($1,weight_kg), height_cm=COALESCE($2,height_cm),
       notes=COALESCE($3,notes), version=version+1 WHERE id=$4 AND recorded_by=$5 RETURNING *`,
      [weight_kg, height_cm, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update growth record error:', err);
    res.status(500).json({ error: 'Failed to update growth record.' });
  }
};

exports.getChart = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT record_date as date, weight_kg, height_cm, bmi FROM growth_records
       WHERE child_id = $1 ORDER BY record_date ASC`,
      [req.params.childId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get growth chart error:', err);
    res.status(500).json({ error: 'Failed to fetch growth chart data.' });
  }
};
