import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { computeMetrics, computeTotals } from '../services/analytics';
import type { FinanceMetrics, FinanceTotals } from '../types';

function fmtMoney(n: number | undefined) {
  if (n == null || isNaN(n)) return '—';
  return `₦${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function fmtPct(n: number | undefined) {
  if (n == null || isNaN(n)) return '—';
  return `${Number(n).toFixed(1)}%`;
}

const METRIC_LABELS: Array<[keyof FinanceMetrics, string, (v: number) => string]> = [
  ['monthlyIncome', 'Monthly income', fmtMoney],
  ['yearlyIncome', 'Yearly income', fmtMoney],
  ['monthlyExpenses', 'Monthly expenses', fmtMoney],
  ['burnRate', 'Burn rate (3-mo avg)', fmtMoney],
  ['savingsRate', 'Savings rate', fmtPct],
  ['investmentRatio', 'Investment ratio', fmtPct],
  ['disciplineScore', 'Discipline score', (v) => `${v}/100`],
  ['emergencyCoverageMonths', 'Emergency coverage', (v) => `${Number(v).toFixed(1)} mo`],
  ['healthScore', 'Health score', (v) => `${v}/100`],
];

const TOTAL_LABELS: Array<[keyof FinanceTotals, string]> = [
  ['incomeCount', 'Income entries'],
  ['expenseCount', 'Expense entries'],
  ['investmentCount', 'Investments'],
  ['projectCount', 'Projects'],
];

export default function FinanceSettings() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || 'global';
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null);
  const [totals, setTotals] = useState<FinanceTotals | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([computeMetrics(hospitalId), computeTotals(hospitalId)]).then(([m, t]) => {
      if (alive) {
        setMetrics(m);
        setTotals(t);
      }
    });
    return () => {
      alive = false;
    };
  }, [hospitalId]);

  const downloadPdf = () => {
    if (!metrics || !totals) {
      toast.error('Metrics not ready');
      return;
    }
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Finance Report — Part B (ZIGMA BOND)', 14, 18);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
      doc.text(`User: ${user?.firstName || ''} ${user?.lastName || ''}  Role: ${user?.role || ''}`, 14, 32);

      let y = 44;
      doc.setFontSize(12);
      doc.text('Metrics', 14, y);
      y += 6;
      doc.setFontSize(10);
      METRIC_LABELS.forEach(([k, label, fmt]) => {
        doc.text(`${label}: ${fmt(metrics[k] as number)}`, 14, y);
        y += 6;
      });

      y += 4;
      doc.setFontSize(12);
      doc.text('Totals', 14, y);
      y += 6;
      doc.setFontSize(10);
      TOTAL_LABELS.forEach(([k, label]) => {
        doc.text(`${label}: ${totals[k] ?? 0}`, 14, y);
        y += 6;
      });

      doc.save(`finance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Report downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'PDF generation failed');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-lg font-semibold text-gray-800 mb-2">Account</div>
        <Field label="Name" value={`${user?.firstName || ''} ${user?.lastName || ''}`.trim()} />
        <Field label="Email" value={user?.email || ''} />
        <Field label="Role" value={user?.role || ''} />
        <Field label="Hospital ID" value={hospitalId} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-lg font-semibold text-gray-800 mb-2">Reports</div>
        <button
          onClick={downloadPdf}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Download PDF report
        </button>

        {metrics && totals && (
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Metrics</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {METRIC_LABELS.map(([k, label, fmt]) => (
                  <div
                    key={k}
                    className="flex justify-between text-sm border-b border-gray-200/60 py-1"
                  >
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium">{fmt(metrics[k] as number)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Totals</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TOTAL_LABELS.map(([k, label]) => (
                  <div key={k} className="rounded-lg bg-gray-100 px-3 py-2">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="text-lg font-semibold">{totals[k] ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 lg:col-span-2">
        <div className="text-lg font-semibold text-gray-800 mb-2">Offline & Sync</div>
        <p className="text-sm text-gray-500">
          The Finance module shares the AstroHEALTH PWA infrastructure: writes go to
          IndexedDB first and sync to Supabase in the background when online. No separate
          sign-in is required.
        </p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value || '—'}</div>
    </div>
  );
}
