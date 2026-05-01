// Centralized finance ops – thin wrappers around Dexie tables with audit trails.

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database/db';
import type {
  FinanceBucket,
  FinanceExpense,
  FinanceIncome,
  FinanceInvestment,
  FinanceProject,
  FinanceProjectStatus,
} from '../types';
import { distributeIncome, ensureDefaultBuckets } from './distribution';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function audit(
  hospitalId: string,
  actor: string,
  action: string,
  detail?: string,
): Promise<void> {
  await db.financeAuditLogs.add({
    id: uuidv4(),
    hospitalId,
    actor,
    action,
    detail: detail ?? null,
    timestamp: new Date(),
  });
}

// ── Income ─────────────────────────────────────────────────────────────────
export const FinanceIncomeOps = {
  async create(input: {
    hospitalId: string;
    source: string;
    amount: number;
    note?: string | null;
    date?: Date;
    createdBy: string;
  }): Promise<FinanceIncome> {
    await ensureDefaultBuckets(input.hospitalId);
    const now = new Date();
    const record: FinanceIncome = {
      id: uuidv4(),
      hospitalId: input.hospitalId,
      source: input.source,
      amount: round2(input.amount),
      note: input.note ?? null,
      date: input.date ?? now,
      createdBy: input.createdBy,
      distributed: false,
      createdAt: now,
    };
    await db.financeIncome.add(record);
    await distributeIncome(record, input.createdBy);
    await audit(input.hospitalId, input.createdBy, 'income.add',
      `source=${input.source} amount=${record.amount}`);
    return record;
  },

  async listByHospital(hospitalId: string, limit = 200): Promise<FinanceIncome[]> {
    return db.financeIncome
      .where('hospitalId')
      .equals(hospitalId)
      .reverse()
      .limit(limit)
      .toArray();
  },
};

// ── Buckets ────────────────────────────────────────────────────────────────
export const FinanceBucketOps = {
  ensureDefaults: ensureDefaultBuckets,

  async listByHospital(hospitalId: string): Promise<FinanceBucket[]> {
    return db.financeBuckets.where('hospitalId').equals(hospitalId).toArray();
  },

  async update(id: string, changes: Partial<FinanceBucket>, actor: string): Promise<void> {
    const before = await db.financeBuckets.get(id);
    if (!before) throw new Error('Bucket not found');
    await db.financeBuckets.update(id, { ...changes, updatedAt: new Date() });
    await audit(before.hospitalId, actor, 'bucket.update', `bucket=${before.name}`);
  },

  /** Manual adjustment: positive amount = credit, negative = debit. */
  async adjust(id: string, amount: number, reason: string, actor: string): Promise<void> {
    const b = await db.financeBuckets.get(id);
    if (!b) throw new Error('Bucket not found');
    const delta = round2(amount);
    const newBalance = round2((b.balance || 0) + delta);
    if (newBalance < 0 && b.hardStop) {
      throw new Error(`Hard stop on ${b.name}: insufficient balance`);
    }
    await db.transaction(
      'rw',
      db.financeBuckets,
      db.financeTransactions,
      db.financeAuditLogs,
      async () => {
        await db.financeBuckets.update(id, { balance: newBalance, updatedAt: new Date() });
        await db.financeTransactions.add({
          id: uuidv4(),
          hospitalId: b.hospitalId,
          bucketId: id,
          type: delta >= 0 ? 'credit' : 'debit',
          amount: Math.abs(delta),
          description: `Manual adjustment: ${reason}`,
          date: new Date(),
          linkedIncomeId: null,
          linkedExpenseId: null,
          linkedProjectId: null,
          createdAt: new Date(),
        });
        await db.financeAuditLogs.add({
          id: uuidv4(),
          hospitalId: b.hospitalId,
          actor,
          action: 'bucket.adjust',
          detail: `bucket=${b.name} delta=${delta} reason=${reason}`,
          timestamp: new Date(),
        });
      },
    );
  },
};

// ── Expenses ───────────────────────────────────────────────────────────────
export const FinanceExpenseOps = {
  async create(input: {
    hospitalId: string;
    category: string;
    bucketId: string;
    amount: number;
    description?: string | null;
    date?: Date;
    createdBy: string;
  }): Promise<FinanceExpense> {
    const bucket = await db.financeBuckets.get(input.bucketId);
    if (!bucket) throw new Error('Bucket not found');

    const amount = round2(input.amount);
    if (amount > (bucket.balance || 0) && bucket.hardStop) {
      throw new Error(
        `Hard stop: '${bucket.name}' has insufficient balance (₦${bucket.balance})`,
      );
    }

    const exp: FinanceExpense = {
      id: uuidv4(),
      hospitalId: input.hospitalId,
      category: input.category,
      bucketId: input.bucketId,
      amount,
      description: input.description ?? null,
      date: input.date ?? new Date(),
      createdBy: input.createdBy,
      createdAt: new Date(),
    };

    await db.transaction(
      'rw',
      db.financeBuckets,
      db.financeExpenses,
      db.financeTransactions,
      db.financeAuditLogs,
      async () => {
        await db.financeExpenses.add(exp);
        await db.financeBuckets.update(input.bucketId, {
          balance: round2((bucket.balance || 0) - amount),
          updatedAt: new Date(),
        });
        await db.financeTransactions.add({
          id: uuidv4(),
          hospitalId: input.hospitalId,
          bucketId: input.bucketId,
          type: 'debit',
          amount,
          description:
            `Expense: ${input.category}` +
            (input.description ? ` – ${input.description}` : ''),
          date: exp.date,
          linkedIncomeId: null,
          linkedExpenseId: exp.id,
          linkedProjectId: null,
          createdAt: new Date(),
        });
        if (amount > (bucket.balance || 0) && !bucket.hardStop) {
          await db.financeAuditLogs.add({
            id: uuidv4(),
            hospitalId: input.hospitalId,
            actor: input.createdBy,
            action: 'expense.overspend',
            detail: `bucket=${bucket.name} bal=${bucket.balance} attempted=${amount}`,
            timestamp: new Date(),
          });
        }
        await db.financeAuditLogs.add({
          id: uuidv4(),
          hospitalId: input.hospitalId,
          actor: input.createdBy,
          action: 'expense.add',
          detail: `bucket=${bucket.name} amount=${amount} cat=${input.category}`,
          timestamp: new Date(),
        });
      },
    );
    return exp;
  },

  async listByHospital(hospitalId: string, limit = 500): Promise<FinanceExpense[]> {
    return db.financeExpenses
      .where('hospitalId')
      .equals(hospitalId)
      .reverse()
      .limit(limit)
      .toArray();
  },
};

// ── Projects ───────────────────────────────────────────────────────────────
export const FinanceProjectOps = {
  async create(input: {
    hospitalId: string;
    name: string;
    totalBudget: number;
    milestones?: string | null;
    createdBy: string;
  }): Promise<FinanceProject> {
    const now = new Date();
    const project: FinanceProject = {
      id: uuidv4(),
      hospitalId: input.hospitalId,
      name: input.name,
      totalBudget: round2(input.totalBudget),
      fundedAmount: 0,
      status: 'planned',
      milestones: input.milestones ?? null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    await db.financeProjects.add(project);
    await audit(input.hospitalId, input.createdBy, 'project.create',
      `name=${input.name} budget=${project.totalBudget}`);
    return project;
  },

  async fund(projectId: string, amount: number, bucketId: string, actor: string): Promise<void> {
    const project = await db.financeProjects.get(projectId);
    if (!project) throw new Error('Project not found');
    const bucket = await db.financeBuckets.get(bucketId);
    if (!bucket) throw new Error('Bucket not found');

    const fundAmount = round2(amount);
    if (fundAmount > (bucket.balance || 0) && bucket.hardStop) {
      throw new Error(`Hard stop on ${bucket.name}: insufficient balance`);
    }

    await db.transaction(
      'rw',
      db.financeProjects,
      db.financeBuckets,
      db.financeTransactions,
      db.financeAuditLogs,
      async () => {
        const newFunded = round2((project.fundedAmount || 0) + fundAmount);
        const status: FinanceProjectStatus =
          newFunded >= project.totalBudget ? 'completed' : 'active';
        await db.financeProjects.update(projectId, {
          fundedAmount: newFunded,
          status,
          updatedAt: new Date(),
        });
        await db.financeBuckets.update(bucketId, {
          balance: round2((bucket.balance || 0) - fundAmount),
          updatedAt: new Date(),
        });
        await db.financeTransactions.add({
          id: uuidv4(),
          hospitalId: project.hospitalId,
          bucketId,
          type: 'debit',
          amount: fundAmount,
          description: `Fund project: ${project.name}`,
          date: new Date(),
          linkedIncomeId: null,
          linkedExpenseId: null,
          linkedProjectId: projectId,
          createdAt: new Date(),
        });
        await db.financeAuditLogs.add({
          id: uuidv4(),
          hospitalId: project.hospitalId,
          actor,
          action: 'project.fund',
          detail: `project=${project.name} amount=${fundAmount} from=${bucket.name}`,
          timestamp: new Date(),
        });
      },
    );
  },

  async listByHospital(hospitalId: string): Promise<FinanceProject[]> {
    return db.financeProjects.where('hospitalId').equals(hospitalId).toArray();
  },
};

// ── Investments ────────────────────────────────────────────────────────────
export const FinanceInvestmentOps = {
  async create(input: {
    hospitalId: string;
    type: string;
    amount: number;
    roi: number;
    note?: string | null;
    date?: Date;
    createdBy: string;
  }): Promise<FinanceInvestment> {
    const inv: FinanceInvestment = {
      id: uuidv4(),
      hospitalId: input.hospitalId,
      type: input.type,
      amount: round2(input.amount),
      roi: input.roi,
      note: input.note ?? null,
      date: input.date ?? new Date(),
      createdBy: input.createdBy,
      createdAt: new Date(),
    };
    await db.financeInvestments.add(inv);
    await audit(input.hospitalId, input.createdBy, 'investment.add',
      `type=${input.type} amount=${inv.amount} roi=${input.roi}`);
    return inv;
  },

  async listByHospital(hospitalId: string, limit = 500): Promise<FinanceInvestment[]> {
    return db.financeInvestments
      .where('hospitalId')
      .equals(hospitalId)
      .reverse()
      .limit(limit)
      .toArray();
  },
};
