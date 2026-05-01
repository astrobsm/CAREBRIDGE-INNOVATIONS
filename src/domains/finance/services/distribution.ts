// Finance distribution service – ports ZIGMA BOND services/distribution.py
// to TypeScript / Dexie. Atomic via Dexie transaction.

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database/db';
import type { FinanceBucket, FinanceIncome } from '../types';

export interface DefaultBucketSeed {
  name: string;
  percentage: number;
  bankAccount?: string;
}

/**
 * Default bucket allocation – ported verbatim from ZIGMA BOND.
 * Sums to 100%.
 */
export const DEFAULT_BUCKETS: DefaultBucketSeed[] = [
  { name: 'Household', percentage: 30, bankAccount: 'Moniepoint 3' },
  { name: 'Factory Expansion', percentage: 15, bankAccount: 'Access Account 1' },
  { name: 'Investment', percentage: 15, bankAccount: 'Investment Account' },
  { name: 'Family Support', percentage: 10, bankAccount: 'Moniepoint 1' },
  { name: 'Emergency', percentage: 10, bankAccount: 'Emergency Reserve' },
  { name: 'Children School Fees', percentage: 10, bankAccount: 'Moniepoint 2' },
  { name: 'Recreation/Lifestyle', percentage: 5, bankAccount: 'Lifestyle Account' },
  { name: 'Business', percentage: 5, bankAccount: 'Business Account' },
];

/**
 * Idempotently seed default buckets for a hospital if none exist.
 */
export async function ensureDefaultBuckets(hospitalId: string): Promise<FinanceBucket[]> {
  const existing = await db.financeBuckets.where('hospitalId').equals(hospitalId).toArray();
  if (existing.length > 0) return existing;

  const now = new Date();
  const seeded: FinanceBucket[] = DEFAULT_BUCKETS.map((b) => ({
    id: uuidv4(),
    hospitalId,
    name: b.name,
    percentage: b.percentage,
    balance: 0,
    monthlyCap: null,
    hardStop: false,
    bankAccount: b.bankAccount ?? null,
    bankName: null,
    accountNumber: null,
    accountName: null,
    bankBranch: null,
    bankNotes: null,
    createdAt: now,
    updatedAt: now,
  }));
  await db.financeBuckets.bulkAdd(seeded);
  return seeded;
}

/**
 * Distribute an income proportionally across active buckets and create
 * one credit transaction + one audit log entry per bucket.
 * All-or-nothing via Dexie rw transaction.
 */
export async function distributeIncome(
  income: FinanceIncome,
  actor: string,
): Promise<void> {
  await db.transaction(
    'rw',
    db.financeBuckets,
    db.financeIncome,
    db.financeTransactions,
    db.financeAuditLogs,
    async () => {
      const buckets = await db.financeBuckets
        .where('hospitalId')
        .equals(income.hospitalId)
        .toArray();
      if (buckets.length === 0) {
        throw new Error('No buckets configured for this hospital');
      }
      const totalPct = buckets.reduce((s, b) => s + (b.percentage || 0), 0);
      if (totalPct <= 0) {
        throw new Error('Bucket percentages sum to zero');
      }

      const now = new Date();
      for (const b of buckets) {
        const share = round2((income.amount * (b.percentage || 0)) / totalPct);
        if (share <= 0) continue;

        await db.financeBuckets.update(b.id, {
          balance: round2((b.balance || 0) + share),
          updatedAt: now,
        });

        await db.financeTransactions.add({
          id: uuidv4(),
          hospitalId: income.hospitalId,
          bucketId: b.id,
          type: 'credit',
          amount: share,
          description: `Income distribution: ${income.source}`,
          date: income.date,
          linkedIncomeId: income.id,
          linkedExpenseId: null,
          linkedProjectId: null,
          createdAt: now,
        });

        await db.financeAuditLogs.add({
          id: uuidv4(),
          hospitalId: income.hospitalId,
          actor,
          action: 'income.distribute',
          detail: `bucket=${b.name} share=${share} of ${income.amount}`,
          timestamp: now,
        });
      }

      await db.financeIncome.update(income.id, { distributed: true });
    },
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
