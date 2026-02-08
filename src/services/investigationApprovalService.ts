/**
 * Investigation Approval Service
 * AstroHEALTH Innovations in Healthcare
 * 
 * Handles investigation approval workflow:
 * - Approve/Reject investigations
 * - Auto-request approved investigations to lab
 * - Track approval status and audit trail
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { syncRecord } from './cloudSyncService';
import type { Investigation, LabRequest, User, UserRole } from '../types';

// ==================== TYPES ====================

export type ApprovalAction = 'approved' | 'rejected' | 'auto_requested' | 'cancelled';

export interface InvestigationApprovalLog {
  id: string;
  investigationId: string;
  patientId: string;
  hospitalId: string;
  action: ApprovalAction;
  performedBy: string;
  performedByName: string;
  performedByRole: UserRole;
  performedAt: Date;
  reason?: string;
  sourceInvestigationId?: string;
  autoRequestTriggered?: boolean;
  labRequestId?: string;
  syncedAt?: Date;
  localId?: string;
  createdAt: Date;
}

export interface ApprovalResult {
  success: boolean;
  message: string;
  investigation?: Investigation;
  labRequestId?: string;
}

export interface BatchApprovalResult {
  successful: string[];
  failed: { id: string; error: string }[];
  labRequestsCreated: number;
}

// ==================== APPROVAL SERVICE ====================

class InvestigationApprovalServiceClass {
  
  // ==================== APPROVAL OPERATIONS ====================
  
  /**
   * Approve a single investigation
   */
  async approveInvestigation(
    investigationId: string,
    approverId: string,
    approverName: string,
    approverRole: UserRole,
    autoRequestToLab: boolean = true
  ): Promise<ApprovalResult> {
    try {
      const investigation = await db.investigations.get(investigationId);
      if (!investigation) {
        return { success: false, message: 'Investigation not found' };
      }
      
      if (investigation.approvalStatus === 'approved') {
        return { success: false, message: 'Investigation already approved' };
      }
      
      const now = new Date();
      
      // Update investigation with approval
      await db.investigations.update(investigationId, {
        approvalStatus: 'approved',
        approvedBy: approverId,
        approvedByName: approverName,
        approvedAt: now,
        updatedAt: now,
      });
      
      // Log the approval action
      await this.logApprovalAction({
        investigationId,
        patientId: investigation.patientId,
        hospitalId: investigation.hospitalId,
        action: 'approved',
        performedBy: approverId,
        performedByName: approverName,
        performedByRole: approverRole,
      });
      
      // Sync to cloud
      const updated = await db.investigations.get(investigationId);
      if (updated) {
        syncRecord('investigations', updated as unknown as Record<string, unknown>);
      }
      
      // Auto-request to lab if enabled
      let labRequestId: string | undefined;
      if (autoRequestToLab) {
        const labResult = await this.createLabRequestFromApproval(investigation, approverId, approverName, approverRole);
        if (labResult.success) {
          labRequestId = labResult.labRequestId;
        }
      }
      
      return { 
        success: true, 
        message: 'Investigation approved successfully',
        investigation: updated,
        labRequestId,
      };
    } catch (error) {
      console.error('Error approving investigation:', error);
      return { success: false, message: `Failed to approve: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
  
  /**
   * Reject an investigation
   */
  async rejectInvestigation(
    investigationId: string,
    rejecterId: string,
    rejecterName: string,
    rejecterRole: UserRole,
    reason: string
  ): Promise<ApprovalResult> {
    try {
      const investigation = await db.investigations.get(investigationId);
      if (!investigation) {
        return { success: false, message: 'Investigation not found' };
      }
      
      if (investigation.approvalStatus === 'rejected') {
        return { success: false, message: 'Investigation already rejected' };
      }
      
      const now = new Date();
      
      // Update investigation with rejection
      await db.investigations.update(investigationId, {
        approvalStatus: 'rejected',
        rejectedBy: rejecterId,
        rejectedByName: rejecterName,
        rejectedAt: now,
        rejectionReason: reason,
        updatedAt: now,
      });
      
      // Log the rejection action
      await this.logApprovalAction({
        investigationId,
        patientId: investigation.patientId,
        hospitalId: investigation.hospitalId,
        action: 'rejected',
        performedBy: rejecterId,
        performedByName: rejecterName,
        performedByRole: rejecterRole,
        reason,
      });
      
      // Sync to cloud
      const updated = await db.investigations.get(investigationId);
      if (updated) {
        syncRecord('investigations', updated as unknown as Record<string, unknown>);
      }
      
      return { 
        success: true, 
        message: 'Investigation rejected',
        investigation: updated,
      };
    } catch (error) {
      console.error('Error rejecting investigation:', error);
      return { success: false, message: `Failed to reject: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }
  
  /**
   * Batch approve multiple investigations
   */
  async batchApprove(
    investigationIds: string[],
    approverId: string,
    approverName: string,
    approverRole: UserRole,
    autoRequestToLab: boolean = true
  ): Promise<BatchApprovalResult> {
    const result: BatchApprovalResult = {
      successful: [],
      failed: [],
      labRequestsCreated: 0,
    };
    
    for (const id of investigationIds) {
      const approvalResult = await this.approveInvestigation(id, approverId, approverName, approverRole, autoRequestToLab);
      if (approvalResult.success) {
        result.successful.push(id);
        if (approvalResult.labRequestId) {
          result.labRequestsCreated++;
        }
      } else {
        result.failed.push({ id, error: approvalResult.message });
      }
    }
    
    return result;
  }
  
  /**
   * Batch reject multiple investigations
   */
  async batchReject(
    investigationIds: string[],
    rejecterId: string,
    rejecterName: string,
    rejecterRole: UserRole,
    reason: string
  ): Promise<BatchApprovalResult> {
    const result: BatchApprovalResult = {
      successful: [],
      failed: [],
      labRequestsCreated: 0,
    };
    
    for (const id of investigationIds) {
      const rejectResult = await this.rejectInvestigation(id, rejecterId, rejecterName, rejecterRole, reason);
      if (rejectResult.success) {
        result.successful.push(id);
      } else {
        result.failed.push({ id, error: rejectResult.message });
      }
    }
    
    return result;
  }
  
  // ==================== AUTO-REQUEST TO LAB ====================
  
  /**
   * Create a lab request from an approved investigation
   */
  async createLabRequestFromApproval(
    investigation: Investigation,
    approverId: string,
    approverName: string,
    approverRole: UserRole
  ): Promise<{ success: boolean; labRequestId?: string; message?: string }> {
    try {
      // Map investigation type to lab test category
      const categoryMap: Record<string, string> = {
        'laboratory': 'biochemistry',
        'hematology': 'hematology',
        'biochemistry': 'biochemistry',
        'microbiology': 'microbiology',
        'serology': 'serology',
        'urinalysis': 'urinalysis',
        'histopathology': 'histopathology',
      };
      
      const labRequestId = uuidv4();
      
      const labRequest: LabRequest = {
        id: labRequestId,
        patientId: investigation.patientId,
        hospitalId: investigation.hospitalId,
        encounterId: investigation.encounterId,
        tests: [{
          id: uuidv4(),
          name: investigation.typeName || investigation.type as string,
          category: categoryMap[investigation.category] || 'other',
          status: 'pending',
        }],
        priority: investigation.priority,
        clinicalInfo: investigation.clinicalDetails || investigation.clinicalInfo || '',
        status: 'pending',
        requestedBy: approverId,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      await db.labRequests.add(labRequest);
      syncRecord('labRequests', labRequest as unknown as Record<string, unknown>);
      
      // Update the investigation to mark it as auto-requested
      await db.investigations.update(investigation.id, {
        autoRequested: true,
        sourceApprovalId: labRequestId,
        updatedAt: new Date(),
      });
      
      // Log the auto-request action
      await this.logApprovalAction({
        investigationId: investigation.id,
        patientId: investigation.patientId,
        hospitalId: investigation.hospitalId,
        action: 'auto_requested',
        performedBy: approverId,
        performedByName: approverName,
        performedByRole: approverRole,
        autoRequestTriggered: true,
        labRequestId,
      });
      
      return { success: true, labRequestId };
    } catch (error) {
      console.error('Error creating lab request from approval:', error);
      return { 
        success: false, 
        message: `Failed to create lab request: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }
  
  // ==================== QUERY METHODS ====================
  
  /**
   * Get all pending approval investigations
   */
  async getPendingApprovals(hospitalId?: string): Promise<Investigation[]> {
    let query = db.investigations.where('approvalStatus').equals('pending');
    const investigations = await query.toArray();
    
    if (hospitalId) {
      return investigations.filter(inv => inv.hospitalId === hospitalId);
    }
    
    return investigations.sort((a, b) => {
      // Sort by priority (stat > urgent > routine), then by date
      const priorityOrder = { stat: 0, urgent: 1, routine: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
  }
  
  /**
   * Get pending approvals for a specific patient
   */
  async getPendingApprovalsByPatient(patientId: string): Promise<Investigation[]> {
    const investigations = await db.investigations
      .where('patientId')
      .equals(patientId)
      .toArray();
    
    return investigations
      .filter(inv => inv.approvalStatus === 'pending' || !inv.approvalStatus)
      .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  }
  
  /**
   * Get approved investigations
   */
  async getApprovedInvestigations(hospitalId?: string): Promise<Investigation[]> {
    const investigations = await db.investigations
      .where('approvalStatus')
      .equals('approved')
      .toArray();
    
    if (hospitalId) {
      return investigations.filter(inv => inv.hospitalId === hospitalId);
    }
    
    return investigations.sort((a, b) => 
      new Date(b.approvedAt || b.createdAt).getTime() - new Date(a.approvedAt || a.createdAt).getTime()
    );
  }
  
  /**
   * Get rejected investigations
   */
  async getRejectedInvestigations(hospitalId?: string): Promise<Investigation[]> {
    const investigations = await db.investigations
      .where('approvalStatus')
      .equals('rejected')
      .toArray();
    
    if (hospitalId) {
      return investigations.filter(inv => inv.hospitalId === hospitalId);
    }
    
    return investigations.sort((a, b) => 
      new Date(b.rejectedAt || b.createdAt).getTime() - new Date(a.rejectedAt || a.createdAt).getTime()
    );
  }
  
  /**
   * Get approval statistics
   */
  async getApprovalStatistics(hospitalId?: string): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    autoRequested: number;
    todayApproved: number;
    statPending: number;
    urgentPending: number;
  }> {
    let investigations = await db.investigations.toArray();
    
    if (hospitalId) {
      investigations = investigations.filter(inv => inv.hospitalId === hospitalId);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const pending = investigations.filter(inv => inv.approvalStatus === 'pending' || !inv.approvalStatus);
    
    return {
      pending: pending.length,
      approved: investigations.filter(inv => inv.approvalStatus === 'approved').length,
      rejected: investigations.filter(inv => inv.approvalStatus === 'rejected').length,
      autoRequested: investigations.filter(inv => inv.autoRequested).length,
      todayApproved: investigations.filter(inv => 
        inv.approvalStatus === 'approved' && 
        inv.approvedAt && 
        new Date(inv.approvedAt) >= today
      ).length,
      statPending: pending.filter(inv => inv.priority === 'stat').length,
      urgentPending: pending.filter(inv => inv.priority === 'urgent').length,
    };
  }
  
  // ==================== AUDIT LOG ====================
  
  /**
   * Log an approval action for audit trail
   */
  private async logApprovalAction(params: {
    investigationId: string;
    patientId: string;
    hospitalId: string;
    action: ApprovalAction;
    performedBy: string;
    performedByName: string;
    performedByRole: UserRole;
    reason?: string;
    sourceInvestigationId?: string;
    autoRequestTriggered?: boolean;
    labRequestId?: string;
  }): Promise<void> {
    const log: InvestigationApprovalLog = {
      id: uuidv4(),
      investigationId: params.investigationId,
      patientId: params.patientId,
      hospitalId: params.hospitalId,
      action: params.action,
      performedBy: params.performedBy,
      performedByName: params.performedByName,
      performedByRole: params.performedByRole,
      performedAt: new Date(),
      reason: params.reason,
      sourceInvestigationId: params.sourceInvestigationId,
      autoRequestTriggered: params.autoRequestTriggered,
      labRequestId: params.labRequestId,
      createdAt: new Date(),
    };
    
    // Store in the dedicated investigationApprovalLogs table
    await db.investigationApprovalLogs.add(log);
    
    // Sync the approval log to Supabase
    syncRecord('investigationApprovalLogs', log as unknown as Record<string, unknown>);
  }
  
  /**
   * Get approval history for an investigation
   */
  async getApprovalHistory(investigationId: string): Promise<InvestigationApprovalLog[]> {
    const logs = await db.investigationApprovalLogs
      .where('investigationId')
      .equals(investigationId)
      .toArray();
    
    return logs.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  }
  
  /**
   * Get all approval logs for a patient
   */
  async getPatientApprovalHistory(patientId: string): Promise<InvestigationApprovalLog[]> {
    const logs = await db.investigationApprovalLogs
      .where('patientId')
      .equals(patientId)
      .toArray();
    
    return logs.sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());
  }
  
  /**
   * Get all approval logs for a hospital
   */
  async getHospitalApprovalLogs(hospitalId: string, limit = 100): Promise<InvestigationApprovalLog[]> {
    const logs = await db.investigationApprovalLogs
      .where('hospitalId')
      .equals(hospitalId)
      .toArray();
    
    return logs
      .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
      .slice(0, limit);
  }
}

// Export singleton instance
export const investigationApprovalService = new InvestigationApprovalServiceClass();
export default investigationApprovalService;
