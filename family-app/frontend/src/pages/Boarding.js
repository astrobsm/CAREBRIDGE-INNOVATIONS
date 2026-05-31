import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const CATEGORY_ICONS = {
  alarm: '⏰', checklist: '✅', chore: '🧹', study: '📚',
  meal: '🍽️', prayer: '🙏', reading: '📖', bedtime: '🌙'
};
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine'; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
    setTimeout(() => {
      const o2 = ctx.createOscillator();
      o2.connect(gain); o2.frequency.value = 1320;
      o2.start(); o2.stop(ctx.currentTime + 0.4);
    }, 400);
  } catch (e) { /* ignore */ }
}

function notify(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/logo192.png' });
  }
}

export default function Boarding() {
  const { children } = useApp();
  const [selectedChild, setSelectedChild] = useState('');
  const [view, setView] = useState('today'); // today | settings
  const [schedule, setSchedule] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [routines, setRoutines] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [activeRoutine, setActiveRoutine] = useState(null);
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [checklistItems, setChecklistItems] = useState({});
  const [loading, setLoading] = useState(false);
  const [showRoutineForm, setShowRoutineForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(null); // routine_id
  const [showChecklistForm, setShowChecklistForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(null); // checklist_id
  const [editingChecklist, setEditingChecklist] = useState(null);
  const firedAlarms = useRef(new Set());

  const [routineForm, setRoutineForm] = useState({ name: '', description: '', days_of_week: [1,2,3,4,5], child_id: '' });
  const [eventForm, setEventForm] = useState({
    name: '', icon: '⏰', scheduled_time: '06:00', duration_minutes: 15,
    category: 'alarm', checklist_id: '', payout: 0, on_time_bonus_pct: 50, late_penalty_pct: 50
  });
  const [checklistForm, setChecklistForm] = useState({ name: '', description: '', category: 'general' });
  const [itemForm, setItemForm] = useState({ label: '', payout_per_item: 0 });

  useEffect(() => {
    if (children?.length && !selectedChild) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const loadSchedule = useCallback(async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const data = await api.get(`/boarding/schedule?child_id=${selectedChild}&date=${selectedDate}`);
      setSchedule(data.schedule || []);
    } catch (err) {
      console.error('Load schedule error:', err);
    } finally { setLoading(false); }
  }, [selectedChild, selectedDate]);

  const loadRoutines = useCallback(async () => {
    try {
      const data = await api.get('/boarding/routines');
      setRoutines(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  }, []);

  const loadChecklists = useCallback(async () => {
    try {
      const data = await api.get('/boarding/checklists');
      setChecklists(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);
  useEffect(() => { if (view === 'settings') { loadRoutines(); loadChecklists(); } }, [view, loadRoutines, loadChecklists]);

  // Alarm engine — checks every 30s for events whose time matches now (within 60s window)
  useEffect(() => {
    if (view !== 'today') return;
    const check = () => {
      const now = new Date();
      const isToday = selectedDate === now.toISOString().split('T')[0];
      if (!isToday) return;
      const nowHM = now.toTimeString().slice(0, 5); // HH:MM
      schedule.forEach(ev => {
        if (ev.status !== 'pending') return;
        const evHM = (ev.scheduled_time || '').slice(0, 5);
        if (evHM !== nowHM) return;
        const key = `${ev.id}-${selectedDate}`;
        if (firedAlarms.current.has(key)) return;
        firedAlarms.current.add(key);
        beep();
        notify(`⏰ ${ev.name}`, `Time for ${ev.name} (${ev.routine_name})`);
      });
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [view, schedule, selectedDate]);

  const handleStart = async (eventId) => {
    try {
      await api.post('/boarding/events/start', {
        routine_event_id: eventId, child_id: selectedChild, date: selectedDate
      });
      loadSchedule();
    } catch (err) { alert(err.message); }
  };

  const handleComplete = async (eventId) => {
    const ratingStr = window.prompt('Quality rating 1–5 (1=poor, 3=ok, 5=excellent). Leave blank to skip.', '');
    const quality_rating = ratingStr ? parseInt(ratingStr) : null;
    try {
      const r = await api.post('/boarding/events/complete', {
        routine_event_id: eventId, child_id: selectedChild, date: selectedDate, quality_rating
      });
      if (r.duration_seconds != null) {
        const mins = Math.round(r.duration_seconds / 60);
        // brief toast-style
        console.log(`Took ${mins}min, speed ${r.speed_rating}/5, quality ${r.quality_rating || '-'}/5, earned ₦${r.payout}`);
      }
      loadSchedule();
    } catch (err) { alert(err.message); }
  };

  const handleMiss = async (eventId) => {
    if (!window.confirm('Mark this event as missed?')) return;
    try {
      await api.post('/boarding/events/miss', {
        routine_event_id: eventId, child_id: selectedChild, date: selectedDate
      });
      loadSchedule();
    } catch (err) { alert(err.message); }
  };

  const handleScanMissed = async () => {
    try {
      await api.post('/boarding/scan-missed', { child_id: selectedChild, date: selectedDate });
      loadSchedule();
    } catch (err) { alert(err.message); }
  };

  const expandChecklist = async (event) => {
    if (!event.checklist_id) return;
    if (expandedEvent === event.id) { setExpandedEvent(null); return; }
    setExpandedEvent(event.id);
    try {
      const items = await api.get(`/boarding/checklist-logs/day?child_id=${selectedChild}&checklist_id=${event.checklist_id}&date=${selectedDate}`);
      setChecklistItems(prev => ({ ...prev, [event.id]: items }));
    } catch (err) { console.error(err); }
  };

  const toggleItem = async (eventId, item) => {
    try {
      await api.post('/boarding/checklist-logs/toggle', {
        checklist_item_id: item.id,
        child_id: selectedChild,
        checked: !item.checked,
        date: selectedDate
      });
      const ev = schedule.find(e => e.id === eventId);
      const items = await api.get(`/boarding/checklist-logs/day?child_id=${selectedChild}&checklist_id=${ev.checklist_id}&date=${selectedDate}`);
      setChecklistItems(prev => ({ ...prev, [eventId]: items }));
    } catch (err) { alert(err.message); }
  };

  // ===== Settings handlers =====
  const submitRoutine = async (e) => {
    e.preventDefault();
    try {
      await api.post('/boarding/routines', { ...routineForm, child_id: routineForm.child_id || null });
      setRoutineForm({ name: '', description: '', days_of_week: [1,2,3,4,5], child_id: '' });
      setShowRoutineForm(false);
      loadRoutines();
    } catch (err) { alert(err.message); }
  };

  const deleteRoutine = async (id) => {
    if (!window.confirm('Delete this routine and all its events?')) return;
    try { await api.delete(`/boarding/routines/${id}`); loadRoutines(); }
    catch (err) { alert(err.message); }
  };

  const submitEvent = async (e, routineId) => {
    e.preventDefault();
    try {
      await api.post('/boarding/events', {
        ...eventForm, routine_id: routineId,
        checklist_id: eventForm.checklist_id || null,
        payout: parseFloat(eventForm.payout) || 0,
        duration_minutes: parseInt(eventForm.duration_minutes) || 15,
        on_time_bonus_pct: parseInt(eventForm.on_time_bonus_pct) || 0,
        late_penalty_pct: parseInt(eventForm.late_penalty_pct) || 0
      });
      setEventForm({ name: '', icon: '⏰', scheduled_time: '06:00', duration_minutes: 15, category: 'alarm', checklist_id: '', payout: 0, on_time_bonus_pct: 50, late_penalty_pct: 50 });
      setShowEventForm(null);
      const r = await api.get(`/boarding/routines`);
      setRoutines(r);
    } catch (err) { alert(err.message); }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try { await api.delete(`/boarding/events/${id}`); loadRoutines(); }
    catch (err) { alert(err.message); }
  };

  const submitChecklist = async (e) => {
    e.preventDefault();
    try {
      await api.post('/boarding/checklists', checklistForm);
      setChecklistForm({ name: '', description: '', category: 'general' });
      setShowChecklistForm(false);
      loadChecklists();
    } catch (err) { alert(err.message); }
  };

  const deleteChecklist = async (id) => {
    if (!window.confirm('Delete this checklist?')) return;
    try { await api.delete(`/boarding/checklists/${id}`); loadChecklists(); setEditingChecklist(null); }
    catch (err) { alert(err.message); }
  };

  const submitItem = async (e, checklistId) => {
    e.preventDefault();
    try {
      await api.post(`/boarding/checklists/${checklistId}/items`, {
        label: itemForm.label,
        payout_per_item: parseFloat(itemForm.payout_per_item) || 0
      });
      setItemForm({ label: '', payout_per_item: 0 });
      setShowItemForm(null);
      if (editingChecklist) {
        const fresh = await api.get(`/boarding/checklists/${editingChecklist.id}`);
        setEditingChecklist(fresh);
      }
      loadChecklists();
    } catch (err) { alert(err.message); }
  };

  const deleteItem = async (id) => {
    try {
      await api.delete(`/boarding/checklist-items/${id}`);
      if (editingChecklist) {
        const fresh = await api.get(`/boarding/checklists/${editingChecklist.id}`);
        setEditingChecklist(fresh);
      }
    } catch (err) { alert(err.message); }
  };

  // ===== Render =====
  const today = new Date().toISOString().split('T')[0];
  const totals = schedule.reduce((acc, ev) => {
    if (ev.status === 'completed') acc.completed++;
    else if (ev.status === 'late') acc.late++;
    else if (ev.status === 'missed') acc.missed++;
    else acc.pending++;
    if (ev.log?.payout_earned) acc.earned += parseFloat(ev.log.payout_earned);
    return acc;
  }, { completed: 0, late: 0, missed: 0, pending: 0, earned: 0 });

  return (
    <div className="page">
      <div className="page-header">
        <h1>⏰ Boarding School</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${view === 'today' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('today')}>Today</button>
          <button className={`btn btn-sm ${view === 'settings' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('settings')}>Settings</button>
        </div>
      </div>

      {view === 'today' && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <small>Child</small>
                <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
                  {children?.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
              </label>
              <label style={{ display: 'flex', flexDirection: 'column' }}>
                <small>Date</small>
                <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
              </label>
              <button className="btn btn-secondary btn-sm" onClick={handleScanMissed}>Auto-mark missed</button>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <span>✅ {totals.completed} done</span>
              <span>⏱️ {totals.late} late</span>
              <span>❌ {totals.missed} missed</span>
              <span>⏳ {totals.pending} pending</span>
              <span style={{ marginLeft: 'auto', fontWeight: 'bold' }}>💰 ₦{totals.earned.toFixed(2)} earned</span>
            </div>
          </div>

          {loading && <div className="loading">Loading...</div>}
          {!loading && schedule.length === 0 && (
            <div className="card empty-state">
              <p>No routine events scheduled for this day.</p>
              <button className="btn btn-primary" onClick={() => setView('settings')}>Set up routines</button>
            </div>
          )}

          {schedule.map(ev => {
            const isLive = selectedDate === today && ev.status === 'pending';
            return (
              <div key={ev.id} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${
                ev.status === 'completed' ? '#27ae60' :
                ev.status === 'late' ? '#f39c12' :
                ev.status === 'missed' ? '#e74c3c' : '#bdc3c7'
              }` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: '1.8rem' }}>{ev.icon || CATEGORY_ICONS[ev.category] || '⏰'}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold' }}>{ev.name}</div>
                    <small style={{ color: '#666' }}>
                      {ev.scheduled_time?.slice(0,5)} · {ev.routine_name}
                      {ev.payout > 0 && ` · ₦${ev.payout}`}
                    </small>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {ev.checklist_id && (
                      <button className="btn btn-secondary btn-sm" onClick={() => expandChecklist(ev)}>
                        {expandedEvent === ev.id ? 'Hide' : 'Checklist'}
                      </button>
                    )}
                    {ev.status === 'pending' && (
                      <>
                        {!ev.log?.started_at && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleStart(ev.id)} title="Start timer">▶</button>
                        )}
                        {ev.log?.started_at && (
                          <span style={{ fontSize: '0.75rem', color: '#3498db' }} title={`Started ${new Date(ev.log.started_at).toLocaleTimeString()}`}>⏱</span>
                        )}
                        <button className="btn btn-primary btn-sm" onClick={() => handleComplete(ev.id)}>✓</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleMiss(ev.id)}>✗</button>
                      </>
                    )}
                    {ev.status !== 'pending' && (
                      <span style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: 12,
                        background: ev.status === 'completed' ? '#d4edda' : ev.status === 'late' ? '#fff3cd' : '#f8d7da',
                        color: ev.status === 'completed' ? '#155724' : ev.status === 'late' ? '#856404' : '#721c24'
                      }}>
                        {ev.status}
                        {ev.log?.duration_seconds != null && ` · ${Math.round(ev.log.duration_seconds/60)}min`}
                        {ev.log?.quality_rating && ` · Q${ev.log.quality_rating}/5`}
                        {ev.log?.speed_rating && ` · S${ev.log.speed_rating}/5`}
                        {ev.log?.payout_earned > 0 && ` · ₦${parseFloat(ev.log.payout_earned).toFixed(2)}`}
                      </span>
                    )}
                  </div>
                </div>
                {isLive && (
                  <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#3498db' }}>🔔 alarm armed</div>
                )}
                {expandedEvent === ev.id && ev.checklist_id && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eee' }}>
                    {(checklistItems[ev.id] || []).map(item => (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!item.checked} onChange={() => toggleItem(ev.id, item)} />
                        <span style={{ flex: 1, textDecoration: item.checked ? 'line-through' : 'none' }}>{item.label}</span>
                        {item.payout_per_item > 0 && <small>₦{item.payout_per_item}</small>}
                      </label>
                    ))}
                    {(!checklistItems[ev.id] || checklistItems[ev.id].length === 0) && (
                      <small style={{ color: '#999' }}>No items in this checklist yet. Add some in Settings.</small>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {view === 'settings' && (
        <>
          <div className="card" style={{ marginBottom: 16, background: '#fef9e7' }}>
            <h3 style={{ margin: '0 0 8px 0' }}>🚀 Quick Setup</h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem' }}>
              One click to create all standard boarding-school routines, checklists (room cleaning, laundry, dishes, car wash, hair, footwear, screen time...), and default savings buckets.
            </p>
            <button className="btn btn-primary" onClick={async () => {
              if (!window.confirm('Seed all default templates? Existing items with the same name will be skipped.')) return;
              try {
                const r = await api.post('/boarding/seed-templates', { child_id: selectedChild || null });
                alert(`Seeded! Routines: ${r.routines_created}, Events: ${r.events_created}, Buckets: ${r.buckets_created}`);
                loadRoutines(); loadChecklists();
              } catch (err) { alert(err.message); }
            }}>✨ Seed Default Templates</button>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Routines</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowRoutineForm(s => !s)}>+ New Routine</button>
            </div>
            {showRoutineForm && (
              <form onSubmit={submitRoutine} style={{ marginTop: 12 }}>
                <input placeholder="Routine name" value={routineForm.name} onChange={e => setRoutineForm({...routineForm, name: e.target.value})} required style={{ width: '100%', marginBottom: 8 }} />
                <input placeholder="Description (optional)" value={routineForm.description} onChange={e => setRoutineForm({...routineForm, description: e.target.value})} style={{ width: '100%', marginBottom: 8 }} />
                <select value={routineForm.child_id} onChange={e => setRoutineForm({...routineForm, child_id: e.target.value})} style={{ width: '100%', marginBottom: 8 }}>
                  <option value="">All children (shared)</option>
                  {children?.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                  {DAYS_OF_WEEK.map((d, i) => (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="checkbox" checked={routineForm.days_of_week.includes(i)}
                        onChange={e => {
                          const v = e.target.checked
                            ? [...routineForm.days_of_week, i].sort()
                            : routineForm.days_of_week.filter(x => x !== i);
                          setRoutineForm({...routineForm, days_of_week: v});
                        }} />
                      {d}
                    </label>
                  ))}
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Save</button>
              </form>
            )}
            {routines.map(r => (
              <div key={r.id} className="card" style={{ marginTop: 10, background: '#f9f9f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{r.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {r.child_id ? `${r.child_first_name || ''} ${r.child_last_name || ''}` : 'All children'}
                      {' · '}
                      {(r.days_of_week || []).map(i => DAYS_OF_WEEK[i]).join(',')}
                      {' · '}
                      {r.event_count || 0} events
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowEventForm(showEventForm === r.id ? null : r.id)}>+ Event</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteRoutine(r.id)}>Delete</button>
                  </div>
                </div>
                {showEventForm === r.id && (
                  <form onSubmit={e => submitEvent(e, r.id)} style={{ marginTop: 10, padding: 10, background: 'white', borderRadius: 4 }}>
                    <input placeholder="Event name (e.g. Rising Bell)" value={eventForm.name} onChange={e => setEventForm({...eventForm, name: e.target.value})} required style={{ width: '100%', marginBottom: 6 }} />
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input type="time" value={eventForm.scheduled_time} onChange={e => setEventForm({...eventForm, scheduled_time: e.target.value})} required />
                      <input type="number" placeholder="window min" value={eventForm.duration_minutes} onChange={e => setEventForm({...eventForm, duration_minutes: e.target.value})} style={{ width: 90 }} />
                      <select value={eventForm.category} onChange={e => setEventForm({...eventForm, category: e.target.value})}>
                        {Object.keys(CATEGORY_ICONS).map(k => <option key={k} value={k}>{CATEGORY_ICONS[k]} {k}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input type="number" step="0.01" placeholder="₦ payout" value={eventForm.payout} onChange={e => setEventForm({...eventForm, payout: e.target.value})} />
                      <input type="number" placeholder="bonus %" value={eventForm.on_time_bonus_pct} onChange={e => setEventForm({...eventForm, on_time_bonus_pct: e.target.value})} style={{ width: 90 }} />
                      <input type="number" placeholder="penalty %" value={eventForm.late_penalty_pct} onChange={e => setEventForm({...eventForm, late_penalty_pct: e.target.value})} style={{ width: 90 }} />
                    </div>
                    <select value={eventForm.checklist_id} onChange={e => setEventForm({...eventForm, checklist_id: e.target.value})} style={{ width: '100%', marginBottom: 6 }}>
                      <option value="">No checklist</option>
                      {checklists.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="submit" className="btn btn-primary btn-sm">Add Event</button>
                  </form>
                )}
                {r.events && r.events.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {r.events.map(ev => (
                      <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.9rem' }}>
                        <span>{ev.icon || CATEGORY_ICONS[ev.category] || '⏰'}</span>
                        <span>{ev.scheduled_time?.slice(0,5)}</span>
                        <span style={{ flex: 1 }}>{ev.name}</span>
                        {ev.payout > 0 && <small>₦{ev.payout}</small>}
                        <button className="btn btn-danger btn-sm" onClick={() => deleteEvent(ev.id)} style={{ padding: '2px 6px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Checklists</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowChecklistForm(s => !s)}>+ New Checklist</button>
            </div>
            {showChecklistForm && (
              <form onSubmit={submitChecklist} style={{ marginTop: 12 }}>
                <input placeholder="Name (e.g. School Readiness)" value={checklistForm.name} onChange={e => setChecklistForm({...checklistForm, name: e.target.value})} required style={{ width: '100%', marginBottom: 8 }} />
                <select value={checklistForm.category} onChange={e => setChecklistForm({...checklistForm, category: e.target.value})} style={{ width: '100%', marginBottom: 8 }}>
                  <option value="general">General</option>
                  <option value="school_ready">School Readiness</option>
                  <option value="return_home">Return Home</option>
                  <option value="bedtime">Bedtime</option>
                </select>
                <button type="submit" className="btn btn-primary btn-sm">Save</button>
              </form>
            )}
            {checklists.map(cl => (
              <div key={cl.id} className="card" style={{ marginTop: 10, background: '#f9f9f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{cl.name}</strong>
                    <small style={{ color: '#666', marginLeft: 8 }}>{cl.category} · {cl.item_count || 0} items</small>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={async () => {
                      const fresh = await api.get(`/boarding/checklists/${cl.id}`);
                      setEditingChecklist(editingChecklist?.id === cl.id ? null : fresh);
                    }}>Edit Items</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteChecklist(cl.id)}>Delete</button>
                  </div>
                </div>
                {editingChecklist?.id === cl.id && (
                  <div style={{ marginTop: 10, padding: 10, background: 'white', borderRadius: 4 }}>
                    {(editingChecklist.items || []).map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.payout_per_item > 0 && <small>₦{item.payout_per_item}</small>}
                        <button className="btn btn-danger btn-sm" onClick={() => deleteItem(item.id)} style={{ padding: '2px 6px' }}>×</button>
                      </div>
                    ))}
                    {showItemForm !== cl.id && (
                      <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }} onClick={() => setShowItemForm(cl.id)}>+ Add Item</button>
                    )}
                    {showItemForm === cl.id && (
                      <form onSubmit={e => submitItem(e, cl.id)} style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                        <input placeholder="Item label" value={itemForm.label} onChange={e => setItemForm({...itemForm, label: e.target.value})} required style={{ flex: 1 }} />
                        <input type="number" step="0.01" placeholder="₦" value={itemForm.payout_per_item} onChange={e => setItemForm({...itemForm, payout_per_item: e.target.value})} style={{ width: 70 }} />
                        <button type="submit" className="btn btn-primary btn-sm">Add</button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
