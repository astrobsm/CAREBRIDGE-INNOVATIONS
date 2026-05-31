const db = require('../config/db');

exports.list = async (req, res) => {
  try {
    const { start, end, status, event_type } = req.query;
    let query = `SELECT * FROM family_events WHERE parent_id = $1`;
    const params = [req.user.id];
    let i = 2;
    if (start) { query += ` AND start_at >= $${i++}`; params.push(start); }
    if (end) { query += ` AND start_at <= $${i++}`; params.push(end); }
    if (status) { query += ` AND status = $${i++}`; params.push(status); }
    if (event_type) { query += ` AND event_type = $${i++}`; params.push(event_type); }
    query += ' ORDER BY start_at';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List family events error:', err);
    res.status(500).json({ error: 'Failed to fetch.' });
  }
};

exports.upcoming = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM family_events WHERE parent_id = $1 AND start_at >= NOW() AND status != 'cancelled'
       ORDER BY start_at LIMIT 20`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Upcoming family events error:', err);
    res.status(500).json({ error: 'Failed to fetch.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, event_type, start_at, end_at, location, budget, recurrence, icon, color, attendees, notes } = req.body;
    if (!title || !start_at) return res.status(400).json({ error: 'title and start_at required.' });
    const result = await db.query(
      `INSERT INTO family_events
        (parent_id, title, description, event_type, start_at, end_at, location, budget, recurrence, icon, color, attendees, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.id, title, description || null, event_type || 'outing', start_at, end_at || null,
       location || null, budget || 0, recurrence || 'none', icon || '🎉', color || '#9b59b6',
       attendees || [], notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create family event error:', err);
    res.status(500).json({ error: 'Failed to create.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, event_type, start_at, end_at, location, budget, recurrence, icon, color, status, attendees, notes } = req.body;
    const result = await db.query(
      `UPDATE family_events SET
        title=COALESCE($1,title), description=COALESCE($2,description), event_type=COALESCE($3,event_type),
        start_at=COALESCE($4,start_at), end_at=COALESCE($5,end_at), location=COALESCE($6,location),
        budget=COALESCE($7,budget), recurrence=COALESCE($8,recurrence), icon=COALESCE($9,icon),
        color=COALESCE($10,color), status=COALESCE($11,status), attendees=COALESCE($12,attendees),
        notes=COALESCE($13,notes), updated_at=NOW()
       WHERE id=$14 AND parent_id=$15 RETURNING *`,
      [title, description, event_type, start_at, end_at, location, budget, recurrence, icon, color, status, attendees, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update family event error:', err);
    res.status(500).json({ error: 'Failed to update.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM family_events WHERE id = $1 AND parent_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    console.error('Delete family event error:', err);
    res.status(500).json({ error: 'Failed to delete.' });
  }
};
