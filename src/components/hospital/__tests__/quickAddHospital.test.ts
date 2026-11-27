import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Hospital } from '../../../types';
import { buildQuickAddHospital, quickAddHospital, hospitalPlace } from '../quickAddHospital';

const NOW = new Date(2026, 10, 26, 10, 0);

function deps(over: Partial<Parameters<typeof quickAddHospital>[1]> = {}) {
  const calls: string[] = [];
  const d = {
    newId: () => 'h-new',
    save: vi.fn(async (h: Hospital) => { calls.push('save:' + h.id); }),
    sync: vi.fn(async (h: Hospital) => { calls.push('sync:' + h.id); }),
    select: vi.fn((h: Hospital) => { calls.push('select:' + h.id); }),
    ...over,
  };
  return { d, calls };
}

describe('buildQuickAddHospital', () => {
  it('needs only a name; the rest is trimmed and blank, not "Not specified"', () => {
    const r = buildQuickAddHospital({ name: '  Astro   Clinic ', address: '', city: ' Enugu ' }, 'h1', NOW);
    expect(r).toEqual({ ok: true, hospital: expect.objectContaining({
      id: 'h1', name: 'Astro Clinic', address: '', city: 'Enugu', state: '', phone: '', type: 'secondary', isActive: true, createdAt: NOW,
    }) });
  });
  it('refuses a blank name', () => {
    expect(buildQuickAddHospital({ name: '   ' }, 'h1')).toEqual({ ok: false, error: 'Enter the hospital name' });
  });
});

describe('quickAddHospital: create, sync, select', () => {
  it('saves on the device, pushes to the cloud, then selects it, in that order', async () => {
    const { d, calls } = deps();
    const r = await quickAddHospital({ name: 'Astro Clinic', address: '5 Ogui Road' }, d);
    expect(r).toMatchObject({ ok: true, reused: false, synced: true, hospital: { id: 'h-new', name: 'Astro Clinic' } });
    expect(calls).toEqual(['save:h-new', 'sync:h-new', 'select:h-new']);
  });

  it('a cloud failure still selects the hospital (it syncs later)', async () => {
    const { d } = deps({ sync: vi.fn(async () => { throw new Error('offline'); }) });
    const r = await quickAddHospital({ name: 'Astro Clinic' }, d);
    expect(r).toMatchObject({ ok: true, synced: false });
    expect(d.select).toHaveBeenCalledOnce();
  });

  it('a device save failure selects nothing and reports it', async () => {
    const { d } = deps({ save: vi.fn(async () => { throw new Error('quota'); }) });
    const r = await quickAddHospital({ name: 'Astro Clinic' }, d);
    expect(r).toEqual({ ok: false, error: 'Could not save the hospital on this device: quota' });
    expect(d.select).not.toHaveBeenCalled();
    expect(d.sync).not.toHaveBeenCalled();
  });

  it('no name: nothing saved or selected', async () => {
    const { d } = deps();
    expect((await quickAddHospital({ name: '' }, d)).ok).toBe(false);
    expect(d.save).not.toHaveBeenCalled();
    expect(d.select).not.toHaveBeenCalled();
  });

  it('reuses an existing hospital of the same name instead of duplicating it', async () => {
    const existing = [{ id: 'h-old', name: 'Astro  Clinic', isActive: true } as Hospital];
    const { d } = deps({ existing });
    const r = await quickAddHospital({ name: 'astro clinic' }, d);
    expect(r).toMatchObject({ ok: true, reused: true, hospital: { id: 'h-old' } });
    expect(d.save).not.toHaveBeenCalled();
    expect(d.select).toHaveBeenCalledWith(existing[0]);
  });
});

describe('hospitalPlace', () => {
  it('joins city and state without empty commas or placeholders', () => {
    expect(hospitalPlace({ city: 'Enugu', state: '', address: '' })).toBe('Enugu');
    expect(hospitalPlace({ city: 'Not specified', state: 'Not specified', address: '' })).toBe('');
  });
});

describe('the Quick Add panel in the selector', () => {
  const src = readFileSync(join(process.cwd(), 'src/components/hospital/HospitalSelector.tsx'), 'utf8')
    .replace(/\/\/[^\n]*/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  it('is not a nested <form> (its submit used to submit the patient registration too)', () => {
    expect(src).not.toMatch(/<form\b/);
    expect(src).toMatch(/e\.key === 'Enter'[\s\S]{0,160}e\.preventDefault\(\);\s*e\.stopPropagation\(\)/);
  });
  it('opens as a fixed sheet outside the clipped dropdown, and syncs just the new row', () => {
    // The shared Sheet portals to <body>, so the dropdown's clipping cannot reach it; it keeps the z-70 layer.
    expect(src).toMatch(/<Sheet [^>]*zClassName="z-\[70\]"/);
    expect(src).toMatch(/syncRecord\('hospitals'/);
    expect(src).not.toMatch(/fullSync\(/);
    // The sheet is rendered after the dropdown's AnimatePresence closes, not inside max-h-80.
    expect(src.lastIndexOf('<QuickAddHospitalForm')).toBeGreaterThan(src.indexOf('max-h-80'));
    expect(src).toMatch(/select: onSave/);
  });
});
