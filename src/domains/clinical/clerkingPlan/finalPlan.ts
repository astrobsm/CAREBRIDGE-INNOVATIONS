/**
 * The FINAL plan: what the clinician keeps. Pure.
 *
 *   - rules lines are in unless rejected (withheld lines are out unless the
 *     clinician accepts them, with the reason kept);
 *   - Claude's lines (plan draft or results interpretation) are out unless
 *     accepted — nothing AI-drafted is used by default;
 *   - any line may be edited; the edit is kept with the original source;
 *   - lines the clinician adds are source 'clinician'.
 */
import type { PlanLine, RulesPlan } from './types';

export interface LineDecision {
  lineId: string;
  decision: 'accepted' | 'rejected';
  editedText?: string;
  by?: string;
  at: string;
}

export interface FinalLine extends PlanLine {
  edited?: boolean;
  /** The source text before the clinician's edit. */
  originalText?: string;
}

export function decisionFor(decisions: LineDecision[], id: string): LineDecision | undefined {
  for (let i = decisions.length - 1; i >= 0; i--) if (decisions[i].lineId === id) return decisions[i];
  return undefined;
}

/** Record (or replace) a decision on a line. */
export function decide(decisions: LineDecision[], d: LineDecision): LineDecision[] {
  return [...decisions.filter(x => x.lineId !== d.lineId), d];
}

export function isIncluded(line: PlanLine, decisions: LineDecision[]): boolean {
  const d = decisionFor(decisions, line.id);
  if (d) return d.decision === 'accepted';
  return line.source.kind !== 'ai' && !line.withheld;
}

export function buildFinalPlan(rules: PlanLine[], aiLines: PlanLine[], decisions: LineDecision[], manual: PlanLine[]): FinalLine[] {
  const out: FinalLine[] = [];
  for (const l of [...rules, ...aiLines, ...manual]) {
    if (out.some(x => x.id === l.id)) continue;
    if (l.source.kind !== 'clinician' && !isIncluded(l, decisions)) continue;
    const d = decisionFor(decisions, l.id);
    if (d?.editedText && d.editedText.trim() && d.editedText.trim() !== l.text) {
      // The clinician's edit wins everywhere. The structured medicine and the locale
      // patient line describe the ORIGINAL line (e.g. the old dose), so both are
      // replaced: the clinician PDF prints the edited text and the patient copy
      // prints the clinician's own words, never the stale dose.
      const text = d.editedText.trim();
      out.push({ ...l, text, edited: true, originalText: l.text, withheld: undefined, medication: undefined, patient: l.patient || l.medication ? text : undefined });
    }
    else out.push({ ...l, withheld: d?.decision === 'accepted' ? undefined : l.withheld });
  }
  return out;
}

/** Inputs changed since the Claude draft was made. */
export const isStale = (rules: Pick<RulesPlan, 'inputsHash'>, draftHash: string | undefined | null) => !!draftHash && draftHash !== rules.inputsHash;

/** A clinician's own line. */
export function manualLine(section: PlanLine['section'], text: string, n: number): PlanLine {
  return { id: `manual:${section}:${n}`, section, text: text.trim(), source: { kind: 'clinician', label: 'Added by the clinician' } };
}
