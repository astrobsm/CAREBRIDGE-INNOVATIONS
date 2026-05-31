import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function Payroll() {
  const { children, loadChildren } = useApp();
  const [wallets, setWallets] = useState({});
  const [transactions, setTransactions] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [tab, setTab] = useState('overview');
  const [summary, setSummary] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadWallets(); }, [children]);

  const loadWallets = async () => {
    const w = {};
    for (const child of children) {
      try {
        w[child.id] = await api.get(`/payroll/wallet/${child.id}`);
      } catch { /* skip */ }
    }
    setWallets(w);
  };

  const loadTransactions = async (childId) => {
    try {
      const data = await api.get(`/payroll/transactions?child_id=${childId}&limit=50`);
      setTransactions(Array.isArray(data) ? data : []);
    } catch { setTransactions([]); }
  };

  const loadMonthlySummary = async (childId) => {
    try {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const data = await api.get(`/payroll/summary?child_id=${childId}&year=${year}&month=${month}`);
      setSummary(data);
    } catch { setSummary(null); }
  };

  const selectChild = (child) => {
    setSelectedChild(child);
    loadTransactions(child.id);
    loadMonthlySummary(child.id);
  };

  const processStipend = async () => {
    setProcessing(true);
    try {
      await api.post('/payroll/process-stipend');
      await loadWallets();
      await loadChildren();
      alert('Monthly stipend processed!');
    } catch (err) { alert(err.message); }
    finally { setProcessing(false); }
  };

  const updateStipend = async (childId, amount) => {
    try {
      await api.put(`/payroll/stipend/${childId}`, { base_stipend: parseFloat(amount) });
      loadWallets();
    } catch (err) { alert(err.message); }
  };

  const fmt = (n) => `₦${parseFloat(n || 0).toLocaleString()}`;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">💰 Payroll & Stipend</h2>
        <button className="btn btn-primary btn-sm" onClick={processStipend} disabled={processing}>
          {processing ? 'Processing...' : 'Process Monthly Stipend'}
        </button>
      </div>

      <div className="wallets-overview">
        {children.map(child => {
          const w = wallets[child.id];
          return (
            <div key={child.id}
              className={`wallet-card clickable ${selectedChild?.id === child.id ? 'selected' : ''}`}
              onClick={() => selectChild(child)}>
              <div className="wallet-child-name">{child.name}</div>
              <div className="wallet-amount">{fmt(w?.balance)}</div>
              <div className="wallet-stipend">Stipend: {fmt(w?.base_stipend)}/mo</div>
            </div>
          );
        })}
      </div>

      {selectedChild && (
        <>
          <div className="tabs" style={{ marginTop: '1rem' }}>
            {['transactions', 'summary', 'settings'].map(t => (
              <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'transactions' && (
            <div className="transactions-list">
              <h3>{selectedChild.name}'s Transactions</h3>
              {transactions.length === 0 ? (
                <p className="text-muted">No transactions yet</p>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className={`transaction-item ${tx.type}`}>
                    <div className="tx-info">
                      <span className="tx-desc">{tx.description}</span>
                      <span className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</span>
                    </div>
                    <span className={`tx-amount ${tx.type === 'credit' ? 'positive' : 'negative'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'summary' && summary && (
            <div className="card">
              <h3>Monthly Summary - {selectedChild.name}</h3>
              <div className="summary-grid">
                <div className="summary-item">
                  <span>Total Earned</span>
                  <span className="positive">{fmt(summary.total_credits)}</span>
                </div>
                <div className="summary-item">
                  <span>Total Deductions</span>
                  <span className="negative">{fmt(summary.total_debits)}</span>
                </div>
                <div className="summary-item">
                  <span>Tasks Completed</span>
                  <span>{summary.tasks_completed || 0}</span>
                </div>
                <div className="summary-item">
                  <span>Net</span>
                  <span className={(summary.total_credits - summary.total_debits) >= 0 ? 'positive' : 'negative'}>
                    {fmt(summary.total_credits - summary.total_debits)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="card">
              <h3>Stipend Settings - {selectedChild.name}</h3>
              <div className="form-group">
                <label>Base Monthly Stipend (₦)</label>
                <input
                  type="number"
                  defaultValue={wallets[selectedChild.id]?.base_stipend || 0}
                  onBlur={(e) => updateStipend(selectedChild.id, e.target.value)}
                  min="0"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
