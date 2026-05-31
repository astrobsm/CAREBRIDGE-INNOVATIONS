import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('upcoming');
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'general', start_date: '', end_date: '',
    start_time: '', location: '', is_recurring: false, recurrence_pattern: 'none',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    try {
      const [allData, upcomingData] = await Promise.all([
        api.get('/events'),
        api.get('/events/upcoming'),
      ]);
      setEvents(Array.isArray(allData) ? allData : []);
      setUpcoming(Array.isArray(upcomingData) ? upcomingData : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/events', form);
      loadEvents();
      setForm({ title: '', description: '', event_type: 'general', start_date: '', end_date: '', start_time: '', location: '', is_recurring: false, recurrence_pattern: 'none' });
      setShowForm(false);
    } catch (err) { alert(err.message); }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      loadEvents();
    } catch (err) { alert(err.message); }
  };

  const typeIcons = {
    general: '📌', birthday: '🎂', appointment: '🏥', school: '🏫',
    religious: '🕌', travel: '✈️', celebration: '🎉',
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const daysUntil = (d) => {
    const diff = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff < 0) return `${Math.abs(diff)}d ago`;
    return `In ${diff} days`;
  };

  const displayList = tab === 'upcoming' ? upcoming : events;

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">📅 Events</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Event'}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                  {Object.keys(typeIcons).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Time</label>
                <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Location</label>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} />
                Recurring Event
              </label>
            </div>
            {form.is_recurring && (
              <div className="form-group">
                <label>Recurrence</label>
                <select value={form.recurrence_pattern} onChange={(e) => setForm({ ...form, recurrence_pattern: e.target.value })}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            )}
            <button type="submit" className="btn btn-primary btn-block">Create Event</button>
          </form>
        </div>
      )}

      <div className="tabs">
        <button className={`tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button className={`tab ${tab === 'all' ? 'active' : ''}`} onClick={() => setTab('all')}>All Events</button>
      </div>

      {displayList.length === 0 ? (
        <div className="empty-state"><p>No events</p></div>
      ) : (
        <div className="events-list">
          {displayList.map(evt => (
            <div key={evt.id} className="card event-card">
              <div className="event-header">
                <span className="event-icon">{typeIcons[evt.event_type] || '📌'}</span>
                <div className="event-info">
                  <h4>{evt.title}</h4>
                  <span className="event-date">{formatDate(evt.next_date || evt.start_date)}</span>
                </div>
                <span className="event-countdown">{daysUntil(evt.next_date || evt.start_date)}</span>
              </div>
              {evt.description && <p className="event-desc">{evt.description}</p>}
              <div className="event-meta">
                {evt.location && <span>📍 {evt.location}</span>}
                {evt.start_time && <span>🕐 {evt.start_time}</span>}
                {evt.is_recurring && <span className="badge">🔄 {evt.recurrence_pattern}</span>}
              </div>
              <button className="btn-xs btn-danger" onClick={() => deleteEvent(evt.id)} style={{ marginTop: '0.5rem' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
