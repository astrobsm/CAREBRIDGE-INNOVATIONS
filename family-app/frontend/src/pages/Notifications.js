import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useApp } from '../context/AppContext';

export default function Notifications() {
  const { loadNotifications: refreshNotifications } = useApp();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifications(); }, []);

  const loadNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      loadNotifications();
      refreshNotifications();
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      loadNotifications();
      refreshNotifications();
    } catch (err) { console.error(err); }
  };

  const typeIcons = { task: '✅', payment: '💰', event: '📅', prayer: '🤲', health: '🏥', growth: '📊', system: '⚙️' };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">🔔 Notifications</h2>
        {notifications.some(n => !n.is_read) && (
          <button className="btn btn-sm" onClick={markAllRead}>Mark All Read</button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="empty-state"><p>No notifications</p></div>
      ) : (
        <div className="notifications-list">
          {notifications.map(n => (
            <div key={n.id} className={`notification-item ${n.is_read ? 'read' : 'unread'}`} onClick={() => !n.is_read && markRead(n.id)}>
              <span className="notification-icon">{typeIcons[n.type] || '📌'}</span>
              <div className="notification-content">
                <p className="notification-message">{n.message}</p>
                <span className="notification-time">{timeAgo(n.created_at)}</span>
              </div>
              {!n.is_read && <span className="unread-dot"></span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
