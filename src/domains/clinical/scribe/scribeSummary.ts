/**
 * The Medical Scribe Summary: the patient's whole record as one note, with
 * key points, evidence-backed findings and the draft treatment plan.
 *
 * Built from the clinical facts (clinicalFacts.ts) — the structured clerking
 * first, free text second, negations respected — so the summary reports what
 * the record says rather than what a word fragment suggests. Pure: the panel
 * gathers the records from Dexie and calls this, so it is rebuilt whenever
 * anything it reads changes (an approval, a logged step, a sync pull).
 */
import { differenceInDays, format } from 'date-fns';
import type {
  Admission, ClinicalEncounter, Investigation, Patient, Prescription, Surgery, VitalSigns,
} from '../../../types';
import type { ClinicalPlanItem, ClinicalProblem } from '../clerking/records';
import { buildClinicalFacts, type ClinicalFacts } from './clinicalFacts';
import { buildFindings, buildScribePlan, type ScribeFinding, type ScribePlan } from './scribePlan';
import { flattenPlan, itemState } from './planItems';
import type { ScribePlanAction, ScribeTreatmentPlan } from './records';

export interface WardRoundEntry { date: Date | string; roundType?: string; doctor?: string; diagnosis?: string; notes?: string; orders?: string[] }

export interface ScribeSources {
  patient: Patient;
  admissions?: Admission[];
  encounters?: ClinicalEncounter[];
  wardRoundEntries?: WardRoundEntry[];
  prescriptions?: Prescription[];
  investigations?: Investigation[];
  /** Newest first. */
  vitals?: VitalSigns[];
  surgeries?: Surgery[];
  problems?: ClinicalProblem[];
  planItems?: ClinicalPlanItem[];
  scribe?: { plans: ScribeTreatmentPlan[]; actions: ScribePlanAction[] } | null;
  now?: Date;
}

export interface VitalTrend {
  parameter: string;
  current: string;
  previous?: string;
  direction: 'rising' | 'falling' | 'stable' | 'unknown';
  alert?: string;
}

export interface ScribeSummary {
  content: string;
  keyPoints: string[];
  currentProblems: string[];
  medications: string[];
  pendingInvestigations: string[];
  plan: string[];
  findings: ScribeFinding[];
  vitalTrends: VitalTrend[];
  scribePlan: ScribePlan;
  facts: ClinicalFacts;
  /** Where the patient is, offered as the place of each implementation log. */
  place?: string;
}

const fmt = (d: Date | string | undefined, f: string) => {
  if (!d) return '';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '' : format(x, f);
};

/** Medicines on current (not cancelled) prescriptions. */
export function currentMedications(prescriptions: Prescription[]): string[] {
  return [...new Set(prescriptions
    .filter(p => p.status !== 'cancelled')
    .flatMap(p => p.medications || [])
    .map(m => [m.name || m.genericName, m.dosage, m.route, m.frequency].filter(Boolean).join(' '))
    .filter(Boolean))];
}

/** Numeric results only — a finding is never raised from words. */
export function numericLabs(investigations: Investigation[]): { name: string; value: number | null; unit?: string }[] {
  return investigations.flatMap(inv => (inv.results || []).map(r => {
    const m = /-?\d+(\.\d+)?/.exec(String(r.value ?? ''));
    return { name: String(r.parameterName || r.parameter || inv.name || inv.typeName || ''), value: m ? Number(m[0]) : null, unit: r.unit };
  }));
}

const PENDING_INV = ['requested', 'sample_collected', 'processing'];

export function buildScribeSummary(src: ScribeSources): ScribeSummary {
  const now = src.now || new Date();
  const { patient } = src;
  const admissions = [...(src.admissions || [])].sort((a, b) => new Date(b.admissionDate || b.createdAt).getTime() - new Date(a.admissionDate || a.createdAt).getTime());
  const encounters = [...(src.encounters || [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const rounds = [...(src.wardRoundEntries || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const vitals = src.vitals || [];
  const investigations = src.investigations || [];
  const surgeries = src.surgeries || [];
  const meds = currentMedications(src.prescriptions || []);

  // ── What the record says (structured clerking first) ──
  const facts = buildClinicalFacts({
    patient, admissions, wardRoundEntries: rounds, encounters,
    clinical: { problems: src.problems, planItems: src.planItems }, medicationNames: meds, now,
  });
  const scribePlan = buildScribePlan(facts);

  const latestAdmission = admissions.find(a => a.status === 'active') || admissions[0];
  const admissionDate = latestAdmission?.admissionDate;
  const ward = latestAdmission ? `${latestAdmission.wardName}${latestAdmission.bedNumber ? `, Bed ${latestAdmission.bedNumber}` : ''}` : patient.ward || '';
  const los = admissionDate && latestAdmission?.status === 'active' ? differenceInDays(now, new Date(admissionDate)) : 0;
  const age = facts.age;
  const name = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
  const diagnoses = facts.problems.map(p => `${p.label}${p.code ? ` (${p.code})` : ''}`);
  const primaryDiagnosis = diagnoses[0] || 'Not specified';

  const line = '─'.repeat(60);
  let content = '';
  content += `${line}\n**MEDICAL SCRIBE SUMMARY**\n`;
  content += `**Date:** ${format(now, 'dd MMMM yyyy, HH:mm')}${patient.hospitalName ? `  |  **Institution:** ${patient.hospitalName}` : ''}\n${line}\n\n`;

  // ── Identification ──
  content += `**PATIENT IDENTIFICATION**\n`;
  content += `  Name: ${name}\n  Hospital No: ${patient.hospitalNumber || ''}\n`;
  content += `  Age/Sex: ${age != null ? `${age} years` : 'Unknown'} / ${patient.gender || 'Unknown'}\n`;
  if (patient.bloodGroup) content += `  Blood Group: ${patient.bloodGroup}${patient.genotype ? ` | Genotype: ${patient.genotype}` : ''}\n`;
  // "NKDA" only when somebody recorded it — an unasked question is not a negative.
  content += `  Allergies: ${facts.allergies.status === 'documented' ? facts.allergies.items.join(', ')
    : facts.allergies.status === 'nkda' ? 'NKDA (documented)' : 'NOT DOCUMENTED — confirm before prescribing'}\n`;
  const presentConds = [...facts.conditions.values()].filter(c => c.presence === 'present' && c.id !== 'pressure_injury');
  const negatives = [...facts.conditions.values()].filter(c => c.presence === 'absent');
  if (presentConds.length) content += `  Comorbidities: ${presentConds.map(c => `${c.label}${c.detail ? ` (${c.detail})` : ''}`).join('; ')}\n`;
  if (facts.riskFactors.length) content += `  Risk factors: ${facts.riskFactors.join('; ')}\n`;
  if (negatives.length) content += `  Relevant negatives: no ${negatives.map(c => c.label.toLowerCase()).join(', no ')}\n`;
  content += '\n';

  // ── Admission ──
  if (latestAdmission) {
    content += `**ADMISSION DETAILS**\n  Ward: ${ward}\n`;
    if (admissionDate) content += `  Date of Admission: ${fmt(admissionDate, 'dd MMM yyyy')}\n`;
    if (los > 0) content += `  Length of Stay: Day ${los}\n`;
    if (latestAdmission.admissionDiagnosis) content += `  Admitting Diagnosis: ${latestAdmission.admissionDiagnosis}\n`;
    content += '\n';
  }

  // ── Diagnosis ──
  content += `**DIAGNOSIS**\n`;
  content += diagnoses.length ? diagnoses.map((dx, i) => `  ${i === 0 ? 'Primary' : `Secondary (${i})`}: ${dx}\n`).join('') : '  Not yet specified\n';
  content += '\n';

  // ── Presenting complaint ──
  const presenting = facts.complaints.length
    ? facts.complaints.map(c => `${c.label}${c.duration ? ` — ${c.duration}` : ''}`).join('; ')
    : latestAdmission?.chiefComplaint || '';
  if (presenting) content += `**PRESENTING COMPLAINT / HISTORY OF PRESENTING ILLNESS**\n${presenting}\n\n`;

  // ── Encounters (full text) ──
  if (encounters.length) {
    content += `**CLINICAL ENCOUNTERS** (${encounters.length})\n${'─'.repeat(40)}\n`;
    encounters.forEach((e, i) => {
      const kind = e.clerking ? `${e.clerking.kind === 'initial' ? 'Structured clerking' : 'Structured follow-up'} (${e.clerking.status.replace(/_/g, ' ')})` : e.type.replace(/_/g, ' ');
      content += `\n  [${i + 1}] ${kind} — ${fmt(e.createdAt, 'dd/MM/yyyy HH:mm')}${e.clerking?.createdByName ? ` — ${e.clerking.createdByName}` : ''}\n`;
      if (e.chiefComplaint) content += `      Complaint: ${e.chiefComplaint}\n`;
      if (e.diagnosis?.length) content += `      Diagnosis: ${e.diagnosis.map(d => d.description).join('; ')}\n`;
      if (e.treatmentPlan) content += `      Plan: ${e.treatmentPlan.replace(/\n/g, '; ')}\n`;
      if (e.notes) content += `      ${e.notes.replace(/\n/g, ' ')}\n`;
    });
    content += '\n';
  }

  // ── Ward rounds ──
  if (rounds.length) {
    content += `**WARD ROUND NOTES** (${rounds.length})\n${'─'.repeat(40)}\n`;
    rounds.forEach((r, i) => {
      content += `\n  [${i + 1}] ${r.roundType || 'Routine'} Round — ${fmt(r.date, 'dd/MM/yyyy')}${r.doctor ? ` — ${r.doctor}` : ''}\n`;
      if (r.diagnosis) content += `      Diagnosis: ${r.diagnosis}\n`;
      if (r.notes) content += `      Notes: ${r.notes}\n`;
      if (r.orders?.length) content += `      Orders: ${r.orders.join('; ')}\n`;
    });
    content += '\n';
  }

  // ── Vital signs ──
  const vitalTrends: VitalTrend[] = [];
  const latestV = vitals[0], prevV = vitals[1];
  const dir = (a?: number, b?: number): VitalTrend['direction'] => (a == null || b == null ? 'unknown' : a > b ? 'rising' : a < b ? 'falling' : 'stable');
  if (latestV) {
    const parts: string[] = [];
    const arrow = (d: VitalTrend['direction']) => (d === 'rising' ? ' ↑' : d === 'falling' ? ' ↓' : '');
    if (latestV.temperature) {
      const d = dir(latestV.temperature, prevV?.temperature);
      parts.push(`Temp: ${latestV.temperature}°C${arrow(d)}`);
      vitalTrends.push({ parameter: 'Temperature', current: `${latestV.temperature}°C`, previous: prevV?.temperature ? `${prevV.temperature}°C` : undefined, direction: d, alert: latestV.temperature >= 38 ? 'Febrile' : latestV.temperature < 36 ? 'Hypothermia' : undefined });
    }
    if (latestV.pulse) {
      const d = dir(latestV.pulse, prevV?.pulse);
      parts.push(`PR: ${latestV.pulse} bpm${arrow(d)}`);
      vitalTrends.push({ parameter: 'Heart Rate', current: `${latestV.pulse} bpm`, previous: prevV?.pulse ? `${prevV.pulse} bpm` : undefined, direction: d, alert: latestV.pulse > 100 ? 'Tachycardia' : latestV.pulse < 60 ? 'Bradycardia' : undefined });
    }
    if (latestV.bloodPressureSystolic && latestV.bloodPressureDiastolic) {
      parts.push(`BP: ${latestV.bloodPressureSystolic}/${latestV.bloodPressureDiastolic} mmHg`);
      vitalTrends.push({ parameter: 'Blood Pressure', current: `${latestV.bloodPressureSystolic}/${latestV.bloodPressureDiastolic}`, previous: prevV?.bloodPressureSystolic ? `${prevV.bloodPressureSystolic}/${prevV.bloodPressureDiastolic}` : undefined, direction: dir(latestV.bloodPressureSystolic, prevV?.bloodPressureSystolic), alert: latestV.bloodPressureSystolic >= 140 ? 'Hypertension' : latestV.bloodPressureSystolic < 90 ? 'Hypotension' : undefined });
    }
    if (latestV.respiratoryRate) {
      parts.push(`RR: ${latestV.respiratoryRate}/min`);
      vitalTrends.push({ parameter: 'Respiratory Rate', current: `${latestV.respiratoryRate}/min`, direction: 'unknown', alert: latestV.respiratoryRate > 20 ? 'Tachypnea' : undefined });
    }
    if (latestV.oxygenSaturation) {
      parts.push(`SpO2: ${latestV.oxygenSaturation}%`);
      vitalTrends.push({ parameter: 'SpO2', current: `${latestV.oxygenSaturation}%`, previous: prevV?.oxygenSaturation ? `${prevV.oxygenSaturation}%` : undefined, direction: dir(latestV.oxygenSaturation, prevV?.oxygenSaturation), alert: latestV.oxygenSaturation < 94 ? 'Hypoxemia' : undefined });
    }
    content += `**VITAL SIGNS** (Latest: ${fmt(latestV.recordedAt, 'dd/MM/yyyy HH:mm') || 'Recent'})\n  ${parts.join('  |  ')}\n`;
    const alerts = vitalTrends.filter(v => v.alert);
    if (alerts.length) content += `  ⚠ Abnormal: ${alerts.map(a => `${a.alert} (${a.current})`).join(', ')}\n`;
    content += '\n';
  }

  // ── Investigations ──
  const invName = (i: Investigation) => i.name || i.typeName || String(i.type);
  const pendingInvestigations = investigations.filter(i => PENDING_INV.includes(i.status)).map(invName);
  if (investigations.length) {
    content += `**INVESTIGATIONS & RESULTS** (${investigations.length})\n`;
    const done = investigations.filter(i => i.status === 'completed')
      .sort((a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime());
    if (done.length) {
      content += '  Results:\n';
      done.slice(0, 15).forEach(i => {
        const r = (i.results || []).map(x => `${x.parameterName || x.parameter || ''} ${x.value}${x.unit ? ` ${x.unit}` : ''}`.trim()).join(', ');
        content += `    [${fmt(i.completedAt || i.updatedAt, 'dd/MM')}] ${invName(i)}${r ? `: ${r}` : i.interpretation ? `: ${i.interpretation}` : ' — reported'}\n`;
      });
    }
    if (pendingInvestigations.length) content += `  Pending (${pendingInvestigations.length}): ${pendingInvestigations.join(', ')}\n`;
    content += '\n';
  }

  // ── Medications ──
  if (meds.length) content += `**CURRENT MEDICATIONS** (${meds.length})\n${meds.map((m, i) => `  ${i + 1}. ${m}\n`).join('')}\n`;

  // ── Surgery ──
  if (surgeries.length) {
    content += `**SURGICAL HISTORY / BOOKINGS** (${surgeries.length})\n`;
    surgeries.forEach((s, i) => {
      content += `  ${i + 1}. [${fmt(s.scheduledDate, 'dd/MM/yyyy') || 'TBD'}] ${s.procedureName || 'Procedure'}${s.anaesthesiaType ? ` under ${s.anaesthesiaType}` : ''} — ${String(s.status || 'planned').toUpperCase()}\n`;
    });
    content += '\n';
  }

  // ── Findings ──
  const latestVitalsForFindings = latestV
    ? { temperature: latestV.temperature, pulse: latestV.pulse, bp_systolic: latestV.bloodPressureSystolic, spo2: latestV.oxygenSaturation, respiratory_rate: latestV.respiratoryRate }
    : undefined;
  const findings = buildFindings(facts, latestVitalsForFindings, numericLabs(investigations));

  // ── Approved plan progress ──
  const plans = src.scribe?.plans || [];
  const actions = src.scribe?.actions || [];
  const approved = plans.find(p => p.status === 'approved');
  const approvedItems = approved ? flattenPlan(approved.approvedPlan || approved.plan).filter(i => i.actionable) : [];
  const approvedActs = approved ? actions.filter(a => a.scribePlanId === approved.id) : [];
  const states = approvedItems.map(i => ({ i, s: itemState(approvedActs.filter(a => a.itemKey === i.key)) }));
  const doneN = states.filter(x => x.s.tone === 'done').length;

  // ── Key points ──
  const keyPoints: string[] = [];
  if (primaryDiagnosis !== 'Not specified') keyPoints.push(`Diagnosis: ${primaryDiagnosis}`);
  if (facts.complaints.length) keyPoints.push(`Presenting complaint: ${facts.complaints.map(c => `${c.label}${c.duration ? ` (${c.duration})` : ''}`).join('; ')}`);
  presentConds.forEach(c => keyPoints.push(`${c.label}${c.detail ? ` (${c.detail})` : ''}`));
  if (facts.allergies.status === 'not_documented') keyPoints.push('!! Allergy status not documented');
  if (approved) {
    keyPoints.push(`Approved plan v${approved.version}: ${doneN}/${approvedItems.length} items implemented`);
    const last = approvedActs[0];
    if (last) keyPoints.push(`Last action: ${last.itemText || last.itemKey} — ${last.status.replace(/_/g, ' ')} by ${last.userName || 'Unknown'} (${fmt(last.loggedAt, 'dd/MM HH:mm')})`);
  } else if (plans.some(p => p.status === 'pending_approval')) {
    keyPoints.push('Treatment plan awaiting consultant approval');
  }
  const urgentOutstanding = scribePlan.carriedOver.filter(i => i.priority === 'urgent').length;
  if (urgentOutstanding) keyPoints.push(`!! ${urgentOutstanding} urgent plan item(s) outstanding`);
  if (ward) keyPoints.push(`Ward: ${ward}`);
  if (los > 0) keyPoints.push(`Length of Stay: ${los} day(s)`);
  if (patient.bloodGroup) keyPoints.push(`Blood Group: ${patient.bloodGroup}`);
  if (encounters.length) keyPoints.push(`Encounters: ${encounters.length}`);
  if (rounds.length) keyPoints.push(`Ward Rounds: ${rounds.length}`);
  if (meds.length) keyPoints.push(`Active Medications: ${meds.length}`);
  if (surgeries.length) keyPoints.push(`Surgeries/Bookings: ${surgeries.length}`);
  vitalTrends.forEach(v => { if (v.alert) keyPoints.push(`!! ${v.alert}: ${v.current}`); });
  findings.filter(f => f.severity === 'critical').forEach(f => keyPoints.push(`CRITICAL: ${f.finding}`));

  // ── Problems and plan ──
  const currentProblems = facts.problems.length
    ? facts.problems.map(p => `${p.label}${p.code ? ` (${p.code})` : ''}${p.status && p.status !== 'active' ? ` — ${p.status.replace(/_/g, ' ')}` : ''}`)
    : ['No active problems documented'];
  const plan: string[] = scribePlan.carriedOver.map(i => `${i.priority === 'urgent' ? '[URGENT] ' : ''}${i.text}`);
  if (rounds[0]?.orders?.length) plan.push(...rounds[0].orders.filter(o => !plan.includes(o)));
  if (pendingInvestigations.length) plan.push(`Awaiting results: ${pendingInvestigations.join(', ')}`);
  if (!plan.length) plan.push('See the draft treatment plan below — awaiting consultant approval');

  content += `**ACTIVE PROBLEM LIST**\n${currentProblems.map((p, i) => `  ${i + 1}. ${p}\n`).join('')}\n`;
  content += `**MANAGEMENT PLAN**\n${plan.map((p, i) => `  ${i + 1}. ${p}\n`).join('')}\n`;

  if (findings.length) {
    content += `**CLINICAL RECOMMENDATIONS** (${findings.length} findings)\n`;
    findings.forEach(f => {
      content += `  [${f.severity === 'critical' ? 'CRITICAL' : f.severity === 'warning' ? 'CAUTION' : 'NOTE'}] ${f.specialty}: ${f.finding}\n    → ${f.recommendation}\n`;
    });
    content += '\n';
  }

  // ── Approved plan: what has been done, by whom, when and where ──
  if (approved) {
    content += `**APPROVED TREATMENT PLAN — IMPLEMENTATION** (v${approved.version}, approved by ${approved.reviewedByName || 'consultant'}; ${doneN}/${approvedItems.length} done)\n`;
    states.forEach(({ i, s: x }) => {
      const l = x.last;
      const who = l ? ` — ${l.userName || 'Unknown'}, ${fmt(l.loggedAt, 'dd/MM HH:mm')}, ${l.locationLabel || 'place not named'}` : '';
      const extra = l?.prescription ? ` [Rx ${l.prescription.drug} ${l.prescription.dose} ${String(l.prescription.frequency || '').toUpperCase()}]`
        : l?.result ? ` [Result: ${[l.result.value, l.result.unit].filter(Boolean).join(' ')}${l.result.text ? ` ${l.result.text}` : ''}]` : '';
      content += `  [${x.label.toUpperCase()}] ${i.text}${extra}${who}${l?.note ? ` — "${l.note}"` : ''}\n`;
    });
    content += '\n';
  }

  // ── Draft plan ──
  content += `**DRAFT TREATMENT PLAN — FOR CONSULTANT APPROVAL**\n`;
  scribePlan.problems.forEach((pp, i) => {
    content += `  ${i + 1}. ${pp.problem}${pp.code ? ` (${pp.code})` : ''}\n`;
    const sec = (t: string, xs: { text: string; priority?: string }[]) => {
      if (!xs.length) return;
      content += `     ${t}:\n${xs.map(x => `       - ${x.priority === 'urgent' ? '[URGENT] ' : ''}${x.text}\n`).join('')}`;
    };
    sec('Goals', pp.goals); sec('Investigations', pp.investigations); sec('Treatment', pp.treatment);
    sec('Monitoring', pp.monitoring); sec('Referrals', pp.referrals);
  });
  scribePlan.comorbidities.forEach(c => { content += `  • ${c.condition}: ${c.actions.map(a => a.text).join('; ')}\n`; });
  scribePlan.general.forEach(g => { content += `  ${g.heading}: ${g.items.map(i => i.text).join('; ')}\n`; });
  if (scribePlan.carriedOver.length) content += `  Outstanding from clerking: ${scribePlan.carriedOver.map(i => i.text).join('; ')}\n`;
  content += `  Discharge criteria: ${scribePlan.dischargeCriteria.join('; ')}\n`;
  if (scribePlan.cautions.length) content += `  ⚠ ${scribePlan.cautions.join(' ⚠ ')}\n`;
  content += `\n${line}\n**Scribe Note** — Auto-generated ${format(now, 'dd/MM/yyyy HH:mm')}\n`;
  content += `Reviewed by: ____________________  Signature: ____________________\n${line}\n`;

  return {
    content, keyPoints: keyPoints.length ? keyPoints : ['Patient data loaded'], currentProblems,
    medications: meds.length ? meds : ['No active medications'], pendingInvestigations, plan,
    findings, vitalTrends, scribePlan, facts, place: ward || undefined,
  };
}
