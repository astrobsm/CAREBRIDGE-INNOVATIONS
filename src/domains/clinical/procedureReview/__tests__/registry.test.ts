/**
 * Registry invariants — every module, current and future, is held to the
 * contract here. A phase-2 module that breaks one of these fails CI.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { PROCEDURE_MODULES, getModule, modulesByGroup } from '../registry';
import { composeTemplate } from '../engine';
import { normaliseLine, planLines } from '../planBuilder';
import { surgicalProcedures } from '../../../../data/surgicalFees';
import { procedureEducationDatabase } from '../../../../data/patientEducation';
import { educationConditionById } from '../../../surgery/utils/surgicalDocumentGenerator';
import { CORE_SECTIONS } from '../core';
import { planFor, provocativeAnswers } from './fixtures';

const DIR = join(process.cwd(), 'src/domains/clinical/procedureReview');

describe('the registry', () => {
  it('has unique module ids in snake_case', () => {
    const ids = PROCEDURE_MODULES.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it('contains the two reference modules', () => {
    expect(getModule('wound_care_review')).toBeDefined();
    expect(getModule('skin_graft')).toBeDefined();
    const preOp = modulesByGroup('pre_op').flatMap(g => g.modules).map(m => m.id);
    expect(preOp).toContain('skin_graft');
    expect(preOp).not.toContain('wound_care_review');
  });

  it('imports every group index file under procedures/', () => {
    const src = readFileSync(join(DIR, 'registry.ts'), 'utf8');
    for (const g of readdirSync(join(DIR, 'procedures')).filter(d => statSync(join(DIR, 'procedures', d)).isDirectory())) {
      expect(src, `registry.ts must import procedures/${g}`).toMatch(new RegExp(`from './procedures/${g}'`));
    }
  });

  it('core field ids are core.* and unique across all core sections', () => {
    const ids = CORE_SECTIONS.flatMap(c => c.section.fields.map(f => f.id));
    for (const id of ids) expect(id.startsWith('core.')).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe.each(PROCEDURE_MODULES.map(m => [m.id, m] as const))('module %s', (_id, m) => {
  it('declares a name, summary, group, phases and basis', () => {
    expect(m.name.length).toBeGreaterThan(3);
    expect(m.summary.length).toBeGreaterThan(10);
    expect(m.phases.length).toBeGreaterThan(0);
    expect(m.basis.length).toBeGreaterThan(0);
  });

  it('namespaces its own field ids and keeps them unique within each phase', () => {
    for (const phase of m.phases) {
      const own = (m.sections[phase] ?? []).flatMap(s => s.fields.map(f => f.id));
      for (const id of own) expect(id.startsWith(`${m.id}.`), `${id} must start with ${m.id}.`).toBe(true);
      const fields = composeTemplate(m, phase).sections.flatMap(s => s.fields);
      const all = fields.map(f => f.id);
      expect(new Set(all).size).toBe(all.length);
      for (const f of fields) {
        if (f.showWhen) expect(all, `${f.id} depends on a field that is not in the ${phase} template`).toContain(f.showWhen.field);
      }
    }
  });

  it('gives every phase sections or says it relies on the core', () => {
    for (const phase of m.phases) {
      expect((m.sections[phase]?.length ?? 0) > 0 || !!m.coreOnlyPhases?.includes(phase), `${phase} has no sections`).toBe(true);
    }
    for (const p of Object.keys(m.sections)) expect(m.phases).toContain(p);
  });

  it('links only to existing catalogue entries', () => {
    for (const id of m.catalog.feeIds ?? []) expect(surgicalProcedures.some(p => p.id === id), `fee id ${id}`).toBe(true);
    if (m.catalog.educationId) {
      expect(procedureEducationDatabase.some(p => p.procedureId === m.catalog.educationId), `education id ${m.catalog.educationId}`).toBe(true);
    } else {
      expect(m.catalog.educationNote, 'educationId null needs an educationNote').toBeTruthy();
    }
    for (const id of m.catalog.patientEducationIds ?? []) expect(educationConditionById(id), `patient education ${id}`).not.toBeNull();
  });

  it('keeps consent, follow-up, carry-forward and handoffs consistent with its phases', () => {
    for (const p of m.consent?.phases ?? []) expect(m.phases).toContain(p);
    for (const p of Object.keys(m.followUp ?? {})) expect(m.phases).toContain(p);
    const everyField = m.phases.flatMap(p => composeTemplate(m, p).sections.flatMap(s => s.fields.map(f => f.id)));
    for (const id of m.carryForward ?? []) expect(everyField).toContain(id);
    for (const h of m.handoffs ?? []) {
      for (const p of h.phases ?? []) expect(m.phases).toContain(p);
      if (h.moduleId) {
        const target = getModule(h.moduleId);
        expect(target, `handoff to unknown module ${h.moduleId}`).toBeDefined();
        expect(h.moduleId).not.toBe(m.id);
        for (const p of h.phases ?? m.phases) expect(target!.phases, `${h.moduleId} has no ${h.targetPhase ?? p}`).toContain(h.targetPhase ?? p);
      } else {
        expect(h.route?.startsWith('/'), `${h.label} needs a route or a moduleId`).toBe(true);
      }
    }
    if (m.consent) {
      expect(m.consent.alternatives.length).toBeGreaterThan(0);
      expect(m.consent.riskOfNotTreating.length).toBeGreaterThan(20);
      expect(m.consent.risks.length).toBeGreaterThan(0);
    }
  });

  it.each(m.phases)('builds a %s plan where every line has a why and no line appears twice', phase => {
    for (const answers of [{}, provocativeAnswers(m, phase)]) {
      const out = planFor(m, phase, answers);
      const lines = planLines(out.plan);
      expect(lines.length).toBeGreaterThan(0);
      for (const { where, line } of lines) {
        expect(line.text.trim().length, `empty line in ${where}`).toBeGreaterThan(0);
        expect((line.why ?? '').trim().length, `"${line.text}" in ${where} has no why`).toBeGreaterThan(0);
      }
      const keys = lines.map(l => normaliseLine(l.line.text));
      expect(new Set(keys).size, 'duplicate plan lines').toBe(keys.length);
      expect(out.plan.problems[0].goals.length).toBeGreaterThan(0);
    }
  });
});
