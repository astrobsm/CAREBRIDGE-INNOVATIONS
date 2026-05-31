const db = require('../config/db');

// Process task completion: reward or penalty with transfer logic
exports.processTaskCompletion = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { assignment_id } = req.body;

    // Get assignment details
    const aResult = await client.query(
      `SELECT ta.*, t.reward_amount, t.penalty_amount, t.title as task_title
       FROM task_assignments ta JOIN tasks t ON t.id = ta.task_id
       WHERE ta.id = $1 AND ta.assigned_by = $2`,
      [assignment_id, req.user.id]
    );
    if (aResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Assignment not found.' });
    }

    const assignment = aResult.rows[0];

    if (assignment.status === 'completed') {
      // REWARD: Add reward to completing child's wallet
      const wallet = await client.query('SELECT * FROM wallets WHERE child_id = $1', [assignment.child_id]);
      if (wallet.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Wallet not found.' }); }

      const newBalance = parseFloat(wallet.rows[0].balance) + parseFloat(assignment.reward_amount);

      await client.query('UPDATE wallets SET balance = $1, version = version + 1 WHERE child_id = $2', [newBalance, assignment.child_id]);
      await client.query(
        `INSERT INTO transactions (child_id, wallet_id, type, amount, balance_after, description, reference_type, reference_id, created_by)
         VALUES ($1,$2,'bonus',$3,$4,$5,'task_assignment',$6,$7)`,
        [assignment.child_id, wallet.rows[0].id, assignment.reward_amount, newBalance,
         `Reward for completing: ${assignment.task_title}`, assignment.id, req.user.id]
      );

      // Performance bonus for rating 4-5
      if (assignment.performance_rating >= 4) {
        const bonus = parseFloat(assignment.reward_amount) * 0.25;
        const bonusBalance = newBalance + bonus;
        await client.query('UPDATE wallets SET balance = $1 WHERE child_id = $2', [bonusBalance, assignment.child_id]);
        await client.query(
          `INSERT INTO transactions (child_id, wallet_id, type, amount, balance_after, description, reference_type, reference_id, created_by)
           VALUES ($1,$2,'bonus',$3,$4,$5,'task_assignment',$6,$7)`,
          [assignment.child_id, wallet.rows[0].id, bonus, bonusBalance,
           `Performance bonus (rated ${assignment.performance_rating}/5)`, assignment.id, req.user.id]
        );
      }
    } else if (assignment.status === 'failed') {
      // PENALTY: Deduct from failing child
      const wallet = await client.query('SELECT * FROM wallets WHERE child_id = $1', [assignment.child_id]);
      if (wallet.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Wallet not found.' }); }

      const newBalance = parseFloat(wallet.rows[0].balance) - parseFloat(assignment.penalty_amount);
      await client.query('UPDATE wallets SET balance = $1, version = version + 1 WHERE child_id = $2', [newBalance, assignment.child_id]);
      await client.query(
        `INSERT INTO transactions (child_id, wallet_id, type, amount, balance_after, description, reference_type, reference_id, created_by)
         VALUES ($1,$2,'penalty',$3,$4,$5,'task_assignment',$6,$7)`,
        [assignment.child_id, wallet.rows[0].id, -assignment.penalty_amount, newBalance,
         `Penalty for failing: ${assignment.task_title}`, assignment.id, req.user.id]
      );

      // TRANSFER: If reassigned_to exists, transfer penalty amount to that child
      if (assignment.reassigned_to) {
        const receiverWallet = await client.query('SELECT * FROM wallets WHERE child_id = $1', [assignment.reassigned_to]);
        if (receiverWallet.rows.length > 0) {
          const receiverBalance = parseFloat(receiverWallet.rows[0].balance) + parseFloat(assignment.penalty_amount);
          await client.query('UPDATE wallets SET balance = $1, version = version + 1 WHERE child_id = $2', [receiverBalance, assignment.reassigned_to]);

          // Transfer out record for failing child
          await client.query(
            `INSERT INTO transactions (child_id, wallet_id, type, amount, balance_after, description, reference_type, reference_id, related_child_id, created_by)
             VALUES ($1,$2,'transfer_out',$3,$4,$5,'task_assignment',$6,$7,$8)`,
            [assignment.child_id, wallet.rows[0].id, -assignment.penalty_amount, newBalance,
             `Transfer to sibling for completing: ${assignment.task_title}`, assignment.id, assignment.reassigned_to, req.user.id]
          );

          // Transfer in record for completing child
          await client.query(
            `INSERT INTO transactions (child_id, wallet_id, type, amount, balance_after, description, reference_type, reference_id, related_child_id, created_by)
             VALUES ($1,$2,'transfer_in',$3,$4,$5,'task_assignment',$6,$7,$8)`,
            [assignment.reassigned_to, receiverWallet.rows[0].id, assignment.penalty_amount, receiverBalance,
             `Received from sibling for completing: ${assignment.task_title}`, assignment.id, assignment.child_id, req.user.id]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Payroll processed successfully.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Process task completion error:', err);
    res.status(500).json({ error: 'Failed to process payroll.' });
  } finally {
    client.release();
  }
};

// Process monthly stipend for all children
exports.processMonthlyStipend = async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const children = await client.query(
      `SELECT c.id as child_id, w.id as wallet_id, w.balance, w.base_stipend
       FROM children c JOIN wallets w ON w.child_id = c.id
       WHERE c.parent_id = $1 AND c.is_active = TRUE AND w.base_stipend > 0`,
      [req.user.id]
    );

    const results = [];
    for (const child of children.rows) {
      const newBalance = parseFloat(child.balance) + parseFloat(child.base_stipend);
      await client.query('UPDATE wallets SET balance = $1, version = version + 1 WHERE id = $2', [newBalance, child.wallet_id]);
      await client.query(
        `INSERT INTO transactions (child_id, wallet_id, type, amount, balance_after, description, reference_type, created_by)
         VALUES ($1,$2,'stipend',$3,$4,'Monthly stipend','monthly_stipend',$5)`,
        [child.child_id, child.wallet_id, child.base_stipend, newBalance, req.user.id]
      );
      results.push({ child_id: child.child_id, stipend: child.base_stipend, new_balance: newBalance });
    }

    await client.query('COMMIT');
    res.json({ message: 'Monthly stipends processed.', results });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Process stipend error:', err);
    res.status(500).json({ error: 'Failed to process stipends.' });
  } finally {
    client.release();
  }
};

// Get wallet details for a child
exports.getWallet = async (req, res) => {
  try {
    const wallet = await db.query(
      `SELECT w.*, c.first_name, c.last_name
       FROM wallets w JOIN children c ON c.id = w.child_id
       WHERE w.child_id = $1 AND c.parent_id = $2`,
      [req.params.childId, req.user.id]
    );
    if (wallet.rows.length === 0) return res.status(404).json({ error: 'Wallet not found.' });
    res.json(wallet.rows[0]);
  } catch (err) {
    console.error('Get wallet error:', err);
    res.status(500).json({ error: 'Failed to fetch wallet.' });
  }
};

// Update base stipend
exports.updateStipend = async (req, res) => {
  try {
    const { base_stipend } = req.body;
    if (base_stipend === undefined || base_stipend < 0) {
      return res.status(400).json({ error: 'Valid base_stipend is required.' });
    }

    // Verify child belongs to parent
    const child = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [req.params.childId, req.user.id]);
    if (child.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });

    const result = await db.query(
      'UPDATE wallets SET base_stipend = $1, version = version + 1 WHERE child_id = $2 RETURNING *',
      [base_stipend, req.params.childId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update stipend error:', err);
    res.status(500).json({ error: 'Failed to update stipend.' });
  }
};

// Get transactions for a child
exports.getTransactions = async (req, res) => {
  try {
    const { child_id, type, start_date, end_date, limit: lim } = req.query;
    let query = `
      SELECT t.*, c.first_name, c.last_name
      FROM transactions t JOIN children c ON c.id = t.child_id
      WHERE c.parent_id = $1`;
    const params = [req.user.id];
    let idx = 2;

    if (child_id) { query += ` AND t.child_id = $${idx++}`; params.push(child_id); }
    if (type) { query += ` AND t.type = $${idx++}`; params.push(type); }
    if (start_date) { query += ` AND t.created_at >= $${idx++}`; params.push(start_date); }
    if (end_date) { query += ` AND t.created_at <= $${idx++}`; params.push(end_date); }

    query += ' ORDER BY t.created_at DESC';
    if (lim) { query += ` LIMIT $${idx++}`; params.push(parseInt(lim, 10)); }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions.' });
  }
};

// Monthly summary
exports.getMonthlySummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month, 10) || new Date().getMonth() + 1;
    const y = parseInt(year, 10) || new Date().getFullYear();

    const result = await db.query(
      `SELECT c.id as child_id, c.first_name, c.last_name, w.balance,
        COALESCE(SUM(CASE WHEN t.type = 'stipend' THEN t.amount ELSE 0 END), 0) as total_stipend,
        COALESCE(SUM(CASE WHEN t.type = 'bonus' THEN t.amount ELSE 0 END), 0) as total_bonus,
        COALESCE(SUM(CASE WHEN t.type = 'penalty' THEN ABS(t.amount) ELSE 0 END), 0) as total_penalty,
        COALESCE(SUM(CASE WHEN t.type = 'transfer_in' THEN t.amount ELSE 0 END), 0) as total_transfer_in,
        COALESCE(SUM(CASE WHEN t.type = 'transfer_out' THEN ABS(t.amount) ELSE 0 END), 0) as total_transfer_out
       FROM children c
       JOIN wallets w ON w.child_id = c.id
       LEFT JOIN transactions t ON t.child_id = c.id
         AND EXTRACT(MONTH FROM t.created_at) = $2
         AND EXTRACT(YEAR FROM t.created_at) = $3
       WHERE c.parent_id = $1 AND c.is_active = TRUE
       GROUP BY c.id, c.first_name, c.last_name, w.balance
       ORDER BY c.first_name`,
      [req.user.id, m, y]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get monthly summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary.' });
  }
};
