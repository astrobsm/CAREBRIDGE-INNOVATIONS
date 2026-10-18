/**
 * The rules of a scribe plan: who may submit, approve, return and carry it
 * out, what a consultant's edits do to it, and what an approved plan becomes.
 *
 * These were server rules in the original (api/scribe-plans.js). They run in
 * the client service before anything is written; the Supabase migration
 * backs the ones a database can hold (approval needs a consultant reviewer,
 * a returned plan needs a reason, a log needs an approved plan and a reason
 * when the item was not done).
 */
import type { TreatmentPlan, UserRole } from '../../../types';
import type { PlanLine, ScribePlan } from './scribePlan';
import { ACTION_STATUSES, REASON_REQUIRED, type ScribeTreatmentPlan } from './records';
import type { Actor } from '../clerking/lifecycle';

/** Only a consultant — or an administrator — approves or returns a plan. */
export const APPROVER_ROLES: readonly UserRole[] = ['consultant', 'super_admin', 'hospital_admin'];
/**
 * Who may submit a plan and log its implementation: the clinical team. The
 * original list (consultant, registrars, house officer, nurse, admins) plus
 * this app's other doctor roles.
 */
export const CLINICAL_ROLES: readonly UserRole[] = [
  'consultant', 'senior_registrar', 'registrar', 'resident', 'medical_officer', 'house_officer',
  'doctor', 'surgeon', 'plastic_surgeon', 'nurse', 'super_admin', 'hospital_admin',
];

export const canApprove = (u?: Actor | null) => !!u?.role && APPROVER_ROLES.includes(u.role as UserRole);
export const canLog = (u?: Actor | null) => !!u?.role && CLINICAL_ROLES.includes(u.role as UserRole);

export class ScribePlanError extends Error {
  constructor(message: string, public code: 400 | 403 | 404 | 409 | 413) {
    super(message);
    this.name = 'ScribePlanError';
  }
}

export function assertCanSubmitPlan(user: Actor, patientId: string | undefined, plan: ScribePlan | undefined) {
  if (!canLog(user)) throw new ScribePlanError('Not permitted', 403);
  if (!patientId || !plan || !Array.isArray(plan.problems)) throw new ScribePlanError('patient_id and plan are required', 400);
}

export function assertCanReview(user: Actor, row: ScribeTreatmentPlan | undefined, action: 'approve' | 'reject', note?: string) {
  if (!canApprove(user)) throw new ScribePlanError('Only a consultant can approve or reject a treatment plan', 403);
  if (!row) throw new ScribePlanError('Plan not found', 404);
  if (row.status !== 'pending_approval') throw new ScribePlanError(`This plan is already ${row.status.replace(/_/g, ' ')}`, 409);
  if (action === 'reject' && !String(note || '').trim()) throw new ScribePlanError('Give the reason for rejecting the plan', 400);
}

export interface LogBody {
  itemKey?: string;
  status?: string;
  note?: string | null;
  attachments?: { name?: string; data: string }[];
}

/** Vercel refused bodies over ~4.5 MB in the original; the same cap keeps a sync row sane. */
export const MAX_ATTACHMENT_CHARS = 4_000_000;

export function assertCanLog(user: Actor, plan: ScribeTreatmentPlan | undefined, b: LogBody) {
  if (!canLog(user)) throw new ScribePlanError('Not permitted', 403);
  if (!plan) throw new ScribePlanError('Plan not found', 404);
  // Only an approved plan is carried out.
  if (plan.status !== 'approved') throw new ScribePlanError('Only an approved plan can be implemented', 409);
  if (!b.itemKey || !b.status) throw new ScribePlanError('item_key and status are required', 400);
  if (!(ACTION_STATUSES as readonly string[]).includes(b.status)) throw new ScribePlanError(`status must be one of ${ACTION_STATUSES.join(', ')}`, 400);
  if (REASON_REQUIRED.includes(b.status) && !String(b.note || '').trim()) throw new ScribePlanError('Say why it was not (fully) done', 400);
  const files = b.attachments || [];
  for (const f of files) {
    if (!/^data:[\w.+-]+\/[\w.+-]+;base64,/.test(String(f?.data || ''))) throw new ScribePlanError('Attachments must be data URLs', 400);
  }
  if (files.reduce((n, f) => n + String(f.data).length, 0) > MAX_ATTACHMENT_CHARS) {
    throw new ScribePlanError('The files are too large together (max ~3 MB per save) — attach fewer, or save them in two steps.', 413);
  }
}

// ── The consultant's edits ─────────────────────────────────────────────────

/** The plan without the lines that were unticked, plus any additions. */
export function filterPlan(plan: ScribePlan, excluded: Set<string>, additions = ''): ScribePlan {
  const keep = (key: string, xs: PlanLine[]) => xs.filter((_, i) => !excluded.has(`${key}|${i}`));
  const extra = additions.split('\n').map(s => s.trim()).filter(Boolean).map(text => ({ text, why: 'Consultant instruction' }));
  return {
    ...plan,
    problems: plan.problems.map((p, pi) => ({
      ...p,
      goals: keep(`p${pi}.goals`, p.goals),
      investigations: keep(`p${pi}.investigations`, p.investigations),
      treatment: keep(`p${pi}.treatment`, p.treatment),
      monitoring: keep(`p${pi}.monitoring`, p.monitoring),
      referrals: keep(`p${pi}.referrals`, p.referrals),
    })),
    comorbidities: plan.comorbidities.map((c, ci) => ({ ...c, actions: keep(`c${ci}`, c.actions) })).filter(c => c.actions.length),
    general: [
      ...plan.general.map((g, gi) => ({ ...g, items: keep(`g${gi}`, g.items) })).filter(g => g.items.length),
      ...(extra.length ? [{ heading: 'Consultant instructions', items: extra }] : []),
    ],
    carriedOver: keep('carried', plan.carriedOver),
  };
}

// ── What an approved plan becomes ──────────────────────────────────────────

const lines = (arr: Array<PlanLine | string> | undefined) => (arr || []).map(l => (typeof l === 'string' ? l : l?.text)).filter(Boolean) as string[];

/** Marks the TreatmentPlan rows that came from an approved scribe plan. */
export const SCRIBE_ENTITY_PREFIX = 'scribe:';

/**
 * The approved plan as the patient's active TreatmentPlan, so it appears in
 * treatment planning, the reminders and everything else that reads plans.
 */
export function toTreatmentPlan(
  plan: ScribePlan,
  ctx: { id: string; patientId: string; scribePlanId: string; version: number; approverName?: string; note?: string; createdBy: string; now: Date },
): TreatmentPlan {
  const problems = Array.isArray(plan?.problems) ? plan.problems : [];
  const diagnosis = problems.map(p => `${p.problem}${p.code ? ` (${p.code})` : ''}`).join('; ') || 'See plan';
  let n = 0;
  const order = (category: TreatmentPlan['orders'][number]['category'], text: string, priority: 'routine' | 'urgent' = 'routine') => ({
    id: `${ctx.id}-o${n++}`, category, order: text, frequency: 'as planned', duration: '', priority, status: 'active' as const, startDate: ctx.now,
  });
  const lineOrders = (category: TreatmentPlan['orders'][number]['category'], xs: PlanLine[] | undefined) => (xs || []).map(l => order(category, l.text, l.priority === 'urgent' ? 'urgent' : 'routine'));
  const medicationHeadings = /VTE|Analgesia/i;
  return {
    id: ctx.id,
    patientId: ctx.patientId,
    relatedEntityType: 'general',
    relatedEntityId: `${SCRIBE_ENTITY_PREFIX}${ctx.scribePlanId}`,
    title: diagnosis,
    description: [
      `Scribe plan v${ctx.version}, approved by ${ctx.approverName || 'consultant'}${ctx.note ? ` — ${ctx.note}` : ''}`,
      ...problems.map(p => `• ${p.problem}: ${lines(p.treatment).slice(0, 3).join('; ')}`),
      ...(plan?.comorbidities || []).map(c => `• ${c.condition}: ${lines(c.actions).join('; ')}`),
      ...(lines(plan?.followUp).length ? [`Follow-up: ${lines(plan.followUp).join('; ')}`] : []),
      ...(lines(plan?.dischargeCriteria).length ? [`Discharge criteria: ${lines(plan.dischargeCriteria).join('; ')}`] : []),
    ].join('\n'),
    clinicalGoals: problems.flatMap(p => lines(p.goals)).map((g, i) => ({ id: `${ctx.id}-g${i}`, description: g, status: 'pending' as const })),
    orders: [
      ...problems.flatMap(p => lineOrders('procedure', p.treatment)),
      ...problems.flatMap(p => lineOrders('other', p.investigations)),
      ...lineOrders('other', plan?.carriedOver),
      ...(plan?.general || []).filter(g => medicationHeadings.test(g.heading)).flatMap(g => lineOrders('medication', g.items)),
    ],
    frequency: 'daily',
    startDate: ctx.now,
    status: 'active',
    createdBy: ctx.createdBy,
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
}
