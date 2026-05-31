const db = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const { is_read, type } = req.query;
    let query = 'SELECT * FROM notifications WHERE user_id = $1';
    const params = [req.user.id];
    let idx = 2;
    if (is_read !== undefined) { query += ` AND is_read = $${idx++}`; params.push(is_read === 'true'); }
    if (type) { query += ` AND type = $${idx++}`; params.push(type); }
    query += ' ORDER BY created_at DESC LIMIT 50';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
};

exports.markRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to update notification.' });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const result = await db.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE', [req.user.id]);
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: 'Failed to fetch count.' });
  }
};
