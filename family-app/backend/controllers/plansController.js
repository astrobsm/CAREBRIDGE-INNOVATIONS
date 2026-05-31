const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { plan_type, status } = req.query;
    let query = 'SELECT * FROM plans WHERE parent_id = $1';
    const params = [req.user.id];
    let idx = 2;
    if (plan_type) { query += ` AND plan_type = $${idx++}`; params.push(plan_type); }
    if (status) { query += ` AND status = $${idx++}`; params.push(status); }
    query += ' ORDER BY start_date DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get plans error:', err);
    res.status(500).json({ error: 'Failed to fetch plans.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const plan = await db.query('SELECT * FROM plans WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (plan.rows.length === 0) return res.status(404).json({ error: 'Plan not found.' });
    const goals = await db.query(
      `SELECT pg.*, c.first_name, c.last_name FROM plan_goals pg
       LEFT JOIN children c ON c.id = pg.child_id WHERE pg.plan_id = $1 ORDER BY pg.created_at`,
      [req.params.id]
    );
    res.json({ ...plan.rows[0], goals: goals.rows });
  } catch (err) {
    console.error('Get plan error:', err);
    res.status(500).json({ error: 'Failed to fetch plan.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, plan_type, start_date, end_date } = req.body;
    if (!title || !plan_type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Title, plan_type, start_date, and end_date are required.' });
    }
    const result = await db.query(
      `INSERT INTO plans (parent_id, title, description, plan_type, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, title, description, plan_type, start_date, end_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create plan error:', err);
    res.status(500).json({ error: 'Failed to create plan.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, status } = req.body;
    const result = await db.query(
      `UPDATE plans SET title=COALESCE($1,title), description=COALESCE($2,description),
       status=COALESCE($3,status), version=version+1 WHERE id=$4 AND parent_id=$5 RETURNING *`,
      [title, description, status, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update plan error:', err);
    res.status(500).json({ error: 'Failed to update plan.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM plans WHERE id = $1 AND parent_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found.' });
    res.json({ message: 'Plan deleted.' });
  } catch (err) {
    console.error('Delete plan error:', err);
    res.status(500).json({ error: 'Failed to delete plan.' });
  }
};

// Goals
exports.addGoal = async (req, res) => {
  try {
    const { child_id, title, description, target_value, linked_task_id } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    // Verify plan belongs to user
    const plan = await db.query('SELECT id FROM plans WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (plan.rows.length === 0) return res.status(404).json({ error: 'Plan not found.' });

    const result = await db.query(
      `INSERT INTO plan_goals (plan_id, child_id, title, description, target_value, linked_task_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.params.id, child_id || null, title, description, target_value, linked_task_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add goal error:', err);
    res.status(500).json({ error: 'Failed to add goal.' });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const { current_value, is_completed } = req.body;
    const completed_at = is_completed ? new Date() : null;
    const result = await db.query(
      `UPDATE plan_goals SET current_value=COALESCE($1,current_value), is_completed=COALESCE($2,is_completed),
       completed_at=COALESCE($3,completed_at), version=version+1 WHERE id=$4 RETURNING *`,
      [current_value, is_completed, completed_at, req.params.goalId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Goal not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ error: 'Failed to update goal.' });
  }
};
