import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { childLogin, getChildSession } from '../../../../services/childAuth';

export default function ChildLoginPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (getChildSession()) nav('/family/me', { replace: true });
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await childLogin(username, pin);
    setBusy(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(`Welcome, ${res.session.first_name}!`);
    nav('/family/me', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="text-pink-600" size={22}/>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Family · child sign in</h1>
            <p className="text-xs text-gray-500">Use the username and PIN your parent gave you.</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block text-sm">Username
            <input autoFocus className="mt-1 w-full border rounded-md px-2 py-2 text-sm" value={username} onChange={(e)=>setUsername(e.target.value)} autoComplete="username"/>
          </label>
          <label className="block text-sm">PIN
            <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={8} className="mt-1 w-full border rounded-md px-2 py-2 text-sm tracking-widest" value={pin} onChange={(e)=>setPin(e.target.value)} autoComplete="current-password"/>
          </label>
          <button disabled={busy} className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-md bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 disabled:opacity-60">
            <LogIn size={14}/> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="mt-4 text-center text-xs text-gray-500">
          Parent? <Link to="/login" className="text-pink-700 hover:underline">Sign in to AstroHEALTH</Link>
        </div>
      </div>
    </div>
  );
}
