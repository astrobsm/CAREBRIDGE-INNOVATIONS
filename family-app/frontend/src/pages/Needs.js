import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const CATEGORIES = ['general', 'toiletry', 'clothing', 'shoes', 'school', 'stationery', 'snack', 'grooming'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const STATUSES = ['requested', 'approved', 'purchased', 'rejected'];

const STATUS_COLOR = {
  requested: '#f39c12', approved: '#3498db', purchased: '#27ae60', rejected: '#95a5a6'
};
const PRIORITY_COLOR = {
  low: '#95a5a6', normal: '#3498db', high: '#f39c12', urgent: '#e74c3c'
};

export default function Needs() {
  const { children } = useApp();
  const [needs, setNeeds] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    child_id: '', category: 'general', item_name: '', description: '',
    estimated_cost: 0, priority: 'normal', bucket_id: '', notes: '', requested_by: 'parent'
  });
  const [fulfillForm, setFulfillForm] = useState(null); // { id, actual_cost, debit_bucket }

  useEffect(() => {
    if (children?.length && !selectedChild) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (selectedChild) params.append('child_id', selectedChild);
      if (filterStatus) params.append('status', filterStatus);
      const data = await api.get(`/needs?${params}`);
      setNeeds(Array.isArray(data) ? data : []);
      if (selectedChild) {
        const b = await api.get(`/buckets?child_id=${selectedChild}`);
        setBuckets(Array.isArray(b) ? b : []);
      }
    } catch (err) { console.error(err); }
  }, [selectedChild, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...form,
        child_id: form.child_id || selectedChild,
        estimated_cost: parseFloat(form.estimated_cost) || 0,
        bucket_id: form.bucket_id || null
      };
      if (editingId) await api.put(`/needs/${editingId}`, body);
      else await api.post('/needs', body);
      setForm({ child_id: '', category: 'general', item_name: '', description: '', estimated_cost: 0, priority: 'normal', bucket_id: '', notes: '', requested_by: 'parent' });
      setShowForm(false); setEditingId(null);
      load();
    } catch (err) { alert(err.message); }
  };

  const startEdit = (n) => {
    setForm({
      child_id: n.child_id, category: n.category, item_name: n.item_name,
      description: n.description || '', estimated_cost: n.estimated_cost,
      priority: n.priority, bucket_id: n.bucket_id || '', notes: n.notes || '',
      requested_by: n.requested_by || 'parent'
    });
    setEditingId(n.id);
    setShowForm(true);
  };

  const changeStatus = async (id, status) => {
    try { await api.put(`/needs/${id}`, { status }); load(); }
    catch (err) { alert(err.message); }
  };

  const fulfill = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/needs/${fulfillForm.id}/fulfill`, {
        actual_cost: parseFloat(fulfillForm.actual_cost) || 0,
        debit_bucket: !!fulfillForm.debit_bucket
      });
      setFulfillForm(null);
      load();
    } catch (err) { alert(err.message); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this need?')) return;
    try { await api.delete(`/needs/${id}`); load(); }
    catch (err) { alert(err.message); }
  };

  const totals = needs.reduce((acc, n) => {
    if (n.status === 'requested') acc.requested += parseFloat(n.estimated_cost || 0);
    if (n.status === 'purchased') acc.purchased += parseFloat(n.actual_cost || n.estimated_cost || 0);
    return acc;
  }, { requested: 0, purchased: 0 });

  return (
    <div className="page">
      <div className="page-header"><h1>📋 Needs & Wishlist</h1></div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
            <option value="">All children</option>
            {children?.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(s => !s); setEditingId(null); }}>+ Add Need</button>
        </div>
        <div style={{ marginTop: 8, fontSize: '0.9rem' }}>
          Outstanding: <strong>₦{totals.requested.toFixed(2)}</strong> · Purchased: <strong>₦{totals.purchased.toFixed(2)}</strong>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 12 }}>
          <form onSubmit={submit}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <select value={form.child_id || selectedChild} onChange={e => setForm({...form, child_id: e.target.value})} required>
                {children?.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
              </select>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={form.requested_by} onChange={e => setForm({...form, requested_by: e.target.value})}>
                <option value="parent">Parent</option>
                <option value="child">Child</option>
              </select>
            </div>
            <input placeholder="Item name (e.g. Toothpaste, Exercise book)" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} required style={{ width: '100%', marginBottom: 6 }} />
            <input placeholder="Description (optional)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ width: '100%', marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input type="number" step="0.01" placeholder="Estimated ₦" value={form.estimated_cost} onChange={e => setForm({...form, estimated_cost: e.target.value})} />
              <select value={form.bucket_id} onChange={e => setForm({...form, bucket_id: e.target.value})} style={{ flex: 1 }}>
                <option value="">No bucket linked</option>
                {buckets.map(b => <option key={b.id} value={b.id}>{b.name} (₦{b.balance})</option>)}
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">{editingId ? 'Update' : 'Add'}</button>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
          </form>
        </div>
      )}

      {needs.length === 0 && <div className="card empty-state">No needs logged.</div>}

      {needs.map(n => (
        <div key={n.id} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${PRIORITY_COLOR[n.priority]}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold' }}>{n.item_name}
                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', background: STATUS_COLOR[n.status], color: 'white' }}>{n.status}</span>
                <span style={{ marginLeft: 6, padding: '2px 8px', borderRadius: 10, fontSize: '0.75rem', background: PRIORITY_COLOR[n.priority], color: 'white' }}>{n.priority}</span>
              </div>
              <small style={{ color: '#666' }}>
                {n.child_name} · {n.category} · est ₦{parseFloat(n.estimated_cost).toFixed(2)}
                {n.actual_cost && ` · paid ₦${parseFloat(n.actual_cost).toFixed(2)}`}
                {n.bucket_name && ` · ${n.bucket_name}`}
                {' · '}{new Date(n.created_at).toLocaleDateString()}
              </small>
              {n.description && <div style={{ fontSize: '0.85rem', marginTop: 4 }}>{n.description}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {n.status === 'requested' && <button className="btn btn-secondary btn-sm" onClick={() => changeStatus(n.id, 'approved')}>Approve</button>}
              {n.status !== 'purchased' && n.status !== 'rejected' && <button className="btn btn-primary btn-sm" onClick={() => setFulfillForm({ id: n.id, actual_cost: n.estimated_cost, debit_bucket: !!n.bucket_id })}>Fulfill</button>}
              {n.status === 'requested' && <button className="btn btn-danger btn-sm" onClick={() => changeStatus(n.id, 'rejected')}>Reject</button>}
              <button className="btn btn-secondary btn-sm" onClick={() => startEdit(n)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(n.id)}>×</button>
            </div>
          </div>
          {fulfillForm?.id === n.id && (
            <form onSubmit={fulfill} style={{ marginTop: 10, padding: 10, background: '#f9f9f9', borderRadius: 4, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <label>Actual cost ₦</label>
              <input type="number" step="0.01" value={fulfillForm.actual_cost} onChange={e => setFulfillForm({...fulfillForm, actual_cost: e.target.value})} style={{ width: 100 }} />
              {n.bucket_id && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={!!fulfillForm.debit_bucket} onChange={e => setFulfillForm({...fulfillForm, debit_bucket: e.target.checked})} />
                  Debit {n.bucket_name}
                </label>
              )}
              <button type="submit" className="btn btn-primary btn-sm">Mark Purchased</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFulfillForm(null)}>Cancel</button>
            </form>
          )}
        </div>
      ))}
    </div>
  );
}
