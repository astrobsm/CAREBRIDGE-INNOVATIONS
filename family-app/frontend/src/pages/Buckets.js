import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const DEFAULT_BUCKETS = [
  { name: 'Personal Care', allocation_pct: 40, color: '#3498db', icon: '🧼' },
  { name: 'School Items', allocation_pct: 40, color: '#27ae60', icon: '🎒' },
  { name: 'Personal Effects', allocation_pct: 20, color: '#9b59b6', icon: '👕' },
];

export default function Buckets() {
  const { children } = useApp();
  const [selectedChild, setSelectedChild] = useState('');
  const [buckets, setBuckets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [txForm, setTxForm] = useState(null); // { bucket_id, type }
  const [form, setForm] = useState({ name: '', description: '', allocation_pct: 0, color: '#3498db', icon: '💰' });
  const [tx, setTx] = useState({ amount: '', description: '' });

  useEffect(() => {
    if (children?.length && !selectedChild) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  const load = useCallback(async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const [b, t] = await Promise.all([
        api.get(`/buckets?child_id=${selectedChild}`),
        api.get(`/buckets/transactions?child_id=${selectedChild}&limit=50`)
      ]);
      setBuckets(Array.isArray(b) ? b : []);
      setTransactions(Array.isArray(t) ? t : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedChild]);

  useEffect(() => { load(); }, [load]);

  const seedDefaults = async () => {
    if (!selectedChild) return;
    if (!window.confirm('Create 3 default buckets (Personal Care 40%, School Items 40%, Personal Effects 20%)?')) return;
    try {
      for (const b of DEFAULT_BUCKETS) {
        await api.post('/buckets', { ...b, child_id: selectedChild });
      }
      load();
    } catch (err) { alert(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/buckets/${editingId}`, {
          ...form,
          allocation_pct: parseInt(form.allocation_pct) || 0
        });
      } else {
        await api.post('/buckets', {
          ...form, child_id: selectedChild,
          allocation_pct: parseInt(form.allocation_pct) || 0
        });
      }
      setForm({ name: '', description: '', allocation_pct: 0, color: '#3498db', icon: '💰' });
      setShowForm(false); setEditingId(null);
      load();
    } catch (err) { alert(err.message); }
  };

  const startEdit = (b) => {
    setForm({ name: b.name, description: b.description || '', allocation_pct: b.allocation_pct, color: b.color, icon: b.icon });
    setEditingId(b.id);
    setShowForm(true);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this bucket?')) return;
    try { await api.delete(`/buckets/${id}`); load(); }
    catch (err) { alert(err.message); }
  };

  const submitTx = async (e) => {
    e.preventDefault();
    try {
      const endpoint = txForm.type === 'debit' ? '/buckets/debit' : '/buckets/credit';
      await api.post(endpoint, {
        bucket_id: txForm.bucket_id,
        amount: parseFloat(tx.amount),
        description: tx.description
      });
      setTx({ amount: '', description: '' });
      setTxForm(null);
      load();
    } catch (err) { alert(err.message); }
  };

  const totalAllocation = buckets.reduce((s, b) => s + (b.allocation_pct || 0), 0);
  const totalSaved = buckets.reduce((s, b) => s + parseFloat(b.balance || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <h1>💰 Savings Buckets</h1>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)} style={{ marginRight: 8 }}>
          {children?.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(s => !s); setEditingId(null); }}>+ New Bucket</button>
        {buckets.length === 0 && (
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={seedDefaults}>Seed Defaults</button>
        )}
        <div style={{ marginTop: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span>Total saved: <strong>₦{totalSaved.toFixed(2)}</strong></span>
          <span style={{ color: totalAllocation > 100 ? '#e74c3c' : '#666' }}>
            Allocation: {totalAllocation}% {totalAllocation > 100 && '⚠️ over 100%'}
          </span>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 12 }}>
          <form onSubmit={submit}>
            <input placeholder="Bucket name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required style={{ width: '100%', marginBottom: 8 }} />
            <input placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ width: '100%', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input type="number" min="0" max="100" placeholder="Allocation %" value={form.allocation_pct} onChange={e => setForm({...form, allocation_pct: e.target.value})} style={{ flex: 1 }} />
              <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
              <input placeholder="icon" value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} style={{ width: 60 }} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">{editingId ? 'Update' : 'Create'}</button>
            <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 8 }} onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
          </form>
        </div>
      )}

      {loading && <div className="loading">Loading...</div>}

      {buckets.map(b => (
        <div key={b.id} className="card" style={{ marginBottom: 10, borderLeft: `6px solid ${b.color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: '2rem' }}>{b.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{b.name}</div>
              <small style={{ color: '#666' }}>{b.allocation_pct}% allocation</small>
              {b.description && <div style={{ fontSize: '0.85rem', color: '#666' }}>{b.description}</div>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: b.color }}>₦{parseFloat(b.balance).toFixed(2)}</div>
              <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setTxForm({ bucket_id: b.id, type: 'credit' })}>+</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setTxForm({ bucket_id: b.id, type: 'debit' })}>−</button>
                <button className="btn btn-secondary btn-sm" onClick={() => startEdit(b)}>✎</button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(b.id)}>×</button>
              </div>
            </div>
          </div>
          {txForm?.bucket_id === b.id && (
            <form onSubmit={submitTx} style={{ marginTop: 10, padding: 10, background: '#f9f9f9', borderRadius: 4, display: 'flex', gap: 6 }}>
              <input type="number" step="0.01" placeholder={txForm.type === 'debit' ? 'Spent ₦' : 'Add ₦'} value={tx.amount} onChange={e => setTx({...tx, amount: e.target.value})} required style={{ width: 100 }} />
              <input placeholder={txForm.type === 'debit' ? 'What was bought?' : 'Reason'} value={tx.description} onChange={e => setTx({...tx, description: e.target.value})} style={{ flex: 1 }} />
              <button type="submit" className="btn btn-primary btn-sm">{txForm.type === 'debit' ? 'Record Spend' : 'Add Funds'}</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setTxForm(null)}>Cancel</button>
            </form>
          )}
        </div>
      ))}

      {transactions.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Recent Activity</h3>
          {transactions.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #eee' }}>
              <span style={{ fontSize: '1.2rem' }}>{t.type === 'credit' ? '⬆️' : '⬇️'}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem' }}>{t.description}</div>
                <small style={{ color: t.bucket_color }}>{t.bucket_name} · {new Date(t.created_at).toLocaleString()}</small>
              </div>
              <strong style={{ color: t.type === 'credit' ? '#27ae60' : '#e74c3c' }}>
                {t.type === 'credit' ? '+' : '−'}₦{parseFloat(t.amount).toFixed(2)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
