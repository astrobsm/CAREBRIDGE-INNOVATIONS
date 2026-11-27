/**
 * The wound tool's own IndexedDB database, 'astrohealth-wound-tool'.
 *
 * Entirely separate from the EMR's database (src/database/db.ts): different
 * name, different tables, no sync hooks. Nothing here is uploaded.
 */

import Dexie, { type Table } from 'dexie';
import { createMemoryTables, createWoundStore, type ToolTable, type ToolTables, type WoundStore } from './store';
import type { ToolAssessment, ToolPhoto, ToolWound } from './types';

export const WOUND_TOOL_DB_NAME = 'astrohealth-wound-tool';

class WoundToolDatabase extends Dexie {
  wounds!: Table<ToolWound, string>;
  assessments!: Table<ToolAssessment, string>;
  photos!: Table<ToolPhoto, string>;

  constructor() {
    super(WOUND_TOOL_DB_NAME);
    this.version(1).stores({
      wounds: 'id, updatedAt',
      assessments: 'id, woundId, assessedAt',
      photos: 'id, woundId, assessmentId',
    });
  }
}

function adapt<T extends { id: string }>(table: Table<T, string>): ToolTable<T> {
  return {
    get: id => table.get(id),
    put: row => table.put(row),
    bulkPut: rows => table.bulkPut(rows),
    delete: id => table.delete(id),
    bulkDelete: ids => table.bulkDelete(ids),
    toArray: () => table.toArray(),
    whereEquals: (field, value) => table.where(field).equals(value).toArray(),
    clear: () => table.clear(),
    count: () => table.count(),
  };
}

let store: WoundStore | null = null;
let memoryOnly = false;

/** True when IndexedDB was unavailable and records last only until reload. */
export function isMemoryOnly(): boolean {
  return memoryOnly;
}

/** The tool's store, opened on first use. */
export function getWoundStore(): WoundStore {
  if (store) return store;
  let tables: ToolTables;
  if (typeof indexedDB === 'undefined') {
    // Some private-browsing modes have no IndexedDB. Work, but say so.
    memoryOnly = true;
    tables = createMemoryTables();
  } else {
    const db = new WoundToolDatabase();
    tables = {
      wounds: adapt(db.wounds),
      assessments: adapt(db.assessments),
      photos: adapt(db.photos),
      transaction: fn => db.transaction('rw', db.wounds, db.assessments, db.photos, fn),
    };
  }
  store = createWoundStore(tables);
  return store;
}
