import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, Wallet, Trophy, CheckCircle2 } from 'lucide-react';
import { getFamilyClient } from '../../../../services/familyClient';
import { useChildCtx } from './childCtx';

export default function ChildHome() {
  const { session } = useChildCtx();
  const [stats, setStats] = useState({ pending: 0, done: 0, balance: 0, awards: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const fam = getFamilyClient();
      const [pendRes, doneRes, walRes, awRes] = await Promise.all([
        fam.from('task_assignments').select('id', { count: 'exact', head: true }).eq('child_id', session.child_id).in('status', ['pending','in_progress']),
        fam.from('task_assignments').select('id', { count: 'exact', head: true }).eq('child_id', session.child_id).eq('status', 'completed'),
        fam.from('wallets').select('balance').eq('child_id', session.child_id).maybeSingle(),
        fam.from('awards').select('id', { count: 'exact', head: true }).eq('child_id', session.child_id),
      ]);
      setStats({
        pending: pendRes.count || 0,
        done: doneRes.count || 0,
        balance: Number(walRes.data?.balance ?? 0),
        awards: awRes.count || 0,
      });
      setLoading(false);
    })();
  }, [session.child_id]);

  const cards = [
    { label: 'Tasks to do', value: stats.pending, icon: <ListChecks size={18}/>, color: 'bg-pink-50 text-pink-700 border-pink-200', to: '/family/me/tasks' },
    { label: 'Tasks done', value: stats.done, icon: <CheckCircle2 size={18}/>, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', to: '/family/me/tasks' },
    { label: 'My wallet', value: `₦${stats.balance.toLocaleString()}`, icon: <Wallet size={18}/>, color: 'bg-amber-50 text-amber-800 border-amber-200', to: '/family/me/wallet' },
    { label: 'My awards', value: stats.awards, icon: <Trophy size={18}/>, color: 'bg-sky-50 text-sky-700 border-sky-200', to: '/family/me/school' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Welcome back, {session.first_name}!</h2>
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map(c=>(
            <Link key={c.label} to={c.to} className={`block rounded-xl border p-4 ${c.color} hover:shadow-sm transition`}>
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">{c.label}</div>
                {c.icon}
              </div>
              <div className="mt-2 text-2xl font-bold">{c.value}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
