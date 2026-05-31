const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM tasks WHERE parent_id = $1 AND is_active = TRUE ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM tasks WHERE id = $1 AND parent_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: 'Failed to fetch task.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { title, description, category, priority, reward_amount, penalty_amount, is_recurring, recurrence_pattern } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const result = await db.query(
      `INSERT INTO tasks (parent_id, title, description, category, priority, reward_amount, penalty_amount, is_recurring, recurrence_pattern)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, title, description, category || 'chore', priority || 'medium',
       reward_amount || 0, penalty_amount || 0, is_recurring || false, recurrence_pattern]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Failed to create task.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, category, priority, reward_amount, penalty_amount, is_recurring, recurrence_pattern } = req.body;
    const result = await db.query(
      `UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description),
       category=COALESCE($3,category), priority=COALESCE($4,priority),
       reward_amount=COALESCE($5,reward_amount), penalty_amount=COALESCE($6,penalty_amount),
       is_recurring=COALESCE($7,is_recurring), recurrence_pattern=COALESCE($8,recurrence_pattern),
       version=version+1
       WHERE id=$9 AND parent_id=$10 RETURNING *`,
      [title, description, category, priority, reward_amount, penalty_amount, is_recurring, recurrence_pattern, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Failed to update task.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE tasks SET is_active = FALSE WHERE id = $1 AND parent_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found.' });
    res.json({ message: 'Task removed.' });
  } catch (err) {
    console.error('Remove task error:', err);
    res.status(500).json({ error: 'Failed to remove task.' });
  }
};

// --- Task Assignments ---
exports.assign = async (req, res) => {
  try {
    const { child_id, due_date } = req.body;
    if (!child_id) return res.status(400).json({ error: 'child_id is required.' });

    // Verify child belongs to this parent
    const child = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (child.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });

    const result = await db.query(
      `INSERT INTO task_assignments (task_id, child_id, assigned_by, due_date)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.params.id, child_id, req.user.id, due_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Assign task error:', err);
    res.status(500).json({ error: 'Failed to assign task.' });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const { child_id, status } = req.query;
    let query = `
      SELECT ta.*, t.title, t.description, t.category, t.priority, t.reward_amount, t.penalty_amount,
             c.first_name as child_first_name, c.last_name as child_last_name
      FROM task_assignments ta
      JOIN tasks t ON t.id = ta.task_id
      JOIN children c ON c.id = ta.child_id
      WHERE ta.assigned_by = $1`;
    const params = [req.user.id];
    let idx = 2;

    if (child_id) { query += ` AND ta.child_id = $${idx++}`; params.push(child_id); }
    if (status) { query += ` AND ta.status = $${idx++}`; params.push(status); }

    query += ' ORDER BY ta.due_date ASC NULLS LAST, ta.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get assignments error:', err);
    res.status(500).json({ error: 'Failed to fetch assignments.' });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const { status, performance_rating, parent_notes } = req.body;
    const assignmentId = req.params.assignmentId;

    const assignment = await db.query(
      `SELECT ta.*, t.reward_amount, t.penalty_amount
       FROM task_assignments ta JOIN tasks t ON t.id = ta.task_id
       WHERE ta.id = $1 AND ta.assigned_by = $2`,
      [assignmentId, req.user.id]
    );
    if (assignment.rows.length === 0) return res.status(404).json({ error: 'Assignment not found.' });

    const completed_at = status === 'completed' ? new Date() : null;

    const result = await db.query(
      `UPDATE task_assignments SET status=COALESCE($1,status), performance_rating=COALESCE($2,performance_rating),
       parent_notes=COALESCE($3,parent_notes), completed_at=COALESCE($4,completed_at), version=version+1
       WHERE id=$5 RETURNING *`,
      [status, performance_rating, parent_notes, completed_at, assignmentId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update assignment error:', err);
    res.status(500).json({ error: 'Failed to update assignment.' });
  }
};
