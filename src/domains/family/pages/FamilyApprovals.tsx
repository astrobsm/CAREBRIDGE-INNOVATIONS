// Parent approval queue — review every task each child marked as completed
// before any reward / penalty is applied. Backed by the RPCs:
//   family.approve_task_assignment(p_assignment_id, p_approver_id, p_note)
//   family.reject_task_assignment(p_assignment_id, p_approver_id, p_note)
//
// Until the parent approves or rejects, the wallet balance is untouched.
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, Filter, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { Child, Task, TaskAssignment } from '../types';

interface Row extends TaskAssignment {
  task?: Task;
  child?: Child;
}

type Bucket = 'pending' | 'approved' | 'rejected';

export default function FamilyApprovals() {
  const { parent } = useFamilyCtx();
  const [rows, setRows] = useState<Row[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bucket, setBucket] = useState<Bucket>('pending');
  const [childFilter, setChildFilter] = useState<string>('all');
  const [notes, setNotes] = useState<Record<string, string>>({});

  async function load() {
    const fam = getFamilyClient();
    const [kidsRes, asRes] = await Promise.all([
      fam.from('children').select('*').eq('parent_id', parent.id).eq('is_active', true).order('date_of_birth'),
      fam.from('task_assignments')
        .select('*, task:tasks!inner(*), child:children!task_assignments_child_id_fkey(*)')
        .eq('task.parent_id', parent.id)
        .order('completed_at', { ascending: false, nullsFirst: false })
        .order('due_date', { ascending: false, nullsFirst: false }),
    ]);
    if (asRes.error) toast.error(asRes.error.message);
    setChildren((kidsRes.data as Child[]) || []);
    setRows((asRes.data as Row[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  const grouped = useMemo(() => {
    const filtered = rows.filter(r => {
      const status = (r.approval_status || 'not_required') as string;
      if (bucket === 'pending') {
        // Show anything the child has completed but parent hasn't reviewed yet.
        if (status !== 'pending') return false;
      } else if (bucket === 'approved') {
        if (status !== 'approved') return false;
      } else if (bucket === 'rejected') {
        if (status !== 'rejected') return false;
      }
      if (childFilter !== 'all' && r.child_id !== childFilter) return false;
      return true;
    });
    const byChild: Record<string, Row[]> = {};
    for (const r of filtered) {
      const k = r.child_id;
      (byChild[k] ||= []).push(r);
    }
    return byChild;
  }, [rows, bucket, childFilter]);

  async function review(id: string, kind: 'approve' | 'reject') {
    const note = notes[id]?.trim() || null;
    setBusyId(id);
    const fam = getFamilyClient();
    const rpc = kind === 'approve' ? 'approve_task_assignment' : 'reject_task_assignment';
    const { error } = await fam.rpc(rpc, {
      p_assignment_id: id,
      p_approver_id: parent.id,
      p_note: note,
    });
    setBusyId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(kind === 'approve' ? 'Approved — reward applied' : 'Rejected — penalty applied');
    setNotes(n => { const { [id]: _drop, ...rest } = n; return rest; });
    load();
  }

  const pendingCount = rows.filter(r => r.approval_status === 'pending').length;
  const approvedCount = rows.filter(r => r.approval_status === 'approved').length;
  const rejectedCount = rows.filter(r => r.approval_status === 'rejected').length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Approvals</h2>
          <p className="text-xs text-gray-500">
            Rewards or penalties are only applied after you Approve or Reject below.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50"
        >
          <RefreshCw size={12}/> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden text-sm">
          <button onClick={()=>setBucket('pending')}  className={`px-3 py-1.5 inline-flex items-center gap-1 ${bucket==='pending'  ? 'bg-amber-600 text-white'   : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <Clock size={14}/> Pending ({pendingCount})
          </button>
          <button onClick={()=>setBucket('approved')} className={`px-3 py-1.5 inline-flex items-center gap-1 ${bucket==='approved' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <CheckCircle2 size={14}/> Approved ({approvedCount})
          </button>
          <button onClick={()=>setBucket('rejected')} className={`px-3 py-1.5 inline-flex items-center gap-1 ${bucket==='rejected' ? 'bg-rose-600 text-white'    : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
            <XCircle size={14}/> Rejected ({rejectedCount})
          </button>
        </div>
        <div className="inline-flex items-center gap-1 text-xs text-gray-600">
          <Filter size={12}/>
          <select
            aria-label="Filter by child"
            title="Filter by child"
            value={childFilter}
            onChange={(e)=>setChildFilter(e.target.value)}
            className="border rounded-md px-2 py-1 text-xs"
          >
            <option value="all">All children</option>
            {children.map(c => <option key={c.id} value={c.id}>{c.first_name}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
          {bucket === 'pending' ? 'Nothing waiting for your review.' : `No ${bucket} items.`}
        </div>
      ) : (
        children
          .filter(c => grouped[c.id]?.length)
          .map(child => {
            const items = grouped[child.id] || [];
            return (
              <section key={child.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <header className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {child.first_name} {child.last_name}
                  </h3>
                  <span className="text-xs text-gray-500">{items.length} item{items.length>1?'s':''}</span>
                </header>
                <ul className="divide-y divide-gray-100">
                  {items.map(r => {
                    const t = r.task;
                    const reward = Number(t?.reward_amount || 0);
                    const penalty = Number(t?.penalty_amount || 0);
                    const isBusy = busyId === r.id;
                    return (
                      <li key={r.id} className="px-4 py-3 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900">{t?.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                              <span>{t?.category}</span>
                              {t?.priority && <span>· {t.priority}</span>}
                              {r.due_date && <span>· due {new Date(r.due_date).toLocaleDateString()}</span>}
                              {r.completed_at && <span>· completed {new Date(r.completed_at).toLocaleString()}</span>}
                              {reward > 0 && <span className="text-emerald-700">· reward ₦{reward.toLocaleString()}</span>}
                              {penalty > 0 && <span className="text-rose-700">· penalty ₦{penalty.toLocaleString()}</span>}
                            </div>
                            {t?.description && <div className="text-xs text-gray-600 mt-1">{t.description}</div>}
                            {r.parent_review_notes && (
                              <div className="text-xs italic text-gray-500 mt-1">Note: {r.parent_review_notes}</div>
                            )}
                          </div>
                        </div>
                        {bucket === 'pending' && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              placeholder="Optional note to the child…"
                              className="flex-1 border rounded-md px-2 py-1.5 text-xs"
                              value={notes[r.id] || ''}
                              onChange={(e)=>setNotes(n => ({...n, [r.id]: e.target.value}))}
                              disabled={isBusy}
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={()=>review(r.id,'approve')}
                                disabled={isBusy}
                                className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <CheckCircle2 size={12}/> Approve
                              </button>
                              <button
                                onClick={()=>review(r.id,'reject')}
                                disabled={isBusy}
                                className="text-xs px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <XCircle size={12}/> Reject
                              </button>
                            </div>
                          </div>
                        )}
                        {bucket !== 'pending' && (
                          <div className="text-xs text-gray-500">
                            {r.approval_status === 'approved'
                              ? `Approved${r.approved_at ? ' on ' + new Date(r.approved_at).toLocaleString() : ''}${reward>0 ? ` — +₦${reward.toLocaleString()}` : ''}`
                              : `Rejected${r.approved_at ? ' on ' + new Date(r.approved_at).toLocaleString() : ''}${penalty>0 ? ` — −₦${penalty.toLocaleString()}` : ''}`}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })
      )}
    </div>
  );
}
