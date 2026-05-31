import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ChildProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { loadChild(); }, [id]);

  const loadChild = async () => {
    try {
      const [childData, walletData, txData] = await Promise.all([
        api.get(`/children/${id}`),
        api.get(`/payroll/wallet/${id}`).catch(() => null),
        api.get(`/payroll/transactions?child_id=${id}&limit=20`).catch(() => []),
      ]);
      setChild(childData);
      setWallet(walletData);
      setTransactions(Array.isArray(txData) ? txData : []);
      setForm(childData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/children/${id}`, form);
      setChild(form);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${child.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/children/${id}`);
      navigate('/children');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await api.downloadBlob(`/children/${id}/pdf`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(child.name || 'child').replace(/\s+/g, '_')}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download PDF: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const getAge = (dob) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    const y = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    const m = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));
    return y < 1 ? `${m} months` : `${y} years, ${m} months`;
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!child) return <div className="error">Child not found</div>;

  return (
    <div className="page">
      <button className="btn-back" onClick={() => navigate('/children')}>← Back</button>

      <div className="profile-header">
        <div className="child-avatar-xl">
          {child.photo_url ? <img src={child.photo_url} alt={child.name} /> : <span>{child.name.charAt(0)}</span>}
        </div>
        <h2>{child.name}</h2>
        <p className="text-muted">{getAge(child.date_of_birth)} old • {child.gender}</p>
        <button className="btn-download-pdf" onClick={handleDownloadPdf} disabled={downloading}>
          {downloading ? '⏳ Generating...' : '📄 Download Report (PDF)'}
        </button>
      </div>

      {wallet && (
        <div className="wallet-card">
          <div className="wallet-header">
            <span>Wallet Balance</span>
            <span className="wallet-amount">₦{parseFloat(wallet.balance || 0).toLocaleString()}</span>
          </div>
          <div className="wallet-meta">
            <span>Stipend: ₦{parseFloat(wallet.base_stipend || 0).toLocaleString()}/mo</span>
          </div>
        </div>
      )}

      <div className="tabs">
        {['overview', 'transactions', 'edit'].map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setEditing(t === 'edit'); }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card">
          <div className="detail-row"><span>Date of Birth</span><span>{child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : 'N/A'}</span></div>
          <div className="detail-row"><span>Blood Group</span><span>{child.blood_group || 'N/A'}</span></div>
          <div className="detail-row"><span>Genotype</span><span>{child.genotype || 'N/A'}</span></div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="transactions-list">
          {transactions.length === 0 ? (
            <p className="text-muted text-center">No transactions yet</p>
          ) : (
            transactions.map(tx => (
              <div key={tx.id} className={`transaction-item ${tx.type}`}>
                <div className="tx-info">
                  <span className="tx-desc">{tx.description}</span>
                  <span className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</span>
                </div>
                <span className={`tx-amount ${tx.type === 'credit' ? 'positive' : 'negative'}`}>
                  {tx.type === 'credit' ? '+' : '-'}₦{parseFloat(tx.amount).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'edit' && (
        <div className="card">
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label>Name</label>
              <input type="text" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" value={form.date_of_birth ? form.date_of_birth.split('T')[0] : ''} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Blood Group</label>
                <input type="text" value={form.blood_group || ''} onChange={(e) => setForm({ ...form, blood_group: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Genotype</label>
                <input type="text" value={form.genotype || ''} onChange={(e) => setForm({ ...form, genotype: e.target.value })} />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete Child</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
