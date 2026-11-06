/**
 * Flap monitoring shared by the flap modules in this folder (local / regional
 * flap, free flap, pressure-sore flap, scalp flap). Not a module.
 *
 * The bedside signs are the same whatever the flap: colour, capillary refill,
 * turgor, temperature, bleeding on pinprick and (where a signal was marked)
 * hand-held Doppler. What they mean is the same too — a pale, cool, flat flap
 * with slow or absent refill is losing its arterial inflow; a dusky, tense
 * flap with very brisk refill and dark bleeding is losing its venous outflow.
 * The response differs (a free flap goes back to theatre; a local flap is
 * first decompressed), so each module passes its own options to the rule.
 *
 * Every field is namespaced with the calling module's id, so a module's
 * fields remain its own (`${moduleId}.flap_colour`).
 *
 * Colour in dark skin: change is subtle and easily missed. The fields tell the
 * observer to compare with the flap at the end of surgery and to lean on
 * refill, turgor, bleeding and Doppler.
 */
import type { EncounterAnswers, EncounterField } from '../../../data/encounterModel';
import type { PlanContribution } from '../../types';
import { chosen, hasAny, isOneOf } from '../../core/answers';
import { G, L, merge } from '../../ruleKit';

export const FLAP_MONITORING_BASIS =
  'Chae MP, Rozen WM, Whitaker IS et al. Current evidence for postoperative monitoring of microvascular free flaps: a systematic review. Ann Plast Surg 2015;74:621-32';
export const LEECH_BASIS =
  'Whitaker IS, Izadi D, Oliver DW, Monteath G, Butler PE. Hirudo medicinalis and the plastic surgeon. Br J Plast Surg 2004;57:348-53';

const DARK_SKIN_HELP = 'In darker skin colour change is subtle: compare with the flap at the end of surgery (and its photograph) and rely more on refill, turgor, bleeding and Doppler.';

export interface FlapFieldOptions {
  /** Include the hand-held Doppler field. */
  doppler?: boolean;
  /** Show the observation fields only when this is true (e.g. "a flap was used"). */
  visibleWhen?: EncounterField['visibleWhen'];
}

/** The bedside flap observation fields, namespaced with the module id. */
export function flapObservationFields(id: string, opts: FlapFieldOptions = {}): EncounterField[] {
  const f = (x: string) => `${id}.${x}`;
  const v = opts.visibleWhen;
  const fields: EncounterField[] = [
    {
      id: f('flap_colour'), label: 'Flap colour', kind: 'select', important: true, help: DARK_SKIN_HELP, visibleWhen: v,
      options: [
        { value: 'normal', label: 'As at the end of surgery' },
        { value: 'pale', label: 'Pale / white', flag: 'red', flagReason: 'Pale flap: arterial insufficiency until proven otherwise — senior review now.' },
        { value: 'congested', label: 'Dusky, blue or purple', flag: 'red', flagReason: 'Dusky flap: venous congestion until proven otherwise — decompress and senior review now.' },
        { value: 'mottled', label: 'Mottled', flag: 'red', flagReason: 'Mottled flap: failing perfusion — senior review now.' },
        { value: 'demarcating', label: 'A dark, demarcating area (partial)', flag: 'amber', flagReason: 'Partial flap necrosis: demarcate, debride when clear, plan cover of the lost area.' },
        { value: 'black', label: 'Black / dry throughout', flag: 'amber', flagReason: 'Established flap necrosis: no salvage is possible; debride and plan alternative cover.' },
      ],
    },
    {
      id: f('cap_refill'), label: 'Capillary refill on the flap', kind: 'select', important: true, visibleWhen: v,
      options: [
        { value: 'normal', label: 'Normal (about 2 seconds, like the surrounding skin)' },
        { value: 'slow', label: 'Slow or absent', flag: 'red', flagReason: 'Slow or absent refill: arterial insufficiency.' },
        { value: 'brisk', label: 'Very brisk (under 1 second)', flag: 'red', flagReason: 'Very brisk refill: venous congestion.' },
        { value: 'not_assessable', label: 'Not assessable (dark skin, muscle under a graft, buried flap)' },
      ],
    },
    {
      id: f('turgor'), label: 'Turgor', kind: 'select', visibleWhen: v,
      options: [
        { value: 'normal', label: 'Soft, normal fullness' },
        { value: 'tense', label: 'Tense, swollen', flag: 'red', flagReason: 'Tense flap: venous congestion or haematoma beneath it.' },
        { value: 'flat', label: 'Flat, flaccid or shrivelled', flag: 'red', flagReason: 'Flat flap: arterial insufficiency.' },
      ],
    },
    {
      id: f('flap_temp'), label: 'Temperature to touch', kind: 'select', visibleWhen: v,
      options: [
        { value: 'warm', label: 'Warm, as the surrounding skin' },
        { value: 'cool', label: 'Cooler than the surrounding skin', flag: 'red', flagReason: 'Cool flap: poor perfusion (exclude a cold room and hypothermia).' },
      ],
    },
    {
      id: f('pinprick'), label: 'Bleeding on pinprick (when the other signs are equivocal)', kind: 'select', visibleWhen: v,
      options: [
        { value: 'not_done', label: 'Not done' },
        { value: 'normal', label: 'Bright red blood within a few seconds' },
        { value: 'dark_brisk', label: 'Rapid dark blood', flag: 'red', flagReason: 'Rapid dark bleeding: venous congestion.' },
        { value: 'none', label: 'No bleeding', flag: 'red', flagReason: 'No bleeding on pinprick: arterial insufficiency.' },
      ],
    },
  ];
  if (opts.doppler) {
    fields.push({
      id: f('doppler'), label: 'Hand-held Doppler at the marked point', kind: 'select', important: true, visibleWhen: v,
      options: [
        { value: 'not_used', label: 'No Doppler point marked' },
        { value: 'present', label: 'Signal present and unchanged' },
        { value: 'weaker', label: 'Signal weaker or changed in character', flag: 'amber', flagReason: 'Changing Doppler signal: re-examine every clinical sign and ask for senior review.' },
        { value: 'absent', label: 'Signal lost', flag: 'red', flagReason: 'Lost Doppler signal: possible pedicle thrombosis — senior review now.' },
      ],
    });
  }
  fields.push({
    id: f('pedicle_threat'), label: 'Anything compressing or stretching the pedicle', kind: 'multiselect', visibleWhen: v,
    options: [
      { value: 'none', label: 'None found' },
      { value: 'dressing', label: 'Tight dressing, tape or bandage', flag: 'amber', flagReason: 'A tight dressing over the pedicle: loosen it now.' },
      { value: 'sutures', label: 'Tight inset sutures', flag: 'amber', flagReason: 'Tight sutures at the inset: release some at the bedside.' },
      { value: 'haematoma', label: 'Swelling suggesting haematoma under the flap', flag: 'red', flagReason: 'Haematoma under a flap compresses its vessels: evacuate urgently.' },
      { value: 'position', label: 'Lying on the flap or pedicle / dependent position', flag: 'amber', flagReason: 'Reposition off the flap and pedicle now.' },
      { value: 'kink', label: 'Pedicle kinked, twisted or stretched (inset, splint, joint position)', flag: 'red', flagReason: 'A kinked or twisted pedicle needs correction now — usually in theatre.' },
      { value: 'ties', label: 'Tracheostomy ties / neck collar over the neck vessels', flag: 'amber', flagReason: 'Ties or a collar over the neck vessels obstruct venous return: loosen or re-route them.' },
    ],
  });
  return fields;
}

/** The leech / decongestion field (local, regional and free flaps). */
export function decongestionField(id: string, visibleWhen?: EncounterField['visibleWhen']): EncounterField {
  return {
    id: `${id}.decongestion`, label: 'Decongestion measures in use', kind: 'multiselect', visibleWhen,
    options: [
      { value: 'none', label: 'None' },
      { value: 'elevation', label: 'Elevation / repositioning' },
      { value: 'suture_release', label: 'Sutures released' },
      { value: 'leeches', label: 'Medicinal leeches' },
      { value: 'chemical', label: 'Chemical leeching (heparin-soaked pledgets on small incisions)' },
    ],
  };
}

export type FlapCompromise = 'arterial' | 'venous' | null;

/** Which way the bedside signs point. Venous wins if both appear (dusky + slow refill is late venous). */
export function flapCompromise(a: EncounterAnswers, id: string): FlapCompromise {
  const f = (x: string) => `${id}.${x}`;
  const venous = isOneOf(a, f('flap_colour'), 'congested') || isOneOf(a, f('cap_refill'), 'brisk')
    || isOneOf(a, f('turgor'), 'tense') || isOneOf(a, f('pinprick'), 'dark_brisk');
  const arterial = isOneOf(a, f('flap_colour'), 'pale', 'mottled') || isOneOf(a, f('cap_refill'), 'slow')
    || isOneOf(a, f('turgor'), 'flat') || isOneOf(a, f('flap_temp'), 'cool') || isOneOf(a, f('pinprick'), 'none')
    || isOneOf(a, f('doppler'), 'absent');
  return venous ? 'venous' : arterial ? 'arterial' : null;
}

/**
 * Plan lines for the flap's bedside state. `free` changes the response: a
 * compromised free flap goes back to theatre; a pedicled flap is decompressed
 * first and explored if that fails or a correctable cause is found.
 */
export function flapStateLines(a: EncounterAnswers, id: string, opts: { free: boolean }): PlanContribution | null {
  const f = (x: string) => `${id}.${x}`;
  const state = flapCompromise(a, id);
  const threats = chosen(a, f('pedicle_threat'));
  const leeches = hasAny(a, f('decongestion'), 'leeches');
  const chemical = hasAny(a, f('decongestion'), 'chemical');
  const signs = 'Bedside flap signs';
  return merge(
    state === 'venous' && { problem: { treatment: opts.free
      ? [L('Venous congestion of a free flap: inform the operating surgeon now and return to theatre to explore the anastomosis — salvage falls with every hour of delay; remove any compression on the way',
          `${signs} point to venous compromise (Chen KT et al. PRS 2007;120:187-95)`, 'urgent')]
      : [
          L('Venous congestion: release tight dressings and some inset sutures, reposition the flap and pedicle off pressure and elevate; inform the operating surgeon now',
            `${signs} point to venous compromise`, 'urgent'),
          L('If congestion does not settle promptly with decompression, or a haematoma or pedicle kink is suspected, return to theatre; medicinal leeches (or chemical leeching where leeches are unavailable) are an adjunct for a congested flap with intact arterial inflow',
            `Venous congestion of a pedicled flap (Whitaker et al. Br J Plast Surg 2004)`, 'urgent'),
        ] } },
    state === 'arterial' && { problem: { treatment: opts.free
      ? [L('Arterial insufficiency of a free flap: inform the operating surgeon now and return to theatre for exploration; meanwhile warm the patient, correct hypotension and hypovolaemia, remove all compression',
          `${signs} point to arterial compromise (Chen KT et al. PRS 2007)`, 'urgent')]
      : [L('Arterial insufficiency: remove all compression, correct the position (kink, stretch, joint position), warm the patient and correct hypotension or hypovolaemia; senior review now and return to theatre for a correctable cause — leeches do not help arterial insufficiency',
          `${signs} point to arterial compromise`, 'urgent')] } },
    // The core post-operative rule already writes the haematoma line when it is recorded as a complication.
    threats.includes('haematoma') && !hasAny(a, 'core.complications', 'haematoma') && { problem: { treatment: [L('Evacuate the haematoma under the flap (bedside release of sutures or theatre) and find the bleeding point', 'Swelling suggesting haematoma under the flap', 'urgent')] } },
    threats.includes('kink') && { problem: { treatment: [L('Correct the kinked, twisted or stretched pedicle — reposition the joint or splint now; return to theatre if it does not resolve', 'Pedicle kinked / twisted / stretched', 'urgent')] } },
    (threats.includes('dressing') || threats.includes('sutures') || threats.includes('ties') || threats.includes('position')) && { problem: { treatment: [L(
      'Remove what is compressing the pedicle: loosen dressings and ties, release tight sutures, reposition off the flap',
      `Pedicle threatened by: ${threats.filter(t => t !== 'haematoma' && t !== 'kink').join(', ')}`, 'urgent')] } },
    leeches && {
      general: [G('Antibiotic prophylaxis and infection', L(
        'Antibiotic prophylaxis against Aeromonas for as long as leeches are used (e.g. ciprofloxacin or co-trimoxazole per local policy)',
        `Medicinal leeches in use (Whitaker et al. Br J Plast Surg 2004)`, 'urgent'))],
      problem: { monitoring: [L('Haemoglobin at least daily, group and save, while leeching continues; stop once the flap decongests on its own', 'Leech therapy causes ongoing blood loss')] },
    },
    chemical && { problem: { monitoring: [L('Chemical leeching: monitor haemoglobin and coagulation; stop once the flap decongests on its own', 'Topical / subcutaneous heparin decongestion causes ongoing blood loss')] } },
  );
}
