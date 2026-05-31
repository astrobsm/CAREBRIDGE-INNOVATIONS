import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const EVENT_TYPES = [
  { value: 'outing', label: 'Family Outing', icon: '🎢', color: '#9b59b6' },
  { value: 'house_party', label: 'House Party', icon: '🎉', color: '#e74c3c' },
  { value: 'relation_visit', label: 'Visit Relations', icon: '👨‍👩‍👧‍👦', color: '#3498db' },
  { value: 'birthday', label: 'Birthday', icon: '🎂', color: '#f39c12' },
  { value: 'holiday', label: 'Holiday', icon: '🏖️', color: '#1abc9c' },
  { value: 'other', label: 'Other', icon: '📅', color: '#95a5a6' },
];
const RECURRENCE = ['none', 'weekly', 'monthly', 'yearly'];

function localDateTimeInput(d) {
  const dt = new Date(d);
  const pad = n => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export default function FamilyEvents() {
  const { children } = useApp();
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('upcoming'); // upcoming|all|past
  const [form, setForm] = useState({
    title: '', description: '', event_type: 'outing',
    start_at: localDateTimeInput(new Date(Date.now() + 7*24*60*60*1000)),
    end_at: '', location: '', budget: 0, recurrence: 'none', notes: '',
    attendees: []
  });

  const load = useCallback(async () => {
    try {
      let url = '/family-events';
      if (filter === 'upcoming') url = '/family-events/upcoming';
      else if (filter === 'past') url = `/family-events?end=${new Date().toISOString()}`;
      const data = await api.get(url);
      let arr = Array.isArray(data) ? data : [];
      if (filter === 'past') arr = arr.filter(e => new Date(e.start_at) < new Date());
      setEvents(arr);
    } catch (err) { console.error(err); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const t = EVENT_TYPES.find(x => x.value === form.event_type);
      const body = {
        ...form,
        budget: parseFloat(form.budget) || 0,
        icon: t?.icon || '📅',
        color: t?.color || '#9b59b6',
        end_at: form.end_at || null,
      };
      if (editingId) await api.put(`/family-events/${editingId}`, body);
      else await api.post('/family-events', body);
      resetForm();
      load();
    } catch (err) { alert(err.message); }
  };

  const resetForm = () => {
    setForm({
      title: '', description: '', event_type: 'outing',
      start_at: localDateTimeInput(new Date(Date.now() + 7*24*60*60*1000)),
      end_at: '', location: '', budget: 0, recurrence: 'none', notes: '', attendees: []
    });
    setShowForm(false); setEditingId(null);
  };

  const startEdit = (ev) => {
    setForm({
      title: ev.title, description: ev.description || '',
      event_type: ev.event_type,
      start_at: localDateTimeInput(ev.start_at),
      end_at: ev.end_at ? localDateTimeInput(ev.end_at) : '',
      location: ev.location || '', budget: ev.budget || 0,
      recurrence: ev.recurrence || 'none', notes: ev.notes || '',
      attendees: ev.attendees || []
    });
    setEditingId(ev.id); setShowForm(true);
  };

  const changeStatus = async (id, status) => {
    try { await api.put(`/family-events/${id}`, { status }); load(); }
    catch (err) { alert(err.message); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this family event?')) return;
    try { await api.delete(`/family-events/${id}`); load(); }
    catch (err) { alert(err.message); }
  };

  const toggleAttendee = (cid) => {
    setForm(f => ({
      ...f,
      attendees: f.attendees.includes(cid) ? f.attendees.filter(x => x !== cid) : [...f.attendees, cid]
    }));
  };

  return (
    <div className="page">
      <div className="page-header"><h1>🎉 Family Events</h1></div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['upcoming', 'all', 'past'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => { setShowForm(s => !s); setEditingId(null); }}>+ New Event</button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 12 }}>
          <form onSubmit={submit}>
            <input placeholder="Event title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required style={{ width: '100%', marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <select value={form.event_type} onChange={e => setForm({...form, event_type: e.target.value})}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
              <select value={form.recurrence} onChange={e => setForm({...form, recurrence: e.target.value})}>
                {RECURRENCE.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input type="number" step="0.01" placeholder="Budget ₦" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} style={{ width: 110 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <label style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <small>Start</small>
                <input type="datetime-local" value={form.start_at} onChange={e => setForm({...form, start_at: e.target.value})} required />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <small>End (optional)</small>
                <input type="datetime-local" value={form.end_at} onChange={e => setForm({...form, end_at: e.target.value})} />
              </label>
            </div>
            <input placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} style={{ width: '100%', marginBottom: 6 }} />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ width: '100%', marginBottom: 6 }} rows={2} />
            <div style={{ marginBottom: 6 }}>
              <small>Attendees:</small>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                {children?.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: form.attendees.includes(c.id) ? '#3498db' : '#ecf0f1', color: form.attendees.includes(c.id) ? 'white' : 'black', borderRadius: 4, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.attendees.includes(c.id)} onChange={() => toggleAttendee(c.id)} style={{ display: 'none' }} />
                    {c.first_name}
                  </label>
                ))}
              </div>
            </div>
            <textarea placeholder="Notes (preparations, contributions...)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ width: '100%', marginBottom: 6 }} rows={2} />
            <button type="submit" className="btn btn-primary btn-sm">{editingId ? 'Update' : 'Create'}</button>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={resetForm}>Cancel</button>
          </form>
        </div>
      )}

      {events.length === 0 && <div className="card empty-state">No events.</div>}

      {events.map(ev => {
        const t = EVENT_TYPES.find(x => x.value === ev.event_type) || {};
        const when = new Date(ev.start_at);
        const isPast = when < new Date();
        return (
          <div key={ev.id} className="card" style={{ marginBottom: 10, borderLeft: `6px solid ${ev.color || t.color}`, opacity: ev.status === 'cancelled' ? 0.5 : 1 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontSize: '2rem' }}>{ev.icon || t.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>
                  {ev.title}
                  <span style={{ marginLeft: 8, fontSize: '0.7rem', padding: '2px 6px', borderRadius: 8, background: '#ecf0f1' }}>{ev.status}</span>
                  {ev.recurrence !== 'none' && <span style={{ marginLeft: 4, fontSize: '0.7rem', padding: '2px 6px', borderRadius: 8, background: '#fff3cd' }}>↻ {ev.recurrence}</span>}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  📅 {when.toLocaleString()}{ev.end_at && ` → ${new Date(ev.end_at).toLocaleString()}`}
                </div>
                {ev.location && <div style={{ fontSize: '0.85rem' }}>📍 {ev.location}</div>}
                {ev.budget > 0 && <div style={{ fontSize: '0.85rem' }}>💰 ₦{parseFloat(ev.budget).toFixed(2)}</div>}
                {ev.description && <div style={{ fontSize: '0.9rem', marginTop: 4 }}>{ev.description}</div>}
                {ev.attendees?.length > 0 && (
                  <div style={{ fontSize: '0.8rem', marginTop: 4, color: '#666' }}>
                    👥 {ev.attendees.map(aid => {
                      const c = children?.find(ch => ch.id === aid);
                      return c ? c.first_name : '';
                    }).filter(Boolean).join(', ')}
                  </div>
                )}
                {ev.notes && <div style={{ fontSize: '0.8rem', marginTop: 4, fontStyle: 'italic' }}>{ev.notes}</div>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {ev.status === 'planned' && <button className="btn btn-secondary btn-sm" onClick={() => changeStatus(ev.id, 'confirmed')}>Confirm</button>}
                {!isPast && ev.status !== 'cancelled' && ev.status !== 'done' && <button className="btn btn-danger btn-sm" onClick={() => changeStatus(ev.id, 'cancelled')}>Cancel</button>}
                {isPast && ev.status !== 'done' && <button className="btn btn-primary btn-sm" onClick={() => changeStatus(ev.id, 'done')}>Done</button>}
                <button className="btn btn-secondary btn-sm" onClick={() => startEdit(ev)}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(ev.id)}>×</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
