import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function Children() {
  const { children, loadChildren } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', date_of_birth: '', gender: 'male', blood_group: '', genotype: '', base_stipend: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/children', {
        ...form,
        base_stipend: parseFloat(form.base_stipend) || 0,
      });
      await loadChildren();
      setForm({ name: '', date_of_birth: '', gender: 'male', blood_group: '', genotype: '', base_stipend: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getAge = (dob) => {
    if (!dob) return '';
    const diff = Date.now() - new Date(dob).getTime();
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    return years < 1 ? 'Under 1' : `${years} yrs`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">👧 Children</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add Child'}
        </button>
      </div>

      {showForm && (
        <div className="card form-card">
          <h3>Add New Child</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth *</label>
                <input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Blood Group</label>
                <select value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}>
                  <option value="">Select</option>
                  <option>A+</option><option>A-</option>
                  <option>B+</option><option>B-</option>
                  <option>AB+</option><option>AB-</option>
                  <option>O+</option><option>O-</option>
                </select>
              </div>
              <div className="form-group">
                <label>Genotype</label>
                <select value={form.genotype} onChange={(e) => setForm({ ...form, genotype: e.target.value })}>
                  <option value="">Select</option>
                  <option>AA</option><option>AS</option><option>SS</option><option>AC</option><option>SC</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Monthly Stipend (₦)</label>
              <input type="number" value={form.base_stipend} onChange={(e) => setForm({ ...form, base_stipend: e.target.value })} placeholder="0" min="0" />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Saving...' : 'Add Child'}
            </button>
          </form>
        </div>
      )}

      {children.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👶</div>
          <h3>No Children Added</h3>
          <p>Add your first child to get started</p>
        </div>
      ) : (
        <div className="children-grid">
          {children.map(child => (
            <Link key={child.id} to={`/children/${child.id}`} className="child-card">
              <div className="child-avatar-lg">
                {child.photo_url ? (
                  <img src={child.photo_url} alt={child.name} />
                ) : (
                  <span>{child.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="child-details">
                <h3 className="child-name">{child.name}</h3>
                <div className="child-meta">
                  <span>{getAge(child.date_of_birth)}</span>
                  <span>{child.gender}</span>
                </div>
                <div className="wallet-balance">
                  💰 ₦{parseFloat(child.wallet_balance || 0).toLocaleString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
