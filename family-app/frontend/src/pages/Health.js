import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function Health() {
  const { children } = useApp();
  const [records, setRecords] = useState([]);
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || '');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    child_id: '', record_type: 'checkup', title: '', description: '',
    doctor_name: '', hospital: '', date: new Date().toISOString().split('T')[0],
    next_appointment: '', medications: '', allergies: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    if (selectedChild) loadRecords();
  }, [selectedChild]);

  const loadRecords = async () => {
    try {
      const data = await api.get(`/health?child_id=${selectedChild}`);
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/health', { ...form, child_id: form.child_id || selectedChild });
      loadRecords();
      setForm({
        child_id: '', record_type: 'checkup', title: '', description: '',
        doctor_name: '', hospital: '', date: new Date().toISOString().split('T')[0],
        next_appointment: '', medications: '', allergies: '',
      });
      setShowForm(false);
    } catch (err) { alert(err.message); }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this health record?')) return;
    try {
      await api.delete(`/health/${id}`);
      loadRecords();
    } catch (err) { alert(err.message); }
  };

  const typeIcons = { checkup: '🩺', vaccination: '💉', illness: '🤒', allergy: '🤧', dental: '🦷', eye: '👁️', emergency: '🚑', other: '📋' };
  const typeColors = { checkup: '#3498db', vaccination: '#27ae60', illness: '#e74c3c', allergy: '#f39c12', dental: '#9b59b6', eye: '#1abc9c', emergency: '#c0392b', other: '#95a5a6' };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">🏥 Health Records</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Record'}
        </button>
      </div>

      <div className="filter-tabs">
        {children.map(c => (
          <button key={c.id} className={`filter-tab ${selectedChild === c.id ? 'active' : ''}`} onClick={() => setSelectedChild(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Child</label>
                <select value={form.child_id || selectedChild} onChange={(e) => setForm({ ...form, child_id: e.target.value })}>
                  {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Type</label>
                <select value={form.record_type} onChange={(e) => setForm({ ...form, record_type: e.target.value })}>
                  {Object.keys(typeIcons).map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g. Annual checkup" />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Doctor</label>
                <input type="text" value={form.doctor_name} onChange={(e) => setForm({ ...form, doctor_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Hospital/Clinic</label>
                <input type="text" value={form.hospital} onChange={(e) => setForm({ ...form, hospital: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date *</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Next Appointment</label>
                <input type="date" value={form.next_appointment} onChange={(e) => setForm({ ...form, next_appointment: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Medications</label>
              <textarea value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} rows={2} placeholder="List medications..." />
            </div>
            <div className="form-group">
              <label>Allergies</label>
              <input type="text" value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} placeholder="Known allergies" />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Save Record</button>
          </form>
        </div>
      )}

      {records.length === 0 ? (
        <div className="empty-state"><p>No health records yet</p></div>
      ) : (
        <div className="health-list">
          {records.map(r => (
            <div key={r.id} className="card health-card" style={{ borderLeftColor: typeColors[r.record_type] || '#95a5a6' }}>
              <div className="health-header">
                <span className="health-icon">{typeIcons[r.record_type] || '📋'}</span>
                <div>
                  <h4>{r.title}</h4>
                  <span className="badge" style={{ background: typeColors[r.record_type] }}>{r.record_type}</span>
                </div>
                <span className="health-date">{new Date(r.date).toLocaleDateString()}</span>
              </div>
              {r.description && <p className="health-desc">{r.description}</p>}
              <div className="health-details">
                {r.doctor_name && <span>👨‍⚕️ {r.doctor_name}</span>}
                {r.hospital && <span>🏥 {r.hospital}</span>}
                {r.medications && <span>💊 {r.medications}</span>}
                {r.next_appointment && <span>📅 Next: {new Date(r.next_appointment).toLocaleDateString()}</span>}
              </div>
              <button className="btn-xs btn-danger" onClick={() => deleteRecord(r.id)} style={{ marginTop: '0.5rem' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
