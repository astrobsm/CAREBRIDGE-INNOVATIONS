import { useOutletContext } from 'react-router-dom';
import type { FamilyParent } from '../types';

export interface FamilyCtx { parent: FamilyParent }

export function useFamilyCtx(): FamilyCtx {
  return useOutletContext<FamilyCtx>();
}
