const db = require('../config/db');

// ============================================================
// HELPERS
// ============================================================

/**
 * Credit a child's wallet and distribute across savings buckets
 * by their allocation percentages.
 */
async function creditEarnings(client, { child_id, amount, description, reference, created_by }) {
  if (!amount || amount <= 0) return;

  // 1. Credit main wallet
  const wallet = await client.query('SELECT * FROM wallets WHERE child_id = $1', [child_id]);
  if (wallet.rows.length === 0) return; // child has no wallet
  const w = wallet.rows[0];
  const newBalance = parseFloat(w.balance) + parseFloat(amount);
  await client.query('UPDATE wallets SET balance = $1, version = version + 1 WHERE id = $2', [newBalance, w.id]);
  await client.query(
    `INSERT INTO transactions (child_id, wallet_id, type, amount, balance_after, description, reference_type, created_by)
     VALUES ($1,$2,'credit',$3,$4,$5,$6,$7)`,
    [child_id, w.id, amount, newBalance, description, 'boarding', created_by]
  );

  // 2. Distribute across active buckets by allocation_pct
  const buckets = await client.query(
    'SELECT * FROM buckets WHERE child_id = $1 AND is_active = TRUE AND allocation_pct > 0',
    [child_id]
  );
  for (const b of buckets.rows) {
    const bucketAmount = (parseFloat(amount) * parseInt(b.allocation_pct)) / 100;
    if (bucketAmount <= 0) continue;
    const bucketBalance = parseFloat(b.balance) + bucketAmount;
    await client.query('UPDATE buckets SET balance = $1, version = version + 1 WHERE id = $2', [bucketBalance, b.id]);
    await client.query(
      `INSERT INTO bucket_transactions (bucket_id, child_id, type, amount, description, reference, created_by)
       VALUES ($1,$2,'credit',$3,$4,$5,$6)`,
      [b.id, child_id, bucketAmount.toFixed(2), description, reference, created_by]
    );
  }
}

async function logActivity(client, { child_id, parent_id, activity_type, activity_ref_id, title, description, status, points, payout }) {
  await client.query(
    `INSERT INTO activity_logs (child_id, parent_id, activity_type, activity_ref_id, title, description, status, points, payout)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [child_id, parent_id, activity_type, activity_ref_id || null, title, description || null, status, points || 0, payout || 0]
  );
}

async function verifyChildBelongsToParent(parent_id, child_id) {
  const r = await db.query('SELECT id FROM children WHERE id = $1 AND parent_id = $2', [child_id, parent_id]);
  return r.rows.length > 0;
}

// ============================================================
// ROUTINES
// ============================================================

exports.listRoutines = async (req, res) => {
  try {
    const { child_id } = req.query;
    let query = `SELECT r.*,
        c.first_name as child_first_name, c.last_name as child_last_name,
        (SELECT COUNT(*)::int FROM routine_events re WHERE re.routine_id = r.id AND re.is_active = TRUE) as event_count,
        (SELECT COALESCE(json_agg(re ORDER BY re.scheduled_time), '[]'::json)
           FROM routine_events re WHERE re.routine_id = r.id AND re.is_active = TRUE) as events
      FROM routines r
      LEFT JOIN children c ON c.id = r.child_id
      WHERE r.parent_id = $1 AND r.is_active = TRUE`;
    const params = [req.user.id];
    if (child_id) { query += ' AND (r.child_id = $2 OR r.child_id IS NULL)'; params.push(child_id); }
    query += ' ORDER BY r.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List routines error:', err);
    res.status(500).json({ error: 'Failed to fetch routines.' });
  }
};

exports.createRoutine = async (req, res) => {
  try {
    const { child_id, name, description, days_of_week } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    if (child_id && !(await verifyChildBelongsToParent(req.user.id, child_id))) {
      return res.status(404).json({ error: 'Child not found.' });
    }
    const result = await db.query(
      `INSERT INTO routines (parent_id, child_id, name, description, days_of_week)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, child_id || null, name, description || null, days_of_week || [1,2,3,4,5]]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create routine error:', err);
    res.status(500).json({ error: 'Failed to create routine.' });
  }
};

exports.updateRoutine = async (req, res) => {
  try {
    const { name, description, days_of_week, is_active, child_id } = req.body;
    const result = await db.query(
      `UPDATE routines SET name=COALESCE($1,name), description=COALESCE($2,description),
       days_of_week=COALESCE($3,days_of_week), is_active=COALESCE($4,is_active),
       child_id=COALESCE($5,child_id), version=version+1
       WHERE id=$6 AND parent_id=$7 RETURNING *`,
      [name, description, days_of_week, is_active, child_id, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Routine not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update routine error:', err);
    res.status(500).json({ error: 'Failed to update routine.' });
  }
};

exports.deleteRoutine = async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE routines SET is_active = FALSE WHERE id = $1 AND parent_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Routine not found.' });
    res.json({ message: 'Routine deleted.' });
  } catch (err) {
    console.error('Delete routine error:', err);
    res.status(500).json({ error: 'Failed to delete routine.' });
  }
};

// ============================================================
// ROUTINE EVENTS
// ============================================================

exports.listEvents = async (req, res) => {
  try {
    const { routine_id } = req.query;
    let query = `SELECT re.*, r.name as routine_name, r.child_id, r.days_of_week,
        cl.name as checklist_name,
        (SELECT COUNT(*)::int FROM checklist_items WHERE checklist_id = re.checklist_id) as checklist_item_count
      FROM routine_events re
      JOIN routines r ON r.id = re.routine_id
      LEFT JOIN checklists cl ON cl.id = re.checklist_id
      WHERE r.parent_id = $1 AND re.is_active = TRUE`;
    const params = [req.user.id];
    if (routine_id) { query += ' AND re.routine_id = $2'; params.push(routine_id); }
    query += ' ORDER BY re.scheduled_time';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      routine_id, name, icon, scheduled_time, duration_minutes, expected_duration_minutes,
      category, checklist_id, payout, on_time_bonus_pct, late_penalty_pct,
      alarm_sound, requires_proof, sort_order
    } = req.body;
    if (!routine_id || !name || !scheduled_time) {
      return res.status(400).json({ error: 'routine_id, name, scheduled_time required.' });
    }
    const own = await db.query('SELECT id FROM routines WHERE id = $1 AND parent_id = $2', [routine_id, req.user.id]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Routine not found.' });

    const result = await db.query(
      `INSERT INTO routine_events
        (routine_id, name, icon, scheduled_time, duration_minutes, expected_duration_minutes, category, checklist_id,
         payout, on_time_bonus_pct, late_penalty_pct, alarm_sound, requires_proof, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [routine_id, name, icon || 'clock', scheduled_time, duration_minutes || 15,
       expected_duration_minutes || null,
       category || 'alarm', checklist_id || null, payout || 0,
       on_time_bonus_pct || 50, late_penalty_pct || 50,
       alarm_sound || 'bell', requires_proof || false, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event.' });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const {
      name, icon, scheduled_time, duration_minutes, expected_duration_minutes, category, checklist_id,
      payout, on_time_bonus_pct, late_penalty_pct, alarm_sound, requires_proof, sort_order, is_active
    } = req.body;
    const result = await db.query(
      `UPDATE routine_events SET
       name=COALESCE($1,name), icon=COALESCE($2,icon), scheduled_time=COALESCE($3,scheduled_time),
       duration_minutes=COALESCE($4,duration_minutes), expected_duration_minutes=COALESCE($5,expected_duration_minutes),
       category=COALESCE($6,category),
       checklist_id=COALESCE($7,checklist_id), payout=COALESCE($8,payout),
       on_time_bonus_pct=COALESCE($9,on_time_bonus_pct), late_penalty_pct=COALESCE($10,late_penalty_pct),
       alarm_sound=COALESCE($11,alarm_sound), requires_proof=COALESCE($12,requires_proof),
       sort_order=COALESCE($13,sort_order), is_active=COALESCE($14,is_active), version=version+1
       WHERE id=$15 AND routine_id IN (SELECT id FROM routines WHERE parent_id = $16) RETURNING *`,
      [name, icon, scheduled_time, duration_minutes, expected_duration_minutes, category, checklist_id,
       payout, on_time_bonus_pct, late_penalty_pct, alarm_sound, requires_proof,
       sort_order, is_active, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Failed to update event.' });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE routine_events SET is_active = FALSE
       WHERE id = $1 AND routine_id IN (SELECT id FROM routines WHERE parent_id = $2)
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    res.json({ message: 'Event deleted.' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
};

// ============================================================
// DAILY SCHEDULE — what should run today for this child
// ============================================================

exports.getTodaysSchedule = async (req, res) => {
  try {
    const { child_id, date } = req.query;
    if (!child_id) return res.status(400).json({ error: 'child_id is required.' });
    const targetDate = date || new Date().toISOString().split('T')[0];
    const dow = new Date(targetDate + 'T00:00:00').getDay(); // 0=Sun

    if (!(await verifyChildBelongsToParent(req.user.id, child_id))) {
      return res.status(404).json({ error: 'Child not found.' });
    }

    // Pull events from routines that target this child (or shared)
    const events = await db.query(
      `SELECT re.id, re.name, re.icon, re.scheduled_time, re.duration_minutes,
              re.category, re.checklist_id, re.payout, re.on_time_bonus_pct, re.late_penalty_pct,
              re.alarm_sound, re.requires_proof, re.sort_order,
              r.id as routine_id, r.name as routine_name,
              cl.name as checklist_name
       FROM routine_events re
       JOIN routines r ON r.id = re.routine_id
       LEFT JOIN checklists cl ON cl.id = re.checklist_id
       WHERE r.parent_id = $1 AND r.is_active = TRUE AND re.is_active = TRUE
         AND (r.child_id = $2 OR r.child_id IS NULL)
         AND $3 = ANY(r.days_of_week)
       ORDER BY re.scheduled_time, re.sort_order`,
      [req.user.id, child_id, dow]
    );

    // Pull existing logs for the day
    const logs = await db.query(
      `SELECT * FROM routine_logs WHERE child_id = $1 AND log_date = $2`,
      [child_id, targetDate]
    );
    const logMap = {};
    for (const l of logs.rows) logMap[l.routine_event_id] = l;

    // Merge
    const schedule = events.rows.map(ev => ({
      ...ev,
      log: logMap[ev.id] || null,
      status: logMap[ev.id]?.status || 'pending',
    }));

    res.json({ date: targetDate, schedule });
  } catch (err) {
    console.error('Get schedule error:', err);
    res.status(500).json({ error: 'Failed to fetch schedule.' });
  }
};

// ============================================================
// COMPLETE / MISS A ROUTINE EVENT
// ============================================================

exports.completeEvent = async (req, res) => {
  try {
    const { routine_event_id, child_id, date, notes, quality_rating } = req.body;
    const logDate = date || new Date().toISOString().split('T')[0];

    if (!routine_event_id || !child_id) {
      return res.status(400).json({ error: 'routine_event_id and child_id required.' });
    }
    if (!(await verifyChildBelongsToParent(req.user.id, child_id))) {
      return res.status(404).json({ error: 'Child not found.' });
    }

    const evRes = await db.query(
      `SELECT re.*, r.parent_id FROM routine_events re
       JOIN routines r ON r.id = re.routine_id
       WHERE re.id = $1 AND r.parent_id = $2`,
      [routine_event_id, req.user.id]
    );
    if (evRes.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    const ev = evRes.rows[0];

    // Existing log? get started_at if present
    const existing = await db.query(
      `SELECT * FROM routine_logs WHERE routine_event_id = $1 AND child_id = $2 AND log_date = $3`,
      [routine_event_id, child_id, logDate]
    );
    const startedAt = existing.rows[0]?.started_at || null;

    const now = new Date();
    const [hh, mm] = ev.scheduled_time.split(':');
    const scheduledAt = new Date(logDate + 'T' + hh + ':' + mm + ':00');
    const windowMs = (ev.duration_minutes || 15) * 60 * 1000;
    const diffMs = now - scheduledAt;
    const onTime = diffMs <= windowMs && diffMs >= -windowMs;
    const isLate = diffMs > windowMs;
    let status = onTime ? 'completed' : (isLate ? 'late' : 'completed');

    // Duration & speed rating
    let durationSec = null;
    let speedRating = null;
    if (startedAt) {
      durationSec = Math.max(0, Math.round((now - new Date(startedAt)) / 1000));
      const expectedSec = (ev.expected_duration_minutes || ev.duration_minutes || 15) * 60;
      const ratio = durationSec / expectedSec;
      if (ratio <= 0.75) speedRating = 5;
      else if (ratio <= 1.0) speedRating = 4;
      else if (ratio <= 1.25) speedRating = 3;
      else if (ratio <= 1.75) speedRating = 2;
      else speedRating = 1;
    }

    const qRating = quality_rating ? Math.max(1, Math.min(5, parseInt(quality_rating))) : null;

    const base = parseFloat(ev.payout) || 0;
    let payout = base;
    if (status === 'completed' && Math.abs(diffMs) <= 5 * 60 * 1000) {
      payout = base * (1 + (ev.on_time_bonus_pct || 0) / 100);
    } else if (status === 'late') {
      payout = base * (1 - (ev.late_penalty_pct || 0) / 100);
    }
    // Quality multiplier: 1=0.5x, 2=0.75x, 3=1x, 4=1.15x, 5=1.3x
    if (qRating) {
      const qMult = { 1: 0.5, 2: 0.75, 3: 1.0, 4: 1.15, 5: 1.3 }[qRating];
      payout = payout * qMult;
    }
    payout = Math.max(0, parseFloat(payout.toFixed(2)));

    const logRes = await db.query(
      `INSERT INTO routine_logs (routine_event_id, child_id, log_date, scheduled_at, started_at, completed_at, status, on_time, payout_earned, notes, duration_seconds, quality_rating, speed_rating)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (routine_event_id, child_id, log_date) DO UPDATE
       SET completed_at = $6, status = $7, on_time = $8, payout_earned = $9, notes = COALESCE($10, routine_logs.notes),
           duration_seconds = $11, quality_rating = $12, speed_rating = $13
       RETURNING *`,
      [routine_event_id, child_id, logDate, scheduledAt, startedAt, now, status, onTime, payout, notes || null, durationSec, qRating, speedRating]
    );

    if (payout > 0) {
      await creditEarnings(db, {
        child_id, amount: payout,
        description: `${ev.name} (${status})`,
        reference: `routine_event:${routine_event_id}`,
        created_by: req.user.id,
      });
    }

    // Points: completed=10, late=3; quality bonus up to +5; speed bonus up to +5
    let points = status === 'completed' ? 10 : (status === 'late' ? 3 : 0);
    if (qRating) points += (qRating - 3); // -2..+2
    if (speedRating) points += (speedRating - 3); // -2..+2
    await logActivity(db, {
      child_id, parent_id: req.user.id,
      activity_type: 'routine',
      activity_ref_id: routine_event_id,
      title: ev.name,
      description: `${status}${qRating ? ` · quality ${qRating}/5` : ''}${speedRating ? ` · speed ${speedRating}/5` : ''}${durationSec ? ` · ${Math.round(durationSec/60)}min` : ''}`,
      status, points, payout
    });

    res.json({ log: logRes.rows[0], payout, status, duration_seconds: durationSec, speed_rating: speedRating, quality_rating: qRating });
  } catch (err) {
    console.error('Complete event error:', err);
    res.status(500).json({ error: 'Failed to complete event.' });
  }
};

exports.startEvent = async (req, res) => {
  try {
    const { routine_event_id, child_id, date } = req.body;
    const logDate = date || new Date().toISOString().split('T')[0];
    if (!routine_event_id || !child_id) {
      return res.status(400).json({ error: 'routine_event_id and child_id required.' });
    }
    if (!(await verifyChildBelongsToParent(req.user.id, child_id))) {
      return res.status(404).json({ error: 'Child not found.' });
    }
    const evRes = await db.query(
      `SELECT re.*, r.parent_id FROM routine_events re
       JOIN routines r ON r.id = re.routine_id
       WHERE re.id = $1 AND r.parent_id = $2`,
      [routine_event_id, req.user.id]
    );
    if (evRes.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    const ev = evRes.rows[0];
    const [hh, mm] = ev.scheduled_time.split(':');
    const scheduledAt = new Date(logDate + 'T' + hh + ':' + mm + ':00');
    const now = new Date();
    const result = await db.query(
      `INSERT INTO routine_logs (routine_event_id, child_id, log_date, scheduled_at, started_at, status, on_time, payout_earned)
       VALUES ($1,$2,$3,$4,$5,'pending',false,0)
       ON CONFLICT (routine_event_id, child_id, log_date) DO UPDATE
       SET started_at = COALESCE(routine_logs.started_at, $5)
       RETURNING *`,
      [routine_event_id, child_id, logDate, scheduledAt, now]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Start event error:', err);
    res.status(500).json({ error: 'Failed to start event.' });
  }
};

exports.missEvent = async (req, res) => {
  try {
    const { routine_event_id, child_id, date } = req.body;
    const logDate = date || new Date().toISOString().split('T')[0];
    const evRes = await db.query(
      `SELECT re.*, r.parent_id FROM routine_events re
       JOIN routines r ON r.id = re.routine_id
       WHERE re.id = $1 AND r.parent_id = $2`,
      [routine_event_id, req.user.id]
    );
    if (evRes.rows.length === 0) return res.status(404).json({ error: 'Event not found.' });
    const ev = evRes.rows[0];
    const [hh, mm] = ev.scheduled_time.split(':');
    const scheduledAt = new Date(logDate + 'T' + hh + ':' + mm + ':00');

    const result = await db.query(
      `INSERT INTO routine_logs (routine_event_id, child_id, log_date, scheduled_at, status, on_time, payout_earned)
       VALUES ($1,$2,$3,$4,'missed',false,0)
       ON CONFLICT (routine_event_id, child_id, log_date) DO UPDATE
       SET status = 'missed', on_time = false, payout_earned = 0
       RETURNING *`,
      [routine_event_id, child_id, logDate, scheduledAt]
    );

    await logActivity(db, {
      child_id, parent_id: req.user.id,
      activity_type: 'routine',
      activity_ref_id: routine_event_id,
      title: ev.name,
      description: 'Missed routine event',
      status: 'missed', points: -5, payout: 0
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Miss event error:', err);
    res.status(500).json({ error: 'Failed to mark event missed.' });
  }
};

// ============================================================
// CHECKLISTS
// ============================================================

exports.listChecklists = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cl.*,
       (SELECT COUNT(*)::int FROM checklist_items WHERE checklist_id = cl.id) as item_count
       FROM checklists cl WHERE cl.parent_id = $1 ORDER BY cl.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List checklists error:', err);
    res.status(500).json({ error: 'Failed to fetch checklists.' });
  }
};

exports.getChecklist = async (req, res) => {
  try {
    const cl = await db.query(
      'SELECT * FROM checklists WHERE id = $1 AND parent_id = $2',
      [req.params.id, req.user.id]
    );
    if (cl.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    const items = await db.query(
      'SELECT * FROM checklist_items WHERE checklist_id = $1 ORDER BY sort_order, id',
      [req.params.id]
    );
    res.json({ ...cl.rows[0], items: items.rows });
  } catch (err) {
    console.error('Get checklist error:', err);
    res.status(500).json({ error: 'Failed to fetch checklist.' });
  }
};

exports.createChecklist = async (req, res) => {
  try {
    const { name, description, category, items } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required.' });
    const cl = await db.query(
      `INSERT INTO checklists (parent_id, name, description, category)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [req.user.id, name, description || null, category || 'general']
    );
    const checklistId = cl.rows[0].id;
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await db.query(
          `INSERT INTO checklist_items (checklist_id, label, sort_order, payout_per_item, requires_photo)
           VALUES ($1,$2,$3,$4,$5)`,
          [checklistId, it.label, i, it.payout_per_item || 0, it.requires_photo || false]
        );
      }
    }
    res.status(201).json(cl.rows[0]);
  } catch (err) {
    console.error('Create checklist error:', err);
    res.status(500).json({ error: 'Failed to create checklist.' });
  }
};

exports.updateChecklist = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const result = await db.query(
      `UPDATE checklists SET name=COALESCE($1,name), description=COALESCE($2,description),
       category=COALESCE($3,category), version=version+1
       WHERE id=$4 AND parent_id=$5 RETURNING *`,
      [name, description, category, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update checklist error:', err);
    res.status(500).json({ error: 'Failed to update checklist.' });
  }
};

exports.deleteChecklist = async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM checklists WHERE id = $1 AND parent_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found.' });
    res.json({ message: 'Deleted.' });
  } catch (err) {
    console.error('Delete checklist error:', err);
    res.status(500).json({ error: 'Failed to delete checklist.' });
  }
};

exports.addChecklistItem = async (req, res) => {
  try {
    const { label, payout_per_item, sort_order, requires_photo } = req.body;
    const own = await db.query('SELECT id FROM checklists WHERE id = $1 AND parent_id = $2', [req.params.id, req.user.id]);
    if (own.rows.length === 0) return res.status(404).json({ error: 'Checklist not found.' });
    const result = await db.query(
      `INSERT INTO checklist_items (checklist_id, label, sort_order, payout_per_item, requires_photo)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, label, sort_order || 0, payout_per_item || 0, requires_photo || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Add item error:', err);
    res.status(500).json({ error: 'Failed to add item.' });
  }
};

exports.deleteChecklistItem = async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM checklist_items
       WHERE id = $1 AND checklist_id IN (SELECT id FROM checklists WHERE parent_id = $2)
       RETURNING id`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    res.json({ message: 'Item deleted.' });
  } catch (err) {
    console.error('Delete item error:', err);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
};

// Check a checklist item for today
exports.toggleChecklistItem = async (req, res) => {
  try {
    const { checklist_item_id, child_id, checked, date, routine_log_id } = req.body;
    const logDate = date || new Date().toISOString().split('T')[0];
    if (!(await verifyChildBelongsToParent(req.user.id, child_id))) {
      return res.status(404).json({ error: 'Child not found.' });
    }

    // Load item to get payout
    const item = await db.query(
      `SELECT ci.*, cl.parent_id FROM checklist_items ci
       JOIN checklists cl ON cl.id = ci.checklist_id
       WHERE ci.id = $1 AND cl.parent_id = $2`,
      [checklist_item_id, req.user.id]
    );
    if (item.rows.length === 0) return res.status(404).json({ error: 'Item not found.' });
    const it = item.rows[0];

    const payout = checked ? (parseFloat(it.payout_per_item) || 0) : 0;

    const result = await db.query(
      `INSERT INTO checklist_logs (routine_log_id, checklist_item_id, child_id, log_date, checked, checked_at, payout_earned)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (checklist_item_id, child_id, log_date) DO UPDATE
       SET checked = $5, checked_at = $6, payout_earned = $7
       RETURNING *`,
      [routine_log_id || null, checklist_item_id, child_id, logDate,
       !!checked, checked ? new Date() : null, payout]
    );

    if (checked && payout > 0) {
      await creditEarnings(db, {
        child_id, amount: payout,
        description: `Checklist: ${it.label}`,
        reference: `checklist_item:${checklist_item_id}`,
        created_by: req.user.id,
      });
      await logActivity(db, {
        child_id, parent_id: req.user.id,
        activity_type: 'checklist',
        activity_ref_id: checklist_item_id,
        title: it.label,
        description: 'Checklist item completed',
        status: 'completed', points: 2, payout
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle item error:', err);
    res.status(500).json({ error: 'Failed to toggle item.' });
  }
};

exports.getChecklistDayLogs = async (req, res) => {
  try {
    const { child_id, checklist_id, date } = req.query;
    const logDate = date || new Date().toISOString().split('T')[0];
    const items = await db.query(
      `SELECT ci.*, cll.checked, cll.checked_at, cll.id as log_id, cll.payout_earned
       FROM checklist_items ci
       LEFT JOIN checklist_logs cll
         ON cll.checklist_item_id = ci.id AND cll.child_id = $2 AND cll.log_date = $3
       WHERE ci.checklist_id = $1
       ORDER BY ci.sort_order, ci.id`,
      [checklist_id, child_id, logDate]
    );
    res.json(items.rows);
  } catch (err) {
    console.error('Get checklist day logs error:', err);
    res.status(500).json({ error: 'Failed to fetch.' });
  }
};

// ============================================================
// AUTO-MISS scan — mark overdue events as missed (call from cron or on schedule load)
// ============================================================

exports.scanMissed = async (req, res) => {
  try {
    const child_id = req.body?.child_id || req.query.child_id;
    const date = req.body?.date || req.query.date;
    const logDate = date || new Date().toISOString().split('T')[0];
    if (!child_id) return res.status(400).json({ error: 'child_id required.' });

    const dow = new Date(logDate + 'T00:00:00').getDay();
    const now = new Date();

    const events = await db.query(
      `SELECT re.* FROM routine_events re
       JOIN routines r ON r.id = re.routine_id
       WHERE r.parent_id = $1 AND r.is_active = TRUE AND re.is_active = TRUE
         AND (r.child_id = $2 OR r.child_id IS NULL)
         AND $3 = ANY(r.days_of_week)`,
      [req.user.id, child_id, dow]
    );

    let missedCount = 0;
    for (const ev of events.rows) {
      const [hh, mm] = ev.scheduled_time.split(':');
      const scheduledAt = new Date(logDate + 'T' + hh + ':' + mm + ':00');
      const cutoff = new Date(scheduledAt.getTime() + (ev.duration_minutes || 15) * 60 * 1000 + 60 * 60 * 1000);
      if (now < cutoff) continue;

      const existing = await db.query(
        'SELECT id, status FROM routine_logs WHERE routine_event_id = $1 AND child_id = $2 AND log_date = $3',
        [ev.id, child_id, logDate]
      );
      if (existing.rows.length > 0 && existing.rows[0].status !== 'pending') continue;

      await db.query(
        `INSERT INTO routine_logs (routine_event_id, child_id, log_date, scheduled_at, status, on_time, payout_earned)
         VALUES ($1,$2,$3,$4,'missed',false,0)
         ON CONFLICT (routine_event_id, child_id, log_date) DO UPDATE
         SET status = 'missed', on_time = false`,
        [ev.id, child_id, logDate, scheduledAt]
      );
      await logActivity(db, {
        child_id, parent_id: req.user.id,
        activity_type: 'routine',
        activity_ref_id: ev.id,
        title: ev.name,
        description: 'Auto-marked missed (window elapsed)',
        status: 'missed', points: -5, payout: 0
      });
      missedCount++;
    }
    res.json({ scanned: events.rows.length, missed: missedCount });
  } catch (err) {
    console.error('Scan missed error:', err);
    res.status(500).json({ error: 'Failed to scan.' });
  }
};

// SEED appended below

// ============================================================
// SEED TEMPLATES — one-click setup for boarding-school routines
// ============================================================

// Days: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
const WEEKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const CHECKLIST_TEMPLATES = [
  { key: 'school_ready', name: 'School Readiness', category: 'school_ready', items: [
    { label: 'Uniform clean and ironed', payout: 5 },
    { label: 'Shoes polished', payout: 5 },
    { label: 'Hair groomed', payout: 5 },
    { label: 'Books & notebooks packed', payout: 10 },
    { label: 'Lunch / lunchbox packed', payout: 5 },
    { label: 'Water bottle filled', payout: 3 },
    { label: 'ID card / school pass', payout: 3 },
    { label: 'Pocket money / bus fare', payout: 2 },
  ]},
  { key: 'return_home', name: 'Return From School', category: 'return_home', items: [
    { label: 'Change out of uniform', payout: 3 },
    { label: 'Hang uniform properly', payout: 5 },
    { label: 'Empty & wash lunch box', payout: 5 },
    { label: 'Place shoes in shoe rack', payout: 3 },
    { label: 'Wash hands & feet', payout: 3 },
    { label: 'Drop assignment notebook on study desk', payout: 5 },
  ]},
  { key: 'bedtime', name: 'Bedtime', category: 'bedtime', items: [
    { label: 'Bath & oral hygiene', payout: 5 },
    { label: 'Night prayer', payout: 5 },
    { label: 'Pack bag for tomorrow', payout: 10 },
    { label: 'Set out tomorrow\u2019s clothes', payout: 5 },
    { label: 'Phone / devices put away', payout: 5 },
    { label: 'Lights out by curfew', payout: 5 },
  ]},
  { key: 'room_clean', name: 'Room Cleaning', category: 'general', items: [
    { label: 'Make the bed neatly', payout: 5 },
    { label: 'Pick up clothes off floor', payout: 5 },
    { label: 'Dust shelves & surfaces', payout: 5 },
    { label: 'Sweep / vacuum floor', payout: 10 },
    { label: 'Empty trash bin', payout: 5 },
    { label: 'Arrange books & toys', payout: 5 },
    { label: 'Open windows for fresh air', payout: 3 },
  ]},
  { key: 'laundry_select', name: 'Laundry: Selection & Segregation', category: 'general', items: [
    { label: 'Gather dirty clothes from room', payout: 5 },
    { label: 'Empty pockets', payout: 5 },
    { label: 'Separate whites from colours', payout: 10 },
    { label: 'Separate delicates & woolens', payout: 10 },
    { label: 'Pre-treat stains', payout: 5 },
  ]},
  { key: 'laundry_wash', name: 'Laundry: Washing', category: 'general', items: [
    { label: 'Measure detergent correctly', payout: 5 },
    { label: 'Wash whites batch', payout: 15 },
    { label: 'Wash coloureds batch', payout: 15 },
    { label: 'Wash delicates', payout: 10 },
    { label: 'Rinse all batches', payout: 10 },
    { label: 'Wring / spin dry', payout: 5 },
  ]},
  { key: 'laundry_sun', name: 'Laundry: Sunning', category: 'general', items: [
    { label: 'Hang clothes on line', payout: 10 },
    { label: 'Turn inside-out coloureds', payout: 5 },
    { label: 'Pegs secured', payout: 3 },
    { label: 'Bring in before evening dew', payout: 10 },
    { label: 'Fold off the line', payout: 10 },
  ]},
  { key: 'laundry_iron', name: 'Laundry: Ironing & Putting Away', category: 'general', items: [
    { label: 'Iron uniforms', payout: 20 },
    { label: 'Iron other clothes', payout: 15 },
    { label: 'Fold and stack', payout: 10 },
    { label: 'Hang shirts on hangers', payout: 5 },
    { label: 'Place in wardrobe properly', payout: 10 },
    { label: 'Switch off iron, store safely', payout: 5 },
  ]},
  { key: 'meal_org', name: 'Mealtime Organisation', category: 'general', items: [
    { label: 'Wash hands before meal', payout: 3 },
    { label: 'Set the table', payout: 5 },
    { label: 'Serve food / drinks', payout: 5 },
    { label: 'Eat seated, no devices', payout: 3 },
    { label: 'Clear plates after meal', payout: 5 },
    { label: 'Wipe table & seats', payout: 5 },
  ]},
  { key: 'dishes', name: 'Washing Dishes', category: 'general', items: [
    { label: 'Scrape food into bin', payout: 3 },
    { label: 'Pre-rinse', payout: 3 },
    { label: 'Wash with soap & sponge', payout: 10 },
    { label: 'Rinse thoroughly', payout: 5 },
    { label: 'Dry & put away', payout: 5 },
    { label: 'Wipe sink & counter', payout: 5 },
  ]},
  { key: 'common_areas', name: 'Common Area Cleaning', category: 'general', items: [
    { label: 'Sitting room: arrange cushions', payout: 5 },
    { label: 'Dust TV / shelves / centre table', payout: 10 },
    { label: 'Sweep / vacuum floor', payout: 10 },
    { label: 'Mop floor', payout: 10 },
    { label: 'Empty bins', payout: 5 },
    { label: 'Tidy entrance / shoe rack', payout: 5 },
  ]},
  { key: 'hair_groom', name: 'Hair Grooming', category: 'general', items: [
    { label: 'Wash / shampoo if due', payout: 5 },
    { label: 'Comb / brush thoroughly', payout: 5 },
    { label: 'Apply oil / cream', payout: 3 },
    { label: 'Style neatly for the day', payout: 5 },
    { label: 'Clean comb & brush', payout: 3 },
  ]},
  { key: 'footwear', name: 'Footwear Care', category: 'general', items: [
    { label: 'Wipe shoes with damp cloth', payout: 5 },
    { label: 'Polish school / dress shoes', payout: 10 },
    { label: 'Wash trainers / canvas', payout: 10 },
    { label: 'Dry properly in shade', payout: 5 },
    { label: 'Return all pairs to rack', payout: 5 },
  ]},
  { key: 'car_wash', name: 'Car Washing (Daddy / Mummy car)', category: 'general', items: [
    { label: 'Remove litter from interior', payout: 5 },
    { label: 'Vacuum carpets & seats', payout: 10 },
    { label: 'Wipe dashboard & console', payout: 10 },
    { label: 'Rinse exterior', payout: 10 },
    { label: 'Soap & sponge body', payout: 15 },
    { label: 'Rinse off soap', payout: 10 },
    { label: 'Dry with microfibre', payout: 10 },
    { label: 'Tyres & rims cleaned', payout: 10 },
    { label: 'Return all tools', payout: 5 },
  ]},
  { key: 'screen_time', name: 'Screen Time Wind-Down', category: 'general', items: [
    { label: 'Save / close all apps', payout: 3 },
    { label: 'Device on charger', payout: 3 },
    { label: 'Eyes rested (look at distance)', payout: 3 },
    { label: 'Tidy area used', payout: 3 },
  ]},
  { key: 'uniform_wed', name: 'Midweek Uniform Wash (Wed)', category: 'general', items: [
    { label: 'Pre-treat collar & cuffs', payout: 5 },
    { label: 'Wash uniform separately', payout: 15 },
    { label: 'Rinse twice', payout: 5 },
    { label: 'Sun dry & bring in early', payout: 10 },
    { label: 'Iron crisply for Thursday', payout: 15 },
  ]},
];

const ROUTINE_TEMPLATES = [
  // === WEEKDAY MAIN ROUTINE ===
  { name: 'Weekday School Routine', description: 'Mon–Fri school days', days: WEEKDAYS, events: [
    { name: 'Rising Bell', time: '05:30', dur: 10, cat: 'alarm', icon: '\ud83d\udd14', pay: 5, exp: 5 },
    { name: 'Morning Prayer', time: '05:40', dur: 15, cat: 'prayer', icon: '\ud83d\ude4f', pay: 10, exp: 10 },
    { name: 'Personal Hygiene & Bath', time: '05:55', dur: 25, cat: 'alarm', icon: '\ud83d\udebf', pay: 10, exp: 20 },
    { name: 'School Readiness', time: '06:20', dur: 20, cat: 'checklist', icon: '\u2705', pay: 20, exp: 15, checklist: 'school_ready' },
    { name: 'Breakfast', time: '06:40', dur: 20, cat: 'meal', icon: '\ud83c\udf73', pay: 5, exp: 15, checklist: 'meal_org' },
    { name: 'Leave for School', time: '07:00', dur: 10, cat: 'alarm', icon: '\ud83c\udf92', pay: 5, exp: 5 },
    { name: 'Return Home Routine', time: '14:30', dur: 30, cat: 'checklist', icon: '\ud83c\udfe1', pay: 15, exp: 20, checklist: 'return_home' },
    { name: 'Lunch', time: '14:45', dur: 30, cat: 'meal', icon: '\ud83c\udf5b', pay: 5, exp: 25, checklist: 'meal_org' },
    { name: 'Siesta / Rest', time: '15:15', dur: 60, cat: 'alarm', icon: '\ud83d\udecf\ufe0f', pay: 5, exp: 60 },
    { name: 'Home Chores', time: '16:30', dur: 45, cat: 'chore', icon: '\ud83e\uddf9', pay: 15, exp: 40, checklist: 'common_areas' },
    { name: 'Assignment Time', time: '17:15', dur: 60, cat: 'study', icon: '\ud83d\udcdd', pay: 20, exp: 50 },
    { name: 'Dinner', time: '18:30', dur: 30, cat: 'meal', icon: '\ud83c\udf7d\ufe0f', pay: 5, exp: 25, checklist: 'meal_org' },
    { name: 'Dish Washing Duty', time: '19:00', dur: 25, cat: 'chore', icon: '\ud83c\udf7d\ufe0f', pay: 10, exp: 20, checklist: 'dishes' },
    { name: 'Reading Time', time: '19:30', dur: 45, cat: 'reading', icon: '\ud83d\udcd6', pay: 10, exp: 40 },
    { name: 'Dedicated Screen Time', time: '20:15', dur: 45, cat: 'alarm', icon: '\ud83d\udcf1', pay: 5, exp: 45, checklist: 'screen_time' },
    { name: 'Bedtime Prep', time: '21:00', dur: 30, cat: 'checklist', icon: '\ud83c\udf19', pay: 15, exp: 25, checklist: 'bedtime' },
    { name: 'Lights Out', time: '21:30', dur: 10, cat: 'bedtime', icon: '\ud83d\udca4', pay: 10, exp: 5 },
  ]},
  // === WEDNESDAY UNIFORM WASH ===
  { name: 'Wednesday Uniform Wash', description: 'Midweek uniform laundry', days: [3], events: [
    { name: 'Uniform Wash', time: '15:30', dur: 30, cat: 'chore', icon: '\ud83d\udc55', pay: 20, exp: 30, checklist: 'uniform_wed' },
  ]},
  // === WEEKEND ROUTINE ===
  { name: 'Weekend Routine', description: 'Sat & Sun', days: WEEKEND, events: [
    { name: 'Rising Bell', time: '07:00', dur: 15, cat: 'alarm', icon: '\ud83d\udd14', pay: 5, exp: 5 },
    { name: 'Morning Prayer', time: '07:15', dur: 15, cat: 'prayer', icon: '\ud83d\ude4f', pay: 10, exp: 10 },
    { name: 'Breakfast', time: '07:30', dur: 30, cat: 'meal', icon: '\ud83c\udf73', pay: 5, exp: 25, checklist: 'meal_org' },
    { name: 'Room Cleaning', time: '08:00', dur: 45, cat: 'chore', icon: '\ud83e\uddf9', pay: 20, exp: 40, checklist: 'room_clean' },
    { name: 'Laundry: Selection & Segregation', time: '08:45', dur: 20, cat: 'chore', icon: '\ud83e\uddfa', pay: 15, exp: 15, checklist: 'laundry_select' },
    { name: 'Laundry: Washing', time: '09:05', dur: 60, cat: 'chore', icon: '\ud83e\uddfc', pay: 30, exp: 60, checklist: 'laundry_wash' },
    { name: 'Laundry: Sunning', time: '10:05', dur: 20, cat: 'chore', icon: '\u2600\ufe0f', pay: 15, exp: 15, checklist: 'laundry_sun' },
    { name: 'Hair Grooming', time: '10:30', dur: 30, cat: 'alarm', icon: '\u2702\ufe0f', pay: 10, exp: 25, checklist: 'hair_groom' },
    { name: 'Footwear Care', time: '11:00', dur: 30, cat: 'chore', icon: '\ud83d\udc5f', pay: 15, exp: 25, checklist: 'footwear' },
    { name: 'Common Area Cleaning', time: '11:30', dur: 45, cat: 'chore', icon: '\ud83d\udecb\ufe0f', pay: 20, exp: 40, checklist: 'common_areas' },
    { name: 'Lunch', time: '13:00', dur: 30, cat: 'meal', icon: '\ud83c\udf5b', pay: 5, exp: 25, checklist: 'meal_org' },
    { name: 'Siesta / Rest', time: '13:30', dur: 90, cat: 'alarm', icon: '\ud83d\udecf\ufe0f', pay: 5, exp: 90 },
    { name: 'Bring in & Iron Laundry', time: '15:30', dur: 60, cat: 'chore', icon: '\ud83d\udd25', pay: 30, exp: 50, checklist: 'laundry_iron' },
    { name: 'Free Play / Family Time', time: '16:30', dur: 90, cat: 'alarm', icon: '\ud83c\udfae', pay: 0, exp: 90 },
    { name: 'Dedicated Screen Time', time: '18:00', dur: 60, cat: 'alarm', icon: '\ud83d\udcf1', pay: 5, exp: 60, checklist: 'screen_time' },
    { name: 'Dinner', time: '19:00', dur: 30, cat: 'meal', icon: '\ud83c\udf7d\ufe0f', pay: 5, exp: 25, checklist: 'meal_org' },
    { name: 'Dish Washing Duty', time: '19:30', dur: 30, cat: 'chore', icon: '\ud83c\udf7d\ufe0f', pay: 10, exp: 25, checklist: 'dishes' },
    { name: 'Reading Time', time: '20:00', dur: 60, cat: 'reading', icon: '\ud83d\udcd6', pay: 10, exp: 50 },
    { name: 'Bedtime Prep', time: '21:30', dur: 30, cat: 'checklist', icon: '\ud83c\udf19', pay: 15, exp: 25, checklist: 'bedtime' },
    { name: 'Lights Out', time: '22:00', dur: 10, cat: 'bedtime', icon: '\ud83d\udca4', pay: 10, exp: 5 },
  ]},
  // === CAR WASHING (males) — Saturdays ===
  { name: 'Car Washing Duty (Males)', description: 'Wash Daddy & Mummy cars (assign per Saturday)', days: [6], events: [
    { name: 'Wash Family Car', time: '09:30', dur: 90, cat: 'chore', icon: '\ud83d\ude97', pay: 50, exp: 75, checklist: 'car_wash' },
  ]},
];

exports.seedTemplates = async (req, res) => {
  try {
    const parent_id = req.user.id;
    const { child_id } = req.body; // optional — if omitted, routines are shared

    // 1. Create checklists (skip if a checklist with same name already exists)
    const existing = await db.query('SELECT id, name FROM checklists WHERE parent_id = $1', [parent_id]);
    const existingNames = new Set(existing.rows.map(r => r.name));
    const checklistMap = {}; // key -> id
    for (const cl of CHECKLIST_TEMPLATES) {
      if (existingNames.has(cl.name)) {
        const found = existing.rows.find(r => r.name === cl.name);
        checklistMap[cl.key] = found.id;
        continue;
      }
      const created = await db.query(
        `INSERT INTO checklists (parent_id, name, category) VALUES ($1,$2,$3) RETURNING id`,
        [parent_id, cl.name, cl.category]
      );
      const clId = created.rows[0].id;
      checklistMap[cl.key] = clId;
      let sort = 0;
      for (const item of cl.items) {
        await db.query(
          `INSERT INTO checklist_items (checklist_id, label, sort_order, payout_per_item)
           VALUES ($1,$2,$3,$4)`,
          [clId, item.label, sort++, item.payout || 0]
        );
      }
    }

    // 2. Create routines + their events
    const existingRoutines = await db.query('SELECT name FROM routines WHERE parent_id = $1 AND is_active = TRUE', [parent_id]);
    const existingRoutineNames = new Set(existingRoutines.rows.map(r => r.name));
    let routinesCreated = 0;
    let eventsCreated = 0;
    for (const rt of ROUTINE_TEMPLATES) {
      if (existingRoutineNames.has(rt.name)) continue;
      const rRes = await db.query(
        `INSERT INTO routines (parent_id, child_id, name, description, days_of_week)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [parent_id, child_id || null, rt.name, rt.description, rt.days]
      );
      const routineId = rRes.rows[0].id;
      routinesCreated++;
      let sort = 0;
      for (const ev of rt.events) {
        await db.query(
          `INSERT INTO routine_events
            (routine_id, name, icon, scheduled_time, duration_minutes, expected_duration_minutes,
             category, checklist_id, payout, on_time_bonus_pct, late_penalty_pct, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [routineId, ev.name, ev.icon, ev.time, ev.dur, ev.exp,
           ev.cat, ev.checklist ? checklistMap[ev.checklist] : null,
           ev.pay || 0, 50, 50, sort++]
        );
        eventsCreated++;
      }
    }

    // 3. Default buckets per child (if child_id given and child has none)
    let bucketsCreated = 0;
    if (child_id) {
      const existingBuckets = await db.query('SELECT id FROM buckets WHERE child_id = $1 AND is_active = TRUE', [child_id]);
      if (existingBuckets.rows.length === 0) {
        const defaults = [
          { name: 'Personal Care', allocation_pct: 40, color: '#3498db', icon: '\ud83e\uddfc' },
          { name: 'School Items', allocation_pct: 40, color: '#27ae60', icon: '\ud83c\udf92' },
          { name: 'Personal Effects', allocation_pct: 20, color: '#9b59b6', icon: '\ud83d\udc55' },
        ];
        for (const b of defaults) {
          await db.query(
            `INSERT INTO buckets (child_id, name, allocation_pct, color, icon)
             VALUES ($1,$2,$3,$4,$5)`,
            [child_id, b.name, b.allocation_pct, b.color, b.icon]
          );
          bucketsCreated++;
        }
      }
    }

    res.json({
      message: 'Templates seeded.',
      checklists: Object.keys(checklistMap).length,
      routines_created: routinesCreated,
      events_created: eventsCreated,
      buckets_created: bucketsCreated,
    });
  } catch (err) {
    console.error('Seed templates error:', err);
    res.status(500).json({ error: 'Failed to seed templates: ' + err.message });
  }
};

