import { useEffect, useState } from 'react';
import { CloudOff, LogIn, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';

const DISMISS_KEY = 'astrohealth.offlineSessionStripDismissed';

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberDismissed(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* storage unavailable: hidden for this page view only */
  }
}

/**
 * Shown while signed in OFFLINE (password checked on this device only). Work
 * is saved locally but nothing syncs until there is a real Supabase session.
 * Once the device is back online the person can enter their password here to
 * sign in online without losing their place.
 *
 * A thin strip in normal document flow at the top of the content (rendered by
 * MainLayout), so it never covers form fields. Dismissal lasts for the browser
 * session. While the device has no network the layout's offline banner is the
 * one message shown, so this strip steps aside.
 */
export default function OfflineSessionBanner() {
  const { sessionMode, reauthenticate } = useAuth();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(readDismissed);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (sessionMode !== 'offline' || hidden || !online) return null;

  const dismiss = () => {
    rememberDismissed();
    setHidden(true);
  };

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
    <div className="border-b border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-900" role="status">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1">
        <CloudOff className="h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="font-semibold">Signed in offline.</span>{' '}
          <span className="hidden sm:inline">Your work is saved on this device; </span>
          sign in online to sync.
        </span>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 font-medium underline"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in online
          </button>
        )}
        <button type="button" onClick={dismiss} className="p-1 text-amber-700" title="Hide" aria-label="Hide offline sign-in notice">
          <X className="h-4 w-4" />
        </button>
        {open && (
          <form onSubmit={submit} className="flex w-full gap-2 pb-1">
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input flex-1 py-1.5 text-sm"
              placeholder="Your password"
              aria-label="Password"
              required
              autoFocus
            />
            <button type="submit" disabled={busy || !password} className="btn btn-primary px-3 py-1.5 text-sm">
              {busy ? '...' : 'Sign in'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setPassword(''); }} className="btn btn-secondary px-3 py-1.5 text-sm">
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
