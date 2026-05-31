const db = require('../config/db');

// ==================== SCHEDULES ====================

exports.getSchedules = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM chore_items ci WHERE ci.schedule_id = s.id) AS item_count,
        (SELECT COUNT(DISTINCT ca.child_id) FROM chore_assignments ca
         JOIN chore_items ci2 ON ci2.id = ca.chore_item_id WHERE ci2.schedule_id = s.id) AS children_count
       FROM chore_schedules s WHERE s.parent_id = $1 ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get schedules error:', err);
    res.status(500).json({ error: 'Failed to fetch schedules.' });
  }
};

exports.getScheduleById = async (req, res) => {
  try {
    const schedule = await db.query(
      'SELECT * FROM chore_schedules WHERE id = $1 AND parent_id = $2',
      [req.params.id, req.user.id]
    );
    if (schedule.rows.length === 0) return res.status(404).json({ error: 'Schedule not found.' });

    const items = await db.query(
      `SELECT ci.*,
        COALESCE(json_agg(
          json_build_object('id', ca.id, 'child_id', ca.child_id, 'child_name',
            (SELECT c.first_name || ' ' || c.last_name FROM children c WHERE c.id = ca.child_id))
        ) FILTER (WHERE ca.id IS NOT NULL), '[]') AS assignments
       FROM chore_items ci
       LEFT JOIN chore_assignments ca ON ca.chore_item_id = ci.id
       WHERE ci.schedule_id = $1
       GROUP BY ci.id
       ORDER BY ci.created_at`,
      [req.params.id]
    );

    res.json({ ...schedule.rows[0], items: items.rows });
  } catch (err) {
    console.error('Get schedule error:', err);
    res.status(500).json({ error: 'Failed to fetch schedule.' });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const { title, description, start_date } = req.body;
    if (!title || !start_date) return res.status(400).json({ error: 'Title and start_date are required.' });

    const start = new Date(start_date);
    const end = new Date(start);
    end.setDate(end.getDate() + 13); // 2-week period (14 days)

    const result = await db.query(
      `INSERT INTO chore_schedules (parent_id, title, description, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, description, start.toISOString().split('T')[0], end.toISOString().split('T')[0]]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create schedule error:', err);
    res.status(500).json({ error: 'Failed to create schedule.' });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const result = await db.query(
      `UPDATE chore_schedules SET title=COALESCE($1,title), description=COALESCE($2,description),
       status=COALESCE($3,status), version=version+1
       WHERE id=$4 AND parent_id=$5 RETURNING *`,
      [title, description, status, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update schedule error:', err);
    res.status(500).json({ error: 'Failed to update schedule.' });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM chore_schedules WHERE id = $1 AND parent_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found.' });
    res.json({ message: 'Schedule deleted.' });
  } catch (err) {
    console.error('Delete schedule error:', err);
    res.status(500).json({ error: 'Failed to delete schedule.' });
  }
};

// ==================== CHORE ITEMS ====================

exports.addItem = async (req, res) => {
  try {
    // Verify schedule belongs to parent
    const schedule = await db.query(
      'SELECT id FROM chore_schedules WHERE id = $1 AND parent_id = $2',
      [req.params.id, req.user.id]
    );
    if (schedule.rows.length === 0) return res.status(404).json({ error: 'Schedule not found.' });

    const { title, description, icon, points } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const result = await db.query(
      `INSERT INTO chore_items (schedule_id, title, description, icon, points)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, title, description, icon || '🧹', points || 1]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add chore item error:', err);
    res.status(500).json({ error: 'Failed to add chore item.' });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { title, description, icon, points } = req.body;
    const result = await db.query(
      `UPDATE chore_items SET title=COALESCE($1,title), description=COALESCE($2,description),
       icon=COALESCE($3,icon), points=COALESCE($4,points), version=version+1
       WHERE id=$5 AND schedule_id IN (SELECT id FROM chore_schedules WHERE parent_id=$6) RETURNING *`,
      [title, description, icon, points, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Chore item not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update chore item error:', err);
    res.status(500).json({ error: 'Failed to update chore item.' });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM chore_items WHERE id=$1 AND schedule_id IN
       (SELECT id FROM chore_schedules WHERE parent_id=$2) RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Chore item not found.' });
    res.json({ message: 'Chore item deleted.' });
  } catch (err) {
    console.error('Delete chore item error:', err);
    res.status(500).json({ error: 'Failed to delete chore item.' });
  }
};

// ==================== ASSIGNMENTS ====================

exports.assignChore = async (req, res) => {
  try {
    const { child_id } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id is required.' });

    // Verify child belongs to parent
    const child = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (child.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });

    // Verify chore item belongs to parent
    const item = await db.query(
      `SELECT ci.id FROM chore_items ci
       JOIN chore_schedules cs ON cs.id = ci.schedule_id
       WHERE ci.id = $1 AND cs.parent_id = $2`,
      [req.params.id, req.user.id]
    );
    if (item.rows.length === 0) return res.status(404).json({ error: 'Chore item not found.' });

    // Check if already assigned
    const existing = await db.query(
      'SELECT id FROM chore_assignments WHERE chore_item_id = $1 AND child_id = $2',
      [req.params.id, child_id]
    );
    if (existing.rows.length > 0) return res.status(409).json({ error: 'Chore already assigned to this child.' });

    const result = await db.query(
      `INSERT INTO chore_assignments (chore_item_id, child_id, assigned_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, child_id, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Assign chore error:', err);
    res.status(500).json({ error: 'Failed to assign chore.' });
  }
};

exports.removeAssignment = async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM chore_assignments WHERE id=$1 AND assigned_by=$2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Assignment not found.' });
    res.json({ message: 'Assignment removed.' });
  } catch (err) {
    console.error('Remove assignment error:', err);
    res.status(500).json({ error: 'Failed to remove assignment.' });
  }
};

// ==================== DAILY LOGS ====================

exports.getDailyLogs = async (req, res) => {
  try {
    const { date, schedule_id } = req.query;
    const logDate = date || new Date().toISOString().split('T')[0];

    let query = `
      SELECT dl.*, ca.child_id, ca.chore_item_id,
        ci.title AS chore_title, ci.icon AS chore_icon, ci.points,
        c.first_name || ' ' || c.last_name AS child_name,
        cs.title AS schedule_title
      FROM chore_daily_logs dl
      JOIN chore_assignments ca ON ca.id = dl.chore_assignment_id
      JOIN chore_items ci ON ci.id = ca.chore_item_id
      JOIN chore_schedules cs ON cs.id = ci.schedule_id
      JOIN children c ON c.id = ca.child_id
      WHERE cs.parent_id = $1 AND dl.log_date = $2`;
    const params = [req.user.id, logDate];

    if (schedule_id) {
      query += ' AND cs.id = $3';
      params.push(schedule_id);
    }

    query += ' ORDER BY c.first_name, ci.title';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get daily logs error:', err);
    res.status(500).json({ error: 'Failed to fetch daily logs.' });
  }
};

exports.assessDaily = async (req, res) => {
  try {
    const { status, rating, parent_comment } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const result = await db.query(
      `UPDATE chore_daily_logs SET status=$1, rating=$2, parent_comment=$3,
       assessed_by=$4, assessed_at=NOW()
       WHERE id=$5 AND chore_assignment_id IN (
         SELECT ca.id FROM chore_assignments ca
         JOIN chore_items ci ON ci.id = ca.chore_item_id
         JOIN chore_schedules cs ON cs.id = ci.schedule_id
         WHERE cs.parent_id = $4
       ) RETURNING *`,
      [status, rating || null, parent_comment || null, req.user.id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Daily log not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Assess daily error:', err);
    res.status(500).json({ error: 'Failed to assess daily log.' });
  }
};

exports.generateDailyLogs = async (req, res) => {
  try {
    const { schedule_id, date } = req.body;
    const logDate = date || new Date().toISOString().split('T')[0];

    // Verify schedule
    const schedule = await db.query(
      'SELECT * FROM chore_schedules WHERE id = $1 AND parent_id = $2 AND status = $3',
      [schedule_id, req.user.id, 'active']
    );
    if (schedule.rows.length === 0) return res.status(404).json({ error: 'Active schedule not found.' });

    // Check date is within schedule range
    const s = schedule.rows[0];
    if (logDate < s.start_date.toISOString().split('T')[0] || logDate > s.end_date.toISOString().split('T')[0]) {
      return res.status(400).json({ error: 'Date is outside the schedule range.' });
    }

    // Get all assignments for this schedule
    const assignments = await db.query(
      `SELECT ca.id FROM chore_assignments ca
       JOIN chore_items ci ON ci.id = ca.chore_item_id
       WHERE ci.schedule_id = $1`,
      [schedule_id]
    );

    if (assignments.rows.length === 0) return res.status(400).json({ error: 'No assignments found for this schedule.' });

    // Insert daily logs (skip conflicts for already-existing entries)
    let created = 0;
    for (const a of assignments.rows) {
      const result = await db.query(
        `INSERT INTO chore_daily_logs (chore_assignment_id, log_date)
         VALUES ($1, $2) ON CONFLICT (chore_assignment_id, log_date) DO NOTHING RETURNING id`,
        [a.id, logDate]
      );
      if (result.rows.length > 0) created++;
    }

    res.json({ message: `Generated ${created} daily log entries.`, created });
  } catch (err) {
    console.error('Generate daily logs error:', err);
    res.status(500).json({ error: 'Failed to generate daily logs.' });
  }
};
