import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database/db';
import { FinanceBucketOps, FinanceExpenseOps } from '../services/financeOps';

const schema = z.object({
  category: z.string().min(1, 'Required'),
  bucketId: z.string().min(1, 'Select a bucket'),
  amount: z.coerce.number().positive('Must be positive'),
  description: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function fmtNaira(n: number): string {
  return `₦${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function FinanceExpenses() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || 'global';
  const [submitting, setSubmitting] = useState(false);

  const buckets = useLiveQuery(
    () => FinanceBucketOps.listByHospital(hospitalId),
    [hospitalId],
    [],
  );
  const expenses = useLiveQuery(
    () =>
      db.financeExpenses
        .where('hospitalId')
        .equals(hospitalId)
        .reverse()
        .limit(200)
        .toArray(),
    [hospitalId],
    [],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: '', bucketId: '', amount: 0, description: '' },
  });

  const bucketName = (id: string) => buckets?.find((b) => b.id === id)?.name || id;

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await FinanceExpenseOps.create({
        hospitalId,
        category: data.category,
        bucketId: data.bucketId,
        amount: data.amount,
        description: data.description || null,
        createdBy: user.id,
      });
      toast.success('Expense recorded');
      reset({ category: '', bucketId: data.bucketId, amount: 0, description: '' });
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="lg:col-span-1 space-y-3 rounded-xl border border-gray-200 bg-white p-4"
      >
        <div className="text-lg font-semibold text-gray-800">Add Expense</div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <input
            {...register('category')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="e.g. Utilities"
          />
          {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Bucket (source)</label>
          <select
            {...register('bucketId')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— Select —</option>
            {(buckets || []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({fmtNaira(b.balance)})
              </option>
            ))}
          </select>
          {errors.bucketId && <p className="text-xs text-red-500 mt-1">{errors.bucketId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Amount (₦)</label>
          <input
            type="number"
            step="0.01"
            {...register('amount')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input
            {...register('description')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Record Expense'}
        </button>
      </form>

      <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4">
        <div className="text-lg font-semibold text-gray-800 mb-3">Recent Expenses</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-gray-200">
              <tr>
                <th className="py-2 pr-3">Date</th>
                <th className="pr-3">Category</th>
                <th className="pr-3">Bucket</th>
                <th className="pr-3">Amount</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {(expenses || []).map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-3">{new Date(e.date).toLocaleDateString()}</td>
                  <td className="pr-3">{e.category}</td>
                  <td className="pr-3 text-gray-600">{bucketName(e.bucketId)}</td>
                  <td className="pr-3 font-medium text-rose-600">{fmtNaira(e.amount)}</td>
                  <td className="text-gray-500">{e.description}</td>
                </tr>
              ))}
              {(expenses || []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    No expenses yet.
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
