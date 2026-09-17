import { describe, it, expect } from 'vitest';
import {
  templateForComplaint, templateOptions, isVisible, visibleFields,
  raisedFlags, completeness, generateNarrative, readTemplate,
} from '../services/templateEngine';
import { TEMPLATES, getTemplate } from '../data/encounterTemplates';
import { COMPLAINT_GROUPS, complaintLabel, searchComplaints, groupOf } from '../data/complaints';
import type { EncounterAnswers } from '../data/encounterModel';

// ── Taxonomy ────────────────────────────────────────────────────────────────

describe('complaint taxonomy', () => {
  it('has no duplicate complaint ids across groups', () => {
    const ids = COMPLAINT_GROUPS.flatMap(g => g.complaints.map(c => c.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers the subspecialty this practice actually runs', () => {
    const ids = COMPLAINT_GROUPS.flatMap(g => g.complaints.map(c => c.id));
    for (const expected of [
      'diabetic_foot_ulcer', 'burn', 'hand_injury', 'keloid',
      'breast_aesthetic', 'flap_review', 'suspected_malignancy',
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it('resolves a label and a group for every complaint', () => {
    for (const g of COMPLAINT_GROUPS) {
      for (const c of g.complaints) {
        expect(complaintLabel(c.id)).toBe(c.label);
        expect(groupOf(c.id)?.id).toBe(g.id);
      }
    }
  });

  it('searches by label and by hint', () => {
    expect(searchComplaints('diabetic').map(r => r.id)).toContain('diabetic_foot_ulcer');
    // 'venous' appears only in the hint for chronic leg ulcer.
    expect(searchComplaints('venous').map(r => r.id)).toContain('chronic_leg_ulcer');
  });
});

// ── Template matching ───────────────────────────────────────────────────────

describe('templateForComplaint', () => {
  it('matches each complaint to its intended template', () => {
    expect(templateForComplaint('diabetic_foot_ulcer').id).toBe('diabetic_foot');
    expect(templateForComplaint('hand_injury').id).toBe('trauma');
    expect(templateForComplaint('keloid').id).toBe('scar');
    expect(templateForComplaint('breast_aesthetic').id).toBe('aesthetic');
    expect(templateForComplaint('burn').id).toBe('burn');
    expect(templateForComplaint('necrotising_concern').id).toBe('soft_tissue_infection');
  });

  it('never leaves a complaint without a template', () => {
    const all = COMPLAINT_GROUPS.flatMap(g => g.complaints.map(c => c.id));
    for (const id of [...all, 'other', 'something_unmapped']) {
      expect(templateForComplaint(id)).toBeTruthy();
    }
  });

  it('falls back to the generic template rather than to free text', () => {
    expect(templateForComplaint('something_unmapped').id).toBe('generic');
  });

  it('offers the best match first but allows any other', () => {
    const options = templateOptions('burn');
    expect(options[0].id).toBe('burn');
    expect(options.length).toBe(TEMPLATES.length);
  });
});

// ── Conditional fields ──────────────────────────────────────────────────────

describe('conditional visibility', () => {
  const trauma = getTemplate('trauma')!;

  it('hides a dependent field until its trigger is answered', () => {
    const painScore = trauma.sections
      .flatMap(s => s.fields).find(f => f.id === 'pain_score')!;
    expect(isVisible(painScore, {})).toBe(false);
    expect(isVisible(painScore, { pain_present: 'none' })).toBe(false);
    expect(isVisible(painScore, { pain_present: 'severe' })).toBe(true);
  });

  it('excludes hidden fields from the visible set', () => {
    const hidden = visibleFields(trauma, {}).map(f => f.id);
    expect(hidden).not.toContain('pain_score');
    const shown = visibleFields(trauma, { pain_present: 'moderate' }).map(f => f.id);
    expect(shown).toContain('pain_score');
  });
});

// ── Red flags ───────────────────────────────────────────────────────────────

describe('raisedFlags', () => {
  it('raises a red flag on pain out of proportion', () => {
    const t = getTemplate('soft_tissue_infection')!;
    const flags = raisedFlags(t, { pain_present: 'out_of_proportion' });
    const red = flags.find(f => f.level === 'red');
    expect(red).toBeTruthy();
    expect(red!.reason).toMatch(/necrotising/i);
  });

  it('raises a red flag on absent pedal pulses in a diabetic foot', () => {
    const t = getTemplate('diabetic_foot')!;
    const flags = raisedFlags(t, { pulses: 'absent' });
    expect(flags.some(f => f.level === 'red' && /limb-threatening/i.test(f.reason))).toBe(true);
  });

  it('treats a yes to compartment syndrome concern as the flag itself', () => {
    const t = getTemplate('trauma')!;
    const flags = raisedFlags(t, { compartment: true });
    expect(flags.some(f => f.level === 'red' && /emergency/i.test(f.reason))).toBe(true);
  });

  it('does not flag a boolean answered no', () => {
    const t = getTemplate('trauma')!;
    expect(raisedFlags(t, { compartment: false })).toEqual([]);
  });

  it('raises nothing on a reassuring set of answers', () => {
    const t = getTemplate('diabetic_foot')!;
    const flags = raisedFlags(t, {
      pulses: 'both_present', monofilament: 'felt_all',
      infection: 'none', depth: 'superficial', gangrene: 'none',
      glycaemic_control: 'good',
    });
    expect(flags).toEqual([]);
  });

  it('sorts red above amber', () => {
    const t = getTemplate('diabetic_foot')!;
    const flags = raisedFlags(t, {
      pulses: 'absent',               // red
      glycaemic_control: 'poor',      // amber
      monofilament: 'absent',         // amber
    });
    expect(flags.length).toBeGreaterThan(2);
    expect(flags[0].level).toBe('red');
    const levels = flags.map(f => f.level);
    expect(levels.indexOf('red')).toBeLessThan(levels.indexOf('amber'));
  });

  it('ignores flags on fields that are not visible', () => {
    const t = getTemplate('trauma')!;
    // pain_character's night_pain option is a red flag, but the field is hidden
    // until pain is recorded as present.
    const flags = raisedFlags(t, { pain_character: 'night_pain' });
    expect(flags).toEqual([]);
  });

  it('gives every flag a reason worth reading', () => {
    for (const t of TEMPLATES) {
      for (const f of t.sections.flatMap(s => s.fields)) {
        for (const o of f.options ?? []) {
          if (!o.flag) continue;
          expect(o.flagReason ?? '').not.toBe('');
          expect((o.flagReason ?? '').length).toBeGreaterThan(20);
        }
      }
    }
  });
});

// ── Completeness ────────────────────────────────────────────────────────────

describe('completeness', () => {
  const t = getTemplate('diabetic_foot')!;

  it('counts only the fields marked important', () => {
    const all = t.sections.flatMap(s => s.fields);
    const important = all.filter(f => f.important);
    expect(completeness(t, {}).total).toBe(important.length);
    expect(important.length).toBeLessThan(all.length);
  });

  it('is zero with nothing answered and rises as fields are filled', () => {
    expect(completeness(t, {}).percent).toBe(0);
    const partial = completeness(t, { duration: 'over_3m', pulses: 'both_present' });
    expect(partial.percent).toBeGreaterThan(0);
    expect(partial.percent).toBeLessThan(100);
  });

  it('names what is still missing', () => {
    const c = completeness(t, {});
    expect(c.missing.length).toBe(c.total);
    expect(c.missing.join(' ')).toMatch(/monofilament/i);
  });
});

// ── Narrative ───────────────────────────────────────────────────────────────

describe('generateNarrative', () => {
  const t = getTemplate('diabetic_foot')!;

  const answers: EncounterAnswers = {
    duration: '6w_3m',
    glycaemic_control: 'poor',
    monofilament: 'absent',
    pulses: 'absent',
    site: 'heel',
    depth: 'bone_joint',
    infection: 'moderate',
    gangrene: 'none',
    systemic: ['fever', 'poor_glycaemic'],
  };

  it('states rather than asks in the generated prose', () => {
    const n = generateNarrative(t, 'diabetic_foot_ulcer', answers);
    // The form asks "How long has this been present?"; the note should not.
    expect(n.history).not.toMatch(/\?:/);
    expect(n.history).toMatch(/Duration: 6 weeks to 3 months/);
  });

  it('puts the complaint and duration in the headline', () => {
    const n = generateNarrative(t, 'diabetic_foot_ulcer', answers);
    expect(n.chiefComplaint).toMatch(/Diabetic foot ulcer/);
    expect(n.chiefComplaint).toMatch(/6 weeks to 3 months/i);
  });

  it('writes prose, not a data dump', () => {
    const n = generateNarrative(t, 'diabetic_foot_ulcer', answers);
    expect(n.history).toMatch(/Neuropathy:/);
    expect(n.history).toMatch(/not felt/i);
    // Multiselects read as a list a person would write.
    expect(n.history + n.examination).toMatch(/fever or rigors and sudden loss of glycaemic control/i);
  });

  it('separates examination from history', () => {
    const n = generateNarrative(t, 'diabetic_foot_ulcer', answers);
    expect(n.examination).toMatch(/Ulcer and infection/);
    expect(n.history).not.toMatch(/Ulcer and infection/);
  });

  it('produces nothing for a template with no answers', () => {
    const n = generateNarrative(t, 'diabetic_foot_ulcer', {});
    expect(n.history).toBe('');
    expect(n.examination).toBe('');
    expect(n.chiefComplaint).toBe('Diabetic foot ulcer');
  });

  it('omits a boolean answered no rather than writing a negative', () => {
    const trauma = getTemplate('trauma')!;
    const withNo = generateNarrative(trauma, 'hand_injury', { compartment: false });
    const withYes = generateNarrative(trauma, 'hand_injury', { compartment: true });
    expect(withNo.history + withNo.examination).not.toMatch(/compartment/i);
    expect(withYes.history + withYes.examination).toMatch(/compartment/i);
  });

  it('uses the free text when the complaint was Other', () => {
    const generic = getTemplate('generic')!;
    const n = generateNarrative(generic, 'other', {}, { complaintOther: 'Chronic sinus discharge' });
    expect(n.chiefComplaint).toBe('Chronic sinus discharge');
  });

  it('includes an allowOther addition alongside the chosen option', () => {
    const trauma = getTemplate('trauma')!;
    const n = generateNarrative(trauma, 'traumatic_wound',
      { mechanism: 'sharp' }, { otherText: { mechanism: 'broken bottle' } });
    expect(n.history).toMatch(/broken bottle/);
  });

  it('renders numbers with their unit and scales out of their maximum', () => {
    const burn = getTemplate('burn')!;
    const n = generateNarrative(burn, 'burn', { tbsa: 18 });
    expect(n.history + n.examination).toMatch(/18 %|18%/);

    const trauma = getTemplate('trauma')!;
    const p = generateNarrative(trauma, 'hand_injury',
      { pain_present: 'severe', pain_score: 8 });
    expect(p.history + p.examination).toMatch(/8\/10/);
  });
});

// ── End to end ──────────────────────────────────────────────────────────────

describe('readTemplate', () => {
  it('returns the template, flags, completeness and narrative together', () => {
    const r = readTemplate('trauma', 'hand_injury', {
      mechanism: 'high_pressure',
      time_since: 'under_6h',
      contamination: 'clean',
      tetanus: 'up_to_date',
      structures: ['skin_only'],
      neurovascular: 'intact',
    });

    expect(r.template.id).toBe('trauma');
    expect(r.flags.some(f => f.level === 'red' && /injection/i.test(f.reason))).toBe(true);
    expect(r.completeness.percent).toBeGreaterThan(50);
    expect(r.narrative.chiefComplaint).toMatch(/Hand injury/);
  });

  it('recovers when handed a template id that does not exist', () => {
    const r = readTemplate('no_such_template', 'diabetic_foot_ulcer', {});
    expect(r.template.id).toBe('diabetic_foot');
  });

  it('surfaces the handoffs a history should defer to', () => {
    const r = readTemplate('diabetic_foot', 'diabetic_foot_ulcer', {});
    expect(r.handoffs.some(h => h.route === '/vascular')).toBe(true);
  });
});

// ── Template hygiene ────────────────────────────────────────────────────────

describe('every template', () => {
  it('has a unique id', () => {
    const ids = TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique field ids within itself', () => {
    for (const t of TEMPLATES) {
      const ids = t.sections.flatMap(s => s.fields).map(f => f.id);
      expect(new Set(ids).size, `${t.id} has duplicate field ids`).toBe(ids.length);
    }
  });

  it('gives every select field at least two options', () => {
    for (const t of TEMPLATES) {
      for (const f of t.sections.flatMap(s => s.fields)) {
        if (f.kind === 'select' || f.kind === 'multiselect') {
          expect((f.options ?? []).length, `${t.id}.${f.id}`).toBeGreaterThan(1);
        }
      }
    }
  });

  it('points every conditional field at a field that exists', () => {
    for (const t of TEMPLATES) {
      const ids = new Set(t.sections.flatMap(s => s.fields).map(f => f.id));
      for (const f of t.sections.flatMap(s => s.fields)) {
        if (f.showWhen) {
          expect(ids.has(f.showWhen.field), `${t.id}.${f.id} -> ${f.showWhen.field}`).toBe(true);
        }
      }
    }
  });

  it('stays short enough to finish in a clinic', () => {
    for (const t of TEMPLATES) {
      const important = t.sections.flatMap(s => s.fields).filter(f => f.important).length;
      expect(important, `${t.id} asks too many key fields`).toBeLessThanOrEqual(10);
    }
  });
});
