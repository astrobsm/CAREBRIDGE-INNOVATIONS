import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', category: 'general', start_date: '', end_date: '', status: 'draft' });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [goalForm, setGoalForm] = useState({ title: '', target_value: '', unit: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPlans(); }, []);

  const loadPlans = async () => {
    try {
      const data = await api.get('/plans');
      setPlans(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/plans', form);
      loadPlans();
      setForm({ title: '', description: '', category: 'general', start_date: '', end_date: '', status: 'draft' });
      setShowForm(false);
    } catch (err) { alert(err.message); }
  };

  const addGoal = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      await api.post(`/plans/${selectedPlan.id}/goals`, {
        ...goalForm,
        target_value: parseFloat(goalForm.target_value) || 0,
      });
      const updated = await api.get(`/plans/${selectedPlan.id}`);
      setSelectedPlan(updated);
      loadPlans();
      setGoalForm({ title: '', target_value: '', unit: '' });
    } catch (err) { alert(err.message); }
  };

  const updateGoalProgress = async (goalId, currentValue) => {
    try {
      await api.put(`/plans/goals/${goalId}`, { current_value: parseFloat(currentValue) });
      const updated = await api.get(`/plans/${selectedPlan.id}`);
      setSelectedPlan(updated);
    } catch (err) { alert(err.message); }
  };

  const deletePlan = async (planId) => {
    if (!window.confirm('Delete this plan?')) return;
    try {
      await api.delete(`/plans/${planId}`);
      setSelectedPlan(null);
      loadPlans();
    } catch (err) { alert(err.message); }
  };

  const statusColors = { draft: '#95a5a6', active: '#3498db', completed: '#27ae60', cancelled: '#e74c3c' };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">📋 Plans</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ New Plan'}
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
                <label>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="general">General</option>
                  <option value="education">Education</option>
                  <option value="financial">Financial</option>
                  <option value="spiritual">Spiritual</option>
                  <option value="health">Health</option>
                  <option value="family">Family</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-block">Create Plan</button>
          </form>
        </div>
      )}

      <div className="plans-list">
        {plans.length === 0 ? (
          <div className="empty-state"><p>No plans yet</p></div>
        ) : (
          plans.map(plan => (
            <div key={plan.id} className={`card plan-card ${selectedPlan?.id === plan.id ? 'selected' : ''}`} onClick={() => setSelectedPlan(plan)}>
              <div className="plan-header">
                <h4>{plan.title}</h4>
                <span className="status-badge" style={{ background: statusColors[plan.status] }}>{plan.status}</span>
              </div>
              {plan.description && <p className="plan-desc">{plan.description}</p>}
              <div className="plan-meta">
                <span className="badge badge-outline">{plan.category}</span>
                {plan.start_date && <span>{new Date(plan.start_date).toLocaleDateString()} - {plan.end_date ? new Date(plan.end_date).toLocaleDateString() : 'Ongoing'}</span>}
              </div>
              {plan.goals && plan.goals.length > 0 && (
                <div className="plan-progress">
                  {plan.goals.map(g => (
                    <div key={g.id} className="goal-progress">
                      <span>{g.title}</span>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${Math.min(100, (g.current_value / g.target_value) * 100)}%` }}></div>
                      </div>
                      <span className="progress-text">{g.current_value}/{g.target_value} {g.unit}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {selectedPlan && (
        <div className="modal-overlay" onClick={() => setSelectedPlan(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedPlan.title}</h3>
              <button className="modal-close" onClick={() => setSelectedPlan(null)}>×</button>
            </div>
            <div className="modal-body">
              <h4>Goals</h4>
              {selectedPlan.goals && selectedPlan.goals.map(g => (
                <div key={g.id} className="goal-item">
                  <span>{g.title}</span>
                  <input
                    type="number"
                    defaultValue={g.current_value}
                    onBlur={(e) => updateGoalProgress(g.id, e.target.value)}
                    style={{ width: '80px' }}
                  />
                  <span>/ {g.target_value} {g.unit}</span>
                </div>
              ))}
              <form onSubmit={addGoal} className="inline-form">
                <input type="text" placeholder="Goal title" value={goalForm.title} onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })} required />
                <input type="number" placeholder="Target" value={goalForm.target_value} onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })} required style={{ width: '80px' }} />
                <input type="text" placeholder="Unit" value={goalForm.unit} onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })} style={{ width: '80px' }} />
                <button type="submit" className="btn btn-sm btn-primary">Add Goal</button>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => deletePlan(selectedPlan.id)}>Delete Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
