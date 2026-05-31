import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export default function Prayer() {
  const { children } = useApp();
  const [schedules, setSchedules] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ child_id: '', prayer_name: 'Fajr', reminder_time: '' });
  const [tab, setTab] = useState('log');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    if (selectedChild) loadData();
  }, [selectedChild, selectedDate]);

  const loadData = async () => {
    try {
      const [sched, logData] = await Promise.all([
        api.get(`/prayer/schedules?child_id=${selectedChild}`).catch(() => []),
        api.get(`/prayer/logs?child_id=${selectedChild}&date=${selectedDate}`).catch(() => []),
      ]);
      setSchedules(Array.isArray(sched) ? sched : []);
      setLogs(Array.isArray(logData) ? logData : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const logPrayer = async (prayerName, status) => {
    try {
      await api.post('/prayer/logs', {
        child_id: selectedChild,
        prayer_name: prayerName,
        date: selectedDate,
        status: status,
      });
      loadData();
    } catch (err) { alert(err.message); }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/prayer/schedules', scheduleForm);
      loadData();
      setScheduleForm({ child_id: '', prayer_name: 'Fajr', reminder_time: '' });
      setShowScheduleForm(false);
    } catch (err) { alert(err.message); }
  };

  const getPrayerStatus = (prayerName) => {
    const log = logs.find(l => l.prayer_name === prayerName);
    return log?.status || 'not_logged';
  };

  const statusColors = { prayed: '#27ae60', missed: '#e74c3c', late: '#f39c12', not_logged: '#ddd' };
  const statusLabels = { prayed: '✅ Prayed', missed: '❌ Missed', late: '⏰ Late', not_logged: '○ Not logged' };

  const navigateDate = (dir) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + dir);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h2 className="page-title">🤲 Prayer Tracker</h2>

      <div className="filter-tabs">
        {children.map(c => (
          <button key={c.id} className={`filter-tab ${selectedChild === c.id ? 'active' : ''}`} onClick={() => setSelectedChild(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>Daily Log</button>
        <button className={`tab ${tab === 'schedules' ? 'active' : ''}`} onClick={() => setTab('schedules')}>Schedules</button>
      </div>

      {tab === 'log' && (
        <>
          <div className="date-nav">
            <button className="btn-icon" onClick={() => navigateDate(-1)}>◀</button>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            <button className="btn-icon" onClick={() => navigateDate(1)}>▶</button>
          </div>

          <div className="prayer-grid">
            {PRAYER_NAMES.map(prayer => {
              const status = getPrayerStatus(prayer);
              return (
                <div key={prayer} className="prayer-card" style={{ borderLeftColor: statusColors[status] }}>
                  <div className="prayer-name">{prayer}</div>
                  <div className="prayer-status">{statusLabels[status]}</div>
                  <div className="prayer-actions">
                    {['prayed', 'late', 'missed'].map(s => (
                      <button
                        key={s}
                        className={`btn-xs ${status === s ? 'active' : ''}`}
                        style={{ background: status === s ? statusColors[s] : 'transparent', color: status === s ? '#fff' : statusColors[s], border: `1px solid ${statusColors[s]}` }}
                        onClick={() => logPrayer(prayer, s)}
                      >
                        {s === 'prayed' ? '✓' : s === 'late' ? '⏰' : '✗'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="prayer-summary card" style={{ marginTop: '1rem' }}>
            <h4>Today's Summary</h4>
            <div className="prayer-stats">
              <span className="positive">✅ {logs.filter(l => l.status === 'prayed').length}</span>
              <span style={{ color: '#f39c12' }}>⏰ {logs.filter(l => l.status === 'late').length}</span>
              <span className="negative">❌ {logs.filter(l => l.status === 'missed').length}</span>
              <span className="text-muted">○ {5 - logs.length} pending</span>
            </div>
          </div>
        </>
      )}

      {tab === 'schedules' && (
        <>
          <button className="btn btn-primary btn-sm" style={{ marginBottom: '1rem' }} onClick={() => setShowScheduleForm(!showScheduleForm)}>
            {showScheduleForm ? 'Cancel' : '+ Add Reminder'}
          </button>

          {showScheduleForm && (
            <div className="card form-card">
              <form onSubmit={handleScheduleSubmit}>
                <div className="form-group">
                  <label>Child</label>
                  <select value={scheduleForm.child_id} onChange={(e) => setScheduleForm({ ...scheduleForm, child_id: e.target.value })} required>
                    <option value="">Select</option>
                    {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Prayer</label>
                    <select value={scheduleForm.prayer_name} onChange={(e) => setScheduleForm({ ...scheduleForm, prayer_name: e.target.value })}>
                      {PRAYER_NAMES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Reminder Time</label>
                    <input type="time" value={scheduleForm.reminder_time} onChange={(e) => setScheduleForm({ ...scheduleForm, reminder_time: e.target.value })} required />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary btn-block">Add Reminder</button>
              </form>
            </div>
          )}

          <div className="schedule-list">
            {schedules.length === 0 ? (
              <p className="text-muted">No prayer reminders set</p>
            ) : (
              schedules.map(s => (
                <div key={s.id} className="card schedule-item">
                  <span className="schedule-prayer">{s.prayer_name}</span>
                  <span className="schedule-time">{s.reminder_time}</span>
                  <span className="text-muted">{s.child_name}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
