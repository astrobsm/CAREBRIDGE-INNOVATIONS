import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useLiveQuery } from 'dexie-react-hooks';
import { useAuth } from '../../../contexts/AuthContext';
import { FinanceInvestmentOps } from '../services/financeOps';

const TYPES = ['Treasury Bills', 'Real Estate', 'Business', 'Stocks', 'Mutual Fund', 'Other'] as const;

const schema = z.object({
  type: z.string().min(1),
  amount: z.coerce.number().positive(),
  roi: z.coerce.number().min(0).default(0),
  note: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function fmtNaira(n: number): string {
  return `₦${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function FinanceInvestments() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || 'global';
  const [submitting, setSubmitting] = useState(false);

  const list = useLiveQuery(
    () => FinanceInvestmentOps.listByHospital(hospitalId),
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
    defaultValues: { type: TYPES[0], amount: 0, roi: 0, note: '' },
  });

  const total = (list || []).reduce((s, x) => s + (x.amount || 0), 0);
  const projected = (list || []).reduce(
    (s, x) => s + x.amount * (1 + (x.roi || 0) / 100),
    0,
  );

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSubmitting(true);
    try {
      await FinanceInvestmentOps.create({
        hospitalId,
        type: data.type,
        amount: data.amount,
        roi: data.roi,
        note: data.note || null,
        createdBy: user.id,
      });
      toast.success('Investment logged');
      reset({ type: data.type, amount: 0, roi: 0, note: '' });
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
        <div className="text-lg font-semibold text-gray-800">Log Investment</div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Type</label>
          <select
            {...register('type')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
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
          <label className="block text-sm font-medium text-gray-700">Estimated ROI (%)</label>
          <input
            type="number"
            step="0.01"
            {...register('roi')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Note</label>
          <input
            {...register('note')}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>

      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">Total Invested</div>
            <div className="text-2xl font-bold mt-1">{fmtNaira(total)}</div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="text-xs uppercase tracking-wide text-gray-500">Projected Value</div>
            <div className="text-2xl font-bold mt-1 text-emerald-600">{fmtNaira(projected)}</div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-lg font-semibold text-gray-800 mb-3">Holdings</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-2 pr-3">Date</th>
                  <th className="pr-3">Type</th>
                  <th className="pr-3">Amount</th>
                  <th className="pr-3">ROI %</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {(list || []).map((x) => (
                  <tr key={x.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-2 pr-3">{new Date(x.date).toLocaleDateString()}</td>
                    <td className="pr-3">{x.type}</td>
                    <td className="pr-3 font-medium">{fmtNaira(x.amount)}</td>
                    <td className="pr-3">{x.roi}</td>
                    <td className="text-gray-500">{x.note}</td>
                  </tr>
                ))}
                {(list || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No investments yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
