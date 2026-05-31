import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function Tasks() {
  const { children } = useApp();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', reward_amount: '', penalty_amount: '',
    due_date: '', assigned_to: [], recurrence: 'none',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadTasks(); }, []);

  const loadTasks = async () => {
    try {
      const data = await api.get('/tasks');
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const task = await api.post('/tasks', {
        ...form,
        reward_amount: parseFloat(form.reward_amount) || 0,
        penalty_amount: parseFloat(form.penalty_amount) || 0,
      });
      // Assign to selected children
      for (const childId of form.assigned_to) {
        await api.post(`/tasks/${task.id}/assign`, { child_id: childId });
      }
      await loadTasks();
      setForm({ title: '', description: '', priority: 'medium', reward_amount: '', penalty_amount: '', due_date: '', assigned_to: [], recurrence: 'none' });
      setShowForm(false);
    } catch (err) { alert(err.message); }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      await api.put(`/tasks/${taskId}`, { status });
      loadTasks();
    } catch (err) { alert(err.message); }
  };

  const updateAssignment = async (assignmentId, status, rating) => {
    try {
      await api.put(`/tasks/assignments/${assignmentId}`, { status, rating });
      loadTasks();
    } catch (err) { alert(err.message); }
  };

  const toggleChild = (childId) => {
    setForm(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(childId)
        ? prev.assigned_to.filter(id => id !== childId)
        : [...prev.assigned_to, childId],
    }));
  };

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter);

  const priorityColor = { high: '#e74c3c', medium: '#f39c12', low: '#27ae60' };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">🎯 Tasks</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Task'}
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
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Reward (₦)</label>
                <input type="number" value={form.reward_amount} onChange={(e) => setForm({ ...form, reward_amount: e.target.value })} min="0" />
              </div>
              <div className="form-group">
                <label>Penalty (₦)</label>
                <input type="number" value={form.penalty_amount} onChange={(e) => setForm({ ...form, penalty_amount: e.target.value })} min="0" />
              </div>
            </div>
            <div className="form-group">
              <label>Recurrence</label>
              <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                <option value="none">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="form-group">
              <label>Assign To</label>
              <div className="chip-group">
                {children.map(c => (
                  <button type="button" key={c.id}
                    className={`chip ${form.assigned_to.includes(c.id) ? 'chip-active' : ''}`}
                    onClick={() => toggleChild(c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Create Task</button>
          </form>
        </div>
      )}

      <div className="filter-tabs">
        {['all', 'pending', 'in_progress', 'completed'].map(f => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state"><p>No tasks found</p></div>
      ) : (
        <div className="task-list">
          {filtered.map(task => (
            <div key={task.id} className={`task-card ${task.status}`}>
              <div className="task-header">
                <span className="priority-dot" style={{ background: priorityColor[task.priority] }}></span>
                <h4 className="task-title">{task.title}</h4>
                {task.reward_amount > 0 && <span className="task-reward">₦{parseFloat(task.reward_amount).toLocaleString()}</span>}
              </div>
              {task.description && <p className="task-desc">{task.description}</p>}
              <div className="task-meta">
                {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                <span className={`status-badge ${task.status}`}>{task.status.replace('_', ' ')}</span>
              </div>
              {task.assignments && task.assignments.length > 0 && (
                <div className="task-assignments">
                  {task.assignments.map(a => (
                    <div key={a.id} className="assignment-chip">
                      <span>{a.child_name}</span>
                      <span className={`status-dot ${a.status}`}></span>
                      {a.status === 'pending' && (
                        <button className="btn-xs" onClick={() => updateAssignment(a.id, 'completed', 5)}>✓</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {task.status === 'pending' && (
                <div className="task-actions">
                  <button className="btn btn-sm" onClick={() => updateTaskStatus(task.id, 'in_progress')}>Start</button>
                  <button className="btn btn-sm btn-success" onClick={() => updateTaskStatus(task.id, 'completed')}>Complete</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
