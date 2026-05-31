const db = require('../config/db');

exports.list = async (req, res) => {
  try {
    const { child_id, status } = req.query;
    let query = `SELECT n.*, c.first_name, c.last_name,
        c.first_name || ' ' || c.last_name as child_name,
        b.name as bucket_name, b.color as bucket_color
      FROM needs_log n
      JOIN children c ON c.id = n.child_id
      LEFT JOIN buckets b ON b.id = n.bucket_id
      WHERE n.parent_id = $1`;
    const params = [req.user.id];
    let i = 2;
    if (child_id) { query += ` AND n.child_id = $${i++}`; params.push(child_id); }
    if (status) { query += ` AND n.status = $${i++}`; params.push(status); }
    query += ' ORDER BY CASE n.priority WHEN \'urgent\' THEN 1 WHEN \'high\' THEN 2 WHEN \'normal\' THEN 3 ELSE 4 END, n.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List needs error:', err);
    res.status(500).json({ error: 'Failed to fetch needs.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { child_id, category, item_name, description, estimated_cost, priority, bucket_id, notes, requested_by } = req.body;
    if (!child_id || !item_name) return res.status(400).json({ error: 'child_id and item_name required.' });
    const own = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });
    const result = await db.query(
      `INSERT INTO needs_log (child_id, parent_id, category, item_name, description, estimated_cost, priority, bucket_id, notes, requested_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [child_id, req.user.id, category || 'general', item_name, description || null,
       estimated_cost || 0, priority || 'normal', bucket_id || null, notes || null, requested_by || 'parent']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create need error:', err);
    res.status(500).json({ error: 'Failed to create.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { category, item_name, description, estimated_cost, priority, status, bucket_id, notes } = req.body;
    const result = await db.query(
      `UPDATE needs_log SET
        category=COALESCE($1,category), item_name=COALESCE($2,item_name),
        description=COALESCE($3,description), estimated_cost=COALESCE($4,estimated_cost),
        priority=COALESCE($5,priority), status=COALESCE($6,status),
        bucket_id=COALESCE($7,bucket_id), notes=COALESCE($8,notes), updated_at=NOW()
       WHERE id=$9 AND parent_id=$10 RETURNING *`,
      [category, item_name, description, estimated_cost, priority, status, bucket_id, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update need error:', err);
    res.status(500).json({ error: 'Failed to update.' });
  }
};

// Mark fulfilled — optionally debit bucket
exports.fulfill = async (req, res) => {
  try {
    const { actual_cost, debit_bucket } = req.body;
    const n = await db.query('SELECT * FROM needs_log WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (n.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const need = n.rows[0];
    const cost = actual_cost != null ? parseFloat(actual_cost) : parseFloat(need.estimated_cost) || 0;

    if (debit_bucket && need.bucket_id && cost > 0) {
      const b = await db.query('SELECT * FROM buckets WHERE id = $1', [need.bucket_id]);
      if (b.rows.length > 0) {
        const bal = parseFloat(b.rows[0].balance);
        if (bal < cost) return res.status(400).json({ error: 'Insufficient bucket balance.' });
        const newBal = bal - cost;
        await db.query('UPDATE buckets SET balance = $1, version = version + 1 WHERE id = $2', [newBal, need.bucket_id]);
        await db.query(
          `INSERT INTO bucket_transactions (bucket_id, child_id, type, amount, description, reference, created_by)
           VALUES ($1,$2,'debit',$3,$4,$5,$6)`,
          [need.bucket_id, need.child_id, cost, `Need: ${need.item_name}`, `need:${need.id}`, req.user.id]
        );
      }
    }

    const result = await db.query(
      `UPDATE needs_log SET status='purchased', actual_cost=$1, fulfilled_at=NOW(), updated_at=NOW()
       WHERE id=$2 AND parent_id=$3 RETURNING *`,
      [cost, req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Fulfill need error:', err);
    res.status(500).json({ error: 'Failed to fulfill.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM needs_log WHERE id = $1 AND parent_id = $2 RETURNING id', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    console.error('Delete need error:', err);
    res.status(500).json({ error: 'Failed to delete.' });
  }
};
