/**
 * WHO Surgical Safety Checklist (2009) on the surgery record: Sign in, Time
 * out, Sign out, and the CDC wound class (recorded at Time out, confirmed at
 * Sign out). Each phase is completed by the signed-in person, with the time.
 */
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, Circle, ShieldCheck } from 'lucide-react';
import type { Surgery } from '../../../types';
import { WHO_PHASES, WOUND_CLASSES, completePhase, type WhoPhaseId } from '../journey/whoChecklist';
import { updateSurgery, actorName } from '../journey/surgeryWrite';
import { useAuth } from '../../../contexts/AuthContext';

export default function WhoChecklistPanel({ surgery, allergies }: { surgery: Surgery; allergies?: string[] }) {
  const { user } = useAuth();
  const c = surgery.whoChecklist;
  const firstOpen = WHO_PHASES.find(p => !c?.[p.id]?.completedAt)?.id ?? 'signOut';
  const [open, setOpen] = useState<WhoPhaseId>(firstOpen);
  const [ticks, setTicks] = useState<Record<WhoPhaseId, Record<string, boolean>>>({
    signIn: c?.signIn?.items ?? {}, timeOut: c?.timeOut?.items ?? {}, signOut: c?.signOut?.items ?? {},
  });
  useEffect(() => { setOpen(firstOpen); }, [firstOpen]);

  const complete = async (id: WhoPhaseId) => {
    if (!user) return;
    if (id === 'signOut' && !surgery.woundClass) { toast.error('Record the wound class first'); return; }
    try {
      const next = completePhase(id, surgery.whoChecklist, ticks[id], { id: user.id, name: actorName(user) }, new Date());
      await updateSurgery(surgery.id, { whoChecklist: next });
      toast.success(`${WHO_PHASES.find(p => p.id === id)!.title} completed`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    }
  };

  return (
    <div className="border rounded-lg mb-6" data-testid="who-checklist">
      <div className="px-3 py-2 border-b bg-gray-50 flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-bold text-gray-800">WHO Surgical Safety Checklist</h3>
      </div>
      {WHO_PHASES.map(p => {
        const done = c?.[p.id]?.completedAt;
        return (
          <div key={p.id} className="border-b last:border-b-0">
            <button type="button" onClick={() => setOpen(p.id)} className="w-full flex items-center justify-between px-3 py-2 text-left">
              <span className="flex items-center gap-2">
                {done ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-gray-400" />}
                <span className="text-sm font-semibold">{p.title}</span>
                <span className="text-xs text-gray-500">{p.when}</span>
              </span>
              {done && <span className="text-xs text-green-700">{new Date(done).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{c?.[p.id]?.completedByName ? ` · ${c[p.id]!.completedByName}` : ''}</span>}
            </button>
            {open === p.id && (
              <div className="px-3 pb-3 space-y-2">
                {p.items.map(i => (
                  <label key={i.id} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" className="mt-1" disabled={!!done}
                      checked={!!ticks[p.id][i.id]}
                      onChange={e => setTicks(t => ({ ...t, [p.id]: { ...t[p.id], [i.id]: e.target.checked } }))} />
                    <span>
                      {i.text}
                      {i.id === 'allergy_known' && <span className="block text-xs text-gray-500">Recorded: {allergies?.length ? allergies.join(', ') : 'none recorded'}</span>}
                    </span>
                  </label>
                ))}
                {(p.id === 'timeOut' || p.id === 'signOut') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Surgical wound class (CDC)</label>
                    <select value={surgery.woundClass ?? ''} disabled={p.id === 'signOut' && !!done}
                      onChange={e => updateSurgery(surgery.id, { woundClass: (e.target.value || undefined) as Surgery['woundClass'] })}
                      className="w-full border rounded-lg px-2 py-1.5 text-sm">
                      <option value="">Select…</option>
                      {WOUND_CLASSES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                    {surgery.woundClass && <p className="text-xs text-gray-500 mt-1">{WOUND_CLASSES.find(w => w.value === surgery.woundClass)!.help}</p>}
                    <label className="flex items-center gap-2 text-xs mt-2">
                      <input type="checkbox" checked={!!surgery.implantPlaced}
                        onChange={e => updateSurgery(surgery.id, { implantPlaced: e.target.checked })} />
                      Implant left in place (infection surveillance runs 90 days)
                    </label>
                  </div>
                )}
                {!done && (
                  <button type="button" onClick={() => complete(p.id)}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold">
                    Complete {p.title.toLowerCase()}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p className="px-3 py-2 text-[11px] text-gray-500">WHO Surgical Safety Checklist, 2009. Wound class: CDC/NHSN.</p>
    </div>
  );
}
