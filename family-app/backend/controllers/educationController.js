const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { child_id, status } = req.query;
    let query = `SELECT a.*, a.grade as score, c.first_name, c.last_name,
      c.first_name || ' ' || c.last_name as child_name
      FROM assignments a JOIN children c ON c.id = a.child_id WHERE a.parent_id = $1`;
    const params = [req.user.id];
    let idx = 2;
    if (child_id) { query += ` AND a.child_id = $${idx++}`; params.push(child_id); }
    if (status) { query += ` AND a.status = $${idx++}`; params.push(status); }
    query += ' ORDER BY a.due_date ASC NULLS LAST';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch assignments.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT a.*, c.first_name, c.last_name FROM assignments a JOIN children c ON c.id = a.child_id WHERE a.id = $1 AND a.parent_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get assignment error:', err);
    res.status(500).json({ error: 'Failed to fetch assignment.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { child_id, subject, title, description, due_date } = req.body;
    if (!child_id || !subject || !title) return res.status(400).json({ error: 'child_id, subject, and title are required.' });
    const result = await db.query(
      `INSERT INTO assignments (child_id, parent_id, subject, title, description, due_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [child_id, req.user.id, subject, title, description, due_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create assignment error:', err);
    res.status(500).json({ error: 'Failed to create assignment.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { subject, title, description, due_date, status, notes } = req.body;
    const grade = req.body.grade || req.body.score;
    const result = await db.query(
      `UPDATE assignments SET subject=COALESCE($1,subject), title=COALESCE($2,title),
       description=COALESCE($3,description), due_date=COALESCE($4,due_date),
       status=COALESCE($5,status), grade=COALESCE($6,grade), notes=COALESCE($7,notes),
       version=version+1 WHERE id=$8 AND parent_id=$9
       RETURNING *, grade as score`,
      [subject, title, description, due_date, status, grade, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update assignment error:', err);
    res.status(500).json({ error: 'Failed to update assignment.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM assignments WHERE id = $1 AND parent_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found.' });
    res.json({ message: 'Assignment deleted.' });
  } catch (err) {
    console.error('Delete assignment error:', err);
    res.status(500).json({ error: 'Failed to delete assignment.' });
  }
};
