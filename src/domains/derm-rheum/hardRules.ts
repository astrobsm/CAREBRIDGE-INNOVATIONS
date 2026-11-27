/**
 * Deterministic hard rules for skin lesions and ulcers, and the check that
 * flags any Claude consult that contradicts or omits one. Pure; no AI.
 *
 * A rule fires from the documented features. Its text is verbatim: the rules
 * plan shows it, Claude is told to quote it, and the consult view repeats it
 * whatever Claude returned.
 */
import type { LesionFeatures } from './features';
import type { Candidate } from './screen';
import { KB_BY_ID } from './kb';

export interface DermHardRule {
  id: string;
  text: string;
  /** Why it fired for this patient. */
  because: string;
  source: string;
}

export const HARD_RULE_TEXT = {
  pg_no_debride: 'Suspected pyoderma gangrenosum: do NOT debride, excise or graft the ulcer (pathergy makes it spread). Biopsy only the edge, after discussion, and treat the inflammation first.',
  biopsy_chronic: 'Biopsy this lesion or ulcer (edge and base): it has not healed in about 3 months, or has atypical features, so malignancy must be excluded.',
  sjs_emergency: KB_BY_ID.sjs_ten.warnings[0],
  vasculitis_urine: 'Check the urine for blood and protein, the blood pressure and the creatinine today: kidney involvement makes suspected vasculitis or lupus urgent.',
  acral_full_thickness: KB_BY_ID.acral_melanoma.warnings[0],
  infection_before_immuno: 'Before steroids or any other immunosuppression, exclude infection: tissue culture (bacteria, AFB, fungi) and hepatitis B, HIV and TB screening.',
  atypical_keloid: KB_BY_ID.dfsp.warnings[0],
  calciphylaxis_renal: 'Suspected calciphylaxis: involve the renal team this week; stop calcium and vitamin D supplements and review warfarin.',
} as const;

export type HardRuleId = keyof typeof HARD_RULE_TEXT;

const score = (cands: Candidate[], id: string) => cands.find(c => c.id === id)?.score ?? 0;

export function dermHardRules(f: LesionFeatures, cands: Candidate[]): DermHardRule[] {
  const out: DermHardRule[] = [];
  const add = (id: HardRuleId, because: string, source: string) => out.push({ id, text: HARD_RULE_TEXT[id], because, source });
  const pg = score(cands, 'pyoderma_gangrenosum');
  if (pg >= 3 || f.underminedViolaceous || (f.pathergy && f.rapid)) {
    add('pg_no_debride', f.underminedViolaceous ? 'undermined violaceous edge' : f.pathergy ? 'pathergy with rapid progression' : 'pyoderma gangrenosum features', 'Maverakis E et al. JAMA Dermatol. 2018;154(4):461-466.');
  }
  // Several digital ulcers (systemic sclerosis pattern) are not biopsied for that reason alone: they heal poorly after biopsy.
  const atypicalInflammatory = f.underminedViolaceous || (f.multiple && !f.digitalUlcers) || f.livedo || f.palpablePurpura || f.retiformPurpura || f.failedCare;
  if (f.over3Months || f.rolledEdge || f.inScar || f.fungating || atypicalInflammatory) {
    const why = [f.over3Months && 'open over about 3 months', f.rolledEdge && 'rolled / everted edge', f.inScar && 'in a scar', f.fungating && 'friable / fungating', atypicalInflammatory && 'atypical features'].filter(Boolean).join(', ');
    add('biopsy_chronic', why, 'AstroHEALTH Wound Clinic Protocol (26 Nov 2026), targeted biopsy; NICE NG12.');
  }
  if (score(cands, 'sjs_ten') >= 4) add('sjs_emergency', 'mucosal erosions / dusky skin / detachment with a possible drug trigger', 'Creamer D et al. Br J Dermatol. 2016;174(6):1194-1227.');
  if (score(cands, 'small_vessel_vasculitis') >= 2 || score(cands, 'systemic_vasculitis') >= 2 || score(cands, 'sle') >= 3 || score(cands, 'cryoglobulinaemia') >= 3) {
    add('vasculitis_urine', 'vasculitis or lupus is in the differential', 'Jennette JC et al. Arthritis Rheum. 2013;65(1):1-11; Fanouriakis A et al. Ann Rheum Dis. 2024;83(1):15-29.');
  }
  if (f.acralPigmented) add('acral_full_thickness', 'pigmented lesion on the sole, palm or nail', 'NICE NG14; Bristow IR et al. J Foot Ankle Res. 2010;3:25.');
  if (pg >= 3 || score(cands, 'small_vessel_vasculitis') >= 3 || score(cands, 'systemic_vasculitis') >= 3 || score(cands, 'sle') >= 3) {
    add('infection_before_immuno', 'immunosuppression may be needed', 'Maverakis E et al. 2018 (exclude mimics); Hellmich B et al. Ann Rheum Dis. 2024;83(1):30-47.');
  }
  if (f.protuberantPlaque) add('atypical_keloid', 'keloid-like plaque with protuberant nodules', 'Saiag P et al. Eur J Cancer. 2015;51(17):2604-2608.');
  if (score(cands, 'calciphylaxis') >= 4) add('calciphylaxis_renal', 'kidney failure with necrotic / retiform lesions', 'Nigwekar SU et al. N Engl J Med. 2018;378(18):1704-1714.');
  return out;
}

// ── Checking a consult against the rules ─────────────────────────────────

/** The parts of a consult the check reads (consult.ts DermConsult satisfies it). */
export interface ConsultForCheck {
  urgency: 'emergency' | 'urgent' | 'soon' | 'routine';
  investigations: { test: string }[];
  management: { immediate: string[]; definitive: string[] };
  doNot: string[];
  referrals: { to: string; why: string }[];
}

export type RuleStatus = 'ok' | 'omitted' | 'contradicted';
export interface RuleCheck { rule: DermHardRule; status: RuleStatus; detail?: string }

const NEG = /\b(no|not|avoid|never|don'?t|do not|without|stop|withhold|contraindicated|until)\b/i;
/** Recommendations: everything Claude suggests doing (do-nots excluded), each item kept whole for negation. */
const doing = (c: ConsultForCheck) => [...c.investigations.map(i => i.test), ...c.management.immediate, ...c.management.definitive, ...c.referrals.map(r => `${r.to} ${r.why}`)];
const recommends = (c: ConsultForCheck, re: RegExp, except?: RegExp) => doing(c).find(t => re.test(t) && !NEG.test(t) && !(except && except.test(t)));
const mentions = (items: string[], re: RegExp) => items.some(t => re.test(t));

export function checkConsult(c: ConsultForCheck, rules: DermHardRule[]): RuleCheck[] {
  return rules.map(rule => {
    const r = (status: RuleStatus, detail?: string): RuleCheck => ({ rule, status, detail });
    const tests = c.investigations.map(i => i.test);
    switch (rule.id as HardRuleId) {
      case 'pg_no_debride': {
        // "Graft once the inflammation is controlled" follows the guideline; only an unqualified surgical step contradicts.
        const bad = recommends(c, /debrid|excis|graft|curett|sharp|flap|surgical clean/i, /biops|\bonce\b|\bafter\b|controlled|quiescent|inactive|under (continued )?immunosuppression/i);
        if (bad) return r('contradicted', `Recommends "${bad}"`);
        return mentions(c.doNot, /debrid/i) ? r('ok') : r('omitted', 'No "do not debride" warning');
      }
      case 'biopsy_chronic':
        return mentions(tests, /biops/i) ? r('ok') : r('omitted', 'No biopsy among the investigations');
      case 'sjs_emergency': {
        if (c.urgency === 'soon' || c.urgency === 'routine') return r('contradicted', `Urgency given as "${c.urgency}"`);
        const admit = mentions(c.management.immediate, /admi|burns|high[- ]dependency|intensive|icu|hdu/i);
        const stop = mentions(c.management.immediate, /stop|withdraw|discontinu|cease/i);
        return admit && stop ? r('ok') : r('omitted', !admit ? 'No admission in the immediate plan' : 'Does not say to stop the suspect drug');
      }
      case 'vasculitis_urine':
        return mentions([...tests, ...c.management.immediate], /urin/i) ? r('ok') : r('omitted', 'No urine test');
      case 'acral_full_thickness': {
        const bad = recommends(c, /shave|curett|cauter|cryo/i);
        if (bad) return r('contradicted', `Recommends "${bad}"`);
        return mentions(tests, /biops|excision/i) ? r('ok') : r('omitted', 'No full-thickness biopsy');
      }
      case 'infection_before_immuno': {
        const immuno = recommends(c, /steroid|prednis|ciclosporin|cyclosporin|methotrexate|rituximab|cyclophosphamide|infliximab|adalimumab|biologic|immunosuppress|tacrolimus|mycophenolate|azathioprine/i, /topical|cream|ointment/i);
        if (!immuno) return r('ok');
        return mentions(tests, /culture|afb|tubercul|\btb\b|genexpert|mycobacter/i) ? r('ok') : r('omitted', `Recommends "${immuno}" without tissue culture / TB exclusion`);
      }
      case 'atypical_keloid': {
        const bad = recommends(c, /triamcinolone|intralesional|steroid injection|keloid excision/i);
        if (bad && !mentions(tests, /biops/i)) return r('contradicted', `Recommends "${bad}" without a biopsy`);
        return mentions(tests, /biops/i) ? r('ok') : r('omitted', 'No biopsy');
      }
      case 'calciphylaxis_renal':
        return mentions([...c.referrals.map(x => `${x.to} ${x.why}`), ...c.management.immediate, ...c.management.definitive], /nephrolog|renal|kidney|dialysis/i) ? r('ok') : r('omitted', 'No renal team involvement');
      default:
        return r('ok');
    }
  });
}
