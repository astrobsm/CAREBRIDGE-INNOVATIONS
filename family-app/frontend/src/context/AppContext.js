import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { offlineStorage } from '../services/offlineStorage';
import { syncEngine } from '../services/syncEngine';

const AppContext = createContext(null);

export function AppProvider({ children: childrenProp }) {
  const [childrenList, setChildrenList] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming online (only if user is authenticated)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (isOnline && token) {
      triggerSync();
    }
  }, [isOnline]); // eslint-disable-line

  const loadChildren = useCallback(async () => {
    try {
      const data = await api.get('/children');
      setChildrenList(data);
      await offlineStorage.set('children', data);
    } catch {
      const cached = await offlineStorage.get('children');
      if (cached) setChildrenList(cached);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data);
      const countRes = await api.get('/notifications/unread-count');
      setUnreadCount(countRes.count);
    } catch {
      // offline - use cached
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncEngine.sync();
      await loadChildren();
      await loadNotifications();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, loadChildren, loadNotifications]);

  return (
    <AppContext.Provider value={{
      children: childrenList,
      childrenList,
      setChildrenList,
      loadChildren,
      isOnline,
      isSyncing,
      triggerSync,
      notifications,
      unreadCount,
      loadNotifications,
    }}>
      {childrenProp}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
