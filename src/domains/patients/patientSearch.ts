/**
 * Patient list search. Every word typed must match one of: first, middle or
 * last name, hospital number, or phone. So "amaka ugwu" finds Amaka Chioma
 * Ugwu (each field used to be matched against the whole query, so a full
 * name matched nothing). Phone numbers match with or without spaces and in
 * local (0803…) or international (+234 803…) form.
 */

import type { Patient } from '../../types';

type Searchable = Pick<Patient, 'firstName' | 'lastName' | 'hospitalNumber' | 'phone'> & {
  middleName?: string;
  alternatePhone?: string;
};

const norm = (s?: string | null) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** A phone's national significant digits: strips +234 / 234 / 0 prefixes. */
function phoneCore(s?: string | null): string {
  const d = (s || '').replace(/\D/g, '');
  if (d.startsWith('234')) return d.slice(3);
  if (d.startsWith('0')) return d.slice(1);
  return d;
}

export function searchWords(query: string): string[] {
  return norm(query).split(/[\s,]+/).map(w => w.trim()).filter(Boolean);
}

export function matchesPatientSearch(p: Searchable, query: string): boolean {
  const words = searchWords(query);
  if (words.length === 0) return true;
  const texts = [p.firstName, p.middleName, p.lastName, p.hospitalNumber].map(norm);
  const phones = [p.phone, p.alternatePhone].map(phoneCore).filter(Boolean);
  const phonesRaw = [p.phone, p.alternatePhone].map(norm);
  return words.every(w => {
    if (texts.some(t => t.includes(w))) return true;
    if (phonesRaw.some(t => t.includes(w))) return true;
    const digits = w.replace(/\D/g, '');
    if (digits.length >= 3 && digits.length === w.replace(/[+\-()]/g, '').length) {
      const core = phoneCore(w);
      return phones.some(ph => ph.includes(core || digits));
    }
    return false;
  });
}
