import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Minus, PiggyBank, Wallet as WalletIcon, Heart, Settings2, Save, X, Banknote } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { creditWithSplit, debitFromBucket } from '../../../services/familyWallets';
import type { Bucket } from '../../../services/familyWallets';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, Wallet, Transaction } from '../types';

interface Row { child: Child; wallet: Wallet | null }

export default function FamilyWallets() {
  const { parent } = useFamilyCtx();
  const [rows, setRows] = useState<Row[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editSplit, setEditSplit] = useState<{ walletId: string; s: number; p: number; c: number } | null>(null);

  async function load() {
    const fam = getFamilyClient();
    const [kidsRes, walletsRes, txRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
      fam.from('wallets').select('*, children!inner(parent_id)').eq('children.parent_id', parent.id),
      fam.from('transactions').select('*, children!inner(parent_id)').eq('children.parent_id', parent.id).order('created_at', { ascending: false }).limit(30),
    ]);
    const kids = (kidsRes.data as Child[]) || [];
    const wallets = (walletsRes.data as Wallet[]) || [];
    setRows(kids.map((c) => ({ child: c, wallet: wallets.find(w => w.child_id === c.id) || null })));
    setTxs((txRes.data as Transaction[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  async function creditChild(child: Child) {
    const raw = window.prompt(`Credit amount for ${child.first_name} (₦) — will auto-split into savings/personal/charity:`);
    if (!raw) return;
    const amount = Number(raw);
    if (!amount || amount <= 0) { toast.error('Invalid amount'); return; }
    try {
      await creditWithSplit(child.id, amount, 'bonus', 'Manual credit');
      toast.success('Credited and split');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  }

  async function debitChild(child: Child) {
    const bucketRaw = window.prompt(`Debit from which bucket? Type one of: personal, savings, charity`, 'personal');
    if (!bucketRaw) return;
    const bucket = bucketRaw.trim().toLowerCase() as Bucket;
    if (!['personal', 'savings', 'charity'].includes(bucket)) {
      toast.error('Bucket must be personal, savings, or charity'); return;
    }
    const raw = window.prompt(`Debit amount for ${child.first_name} (₦) from ${bucket}:`);
    if (!raw) return;
    const amount = Number(raw);
    if (!amount || amount <= 0) { toast.error('Invalid amount'); return; }
    try {
      const type = bucket === 'savings' ? 'savings_withdrawal' : 'adjustment';
      await debitFromBucket(child.id, bucket, amount, type, 'Manual debit');
      toast.success('Debited');
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  }

  async function payStipend(child: Child, wallet: Wallet | null) {
    const stipend = Number(wallet?.base_stipend || 0);
    if (!stipend || stipend <= 0) { toast.error('Set a monthly stipend first'); return; }
    const period = new Date().toLocaleString('en-NG', { month: 'long', year: 'numeric' });
    if (!window.confirm(`Pay ${child.first_name}'s ₦${stipend.toLocaleString()} stipend for ${period}? It will auto-split into the 3 buckets.`)) return;
    try {
      await creditWithSplit(child.id, stipend, 'stipend', `Monthly stipend — ${period}`);
      toast.success(`Stipend paid to ${child.first_name}`);
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  }

  async function saveSplit() {
    if (!editSplit) return;
    if (editSplit.s + editSplit.p + editSplit.c !== 100) {
      toast.error('Percentages must add up to 100'); return;
    }
    const fam = getFamilyClient();
    const { error } = await fam.from('wallets').update({
      split_savings_pct: editSplit.s,
      split_personal_pct: editSplit.p,
      split_charity_pct: editSplit.c,
    }).eq('id', editSplit.walletId);
    if (error) toast.error(error.message); else { toast.success('Split updated'); setEditSplit(null); load(); }
  }

  function fmt(n: unknown) {
    return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Wallets</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          All earnings auto-split: <b className="text-indigo-700">savings</b> · <b className="text-emerald-700">personal</b> · <b className="text-rose-600">charity</b>. Children choose when to donate the charity portion.
        </p>
      </div>

      {loading ? <div className="text-sm text-gray-500">Loading…</div> : rows.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          Add a child first to create their wallet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map(({ child, wallet }) => {
            const sp = wallet?.split_savings_pct ?? 60;
            const pp = wallet?.split_personal_pct ?? 30;
            const cp = wallet?.split_charity_pct ?? 10;
            const editing = editSplit?.walletId === wallet?.id;
            return (
              <div key={child.id} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{child.first_name} {child.last_name}</div>
                    <div className="text-[11px] text-gray-500">Stipend ₦{fmt(wallet?.base_stipend)}/mo · split {sp}/{pp}/{cp}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wide text-gray-400">Total</div>
                    <div className="text-xl font-bold text-gray-900">₦{fmt(wallet?.balance)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-2 py-1.5">
                    <div className="text-[10px] text-indigo-700 inline-flex items-center gap-1 justify-center"><PiggyBank size={10} /> Savings</div>
                    <div className="text-sm font-bold text-indigo-900">₦{fmt(wallet?.savings_balance)}</div>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5">
                    <div className="text-[10px] text-emerald-700 inline-flex items-center gap-1 justify-center"><WalletIcon size={10} /> Personal</div>
                    <div className="text-sm font-bold text-emerald-900">₦{fmt(wallet?.personal_balance)}</div>
                  </div>
                  <div className="rounded-lg bg-rose-50 border border-rose-100 px-2 py-1.5">
                    <div className="text-[10px] text-rose-700 inline-flex items-center gap-1 justify-center"><Heart size={10} /> Charity</div>
                    <div className="text-sm font-bold text-rose-900">₦{fmt(wallet?.charity_balance)}</div>
                  </div>
                </div>

                {editing && editSplit ? (
                  <div className="rounded-lg border border-gray-200 p-2 space-y-1.5 bg-gray-50">
                    <div className="text-[11px] font-medium text-gray-700">Adjust split (must total 100%)</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <label className="text-[11px] text-indigo-700">Savings %
                        <input type="number" min={0} max={100} value={editSplit.s} onChange={(e) => setEditSplit({ ...editSplit, s: Number(e.target.value) })} className="mt-0.5 w-full border rounded px-1.5 py-1 text-xs" />
                      </label>
                      <label className="text-[11px] text-emerald-700">Personal %
                        <input type="number" min={0} max={100} value={editSplit.p} onChange={(e) => setEditSplit({ ...editSplit, p: Number(e.target.value) })} className="mt-0.5 w-full border rounded px-1.5 py-1 text-xs" />
                      </label>
                      <label className="text-[11px] text-rose-700">Charity %
                        <input type="number" min={0} max={100} value={editSplit.c} onChange={(e) => setEditSplit({ ...editSplit, c: Number(e.target.value) })} className="mt-0.5 w-full border rounded px-1.5 py-1 text-xs" />
                      </label>
                    </div>
                    <div className="flex gap-1.5 pt-1">
                      <button onClick={saveSplit} className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] px-2 py-1 rounded bg-pink-600 text-white hover:bg-pink-700"><Save size={11} /> Save</button>
                      <button onClick={() => setEditSplit(null)} className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] px-2 py-1 rounded border border-gray-300 text-gray-600 hover:bg-white"><X size={11} /> Cancel</button>
                    </div>
                    <div className="text-[10px] text-gray-500 text-right">Total: {editSplit.s + editSplit.p + editSplit.c}%</div>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button onClick={() => creditChild(child)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                      <Plus size={12} /> Credit
                    </button>
                    <button onClick={() => debitChild(child)} className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50">
                      <Minus size={12} /> Debit
                    </button>
                    <button
                      onClick={() => payStipend(child, wallet)}
                      disabled={!Number(wallet?.base_stipend || 0)}
                      title="Pay this month's stipend"
                      className="inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50">
                      <Banknote size={12} /> Stipend
                    </button>
                    <button
                      onClick={() => wallet && setEditSplit({ walletId: wallet.id, s: sp, p: pp, c: cp })}
                      disabled={!wallet}
                      title="Edit split percentages"
                      className="inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                      <Settings2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent transactions</h3>
        {txs.length === 0 ? (
          <div className="text-xs text-gray-500">No transactions yet.</div>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
            {txs.map(t => {
              const amt = Number(t.amount);
              const isDebit = amt < 0 || ['penalty', 'transfer_out', 'charity_donation', 'savings_withdrawal'].includes(t.type);
              const bucketColor = t.bucket === 'savings' ? 'text-indigo-700 bg-indigo-50 border-indigo-100'
                : t.bucket === 'charity' ? 'text-rose-700 bg-rose-50 border-rose-100'
                  : t.bucket === 'personal' ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                    : 'text-gray-600 bg-gray-50 border-gray-200';
              return (
                <li key={t.id} className="px-4 py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-900 truncate">{t.description || t.type}</div>
                    <div className="text-xs text-gray-500 inline-flex items-center gap-1.5">
                      <span>{t.type}</span>
                      {t.bucket && <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${bucketColor}`}>{t.bucket}</span>}
                      <span>· {t.created_at ? new Date(t.created_at).toLocaleString() : ''}</span>
                    </div>
                  </div>
                  <div className={`font-semibold whitespace-nowrap ${isDebit ? 'text-red-600' : 'text-emerald-600'}`}>
                    {isDebit ? '−' : '+'}₦{Math.abs(amt).toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
