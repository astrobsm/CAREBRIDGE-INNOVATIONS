import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Bell } from 'lucide-react';
import { getFamilyClient } from '../../../services/familyClient';
import { useFamilyCtx } from '../context';
import { subscribeFamilyChanges } from '../hooks/useFamilyRealtime';
import type { FamilyNotification } from '../types';

export default function FamilyNotifications() {
  const { parent } = useFamilyCtx();
  const [list, setList] = useState<FamilyNotification[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const fam = getFamilyClient();
    const { data, error } = await fam.from('notifications').select('*').eq('user_id', parent.id).order('created_at', { ascending: false }).limit(50);
    if (error) toast.error(error.message);
    setList((data as FamilyNotification[]) || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    const unsub = subscribeFamilyChanges(parent.id, load);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent.id]);

  async function markRead(id: string) {
    const fam = getFamilyClient();
    const { error } = await fam.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) toast.error(error.message); else load();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
      {loading ? <div className="text-sm text-gray-500">Loading…</div> : list.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">No notifications.</div>
      ) : (
        <ul className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {list.map(n=>(
            <li key={n.id} className={`px-4 py-3 flex items-start gap-3 ${n.is_read ? '' : 'bg-pink-50/50'}`}>
              <Bell size={16} className={n.is_read ? 'text-gray-400' : 'text-pink-600'}/>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">{n.title || 'Notification'}</div>
                {n.body && <div className="text-xs text-gray-600 mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
              </div>
              {!n.is_read && (
                <button onClick={()=>markRead(n.id)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Mark read</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
