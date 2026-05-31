import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function Education() {
  const { children } = useApp();
  const [assignments, setAssignments] = useState([]);
  const [selectedChild, setSelectedChild] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    child_id: '', subject: '', title: '', description: '', due_date: '', status: 'pending',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAssignments(); }, [selectedChild]);

  const loadAssignments = async () => {
    try {
      const url = selectedChild === 'all' ? '/education' : `/education?child_id=${selectedChild}`;
      const data = await api.get(url);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/education', form);
      loadAssignments();
      setForm({ child_id: '', subject: '', title: '', description: '', due_date: '', status: 'pending' });
      setShowForm(false);
    } catch (err) { alert(err.message); }
  };

  const updateStatus = async (id, status, score) => {
    try {
      await api.put(`/education/${id}`, { status, score: score ? parseFloat(score) : undefined });
      loadAssignments();
    } catch (err) { alert(err.message); }
  };

  const statusIcons = { pending: '⏳', in_progress: '📝', completed: '✅', graded: '🏆' };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">📚 Education</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Assignment'}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Child *</label>
              <select value={form.child_id} onChange={(e) => setForm({ ...form, child_id: e.target.value })} required>
                <option value="">Select child</option>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Subject *</label>
                <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required placeholder="e.g. Mathematics" />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Add Assignment</button>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        <button className={`filter-tab ${selectedChild === 'all' ? 'active' : ''}`} onClick={() => setSelectedChild('all')}>All</button>
        {children.map(c => (
          <button key={c.id} className={`filter-tab ${selectedChild === c.id ? 'active' : ''}`} onClick={() => setSelectedChild(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {assignments.length === 0 ? (
        <div className="empty-state"><p>No assignments</p></div>
      ) : (
        <div className="assignment-list">
          {assignments.map(a => (
            <div key={a.id} className={`card assignment-card ${a.status}`}>
              <div className="assignment-header">
                <span className="assignment-icon">{statusIcons[a.status]}</span>
                <div>
                  <h4>{a.title}</h4>
                  <span className="text-muted">{a.subject}</span>
                </div>
                {a.score !== null && a.score !== undefined && (
                  <span className="score-badge">{a.score}%</span>
                )}
              </div>
              {a.description && <p className="assignment-desc">{a.description}</p>}
              <div className="assignment-meta">
                <span>{a.child_name}</span>
                {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
              </div>
              <div className="assignment-actions">
                {a.status === 'pending' && (
                  <button className="btn btn-sm" onClick={() => updateStatus(a.id, 'in_progress')}>Start</button>
                )}
                {a.status === 'in_progress' && (
                  <button className="btn btn-sm btn-success" onClick={() => updateStatus(a.id, 'completed')}>Complete</button>
                )}
                {a.status === 'completed' && (
                  <div className="grade-input">
                    <input type="number" placeholder="Score %" min="0" max="100"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') updateStatus(a.id, 'graded', e.target.value);
                      }}
                    />
                    <span className="text-muted text-sm">Press Enter to grade</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
