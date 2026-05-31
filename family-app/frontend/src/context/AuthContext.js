import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { offlineStorage } from '../services/offlineStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      api.setToken(token);
      const res = await api.get('/auth/profile');
      setUser(res);
    } catch {
      // Try offline
      const cached = await offlineStorage.get('currentUser');
      if (cached) {
        setUser(cached);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.token);
    api.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
    await offlineStorage.set('currentUser', res.user);
    return res;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    localStorage.setItem('token', res.token);
    api.setToken(res.token);
    setToken(res.token);
    setUser(res.user);
    await offlineStorage.set('currentUser', res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    api.setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
