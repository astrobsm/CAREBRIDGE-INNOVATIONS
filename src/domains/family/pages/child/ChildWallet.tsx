import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { getFamilyClient } from '../../../../services/familyClient';
import { subscribeFamilyChanges } from '../../hooks/useFamilyRealtime';
import type { Transaction } from '../../types';
import { useChildCtx } from './childCtx';

export default function ChildWallet() {
  const { session } = useChildCtx();
  const [balance, setBalance] = useState<number>(0);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const fam = getFamilyClient();
    const [wRes, tRes] = await Promise.all([
      fam.from('wallets').select('balance').eq('child_id', session.child_id).maybeSingle(),
      fam.from('transactions').select('*').eq('child_id', session.child_id).order('created_at', { ascending: false }).limit(50),
    ]);
    setBalance(Number(wRes.data?.balance ?? 0));
    setTxs((tRes.data as Transaction[]) || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(session.parent_id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.child_id]);

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">My wallet</h2>
      <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-5">
        <div className="flex items-center gap-2 text-amber-800 text-xs"><Wallet size={14}/> Current balance</div>
        <div className="mt-1 text-3xl font-bold text-amber-900">₦{balance.toLocaleString()}</div>
      </div>
      <h3 className="text-sm font-semibold text-gray-700 mt-2">Recent transactions</h3>
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : txs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500">No transactions yet.</div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
          {txs.map(t=>{
            const amt = Number(t.amount);
            const credit = ['stipend','bonus','transfer_in','adjustment'].includes(t.type) && amt >= 0;
            return (
              <li key={t.id} className="px-4 py-2 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{t.description || t.type}</div>
                  <div className="text-xs text-gray-500">{t.type} · {t.created_at ? new Date(t.created_at).toLocaleString() : ''}</div>
                </div>
                <div className={`font-mono text-sm ${credit ? 'text-emerald-700' : 'text-red-600'}`}>
                  {credit ? '+' : ''}₦{Number(t.amount).toLocaleString()}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
