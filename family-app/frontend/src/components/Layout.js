import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { isOnline, unreadCount } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '🌅 Good Morning';
    if (h < 17) return '☀️ Good Afternoon';
    return '🌙 Good Evening';
  };

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div className="top-bar-left">
          <h1 className="app-title" onClick={() => navigate('/')}>👨‍👩‍👧‍👦 FamilyApp</h1>
        </div>
        <div className="top-bar-right">
          <span className={`sync-indicator ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢' : '🟡'} {isOnline ? 'Online' : 'Offline'}
          </span>
          <button className="notification-btn" onClick={() => navigate('/notifications')}>
            🔔
            {unreadCount > 0 && <span className="badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          <div className="user-menu">
            <span className="user-name">{greeting()}, {user?.first_name || 'User'}</span>
            <button className="btn btn-sm btn-outline" onClick={handleLogout} style={{color:'white',borderColor:'rgba(255,255,255,0.4)'}}>
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Home</span>
        </NavLink>
        <NavLink to="/children" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">👧</span>
          <span className="nav-label">Children</span>
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🎯</span>
          <span className="nav-label">Tasks</span>
        </NavLink>
        <NavLink to="/chores" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🧹</span>
          <span className="nav-label">Chores</span>
        </NavLink>
        <NavLink to="/boarding" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">⏰</span>
          <span className="nav-label">Boarding</span>
        </NavLink>
        <NavLink to="/buckets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">💰</span>
          <span className="nav-label">Savings</span>
        </NavLink>
        <NavLink to="/performance" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🏆</span>
          <span className="nav-label">Awards</span>
        </NavLink>
        <NavLink to="/needs" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📋</span>
          <span className="nav-label">Needs</span>
        </NavLink>
        <NavLink to="/family-events" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🎉</span>
          <span className="nav-label">Family</span>
        </NavLink>
        <NavLink to="/chore-library" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🧹</span>
          <span className="nav-label">Chores</span>
        </NavLink>
        <NavLink to="/plans" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">📝</span>
          <span className="nav-label">Plans</span>
        </NavLink>
        <NavLink to="/events" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon">🎉</span>
          <span className="nav-label">Events</span>
        </NavLink>
      </nav>
    </div>
  );
}
