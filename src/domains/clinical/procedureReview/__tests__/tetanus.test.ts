/** Core tetanus: asked once, opted in by trauma / burn / wound modules, Green Book plan. */
import { describe, it, expect } from 'vitest';
import { composeTemplate } from '../engine';
import { planLines } from '../planBuilder';
import { isVisible } from '../../services/templateEngine';
import { PROCEDURE_MODULES, getModule } from '../registry';
import { adult, planFor } from './fixtures';
import type { EncounterAnswers } from '../../data/encounterModel';

const mod = (id: string) => getModule(id)!;
const tetanusLines = (id: string, phase: Parameters<typeof planFor>[1], a: EncounterAnswers, p = adult()) =>
  planLines(planFor(mod(id), phase, a, p).plan).map(l => l.line).filter(l => /tetanus/i.test(l.text));

describe('core tetanus', () => {
  it('no module asks its own tetanus question any more', () => {
    for (const m of PROCEDURE_MODULES) {
      for (const p of m.phases) {
        const own = (m.sections[p] ?? []).flatMap(s => s.fields.map(f => f.id));
        expect(own.some(id => /\.tetanus$/.test(id)), `${m.id} ${p}`).toBe(false);
      }
    }
  });

  it.each([
    ['burns_excision_grafting', 'wound_review'], ['burns_excision_grafting', 'pre_op'],
    ['tendon_repair', 'pre_op'], ['nerve_repair_hand_trauma', 'pre_op'], ['lower_limb_amputation', 'pre_op'],
    ['wound_care_review', 'wound_review'], ['wound_care_review', 'follow_up'],
  ] as const)('%s asks it at %s, once', (id, phase) => {
    const ids = composeTemplate(mod(id), phase).sections.flatMap(s => s.fields.map(f => f.id));
    expect(ids.filter(x => x === 'core.tetanus')).toHaveLength(1);
  });

  it('keeps the module conditions: traumatic amputation, traumatic / burn wound', () => {
    const field = (id: string, phase: Parameters<typeof composeTemplate>[1]) =>
      composeTemplate(mod(id), phase).sections.flatMap(s => s.fields).find(f => f.id === 'core.tetanus')!;
    const amp = field('lower_limb_amputation', 'pre_op');
    expect(isVisible(amp, { 'lower_limb_amputation.indication': 'trauma' })).toBe(true);
    expect(isVisible(amp, { 'lower_limb_amputation.indication': 'clti' })).toBe(false);
    const w = field('wound_care_review', 'wound_review');
    expect(isVisible(w, { 'core.wound_aetiology': 'traumatic' })).toBe(true);
    expect(isVisible(w, { 'core.wound_aetiology': 'venous' })).toBe(false);
    expect(isVisible(field('tendon_repair', 'pre_op'), {})).toBe(true);
  });

  it('is not in reviews that did not opt in', () => {
    const ids = composeTemplate(mod('skin_graft'), 'pre_op').sections.flatMap(s => s.fields.map(f => f.id));
    expect(ids).not.toContain('core.tetanus');
  });

  it('follows the Green Book table', () => {
    // Up to date: nothing
    expect(tetanusLines('tendon_repair', 'pre_op', { 'core.tetanus': 'up_to_date' })).toHaveLength(0);
    // Incomplete, clean: vaccine, no HTIG
    const clean = tetanusLines('tendon_repair', 'pre_op', { 'core.tetanus': 'due', 'core.tetanus_wound': 'clean' });
    expect(clean[0].text).toMatch(/reinforcing dose/);
    expect(clean[0].text).not.toMatch(/immunoglobulin/);
    // Incomplete, tetanus-prone: vaccine, no HTIG; high-risk: + HTIG
    expect(tetanusLines('tendon_repair', 'pre_op', { 'core.tetanus': 'due', 'core.tetanus_wound': 'prone' })[0].text).not.toMatch(/immunoglobulin/);
    expect(tetanusLines('tendon_repair', 'pre_op', { 'core.tetanus': 'due', 'core.tetanus_wound': 'high_risk' })[0].text).toMatch(/immunoglobulin/);
    // Unknown, tetanus-prone: immediate vaccine + HTIG; clean: no HTIG
    const prone = tetanusLines('tendon_repair', 'pre_op', { 'core.tetanus': 'unknown', 'core.tetanus_wound': 'prone' });
    expect(prone[0].text).toMatch(/immediate dose.*immunoglobulin/);
    expect(prone[0].priority).toBe('urgent');
    expect(tetanusLines('tendon_repair', 'pre_op', { 'core.tetanus': 'unknown', 'core.tetanus_wound': 'clean' })[0].text).not.toMatch(/immunoglobulin/);
    // Wound risk not recorded: the line says when HTIG is needed
    expect(tetanusLines('burns_excision_grafting', 'wound_review', { 'core.tetanus': 'unknown' })[0].text).toMatch(/immunoglobulin .* if the wound is tetanus-prone/);
  });

  it('uses the childhood vaccine under 10', () => {
    const l = tetanusLines('tendon_repair', 'pre_op', { 'core.tetanus': 'due' }, adult({ ageYears: 6 }));
    expect(l[0].text).toMatch(/national childhood schedule/);
  });
});
