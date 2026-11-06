/**
 * The review's treatment plan: core rules + the module's rules → one ScribePlan.
 *
 * The output IS a ScribePlan — the medical scribe's draft — so it is edited
 * on the same PlanView, submitted with scribeService.submitPlan, approved only
 * by a consultant (scribe/approval.canApprove), becomes the patient's
 * TreatmentPlan (approval.toTreatmentPlan) and is carried out through the
 * implementation log. There is no second approval system.
 *
 * MERGING. Every rule returns a PlanContribution or null. The builder:
 *   - puts problem lines on the module's primary problem (or a named one);
 *   - puts general lines under the fixed PLAN_HEADINGS, in that order;
 *   - de-duplicates across the WHOLE plan by normalised text: if two rules
 *     produce the same line it appears once, with both reasons and the
 *     higher priority;
 *   - orders urgent lines first, otherwise keeps rule order (deterministic).
 * Every line keeps a `why` (RuleLine requires one).
 *
 * Decision support: the result is a draft for the clinician to edit and a
 * consultant to approve.
 */
import type { PlanLine, ProblemPlan, ScribePlan } from '../scribe/scribePlan';
import type {
  CounsellingPoint, FollowUpVisit, PlanContext, PlanContribution, PlanHeading, ReviewPlanOutput, RuleLine,
} from './types';
import { PLAN_HEADINGS } from './types';
import { CORE_RULES } from './coreRules';
import { phaseDefinition } from './phases';

type ProblemKey = 'goals' | 'investigations' | 'treatment' | 'monitoring' | 'referrals';
const PROBLEM_KEYS: ProblemKey[] = ['goals', 'investigations', 'treatment', 'monitoring', 'referrals'];

/** The text two lines are compared by: case, punctuation and spacing ignored. */
export const normaliseLine = (t: string) => t.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim();

const joinWhy = (a: string | undefined, b: string | undefined) => {
  if (!a) return b;
  if (!b || a.includes(b)) return a;
  return `${a}; ${b}`;
};

class PlanAccumulator {
  private seen = new Map<string, PlanLine>();
  problems = new Map<string, ProblemPlan>();
  general = new Map<PlanHeading, PlanLine[]>();
  comorbidities = new Map<string, PlanLine[]>();
  cautions: string[] = [];
  counselling: CounsellingPoint[] = [];
  followUp: FollowUpVisit[] = [];
  discharge: string[] = [];

  constructor(private primary: string, private source: string) {
    this.problem(primary);
  }

  problem(name: string, code?: string): ProblemPlan {
    let p = this.problems.get(name);
    if (!p) {
      p = { problem: name, code, source: this.source, goals: [], investigations: [], treatment: [], monitoring: [], referrals: [] };
      this.problems.set(name, p);
    }
    return p;
  }

  /** Add a line to a list unless it is already somewhere in the plan. */
  private push(list: PlanLine[], l: RuleLine) {
    const key = normaliseLine(l.text);
    if (!key) return;
    const existing = this.seen.get(key);
    if (existing) {
      existing.why = joinWhy(existing.why, l.why);
      if (l.priority === 'urgent') existing.priority = 'urgent';
      return;
    }
    const line: PlanLine = { text: l.text, why: l.why, priority: l.priority ?? 'routine' };
    this.seen.set(key, line);
    list.push(line);
  }

  add(c: PlanContribution) {
    for (const k of PROBLEM_KEYS) for (const l of c.problem?.[k] ?? []) this.push(this.problem(this.primary)[k], l);
    for (const p of c.problems ?? []) {
      const target = this.problem(p.problem, p.code);
      for (const k of PROBLEM_KEYS) for (const l of p.lines[k] ?? []) this.push(target[k], l);
    }
    for (const g of c.general ?? []) {
      const list = this.general.get(g.heading) ?? [];
      this.general.set(g.heading, list);
      for (const l of g.items) this.push(list, l);
    }
    for (const cm of c.comorbidities ?? []) {
      const list = this.comorbidities.get(cm.condition) ?? [];
      this.comorbidities.set(cm.condition, list);
      for (const l of cm.actions) this.push(list, l);
    }
    for (const x of c.cautions ?? []) if (!this.cautions.some(y => normaliseLine(y) === normaliseLine(x))) this.cautions.push(x);
    for (const x of c.dischargeCriteria ?? []) if (!this.discharge.some(y => normaliseLine(y) === normaliseLine(x))) this.discharge.push(x);
    for (const x of c.counselling ?? []) {
      if (!this.counselling.some(y => y.topic === x.topic && normaliseLine(y.text) === normaliseLine(x.text))) this.counselling.push(x);
    }
    for (const x of c.followUp ?? []) {
      if (!this.followUp.some(y => normaliseLine(`${y.when} ${y.purpose}`) === normaliseLine(`${x.when} ${x.purpose}`))) this.followUp.push(x);
    }
  }
}

/** Urgent first; otherwise the order the rules produced (stable sort). */
const urgentFirst = (xs: PlanLine[]) =>
  xs.map((l, i) => ({ l, i })).sort((a, b) => (a.l.priority === 'urgent' ? 0 : 1) - (b.l.priority === 'urgent' ? 0 : 1) || a.i - b.i).map(x => x.l);

/** The facts the plan was built from, for the scribe's "Built from" list. */
function basisOf(ctx: PlanContext): string[] {
  return [
    `Procedure review: ${ctx.module.name} — ${phaseDefinition(ctx.phase).label}`,
    ...Object.values(ctx.scores)
      .filter(s => s.total != null || s.band)
      .map(s => `Score: ${s.abbreviation}${s.total != null ? ` ${s.total}` : ''}${s.band ? ` (${s.band.label})` : ''} — ${s.source}`),
    ...ctx.flags.map(f => `Flag (${f.level}): ${f.fieldLabel} — ${f.answerLabel}`),
  ];
}

/**
 * Build the plan for a review. Pure: the same context gives the same plan.
 * `rules` defaults to the core rules for the phase followed by the module's.
 */
export function buildReviewPlan(ctx: PlanContext, rules = [...CORE_RULES, ...ctx.module.planRules]): ReviewPlanOutput {
  const primary = ctx.module.problemLabel ?? ctx.module.name;
  const acc = new PlanAccumulator(primary, `Procedure review — ${phaseDefinition(ctx.phase).label}`);

  // The module's default schedule comes first, so rule-added visits follow it.
  for (const v of ctx.module.followUp?.[ctx.phase] ?? []) acc.add({ followUp: [v] });
  for (const rule of rules) {
    const c = rule(ctx);
    if (c) acc.add(c);
  }
  // Every red flag is also a caution: cautions cannot be unticked, so a red
  // flag stays in front of the consultant whatever lines are edited out.
  acc.add({ cautions: ctx.flags.filter(f => f.level === 'red').map(f => `RED FLAG — ${f.fieldLabel}: ${f.answerLabel}. ${f.reason}`) });

  const problems = [...acc.problems.values()].map(p => ({
    ...p,
    goals: p.goals, // goals keep their stated order
    investigations: urgentFirst(p.investigations),
    treatment: urgentFirst(p.treatment),
    monitoring: urgentFirst(p.monitoring),
    referrals: urgentFirst(p.referrals),
  })).filter((p, i) => i === 0 || PROBLEM_KEYS.some(k => p[k].length));

  const general = PLAN_HEADINGS
    .filter(h => acc.general.get(h)?.length)
    .map(h => ({ heading: h as string, items: urgentFirst(acc.general.get(h)!) }));

  const plan: ScribePlan = {
    problems,
    comorbidities: [...acc.comorbidities.entries()].filter(([, a]) => a.length).map(([condition, actions]) => ({ condition, actions: urgentFirst(actions) })),
    general,
    carriedOver: [],
    dischargeCriteria: acc.discharge,
    followUp: acc.followUp.map(v => `${v.when}: ${v.purpose}`),
    cautions: acc.cautions,
    basis: basisOf(ctx),
  };
  return { plan, counselling: acc.counselling, followUp: acc.followUp };
}

/** Every line in a plan with where it sits — for tests and the PDF. */
export function planLines(plan: ScribePlan): { where: string; line: PlanLine }[] {
  return [
    ...plan.problems.flatMap(p => PROBLEM_KEYS.flatMap(k => p[k].map(line => ({ where: `${p.problem} / ${k}`, line })))),
    ...plan.comorbidities.flatMap(c => c.actions.map(line => ({ where: c.condition, line }))),
    ...plan.general.flatMap(g => g.items.map(line => ({ where: g.heading, line }))),
    ...plan.carriedOver.map(line => ({ where: 'carried', line })),
  ];
}
