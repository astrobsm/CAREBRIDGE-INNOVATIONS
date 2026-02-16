// ============================================================
// AstroHEALTH Audit Logging Service
// Centralized audit trail for user activities
// ============================================================

import { db } from '../database';
import { v4 as uuidv4 } from 'uuid';
import type { AuditLog } from '../types';

/**
 * Log a user activity to the audit logs table.
 * This function is fire-and-forget - it never throws errors
 * to avoid breaking the main application flow.
 */
export async function logAuditEvent(
  userId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: {
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const auditLog: AuditLog = {
      id: uuidv4(),
      userId,
      action,
      entityType,
      entityId,
      oldValue: details?.oldValue,
      newValue: details?.newValue,
      timestamp: new Date(),
    };
    await db.auditLogs.add(auditLog);
  } catch (error) {
    // Audit logging should never break the main flow
    console.warn('[Audit] Failed to log event:', error);
  }
}

/**
 * Get the current user ID from localStorage.
 * Used when the user context is not directly available.
 */
export function getCurrentUserId(): string {
  return localStorage.getItem('AstroHEALTH_user_id') || 'system';
}

/**
 * Log a CRUD operation with automatic user detection.
 * Convenience wrapper around logAuditEvent.
 */
export async function logCrudEvent(
  action: 'create' | 'update' | 'delete',
  entityType: string,
  entityId: string,
  details?: {
    oldValue?: Record<string, unknown>;
    newValue?: Record<string, unknown>;
  }
): Promise<void> {
  const userId = getCurrentUserId();
  return logAuditEvent(userId, action, entityType, entityId, details);
}

/**
 * Log an authentication event (login, logout, register).
 */
export async function logAuthEvent(
  userId: string,
  action: 'login' | 'logout' | 'register',
  details?: Record<string, unknown>
): Promise<void> {
  return logAuditEvent(userId, action, 'auth', userId, {
    newValue: details,
  });
}

/**
 * Log a view/access event.
 */
export async function logViewEvent(
  entityType: string,
  entityId: string
): Promise<void> {
  const userId = getCurrentUserId();
  return logAuditEvent(userId, 'view', entityType, entityId);
}

/**
 * Log a download event (PDF generation, export, etc.).
 */
export async function logDownloadEvent(
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>
): Promise<void> {
  const userId = getCurrentUserId();
  return logAuditEvent(userId, 'download', entityType, entityId, {
    newValue: details,
  });
}
