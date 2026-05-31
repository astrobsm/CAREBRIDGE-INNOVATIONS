import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

const FREQ_COLORS = {
  daily: '#3498db', weekend: '#9b59b6', weekly: '#27ae60',
  biweekly: '#16a085', monthly: '#f39c12', adhoc: '#95a5a6'
};
const GENDER_BADGE = {
  any: { label: 'Any', color: '#95a5a6' },
  male: { label: '♂ Male', color: '#3498db' },
  female: { label: '♀ Female', color: '#e91e63' }
};
const DIFFICULTY_STARS = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25*24*60*60*1000));
}

export default function ChoreLibrary() {
  const { children } = useApp();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [freqFilter, setFreqFilter] = useState('');
  const [searchText, setSearchText] = useState('');
  const [autoFilter, setAutoFilter] = useState(true); // auto by child age/gender
  const [appliedAge, setAppliedAge] = useState(null);
  const [appliedGender, setAppliedGender] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [seeding, setSeeding] = useState(false);
  const [assigning, setAssigning] = useState(null); // {libraryId, time, points}

  useEffect(() => {
    if (children?.length && !selectedChild) setSelectedChild(children[0].id);
  }, [children, selectedChild]);

  const selChild = children?.find(c => c.id === selectedChild);
  const childAge = calcAge(selChild?.date_of_birth);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (autoFilter && selectedChild) params.append('child_id', selectedChild);
      if (categoryFilter) params.append('category', categoryFilter);
      if (freqFilter) params.append('frequency', freqFilter);
      const r = await api.get(`/chore-library?${params}`);
      setItems(r.items || []);
      setAppliedAge(r.applied_age);
      setAppliedGender(r.applied_gender);
      const cats = await api.get('/chore-library/categories');
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err) { console.error(err); }
  }, [autoFilter, selectedChild, categoryFilter, freqFilter]);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    if (!window.confirm('Seed the Nigerian chore library? (~50 curated chores). Safe to re-run.')) return;
    setSeeding(true);
    try {
      const r = await api.post('/chore-library/seed', {});
      alert(`Done! Inserted ${r.inserted} new chores (${r.skipped} already existed).`);
      load();
    } catch (err) { alert(err.message); }
    setSeeding(false);
  };

  const assign = async (item) => {
    if (!selectedChild) { alert('Pick a child first'); return; }
    setAssigning({
      library_id: item.id, name: item.name,
      time: item.suggested_time?.slice(0,5) || '15:00',
      points: item.default_points,
      duration_minutes: item.default_duration_minutes
    });
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    try {
      const r = await api.post('/chore-library/assign', {
        library_id: assigning.library_id,
        child_id: selectedChild,
        time: assigning.time,
        points: parseInt(assigning.points),
        duration_minutes: parseInt(assigning.duration_minutes),
        expected_duration_minutes: parseInt(assigning.duration_minutes),
      });
      alert(`✓ Assigned "${assigning.name}" to ${selChild?.first_name} in routine "${r.routine.name}"`);
      setAssigning(null);
    } catch (err) { alert(err.message); }
  };

  const filtered = useMemo(() => {
    if (!searchText) return items;
    const q = searchText.toLowerCase();
    return items.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.category.toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q));
  }, [items, searchText]);

  // group by category for display
  const grouped = useMemo(() => {
    const g = {};
    for (const i of filtered) {
      if (!g[i.category]) g[i.category] = [];
      g[i.category].push(i);
    }
    return g;
  }, [filtered]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>🧹 Nigerian Chores Library</h1>
      </div>

      <div className="card" style={{ marginBottom: 12, background: '#fef9e7' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <strong>📚 First time?</strong>
          <span style={{ fontSize: '0.9rem' }}>Click to populate the library with professionally curated Nigerian-home chores by age & gender.</span>
          <button className="btn btn-primary btn-sm" onClick={seed} disabled={seeding}>
            {seeding ? 'Seeding...' : '✨ Seed Library'}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
            <option value="">— Select child —</option>
            {children?.map(c => <option key={c.id} value={c.id}>
              {c.first_name} ({c.gender || '?'}, age {calcAge(c.date_of_birth) ?? '?'})
            </option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem' }}>
            <input type="checkbox" checked={autoFilter} onChange={e => setAutoFilter(e.target.checked)} />
            Auto-filter by child age & gender
          </label>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(c => <option key={c.category} value={c.category}>{c.category} ({c.count})</option>)}
          </select>
          <select value={freqFilter} onChange={e => setFreqFilter(e.target.value)}>
            <option value="">All frequencies</option>
            <option value="daily">Daily</option>
            <option value="weekend">Weekend</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Bi-weekly</option>
            <option value="monthly">Monthly</option>
            <option value="adhoc">Ad-hoc</option>
          </select>
          <input placeholder="🔍 Search" value={searchText} onChange={e => setSearchText(e.target.value)} style={{ flex: 1, minWidth: 150 }} />
        </div>
        {autoFilter && (appliedAge || appliedGender) && (
          <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#555' }}>
            Showing chores suitable for: <strong>age {appliedAge ?? '?'}</strong>
            {appliedGender && <>, <strong>{appliedGender}</strong></>}
            · {filtered.length} of {items.length} matching
          </div>
        )}
      </div>

      {assigning && (
        <div className="card" style={{ marginBottom: 12, background: '#e8f5e9', border: '2px solid #27ae60' }}>
          <form onSubmit={submitAssign}>
            <h3 style={{ margin: '0 0 8px 0' }}>Assign: {assigning.name}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <label>Time
                <input type="time" value={assigning.time} onChange={e => setAssigning({...assigning, time: e.target.value})} />
              </label>
              <label>Points / ₦
                <input type="number" value={assigning.points} onChange={e => setAssigning({...assigning, points: e.target.value})} style={{ width: 80 }} />
              </label>
              <label>Expected mins
                <input type="number" value={assigning.duration_minutes} onChange={e => setAssigning({...assigning, duration_minutes: e.target.value})} style={{ width: 80 }} />
              </label>
              <button type="submit" className="btn btn-primary btn-sm">✓ Assign to {selChild?.first_name}</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setAssigning(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 && (
        <div className="card empty-state">
          No chores in library yet. Click <strong>✨ Seed Library</strong> above.
        </div>
      )}

      {Object.keys(grouped).sort().map(cat => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px 0', textTransform: 'capitalize', borderBottom: '2px solid #ddd', paddingBottom: 4 }}>
            {cat.replace(/_/g, ' ')} <span style={{ fontSize: '0.85rem', color: '#888' }}>({grouped[cat].length})</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {grouped[cat].map(item => {
              const gb = GENDER_BADGE[item.gender] || GENDER_BADGE.any;
              const isExp = expanded[item.id];
              return (
                <div key={item.id} className="card" style={{ borderLeft: `4px solid ${FREQ_COLORS[item.frequency]}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontSize: '1.8rem' }}>{item.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 2 }}>
                        <span style={{ padding: '1px 6px', borderRadius: 8, background: FREQ_COLORS[item.frequency], color: 'white', marginRight: 4 }}>{item.frequency}</span>
                        <span style={{ padding: '1px 6px', borderRadius: 8, background: gb.color, color: 'white', marginRight: 4 }}>{gb.label}</span>
                        <span title="age range">👶 {item.min_age}-{item.max_age}y</span>
                        <span style={{ marginLeft: 6 }} title="difficulty">{DIFFICULTY_STARS(item.difficulty)}</span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#444', marginTop: 4 }}>
                        ⏱ {item.default_duration_minutes}min · 🪙 {item.default_points}pts
                        {item.suggested_day && ` · 📅 ${item.suggested_day}`}
                        {item.suggested_time && ` · 🕐 ${item.suggested_time.slice(0,5)}`}
                      </div>
                    </div>
                  </div>
                  {isExp && (
                    <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                      {item.steps?.length > 0 && (
                        <div style={{ marginTop: 6 }}>
                          <strong>Steps:</strong>
                          <ol style={{ margin: '4px 0 4px 18px', paddingLeft: 0 }}>
                            {item.steps.map((s, i) => <li key={i}>{s}</li>)}
                          </ol>
                        </div>
                      )}
                      {item.supplies_needed && <div><strong>Supplies:</strong> {item.supplies_needed}</div>}
                      {item.safety_notes && <div style={{ color: '#c0392b' }}><strong>⚠ Safety:</strong> {item.safety_notes}</div>}
                      {item.nigerian_context && <div style={{ fontStyle: 'italic', color: '#27ae60', marginTop: 4 }}>🇳🇬 {item.nigerian_context}</div>}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setExpanded({...expanded, [item.id]: !isExp})}>
                      {isExp ? '▲ Less' : '▼ Details'}
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => assign(item)} disabled={!selectedChild} style={{ marginLeft: 'auto' }}>
                      + Assign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
