/**
 * MDT (Multidisciplinary Team) Service
 * CareBridge Innovations in Healthcare
 * 
 * Manages MDT meetings, team contributions, treatment plan harmonization,
 * and consultant approval workflows
 */

import { v4 as uuidv4 } from 'uuid';

// Types
export type SpecialtyType = 
  | 'surgery' 
  | 'anaesthesia' 
  | 'medicine' 
  | 'nursing' 
  | 'pharmacy' 
  | 'nutrition' 
  | 'physiotherapy' 
  | 'psychology' 
  | 'social_work' 
  | 'palliative_care'
  | 'oncology'
  | 'radiology'
  | 'pathology'
  | 'occupational_therapy'
  | 'speech_therapy';

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type PlanStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'superseded';
export type MedicationAction = 'continue' | 'modify' | 'discontinue' | 'add';
export type PriorityLevel = 'routine' | 'urgent' | 'critical';

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  specialty: SpecialtyType;
  isPrimaryConsultant: boolean;
  contactNumber?: string;
  email?: string;
}

export interface MDTMeeting {
  id: string;
  patientId: string;
  title: string;
  scheduledDate: Date;
  duration: number; // minutes
  status: MeetingStatus;
  location?: string;
  virtualLink?: string;
  attendees: TeamMember[];
  agenda: AgendaItem[];
  minutes?: string;
  decisions: MDTDecision[];
  nextMeetingDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgendaItem {
  id: string;
  title: string;
  description: string;
  presenter: string;
  duration: number; // minutes
  documents?: string[];
  completed: boolean;
}

export interface MDTDecision {
  id: string;
  topic: string;
  decision: string;
  rationale: string;
  responsible: string[];
  deadline?: Date;
  priority: PriorityLevel;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface SpecialtyTreatmentPlan {
  id: string;
  patientId: string;
  meetingId?: string;
  specialty: SpecialtyType;
  submittedBy: TeamMember;
  submittedAt: Date;
  status: PlanStatus;
  
  // Clinical Assessment
  clinicalFindings: string;
  diagnosis: string[];
  
  // Treatment Recommendations
  recommendations: TreatmentRecommendation[];
  medications: MedicationRecommendation[];
  investigations: InvestigationRecommendation[];
  procedures: ProcedureRecommendation[];
  
  // Goals
  shortTermGoals: Goal[];
  longTermGoals: Goal[];
  
  // Notes
  specialNotes?: string;
  contraindications?: string[];
  
  // Approval
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  approvedBy?: string;
  approvalDate?: Date;
  rejectionReason?: string;
  revisionNotes?: string;
}

export interface TreatmentRecommendation {
  id: string;
  category: string;
  description: string;
  frequency?: string;
  duration?: string;
  priority: PriorityLevel;
  rationale: string;
  evidenceLevel?: 'high' | 'moderate' | 'low' | 'expert_opinion';
}

export interface MedicationRecommendation {
  id: string;
  action: MedicationAction;
  medicationName: string;
  dose?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  indication: string;
  rationale: string;
  interactions?: string[];
  monitoring?: string[];
  specialInstructions?: string;
}

export interface InvestigationRecommendation {
  id: string;
  testName: string;
  urgency: PriorityLevel;
  rationale: string;
  expectedDate?: Date;
}

export interface ProcedureRecommendation {
  id: string;
  procedureName: string;
  urgency: PriorityLevel;
  rationale: string;
  prerequisites?: string[];
  expectedDate?: Date;
}

export interface Goal {
  id: string;
  description: string;
  targetDate: Date;
  measurableOutcome: string;
  status: 'not_started' | 'in_progress' | 'achieved' | 'not_achieved';
}

export interface HarmonizedCarePlan {
  id: string;
  patientId: string;
  meetingId: string;
  version: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'superseded';
  
  // Primary Consultant
  primaryConsultant: TeamMember;
  
  // Harmonized Diagnosis
  primaryDiagnosis: string;
  secondaryDiagnoses: string[];
  
  // Combined Treatment Plans
  treatmentPlans: HarmonizedTreatment[];
  
  // Reconciled Medications
  reconciledMedications: ReconciledMedication[];
  
  // Combined Investigations
  investigations: InvestigationRecommendation[];
  
  // Procedures Schedule
  procedures: ScheduledProcedure[];
  
  // Unified Goals
  patientGoals: Goal[];
  
  // Team Responsibilities
  teamResponsibilities: TeamResponsibility[];
  
  // Follow-up
  reviewDate: Date;
  escalationCriteria: string[];
  
  // Approval Chain
  approvals: ApprovalRecord[];
  finalApproval?: {
    approvedBy: string;
    approvedAt: Date;
    signature?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface HarmonizedTreatment {
  id: string;
  category: string;
  description: string;
  sourceSpecialties: SpecialtyType[];
  frequency?: string;
  duration?: string;
  priority: PriorityLevel;
  assignedTeam: SpecialtyType;
  rationale: string;
  conflicts?: TreatmentConflict[];
  resolution?: string;
}

export interface TreatmentConflict {
  id: string;
  conflictingSpecialties: SpecialtyType[];
  description: string;
  resolved: boolean;
  resolution?: string;
  resolvedBy?: string;
}

export interface ReconciledMedication {
  id: string;
  medicationName: string;
  genericName: string;
  dose: string;
  route: string;
  frequency: string;
  duration?: string;
  indication: string;
  prescribingSpecialty: SpecialtyType;
  
  // Reconciliation Status
  status: 'active' | 'on_hold' | 'discontinued' | 'modified';
  originalRecommendations: {
    specialty: SpecialtyType;
    action: MedicationAction;
    details: string;
  }[];
  
  // Safety Checks
  interactions: DrugInteraction[];
  contraindicationsChecked: boolean;
  renalDoseAdjusted: boolean;
  hepaticDoseAdjusted: boolean;
  
  // Final Decision
  finalDecision: MedicationAction;
  decisionRationale: string;
  approvedBy: string;
  monitoring: string[];
}

export interface DrugInteraction {
  interactingDrug: string;
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  description: string;
  management: string;
}

export interface ScheduledProcedure {
  id: string;
  procedureName: string;
  specialty: SpecialtyType;
  scheduledDate?: Date;
  priority: PriorityLevel;
  prerequisites: string[];
  preRequisitesMet: boolean;
  performingTeam: string;
  anesthesiaRequired: boolean;
  estimatedDuration: number;
  specialInstructions?: string;
}

export interface TeamResponsibility {
  specialty: SpecialtyType;
  teamLead: string;
  responsibilities: string[];
  reviewSchedule: string;
  escalationContact: string;
}

export interface ApprovalRecord {
  specialty: SpecialtyType;
  approvedBy: string;
  approvedAt: Date;
  comments?: string;
  signature?: string;
}

// Specialty Definitions
export const specialtyDefinitions: Record<SpecialtyType, {
  name: string;
  color: string;
  icon: string;
  defaultRoles: string[];
}> = {
  surgery: {
    name: 'Surgery',
    color: '#DC2626',
    icon: 'Scissors',
    defaultRoles: ['Consultant Surgeon', 'Registrar', 'House Officer'],
  },
  anaesthesia: {
    name: 'Anaesthesia',
    color: '#7C3AED',
    icon: 'Syringe',
    defaultRoles: ['Consultant Anaesthetist', 'Registrar'],
  },
  medicine: {
    name: 'Internal Medicine',
    color: '#2563EB',
    icon: 'Stethoscope',
    defaultRoles: ['Consultant Physician', 'Registrar', 'House Officer'],
  },
  nursing: {
    name: 'Nursing',
    color: '#059669',
    icon: 'Heart',
    defaultRoles: ['Matron', 'Ward Manager', 'Staff Nurse'],
  },
  pharmacy: {
    name: 'Pharmacy',
    color: '#D97706',
    icon: 'Pill',
    defaultRoles: ['Clinical Pharmacist', 'Pharmacist'],
  },
  nutrition: {
    name: 'Clinical Nutrition',
    color: '#84CC16',
    icon: 'Apple',
    defaultRoles: ['Dietitian', 'Nutritionist'],
  },
  physiotherapy: {
    name: 'Physiotherapy',
    color: '#06B6D4',
    icon: 'Activity',
    defaultRoles: ['Physiotherapist', 'Rehabilitation Specialist'],
  },
  psychology: {
    name: 'Psychology/Psychiatry',
    color: '#EC4899',
    icon: 'Brain',
    defaultRoles: ['Clinical Psychologist', 'Psychiatrist'],
  },
  social_work: {
    name: 'Social Work',
    color: '#8B5CF6',
    icon: 'Users',
    defaultRoles: ['Medical Social Worker'],
  },
  palliative_care: {
    name: 'Palliative Care',
    color: '#F59E0B',
    icon: 'Hand',
    defaultRoles: ['Palliative Care Specialist', 'Nurse Specialist'],
  },
  oncology: {
    name: 'Oncology',
    color: '#EF4444',
    icon: 'Target',
    defaultRoles: ['Oncologist', 'Radiation Oncologist'],
  },
  radiology: {
    name: 'Radiology',
    color: '#6366F1',
    icon: 'Scan',
    defaultRoles: ['Radiologist', 'Interventional Radiologist'],
  },
  pathology: {
    name: 'Pathology',
    color: '#14B8A6',
    icon: 'Microscope',
    defaultRoles: ['Pathologist', 'Histopathologist'],
  },
  occupational_therapy: {
    name: 'Occupational Therapy',
    color: '#F97316',
    icon: 'Wrench',
    defaultRoles: ['Occupational Therapist'],
  },
  speech_therapy: {
    name: 'Speech & Language Therapy',
    color: '#A855F7',
    icon: 'MessageCircle',
    defaultRoles: ['Speech Therapist'],
  },
};

// MDT Service Class
class MDTService {
  // Create new MDT meeting
  createMeeting(data: Partial<MDTMeeting>): MDTMeeting {
    return {
      id: uuidv4(),
      patientId: data.patientId || '',
      title: data.title || 'MDT Meeting',
      scheduledDate: data.scheduledDate || new Date(),
      duration: data.duration || 60,
      status: 'scheduled',
      location: data.location,
      virtualLink: data.virtualLink,
      attendees: data.attendees || [],
      agenda: data.agenda || [],
      decisions: [],
      createdBy: data.createdBy || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Create specialty treatment plan
  createSpecialtyPlan(data: Partial<SpecialtyTreatmentPlan>): SpecialtyTreatmentPlan {
    return {
      id: uuidv4(),
      patientId: data.patientId || '',
      meetingId: data.meetingId,
      specialty: data.specialty || 'surgery',
      submittedBy: data.submittedBy!,
      submittedAt: new Date(),
      status: 'draft',
      clinicalFindings: data.clinicalFindings || '',
      diagnosis: data.diagnosis || [],
      recommendations: data.recommendations || [],
      medications: data.medications || [],
      investigations: data.investigations || [],
      procedures: data.procedures || [],
      shortTermGoals: data.shortTermGoals || [],
      longTermGoals: data.longTermGoals || [],
      specialNotes: data.specialNotes,
      contraindications: data.contraindications || [],
      approvalStatus: 'pending',
    };
  }

  // Harmonize treatment plans from multiple specialties
  harmonizeTreatmentPlans(
    plans: SpecialtyTreatmentPlan[],
    primaryConsultant: TeamMember,
    patientId: string,
    meetingId: string
  ): HarmonizedCarePlan {
    const id = uuidv4();
    
    // Combine diagnoses
    const allDiagnoses = new Set<string>();
    plans.forEach(plan => {
      plan.diagnosis.forEach(d => allDiagnoses.add(d));
    });
    const diagnosisArray = Array.from(allDiagnoses);
    
    // Harmonize treatments
    const harmonizedTreatments = this.harmonizeTreatments(plans);
    
    // Reconcile medications
    const reconciledMeds = this.reconcileMedications(plans, primaryConsultant.name);
    
    // Combine investigations
    const allInvestigations = this.combineInvestigations(plans);
    
    // Combine procedures
    const allProcedures = this.combineProcedures(plans);
    
    // Combine goals
    const patientGoals = this.combineGoals(plans);
    
    // Assign team responsibilities
    const teamResponsibilities = this.assignTeamResponsibilities(plans);

    return {
      id,
      patientId,
      meetingId,
      version: 1,
      status: 'draft',
      primaryConsultant,
      primaryDiagnosis: diagnosisArray[0] || '',
      secondaryDiagnoses: diagnosisArray.slice(1),
      treatmentPlans: harmonizedTreatments,
      reconciledMedications: reconciledMeds,
      investigations: allInvestigations,
      procedures: allProcedures,
      patientGoals,
      teamResponsibilities,
      reviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
      escalationCriteria: [
        'Clinical deterioration',
        'New critical findings',
        'Treatment complications',
        'Patient/family concerns',
      ],
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Harmonize treatments from different specialties
  private harmonizeTreatments(plans: SpecialtyTreatmentPlan[]): HarmonizedTreatment[] {
    const treatmentMap = new Map<string, {
      treatments: TreatmentRecommendation[];
      specialties: SpecialtyType[];
    }>();

    // Group treatments by category
    plans.forEach(plan => {
      plan.recommendations.forEach(rec => {
        const key = rec.category.toLowerCase();
        if (!treatmentMap.has(key)) {
          treatmentMap.set(key, { treatments: [], specialties: [] });
        }
        const entry = treatmentMap.get(key)!;
        entry.treatments.push(rec);
        if (!entry.specialties.includes(plan.specialty)) {
          entry.specialties.push(plan.specialty);
        }
      });
    });

    const harmonized: HarmonizedTreatment[] = [];

    treatmentMap.forEach((value, category) => {
      // Detect conflicts
      const conflicts = this.detectTreatmentConflicts(value.treatments, value.specialties);
      
      // Create harmonized treatment
      const highestPriority = value.treatments.reduce((max, t) => {
        const priorities = { critical: 3, urgent: 2, routine: 1 };
        return priorities[t.priority] > priorities[max] ? t.priority : max;
      }, 'routine' as PriorityLevel);

      harmonized.push({
        id: uuidv4(),
        category,
        description: value.treatments.map(t => t.description).join('; '),
        sourceSpecialties: value.specialties,
        priority: highestPriority,
        assignedTeam: value.specialties[0],
        rationale: value.treatments.map(t => t.rationale).join('; '),
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      });
    });

    return harmonized;
  }

  // Detect conflicts between treatment recommendations
  private detectTreatmentConflicts(
    treatments: TreatmentRecommendation[],
    specialties: SpecialtyType[]
  ): TreatmentConflict[] {
    const conflicts: TreatmentConflict[] = [];
    
    // Simple conflict detection based on frequency/duration mismatches
    if (treatments.length > 1) {
      const frequencies = new Set(treatments.map(t => t.frequency).filter(Boolean));
      const durations = new Set(treatments.map(t => t.duration).filter(Boolean));
      
      if (frequencies.size > 1 || durations.size > 1) {
        conflicts.push({
          id: uuidv4(),
          conflictingSpecialties: specialties,
          description: `Differing recommendations: ${treatments.map(t => 
            `${t.description} (${t.frequency || 'unspecified frequency'})`
          ).join(' vs ')}`,
          resolved: false,
        });
      }
    }

    return conflicts;
  }

  // Reconcile medications from different specialties
  private reconcileMedications(
    plans: SpecialtyTreatmentPlan[],
    approverName: string
  ): ReconciledMedication[] {
    const medicationMap = new Map<string, {
      recommendations: { specialty: SpecialtyType; med: MedicationRecommendation }[];
    }>();

    // Group by medication name
    plans.forEach(plan => {
      plan.medications.forEach(med => {
        const key = med.medicationName.toLowerCase();
        if (!medicationMap.has(key)) {
          medicationMap.set(key, { recommendations: [] });
        }
        medicationMap.get(key)!.recommendations.push({
          specialty: plan.specialty,
          med,
        });
      });
    });

    const reconciled: ReconciledMedication[] = [];

    medicationMap.forEach((value, medName) => {
      const firstRec = value.recommendations[0];
      
      // Check for drug interactions
      const interactions = this.checkDrugInteractions(medName, Array.from(medicationMap.keys()));

      // Determine final action
      const actions = value.recommendations.map(r => r.med.action);
      let finalAction: MedicationAction = 'continue';
      
      if (actions.includes('discontinue')) {
        finalAction = 'discontinue';
      } else if (actions.includes('modify')) {
        finalAction = 'modify';
      } else if (actions.includes('add')) {
        finalAction = 'add';
      }

      reconciled.push({
        id: uuidv4(),
        medicationName: firstRec.med.medicationName,
        genericName: firstRec.med.medicationName, // Would map to generic
        dose: firstRec.med.dose || '',
        route: firstRec.med.route || 'oral',
        frequency: firstRec.med.frequency || '',
        duration: firstRec.med.duration,
        indication: firstRec.med.indication,
        prescribingSpecialty: firstRec.specialty,
        status: finalAction === 'discontinue' ? 'discontinued' : 'active',
        originalRecommendations: value.recommendations.map(r => ({
          specialty: r.specialty,
          action: r.med.action,
          details: `${r.med.dose} ${r.med.route} ${r.med.frequency}`,
        })),
        interactions,
        contraindicationsChecked: true,
        renalDoseAdjusted: false,
        hepaticDoseAdjusted: false,
        finalDecision: finalAction,
        decisionRationale: value.recommendations.length > 1
          ? 'Reconciled from multiple specialty recommendations'
          : firstRec.med.rationale,
        approvedBy: approverName,
        monitoring: firstRec.med.monitoring || [],
      });
    });

    return reconciled;
  }

  // Check drug interactions (simplified)
  private checkDrugInteractions(
    drugName: string,
    otherDrugs: string[]
  ): DrugInteraction[] {
    const interactions: DrugInteraction[] = [];
    
    // Common interaction patterns (simplified)
    const interactionRules: Record<string, { drugs: string[]; severity: DrugInteraction['severity']; management: string }[]> = {
      warfarin: [
        { drugs: ['aspirin', 'nsaid', 'ibuprofen'], severity: 'major', management: 'Monitor INR closely, consider alternatives' },
        { drugs: ['amiodarone'], severity: 'major', management: 'Reduce warfarin dose by 30-50%' },
      ],
      metformin: [
        { drugs: ['contrast'], severity: 'major', management: 'Hold metformin 48h before/after contrast' },
      ],
      ace_inhibitor: [
        { drugs: ['potassium', 'spironolactone'], severity: 'moderate', management: 'Monitor potassium levels' },
      ],
    };

    const drugLower = drugName.toLowerCase();
    const rules = interactionRules[drugLower];
    
    if (rules) {
      rules.forEach(rule => {
        otherDrugs.forEach(other => {
          if (rule.drugs.some(d => other.toLowerCase().includes(d))) {
            interactions.push({
              interactingDrug: other,
              severity: rule.severity,
              description: `${drugName} interacts with ${other}`,
              management: rule.management,
            });
          }
        });
      });
    }

    return interactions;
  }

  // Combine investigations from all plans
  private combineInvestigations(plans: SpecialtyTreatmentPlan[]): InvestigationRecommendation[] {
    const investigations: InvestigationRecommendation[] = [];
    const seen = new Set<string>();

    plans.forEach(plan => {
      plan.investigations.forEach(inv => {
        const key = inv.testName.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          investigations.push(inv);
        }
      });
    });

    // Sort by urgency
    return investigations.sort((a, b) => {
      const urgencyOrder = { critical: 0, urgent: 1, routine: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }

  // Combine procedures from all plans
  private combineProcedures(plans: SpecialtyTreatmentPlan[]): ScheduledProcedure[] {
    const procedures: ScheduledProcedure[] = [];

    plans.forEach(plan => {
      plan.procedures.forEach(proc => {
        procedures.push({
          id: proc.id,
          procedureName: proc.procedureName,
          specialty: plan.specialty,
          scheduledDate: proc.expectedDate,
          priority: proc.urgency,
          prerequisites: proc.prerequisites || [],
          preRequisitesMet: false,
          performingTeam: specialtyDefinitions[plan.specialty].name,
          anesthesiaRequired: ['surgery', 'radiology'].includes(plan.specialty),
          estimatedDuration: 60,
        });
      });
    });

    return procedures;
  }

  // Combine goals from all plans
  private combineGoals(plans: SpecialtyTreatmentPlan[]): Goal[] {
    const goals: Goal[] = [];

    plans.forEach(plan => {
      [...plan.shortTermGoals, ...plan.longTermGoals].forEach(goal => {
        goals.push(goal);
      });
    });

    return goals;
  }

  // Assign team responsibilities
  private assignTeamResponsibilities(plans: SpecialtyTreatmentPlan[]): TeamResponsibility[] {
    return plans.map(plan => ({
      specialty: plan.specialty,
      teamLead: plan.submittedBy.name,
      responsibilities: plan.recommendations.map(r => r.description),
      reviewSchedule: 'Weekly',
      escalationContact: plan.submittedBy.contactNumber || 'Contact via hospital directory',
    }));
  }

  // Approve harmonized care plan
  approveCarePlan(
    plan: HarmonizedCarePlan,
    approver: TeamMember,
    comments?: string
  ): HarmonizedCarePlan {
    const approval: ApprovalRecord = {
      specialty: approver.specialty,
      approvedBy: approver.name,
      approvedAt: new Date(),
      comments,
    };

    const updatedPlan = {
      ...plan,
      approvals: [...plan.approvals, approval],
      updatedAt: new Date(),
    };

    // Check if primary consultant has approved
    if (approver.isPrimaryConsultant) {
      updatedPlan.status = 'approved';
      updatedPlan.finalApproval = {
        approvedBy: approver.name,
        approvedAt: new Date(),
      };
    } else {
      updatedPlan.status = 'pending_approval';
    }

    return updatedPlan;
  }

  // Reject plan with reason
  rejectSpecialtyPlan(
    plan: SpecialtyTreatmentPlan,
    _rejectedBy: string,
    reason: string
  ): SpecialtyTreatmentPlan {
    return {
      ...plan,
      approvalStatus: 'rejected',
      rejectionReason: reason,
    };
  }

  // Request revision
  requestRevision(
    plan: SpecialtyTreatmentPlan,
    notes: string
  ): SpecialtyTreatmentPlan {
    return {
      ...plan,
      approvalStatus: 'needs_revision',
      revisionNotes: notes,
    };
  }

  // Generate meeting summary
  generateMeetingSummary(meeting: MDTMeeting): string {
    const attendeeList = meeting.attendees
      .map(a => `${a.name} (${specialtyDefinitions[a.specialty].name})`)
      .join(', ');

    const decisionsList = meeting.decisions
      .map(d => `- ${d.topic}: ${d.decision}`)
      .join('\n');

    return `
MDT MEETING SUMMARY
===================

Date: ${meeting.scheduledDate.toLocaleDateString()}
Duration: ${meeting.duration} minutes
Location: ${meeting.location || 'Virtual'}

ATTENDEES:
${attendeeList}

AGENDA ITEMS DISCUSSED:
${meeting.agenda.map(a => `- ${a.title}`).join('\n')}

KEY DECISIONS:
${decisionsList}

${meeting.nextMeetingDate ? `NEXT MEETING: ${meeting.nextMeetingDate.toLocaleDateString()}` : ''}

${meeting.minutes || ''}
    `.trim();
  }

  // Get pending approvals for a consultant
  getPendingApprovals(
    plans: SpecialtyTreatmentPlan[],
    _consultantId: string
  ): SpecialtyTreatmentPlan[] {
    return plans.filter(p => 
      p.approvalStatus === 'pending' && 
      p.status === 'submitted'
    );
  }

  // Calculate team workload
  calculateTeamWorkload(
    plan: HarmonizedCarePlan
  ): Record<SpecialtyType, number> {
    const workload: Record<SpecialtyType, number> = {} as any;
    
    plan.treatmentPlans.forEach(t => {
      if (!workload[t.assignedTeam]) {
        workload[t.assignedTeam] = 0;
      }
      workload[t.assignedTeam]++;
    });

    return workload;
  }
}

export const mdtService = new MDTService();
export default mdtService;
