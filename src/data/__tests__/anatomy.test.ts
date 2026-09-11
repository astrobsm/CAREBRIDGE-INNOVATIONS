/**
 * These lists exist so the same wound is written the same way at every visit.
 * "Left heel", "L heel" and "lt. heel" are one site to a clinician and three to
 * a database, and a registry that cannot group them cannot count anything.
 *
 * The properties worth guarding are structural: no duplicates to split a count
 * two ways, no laterality baked into a site where it would contradict the
 * separate side field, and a reliable way to tell a listed value from something
 * a clinician typed — which is what decides whether reopening a wound shows
 * what was written or silently resets it.
 */

import { describe, it, expect } from 'vitest';
import {
  ANATOMICAL_SITES,
  WOUND_ETIOLOGIES,
  allAnatomicalSites,
  allEtiologies,
  isListedOption,
  OTHER_OPTION,
  type OptionGroup,
} from '../anatomy';

const groupsUnder = (groups: OptionGroup[]) => groups.map(g => g.label);

describe('option lists', () => {
  const lists: Array<[string, OptionGroup[], () => string[]]> = [
    ['anatomical sites', ANATOMICAL_SITES, allAnatomicalSites],
    ['wound aetiologies', WOUND_ETIOLOGIES, allEtiologies],
  ];

  for (const [name, groups, flatten] of lists) {
    describe(name, () => {
      it('has no duplicate options, which would split a count in two', () => {
        const all = flatten();
        const seen = new Set<string>();
        const duplicates = all.filter(o => {
          const key = o.toLowerCase();
          if (seen.has(key)) return true;
          seen.add(key);
          return false;
        });
        expect(duplicates).toEqual([]);
      });

      it('has no duplicate group labels', () => {
        const labels = groupsUnder(groups);
        expect(new Set(labels).size).toBe(labels.length);
      });

      it('has no empty groups', () => {
        for (const g of groups) expect(g.options.length).toBeGreaterThan(0);
      });

      it('has no blank or untrimmed entries', () => {
        for (const o of flatten()) {
          expect(o.trim()).toBe(o);
          expect(o.length).toBeGreaterThan(1);
        }
      });

      it('does not contain its own Other sentinel', () => {
        // `Other` is appended by the control, not stored in the data — having
        // it in both would render two identical options.
        expect(flatten()).not.toContain(OTHER_OPTION);
      });

      it('is comprehensive enough to be worth using', () => {
        expect(flatten().length).toBeGreaterThan(40);
        expect(groups.length).toBeGreaterThanOrEqual(5);
      });
    });
  }
});

describe('anatomical sites', () => {
  it('does not bake laterality into the site', () => {
    // Side is a separate field. A site of "Left heel" plus a side of "Right"
    // is a record that contradicts itself, so sites stay neutral.
    for (const site of allAnatomicalSites()) {
      expect(site).not.toMatch(/\b(left|right)\b/i);
    }
  });

  it('covers the regions a plastic surgery unit actually works on', () => {
    const labels = groupsUnder(ANATOMICAL_SITES).join(' ').toLowerCase();
    for (const region of ['head', 'back', 'perineum', 'hand', 'foot']) {
      expect(labels).toContain(region);
    }
  });

  it('breaks the foot down finely, since that is where the ulcers are', () => {
    const sites = allAnatomicalSites().join(' ').toLowerCase();
    for (const site of ['heel', 'plantar', 'metatarsal head', 'hallux', 'malleolus']) {
      expect(sites).toContain(site);
    }
  });

  it('includes pressure areas by name', () => {
    const sites = allAnatomicalSites().join(' ').toLowerCase();
    for (const site of ['sacrum', 'ischial tuberosity', 'greater trochanter', 'occiput', 'heel', 'scapular']) {
      expect(sites).toContain(site);
    }
  });

  it('includes donor and amputation sites, which are wounds too', () => {
    const sites = allAnatomicalSites().join(' ').toLowerCase();
    expect(sites).toContain('graft donor site');
    expect(sites).toContain('amputation stump');
  });
});

describe('wound aetiologies', () => {
  it('covers the mechanisms seen in this setting', () => {
    const causes = allEtiologies().join(' ').toLowerCase();
    for (const cause of [
      'road traffic', 'gunshot', 'machete', 'snake bite',
      'flame burn', 'scald', 'chemical burn',
      'prolonged pressure', 'venous insufficiency', 'sickle cell',
      'diabetic foot', 'necrotising fasciitis', "fournier", 'buruli',
      'tropical ulcer', 'traditional or native treatment',
      "marjolin", 'graft donor site',
    ]) {
      expect(causes, `missing: ${cause}`).toContain(cause);
    }
  });

  it('distinguishes the diabetic foot subtypes, which are managed differently', () => {
    const diabetic = allEtiologies().filter(e => /diabetic foot/i.test(e));
    expect(diabetic.length).toBeGreaterThanOrEqual(3);
  });
});

describe('isListedOption', () => {
  it('recognises a listed value', () => {
    expect(isListedOption('Sacrum', ANATOMICAL_SITES)).toBe(true);
    expect(isListedOption('Flame burn', WOUND_ETIOLOGIES)).toBe(true);
  });

  it('rejects something a clinician typed', () => {
    // This is what makes an unlisted value reopen as free text rather than
    // silently resetting to nothing.
    expect(isListedOption('Left heel and midfoot', ANATOMICAL_SITES)).toBe(false);
    expect(isListedOption('Struck by falling roofing sheet', WOUND_ETIOLOGIES)).toBe(false);
  });

  it('treats empty and undefined as unlisted without throwing', () => {
    expect(isListedOption(undefined, ANATOMICAL_SITES)).toBe(false);
    expect(isListedOption('', ANATOMICAL_SITES)).toBe(false);
  });

  it('is exact, not fuzzy', () => {
    // Near-misses must not match, or a typed value would be shown as if it had
    // been chosen from the list.
    expect(isListedOption('sacrum', ANATOMICAL_SITES)).toBe(false);
    expect(isListedOption('Sacrum ', ANATOMICAL_SITES)).toBe(false);
  });
});
