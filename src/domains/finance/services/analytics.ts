// Finance analytics – ports ZIGMA BOND services/analytics.py to TypeScript.
// All metrics computed from Dexie tables, scoped per hospital.

import { db } from '../../../database/db';
import type { FinanceMetrics, FinanceTotals } from '../types';

interface DateBounds {
  start: Date;
  end: Date;
}

function monthBounds(d: Date = new Date()): DateBounds {
  return {
    start: new Date(d.getFullYear(), d.getMonth(), 1),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
  };
}

function yearBounds(d: Date = new Date()): DateBounds {
  return {
    start: new Date(d.getFullYear(), 0, 1),
    end: new Date(d.getFullYear() + 1, 0, 1),
  };
}

function lastNMonthsBounds(n: number, d: Date = new Date()): DateBounds {
  return {
    start: new Date(d.getFullYear(), d.getMonth() - n, 1),
    end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
  };
}

function inBounds(date: Date | string, b: DateBounds): boolean {
  const t = (date instanceof Date ? date : new Date(date)).getTime();
  return t >= b.start.getTime() && t < b.end.getTime();
}

function clamp01to100(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export async function computeMetrics(hospitalId: string): Promise<FinanceMetrics> {
  const [income, expenses, investments, buckets] = await Promise.all([
    db.financeIncome.where('hospitalId').equals(hospitalId).toArray(),
    db.financeExpenses.where('hospitalId').equals(hospitalId).toArray(),
    db.financeInvestments.where('hospitalId').equals(hospitalId).toArray(),
    db.financeBuckets.where('hospitalId').equals(hospitalId).toArray(),
  ]);

  const month = monthBounds();
  const year = yearBounds();
  const last3 = lastNMonthsBounds(3);

  const monthlyIncome = sum(income.filter((x) => inBounds(x.date, month)).map((x) => x.amount));
  const yearlyIncome = sum(income.filter((x) => inBounds(x.date, year)).map((x) => x.amount));
  const monthlyExpenses = sum(expenses.filter((x) => inBounds(x.date, month)).map((x) => x.amount));

  const last3Expenses = sum(expenses.filter((x) => inBounds(x.date, last3)).map((x) => x.amount));
  const burnRate = last3Expenses / 3;

  const qtrIncome = sum(income.filter((x) => inBounds(x.date, last3)).map((x) => x.amount));
  const qtrExpenses = last3Expenses;
  const qtrInvestments = sum(investments.filter((x) => inBounds(x.date, last3)).map((x) => x.amount));

  const savingsRate = qtrIncome > 0 ? ((qtrIncome - qtrExpenses) / qtrIncome) * 100 : 0;
  const investmentRatio = qtrIncome > 0 ? (qtrInvestments / qtrIncome) * 100 : 0;

  // Cap discipline – proportion of expenses that respected monthly caps
  const cappedBuckets = buckets.filter((b) => b.monthlyCap && b.monthlyCap > 0);
  let capScore = 100;
  if (cappedBuckets.length > 0) {
    let respected = 0;
    for (const b of cappedBuckets) {
      const monthSpend = sum(
        expenses
          .filter((e) => e.bucketId === b.id && inBounds(e.date, month))
          .map((e) => e.amount),
      );
      if (monthSpend <= (b.monthlyCap || 0)) respected += 1;
    }
    capScore = (respected / cappedBuckets.length) * 100;
  }

  const emergency = buckets.find((b) => b.name.toLowerCase() === 'emergency');
  const emergencyBalance = emergency?.balance ?? 0;
  const emergencyCoverageMonths = burnRate > 0 ? emergencyBalance / burnRate : 0;
  const coverageScore = clamp01to100((emergencyCoverageMonths / 6) * 100); // target: 6 months
  const investScore = clamp01to100(investmentRatio * 4); // target: ~25% → 100

  const disciplineScore = Math.round(
    0.4 * clamp01to100(savingsRate) +
      0.3 * capScore +
      0.3 * coverageScore,
  );
  const healthScore = Math.round(
    0.3 * clamp01to100(savingsRate) +
      0.2 * investScore +
      0.3 * coverageScore +
      0.2 * capScore,
  );

  return {
    monthlyIncome: round2(monthlyIncome),
    yearlyIncome: round2(yearlyIncome),
    monthlyExpenses: round2(monthlyExpenses),
    burnRate: round2(burnRate),
    savingsRate: round2(savingsRate),
    investmentRatio: round2(investmentRatio),
    disciplineScore,
    emergencyCoverageMonths: round2(emergencyCoverageMonths),
    healthScore,
  };
}

export async function computeTotals(hospitalId: string): Promise<FinanceTotals> {
  const [incomeCount, expenseCount, investmentCount, projectCount] = await Promise.all([
    db.financeIncome.where('hospitalId').equals(hospitalId).count(),
    db.financeExpenses.where('hospitalId').equals(hospitalId).count(),
    db.financeInvestments.where('hospitalId').equals(hospitalId).count(),
    db.financeProjects.where('hospitalId').equals(hospitalId).count(),
  ]);
  return { incomeCount, expenseCount, investmentCount, projectCount };
}

function sum(arr: number[]): number {
  return arr.reduce((s, n) => s + (n || 0), 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
