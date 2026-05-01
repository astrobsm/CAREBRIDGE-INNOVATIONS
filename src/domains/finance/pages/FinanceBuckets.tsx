import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronDown, ChevronUp, Banknote } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database/db';
import { FinanceBucketOps } from '../services/financeOps';
import type { FinanceBucket } from '../types';

function fmtNaira(n: number): string {
  return `₦${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

interface AdjustModalState {
  bucketId: string;
  bucketName: string;
}

export default function FinanceBuckets() {
  const { user } = useAuth();
  const hospitalId = user?.hospitalId || 'global';

  useEffect(() => {
    FinanceBucketOps.ensureDefaults(hospitalId).catch(() => {});
  }, [hospitalId]);

  const buckets = useLiveQuery(
    () => db.financeBuckets.where('hospitalId').equals(hospitalId).toArray(),
    [hospitalId],
    [],
  );

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<AdjustModalState | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  const total = (buckets || []).reduce((s, b) => s + (b.balance || 0), 0);

  const handleSave = async (b: FinanceBucket, changes: Partial<FinanceBucket>) => {
    if (!user) return;
    try {
      await FinanceBucketOps.update(b.id, changes, user.id);
      toast.success(`Updated ${b.name}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed');
    }
  };

  const submitAdjustment = async () => {
    if (!user || !adjust) return;
    const amount = parseFloat(adjustAmount);
    if (!amount || !adjustReason.trim()) {
      toast.error('Amount and reason required');
      return;
    }
    try {
      await FinanceBucketOps.adjust(adjust.bucketId, amount, adjustReason, user.id);
      toast.success(`Adjusted ${adjust.bucketName}`);
      setAdjust(null);
      setAdjustAmount('');
      setAdjustReason('');
    } catch (e: any) {
      toast.error(e?.message || 'Adjustment failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {(buckets || []).length} buckets · Total balance{' '}
          <span className="font-semibold text-gray-900">{fmtNaira(total)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(buckets || []).map((b) => {
          const isOpen = expandedId === b.id;
          return (
            <BucketCard
              key={b.id}
              bucket={b}
              expanded={isOpen}
              onToggle={() => setExpandedId(isOpen ? null : b.id)}
              onSave={(changes) => handleSave(b, changes)}
              onAdjust={() => setAdjust({ bucketId: b.id, bucketName: b.name })}
            />
          );
        })}
      </div>

      {adjust && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-3">
            <div className="text-lg font-semibold text-gray-800">
              Adjust “{adjust.bucketName}”
            </div>
            <p className="text-xs text-gray-500">
              Use a positive amount to credit, negative to debit. An audit log entry will be recorded.
            </p>
            <div>
              <label className="block text-sm text-gray-700">Amount (₦)</label>
              <input
                type="number"
                step="0.01"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Reason</label>
              <input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAdjust(null)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitAdjustment}
                className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  bucket: FinanceBucket;
  expanded: boolean;
  onToggle: () => void;
  onSave: (changes: Partial<FinanceBucket>) => void;
  onAdjust: () => void;
}

function BucketCard({ bucket, expanded, onToggle, onSave, onAdjust }: CardProps) {
  const [pct, setPct] = useState(String(bucket.percentage));
  const [cap, setCap] = useState(bucket.monthlyCap != null ? String(bucket.monthlyCap) : '');
  const [hardStop, setHardStop] = useState(bucket.hardStop);
  const [bank, setBank] = useState({
    bankAccount: bucket.bankAccount || '',
    bankName: bucket.bankName || '',
    accountNumber: bucket.accountNumber || '',
    accountName: bucket.accountName || '',
    bankBranch: bucket.bankBranch || '',
    bankNotes: bucket.bankNotes || '',
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-base font-semibold text-gray-900">{bucket.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">{bucket.percentage}% allocation</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-gray-900">{fmtNaira(bucket.balance)}</div>
          {bucket.monthlyCap && (
            <div className="text-xs text-gray-500">Cap: {fmtNaira(bucket.monthlyCap)}</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <label className="text-xs text-gray-600 col-span-1 flex flex-col">
          %
          <input
            type="number"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="text-xs text-gray-600 col-span-1 flex flex-col">
          Monthly cap
          <input
            type="number"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            className="mt-1 rounded-md border border-gray-300 px-2 py-1"
          />
        </label>
        <label className="text-xs text-gray-600 col-span-1 flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={hardStop}
            onChange={(e) => setHardStop(e.target.checked)}
          />
          Hard stop
        </label>
      </div>

      <button
        onClick={onToggle}
        className="text-xs text-indigo-600 inline-flex items-center gap-1 hover:underline"
      >
        <Banknote size={14} /> Bank details {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          {(['bankAccount', 'bankName', 'accountNumber', 'accountName', 'bankBranch'] as const).map((k) => (
            <label key={k} className="text-xs text-gray-600 flex flex-col">
              {k}
              <input
                value={bank[k]}
                onChange={(e) => setBank({ ...bank, [k]: e.target.value })}
                className="mt-1 rounded-md border border-gray-300 px-2 py-1"
              />
            </label>
          ))}
          <label className="text-xs text-gray-600 flex flex-col col-span-2">
            Notes
            <textarea
              value={bank.bankNotes}
              onChange={(e) => setBank({ ...bank, bankNotes: e.target.value })}
              rows={2}
              className="mt-1 rounded-md border border-gray-300 px-2 py-1"
            />
          </label>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() =>
            onSave({
              percentage: parseFloat(pct) || 0,
              monthlyCap: cap ? parseFloat(cap) : null,
              hardStop,
              ...bank,
            })
          }
          className="flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Save
        </button>
        <button
          onClick={onAdjust}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          Manual adjustment
        </button>
      </div>
    </div>
  );
}
