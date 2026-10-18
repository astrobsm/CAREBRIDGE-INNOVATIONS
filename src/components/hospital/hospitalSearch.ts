// ============================================================
// Hospital search — matching and ordering for HospitalSelector
// ============================================================

import type { Hospital } from '../../types';

// "St. Daniel's", "st daniels" and "ST-DANIEL" all reduce to the same words, so a
// hospital is found however its name was punctuated when it was registered.
export function normaliseHospitalText(text: string | undefined): string {
  return (text || '')
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function byName(a: Hospital, b: Hospital): number {
  return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
}

// Every hospital, alphabetically, when nothing is typed; otherwise those whose name,
// address or city contain every typed word. No cap: a hospital past an arbitrary cut
// is indistinguishable, to the person registering, from one that was never saved.
export function searchHospitals(hospitals: Hospital[], query: string): Hospital[] {
  const words = normaliseHospitalText(query).split(' ').filter(Boolean);
  const matches = words.length === 0
    ? hospitals
    : hospitals.filter(h => {
        const haystack = normaliseHospitalText(`${h.name} ${h.address} ${h.city}`);
        return words.every(w => haystack.includes(w));
      });
  return [...matches].sort(byName);
}
