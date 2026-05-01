import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../../contexts/AuthContext';
import { FinanceBucketOps, FinanceProjectOps } from '../services/financeOps';

const createSchema = z.object({
  name: z.string().min(1, 'Required'),
  totalBudget: z.coerce.number().positive('Must be positive'),
  milestones: z.string().optional(),
});

type CreateFormData = z.infer<typeof createSchema>;

function fmtNaira(n: number): string {
  return `₦${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function FinanceProjects() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || 'global';

  const projects = useLiveQuery(
    () => FinanceProjectOps.listByHospital(hospitalId),
    [hospitalId],
    [],
  );
  const buckets = useLiveQuery(
    () => FinanceBucketOps.listByHospital(hospitalId),
    [hospitalId],
    [],
  );

  const [submitting, setSubmitting] = useState(false);
  const [fundFor, setFundFor] = useState<{ id: string; name: string } | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundBucketId, setFundBucketId] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', totalBudget: 0, milestones: '' },
  });

  const onCreate = async (data: CreateFormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await FinanceProjectOps.create({
        hospitalId,
        name: data.name,
        totalBudget: data.totalBudget,
        milestones: data.milestones || null,
        createdBy: user.id,
      });
      toast.success('Project created');
      reset();
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submitFund = async () => {
    if (!user || !fundFor) return;
    const amt = parseFloat(fundAmount);
    if (!amt || !fundBucketId) {
      toast.error('Amount and bucket required');
      return;
    }
    try {
      await FinanceProjectOps.fund(fundFor.id, amt, fundBucketId, user.id);
      toast.success(`Funded ${fundFor.name}`);
      setFundFor(null);
      setFundAmount('');
      setFundBucketId('');
    } catch (e: any) {
      toast.error(e?.message || 'Funding failed');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form
        onSubmit={handleSubmit(onCreate)}
        className="lg:col-span-1 space-y-3 rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="text-lg font-semibold text-gray-800">New Project</div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            {...register('name')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Total Budget (₦)</label>
          <input
            type="number"
            step="0.01"
            {...register('totalBudget')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.totalBudget && (
            <p className="text-xs text-red-500 mt-1">{errors.totalBudget.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Milestones</label>
          <textarea
            {...register('milestones')}
            rows={3}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Free-form text or JSON"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Create'}
        </button>
      </form>

      <div className="lg:col-span-2 space-y-3">
        {(projects || []).length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
            No projects yet.
          </div>
        )}
        {(projects || []).map((p) => {
          const pct =
            p.totalBudget > 0
              ? Math.min(100, Math.round((p.fundedAmount / p.totalBudget) * 100))
              : 0;
          return (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Status:{' '}
                    <span
                      className={
                        p.status === 'completed'
                          ? 'text-emerald-600 font-medium'
                          : 'text-indigo-600'
                      }
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFundFor({ id: p.id, name: p.name });
                    setFundAmount('');
                    setFundBucketId('');
                  }}
                  disabled={p.status === 'completed'}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Fund
                </button>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {fmtNaira(p.fundedAmount)} / {fmtNaira(p.totalBudget)} ({pct}%)
              </div>
              <div className="h-2 bg-gray-200 rounded overflow-hidden mt-1">
                <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
              </div>
              {p.milestones && (
                <pre className="mt-3 text-xs whitespace-pre-wrap text-gray-500 bg-gray-50 rounded p-2">
                  {p.milestones}
                </pre>
              )}
            </div>
          );
        })}
      </div>

      {fundFor && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-3">
            <div className="text-lg font-semibold text-gray-800">Fund “{fundFor.name}”</div>
            <div>
              <label className="block text-sm text-gray-700">Amount (₦)</label>
              <input
                type="number"
                step="0.01"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Source bucket</label>
              <select
                value={fundBucketId}
                onChange={(e) => setFundBucketId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">— Select —</option>
                {(buckets || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({fmtNaira(b.balance)})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setFundFor(null)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitFund}
                className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Fund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
