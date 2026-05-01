import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database/db';
import { FinanceIncomeOps } from '../services/financeOps';

const SOURCES = ['Salary', 'Private Practice', 'Business', 'Other'] as const;

const schema = z.object({
  source: z.string().min(1, 'Required'),
  amount: z.coerce.number().positive('Must be positive'),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function fmtNaira(n: number): string {
  return `₦${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function FinanceIncome() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || 'global';
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { source: SOURCES[0], amount: 0, note: '' },
  });

  const incomes = useLiveQuery(
    () =>
      db.financeIncome
        .where('hospitalId')
        .equals(hospitalId)
        .reverse()
        .limit(100)
        .toArray(),
    [hospitalId],
    [],
  );

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await FinanceIncomeOps.create({
        hospitalId,
        source: data.source,
        amount: data.amount,
        note: data.note || null,
        createdBy: user.id,
      });
      toast.success('Income recorded & distributed across buckets');
      reset({ source: data.source, amount: 0, note: '' });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save income');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={handleSubmit(onSubmit)} className="lg:col-span-1 space-y-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-lg font-semibold text-gray-800">Add Income</div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Source</label>
          <select
            {...register('source')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {SOURCES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {errors.source && <p className="text-xs text-red-500 mt-1">{errors.source.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Amount (₦)</label>
          <input
            type="number"
            step="0.01"
            {...register('amount')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
          {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Note</label>
          <input
            {...register('note')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Record & Distribute'}
        </button>
      </form>

      <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-lg font-semibold text-gray-800 mb-3">Recent Income</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-200">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="pr-3">Source</th>
                <th className="pr-3">Amount</th>
                <th className="pr-3">Distributed</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {(incomes || []).map((i) => (
                <tr key={i.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-3">{new Date(i.date).toLocaleDateString()}</td>
                  <td className="pr-3">{i.source}</td>
                  <td className="pr-3 font-medium">{fmtNaira(i.amount)}</td>
                  <td className="pr-3">
                    {i.distributed ? (
                      <span className="text-emerald-600">✓</span>
                    ) : (
                      <span className="text-amber-600">pending</span>
                    )}
                  </td>
                  <td className="text-gray-500">{i.note}</td>
                </tr>
              ))}
              {(incomes || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    No income entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
