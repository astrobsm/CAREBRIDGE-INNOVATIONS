import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { PrayerSchedule } from '../types';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function FamilyPrayer() {
  const { parent } = useFamilyCtx();
  const [list, setList] = useState<PrayerSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ name: '', scheduled_time: '06:00', days: [0,1,2,3,4,5,6] });
  const [busy, setBusy] = useState(false);

  async function load() {
    const fam = getFamilyClient();
    const { data, error } = await fam.from('prayer_schedules').select('*').eq('parent_id', parent.id).eq('is_active', true).order('scheduled_time');
    if (error) toast.error(error.message);
    setList((data as PrayerSchedule[]) || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return;
    setBusy(true);
    const fam = getFamilyClient();
    const { error } = await fam.from('prayer_schedules').insert({
      parent_id: parent.id, name: form.name, scheduled_time: form.scheduled_time, days_of_week: form.days,
    });
    if (error) toast.error(error.message); else toast.success('Prayer scheduled');
    setForm({ name: '', scheduled_time: '06:00', days: [0,1,2,3,4,5,6] });
    setShow(false); setBusy(false); load();
  }
  async function remove(id: string) {
    if (!window.confirm('Remove this prayer?')) return;
    const fam = getFamilyClient();
    const { error } = await fam.from('prayer_schedules').update({ is_active: false }).eq('id', id);
    if (error) toast.error(error.message); else load();
  }
  function toggleDay(d: number) {
    setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x=>x!==d) : [...f.days, d].sort() }));
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Prayer schedule</h2>
        <button onClick={()=>setShow(s=>!s)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm hover:bg-pink-700">
          <Plus size={14}/> {show?'Cancel':'Add prayer'}
        </button>
      </div>
      {show && (
        <form onSubmit={add} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <label className="text-sm block">Name *
            <input className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} required/>
          </label>
          <label className="text-sm block">Time *
            <input type="time" className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" value={form.scheduled_time} onChange={(e)=>setForm({...form,scheduled_time:e.target.value})} required/>
          </label>
          <div>
            <div className="text-sm mb-1">Days</div>
            <div className="flex gap-1 flex-wrap">
              {DAYS.map((d,i)=>(
                <button key={d} type="button" onClick={()=>toggleDay(i)}
                  className={`text-xs px-2 py-1 rounded border ${form.days.includes(i) ? 'bg-pink-600 text-white border-pink-600' : 'border-gray-300 text-gray-700'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <button disabled={busy} className="px-3 py-1.5 rounded-md bg-pink-600 text-white text-sm disabled:opacity-60">{busy?'Saving…':'Save'}</button>
        </form>
      )}
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : list.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">No prayer schedules yet.</div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {list.map(p=>(
            <li key={p.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500">{p.scheduled_time?.slice(0,5)} · {(p.days_of_week||[]).map(d=>DAYS[d]).join(', ')}</div>
              </div>
              <button onClick={()=>remove(p.id)} title="Remove" aria-label="Remove" className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14}/></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
