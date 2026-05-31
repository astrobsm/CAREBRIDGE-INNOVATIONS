const db = require('../config/db');

// ============================================================
// ACTIVITY LOG endpoints
// ============================================================
exports.listActivity = async (req, res) => {
  try {
    const { child_id, activity_type, status, start_date, end_date, limit } = req.query;
    let query = `SELECT al.*, c.first_name, c.last_name,
        c.first_name || ' ' || c.last_name as child_name
      FROM activity_logs al
      JOIN children c ON c.id = al.child_id
      WHERE c.parent_id = $1`;
    const params = [req.user.id];
    let idx = 2;
    if (child_id) { query += ` AND al.child_id = $${idx++}`; params.push(child_id); }
    if (activity_type) { query += ` AND al.activity_type = $${idx++}`; params.push(activity_type); }
    if (status) { query += ` AND al.status = $${idx++}`; params.push(status); }
    if (start_date) { query += ` AND al.occurred_at >= $${idx++}`; params.push(start_date); }
    if (end_date) { query += ` AND al.occurred_at < ($${idx++}::date + INTERVAL '1 day')`; params.push(end_date); }
    query += ` ORDER BY al.occurred_at DESC LIMIT $${idx}`;
    params.push(parseInt(limit) || 100);
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List activity error:', err);
    res.status(500).json({ error: 'Failed to fetch activity.' });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const { child_id, activity_type, title, description, status, points, payout } = req.body;
    if (!child_id || !activity_type || !title || !status) {
      return res.status(400).json({ error: 'child_id, activity_type, title, status required.' });
    }
    const own = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });
    const result = await db.query(
      `INSERT INTO activity_logs (child_id, parent_id, activity_type, title, description, status, points, payout)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [child_id, req.user.id, activity_type, title, description || null, status, points || 0, payout || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create activity error:', err);
    res.status(500).json({ error: 'Failed to log activity.' });
  }
};

// ============================================================
// ANALYTICS — performance summary per child
// ============================================================
exports.summary = async (req, res) => {
  try {
    const { child_id, days } = req.query;
    if (!child_id) return res.status(400).json({ error: 'child_id required.' });
    const own = await db.query('SELECT id, first_name, last_name FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });
    const period = parseInt(days) || 7;

    // Overall stats
    const stats = await db.query(
      `SELECT
         COUNT(*)::int AS total_activities,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'late')::int AS late,
         COUNT(*) FILTER (WHERE status = 'missed')::int AS missed,
         COALESCE(SUM(points),0)::int AS total_points,
         COALESCE(SUM(payout),0) AS total_earned
       FROM activity_logs
       WHERE child_id = $1 AND occurred_at >= NOW() - ($2 || ' days')::interval`,
      [child_id, period]
    );

    // Breakdown by activity type
    const byType = await db.query(
      `SELECT activity_type,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'late')::int AS late,
         COUNT(*) FILTER (WHERE status = 'missed')::int AS missed,
         COALESCE(SUM(points),0)::int AS points,
         COALESCE(SUM(payout),0) AS earned
       FROM activity_logs
       WHERE child_id = $1 AND occurred_at >= NOW() - ($2 || ' days')::interval
       GROUP BY activity_type ORDER BY total DESC`,
      [child_id, period]
    );

    // Daily trend
    const trend = await db.query(
      `SELECT DATE(occurred_at) AS day,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'late')::int AS late,
         COUNT(*) FILTER (WHERE status = 'missed')::int AS missed,
         COALESCE(SUM(points),0)::int AS points
       FROM activity_logs
       WHERE child_id = $1 AND occurred_at >= NOW() - ($2 || ' days')::interval
       GROUP BY DATE(occurred_at) ORDER BY day`,
      [child_id, period]
    );

    // Streak: consecutive days with at least one completion and zero misses
    const streakRows = await db.query(
      `WITH days AS (
         SELECT DATE(occurred_at) AS day,
           BOOL_OR(status = 'completed') AS had_completed,
           BOOL_OR(status = 'missed') AS had_missed
         FROM activity_logs
         WHERE child_id = $1
         GROUP BY DATE(occurred_at)
         ORDER BY day DESC
       )
       SELECT * FROM days LIMIT 60`,
      [child_id]
    );
    let streak = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < streakRows.rows.length; i++) {
      const d = new Date(streakRows.rows[i].day);
      const expected = new Date(today); expected.setDate(today.getDate() - i);
      if (d.toDateString() !== expected.toDateString()) break;
      if (streakRows.rows[i].had_missed || !streakRows.rows[i].had_completed) break;
      streak++;
    }

    const s = stats.rows[0];
    const completionRate = s.total_activities > 0
      ? Math.round((s.completed / s.total_activities) * 100)
      : 0;
    const punctualityRate = (s.completed + s.late) > 0
      ? Math.round((s.completed / (s.completed + s.late)) * 100)
      : 0;

    // Grade: A+ >= 95, A >= 85, B >= 70, C >= 55, D >= 40, F < 40 (uses completion + punctuality)
    const score = Math.round((completionRate * 0.6) + (punctualityRate * 0.4));
    let grade = 'F';
    if (score >= 95) grade = 'A+';
    else if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 55) grade = 'C';
    else if (score >= 40) grade = 'D';

    res.json({
      child: own.rows[0],
      period_days: period,
      stats: s,
      completion_rate: completionRate,
      punctuality_rate: punctualityRate,
      score, grade, streak,
      by_type: byType.rows,
      trend: trend.rows
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary.' });
  }
};

// Leaderboard across siblings
exports.leaderboard = async (req, res) => {
  try {
    const { days } = req.query;
    const period = parseInt(days) || 7;
    const result = await db.query(
      `SELECT c.id, c.first_name, c.last_name,
         c.first_name || ' ' || c.last_name as name,
         COUNT(al.*) FILTER (WHERE al.status = 'completed')::int AS completed,
         COUNT(al.*) FILTER (WHERE al.status = 'late')::int AS late,
         COUNT(al.*) FILTER (WHERE al.status = 'missed')::int AS missed,
         COALESCE(SUM(al.points),0)::int AS points,
         COALESCE(SUM(al.payout),0) AS earned
       FROM children c
       LEFT JOIN activity_logs al ON al.child_id = c.id
         AND al.occurred_at >= NOW() - ($1 || ' days')::interval
       WHERE c.parent_id = $2
       GROUP BY c.id, c.first_name, c.last_name
       ORDER BY points DESC, earned DESC`,
      [period, req.user.id]
    );
    res.json({ period_days: period, leaderboard: result.rows });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard.' });
  }
};

// ============================================================
// AWARDS & ADMONITIONS
// ============================================================
exports.listAwards = async (req, res) => {
  try {
    const { child_id, record_type } = req.query;
    let query = `SELECT pr.*, c.first_name, c.last_name,
        c.first_name || ' ' || c.last_name as child_name
      FROM performance_records pr
      JOIN children c ON c.id = pr.child_id
      WHERE pr.parent_id = $1`;
    const params = [req.user.id];
    let idx = 2;
    if (child_id) { query += ` AND pr.child_id = $${idx++}`; params.push(child_id); }
    if (record_type) { query += ` AND pr.record_type = $${idx++}`; params.push(record_type); }
    query += ' ORDER BY pr.issued_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List awards error:', err);
    res.status(500).json({ error: 'Failed to fetch awards.' });
  }
};

exports.createAward = async (req, res) => {
  try {
    const { child_id, record_type, title, description, icon, points, bonus_payout, period_start, period_end } = req.body;
    if (!child_id || !record_type || !title) {
      return res.status(400).json({ error: 'child_id, record_type, title required.' });
    }
    if (!['award', 'admonition'].includes(record_type)) {
      return res.status(400).json({ error: 'record_type must be award or admonition.' });
    }
    const own = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, req.user.id]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Child not found.' });

    const result = await db.query(
      `INSERT INTO performance_records (child_id, parent_id, record_type, title, description, icon, points, bonus_payout, period_start, period_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [child_id, req.user.id, record_type, title, description || null,
       icon || (record_type === 'award' ? 'star' : 'warning'),
       points || 0, bonus_payout || 0, period_start || null, period_end || null]
    );

    // If award has a bonus payout, credit it
    if (record_type === 'award' && bonus_payout && bonus_payout > 0) {
      const wallet = await db.query('SELECT * FROM wallets WHERE child_id = $1', [child_id]);
      if (wallet.rows.length > 0) {
        const w = wallet.rows[0];
        const newBal = parseFloat(w.balance) + parseFloat(bonus_payout);
        await db.query('UPDATE wallets SET balance = $1, version = version + 1 WHERE id = $2', [newBal, w.id]);
        await db.query(
          `INSERT INTO transactions (child_id, wallet_id, type, amount, balance_after, description, reference_type, created_by)
           VALUES ($1,$2,'credit',$3,$4,$5,'award',$6)`,
          [child_id, w.id, bonus_payout, newBal, `Award: ${title}`, req.user.id]
        );
      }
    }

    await db.query(
      `INSERT INTO activity_logs (child_id, parent_id, activity_type, activity_ref_id, title, description, status, points, payout)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [child_id, req.user.id, record_type, result.rows[0].id, title, description || null,
       record_type === 'award' ? 'completed' : 'missed',
       record_type === 'award' ? (points || 20) : -(points || 10),
       bonus_payout || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create award error:', err);
    res.status(500).json({ error: 'Failed to record.' });
  }
};

exports.deleteAward = async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM performance_records WHERE id = $1 AND parent_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    console.error('Delete award error:', err);
    res.status(500).json({ error: 'Failed to delete.' });
  }
};
