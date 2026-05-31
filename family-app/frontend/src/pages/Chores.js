import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const CHORE_ICONS = ['🧹','🍽️','🛏️','🧺','🗑️','🐕','🌱','📚','🧼','🚿','👕','🍳','💧','🪣','✨'];

export default function Chores() {
  const { children } = useApp();
  const [schedules, setSchedules] = useState([]);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [dailyLogs, setDailyLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [view, setView] = useState('schedules'); // schedules | detail | daily
  const [showNewSchedule, setShowNewSchedule] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [showAssign, setShowAssign] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [scheduleForm, setScheduleForm] = useState({ title: '', description: '', start_date: new Date().toISOString().split('T')[0] });
  const [itemForm, setItemForm] = useState({ title: '', description: '', icon: '🧹', points: 1 });

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.get('/chores/schedules');
      setSchedules(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load schedules error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadScheduleDetail = useCallback(async (id) => {
    try {
      const data = await api.get(`/chores/schedules/${id}`);
      setActiveSchedule(data);
    } catch (err) {
      console.error('Load schedule detail error:', err);
    }
  }, []);

  const loadDailyLogs = useCallback(async (scheduleId, date) => {
    try {
      const params = new URLSearchParams({ date: date || selectedDate });
      if (scheduleId) params.append('schedule_id', scheduleId);
      const data = await api.get(`/chores/daily?${params}`);
      setDailyLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Load daily logs error:', err);
    }
  }, [selectedDate]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  useEffect(() => {
    if (view === 'daily' && activeSchedule) {
      loadDailyLogs(activeSchedule.id, selectedDate);
    }
  }, [view, activeSchedule, selectedDate, loadDailyLogs]);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.post('/chores/schedules', scheduleForm);
      setScheduleForm({ title: '', description: '', start_date: new Date().toISOString().split('T')[0] });
      setShowNewSchedule(false);
      loadSchedules();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Delete this schedule and all its chores?')) return;
    try {
      await api.delete(`/chores/schedules/${id}`);
      setView('schedules');
      setActiveSchedule(null);
      loadSchedules();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/chores/schedules/${activeSchedule.id}/items`, itemForm);
      setItemForm({ title: '', description: '', icon: '🧹', points: 1 });
      setShowNewItem(false);
      loadScheduleDetail(activeSchedule.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await api.delete(`/chores/items/${itemId}`);
      loadScheduleDetail(activeSchedule.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssign = async (itemId, childId) => {
    try {
      await api.post(`/chores/items/${itemId}/assign`, { child_id: childId });
      setShowAssign(null);
      loadScheduleDetail(activeSchedule.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await api.delete(`/chores/assignments/${assignmentId}`);
      loadScheduleDetail(activeSchedule.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGenerateLogs = async () => {
    try {
      const result = await api.post('/chores/daily/generate', {
        schedule_id: activeSchedule.id,
        date: selectedDate
      });
      alert(result.message);
      loadDailyLogs(activeSchedule.id, selectedDate);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAssessLog = async (logId, status, rating) => {
    try {
      await api.put(`/chores/daily/${logId}`, { status, rating });
      loadDailyLogs(activeSchedule.id, selectedDate);
    } catch (err) {
      alert(err.message);
    }
  };

  const openScheduleDetail = (schedule) => {
    setActiveSchedule(schedule);
    loadScheduleDetail(schedule.id);
    setView('detail');
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' });

  const getDaysLeft = (endDate) => {
    const diff = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : 0;
  };

  const getCompletionRate = (logs) => {
    if (!logs.length) return 0;
    const done = logs.filter(l => l.status === 'completed').length;
    return Math.round((done / logs.length) * 100);
  };

  // ==================== RENDER ====================

  if (loading && view === 'schedules') {
    return <div className="page chores-page"><div className="loading-spinner">Loading chores...</div></div>;
  }

  return (
    <div className="page chores-page">
      <div className="chores-header">
        <div>
          <h2 className="page-title">🧹 House Chores</h2>
          <p className="text-muted">2-week rotation schedules with daily tracking</p>
        </div>
        {view === 'schedules' && (
          <button className="btn btn-primary" onClick={() => setShowNewSchedule(true)}>
            + New Schedule
          </button>
        )}
        {view !== 'schedules' && (
          <button className="btn btn-outline" onClick={() => { setView('schedules'); setActiveSchedule(null); }}>
            ← Back
          </button>
        )}
      </div>

      {/* ==================== SCHEDULES LIST ==================== */}
      {view === 'schedules' && (
        <div className="chores-schedules-list">
          {schedules.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏠</div>
              <h3>No Chore Schedules Yet</h3>
              <p>Create a 2-week chore rotation to get started!</p>
              <button className="btn btn-primary" onClick={() => setShowNewSchedule(true)}>
                + Create First Schedule
              </button>
            </div>
          ) : (
            <div className="chores-grid">
              {schedules.map(s => (
                <div key={s.id} className={`chore-schedule-card ${s.status}`} onClick={() => openScheduleDetail(s)}>
                  <div className="schedule-card-header">
                    <span className={`schedule-status-badge ${s.status}`}>{s.status}</span>
                    {s.status === 'active' && <span className="days-left">{getDaysLeft(s.end_date)} days left</span>}
                  </div>
                  <h3 className="schedule-title">{s.title}</h3>
                  {s.description && <p className="schedule-desc">{s.description}</p>}
                  <div className="schedule-meta">
                    <span>📅 {formatDate(s.start_date)} — {formatDate(s.end_date)}</span>
                  </div>
                  <div className="schedule-stats">
                    <span className="schedule-stat">🧹 {s.item_count || 0} chores</span>
                    <span className="schedule-stat">👧 {s.children_count || 0} children</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== SCHEDULE DETAIL ==================== */}
      {view === 'detail' && activeSchedule && (
        <div className="chore-detail">
          <div className="detail-top">
            <div>
              <h3>{activeSchedule.title}</h3>
              <p className="text-muted">📅 {formatDate(activeSchedule.start_date)} — {formatDate(activeSchedule.end_date)}</p>
            </div>
            <div className="detail-actions">
              <button className="btn btn-primary btn-sm" onClick={() => { setView('daily'); }}>
                📋 Daily Assessment
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSchedule(activeSchedule.id)}>
                🗑️ Delete
              </button>
            </div>
          </div>

          <div className="chore-items-section">
            <div className="section-header">
              <h4>🧹 Chore Items</h4>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewItem(true)}>+ Add Chore</button>
            </div>

            {(!activeSchedule.items || activeSchedule.items.length === 0) ? (
              <div className="empty-state small">
                <p>No chores added yet. Add chores and assign them to children!</p>
              </div>
            ) : (
              <div className="chore-items-list">
                {activeSchedule.items.map(item => (
                  <div key={item.id} className="chore-item-card">
                    <div className="chore-item-header">
                      <span className="chore-icon">{item.icon}</span>
                      <div className="chore-item-info">
                        <h5>{item.title}</h5>
                        {item.description && <p>{item.description}</p>}
                      </div>
                      <span className="chore-points">⭐ {item.points} pts</span>
                    </div>

                    <div className="chore-assignments">
                      <span className="assignment-label">Assigned to:</span>
                      <div className="assignment-chips">
                        {item.assignments && item.assignments.length > 0 ? (
                          item.assignments.map(a => (
                            <span key={a.id} className="assignment-chip">
                              {a.child_name}
                              <button className="chip-remove" onClick={(e) => { e.stopPropagation(); handleRemoveAssignment(a.id); }}>×</button>
                            </span>
                          ))
                        ) : (
                          <span className="no-assignment">Not assigned</span>
                        )}
                        <button className="btn btn-sm btn-ghost" onClick={() => setShowAssign(item.id)}>+ Assign</button>
                      </div>
                    </div>

                    <button className="chore-delete-btn" onClick={() => handleDeleteItem(item.id)}>🗑️</button>

                    {/* Assign dropdown */}
                    {showAssign === item.id && (
                      <div className="assign-dropdown">
                        <p className="assign-title">Select a child:</p>
                        {children.length === 0 ? (
                          <p className="text-muted">No children found. Add children first.</p>
                        ) : (
                          children.map(c => {
                            const alreadyAssigned = item.assignments?.some(a => a.child_id === c.id);
                            return (
                              <button key={c.id} className={`assign-option ${alreadyAssigned ? 'disabled' : ''}`}
                                onClick={() => !alreadyAssigned && handleAssign(item.id, c.id)}
                                disabled={alreadyAssigned}>
                                {c.first_name || c.name} {alreadyAssigned ? '✓' : ''}
                              </button>
                            );
                          })
                        )}
                        <button className="btn btn-sm btn-outline" onClick={() => setShowAssign(null)}>Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== DAILY ASSESSMENT ==================== */}
      {view === 'daily' && activeSchedule && (
        <div className="daily-assessment">
          <div className="daily-header">
            <h3>📋 Daily Assessment — {activeSchedule.title}</h3>
            <div className="daily-date-picker">
              <button className="btn btn-sm btn-ghost" onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}>◀</button>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="date-input" />
              <button className="btn btn-sm btn-ghost" onClick={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 1);
                setSelectedDate(d.toISOString().split('T')[0]);
              }}>▶</button>
            </div>
          </div>

          <div className="daily-actions-bar">
            <button className="btn btn-primary btn-sm" onClick={handleGenerateLogs}>
              🔄 Generate Today's Logs
            </button>
            <div className="completion-rate">
              <div className="rate-bar">
                <div className="rate-fill" style={{ width: `${getCompletionRate(dailyLogs)}%` }}></div>
              </div>
              <span>{getCompletionRate(dailyLogs)}% Complete</span>
            </div>
          </div>

          {dailyLogs.length === 0 ? (
            <div className="empty-state small">
              <div className="empty-icon">📋</div>
              <p>No logs for this date. Click "Generate Today's Logs" to create entries.</p>
            </div>
          ) : (
            <div className="daily-logs-list">
              {dailyLogs.map(log => (
                <div key={log.id} className={`daily-log-card ${log.status}`}>
                  <div className="log-left">
                    <span className="log-icon">{log.chore_icon}</span>
                    <div className="log-info">
                      <h5>{log.chore_title}</h5>
                      <span className="log-child">👧 {log.child_name}</span>
                    </div>
                  </div>
                  <div className="log-right">
                    <div className="log-status-btns">
                      <button className={`status-btn completed ${log.status === 'completed' ? 'active' : ''}`}
                        onClick={() => handleAssessLog(log.id, 'completed', 5)} title="Completed">✅</button>
                      <button className={`status-btn partial ${log.status === 'partial' ? 'active' : ''}`}
                        onClick={() => handleAssessLog(log.id, 'partial', 3)} title="Partial">⚡</button>
                      <button className={`status-btn skipped ${log.status === 'skipped' ? 'active' : ''}`}
                        onClick={() => handleAssessLog(log.id, 'skipped', 1)} title="Skipped">❌</button>
                    </div>
                    {log.rating && (
                      <div className="log-rating">
                        {'⭐'.repeat(log.rating)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => { setView('detail'); loadScheduleDetail(activeSchedule.id); }}>
            ← Back to Schedule
          </button>
        </div>
      )}

      {/* ==================== NEW SCHEDULE MODAL ==================== */}
      {showNewSchedule && (
        <div className="modal-overlay" onClick={() => setShowNewSchedule(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏠 New 2-Week Chore Schedule</h3>
              <button className="modal-close" onClick={() => setShowNewSchedule(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSchedule} className="form">
              <div className="form-group">
                <label>Schedule Title</label>
                <input type="text" className="form-control" placeholder="e.g. Week 1-2 April Rotation"
                  value={scheduleForm.title} onChange={e => setScheduleForm({...scheduleForm, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea className="form-control" placeholder="Any notes about this rotation..."
                  value={scheduleForm.description} onChange={e => setScheduleForm({...scheduleForm, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" className="form-control" value={scheduleForm.start_date}
                  onChange={e => setScheduleForm({...scheduleForm, start_date: e.target.value})} required />
              </div>
              <p className="text-muted" style={{fontSize: '0.85rem'}}>📅 Schedule will automatically span 14 days from the start date.</p>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowNewSchedule(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== NEW CHORE ITEM MODAL ==================== */}
      {showNewItem && (
        <div className="modal-overlay" onClick={() => setShowNewItem(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🧹 Add New Chore</h3>
              <button className="modal-close" onClick={() => setShowNewItem(false)}>×</button>
            </div>
            <form onSubmit={handleAddItem} className="form">
              <div className="form-group">
                <label>Chore Icon</label>
                <div className="icon-picker">
                  {CHORE_ICONS.map(ic => (
                    <button key={ic} type="button"
                      className={`icon-option ${itemForm.icon === ic ? 'selected' : ''}`}
                      onClick={() => setItemForm({...itemForm, icon: ic})}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Chore Title</label>
                <input type="text" className="form-control" placeholder="e.g. Sweep the living room"
                  value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea className="form-control" placeholder="How should this chore be done?"
                  value={itemForm.description} onChange={e => setItemForm({...itemForm, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Points</label>
                <input type="number" className="form-control" min="1" max="10"
                  value={itemForm.points} onChange={e => setItemForm({...itemForm, points: parseInt(e.target.value) || 1})} />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowNewItem(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Chore</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
