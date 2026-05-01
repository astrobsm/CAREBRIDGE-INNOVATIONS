import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database/db';
import { computeMetrics } from '../services/analytics';
import { FinanceBucketOps } from '../services/financeOps';
import type { FinanceMetrics } from '../types';

const PIE_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function fmtNaira(n: number): string {
  return `₦${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent || 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

export default function FinanceDashboard() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || 'global';
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);

  const buckets = useLiveQuery(
    () => db.financeBuckets.where('hospitalId').equals(hospitalId).toArray(),
    [hospitalId],
    [],
  );
  const projects = useLiveQuery(
    () => db.financeProjects.where('hospitalId').equals(hospitalId).toArray(),
    [hospitalId],
    [],
  );

  useEffect(() => {
    FinanceBucketOps.ensureDefaults(hospitalId).catch(() => {});
  }, [hospitalId]);

  useEffect(() => {
    let alive = true;
    computeMetrics(hospitalId).then((m) => {
      if (alive) setMetrics(m);
    });
    return () => {
      alive = false;
    };
  }, [hospitalId, buckets?.length, projects?.length]);

  const pieData = (buckets || [])
    .filter((b) => b.balance > 0)
    .map((b) => ({ name: b.name, value: b.balance }));

  const barData = (buckets || []).map((b) => ({
    name: b.name,
    Percentage: b.percentage,
    Balance: b.balance,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Monthly Income" value={fmtNaira(metrics?.monthlyIncome || 0)} accent="text-emerald-600" />
        <StatCard label="Yearly Income" value={fmtNaira(metrics?.yearlyIncome || 0)} accent="text-emerald-700" />
        <StatCard label="Monthly Expenses" value={fmtNaira(metrics?.monthlyExpenses || 0)} accent="text-rose-600" />
        <StatCard label="Burn Rate (3-mo avg)" value={fmtNaira(metrics?.burnRate || 0)} accent="text-amber-600" />
        <StatCard label="Savings Rate" value={`${(metrics?.savingsRate || 0).toFixed(1)}%`} />
        <StatCard label="Investment Ratio" value={`${(metrics?.investmentRatio || 0).toFixed(1)}%`} />
        <StatCard label="Emergency Coverage" value={`${(metrics?.emergencyCoverageMonths || 0).toFixed(1)} mo`} />
        <StatCard label="Health Score" value={`${metrics?.healthScore ?? 0}/100`} accent="text-indigo-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">Bucket Balances</div>
          {pieData.length === 0 ? (
            <div className="text-sm text-gray-500 py-12 text-center">
              No funded buckets yet — add income to begin distribution.
            </div>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={100}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtNaira(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm font-semibold text-gray-700 mb-2">Allocation vs Balance</div>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={barData}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Percentage" fill="#6366f1" />
                <Bar dataKey="Balance" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">Project Progress</div>
        {(projects || []).length === 0 ? (
          <div className="text-sm text-gray-500">No projects yet.</div>
        ) : (
          <div className="space-y-3">
            {(projects || []).map((p) => {
              const pct =
                p.totalBudget > 0
                  ? Math.min(100, Math.round((p.fundedAmount / p.totalBudget) * 100))
                  : 0;
              return (
                <div key={p.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span className="text-gray-500">
                      {fmtNaira(p.fundedAmount)} / {fmtNaira(p.totalBudget)} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
