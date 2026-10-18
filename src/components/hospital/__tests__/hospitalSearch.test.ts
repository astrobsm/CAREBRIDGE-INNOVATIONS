import { describe, it, expect } from 'vitest';
import { searchHospitals, normaliseHospitalText } from '../hospitalSearch';
import type { Hospital } from '../../../types';

function hospital(id: string, name: string, city = 'Enugu', address = '1 Road'): Hospital {
  return {
    id, name, city, address, state: 'Enugu', phone: '', email: '',
    type: 'secondary', isActive: true, createdAt: new Date(), updatedAt: new Date(),
  } as Hospital;
}

describe('searchHospitals', () => {
  it('lists every hospital when nothing is typed, not just the first ten', () => {
    const many = Array.from({ length: 25 }, (_, i) => hospital(`h${i}`, `Hospital ${String(i).padStart(2, '0')}`));
    const all = [...many, hospital('sd', 'St Daniel Hospital')];
    const results = searchHospitals(all, '');
    expect(results).toHaveLength(26);
    expect(results.map(h => h.id)).toContain('sd');
  });

  it('orders results alphabetically regardless of storage order', () => {
    const results = searchHospitals(
      [hospital('c', 'Zenith Clinic'), hospital('a', 'annunciation hospital'), hospital('b', 'Mercy')],
      '',
    );
    expect(results.map(h => h.name)).toEqual(['annunciation hospital', 'Mercy', 'Zenith Clinic']);
  });

  it('matches whatever punctuation the name was saved with', () => {
    const saved = [hospital('sd', "St. Daniel's Hospital"), hospital('o', 'Other Hospital')];
    for (const typed of ['st daniel', 'St Daniels', 'ST. DANIEL', 'daniel']) {
      expect(searchHospitals(saved, typed).map(h => h.id)).toEqual(['sd']);
    }
  });

  it('requires every typed word, in any field', () => {
    const saved = [hospital('sd', 'St Daniel Hospital', 'Nsukka'), hospital('x', 'St Mary Hospital', 'Enugu')];
    expect(searchHospitals(saved, 'st nsukka').map(h => h.id)).toEqual(['sd']);
    expect(searchHospitals(saved, 'daniel enugu')).toEqual([]);
  });

  it('copes with records missing optional text', () => {
    const partial = { ...hospital('p', 'St Daniel'), address: undefined, city: undefined } as unknown as Hospital;
    expect(searchHospitals([partial], 'daniel').map(h => h.id)).toEqual(['p']);
    expect(normaliseHospitalText(undefined)).toBe('');
  });
});
