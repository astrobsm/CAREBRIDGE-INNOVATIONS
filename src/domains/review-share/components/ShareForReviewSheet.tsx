/**
 * "Share for review": make a view-only link to this patient's full summary
 * for an invited doctor, who opens it without signing in.
 *
 * Form -> Generate (builds the summary on this device, uploads it) -> the
 * link with Copy / WhatsApp, and the PIN in large type to send separately.
 * The token and PIN are shown once here and kept nowhere.
 */

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Link2, Lock, MessageCircle, ShieldCheck, WifiOff, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { AsyncButton, Sheet, useActionStatus } from '../../../components/motion';
import { useAuth } from '../../../contexts/AuthContext';
import { whatsappNumber } from '../../patients/patientTimeline';
import { DEFAULT_EXPIRY, EXPIRY_OPTIONS, whatsAppLinkMessage, type ExpiryChoice } from '../shareCrypto';
import { createReviewShare, OFFLINE_MESSAGE, type CreatedShare, type ShareStage } from '../shareService';

export const CONSENT_LABEL = 'The patient has agreed to their record being shared with this doctor';
export const EVERYTHING_NOTICE = 'The full record is shared — every section, including clinical photos — as it is on this device now. The doctor can read it but not change it.';
export const PIN_HINT = 'Send the PIN separately — by a call, an SMS or another chat — never in the same message as the link.';

const STAGE_LABEL: Record<ShareStage, string> = {
  building: 'Building summary…',
  photos: 'Compressing photos…',
  uploading: 'Uploading…',
  finishing: 'Finishing…',
};

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine !== false));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

export function sharedByName(user: { firstName?: string; lastName?: string } | null | undefined): string {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (!name) return 'AstroHEALTH clinician';
  return /^(dr|prof)\.?\s/i.test(name) ? name : `Dr ${name}`;
}

interface Props {
  open: boolean;
  patientId: string;
  patientName: string;
  hospitalId?: string | null;
  onClose: () => void;
  /** Open "Manage shared links" for this patient. */
  onManage?: () => void;
}

export default function ShareForReviewSheet({ open, patientId, patientName, hospitalId, onClose, onManage }: Props) {
  const { user } = useAuth();
  const online = useOnline();
  const [inviteeName, setInviteeName] = useState('');
  const [inviteeNote, setInviteeNote] = useState('');
  const [inviteePhone, setInviteePhone] = useState('');
  const [expiry, setExpiry] = useState<ExpiryChoice>(DEFAULT_EXPIRY);
  const [withPin, setWithPin] = useState(true);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedShare | null>(null);
  const [copied, setCopied] = useState<'link' | 'pin' | null>(null);
  const status = useActionStatus();
  const firstRef = useRef<HTMLInputElement>(null);

  // A fresh form every time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setInviteeName(''); setInviteeNote(''); setInviteePhone(''); setExpiry(DEFAULT_EXPIRY); setWithPin(true);
    setConsent(false); setBusy(false); setStage(''); setError(null); setResult(null); setCopied(null);
  }, [open, patientId]);

  const generate = async () => {
    if (!consent || busy) return;
    if (!online) { setError(OFFLINE_MESSAGE); status.error(); return; }
    setBusy(true); setError(null);
    try {
      const created = await createReviewShare({
        patientId, hospitalId, inviteeName, inviteeNote, expiry, withPin, consent,
        sharedBy: { id: user?.id ?? 'unknown', name: sharedByName(user) },
      }, {}, (s, detail) => setStage(`${STAGE_LABEL[s]}${detail ? ` ${detail}` : ''}`));
      setResult(created);
      status.done();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      status.error();
    } finally {
      setBusy(false); setStage('');
    }
  };

  const copy = async (what: 'link' | 'pin', text: string) => {
    if (await copyText(text)) {
      setCopied(what);
      toast.success(what === 'link' ? 'Link copied' : 'PIN copied');
      setTimeout(() => setCopied(c => (c === what ? null : c)), 2000);
    } else {
      toast.error('Could not copy — select and copy it by hand');
    }
  };

  const wa = result ? whatsAppLinkMessage(result.link, {
    inviteeName, sharedBy: sharedByName(user), expiresAt: result.expiresAt, phoneDigits: whatsappNumber(inviteePhone),
  }) : '';
  const until = result?.expiresAt.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <Sheet open={open} onClose={onClose} labelledBy="share-review-title" size="lg" closeOnBackdrop={!busy} dismissible={!busy}
      hasUnsavedInput={!result && (consent || !!inviteeName || !!inviteeNote)} initialFocusRef={firstRef}>
      {close => (
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-3 px-4 pt-2 sm:pt-4 pb-2 border-b border-gray-100">
            <div className="min-w-0">
              <h2 id="share-review-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Link2 size={20} className="text-sky-600" aria-hidden="true" /> Share for review</h2>
              <p className="text-sm text-gray-500 truncate">{patientName}</p>
            </div>
            <button type="button" onClick={close} disabled={busy} className="p-2 -mr-2 rounded-full hover:bg-gray-100 disabled:opacity-40" aria-label="Close"><X size={20} /></button>
          </div>

          {!result ? (
            <form className="p-4 space-y-4" onSubmit={e => { e.preventDefault(); void generate(); }} data-testid="share-review-form">
              {!online && (
                <div role="alert" className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <WifiOff size={18} className="flex-none mt-0.5" aria-hidden="true" /> <span>You are offline. {OFFLINE_MESSAGE}</span>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Invited doctor <span className="text-gray-400 font-normal">(optional)</span></span>
                  <input ref={firstRef} className="input" value={inviteeName} onChange={e => setInviteeName(e.target.value)} placeholder="e.g. Dr Ada Okafor" maxLength={120} />
                </label>
                <label className="block">
                  <span className="label">Specialty or note <span className="text-gray-400 font-normal">(optional)</span></span>
                  <input className="input" value={inviteeNote} onChange={e => setInviteeNote(e.target.value)} placeholder="e.g. Dermatology, UNTH" maxLength={200} />
                </label>
              </div>
              <label className="block">
                <span className="label">Their WhatsApp number <span className="text-gray-400 font-normal">(optional, only to open the chat)</span></span>
                <input className="input" type="tel" inputMode="tel" value={inviteePhone} onChange={e => setInviteePhone(e.target.value)} placeholder="0803 123 4567" maxLength={30} />
              </label>

              <fieldset>
                <legend className="label">Link expires after</legend>
                <div className="grid grid-cols-3 rounded-xl bg-gray-100 p-1" role="radiogroup" aria-label="Link expires after">
                  {EXPIRY_OPTIONS.map(o => (
                    <button key={o.id} type="button" role="radio" aria-checked={expiry === o.id} onClick={() => setExpiry(o.id)}
                      data-testid={`expiry-${o.id}`}
                      className={`min-h-[44px] rounded-lg text-sm font-medium transition ${expiry === o.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">You can revoke it earlier from “Manage shared links”.</p>
              </fieldset>

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 cursor-pointer">
                <input type="checkbox" className="mt-1 h-5 w-5" checked={withPin} onChange={e => setWithPin(e.target.checked)} data-testid="pin-toggle" />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-gray-900"><Lock size={16} aria-hidden="true" /> Protect with a 4-digit PIN</span>
                  <span className="block text-sm text-gray-500">Recommended. The app makes the PIN; you send it separately from the link.</span>
                </span>
              </label>

              <p className="flex gap-2 rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
                <ShieldCheck size={18} className="flex-none mt-0.5" aria-hidden="true" /> <span>{EVERYTHING_NOTICE}</span>
              </p>

              <label className="flex items-start gap-3 rounded-xl border border-gray-300 p-3 cursor-pointer">
                <input type="checkbox" className="mt-1 h-5 w-5" checked={consent} onChange={e => setConsent(e.target.checked)} required data-testid="consent" />
                <span className="text-sm text-gray-900">
                  <span className="font-medium">{CONSENT_LABEL}.</span>
                  <span className="block text-gray-500">Required (Nigeria Data Protection Act 2023).</span>
                </span>
              </label>

              {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                <button type="button" onClick={close} disabled={busy} className="btn btn-secondary">Cancel</button>
                <AsyncButton type="submit" className="btn btn-primary" busy={busy} status={status.status} disabled={!consent || !online}
                  workingLabel={stage || 'Working…'} doneLabel="Link ready" errorLabel="Not shared" data-testid="generate-link">
                  <Link2 size={18} aria-hidden="true" /> Generate link
                </AsyncButton>
              </div>
            </form>
          ) : (
            <div className="p-4 space-y-4" data-testid="share-result">
              <div>
                <p className="label">Review link</p>
                <div className="flex gap-2">
                  <input className="input font-mono text-xs sm:text-sm" readOnly value={result.link} onFocus={e => e.currentTarget.select()} aria-label="Review link" data-testid="share-link" />
                  <button type="button" className="btn btn-secondary flex-none" onClick={() => void copy('link', result.link)}>
                    {copied === 'link' ? <Check size={18} /> : <Copy size={18} />} Copy
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Opens until {until}. View only.</p>
              </div>

              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn w-full justify-center bg-emerald-600 text-white hover:bg-emerald-700" data-testid="share-whatsapp">
                <MessageCircle size={18} aria-hidden="true" /> Send link on WhatsApp
              </a>
              <p className="-mt-2 text-xs text-gray-500 text-center">WhatsApp gets the link only, never the PIN.</p>

              {result.pin ? (
                <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 text-center">
                  <p className="text-sm font-medium text-indigo-900">PIN</p>
                  <p className="my-1 font-mono text-5xl font-bold tracking-[0.35em] text-indigo-950 pl-[0.35em]" data-testid="share-pin" aria-label={`PIN ${result.pin.split('').join(' ')}`}>{result.pin}</p>
                  <button type="button" className="btn btn-secondary mx-auto" onClick={() => void copy('pin', result.pin!)}>
                    {copied === 'pin' ? <Check size={18} /> : <Copy size={18} />} Copy PIN
                  </button>
                  <p className="mt-2 text-sm text-indigo-900">{PIN_HINT}</p>
                  <p className="mt-1 text-xs text-indigo-700">Shown only now. Five wrong tries lock the link for 15 minutes.</p>
                </div>
              ) : (
                <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">No PIN: anyone who has this link can open it until it expires.</p>
              )}

              <p className="text-sm text-gray-600">
                {result.photoTotal ? `${result.photoCount} of ${result.photoTotal} photo(s) included.` : 'No photos in the record.'}
                {result.photoNote ? ` ${result.photoNote}` : ''}
              </p>
              <p className="text-xs text-gray-500">The summary is frozen as of now. If the record changes, use “Refresh snapshot” in Manage shared links.</p>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                {onManage && <button type="button" className="btn btn-secondary" onClick={() => { onManage(); }}>Manage shared links</button>}
                <button type="button" className="btn btn-primary" onClick={close}>Done</button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
