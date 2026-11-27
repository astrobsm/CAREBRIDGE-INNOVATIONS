/**
 * Small phone-first building blocks for the wound tool: 48 px touch targets,
 * full-width on a phone, nothing wider than the screen.
 */

import React, { useEffect, useState } from 'react';
import { getWoundStore } from '../toolDb';

export function Button({
  variant = 'primary', className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900',
    secondary: 'bg-white text-teal-800 border border-teal-700 hover:bg-teal-50',
    danger: 'bg-white text-red-700 border border-red-300 hover:bg-red-50',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
  }[variant];
  return (
    <button
      type="button"
      {...props}
      className={`min-h-[48px] px-4 rounded-xl text-base font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-800 mb-1">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-gray-500 mt-1">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  'w-full min-h-[48px] border border-gray-300 rounded-xl px-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600';

export function NumberInput({
  value, onChange, placeholder, step = '0.1', ariaLabel,
}: { value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string; step?: string; ariaLabel?: string }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  useEffect(() => {
    // Follow outside changes (a measurement arriving) without fighting typing.
    const n = text === '' ? null : Number(text);
    if (value == null ? text !== '' : n !== value) setText(value == null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min="0"
      aria-label={ariaLabel}
      value={text}
      placeholder={placeholder}
      onChange={e => {
        setText(e.target.value);
        const n = e.target.value === '' ? null : Number(e.target.value);
        onChange(n !== null && Number.isFinite(n) ? n : null);
      }}
      className={`${inputClass} tabular-nums`}
    />
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-[40px] px-3 rounded-full text-sm font-medium border capitalize ${
        active ? 'bg-teal-700 text-white border-teal-700' : 'bg-white text-gray-700 border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-200 p-4 ${className}`}>{children}</div>;
}

/** An object URL for a stored photo, revoked when no longer shown. */
export function usePhotoUrl(photoId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    setUrl(null);
    if (!photoId) return;
    getWoundStore().getPhoto(photoId).then(p => {
      if (revoked || !p) return;
      objectUrl = URL.createObjectURL(p.blob);
      setUrl(objectUrl);
    }).catch(() => { /* photo missing: show none */ });
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);
  return url;
}

export const fmtArea = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? '-' : `${v.toFixed(v < 10 ? 2 : 1)} cm²`;

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '-';
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
