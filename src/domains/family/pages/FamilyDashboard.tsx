import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, ListChecks, Wallet, CalendarDays } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';

interface Stats {
  children: number;
  pendingTasks: number;
  upcomingEvents: number;
  totalBalance: number;
}

export default function FamilyDashboard() {
  const { parent } = useFamilyCtx();
  const [stats, setStats] = useState<Stats>({ children: 0, pendingTasks: 0, upcomingEvents: 0, totalBalance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const fam = getFamilyClient();
      const [kids, walletsRes, taRes, evRes] = await Promise.all([
        fam.from('children').select('id').eq('parent_id', parent.id),
        fam.from('wallets').select('balance, child_id, children!inner(parent_id)').eq('children.parent_id', parent.id),
        fam.from('task_assignments').select('id, status, task:tasks!inner(parent_id)').eq('task.parent_id', parent.id).in('status', ['pending', 'in_progress']),
        fam.from('events').select('id, event_date').eq('parent_id', parent.id).gte('event_date', new Date().toISOString().slice(0, 10)),
      ]);
      if (cancelled) return;
      const balance = (walletsRes.data || []).reduce((s: number, w: { balance: number | string }) => s + Number(w.balance || 0), 0);
      setStats({
        children: kids.data?.length || 0,
        pendingTasks: taRes.data?.length || 0,
        upcomingEvents: evRes.data?.length || 0,
        totalBalance: balance,
      });
      setLoading(false);
    }
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return () => { cancelled = true; unsub(); };
  }, [parent.id]);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const cards = [
    { to: '/family/children', label: 'Children', value: stats.children, icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { to: '/family/tasks', label: 'Pending Tasks', value: stats.pendingTasks, icon: ListChecks, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { to: '/family/wallets', label: 'Total Balance', value: `₦${stats.totalBalance.toLocaleString()}`, icon: Wallet, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { to: '/family/events', label: 'Upcoming Events', value: stats.upcomingEvents, icon: CalendarDays, color: 'bg-pink-50 text-pink-700 border-pink-200' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{greet()}, {parent.first_name}!</h2>
        <p className="text-sm text-gray-500">Here's what's happening with your family today.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className={`block border rounded-xl p-4 hover:shadow-md transition ${c.color}`}
          >
            <c.icon size={20} className="mb-2 opacity-80" />
            <div className="text-2xl font-bold">{loading ? '…' : c.value}</div>
            <div className="text-xs uppercase tracking-wide opacity-75">{c.label}</div>
          </Link>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Quick actions</h3>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link to="/family/children" className="px-3 py-1.5 rounded-md bg-pink-600 text-white hover:bg-pink-700">+ Add child</Link>
          <Link to="/family/tasks" className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50">+ New task</Link>
          <Link to="/family/events" className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50">+ Add event</Link>
          <Link to="/family/health" className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50">+ Health record</Link>
        </div>
      </div>
    </div>
  );
}
