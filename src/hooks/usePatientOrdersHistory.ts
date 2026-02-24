/**
 * usePatientOrdersHistory Hook
 * 
 * Fetches all related clinical orders (prescriptions, investigations, lab requests,
 * treatment plans) for a patient in chronological order.
 * 
 * Used by prescription, investigation, and other modules to display prior orders
 * before creating new ones — enabling harmonized, non-duplicative care.
 */

import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../database';
import type { Prescription, Investigation, LabRequest } from '../types';

// Types of clinical orders we track
export type OrderType = 'prescription' | 'investigation' | 'lab_request' | 'treatment_plan';

export type OrderStatus = 'active' | 'completed' | 'cancelled' | 'archived' | 'pending';

export interface UnifiedOrderItem {
  id: string;
  orderType: OrderType;
  patientId: string;
  date: Date;
  status: OrderStatus;
  statusRaw: string;
  summary: string;
  details: string[];
  priority?: 'routine' | 'urgent' | 'stat';
  requestedBy?: string;
  // The raw source record
  source: Prescription | Investigation | LabRequest | Record<string, unknown>;
}

export interface PatientOrdersHistory {
  prescriptions: UnifiedOrderItem[];
  investigations: UnifiedOrderItem[];
  labRequests: UnifiedOrderItem[];
  treatmentPlans: UnifiedOrderItem[];
  allOrders: UnifiedOrderItem[];
  activeMedications: UnifiedOrderItem[];
  activeInvestigations: UnifiedOrderItem[];
  isLoading: boolean;
}

function normalizePrescriptionStatus(status: Prescription['status']): OrderStatus {
  switch (status) {
    case 'pending': return 'active';
    case 'dispensed': return 'completed';
    case 'partially_dispensed': return 'active';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function normalizeInvestigationStatus(status: Investigation['status']): OrderStatus {
  switch (status) {
    case 'requested': return 'pending';
    case 'sample_collected': return 'active';
    case 'processing': return 'active';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function normalizeLabStatus(status: LabRequest['status']): OrderStatus {
  switch (status) {
    case 'pending': return 'pending';
    case 'collected': return 'active';
    case 'processing': return 'active';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    default: return 'pending';
  }
}

function prescriptionToUnified(rx: Prescription): UnifiedOrderItem {
  const medNames = rx.medications.map(m => `${m.name} ${m.dosage} ${m.frequency}`);
  return {
    id: rx.id,
    orderType: 'prescription',
    patientId: rx.patientId,
    date: new Date(rx.prescribedAt),
    status: normalizePrescriptionStatus(rx.status),
    statusRaw: rx.status,
    summary: `Prescription — ${rx.medications.length} medication(s)`,
    details: medNames,
    requestedBy: rx.prescribedBy,
    source: rx,
  };
}

function investigationToUnified(inv: Investigation): UnifiedOrderItem {
  return {
    id: inv.id,
    orderType: 'investigation',
    patientId: inv.patientId,
    date: new Date(inv.requestedAt),
    status: normalizeInvestigationStatus(inv.status),
    statusRaw: inv.status,
    summary: `Investigation — ${inv.typeName || inv.type}`,
    details: [
      `Category: ${inv.category}`,
      `Priority: ${inv.priority}`,
      ...(inv.clinicalDetails ? [`Clinical: ${inv.clinicalDetails}`] : []),
      ...(inv.results?.length ? [`Results: ${inv.results.length} parameter(s)`] : []),
    ],
    priority: inv.priority,
    requestedBy: inv.requestedByName || inv.requestedBy,
    source: inv,
  };
}

function labRequestToUnified(lab: LabRequest): UnifiedOrderItem {
  const testNames = lab.tests.map(t => t.name);
  return {
    id: lab.id,
    orderType: 'lab_request',
    patientId: lab.patientId,
    date: new Date(lab.requestedAt),
    status: normalizeLabStatus(lab.status),
    statusRaw: lab.status,
    summary: `Lab Request — ${lab.tests.length} test(s)`,
    details: testNames,
    priority: lab.priority,
    requestedBy: lab.requestedBy,
    source: lab,
  };
}

function treatmentPlanToUnified(tp: Record<string, unknown>): UnifiedOrderItem {
  const name = (tp.planName as string) || (tp.plan_name as string) || 'Treatment Plan';
  const procedures = (tp.procedures as unknown[]) || [];
  const goals = (tp.treatmentGoals as string[]) || (tp.treatment_goals as string[]) || [];
  const status = (tp.status as string) || 'active';

  let normalizedStatus: OrderStatus = 'active';
  if (status === 'completed') normalizedStatus = 'completed';
  else if (status === 'cancelled' || status === 'discontinued') normalizedStatus = 'cancelled';
  else if (status === 'draft') normalizedStatus = 'pending';

  return {
    id: tp.id as string,
    orderType: 'treatment_plan',
    patientId: tp.patientId as string,
    date: new Date((tp.createdAt as string | Date) || Date.now()),
    status: normalizedStatus,
    statusRaw: status,
    summary: `Treatment Plan — ${name}`,
    details: [
      ...(goals.length > 0 ? goals.map(g => `Goal: ${g}`) : []),
      ...(procedures.length > 0 ? [`${procedures.length} procedure(s)`] : []),
    ],
    source: tp,
  };
}

/**
 * Hook to fetch all patient clinical orders chronologically.
 * 
 * @param patientId - The patient ID to fetch orders for
 * @param orderTypes - Which order types to include (default: all)
 * @returns PatientOrdersHistory with all orders sorted chronologically
 */
export function usePatientOrdersHistory(
  patientId: string | null | undefined,
  orderTypes: OrderType[] = ['prescription', 'investigation', 'lab_request', 'treatment_plan']
): PatientOrdersHistory {
  // Fetch prescriptions
  const rawPrescriptions = useLiveQuery(
    () => patientId && orderTypes.includes('prescription')
      ? db.prescriptions.where('patientId').equals(patientId).toArray()
      : Promise.resolve([]),
    [patientId, orderTypes]
  );

  // Fetch investigations
  const rawInvestigations = useLiveQuery(
    () => patientId && orderTypes.includes('investigation')
      ? db.investigations.where('patientId').equals(patientId).toArray()
      : Promise.resolve([]),
    [patientId, orderTypes]
  );

  // Fetch lab requests
  const rawLabRequests = useLiveQuery(
    () => patientId && orderTypes.includes('lab_request')
      ? db.labRequests.where('patientId').equals(patientId).toArray()
      : Promise.resolve([]),
    [patientId, orderTypes]
  );

  // Fetch treatment plans
  const rawTreatmentPlans = useLiveQuery(
    () => patientId && orderTypes.includes('treatment_plan')
      ? db.treatmentPlans.where('patientId').equals(patientId).toArray()
      : Promise.resolve([]),
    [patientId, orderTypes]
  );

  const isLoading = rawPrescriptions === undefined || rawInvestigations === undefined ||
    rawLabRequests === undefined || rawTreatmentPlans === undefined;

  const prescriptions = useMemo(
    () => (rawPrescriptions || []).map(prescriptionToUnified),
    [rawPrescriptions]
  );

  const investigations = useMemo(
    () => (rawInvestigations || []).map(investigationToUnified),
    [rawInvestigations]
  );

  const labRequests = useMemo(
    () => (rawLabRequests || []).map(labRequestToUnified),
    [rawLabRequests]
  );

  const treatmentPlans = useMemo(
    () => (rawTreatmentPlans || []).map(treatmentPlanToUnified),
    [rawTreatmentPlans]
  );

  // All orders sorted by date (most recent first)
  const allOrders = useMemo(
    () => [...prescriptions, ...investigations, ...labRequests, ...treatmentPlans]
      .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [prescriptions, investigations, labRequests, treatmentPlans]
  );

  // Active medications only (pending or partially dispensed prescriptions)
  const activeMedications = useMemo(
    () => prescriptions.filter(p => p.status === 'active'),
    [prescriptions]
  );

  // Active investigations (not yet completed)
  const activeInvestigations = useMemo(
    () => [...investigations, ...labRequests].filter(i => i.status === 'active' || i.status === 'pending'),
    [investigations, labRequests]
  );

  return {
    prescriptions,
    investigations,
    labRequests,
    treatmentPlans,
    allOrders,
    activeMedications,
    activeInvestigations,
    isLoading,
  };
}

/**
 * Get the display color class for an order status
 */
export function getOrderStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'active': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'completed': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

/**
 * Get icon label for order type
 */
export function getOrderTypeLabel(type: OrderType): string {
  switch (type) {
    case 'prescription': return 'Prescription';
    case 'investigation': return 'Investigation';
    case 'lab_request': return 'Lab Request';
    case 'treatment_plan': return 'Treatment Plan';
    default: return 'Order';
  }
}

/**
 * Get icon color for order type
 */
export function getOrderTypeColor(type: OrderType): string {
  switch (type) {
    case 'prescription': return 'text-violet-600 bg-violet-50';
    case 'investigation': return 'text-blue-600 bg-blue-50';
    case 'lab_request': return 'text-emerald-600 bg-emerald-50';
    case 'treatment_plan': return 'text-amber-600 bg-amber-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}
