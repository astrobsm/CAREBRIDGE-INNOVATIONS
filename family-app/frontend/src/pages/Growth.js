import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import api from '../services/api';

export default function Growth() {
  const { children } = useApp();
  const [records, setRecords] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [selectedChild, setSelectedChild] = useState(children[0]?.id || '');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ child_id: '', date: new Date().toISOString().split('T')[0], height_cm: '', weight_kg: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    if (selectedChild) loadData();
  }, [selectedChild]);

  useEffect(() => {
    if (chartData && canvasRef.current) renderChart();
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [chartData]);

  const loadData = async () => {
    try {
      const [recs, chart] = await Promise.all([
        api.get(`/growth?child_id=${selectedChild}`),
        api.get(`/growth/chart/${selectedChild}`).catch(() => null),
      ]);
      setRecords(Array.isArray(recs) ? recs : []);
      setChartData(chart);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const renderChart = async () => {
    const Chart = (await import('chart.js/auto')).default;
    if (chartRef.current) chartRef.current.destroy();
    if (!chartData || !chartData.length) return;

    const labels = chartData.map(d => new Date(d.date).toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }));

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Height (cm)',
            data: chartData.map(d => d.height_cm),
            borderColor: '#3498db',
            backgroundColor: 'rgba(52,152,219,0.1)',
            yAxisID: 'y',
            tension: 0.3,
          },
          {
            label: 'Weight (kg)',
            data: chartData.map(d => d.weight_kg),
            borderColor: '#e74c3c',
            backgroundColor: 'rgba(231,76,60,0.1)',
            yAxisID: 'y1',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Height (cm)' } },
          y1: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'Weight (kg)' }, grid: { drawOnChartArea: false } },
        },
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/growth', {
        ...form,
        child_id: form.child_id || selectedChild,
        height_cm: parseFloat(form.height_cm),
        weight_kg: parseFloat(form.weight_kg),
      });
      loadData();
      setForm({ child_id: '', date: new Date().toISOString().split('T')[0], height_cm: '', weight_kg: '', notes: '' });
      setShowForm(false);
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h2 className="page-title">📊 Growth Monitor</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Record'}
        </button>
      </div>

      <div className="filter-tabs">
        {children.map(c => (
          <button key={c.id} className={`filter-tab ${selectedChild === c.id ? 'active' : ''}`} onClick={() => setSelectedChild(c.id)}>
            {c.name}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="card form-card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Child</label>
              <select value={form.child_id || selectedChild} onChange={(e) => setForm({ ...form, child_id: e.target.value })}>
                {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Height (cm) *</label>
                <input type="number" step="0.1" value={form.height_cm} onChange={(e) => setForm({ ...form, height_cm: e.target.value })} required min="0" />
              </div>
              <div className="form-group">
                <label>Weight (kg) *</label>
                <input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} required min="0" />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Save Record</button>
          </form>
        </div>
      )}

      <div className="chart-container card">
        <h3>Growth Chart</h3>
        {chartData && chartData.length > 0 ? (
          <canvas ref={canvasRef}></canvas>
        ) : (
          <p className="text-muted text-center">Add growth records to see the chart</p>
        )}
      </div>

      <div className="records-list">
        <h3>Records</h3>
        {records.length === 0 ? (
          <p className="text-muted">No growth records yet</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Height</th>
                <th>Weight</th>
                <th>BMI</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td>{new Date(r.date).toLocaleDateString()}</td>
                  <td>{r.height_cm} cm</td>
                  <td>{r.weight_kg} kg</td>
                  <td>{r.bmi ? parseFloat(r.bmi).toFixed(1) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
