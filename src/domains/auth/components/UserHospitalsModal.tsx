// ---------------------------------------------------------------------------
// Which hospitals a user belongs to (hospital scoping). Their own hospital
// (users.hospitalId) always counts; extra hospitals are granted here and
// stored in public.user_hospitals by /api/admin-users — the only writer.
//
// A super admin grants any hospital; a hospital admin only their own. With no
// user given, the modal grants by sign-in email: staff of another hospital do
// not appear in a hospital admin's user list until they are let in.
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, X, Plus, Trash2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Hospital, User } from '../../../types';
import {
  grantHospitalByEmail,
  grantUserHospital,
  listUserHospitals,
  revokeUserHospital,
  type UserHospitals,
} from '../../../services/adminUsersClient';

interface Props {
  /** The account to manage; omitted to grant by email. */
  user?: User | null;
  /** Every hospital on this device, for names. */
  hospitals: Hospital[];
  /** The hospitals this administrator may grant (super admin: all; hospital admin: their own). */
  grantable: Hospital[];
  onClose: () => void;
}

export default function UserHospitalsModal({ user, hospitals, grantable, onClose }: Props) {
  const [state, setState] = useState<UserHospitals | null>(null);
  const [loading, setLoading] = useState(!!user);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [hospitalId, setHospitalId] = useState(grantable.length === 1 ? grantable[0].id : '');

  const nameOf = (id?: string | null) => hospitals.find((h) => h.id === id)?.name || id || 'Not assigned';

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listUserHospitals(user.id)
      .then((s) => { if (!cancelled) setState(s); })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not load hospitals'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  const granted = new Set(state?.hospitals.map((h) => h.hospital_id) ?? []);
  const primary = state?.primaryHospitalId ?? user?.hospitalId ?? null;
  const choices = grantable.filter((h) => h.id !== primary && !granted.has(h.id));
  const mayRevoke = (id: string) => grantable.some((h) => h.id === id);

  const grant = async () => {
    if (!hospitalId) return;
    setBusy(true);
    try {
      const next = user
        ? await grantUserHospital(user.id, hospitalId)
        : await grantHospitalByEmail(email.trim(), hospitalId);
      setState(next);
      toast.success(`${next.name || 'User'} can now see ${nameOf(hospitalId)}'s patients`);
      if (!user) setEmail('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not grant the hospital');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    const target = state?.userId ?? user?.id;
    if (!target) return;
    if (!window.confirm(`Remove ${nameOf(id)}? They will no longer see its patients (unless a visit or referral links them).`)) return;
    setBusy(true);
    try {
      setState(await revokeUserHospital(target, id));
      toast.success('Hospital removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove the hospital');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            {user ? `Hospitals for ${user.firstName} ${user.lastName}` : 'Let in staff from another hospital'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-sm">
          <p className="text-gray-600">
            Staff see the patients of the hospitals they belong to, and patients seen, referred or
            discussed there. Their own hospital always counts; add others here.
          </p>

          {(user || state) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border px-3 py-2 bg-gray-50">
                <span>{nameOf(primary)}</span>
                <span className="text-xs text-gray-500">Own hospital</span>
              </div>
              {loading && <p className="text-gray-500">Loading…</p>}
              {state?.hospitals.map((h) => (
                <div key={h.hospital_id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <span>{nameOf(h.hospital_id)}</span>
                  {mayRevoke(h.hospital_id) && (
                    <button
                      onClick={() => revoke(h.hospital_id)}
                      disabled={busy}
                      className="text-red-600 hover:bg-red-50 rounded p-1"
                      title="Remove this hospital"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            {!user && (
              <label className="block">
                <span className="text-gray-700 flex items-center gap-1"><Mail className="w-4 h-4" /> Their sign-in email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input mt-1 w-full"
                  placeholder="name@hospital.ng"
                />
              </label>
            )}
            <label className="block">
              <span className="text-gray-700">Add hospital</span>
              <select
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                className="input mt-1 w-full"
              >
                <option value="">Choose…</option>
                {(user ? choices : grantable).map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </label>
            <button
              onClick={grant}
              disabled={busy || !hospitalId || (!user && !email.trim())}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Grant access
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
