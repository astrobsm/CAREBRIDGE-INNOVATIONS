import { useEffect, useState } from 'react';
import { Wallet as WalletIcon, PiggyBank, Heart, Lock, ArrowRightLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../../services/familyClient';
import { donateToCharity, debitFromBucket } from '../../../../services/familyWallets';
import { subscribeFamilyChanges } from '../../hooks/useFamilyRealtime';
import type { Transaction, Wallet } from '../../types';
import { useChildCtx } from './childCtx';

export default function ChildWallet() {
  const { session } = useChildCtx();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [donate, setDonate] = useState({ amount: '', cause: '' });
  const [transfer, setTransfer] = useState({ amount: '' });
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const [wRes, tRes] = await Promise.all([
      fam.from('wallets').select('*').eq('child_id', session.child_id).maybeSingle(),
      fam.from('transactions').select('*').eq('child_id', session.child_id).order('created_at', { ascending: false }).limit(50),
    ]);
    setWallet((wRes.data as Wallet) || null);
    setTxs((tRes.data as Transaction[]) || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(session.parent_id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.child_id]);

  const total    = Number(wallet?.balance ?? 0);
  const savings  = Number(wallet?.savings_balance ?? 0);
  const personal = Number(wallet?.personal_balance ?? 0);
  const charity  = Number(wallet?.charity_balance ?? 0);
  const sp = wallet?.split_savings_pct ?? 60;
  const pp = wallet?.split_personal_pct ?? 30;
  const cp = wallet?.split_charity_pct ?? 10;

  async function submitDonation(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(donate.amount);
    if (!amt || amt <= 0) { toast.error('Enter an amount'); return; }
    if (amt > charity) { toast.error('Not enough in your charity bucket'); return; }
    const cause = donate.cause.trim() || 'a good cause';
    setBusy(true);
    try {
      await donateToCharity(session.child_id, amt, cause);
      toast.success(`₦${amt.toLocaleString()} donated to ${cause}`);
      setDonate({ amount: '', cause: '' });
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setBusy(false); }
  }

  async function submitTransferToCharity(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(transfer.amount);
    if (!amt || amt <= 0) { toast.error('Enter an amount'); return; }
    if (amt > personal) { toast.error('Not enough in your personal bucket'); return; }
    if (!wallet) return;
    setBusy(true);
    try {
      // Debit personal as a transfer (no fresh split)
      await debitFromBucket(session.child_id, 'personal', amt, 'transfer_out', 'Moved to charity');
      // Credit the charity bucket directly (avoid re-splitting via creditWithSplit)
      const fam = getFamilyClient();
      const newCharity = charity + amt;
      const newTotal = savings + (personal - amt) + newCharity;
      await fam.from('wallets').update({ charity_balance: newCharity, balance: newTotal }).eq('id', wallet.id);
      await fam.from('transactions').insert({
        child_id: session.child_id, wallet_id: wallet.id,
        type: 'transfer_in', bucket: 'charity', amount: amt,
        balance_after: newCharity, description: 'Moved from personal',
      });
      toast.success(`Moved ₦${amt.toLocaleString()} to charity`);
      setTransfer({ amount: '' });
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">My wallet</h2>

      <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-amber-800 text-xs"><WalletIcon size={14}/> Total balance</div>
        <div className="mt-1 text-3xl font-bold text-amber-900">₦{total.toLocaleString()}</div>
        <div className="text-[11px] text-amber-700 mt-1">
          Every coin you earn is split <b>{sp}% savings · {pp}% personal · {cp}% charity</b>.
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-indigo-800 inline-flex items-center gap-1"><PiggyBank size={13}/> Savings</div>
            <Lock size={12} className="text-indigo-400"/>
          </div>
          <div className="text-xl font-bold text-indigo-900 mt-1">₦{savings.toLocaleString()}</div>
          <div className="text-[10px] text-indigo-700 mt-1">Locked. Only a parent can withdraw.</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="text-xs text-emerald-800 inline-flex items-center gap-1"><WalletIcon size={13}/> Personal</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">₦{personal.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-700 mt-1">Your spending money. Penalties come from here.</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <div className="text-xs text-rose-800 inline-flex items-center gap-1"><Heart size={13}/> Charity</div>
          <div className="text-xl font-bold text-rose-900 mt-1">₦{charity.toLocaleString()}</div>
          <div className="text-[10px] text-rose-700 mt-1">You choose who to give it to.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <form onSubmit={submitDonation} className="bg-white border border-rose-200 rounded-xl p-3 space-y-2">
          <div className="text-sm font-semibold text-rose-700 inline-flex items-center gap-1"><Heart size={14}/> Give from charity</div>
          <label className="text-xs block">Cause / who you're helping
            <input type="text" placeholder="e.g. Church offering, Food for needy"
              value={donate.cause} onChange={(e)=>setDonate({...donate, cause:e.target.value})}
              className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs block">Amount (₦)
            <input type="number" min="1" step="1" placeholder="0"
              value={donate.amount} onChange={(e)=>setDonate({...donate, amount:e.target.value})}
              className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" />
          </label>
          <button disabled={busy || charity <= 0}
            className="w-full inline-flex items-center justify-center gap-1 text-sm px-3 py-1.5 rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">
            <Send size={13}/> Give now
          </button>
          {charity <= 0 && <div className="text-[11px] text-rose-600 text-center">Your charity bucket is empty. Earn more!</div>}
        </form>

        <form onSubmit={submitTransferToCharity} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
          <div className="text-sm font-semibold text-gray-700 inline-flex items-center gap-1"><ArrowRightLeft size={14}/> Give extra (personal → charity)</div>
          <p className="text-[11px] text-gray-500">Move some of your personal money into charity if you want to give more.</p>
          <label className="text-xs block">Amount (₦)
            <input type="number" min="1" step="1" placeholder="0"
              value={transfer.amount} onChange={(e)=>setTransfer({ amount: e.target.value })}
              className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" />
          </label>
          <button disabled={busy || personal <= 0}
            className="w-full inline-flex items-center justify-center gap-1 text-sm px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50">
            Move to charity
          </button>
        </form>
      </div>

      <h3 className="text-sm font-semibold text-gray-700 mt-2">Recent transactions</h3>
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : txs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-6 text-center text-sm text-gray-500">No transactions yet.</div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
          {txs.map(t => {
            const amt = Number(t.amount);
            const credit = amt >= 0;
            const bucketColor = t.bucket === 'savings' ? 'text-indigo-700 bg-indigo-50 border-indigo-100'
              : t.bucket === 'charity' ? 'text-rose-700 bg-rose-50 border-rose-100'
              : t.bucket === 'personal' ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
              : 'text-gray-600 bg-gray-50 border-gray-200';
            return (
              <li key={t.id} className="px-4 py-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">{t.description || t.type}</div>
                  <div className="text-[11px] text-gray-500 inline-flex items-center gap-1.5">
                    <span>{t.type}</span>
                    {t.bucket && <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${bucketColor}`}>{t.bucket}</span>}
                    <span>· {t.created_at ? new Date(t.created_at).toLocaleString() : ''}</span>
                  </div>
                </div>
                <div className={`font-mono text-sm whitespace-nowrap ${credit ? 'text-emerald-700' : 'text-red-600'}`}>
                  {credit ? '+' : '−'}₦{Math.abs(amt).toLocaleString()}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
