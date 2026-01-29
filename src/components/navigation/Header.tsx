import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  LogOut,
  User,
  Settings,
  ChevronDown,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import SyncIndicator from '../pwa/SyncIndicator';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Track online status
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

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/patients?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-white via-white to-indigo-50/30 border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left: Menu button, Logo and Search */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-indigo-50 transition-colors"
            title="Open menu"
          >
            <Menu size={24} className="text-indigo-700" />
          </button>

          {/* Mobile Logo - shown only on mobile when sidebar is hidden */}
          <div className="flex items-center gap-2 lg:hidden">
            <img 
              src="/icons/logo.png" 
              alt="AstroHEALTH" 
              className="w-8 h-8 rounded-lg object-contain bg-gradient-to-br from-indigo-50 to-blue-50 p-0.5 shadow-sm ring-1 ring-indigo-100"
            />
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-700 to-blue-600 bg-clip-text text-transparent hidden xs:block">
              AstroHEALTH
            </span>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden sm:block">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients..."
                className="w-64 lg:w-80 pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </form>
        </div>

        {/* Right: Status & User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sync Status Indicator */}
          <SyncIndicator compact />

          {/* Online Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span className="hidden sm:inline">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100"
              title="Notifications"
            >
              <Bell size={20} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="px-4 py-8 text-center text-gray-500">
                      <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {(user?.firstName || '?')[0]}{(user?.lastName || '?')[0]}
              </div>
              <ChevronDown size={16} className="text-gray-500 hidden sm:block" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="font-medium text-gray-900">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <User size={16} />
                      Profile
                    </button>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                  </div>
                  <div className="py-2 border-t border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
