// Shopping Checklist Types

export type ConsumableCategory = 
  | 'drapes_covers'
  | 'gloves_protection'
  | 'blades_sharps'
  | 'syringes_needles'
  | 'wound_care'
  | 'dressings_bandages'
  | 'iv_fluids'
  | 'iv_medications'
  | 'sutures'
  | 'catheters_tubes'
  | 'antiseptics'
  | 'injections'
  | 'miscellaneous';

export interface ConsumableItem {
  id: string;
  name: string;
  category: ConsumableCategory;
  variants?: string[];
  defaultQuantity: number;
  unit: string;
}

export interface SelectedItem {
  item: ConsumableItem;
  quantity: number;
  selectedVariant?: string;
}

export interface ShoppingList {
  id: string;
  createdAt: string;
  createdBy: string;
  purpose: 'surgery' | 'bedside_debridement' | 'wound_dressing' | 'intralesional_injection' | 'other';
  purposeDescription?: string;
  patientId?: string;
  patientName?: string;
  items: SelectedItem[];
  notes?: string;
}

export const categoryLabels: Record<ConsumableCategory, string> = {
  drapes_covers: 'Drapes & Covers',
  gloves_protection: 'Gloves & Protection',
  blades_sharps: 'Blades & Sharps',
  syringes_needles: 'Syringes & Needles',
  wound_care: 'Wound Care Products',
  dressings_bandages: 'Dressings & Bandages',
  iv_fluids: 'IV Fluids',
  iv_medications: 'IV Medications',
  sutures: 'Sutures',
  catheters_tubes: 'Catheters & Tubes',
  antiseptics: 'Antiseptics & Solutions',
  injections: 'Injectable Medications',
  miscellaneous: 'Miscellaneous',
};
