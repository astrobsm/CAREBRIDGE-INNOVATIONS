const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { child_id, event_type } = req.query;
    let query = 'SELECT * FROM events WHERE parent_id = $1';
    const params = [req.user.id];
    let idx = 2;
    if (child_id) { query += ` AND child_id = $${idx++}`; params.push(child_id); }
    if (event_type) { query += ` AND event_type = $${idx++}`; params.push(event_type); }
    query += ' ORDER BY event_date';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
};

exports.getUpcoming = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const result = await db.query(
      `SELECT e.*, c.first_name, c.last_name FROM events e
       LEFT JOIN children c ON c.id = e.child_id
       WHERE e.parent_id = $1 AND (
         (e.is_recurring = TRUE AND
           (EXTRACT(MONTH FROM e.event_date) * 100 + EXTRACT(DAY FROM e.event_date))
           BETWEEN
           (EXTRACT(MONTH FROM CURRENT_DATE) * 100 + EXTRACT(DAY FROM CURRENT_DATE))
           AND
           (EXTRACT(MONTH FROM (CURRENT_DATE + ($2 || ' days')::interval)) * 100 + EXTRACT(DAY FROM (CURRENT_DATE + ($2 || ' days')::interval)))
         )
         OR (e.is_recurring = FALSE AND e.event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + ($2 || ' days')::interval)
       ) ORDER BY e.event_date`,
      [req.user.id, days]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get upcoming events error:', err);
    res.status(500).json({ error: 'Failed to fetch upcoming events.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { child_id, title, description, event_type, event_date, is_recurring, reminder_days_before } = req.body;
    if (!title || !event_date) return res.status(400).json({ error: 'Title and event_date are required.' });
    const result = await db.query(
      `INSERT INTO events (parent_id, child_id, title, description, event_type, event_date, is_recurring, reminder_days_before)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, child_id || null, title, description, event_type || 'other', event_date, is_recurring !== false, reminder_days_before || 7]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, event_type, event_date, is_recurring, reminder_days_before } = req.body;
    const result = await db.query(
      `UPDATE events SET title=COALESCE($1,title), description=COALESCE($2,description),
       event_type=COALESCE($3,event_type), event_date=COALESCE($4,event_date),
       is_recurring=COALESCE($5,is_recurring), reminder_days_before=COALESCE($6,reminder_days_before),
       version=version+1 WHERE id=$7 AND parent_id=$8 RETURNING *`,
      [title, description, event_type, event_date, is_recurring, reminder_days_before, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Failed to update event.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM events WHERE id = $1 AND parent_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
};
