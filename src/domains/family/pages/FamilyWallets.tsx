import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Minus } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, Wallet, Transaction } from '../types';

interface Row { child: Child; wallet: Wallet | null }

export default function FamilyWallets() {
  const { parent } = useFamilyCtx();
  const [rows, setRows] = useState<Row[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const fam = getFamilyClient();
    const [kidsRes, walletsRes, txRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('first_name'),
      fam.from('wallets').select('*, children!inner(parent_id)').eq('children.parent_id', parent.id),
      fam.from('transactions').select('*, children!inner(parent_id)').eq('children.parent_id', parent.id).order('created_at', { ascending: false }).limit(20),
    ]);
    const kids = (kidsRes.data as Child[]) || [];
    const wallets = (walletsRes.data as Wallet[]) || [];
    setRows(kids.map((c)=>({ child: c, wallet: wallets.find(w=>w.child_id===c.id) || null })));
    setTxs((txRes.data as Transaction[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  async function adjust(child: Child, wallet: Wallet | null, kind: 'bonus'|'penalty') {
    const raw = window.prompt(`${kind === 'bonus' ? 'Credit' : 'Debit'} amount for ${child.first_name} (₦):`);
    if (!raw) return;
    const amount = Number(raw);
    if (!amount || amount <= 0) { toast.error('Invalid amount'); return; }
    const fam = getFamilyClient();
    let w = wallet;
    if (!w) {
      const ins = await fam.from('wallets').insert({ child_id: child.id, balance: 0, base_stipend: 0 }).select('*').single();
      if (ins.error) { toast.error(ins.error.message); return; }
      w = ins.data as Wallet;
    }
    const delta = kind === 'bonus' ? amount : -amount;
    const newBal = Number(w.balance || 0) + delta;
    const upd = await fam.from('wallets').update({ balance: newBal }).eq('id', w.id);
    if (upd.error) { toast.error(upd.error.message); return; }
    const tx = await fam.from('transactions').insert({
      child_id: child.id,
      wallet_id: w.id,
      type: kind,
      amount,
      balance_after: newBal,
      description: kind === 'bonus' ? 'Manual credit' : 'Manual debit',
      created_by: parent.id,
    });
    if (tx.error) toast.error(tx.error.message); else { toast.success('Saved'); load(); }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h2 className="text-lg font-semibold text-gray-900">Wallets</h2>
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : rows.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          Add a child first to create their wallet.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {rows.map(({ child, wallet }) => (
            <div key={child.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{child.first_name} {child.last_name}</div>
                  <div className="text-xs text-gray-500">Stipend ₦{Number(wallet?.base_stipend || 0).toLocaleString()}/mo</div>
                </div>
                <div className="text-2xl font-bold text-emerald-700">₦{Number(wallet?.balance || 0).toLocaleString()}</div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={()=>adjust(child, wallet, 'bonus')} className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                  <Plus size={12}/> Credit
                </button>
                <button onClick={()=>adjust(child, wallet, 'penalty')} className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded border border-red-300 text-red-700 hover:bg-red-50">
                  <Minus size={12}/> Debit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Recent transactions</h3>
        {txs.length === 0 ? (
          <div className="text-xs text-gray-500">No transactions yet.</div>
        ) : (
          <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 text-sm">
            {txs.map(t=>(
              <li key={t.id} className="px-4 py-2 flex items-center justify-between">
                <div>
                  <div className="text-gray-900">{t.description || t.type}</div>
                  <div className="text-xs text-gray-500">{t.type} · {t.created_at ? new Date(t.created_at).toLocaleString() : ''}</div>
                </div>
                <div className={`font-semibold ${['penalty','transfer_out'].includes(t.type) ? 'text-red-600' : 'text-emerald-600'}`}>
                  {['penalty','transfer_out'].includes(t.type) ? '−' : '+'}₦{Number(t.amount).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
