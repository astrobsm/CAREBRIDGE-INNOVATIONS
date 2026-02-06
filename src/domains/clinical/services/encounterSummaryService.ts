/**
 * AI Encounter Summary Service
 * 
 * Generates comprehensive AI-powered summaries of all patient encounters
 * and clinical documentation using local summarization or API calls.
 */

import { db } from '../../../database';
import type { 
  Patient, 
  ClinicalEncounter, 
  Investigation, 
  Prescription, 
  VitalSign,
  Surgery,
  Admission,
  WardRound,
} from '../../../types';
import { format, differenceInYears } from 'date-fns';

interface PatientClinicalData {
  patient: Patient;
  encounters: ClinicalEncounter[];
  investigations: Investigation[];
  prescriptions: Prescription[];
  vitals: VitalSign[];
  surgeries: Surgery[];
  admissions: Admission[];
  wardRounds: WardRound[];
}

export interface EncounterSummaryResult {
  summary: string;
  keyFindings: string[];
  activeDiagnoses: string[];
  currentMedications: string[];
  pendingInvestigations: string[];
  abnormalResults: string[];
  treatmentProgress: string;
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Fetches all clinical data for a patient
 */
async function fetchPatientClinicalData(patientId: string): Promise<PatientClinicalData | null> {
  const patient = await db.patients.get(patientId);
  if (!patient) return null;

  const [encounters, investigations, prescriptions, vitals, surgeries, admissions, wardRounds] = await Promise.all([
    db.clinicalEncounters.where('patientId').equals(patientId).toArray(),
    db.investigations.where('patientId').equals(patientId).toArray(),
    db.prescriptions.where('patientId').equals(patientId).toArray(),
    db.vitalSigns.where('patientId').equals(patientId).toArray(),
    db.surgeries.where('patientId').equals(patientId).toArray(),
    db.admissions.where('patientId').equals(patientId).toArray(),
    db.wardRounds.where('patientId').equals(patientId).toArray(),
  ]);

  // Sort all by date
  encounters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  investigations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  prescriptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  vitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
  surgeries.sort((a, b) => new Date(b.scheduledDate || b.createdAt).getTime() - new Date(a.scheduledDate || a.createdAt).getTime());
  admissions.sort((a, b) => new Date(b.admissionDate).getTime() - new Date(a.admissionDate).getTime());
  wardRounds.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    patient,
    encounters,
    investigations,
    prescriptions,
    vitals,
    surgeries,
    admissions,
    wardRounds,
  };
}

/**
 * Generates a local summary without external API
 */
function generateLocalSummary(data: PatientClinicalData): EncounterSummaryResult {
  const { patient, encounters, investigations, prescriptions, vitals, surgeries, admissions, wardRounds } = data;

  // Patient demographics
  const age = patient.dateOfBirth 
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : 'Unknown';
  const gender = patient.gender || 'Unknown';

  // Collect all diagnoses from encounters
  const allDiagnoses: string[] = [];
  const activeDiagnoses: string[] = [];
  encounters.forEach(enc => {
    enc.diagnosis?.forEach(d => {
      const diagName = d.name || d.description || '';
      if (diagName && !allDiagnoses.includes(diagName)) {
        allDiagnoses.push(diagName);
      }
      if ((d.status === 'confirmed' || d.status === 'working') && !activeDiagnoses.includes(diagName)) {
        activeDiagnoses.push(diagName);
      }
    });
  });

  // Current medications from active prescriptions
  const currentMedications: string[] = [];
  prescriptions
    .filter(rx => rx.status === 'active')
    .forEach(rx => {
      rx.medications?.forEach(med => {
        const medStr = `${med.name} ${med.dose}${med.unit} ${med.frequency}`;
        if (!currentMedications.includes(medStr)) {
          currentMedications.push(medStr);
        }
      });
    });

  // Pending investigations
  const pendingInvestigations = investigations
    .filter(inv => inv.status !== 'completed')
    .map(inv => inv.typeName || inv.type || 'Unknown test');

  // Abnormal results (simplified detection)
  const abnormalResults: string[] = [];
  investigations
    .filter(inv => inv.status === 'completed' && inv.results)
    .forEach(inv => {
      const results = inv.results?.toLowerCase() || '';
      if (
        results.includes('abnormal') ||
        results.includes('high') ||
        results.includes('low') ||
        results.includes('positive') ||
        results.includes('elevated') ||
        results.includes('decreased')
      ) {
        abnormalResults.push(`${inv.typeName || inv.type}: ${inv.results?.substring(0, 100)}`);
      }
    });

  // Key findings from encounters
  const keyFindings: string[] = [];
  
  // Chief complaints
  const recentComplaints = encounters
    .slice(0, 5)
    .map(enc => enc.chiefComplaint)
    .filter(Boolean);
  if (recentComplaints.length > 0) {
    keyFindings.push(`Chief complaints: ${recentComplaints.join('; ')}`);
  }

  // Surgeries
  if (surgeries.length > 0) {
    const surgeryList = surgeries
      .slice(0, 3)
      .map(s => `${s.procedureName} (${format(new Date(s.scheduledDate || s.createdAt), 'PP')})`);
    keyFindings.push(`Surgical history: ${surgeryList.join(', ')}`);
  }

  // Admissions
  if (admissions.length > 0) {
    const currentAdmission = admissions.find(a => a.status === 'admitted');
    if (currentAdmission) {
      keyFindings.push(`Currently admitted since ${format(new Date(currentAdmission.admissionDate), 'PP')}`);
    }
  }

  // Latest vitals
  if (vitals.length > 0) {
    const latest = vitals[0];
    const vitalStr = [
      latest.bloodPressureSystolic && latest.bloodPressureDiastolic 
        ? `BP ${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic}mmHg`
        : null,
      latest.heartRate ? `HR ${latest.heartRate}bpm` : null,
      latest.temperature ? `Temp ${latest.temperature}°C` : null,
      latest.oxygenSaturation ? `SpO2 ${latest.oxygenSaturation}%` : null,
    ].filter(Boolean).join(', ');
    if (vitalStr) {
      keyFindings.push(`Latest vitals: ${vitalStr}`);
    }
  }

  // Treatment progress from latest encounter
  let treatmentProgress = 'No treatment progress documented.';
  const latestEncounter = encounters[0];
  if (latestEncounter) {
    if (latestEncounter.treatmentPlan) {
      treatmentProgress = latestEncounter.treatmentPlan;
    }
    if (latestEncounter.notes) {
      treatmentProgress += ` Notes: ${latestEncounter.notes.substring(0, 200)}`;
    }
  }

  // Ward round notes
  if (wardRounds.length > 0) {
    const latestRound = wardRounds[0];
    if (latestRound.notes || latestRound.plan) {
      keyFindings.push(`Latest ward round (${format(new Date(latestRound.date), 'PP')}): ${latestRound.notes || latestRound.plan || ''}`);
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (pendingInvestigations.length > 0) {
    recommendations.push(`Follow up on ${pendingInvestigations.length} pending investigation(s)`);
  }
  
  if (abnormalResults.length > 0) {
    recommendations.push(`Review ${abnormalResults.length} abnormal result(s) and consider action`);
  }
  
  if (activeDiagnoses.length > 0 && currentMedications.length === 0) {
    recommendations.push('Consider prescribing medications for active diagnoses');
  }
  
  const lastVitalDate = vitals.length > 0 ? new Date(vitals[0].recordedAt) : null;
  const daysSinceVitals = lastVitalDate 
    ? Math.floor((Date.now() - lastVitalDate.getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
  if (daysSinceVitals > 7) {
    recommendations.push('Update vital signs (last recorded more than a week ago)');
  }

  if (!latestEncounter?.physicalExamination || 
      Object.values(latestEncounter.physicalExamination).every(v => !v)) {
    recommendations.push('Complete physical examination documentation');
  }

  // Build comprehensive summary
  const summaryParts = [
    `${patient.firstName} ${patient.lastName} is a ${age}-year-old ${gender} patient.`,
  ];

  if (activeDiagnoses.length > 0) {
    summaryParts.push(`Active diagnoses include: ${activeDiagnoses.slice(0, 5).join(', ')}.`);
  }

  if (encounters.length > 0) {
    summaryParts.push(`The patient has had ${encounters.length} clinical encounter(s), with the most recent on ${format(new Date(encounters[0].createdAt), 'PPP')}.`);
  }

  if (surgeries.length > 0) {
    summaryParts.push(`Surgical history includes ${surgeries.length} procedure(s).`);
  }

  if (currentMedications.length > 0) {
    summaryParts.push(`Currently on ${currentMedications.length} medication(s).`);
  }

  if (pendingInvestigations.length > 0) {
    summaryParts.push(`There are ${pendingInvestigations.length} pending investigation(s).`);
  }

  if (abnormalResults.length > 0) {
    summaryParts.push(`Notable: ${abnormalResults.length} abnormal investigation result(s) requiring attention.`);
  }

  const summary = summaryParts.join(' ');

  return {
    summary,
    keyFindings,
    activeDiagnoses,
    currentMedications,
    pendingInvestigations,
    abnormalResults,
    treatmentProgress,
    recommendations,
    generatedAt: new Date(),
  };
}

/**
 * Generates an AI-powered summary using external API (if available)
 * Falls back to local summary if API is not configured or fails
 */
export async function generateEncounterSummary(patientId: string): Promise<EncounterSummaryResult> {
  const data = await fetchPatientClinicalData(patientId);
  
  if (!data) {
    throw new Error('Patient not found');
  }

  // Check if we have OpenAI/Anthropic API key configured
  const apiKey = localStorage.getItem('aiApiKey') || 
                 import.meta.env.VITE_OPENAI_API_KEY || 
                 import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    // Use local summarization
    console.log('AI API not configured, using local summarization');
    return generateLocalSummary(data);
  }

  try {
    // Build the prompt
    const prompt = buildAIPrompt(data);
    
    // Try OpenAI first
    if (apiKey.startsWith('sk-')) {
      const response = await callOpenAI(apiKey, prompt);
      return parseAIResponse(response, data);
    }
    
    // Try Anthropic
    if (apiKey.startsWith('sk-ant')) {
      const response = await callAnthropic(apiKey, prompt);
      return parseAIResponse(response, data);
    }

    // Fallback to local
    return generateLocalSummary(data);
  } catch (error) {
    console.error('AI summary failed, falling back to local:', error);
    return generateLocalSummary(data);
  }
}

/**
 * Builds the prompt for AI summarization
 */
function buildAIPrompt(data: PatientClinicalData): string {
  const { patient, encounters, investigations, prescriptions, vitals, surgeries, admissions, wardRounds } = data;

  const age = patient.dateOfBirth 
    ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
    : 'Unknown';

  let prompt = `You are a clinical documentation specialist. Generate a comprehensive medical summary for the following patient. Be concise, professional, and clinically relevant.

PATIENT INFORMATION:
- Name: ${patient.firstName} ${patient.lastName}
- Age: ${age} years
- Gender: ${patient.gender || 'Not specified'}
- Hospital Number: ${patient.hospitalNumber}
`;

  // Add encounters summary
  if (encounters.length > 0) {
    prompt += `\nCLINICAL ENCOUNTERS (${encounters.length} total, showing most recent 5):\n`;
    encounters.slice(0, 5).forEach((enc, i) => {
      prompt += `${i + 1}. ${format(new Date(enc.createdAt), 'PP')} - Type: ${enc.type}
   Chief Complaint: ${enc.chiefComplaint || 'Not documented'}
   Diagnoses: ${enc.diagnosis?.map(d => d.name || d.description).join(', ') || 'None'}
   Treatment Plan: ${enc.treatmentPlan?.substring(0, 200) || 'Not documented'}
`;
    });
  }

  // Add investigations
  if (investigations.length > 0) {
    prompt += `\nINVESTIGATIONS (${investigations.length} total):\n`;
    const pending = investigations.filter(i => i.status !== 'completed');
    const completed = investigations.filter(i => i.status === 'completed').slice(0, 10);
    
    if (pending.length > 0) {
      prompt += `Pending: ${pending.map(i => i.typeName || i.type).join(', ')}\n`;
    }
    
    if (completed.length > 0) {
      prompt += `Recent Results:\n`;
      completed.forEach(inv => {
        prompt += `- ${inv.typeName || inv.type}: ${inv.results || 'No results'}\n`;
      });
    }
  }

  // Add current medications
  const activePrescriptions = prescriptions.filter(rx => rx.status === 'active');
  if (activePrescriptions.length > 0) {
    prompt += `\nCURRENT MEDICATIONS:\n`;
    activePrescriptions.forEach(rx => {
      rx.medications?.forEach(med => {
        prompt += `- ${med.name} ${med.dose}${med.unit} ${med.frequency} for ${med.duration}\n`;
      });
    });
  }

  // Add latest vitals
  if (vitals.length > 0) {
    const latest = vitals[0];
    prompt += `\nLATEST VITAL SIGNS (${format(new Date(latest.recordedAt), 'PP')}):\n`;
    if (latest.bloodPressureSystolic && latest.bloodPressureDiastolic) {
      prompt += `- BP: ${latest.bloodPressureSystolic}/${latest.bloodPressureDiastolic} mmHg\n`;
    }
    if (latest.heartRate) prompt += `- HR: ${latest.heartRate} bpm\n`;
    if (latest.temperature) prompt += `- Temp: ${latest.temperature}°C\n`;
    if (latest.oxygenSaturation) prompt += `- SpO2: ${latest.oxygenSaturation}%\n`;
    if (latest.respiratoryRate) prompt += `- RR: ${latest.respiratoryRate}/min\n`;
  }

  // Add surgeries
  if (surgeries.length > 0) {
    prompt += `\nSURGICAL HISTORY:\n`;
    surgeries.slice(0, 5).forEach(s => {
      prompt += `- ${s.procedureName} on ${format(new Date(s.scheduledDate || s.createdAt), 'PP')} - Status: ${s.status}\n`;
    });
  }

  prompt += `
Please provide:
1. A comprehensive clinical summary (2-3 paragraphs)
2. Key clinical findings (bullet points)
3. Active diagnoses list
4. Clinical recommendations

Format your response as JSON with these keys: summary, keyFindings (array), activeDiagnoses (array), recommendations (array)
`;

  return prompt;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a clinical documentation specialist. Provide accurate, professional medical summaries.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Call Anthropic API
 */
async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

/**
 * Parse AI response into structured format
 */
function parseAIResponse(response: string, data: PatientClinicalData): EncounterSummaryResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        summary: parsed.summary || 'Summary generation failed',
        keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
        activeDiagnoses: Array.isArray(parsed.activeDiagnoses) ? parsed.activeDiagnoses : [],
        currentMedications: [], // Will be filled from data
        pendingInvestigations: [], // Will be filled from data
        abnormalResults: [],
        treatmentProgress: parsed.treatmentProgress || '',
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        generatedAt: new Date(),
      };
    }
  } catch (e) {
    console.error('Failed to parse AI response as JSON:', e);
  }

  // Fallback: treat entire response as summary
  const localSummary = generateLocalSummary(data);
  return {
    ...localSummary,
    summary: response.substring(0, 1500) || localSummary.summary,
  };
}

/**
 * Export summary as formatted text
 */
export function formatSummaryAsText(summary: EncounterSummaryResult): string {
  let text = `CLINICAL ENCOUNTER SUMMARY
Generated: ${format(summary.generatedAt, 'PPPp')}
${'='.repeat(50)}

SUMMARY:
${summary.summary}

KEY FINDINGS:
${summary.keyFindings.map(f => `• ${f}`).join('\n') || '• No key findings documented'}

ACTIVE DIAGNOSES:
${summary.activeDiagnoses.map(d => `• ${d}`).join('\n') || '• No active diagnoses'}

CURRENT MEDICATIONS:
${summary.currentMedications.map(m => `• ${m}`).join('\n') || '• No active medications'}

PENDING INVESTIGATIONS:
${summary.pendingInvestigations.map(i => `• ${i}`).join('\n') || '• No pending investigations'}

ABNORMAL RESULTS:
${summary.abnormalResults.map(r => `• ${r}`).join('\n') || '• No abnormal results flagged'}

TREATMENT PROGRESS:
${summary.treatmentProgress || 'Not documented'}

RECOMMENDATIONS:
${summary.recommendations.map(r => `• ${r}`).join('\n') || '• No specific recommendations'}
`;

  return text;
}
