// Clinical Submission Service
// Wrapper functions for creating investigations, prescriptions, and treatment plans
// with automatic push notification triggers

import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import type { Investigation, LabRequest, Prescription, TreatmentPlan } from '../types';
import {
  notifyInvestigationRequest,
  notifyLabRequest,
  notifyPrescription,
  notifyNewTreatmentPlan,
  notifyInvestigationResults,
  notifyLabResults,
  notifyPrescriptionReady,
} from './scheduledNotificationService';
import { getNotificationPermission } from './appointmentNotificationService';

// ============================================
// INVESTIGATION SUBMISSION
// ============================================

/**
 * Submit a new investigation request with notification
 */
export async function submitInvestigationRequest(
  investigation: Omit<Investigation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const newInvestigation: Investigation = {
    ...investigation,
    id: uuidv4(),
    status: investigation.status || 'requested',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Investigation;

  const id = await db.investigations.add(newInvestigation);
  
  // Send notification if permitted
  if (getNotificationPermission() === 'granted') {
    try {
      await notifyInvestigationRequest(newInvestigation);
    } catch (error) {
      console.warn('[ClinicalSubmission] Failed to send investigation notification:', error);
    }
  }
  
  return id;
}

/**
 * Update investigation with results and notify
 */
export async function completeInvestigationWithResults(
  investigationId: string,
  results: Partial<Investigation>
): Promise<void> {
  const investigation = await db.investigations.get(investigationId);
  if (!investigation) throw new Error('Investigation not found');

  await db.investigations.update(investigationId, {
    ...results,
    status: 'completed',
    completedAt: new Date(),
    updatedAt: new Date(),
  });

  const updated = await db.investigations.get(investigationId);
  
  // Send notification if permitted
  if (getNotificationPermission() === 'granted' && updated) {
    try {
      await notifyInvestigationResults(updated);
    } catch (error) {
      console.warn('[ClinicalSubmission] Failed to send results notification:', error);
    }
  }
}

// ============================================
// LAB REQUEST SUBMISSION
// ============================================

/**
 * Submit a new lab request with notification
 */
export async function submitLabRequest(
  labRequest: Omit<LabRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const newLabRequest: LabRequest = {
    ...labRequest,
    id: uuidv4(),
    status: labRequest.status || 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as LabRequest;

  const id = await db.labRequests.add(newLabRequest);
  
  // Send notification if permitted
  if (getNotificationPermission() === 'granted') {
    try {
      await notifyLabRequest(newLabRequest);
    } catch (error) {
      console.warn('[ClinicalSubmission] Failed to send lab request notification:', error);
    }
  }
  
  return id;
}

/**
 * Update lab request with results and notify
 */
export async function completeLabWithResults(
  labRequestId: string,
  results: Partial<LabRequest>
): Promise<void> {
  const labRequest = await db.labRequests.get(labRequestId);
  if (!labRequest) throw new Error('Lab request not found');

  await db.labRequests.update(labRequestId, {
    ...results,
    status: 'completed',
    completedAt: new Date(),
    updatedAt: new Date(),
  });

  const updated = await db.labRequests.get(labRequestId);
  
  // Send notification if permitted
  if (getNotificationPermission() === 'granted' && updated) {
    try {
      await notifyLabResults(updated);
    } catch (error) {
      console.warn('[ClinicalSubmission] Failed to send results notification:', error);
    }
  }
}

// ============================================
// PRESCRIPTION SUBMISSION
// ============================================

/**
 * Submit a new prescription with notification
 */
export async function submitPrescription(
  prescription: Omit<Prescription, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const newPrescription: Prescription = {
    ...prescription,
    id: uuidv4(),
    status: prescription.status || 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Prescription;

  const id = await db.prescriptions.add(newPrescription);
  
  // Send notification if permitted
  if (getNotificationPermission() === 'granted') {
    try {
      await notifyPrescription(newPrescription);
    } catch (error) {
      console.warn('[ClinicalSubmission] Failed to send prescription notification:', error);
    }
  }
  
  return id;
}

/**
 * Mark prescription as dispensed and notify
 */
export async function markPrescriptionDispensed(
  prescriptionId: string,
  dispensingDetails?: Partial<Prescription>
): Promise<void> {
  const prescription = await db.prescriptions.get(prescriptionId);
  if (!prescription) throw new Error('Prescription not found');

  await db.prescriptions.update(prescriptionId, {
    ...dispensingDetails,
    status: 'dispensed',
    dispensedAt: new Date(),
    updatedAt: new Date(),
  });

  const updated = await db.prescriptions.get(prescriptionId);
  
  // Send notification if permitted
  if (getNotificationPermission() === 'granted' && updated) {
    try {
      await notifyPrescriptionReady(updated);
    } catch (error) {
      console.warn('[ClinicalSubmission] Failed to send dispensed notification:', error);
    }
  }
}

// ============================================
// TREATMENT PLAN SUBMISSION
// ============================================

/**
 * Create a new treatment plan with notification
 */
export async function createTreatmentPlan(
  treatmentPlan: Omit<TreatmentPlan, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const newPlan: TreatmentPlan = {
    ...treatmentPlan,
    id: uuidv4(),
    status: treatmentPlan.status || 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as TreatmentPlan;

  const id = await db.treatmentPlans.add(newPlan);
  
  // Send notification if permitted
  if (getNotificationPermission() === 'granted') {
    try {
      await notifyNewTreatmentPlan(newPlan);
    } catch (error) {
      console.warn('[ClinicalSubmission] Failed to send treatment plan notification:', error);
    }
  }
  
  return id;
}

// ============================================
// SURGERY BOOKING WITH NOTIFICATION
// ============================================

import type { Surgery } from '../types';
import { scheduleAllUpcomingNotifications } from './scheduledNotificationService';

/**
 * Book a new surgery and schedule notifications
 */
export async function bookSurgery(
  surgery: Omit<Surgery, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const newSurgery: Surgery = {
    ...surgery,
    id: uuidv4(),
    status: surgery.status || 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Surgery;

  const id = await db.surgeries.add(newSurgery);
  
  // Re-schedule notifications to include new surgery
  if (getNotificationPermission() === 'granted') {
    try {
      await scheduleAllUpcomingNotifications();
    } catch (error) {
      console.warn('[ClinicalSubmission] Failed to schedule surgery notifications:', error);
    }
  }
  
  return id;
}

// ============================================
// APPOINTMENT BOOKING WITH NOTIFICATION
// ============================================

import type { Appointment } from '../types';

/**
 * Book a new appointment and schedule notifications
 */
export async function bookAppointment(
  appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const newAppointment: Appointment = {
    ...appointment,
    id: uuidv4(),
    status: appointment.status || 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Appointment;

  const id = await db.appointments.add(newAppointment);
  
  // Re-schedule notifications to include new appointment
  if (getNotificationPermission() === 'granted') {
    try {
      await scheduleAllUpcomingNotifications();
    } catch (error) {
      console.warn('[ClinicalSubmission] Failed to schedule appointment notifications:', error);
    }
  }
  
  return id;
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Investigation
  submitInvestigationRequest,
  completeInvestigationWithResults,
  // Lab Request
  submitLabRequest,
  completeLabWithResults,
  // Prescription
  submitPrescription,
  markPrescriptionDispensed,
  // Treatment Plan
  createTreatmentPlan,
  // Surgery
  bookSurgery,
  // Appointment
  bookAppointment,
};
