const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { child_id } = req.query;
    let query = `SELECT hr.*, c.first_name, c.last_name,
      illness as title, symptoms as description, record_date as date,
      follow_up_date as next_appointment
      FROM health_records hr
      JOIN children c ON c.id = hr.child_id WHERE c.parent_id = $1`;
    const params = [req.user.id];
    if (child_id) { query += ' AND hr.child_id = $2'; params.push(child_id); }
    query += ' ORDER BY hr.record_date DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get health records error:', err);
    res.status(500).json({ error: 'Failed to fetch health records.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT hr.*, c.first_name, c.last_name,
       illness as title, symptoms as description, record_date as date,
       follow_up_date as next_appointment
       FROM health_records hr
       JOIN children c ON c.id = hr.child_id WHERE hr.id = $1 AND c.parent_id = $2`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get health record error:', err);
    res.status(500).json({ error: 'Failed to fetch health record.' });
  }
};

exports.create = async (req, res) => {
  try {
    // Accept both frontend field names and DB field names
    const child_id = req.body.child_id;
    const record_date = req.body.date || req.body.record_date;
    const illness = req.body.title || req.body.illness || '';
    const symptoms = req.body.description || req.body.symptoms;
    const treatment = req.body.medications || req.body.treatment;
    const doctor_name = req.body.doctor_name;
    const hospital = req.body.hospital;
    const follow_up_date = req.body.next_appointment || req.body.follow_up_date;
    const notes = req.body.notes;
    const record_type = req.body.record_type || 'other';
    const medications = req.body.medications;
    const allergies = req.body.allergies;

    if (!child_id || !record_date) {
      return res.status(400).json({ error: 'child_id and date are required.' });
    }
    const child = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (child.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });

    const result = await db.query(
      `INSERT INTO health_records (child_id, recorded_by, record_date, illness, symptoms, treatment, doctor_name, hospital, follow_up_date, notes, record_type, medications, allergies)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *,
       illness as title, symptoms as description, record_date as date, follow_up_date as next_appointment`,
      [child_id, req.user.id, record_date, illness, symptoms, treatment, doctor_name, hospital, follow_up_date, notes, record_type, medications, allergies]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create health record error:', err);
    res.status(500).json({ error: 'Failed to create health record.' });
  }
};

exports.update = async (req, res) => {
  try {
    // Accept both frontend and DB field names
    const illness = req.body.title || req.body.illness;
    const symptoms = req.body.description || req.body.symptoms;
    const treatment = req.body.medications || req.body.treatment;
    const follow_up_date = req.body.next_appointment || req.body.follow_up_date;
    const { doctor_name, hospital, is_resolved, notes } = req.body;
    const record_type = req.body.record_type;
    const medications = req.body.medications;
    const allergies = req.body.allergies;

    const result = await db.query(
      `UPDATE health_records SET illness=COALESCE($1,illness), symptoms=COALESCE($2,symptoms),
       treatment=COALESCE($3,treatment), doctor_name=COALESCE($4,doctor_name),
       hospital=COALESCE($5,hospital), follow_up_date=COALESCE($6,follow_up_date),
       is_resolved=COALESCE($7,is_resolved), notes=COALESCE($8,notes),
       record_type=COALESCE($9,record_type), medications=COALESCE($10,medications),
       allergies=COALESCE($11,allergies), version=version+1
       WHERE id=$12 AND recorded_by=$13 RETURNING *,
       illness as title, symptoms as description, record_date as date, follow_up_date as next_appointment`,
      [illness, symptoms, treatment, doctor_name, hospital, follow_up_date, is_resolved, notes, record_type, medications, allergies, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update health record error:', err);
    res.status(500).json({ error: 'Failed to update health record.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM health_records WHERE id = $1 AND recorded_by = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Record not found.' });
    res.json({ message: 'Record deleted.' });
  } catch (err) {
    console.error('Delete health record error:', err);
    res.status(500).json({ error: 'Failed to delete health record.' });
  }
};
