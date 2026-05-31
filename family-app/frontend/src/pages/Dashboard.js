import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Dashboard() {
  const { children } = useApp();
  const { user } = useAuth();
  const [stats, setStats] = useState({ pendingTasks: 0, upcomingEvents: [], todayPrayers: 0, totalBalance: 0 });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [tasks, events] = await Promise.all([
        api.get('/tasks').catch(() => []),
        api.get('/events/upcoming').catch(() => []),
      ]);

      const pending = Array.isArray(tasks) ? tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length : 0;
      const totalBal = children.reduce((sum, c) => sum + parseFloat(c.wallet_balance || 0), 0);

      setStats({
        pendingTasks: pending,
        upcomingEvents: Array.isArray(events) ? events.slice(0, 5) : [],
        todayPrayers: 0,
        totalBalance: totalBal,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return { text: 'Good Morning', emoji: '🌅' };
    if (h < 17) return { text: 'Good Afternoon', emoji: '☀️' };
    return { text: 'Good Evening', emoji: '🌙' };
  };

  const formatCurrency = (amount) => `₦${parseFloat(amount || 0).toLocaleString()}`;
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  const g = getGreeting();

  return (
    <div className="page dashboard">
      <div style={{marginBottom: 24}}>
        <h2 className="page-title" style={{marginBottom: 4}}>{g.emoji} {g.text}, {user?.first_name || 'there'}!</h2>
        <p className="text-muted">Here's what's happening with your family today</p>
      </div>

      <div className="stats-grid">
        <Link to="/children" className="stat-card">
          <div className="stat-icon">👧</div>
          <div className="stat-value">{children.length}</div>
          <div className="stat-label">Children</div>
        </Link>
        <Link to="/tasks" className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{stats.pendingTasks}</div>
          <div className="stat-label">Pending Tasks</div>
        </Link>
        <Link to="/payroll" className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{formatCurrency(stats.totalBalance)}</div>
          <div className="stat-label">Total Balance</div>
        </Link>
        <Link to="/events" className="stat-card">
          <div className="stat-icon">🎉</div>
          <div className="stat-value">{stats.upcomingEvents.length}</div>
          <div className="stat-label">Upcoming Events</div>
        </Link>
      </div>

      <section className="dashboard-section">
        <div className="section-header">
          <h3>🧒 Children Overview</h3>
          <Link to="/children" className="link">View All →</Link>
        </div>
        {children.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👨‍👩‍👧‍👦</div>
            <p>No children added yet</p>
            <Link to="/children" className="btn btn-primary btn-sm" style={{marginTop: 12}}>+ Add Child</Link>
          </div>
        ) : (
          <div className="children-cards">
            {children.slice(0, 4).map(child => (
              <Link key={child.id} to={`/children/${child.id}`} className="child-card-mini">
                <div className="child-avatar">
                  {child.photo_url ? (
                    <img src={child.photo_url} alt={child.name} />
                  ) : (
                    <span>{child.name.charAt(0)}</span>
                  )}
                </div>
                <div className="child-info-mini">
                  <span className="child-name">{child.name}</span>
                  <span className="child-balance">{formatCurrency(child.wallet_balance)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h3>📆 Upcoming Events</h3>
          <Link to="/events" className="link">View All →</Link>
        </div>
        {stats.upcomingEvents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎈</div>
            <p>No upcoming events</p>
          </div>
        ) : (
          <ul className="event-list-mini">
            {stats.upcomingEvents.map(evt => (
              <li key={evt.id} className="event-item-mini">
                <span className="event-date-badge">{formatDate(evt.next_date || evt.start_date)}</span>
                <span className="event-title">{evt.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-header">
          <h3>⚡ Quick Actions</h3>
        </div>
        <div className="quick-actions">
          <Link to="/tasks" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>➕</span>
            New Task
          </Link>
          <Link to="/prayer" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>🤲</span>
            Prayer Log
          </Link>
          <Link to="/education" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>📚</span>
            Education
          </Link>
          <Link to="/growth" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>📊</span>
            Growth
          </Link>
          <Link to="/health" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>🏥</span>
            Health
          </Link>
          <Link to="/payroll" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>💳</span>
            Payroll
          </Link>
          <Link to="/chores" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>🧹</span>
            Chores
          </Link>
          <Link to="/boarding" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>⏰</span>
            Boarding
          </Link>
          <Link to="/buckets" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>💰</span>
            Savings
          </Link>
          <Link to="/performance" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>🏆</span>
            Performance
          </Link>
          <Link to="/needs" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>📋</span>
            Needs
          </Link>
          <Link to="/family-events" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>🎉</span>
            Family Events
          </Link>
          <Link to="/chore-library" className="quick-action-btn">
            <span style={{fontSize: '1.6rem'}}>🧹</span>
            Chores Library
          </Link>
        </div>
      </section>
    </div>
  );
}
