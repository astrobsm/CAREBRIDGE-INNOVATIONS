import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, Save, ListChecks, Trophy, ShieldAlert, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type {
  Child, ChecklistItem, ComplianceConfig, ComplianceEvent, DayCode,
} from '../types';
import { loadDefaultConfig } from '../services/compliance';

const DAYS: { code: DayCode; label: string }[] = [
  { code: 'sun', label: 'Sun' }, { code: 'mon', label: 'Mon' }, { code: 'tue', label: 'Tue' },
  { code: 'wed', label: 'Wed' }, { code: 'thu', label: 'Thu' }, { code: 'fri', label: 'Fri' },
  { code: 'sat', label: 'Sat' },
];

export default function FamilyReadiness() {
  const { parent } = useFamilyCtx();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [cfg, setCfg] = useState<ComplianceConfig | null>(null);
  const [recent, setRecent] = useState<ComplianceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState('');

  const loadChildren = useCallback(async () => {
    const fam = getFamilyClient();
    const { data } = await fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('created_at');
    const rows = (data as Child[]) || [];
    setChildren(rows);
    if (rows.length && !selectedId) setSelectedId(rows[0].id);
  }, [parent.id, selectedId]);

  const loadForChild = useCallback(async (childId: string) => {
    if (!childId) return;
    const fam = getFamilyClient();
    const [c, its, ev] = await Promise.all([
      loadDefaultConfig(childId, parent.id),
      fam.from('checklist_items').select('*').eq('child_id', childId).order('sort_order').order('created_at'),
      fam.from('compliance_events').select('*').eq('child_id', childId).order('event_date', { ascending: false }).limit(14),
    ]);
    setCfg(c);
    setItems((its.data as ChecklistItem[]) || []);
    setRecent((ev.data as ComplianceEvent[]) || []);
    setLoading(false);
  }, [parent.id]);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  useEffect(() => {
    if (selectedId) loadForChild(selectedId);
    const unsub = subscribeFamilyChanges(parent.id, () => { if (selectedId) loadForChild(selectedId); });
    return unsub;
  }, [selectedId, parent.id, loadForChild]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const label = newItem.trim();
    if (!label || !selectedId) return;
    const fam = getFamilyClient();
    const sort = items.length ? Math.max(...items.map(i=>i.sort_order||0)) + 1 : 0;
    const { error } = await fam.from('checklist_items').insert({
      child_id: selectedId, parent_id: parent.id, label, sort_order: sort, is_active: true,
    });
    if (error) { toast.error(error.message); return; }
    setNewItem('');
    loadForChild(selectedId);
  }

  async function toggleActive(it: ChecklistItem) {
    const fam = getFamilyClient();
    const { error } = await fam.from('checklist_items').update({ is_active: !it.is_active }).eq('id', it.id);
    if (error) toast.error(error.message); else loadForChild(selectedId);
  }

  async function removeItem(it: ChecklistItem) {
    if (!window.confirm(`Delete "${it.label}"? Past logs will also be removed.`)) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('checklist_items').delete().eq('id', it.id);
    if (error) toast.error(error.message); else loadForChild(selectedId);
  }

  async function saveConfig(patch: Partial<ComplianceConfig>) {
    if (!cfg) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('compliance_config').update(patch).eq('id', cfg.id);
    if (error) toast.error(error.message); else toast.success('Saved');
    loadForChild(selectedId);
  }

  function toggleDay(d: DayCode) {
    if (!cfg) return;
    const next = cfg.active_days.includes(d)
      ? cfg.active_days.filter(x => x !== d)
      : [...cfg.active_days, d];
    saveConfig({ active_days: next });
  }

  const selectedChild = children.find(c=>c.id === selectedId);
  const reward = cfg ? Number(cfg.reward_amount) : 0;
  const penalty = cfg ? Number(cfg.penalty_amount) : 0;
  const dl = cfg?.deadline_time?.slice(0,5) || '21:30';

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-gray-900 inline-flex items-center gap-2">
          <ListChecks size={18} className="text-pink-600"/> Daily readiness & compliance
        </h2>
        {selectedId && (
          <button onClick={()=>loadForChild(selectedId)} className="text-xs px-2 py-1 rounded border border-gray-300 inline-flex items-center gap-1 hover:bg-gray-50">
            <RefreshCw size={12}/> Refresh
          </button>
        )}
      </div>

      {children.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          Add a child first in the Children tab.
        </div>
      ) : (
        <>
          {/* Child selector */}
          <div className="flex gap-2 overflow-x-auto bg-white border border-gray-200 rounded-xl p-2">
            {children.map(c=>(
              <button key={c.id} onClick={()=>setSelectedId(c.id)} className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${selectedId===c.id?'bg-pink-600 text-white':'text-gray-700 hover:bg-gray-100'}`}>
                {c.first_name}
              </button>
            ))}
          </div>

          {loading || !cfg ? <div className="text-sm text-gray-500">Loading…</div> : (
            <>
              {/* Config */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Rules for {selectedChild?.first_name}</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="text-sm">Deadline (24h)
                    <input type="time" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
                      defaultValue={dl}
                      onBlur={(e)=>{ if (e.target.value && e.target.value !== dl) saveConfig({ deadline_time: e.target.value }); }}
                    />
                  </label>
                  <label className="text-sm">Reward (₦) <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Trophy size={11}/> on success</span>
                    <input type="number" min="0" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
                      defaultValue={reward}
                      onBlur={(e)=>{ const v = Number(e.target.value); if (!Number.isNaN(v) && v !== reward) saveConfig({ reward_amount: v }); }}
                    />
                  </label>
                  <label className="text-sm">Penalty (₦) <span className="inline-flex items-center gap-1 text-xs text-red-700"><ShieldAlert size={11}/> on miss</span>
                    <input type="number" min="0" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm"
                      defaultValue={penalty}
                      onBlur={(e)=>{ const v = Number(e.target.value); if (!Number.isNaN(v) && v !== penalty) saveConfig({ penalty_amount: v }); }}
                    />
                  </label>
                </div>

                <div>
                  <div className="text-xs font-medium text-gray-700 mb-1">Active days</div>
                  <div className="flex flex-wrap gap-1">
                    {DAYS.map(d=>{
                      const on = cfg.active_days.includes(d.code);
                      return (
                        <button key={d.code} onClick={()=>toggleDay(d.code)}
                          className={`px-2.5 py-1 rounded-md text-xs border ${on?'bg-pink-600 text-white border-pink-600':'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="text-sm inline-flex items-center gap-2">
                  <input type="checkbox" checked={cfg.enabled} onChange={(e)=>saveConfig({ enabled: e.target.checked })}/>
                  <span>Enabled (rewards & penalties auto-apply)</span>
                </label>
              </div>

              {/* Checklist items */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Readiness checklist items</h3>
                <form onSubmit={addItem} className="flex gap-2">
                  <input
                    className="flex-1 border rounded-md px-2 py-1.5 text-sm"
                    placeholder="e.g. Bath, Iron uniform, Pack school bag, Brush teeth"
                    value={newItem}
                    onChange={(e)=>setNewItem(e.target.value)}
                  />
                  <button className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm inline-flex items-center gap-1 hover:bg-pink-700">
                    <Plus size={14}/> Add
                  </button>
                </form>
                {items.length === 0 ? (
                  <div className="text-xs text-gray-500">Add at least one item so {selectedChild?.first_name} has something to tick.</div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {items.map(it=>(
                      <li key={it.id} className="py-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input type="checkbox" checked={it.is_active} onChange={()=>toggleActive(it)} title="Active"/>
                          <span className={`text-sm ${it.is_active?'text-gray-900':'text-gray-400 line-through'}`}>{it.label}</span>
                        </div>
                        <button onClick={()=>removeItem(it)} className="text-gray-400 hover:text-red-600 p-1" title="Delete">
                          <Trash2 size={12}/>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recent compliance */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Last 14 days</h3>
                {recent.length === 0 ? (
                  <div className="text-xs text-gray-500">No compliance events yet. Once {selectedChild?.first_name} starts using the readiness page, results appear here.</div>
                ) : (
                  <ul className="divide-y divide-gray-100 text-sm">
                    {recent.map(e=>(
                      <li key={e.id} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {e.kind === 'day_passed'
                            ? <Trophy size={14} className="text-emerald-600"/>
                            : <ShieldAlert size={14} className="text-red-600"/>}
                          <span className="text-gray-900">{e.event_date}</span>
                          <span className={`text-xs ${e.kind==='day_passed'?'text-emerald-700':'text-red-700'}`}>{e.kind==='day_passed'?'Passed':'Failed'}</span>
                        </div>
                        <div className={`text-sm font-mono ${e.kind==='day_passed'?'text-emerald-700':'text-red-700'}`}>
                          {e.kind==='day_passed'?'+':'−'}₦{Number(e.amount).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <p className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                <Save size={10}/> Changes save automatically on blur.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
