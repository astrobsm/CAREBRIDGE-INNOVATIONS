import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const GRADE_COLORS = { 'A+': '#27ae60', 'A': '#2ecc71', 'B': '#3498db', 'C': '#f39c12', 'D': '#e67e22', 'F': '#e74c3c' };

export default function Performance() {
  const { children } = useApp();
  const [selectedChild, setSelectedChild] = useState('');
  const [period, setPeriod] = useState(7);
  const [summary, setSummary] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [activity, setActivity] = useState([]);
  const [awards, setAwards] = useState([]);
  const [tab, setTab] = useState('summary'); // summary | activity | awards
  const [showAwardForm, setShowAwardForm] = useState(false);
  const [awardForm, setAwardForm] = useState({
    record_type: 'award', title: '', description: '', icon: '⭐', points: 20, bonus_payout: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (children?.length && !selectedChild) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  const load = useCallback(async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const [s, lb, act, aw] = await Promise.all([
        api.get(`/performance/summary?child_id=${selectedChild}&days=${period}`),
        api.get(`/performance/leaderboard?days=${period}`),
        api.get(`/performance/activity?child_id=${selectedChild}&limit=100`),
        api.get(`/performance/awards?child_id=${selectedChild}`)
      ]);
      setSummary(s); setLeaderboard(lb.leaderboard || []);
      setActivity(Array.isArray(act) ? act : []);
      setAwards(Array.isArray(aw) ? aw : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedChild, period]);

  useEffect(() => { load(); }, [load]);

  const submitAward = async (e) => {
    e.preventDefault();
    try {
      await api.post('/performance/awards', {
        ...awardForm,
        child_id: selectedChild,
        points: parseInt(awardForm.points) || 0,
        bonus_payout: parseFloat(awardForm.bonus_payout) || 0
      });
      setAwardForm({ record_type: 'award', title: '', description: '', icon: '⭐', points: 20, bonus_payout: 0 });
      setShowAwardForm(false);
      load();
    } catch (err) { alert(err.message); }
  };

  const deleteAward = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.delete(`/performance/awards/${id}`); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>🏆 Performance</h1>
      </div>
      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
            {children?.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
          <select value={period} onChange={e => setPeriod(parseInt(e.target.value))}>
            <option value={1}>Today</option>
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <button className={`btn btn-sm ${tab === 'summary' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('summary')}>Summary</button>
          <button className={`btn btn-sm ${tab === 'activity' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('activity')}>Activity Log</button>
          <button className={`btn btn-sm ${tab === 'awards' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab('awards')}>Awards & Admonitions</button>
        </div>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {tab === 'summary' && summary && (
        <>
          <div className="card" style={{ marginBottom: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', fontWeight: 'bold', color: GRADE_COLORS[summary.grade] || '#666' }}>
              {summary.grade}
            </div>
            <div style={{ fontSize: '1.1rem', color: '#666' }}>Score: {summary.score}/100</div>
            <div style={{ marginTop: 8 }}>
              🔥 {summary.streak}-day streak
            </div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h3>Stats — Last {summary.period_days} days</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
              <Stat label="Completed" value={summary.stats.completed} color="#27ae60" />
              <Stat label="Late" value={summary.stats.late} color="#f39c12" />
              <Stat label="Missed" value={summary.stats.missed} color="#e74c3c" />
              <Stat label="Points" value={summary.stats.total_points} color="#3498db" />
              <Stat label="Earned" value={`₦${parseFloat(summary.stats.total_earned).toFixed(2)}`} color="#27ae60" />
              <Stat label="Completion" value={`${summary.completion_rate}%`} color="#9b59b6" />
              <Stat label="Punctuality" value={`${summary.punctuality_rate}%`} color="#16a085" />
            </div>
          </div>

          {summary.by_type && summary.by_type.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <h3>By Activity Type</h3>
              {summary.by_type.map(t => (
                <div key={t.activity_type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ flex: 1, textTransform: 'capitalize' }}>{t.activity_type}</span>
                  <small>✅ {t.completed} · ⏱️ {t.late} · ❌ {t.missed}</small>
                  <strong>{t.points} pts</strong>
                  <small>₦{parseFloat(t.earned).toFixed(2)}</small>
                </div>
              ))}
            </div>
          )}

          {leaderboard.length > 1 && (
            <div className="card">
              <h3>🏅 Family Leaderboard ({summary.period_days}d)</h3>
              {leaderboard.map((row, idx) => (
                <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #eee' }}>
                  <span style={{ fontSize: '1.4rem', width: 30 }}>{['🥇','🥈','🥉'][idx] || `${idx+1}.`}</span>
                  <span style={{ flex: 1 }}>{row.name}</span>
                  <strong>{row.points} pts</strong>
                  <small>₦{parseFloat(row.earned).toFixed(2)}</small>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'activity' && (
        <div className="card">
          <h3>Activity Log ({activity.length})</h3>
          {activity.length === 0 && <p style={{ color: '#999' }}>No activity yet.</p>}
          {activity.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: a.status === 'completed' ? '#27ae60' : a.status === 'late' ? '#f39c12' : a.status === 'missed' ? '#e74c3c' : '#bdc3c7'
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{a.title}</div>
                <small style={{ color: '#666' }}>
                  {a.activity_type} · {a.status} · {new Date(a.occurred_at).toLocaleString()}
                </small>
                {a.description && <div style={{ fontSize: '0.8rem', color: '#999' }}>{a.description}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', color: a.points >= 0 ? '#27ae60' : '#e74c3c' }}>{a.points > 0 ? '+' : ''}{a.points}</div>
                {a.payout > 0 && <small>₦{parseFloat(a.payout).toFixed(2)}</small>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'awards' && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAwardForm(s => !s)}>+ Issue Record</button>
            {showAwardForm && (
              <form onSubmit={submitAward} style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <label><input type="radio" checked={awardForm.record_type === 'award'} onChange={() => setAwardForm({...awardForm, record_type: 'award', icon: '⭐', points: 20})} /> 🏆 Award</label>
                  <label><input type="radio" checked={awardForm.record_type === 'admonition'} onChange={() => setAwardForm({...awardForm, record_type: 'admonition', icon: '⚠️', points: 10})} /> ⚠️ Admonition</label>
                </div>
                <input placeholder="Title (e.g. Outstanding Week)" value={awardForm.title} onChange={e => setAwardForm({...awardForm, title: e.target.value})} required style={{ width: '100%', marginBottom: 8 }} />
                <textarea placeholder="Description / reason" value={awardForm.description} onChange={e => setAwardForm({...awardForm, description: e.target.value})} style={{ width: '100%', marginBottom: 8 }} />
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input placeholder="icon" value={awardForm.icon} onChange={e => setAwardForm({...awardForm, icon: e.target.value})} style={{ width: 70 }} />
                  <input type="number" placeholder="points" value={awardForm.points} onChange={e => setAwardForm({...awardForm, points: e.target.value})} style={{ width: 100 }} />
                  {awardForm.record_type === 'award' && (
                    <input type="number" step="0.01" placeholder="bonus ₦" value={awardForm.bonus_payout} onChange={e => setAwardForm({...awardForm, bonus_payout: e.target.value})} style={{ width: 120 }} />
                  )}
                </div>
                <button type="submit" className="btn btn-primary btn-sm">Issue</button>
              </form>
            )}
          </div>

          {awards.length === 0 && <p style={{ color: '#999', textAlign: 'center' }}>No records issued yet.</p>}
          {awards.map(a => (
            <div key={a.id} className="card" style={{ marginBottom: 8, borderLeft: `4px solid ${a.record_type === 'award' ? '#f1c40f' : '#e74c3c'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: '2rem' }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{a.title}</div>
                  {a.description && <div style={{ fontSize: '0.9rem', color: '#666' }}>{a.description}</div>}
                  <small style={{ color: '#999' }}>
                    {a.record_type === 'award' ? '🏆 Award' : '⚠️ Admonition'} · {new Date(a.issued_at).toLocaleDateString()}
                  </small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 'bold', color: a.record_type === 'award' ? '#27ae60' : '#e74c3c' }}>
                    {a.record_type === 'award' ? '+' : '−'}{a.points} pts
                  </div>
                  {a.bonus_payout > 0 && <small style={{ color: '#27ae60' }}>+₦{parseFloat(a.bonus_payout).toFixed(2)}</small>}
                  <div><button className="btn btn-danger btn-sm" onClick={() => deleteAward(a.id)} style={{ padding: '2px 6px', marginTop: 4 }}>×</button></div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: 12, background: '#f9f9f9', borderRadius: 8 }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color }}>{value}</div>
      <small style={{ color: '#666' }}>{label}</small>
    </div>
  );
}
