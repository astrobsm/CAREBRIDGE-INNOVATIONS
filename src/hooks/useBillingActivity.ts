import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { recordBillableActivity } from '../services/activityBillingService';
import { billableActivities, REVENUE_SHARE_CONFIG } from '../data/billingActivities';
import type { BillingCategory } from '../types';

/**
 * Hook for recording billable activities during clinical workflows.
 * This hook provides functions to record various types of billable activities
 * with automatic 50/50 revenue sharing between staff and hospital.
 */
export function useBillingActivity() {
  const { user } = useAuth();

  /**
   * Record a billable activity for a patient
   */
  const recordActivity = useCallback(async (params: {
    patientId: string;
    admissionId: string;
    hospitalId: string;
    activityCode: string;
    notes?: string;
    quantity?: number;
    customAmount?: number;
  }) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const activity = billableActivities.find(a => a.code === params.activityCode);
    if (!activity) {
      throw new Error(`Unknown activity code: ${params.activityCode}`);
    }

    const quantity = params.quantity || 1;
    const unitPrice = params.customAmount || activity.defaultFee;
    const totalAmount = unitPrice * quantity;
    const staffShare = totalAmount * REVENUE_SHARE_CONFIG.staffPercentage;
    const hospitalShare = totalAmount * REVENUE_SHARE_CONFIG.hospitalPercentage;

    await recordBillableActivity(
      activity.id,
      params.patientId,
      '', // patientName - would need to look up
      '', // hospitalNumber
      user.id!,
      `${user.firstName} ${user.lastName}`,
      user.role,
      params.hospitalId,
      totalAmount,
      {
        admissionId: params.admissionId,
        notes: params.notes,
      }
    );

    return {
      activity,
      totalAmount,
      staffShare,
      hospitalShare,
    };
  }, [user]);

  /**
   * Record a doctor/surgeon consultation/review
   */
  const recordDoctorReview = useCallback(async (params: {
    patientId: string;
    admissionId: string;
    hospitalId: string;
    isInitial?: boolean;
    isSpecialist?: boolean;
    notes?: string;
  }) => {
    let activityCode = 'CONSULT_001'; // Standard follow-up
    
    if (params.isInitial) {
      if (user?.role === 'surgeon' || user?.role === 'plastic_surgeon') {
        activityCode = 'SURG_001'; // Initial surgeon review
      } else {
        activityCode = 'CONSULT_001'; // Doctor initial consultation
      }
    } else {
      if (user?.role === 'surgeon' || user?.role === 'plastic_surgeon') {
        activityCode = 'SURG_002'; // Follow-up surgeon review
      } else {
        activityCode = 'CONSULT_002'; // Doctor follow-up
      }
    }

    return recordActivity({
      ...params,
      activityCode,
    });
  }, [user, recordActivity]);

  /**
   * Record a nursing service
   */
  const recordNursingService = useCallback(async (params: {
    patientId: string;
    admissionId: string;
    hospitalId: string;
    serviceType: 'daily_care' | 'medication_admin' | 'vital_signs' | 'wound_dressing' | 'catheter_care' | 'ng_care' | 'injection';
    notes?: string;
  }) => {
    const serviceCodeMap: Record<string, string> = {
      daily_care: 'NURS_001',
      medication_admin: 'NURS_002',
      vital_signs: 'NURS_003',
      wound_dressing: 'NURS_004',
      catheter_care: 'NURS_005',
      ng_care: 'NURS_006',
      injection: 'NURS_007',
    };

    return recordActivity({
      ...params,
      activityCode: serviceCodeMap[params.serviceType] || 'NURS_001',
    });
  }, [recordActivity]);

  /**
   * Record a wound care activity
   */
  const recordWoundCare = useCallback(async (params: {
    patientId: string;
    admissionId: string;
    hospitalId: string;
    woundType: 'simple_dressing' | 'complex_dressing' | 'debridement' | 'npwt_application' | 'npwt_change' | 'skin_graft_care';
    notes?: string;
  }) => {
    const woundCodeMap: Record<string, string> = {
      simple_dressing: 'WOUND_001',
      complex_dressing: 'WOUND_002',
      debridement: 'WOUND_003',
      npwt_application: 'WOUND_004',
      npwt_change: 'WOUND_005',
      skin_graft_care: 'WOUND_006',
    };

    return recordActivity({
      ...params,
      activityCode: woundCodeMap[params.woundType] || 'WOUND_001',
    });
  }, [recordActivity]);

  /**
   * Record a laboratory test
   */
  const recordLabTest = useCallback(async (params: {
    patientId: string;
    admissionId: string;
    hospitalId: string;
    testCode: string;
    notes?: string;
  }) => {
    return recordActivity({
      ...params,
      activityCode: params.testCode,
    });
  }, [recordActivity]);

  /**
   * Record a ward round
   */
  const recordWardRound = useCallback(async (params: {
    patientId: string;
    admissionId: string;
    hospitalId: string;
    isConsultantLed?: boolean;
    notes?: string;
  }) => {
    return recordActivity({
      ...params,
      activityCode: params.isConsultantLed ? 'WARD_002' : 'WARD_001',
    });
  }, [recordActivity]);

  /**
   * Record a procedure
   */
  const recordProcedure = useCallback(async (params: {
    patientId: string;
    admissionId: string;
    hospitalId: string;
    procedureCode: string;
    notes?: string;
  }) => {
    return recordActivity({
      ...params,
      activityCode: params.procedureCode,
    });
  }, [recordActivity]);

  /**
   * Get activity info by code
   */
  const getActivityInfo = useCallback((activityCode: string) => {
    return billableActivities.find(a => a.code === activityCode);
  }, []);

  /**
   * Get all activities for a category
   */
  const getActivitiesByCategory = useCallback((category: BillingCategory) => {
    return billableActivities.filter(a => a.category === category);
  }, []);

  return {
    recordActivity,
    recordDoctorReview,
    recordNursingService,
    recordWoundCare,
    recordLabTest,
    recordWardRound,
    recordProcedure,
    getActivityInfo,
    getActivitiesByCategory,
    revenueShare: REVENUE_SHARE_CONFIG,
  };
}

export default useBillingActivity;
