const db = require('../config/db');

// ===== BUCKETS =====
exports.list = async (req, res) => {
  try {
    const { child_id } = req.query;
    if (!child_id) return res.status(400).json({ error: 'child_id required.' });
    const own = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });
    const result = await db.query(
      `SELECT * FROM buckets WHERE child_id = $1 AND is_active = TRUE ORDER BY sort_order, id`,
      [child_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List buckets error:', err);
    res.status(500).json({ error: 'Failed to fetch buckets.' });
  }
};

exports.create = async (req, res) => {
  try {
    const { child_id, name, description, allocation_pct, color, icon, sort_order } = req.body;
    if (!child_id || !name) return res.status(400).json({ error: 'child_id and name required.' });
    const own = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });
    const result = await db.query(
      `INSERT INTO buckets (child_id, name, description, allocation_pct, color, icon, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [child_id, name, description || null, allocation_pct || 0, color || '#3498db', icon || 'bucket', sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Bucket name already exists for this child.' });
    console.error('Create bucket error:', err);
    res.status(500).json({ error: 'Failed to create bucket.' });
  }
};

exports.update = async (req, res) => {
  try {
    const { name, description, allocation_pct, color, icon, sort_order, is_active } = req.body;
    const result = await db.query(
      `UPDATE buckets SET name=COALESCE($1,name), description=COALESCE($2,description),
       allocation_pct=COALESCE($3,allocation_pct), color=COALESCE($4,color),
       icon=COALESCE($5,icon), sort_order=COALESCE($6,sort_order),
       is_active=COALESCE($7,is_active), version=version+1
       WHERE id=$8 AND child_id IN (SELECT id FROM children WHERE parent_id = $9) RETURNING *`,
      [name, description, allocation_pct, color, icon, sort_order, is_active, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bucket not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update bucket error:', err);
    res.status(500).json({ error: 'Failed to update bucket.' });
  }
};

exports.remove = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE buckets SET is_active = FALSE
       WHERE id = $1 AND child_id IN (SELECT id FROM children WHERE parent_id = $2) RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Bucket not found.' });
    res.json({ message: 'Bucket deleted.' });
  } catch (err) {
    console.error('Delete bucket error:', err);
    res.status(500).json({ error: 'Failed to delete bucket.' });
  }
};

// Manual debit (e.g. parent bought toothpaste from Personal Care bucket)
exports.debit = async (req, res) => {
  try {
    const { bucket_id, amount, description, reference } = req.body;
    if (!bucket_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'bucket_id and positive amount required.' });
    }
    const b = await db.query(
      `SELECT b.*, c.parent_id FROM buckets b
       JOIN children c ON c.id = b.child_id
       WHERE b.id = $1 AND c.parent_id = $2`,
      [bucket_id, req.user.id]
    );
    if (b.rows.length === 0) return res.status(404).json({ error: 'Bucket not found.' });
    const bucket = b.rows[0];
    const amt = parseFloat(amount);
    if (parseFloat(bucket.balance) < amt) {
      return res.status(400).json({ error: 'Insufficient bucket balance.' });
    }
    const newBalance = parseFloat(bucket.balance) - amt;
    await db.query('UPDATE buckets SET balance = $1, version = version + 1 WHERE id = $2', [newBalance, bucket_id]);
    const tx = await db.query(
      `INSERT INTO bucket_transactions (bucket_id, child_id, type, amount, description, reference, created_by)
       VALUES ($1,$2,'debit',$3,$4,$5,$6) RETURNING *`,
      [bucket_id, bucket.child_id, amt, description || 'Withdrawal', reference || null, req.user.id]
    );
    res.status(201).json({ transaction: tx.rows[0], new_balance: newBalance });
  } catch (err) {
    console.error('Bucket debit error:', err);
    res.status(500).json({ error: 'Failed to record debit.' });
  }
};

// Manual credit (e.g. gift, allowance)
exports.credit = async (req, res) => {
  try {
    const { bucket_id, amount, description, reference } = req.body;
    if (!bucket_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'bucket_id and positive amount required.' });
    }
    const b = await db.query(
      `SELECT b.*, c.parent_id FROM buckets b
       JOIN children c ON c.id = b.child_id
       WHERE b.id = $1 AND c.parent_id = $2`,
      [bucket_id, req.user.id]
    );
    if (b.rows.length === 0) return res.status(404).json({ error: 'Bucket not found.' });
    const bucket = b.rows[0];
    const amt = parseFloat(amount);
    const newBalance = parseFloat(bucket.balance) + amt;
    await db.query('UPDATE buckets SET balance = $1, version = version + 1 WHERE id = $2', [newBalance, bucket_id]);
    const tx = await db.query(
      `INSERT INTO bucket_transactions (bucket_id, child_id, type, amount, description, reference, created_by)
       VALUES ($1,$2,'credit',$3,$4,$5,$6) RETURNING *`,
      [bucket_id, bucket.child_id, amt, description || 'Manual credit', reference || null, req.user.id]
    );
    res.status(201).json({ transaction: tx.rows[0], new_balance: newBalance });
  } catch (err) {
    console.error('Bucket credit error:', err);
    res.status(500).json({ error: 'Failed to record credit.' });
  }
};

exports.transactions = async (req, res) => {
  try {
    const { bucket_id, child_id, limit } = req.query;
    let query = `SELECT bt.*, b.name as bucket_name, b.color as bucket_color
      FROM bucket_transactions bt
      JOIN buckets b ON b.id = bt.bucket_id
      WHERE b.child_id IN (SELECT id FROM children WHERE parent_id = $1)`;
    const params = [req.user.id];
    let idx = 2;
    if (bucket_id) { query += ` AND bt.bucket_id = $${idx++}`; params.push(bucket_id); }
    if (child_id) { query += ` AND bt.child_id = $${idx++}`; params.push(child_id); }
    query += ` ORDER BY bt.created_at DESC LIMIT $${idx}`;
    params.push(parseInt(limit) || 100);
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Bucket transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
};
