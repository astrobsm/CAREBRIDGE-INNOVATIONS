// Finance domain (Part B – ZIGMA BOND port)
// Native TypeScript port of the ZIGMA BOND personal-finance / treasury module.
// Uses string UUIDs (CareBridge convention) and is multi-tenant via hospitalId.

export type FinanceTxType = 'credit' | 'debit';

export interface FinanceBucket {
  id: string;
  hospitalId: string;
  name: string;
  percentage: number;        // 0-100, sums to 100 across active buckets
  balance: number;           // current Naira balance
  monthlyCap?: number | null;
  hardStop: boolean;         // if true, expense > balance is rejected
  // Bank account routing details (optional)
  bankAccount?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  bankBranch?: string | null;
  bankNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinanceIncome {
  id: string;
  hospitalId: string;
  source: string;            // 'Salary' | 'Private Practice' | 'Business' | 'Other' | custom
  amount: number;
  note?: string | null;
  date: Date;
  createdBy: string;         // userId
  distributed: boolean;      // whether bucket distribution has been applied
  createdAt: Date;
}

export interface FinanceTransaction {
  id: string;
  hospitalId: string;
  bucketId: string;
  type: FinanceTxType;
  amount: number;
  description?: string | null;
  date: Date;
  linkedIncomeId?: string | null;
  linkedExpenseId?: string | null;
  linkedProjectId?: string | null;
  createdAt: Date;
}

export interface FinanceExpense {
  id: string;
  hospitalId: string;
  category: string;
  bucketId: string;
  amount: number;
  description?: string | null;
  date: Date;
  createdBy: string;
  createdAt: Date;
}

export type FinanceProjectStatus = 'planned' | 'active' | 'completed' | 'on_hold';

export interface FinanceProject {
  id: string;
  hospitalId: string;
  name: string;
  totalBudget: number;
  fundedAmount: number;
  status: FinanceProjectStatus;
  milestones?: string | null; // free-form text or JSON
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FinanceInvestment {
  id: string;
  hospitalId: string;
  type: string;              // 'Treasury Bills' | 'Real Estate' | 'Business' | 'Stocks' | ...
  amount: number;
  roi: number;               // annual % (estimated)
  note?: string | null;
  date: Date;
  createdBy: string;
  createdAt: Date;
}

export interface FinanceAuditLog {
  id: string;
  hospitalId: string;
  actor: string;             // userId or email
  action: string;            // 'income.add' | 'expense.add' | 'project.fund' | 'bucket.adjust' | ...
  detail?: string | null;
  timestamp: Date;
}

export interface FinanceMetrics {
  monthlyIncome: number;
  yearlyIncome: number;
  monthlyExpenses: number;
  burnRate: number;                // 3-month avg expenses / 3
  savingsRate: number;             // (qtrIncome - qtrExpense) / qtrIncome * 100
  investmentRatio: number;         // qtrInvestment / qtrIncome * 100
  disciplineScore: number;         // 0-100
  emergencyCoverageMonths: number; // emergency bucket balance / burnRate
  healthScore: number;             // 0-100
}

export interface FinanceTotals {
  incomeCount: number;
  expenseCount: number;
  investmentCount: number;
  projectCount: number;
}
