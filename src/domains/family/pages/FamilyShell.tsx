import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Home, Users, ListChecks, Wallet, CalendarDays, Heart,
  TrendingUp, Stethoscope, Bell, Radio, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useFamilyParent } from '../hooks/useFamilyParent';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';

const links = [
  { to: '/family', label: 'Dashboard', icon: <Home size={16} />, end: true },
  { to: '/family/children', label: 'Children', icon: <Users size={16} /> },
  { to: '/family/tasks', label: 'Tasks', icon: <ListChecks size={16} /> },
  { to: '/family/wallets', label: 'Wallets', icon: <Wallet size={16} /> },
  { to: '/family/events', label: 'Events', icon: <CalendarDays size={16} /> },
  { to: '/family/prayer', label: 'Prayer', icon: <Heart size={16} /> },
  { to: '/family/growth', label: 'Growth', icon: <TrendingUp size={16} /> },
  { to: '/family/health', label: 'Health', icon: <Stethoscope size={16} /> },
  { to: '/family/notifications', label: 'Alerts', icon: <Bell size={16} /> },
];

export default function FamilyShell() {
  const { parent, loading, error, configured, reload } = useFamilyParent();
  const [lastRT, setLastRT] = useState<{ table: string; event: string; at: number } | null>(null);
  const loc = useLocation();

  useEffect(() => {
    if (!parent?.id) return;
    return subscribeFamilyChanges(parent.id, ({ table, eventType }) =>
      setLastRT({ table, event: eventType, at: Date.now() })
    );
  }, [parent?.id]);

  if (!configured) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-4 flex gap-3">
          <AlertCircle className="flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h2 className="font-semibold mb-1">Supabase not configured</h2>
            <p className="text-sm">
              Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your
              <code> .env</code> file, then run the SQL migration in
              <code> supabase-family-app-migration.sql</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading family workspace…</div>;
  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2 font-semibold">
            <AlertCircle size={18} /> Failed to load Family workspace
          </div>
          <pre className="text-xs whitespace-pre-wrap">{error}</pre>
          <button
            onClick={reload}
            className="mt-3 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-white border border-red-300 hover:bg-red-100"
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      <header className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <Heart size={18} className="text-pink-600 flex-shrink-0" />
          <h1 className="font-semibold text-gray-900 text-sm truncate">
            Family · {parent?.first_name} {parent?.last_name}
          </h1>
          {lastRT && Date.now() - lastRT.at < 4000 && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 animate-pulse">
              <Radio size={10} /> live: {lastRT.table}/{lastRT.event}
            </span>
          )}
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto px-3 py-2 bg-white border-b border-gray-200 text-xs">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 px-3 py-1.5 rounded-md whitespace-nowrap transition ${
                isActive
                  ? 'bg-pink-100 text-pink-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            {l.icon}
            {l.label}
          </NavLink>
        ))}
      </nav>
      <main key={loc.pathname} className="flex-1 overflow-auto p-4">
        {parent && <Outlet context={{ parent }} />}
      </main>
    </div>
  );
}
