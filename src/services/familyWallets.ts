// Family wallet bucket helpers — every CREDIT auto-splits across three
// buckets per the wallet's configured percentages (default 60/30/10).
//
//   savings  — locked, parent-only withdrawal
//   personal — child can spend; penalties debit from here
//   charity  — child chooses when to donate
//
// All callers should use these helpers instead of touching family.wallets /
// family.transactions directly so the buckets stay consistent.

import { getFamilyClient } from './familyClient';
import type { Wallet, Transaction } from '../domains/family/types';

export type Bucket = 'savings' | 'personal' | 'charity';
export type TxType = Transaction['type'];

export async function getOrCreateWallet(childId: string): Promise<Wallet | null> {
  const fam = getFamilyClient();
  const { data } = await fam.from('wallets').select('*').eq('child_id', childId).maybeSingle();
  if (data) return data as Wallet;
  const ins = await fam.from('wallets').insert({
    child_id: childId, balance: 0, base_stipend: 0,
    savings_balance: 0, personal_balance: 0, charity_balance: 0,
    split_savings_pct: 60, split_personal_pct: 30, split_charity_pct: 10,
  }).select('*').single();
  return (ins.data as Wallet) ?? null;
}

interface SplitShares { savings: number; personal: number; charity: number }

function computeSplit(amount: number, w: Wallet): SplitShares {
  const sp = Number(w.split_savings_pct ?? 60);
  const pp = Number(w.split_personal_pct ?? 30);
  // round savings & personal, charity takes the remainder so they sum exactly
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const savings = round2((amount * sp) / 100);
  const personal = round2((amount * pp) / 100);
  const charity = round2(amount - savings - personal);
  return { savings, personal, charity };
}

/**
 * Credit `amount` to a child's wallet, auto-splitting across the 3 buckets.
 * Writes one transaction row per non-zero bucket so the ledger shows the split.
 */
export async function creditWithSplit(
  childId: string,
  amount: number,
  type: TxType,
  description: string,
): Promise<void> {
  if (!amount || amount <= 0) return;
  const fam = getFamilyClient();
  const w = await getOrCreateWallet(childId);
  if (!w) return;
  const share = computeSplit(amount, w);
  const newSavings  = Number(w.savings_balance  ?? 0) + share.savings;
  const newPersonal = Number(w.personal_balance ?? 0) + share.personal;
  const newCharity  = Number(w.charity_balance  ?? 0) + share.charity;
  const newTotal    = newSavings + newPersonal + newCharity;

  await fam.from('wallets').update({
    savings_balance: newSavings,
    personal_balance: newPersonal,
    charity_balance: newCharity,
    balance: newTotal,
  }).eq('id', w.id);

  const rows: Partial<Transaction>[] = [];
  if (share.savings > 0)  rows.push({ child_id: childId, wallet_id: w.id, type, bucket: 'savings',  amount: share.savings,  balance_after: newSavings,  description: `${description} (savings ${w.split_savings_pct}%)` });
  if (share.personal > 0) rows.push({ child_id: childId, wallet_id: w.id, type, bucket: 'personal', amount: share.personal, balance_after: newPersonal, description: `${description} (personal ${w.split_personal_pct}%)` });
  if (share.charity > 0)  rows.push({ child_id: childId, wallet_id: w.id, type, bucket: 'charity',  amount: share.charity,  balance_after: newCharity,  description: `${description} (charity ${w.split_charity_pct}%)` });
  if (rows.length) await fam.from('transactions').insert(rows);
}

/**
 * Debit `amount` from a specific bucket. Allows the bucket to go negative
 * (e.g. penalties hit personal even if it's empty — lesson learned).
 */
export async function debitFromBucket(
  childId: string,
  bucket: Bucket,
  amount: number,
  type: TxType,
  description: string,
): Promise<void> {
  if (!amount || amount <= 0) return;
  const fam = getFamilyClient();
  const w = await getOrCreateWallet(childId);
  if (!w) return;
  const cur = Number((w as any)[`${bucket}_balance`] ?? 0);
  const newVal = cur - amount;
  const patch: Record<string, number> = { [`${bucket}_balance`]: newVal };
  const totalBuckets = ['savings','personal','charity'].reduce((sum, b) => {
    return sum + (b === bucket ? newVal : Number((w as any)[`${b}_balance`] ?? 0));
  }, 0);
  patch.balance = totalBuckets;

  await fam.from('wallets').update(patch).eq('id', w.id);
  await fam.from('transactions').insert({
    child_id: childId,
    wallet_id: w.id,
    type,
    bucket,
    amount: -amount,
    balance_after: newVal,
    description,
  });
}

/** Child-initiated charity donation: debits the charity bucket. */
export async function donateToCharity(childId: string, amount: number, cause: string) {
  return debitFromBucket(childId, 'charity', amount, 'charity_donation', `Donation to ${cause}`);
}
