import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  PRACTICE_MENU, visibleMenu, filterMenu, activeHref, allMenuHrefs, canSeeFamily,
  type MenuContext,
} from '../menuModel';

const all = () => true;
const none = () => false;
const ctx = (role: string, perms: string[] | '*' = '*', multiSite = false): MenuContext => ({
  role,
  hasPermission: perms === '*' ? all : (p: string) => perms.includes(p),
  multiSite,
});
const groupIds = (c: MenuContext) => visibleMenu(c).map(g => g.id);
const hrefs = (c: MenuContext) => allMenuHrefs(visibleMenu(c));

describe('practice menu: super_admin', () => {
  // super_admin passes every permission even if hasPermission says no.
  const owner: MenuContext = { role: 'super_admin', hasPermission: none, multiSite: false };

  it('follows the slim practice groups, with More collapsed, not everything flat', () => {
    expect(groupIds(owner)).toEqual([
      'today', 'patients', 'clinic', 'theatre', 'results', 'education', 'tools', 'money', 'settings', 'more', 'apps',
    ]);
    const more = PRACTICE_MENU.find(g => g.id === 'more')!;
    expect(more.defaultCollapsed).toBe(true);
  });

  it('keeps top-level entries to a slim set', () => {
    const top = visibleMenu(owner).filter(g => !g.bottom && !g.defaultCollapsed).flatMap(g => g.items);
    expect(top.length).toBeLessThanOrEqual(26);
  });

  it('hides multi-hospital modules unless the setting is on', () => {
    const multi = ['/hospitals', '/user-activity', '/external-review', '/billing/payroll', '/mdt',
      '/tumour-board', '/pre-surgical-conference', '/blood-transfusion', '/referrals', '/pharmacy', '/communication/chat'];
    const off = hrefs(owner);
    for (const h of multi) expect(off, h).not.toContain(h);
    const on = hrefs({ ...owner, multiSite: true });
    for (const h of multi) expect(on, h).toContain(h);
    expect(groupIds({ ...owner, multiSite: true })).toContain('network');
  });

  it('puts Family and Finance under Other apps at the bottom, not in the clinical menu', () => {
    const groups = visibleMenu(owner);
    const apps = groups.find(g => g.id === 'apps')!;
    expect(apps.bottom).toBe(true);
    expect(apps.items.map(i => i.href)).toEqual(['/finance', '/family']);
    for (const g of groups.filter(g => g.id !== 'apps')) {
      expect(g.items.map(i => i.href)).not.toContain('/finance');
      expect(g.items.map(i => i.href)).not.toContain('/family');
    }
  });

  it('offers Practice admin from Settings', () => {
    expect(visibleMenu(owner).find(g => g.id === 'settings')!.items.map(i => i.href)).toContain('/practice-admin');
  });
});

describe('practice menu: other roles keep their filtering', () => {
  it('Family is the owner only: no other role sees it', () => {
    for (const role of ['hospital_admin', 'surgeon', 'doctor', 'nurse', 'receptionist', 'accountant']) {
      expect(hrefs(ctx(role)), role).not.toContain('/family');
      expect(canSeeFamily(role)).toBe(false);
    }
    expect(canSeeFamily('super_admin')).toBe(true);
    expect(canSeeFamily(undefined)).toBe(false);
  });

  it('Finance stays admins only', () => {
    expect(hrefs(ctx('hospital_admin'))).toContain('/finance');
    expect(hrefs(ctx('surgeon'))).not.toContain('/finance');
  });

  it('permission-gated items follow hasPermission', () => {
    const nurse = ctx('nurse', ['view_patients', 'create_encounters', 'manage_wounds']);
    const h = hrefs(nurse);
    expect(h).toContain('/patients');
    expect(h).toContain('/wound-monitor');
    expect(h).not.toContain('/billing');
    expect(h).not.toContain('/surgery/workflow');
    expect(h).not.toContain('/users');
    expect(h).not.toContain('/patients/duplicates');
  });

  it('a role with no permissions still gets the open items only', () => {
    const h = hrefs(ctx('driver', []));
    expect(h).toEqual(expect.arrayContaining(['/', '/patient-education', '/calculators', '/settings', '/shopping-checklist']));
    expect(h).not.toContain('/patients');
  });

  it('drops a group whose items are all hidden', () => {
    expect(groupIds(ctx('driver', []))).not.toContain('theatre');
  });
});

describe('menu filter box', () => {
  const owner: MenuContext = { role: 'super_admin', hasPermission: all, multiSite: false };
  const menu = visibleMenu(owner);

  it('matches names, keywords and children; every word must match', () => {
    const names = (q: string) => filterMenu(menu, q).flatMap(g => g.items.flatMap(i => [i.name, ...(i.children ?? []).map(c => c.name)]));
    expect(names('invoice')).toContain('Billing');
    expect(names('npwt')).toEqual(['Wound & specialty monitors', 'NPWT']);
    expect(names('keloid')).toEqual(expect.arrayContaining(['Scar & keloid monitor', 'Keloid treatment plans']));
    expect(names('new patient')).toContain('New patient');
    expect(names('zzz')).toEqual([]);
  });

  it('an empty query changes nothing', () => {
    expect(filterMenu(menu, '  ')).toBe(menu);
  });
});

describe('active item', () => {
  const hs = allMenuHrefs();
  it('picks the most specific href', () => {
    expect(activeHref('/patients/new', hs)).toBe('/patients/new');
    expect(activeHref('/patients/abc', hs)).toBe('/patients');
    expect(activeHref('/surgery/workflow/p1', hs)).toBe('/surgery/workflow');
    expect(activeHref('/', hs)).toBe('/');
    expect(activeHref('/nowhere', hs)).toBeNull();
  });
});

describe('every menu link is a real route', () => {
  const app = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');
  it('each href path appears in App.tsx', () => {
    for (const h of new Set(allMenuHrefs())) {
      const path = h.split('?')[0];
      if (path === '/') continue;
      const segs = path.split('/').filter(Boolean);
      const last = segs[segs.length - 1];
      // Nested routes declare only their own segment; check the last one.
      const declared = app.includes(`path="${segs.join('/')}"`) || app.includes(`path="${last}"`);
      expect(declared, h).toBe(true);
    }
  });

  it('nothing was dropped: every module the old menu listed is still in the model', () => {
    const was = ['/appointments', '/patients', '/adt', '/ward-rounds', '/treatment-planning', '/surgery/workflow',
      '/surgery', '/surgery/post-op-notes', '/pre-surgical-conference', '/post-op-care', '/mdt', '/tumour-board',
      '/blood-transfusion', '/referrals', '/wound-monitor', '/clinician-assistant', '/skin-graft', '/scar-monitor',
      '/burns', '/limb-salvage', '/vascular', '/npwt', '/keloid-care', '/lymphedema', '/sti-protocol',
      '/substance-use', '/medication-chart', '/investigations', '/pharmacy', '/nutrition', '/billing',
      '/billing/surgical-estimate', '/shopping-checklist', '/billing/payroll', '/communication/chat',
      '/communication/video', '/calculators', '/patient-education', '/external-review', '/hospitals', '/users',
      '/patients/duplicates', '/user-activity', '/settings', '/finance', '/family'];
    const now = allMenuHrefs();
    for (const h of was) expect(now, h).toContain(h);
  });
});
