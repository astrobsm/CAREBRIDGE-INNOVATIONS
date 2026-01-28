/**
 * IndexedDB to DigitalOcean Migration Service
 * 
 * Exports all data from local IndexedDB and pushes to DigitalOcean MySQL
 */

import { db } from '../database/db';
import { upsertToCloud } from './digitalOceanClient';

export interface MigrationProgress {
  currentTable: string;
  tablesProcessed: number;
  totalTables: number;
  recordsProcessed: number;
  recordsTotal: number;
  errors: string[];
  isComplete: boolean;
}

type ProgressCallback = (progress: MigrationProgress) => void;

// All IndexedDB tables to migrate
const TABLES_TO_MIGRATE = [
  'users',
  'hospitals',
  'patients',
  'vitalSigns',
  'clinicalEncounters',
  'surgeries',
  'wounds',
  'burnAssessments',
  'labRequests',
  'prescriptions',
  'nutritionAssessments',
  'nutritionPlans',
  'invoices',
  'admissions',
  'admissionNotes',
  'bedAssignments',
  'treatmentPlans',
  'treatmentProgress',
  'wardRounds',
  'doctorAssignments',
  'nurseAssignments',
  'investigations',
  'chatRooms',
  'chatMessages',
  'videoConferences',
  'enhancedVideoConferences',
  'dischargeSummaries',
  'consumableBOMs',
  'histopathologyRequests',
  'bloodTransfusions',
  'mdtMeetings',
  'limbSalvageAssessments',
  'burnMonitoringRecords',
  'escharotomyRecords',
  'skinGraftRecords',
  'burnCarePlans',
  'appointments',
  'appointmentReminders',
  'appointmentSlots',
  'clinicSessions',
  'npwtSessions',
  'npwtNotifications',
  'medicationCharts',
  'nursePatientAssignments',
  'transfusionOrders',
  'transfusionMonitoringCharts',
  'auditLogs',
  'syncStatus',
  'staffPatientAssignments',
  'activityBillingRecords',
  'payrollPeriods',
  'staffPayrollRecords',
  'payslips',
  'postOperativeNotes',
  'preoperativeAssessments',
  'externalReviews',
  'referrals',
  'patientEducationRecords',
  'calculatorResults',
  'userSettings',
  'hospitalSettings',
];

/**
 * Get all records from a Dexie table
 */
async function getTableRecords(tableName: string): Promise<unknown[]> {
  try {
    const table = (db as Record<string, unknown>)[tableName];
    if (table && typeof (table as { toArray?: () => Promise<unknown[]> }).toArray === 'function') {
      return await (table as { toArray: () => Promise<unknown[]> }).toArray();
    }
    return [];
  } catch (error) {
    console.error(`Error reading table ${tableName}:`, error);
    return [];
  }
}

/**
 * Migrate all data from IndexedDB to DigitalOcean
 */
export async function migrateToDigitalOcean(
  onProgress?: ProgressCallback
): Promise<{ success: boolean; message: string; stats: { tables: number; records: number; errors: number } }> {
  const progress: MigrationProgress = {
    currentTable: '',
    tablesProcessed: 0,
    totalTables: TABLES_TO_MIGRATE.length,
    recordsProcessed: 0,
    recordsTotal: 0,
    errors: [],
    isComplete: false,
  };

  const stats = {
    tables: 0,
    records: 0,
    errors: 0,
  };

  try {
    console.log('[Migration] Starting IndexedDB → DigitalOcean migration...');

    // First, count total records
    for (const tableName of TABLES_TO_MIGRATE) {
      const records = await getTableRecords(tableName);
      progress.recordsTotal += records.length;
    }

    onProgress?.(progress);

    // Process each table
    for (const tableName of TABLES_TO_MIGRATE) {
      progress.currentTable = tableName;
      onProgress?.(progress);

      const records = await getTableRecords(tableName);
      
      if (records.length > 0) {
        console.log(`[Migration] Processing ${tableName}: ${records.length} records`);
        
        let tableErrors = 0;
        
        for (const record of records) {
          try {
            const result = await upsertToCloud(tableName, record as Record<string, unknown>);
            if (result.success) {
              stats.records++;
            } else {
              tableErrors++;
              stats.errors++;
              if (tableErrors <= 3) {
                progress.errors.push(`${tableName}: ${result.error}`);
              }
            }
          } catch (error) {
            tableErrors++;
            stats.errors++;
            if (tableErrors <= 3) {
              progress.errors.push(`${tableName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          
          progress.recordsProcessed++;
          
          // Update progress every 10 records
          if (progress.recordsProcessed % 10 === 0) {
            onProgress?.(progress);
          }
        }
        
        stats.tables++;
      }
      
      progress.tablesProcessed++;
      onProgress?.(progress);
    }

    progress.isComplete = true;
    onProgress?.(progress);

    console.log(`[Migration] Complete! ${stats.records} records migrated, ${stats.errors} errors`);

    return {
      success: true,
      message: `Migration complete! ${stats.records} records migrated across ${stats.tables} tables.`,
      stats,
    };
  } catch (error) {
    console.error('[Migration] Failed:', error);
    return {
      success: false,
      message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stats,
    };
  }
}

/**
 * Get a summary of local data
 */
export async function getLocalDataSummary(): Promise<{ tableName: string; count: number }[]> {
  const summary: { tableName: string; count: number }[] = [];
  
  for (const tableName of TABLES_TO_MIGRATE) {
    const records = await getTableRecords(tableName);
    if (records.length > 0) {
      summary.push({ tableName, count: records.length });
    }
  }
  
  return summary;
}
