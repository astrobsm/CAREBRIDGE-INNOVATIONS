import { useEffect, useState } from 'react';
import { CloudOff, LogIn, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';

/**
 * Shown while signed in OFFLINE (password checked on this device only). Work
 * is saved locally but nothing syncs until there is a real Supabase session.
 * Once the device is back online the person can enter their password here to
 * sign in online without losing their place.
 */
export default function OfflineSessionBanner() {
  const { sessionMode, reauthenticate } = useAuth();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const up = () => { setOnline(true); setHidden(false); };
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (sessionMode !== 'offline' || hidden) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await reauthenticate(password);
      if (result.ok) {
        toast.success('Signed in online. Syncing your work.');
        setOpen(false);
      } else {
        toast.error(result.message || 'Sign-in failed');
      }
    } finally {
      setPassword('');
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-2 right-2 z-50 sm:left-auto sm:right-4 sm:w-96">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 shadow-lg" role="status">
        <div className="flex items-start gap-2">
          <CloudOff className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="flex-1 text-sm text-amber-900">
            <p className="font-semibold">Signed in offline</p>
            <p>
              Your work is saved on this device.{' '}
              {online ? 'Sign in online to sync it.' : 'It will sync after you sign in online.'}
            </p>
            {online && !open && (
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-2 inline-flex items-center gap-1 font-medium text-amber-900 underline"
              >
                <LogIn className="h-4 w-4" /> Sign in online
              </button>
            )}
            {online && open && (
              <form onSubmit={submit} className="mt-2 flex gap-2">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input flex-1 py-1.5 text-sm"
                  placeholder="Your password"
                  aria-label="Password"
                  required
                />
                <button type="submit" disabled={busy || !password} className="btn btn-primary px-3 py-1.5 text-sm">
                  {busy ? '...' : 'Sign in'}
                </button>
              </form>
            )}
          </div>
          <button type="button" onClick={() => setHidden(true)} className="p-1 text-amber-700" title="Hide">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
