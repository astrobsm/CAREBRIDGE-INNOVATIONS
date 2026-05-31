const db = require('../config/db');

// Prayer Schedules
exports.getSchedules = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT *, name as prayer_name, scheduled_time as reminder_time
       FROM prayer_schedules WHERE parent_id = $1 AND is_active = TRUE ORDER BY scheduled_time`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get prayer schedules error:', err);
    res.status(500).json({ error: 'Failed to fetch prayer schedules.' });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    // Accept both frontend format (prayer_name/reminder_time) and original format (name/scheduled_time)
    const name = req.body.prayer_name || req.body.name;
    const scheduled_time = req.body.reminder_time || req.body.scheduled_time;
    const { days_of_week, reminder_minutes_before } = req.body;
    if (!name || !scheduled_time) return res.status(400).json({ error: 'Prayer name and time are required.' });
    const result = await db.query(
      `INSERT INTO prayer_schedules (parent_id, name, scheduled_time, days_of_week, reminder_minutes_before)
       VALUES ($1,$2,$3,$4,$5) RETURNING *, name as prayer_name, scheduled_time as reminder_time`,
      [req.user.id, name, scheduled_time, days_of_week || [0,1,2,3,4,5,6], reminder_minutes_before || 15]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create prayer schedule error:', err);
    res.status(500).json({ error: 'Failed to create prayer schedule.' });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const name = req.body.prayer_name || req.body.name;
    const scheduled_time = req.body.reminder_time || req.body.scheduled_time;
    const { days_of_week, reminder_minutes_before, is_active } = req.body;
    const result = await db.query(
      `UPDATE prayer_schedules SET name=COALESCE($1,name), scheduled_time=COALESCE($2,scheduled_time),
       days_of_week=COALESCE($3,days_of_week), reminder_minutes_before=COALESCE($4,reminder_minutes_before),
       is_active=COALESCE($5,is_active), version=version+1 WHERE id=$6 AND parent_id=$7
       RETURNING *, name as prayer_name, scheduled_time as reminder_time`,
      [name, scheduled_time, days_of_week, reminder_minutes_before, is_active, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update prayer schedule error:', err);
    res.status(500).json({ error: 'Failed to update prayer schedule.' });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const result = await db.query('UPDATE prayer_schedules SET is_active = FALSE WHERE id = $1 AND parent_id = $2 RETURNING id',
      [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found.' });
    res.json({ message: 'Schedule deactivated.' });
  } catch (err) {
    console.error('Delete prayer schedule error:', err);
    res.status(500).json({ error: 'Failed to delete schedule.' });
  }
};

// Prayer Logs
exports.logPrayer = async (req, res) => {
  try {
    const { child_id, prayer_name, date, status, prayer_schedule_id, prayer_date, participated, notes } = req.body;
    const prayerDate = date || prayer_date;
    const prayerStatus = status || (participated ? 'prayed' : 'missed');

    let scheduleId = prayer_schedule_id;
    // If frontend sends prayer_name instead of schedule id, auto-find or create the schedule
    if (!scheduleId && prayer_name) {
      let schedResult = await db.query(
        'SELECT id FROM prayer_schedules WHERE parent_id = $1 AND name = $2 AND is_active = TRUE LIMIT 1',
        [req.user.id, prayer_name]
      );
      if (schedResult.rows.length === 0) {
        schedResult = await db.query(
          `INSERT INTO prayer_schedules (parent_id, name, scheduled_time, days_of_week, reminder_minutes_before)
           VALUES ($1, $2, '00:00', '{0,1,2,3,4,5,6}', 15) RETURNING id`,
          [req.user.id, prayer_name]
        );
      }
      scheduleId = schedResult.rows[0].id;
    }

    if (!scheduleId || !child_id || !prayerDate) {
      return res.status(400).json({ error: 'child_id, prayer_name (or prayer_schedule_id), and date are required.' });
    }

    const result = await db.query(
      `INSERT INTO prayer_logs (prayer_schedule_id, child_id, prayer_date, participated, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (prayer_schedule_id, child_id, prayer_date)
       DO UPDATE SET participated = $4, status = $5, notes = $6, version = prayer_logs.version + 1
       RETURNING *`,
      [scheduleId, child_id, prayerDate, prayerStatus === 'prayed' || prayerStatus === 'late', prayerStatus, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Log prayer error:', err);
    res.status(500).json({ error: 'Failed to log prayer.' });
  }
};

exports.getPrayerLogs = async (req, res) => {
  try {
    const { child_id, date, start_date, end_date } = req.query;
    let query = `
      SELECT pl.*, ps.name as prayer_name, ps.scheduled_time,
             c.first_name, c.last_name,
             COALESCE(pl.status, CASE WHEN pl.participated THEN 'prayed' ELSE 'missed' END) as status
      FROM prayer_logs pl
      JOIN prayer_schedules ps ON ps.id = pl.prayer_schedule_id
      JOIN children c ON c.id = pl.child_id
      WHERE ps.parent_id = $1`;
    const params = [req.user.id];
    let idx = 2;
    if (child_id) { query += ` AND pl.child_id = $${idx++}`; params.push(child_id); }
    // Support both single 'date' param and 'start_date'/'end_date' range
    if (date) {
      query += ` AND pl.prayer_date = $${idx++}`;
      params.push(date);
    } else {
      if (start_date) { query += ` AND pl.prayer_date >= $${idx++}`; params.push(start_date); }
      if (end_date) { query += ` AND pl.prayer_date <= $${idx++}`; params.push(end_date); }
    }
    query += ' ORDER BY pl.prayer_date DESC, ps.scheduled_time';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get prayer logs error:', err);
    res.status(500).json({ error: 'Failed to fetch prayer logs.' });
  }
};
