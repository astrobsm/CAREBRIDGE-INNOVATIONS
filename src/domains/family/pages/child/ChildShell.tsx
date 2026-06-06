import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Home, ListChecks, Wallet, GraduationCap, LogOut, Heart, Radio } from 'lucide-react';
import { getChildSession, clearChildSession } from '../../../../services/childAuth';
import type { ChildSession } from '../../../../services/childAuth';
import { subscribeFamilyChanges } from '../../hooks/useFamilyRealtime';

export default function ChildShell() {
  const nav = useNavigate();
  const [session, setSession] = useState<ChildSession | null>(getChildSession());
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (!session) return;
    return subscribeFamilyChanges(session.parent_id, () => setPulse(p => p + 1));
  }, [session]);

  if (!session) return <Navigate to="/family/me/login" replace/>;

  function logout() {
    clearChildSession();
    setSession(null);
    nav('/family/me/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart size={18} className="text-pink-600"/>
          <h1 className="text-sm font-semibold text-gray-900">Hi, {session.first_name}!</h1>
          {pulse > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              <Radio size={10}/> live
            </span>
          )}
        </div>
        <button onClick={logout} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
          <LogOut size={12}/> Sign out
        </button>
      </header>
      <nav className="bg-white border-b border-gray-200 px-3 py-2 flex gap-1 overflow-x-auto text-xs">
        {[
          { to: '/family/me', label: 'Home', icon: <Home size={14}/>, end: true },
          { to: '/family/me/tasks', label: 'My tasks', icon: <ListChecks size={14}/> },
          { to: '/family/me/wallet', label: 'My wallet', icon: <Wallet size={14}/> },
          { to: '/family/me/school', label: 'School', icon: <GraduationCap size={14}/> },
        ].map(l => (
          <NavLink key={l.to} to={l.to} end={l.end}
            className={({isActive}) => `inline-flex items-center gap-1 px-3 py-1.5 rounded-md whitespace-nowrap ${isActive ? 'bg-pink-100 text-pink-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
            {l.icon}{l.label}
          </NavLink>
        ))}
      </nav>
      <main className="flex-1 overflow-auto p-4">
        <Outlet context={{ session }}/>
      </main>
    </div>
  );
}
