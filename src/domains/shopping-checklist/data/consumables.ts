import { ConsumableItem } from '../types';

export const consumableItems: ConsumableItem[] = [
  // Drapes & Covers
  { id: 'delivery-mat', name: 'Delivery Mat', category: 'drapes_covers', defaultQuantity: 1, unit: 'pcs' },
  { id: 'sterile-drape', name: 'Sterile Drape', category: 'drapes_covers', defaultQuantity: 2, unit: 'pcs' },

  // Gloves & Protection
  { id: 'surgical-gloves', name: 'Surgical Gloves', category: 'gloves_protection', variants: ['Size 7.5', 'Size 8.0'], defaultQuantity: 2, unit: 'pairs' },
  { id: 'disposable-gloves', name: 'Disposable Gloves', category: 'gloves_protection', defaultQuantity: 4, unit: 'pairs' },

  // Blades & Sharps
  { id: 'surgical-blade', name: 'Surgical Blade', category: 'blades_sharps', variants: ['Size 20', 'Size 22'], defaultQuantity: 2, unit: 'pcs' },

  // Syringes & Needles
  { id: 'syringe-10ml', name: 'Syringe 10mls', category: 'syringes_needles', defaultQuantity: 5, unit: 'pcs' },
  { id: 'syringe-5ml', name: 'Syringe 5mls', category: 'syringes_needles', defaultQuantity: 5, unit: 'pcs' },
  { id: 'syringe-2ml', name: 'Syringe 2mls', category: 'syringes_needles', defaultQuantity: 5, unit: 'pcs' },
  { id: 'insulin-syringe', name: 'Insulin Syringe', category: 'syringes_needles', defaultQuantity: 5, unit: 'pcs' },
  { id: 'extra-needles', name: 'Extra Needles', category: 'syringes_needles', defaultQuantity: 10, unit: 'pcs' },

  // Wound Care Products
  { id: 'hydrogen-peroxide', name: 'Hydrogen Peroxide', category: 'wound_care', defaultQuantity: 1, unit: 'bottle' },
  { id: 'wound-clex-spray', name: 'Wound Clex Spray', category: 'wound_care', defaultQuantity: 1, unit: 'bottle' },
  { id: 'wound-care-honey-gauze', name: 'Wound Care Honey Gauze', category: 'wound_care', defaultQuantity: 2, unit: 'pcs' },
  { id: 'hera-wound-gel', name: 'Hera Wound Gel', category: 'wound_care', defaultQuantity: 1, unit: 'tube' },
  { id: 'sofratule-gauze', name: 'Sofratule Gauze', category: 'wound_care', defaultQuantity: 2, unit: 'pcs' },

  // Dressings & Bandages
  { id: 'dressing-packs', name: 'Dressing Packs', category: 'dressings_bandages', defaultQuantity: 2, unit: 'pcs' },
  { id: 'gamgee-pack', name: 'Gamgee Pack', category: 'dressings_bandages', defaultQuantity: 1, unit: 'pack' },
  { id: 'crepe-bandage', name: 'Crepe Bandage', category: 'dressings_bandages', variants: ['4 Inches', '6 Inches'], defaultQuantity: 2, unit: 'pcs' },
  { id: 'plaster', name: 'Plaster', category: 'dressings_bandages', variants: ['Small', 'Big'], defaultQuantity: 1, unit: 'roll' },
  { id: 'veil-band', name: 'Veil Band', category: 'dressings_bandages', defaultQuantity: 1, unit: 'pcs' },
  { id: 'pop-bandage', name: 'POP Bandage', category: 'dressings_bandages', defaultQuantity: 2, unit: 'pcs' },

  // IV Fluids
  { id: 'iv-normal-saline', name: 'IV Normal Saline', category: 'iv_fluids', variants: ['500mls', '1000mls'], defaultQuantity: 2, unit: 'bags' },
  { id: 'iv-ringers-lactate', name: 'IV Ringers Lactate 500mls', category: 'iv_fluids', defaultQuantity: 2, unit: 'bags' },
  { id: 'iv-dextrose-10', name: 'IV 10% Dextrose 500mls', category: 'iv_fluids', defaultQuantity: 1, unit: 'bags' },
  { id: 'infusion-giving-set', name: 'Infusion Giving Set', category: 'iv_fluids', defaultQuantity: 2, unit: 'pcs' },
  { id: 'blood-giving-set', name: 'Blood Giving Set', category: 'iv_fluids', defaultQuantity: 1, unit: 'pcs' },
  { id: 'cannulae', name: 'Cannulae', category: 'iv_fluids', variants: ['Yellow', 'Pink', 'Blue', 'Green', 'Ash'], defaultQuantity: 2, unit: 'pcs' },

  // IV Medications
  { id: 'iv-ceftriaxone', name: 'IV Ceftriaxone 1g', category: 'iv_medications', defaultQuantity: 2, unit: 'vials' },
  { id: 'iv-clindamycin', name: 'IV Clindamycin 300mg', category: 'iv_medications', defaultQuantity: 2, unit: 'vials' },
  { id: 'iv-levofloxacin', name: 'IV Levofloxacin 500mg', category: 'iv_medications', defaultQuantity: 1, unit: 'vials' },
  { id: 'iv-ciprofloxacin', name: 'IV Ciprofloxacin 200mg', category: 'iv_medications', defaultQuantity: 1, unit: 'vials' },
  { id: 'sodium-bicarbonate', name: 'Sodium Bicarbonate', category: 'iv_medications', defaultQuantity: 2, unit: 'amps' },
  { id: 'water-for-injection', name: 'Water for Injection', category: 'iv_medications', defaultQuantity: 10, unit: 'amps' },
  { id: 'infusion-paracetamol', name: 'Infusion Paracetamol', category: 'iv_medications', defaultQuantity: 2, unit: 'bottles' },

  // Sutures
  { id: 'vicryl', name: 'Vicryl', category: 'sutures', variants: ['2/0', '3/0', '4/0'], defaultQuantity: 2, unit: 'pcs' },
  { id: 'prolene', name: 'Prolene', category: 'sutures', variants: ['2/0', '3/0', '4/0'], defaultQuantity: 2, unit: 'pcs' },
  { id: 'nylon', name: 'Nylon', category: 'sutures', variants: ['0', '1', '2/0'], defaultQuantity: 2, unit: 'pcs' },

  // Catheters & Tubes
  { id: 'urethral-catheter', name: 'Urethral Catheter (All Silicone Size 16)', category: 'catheters_tubes', defaultQuantity: 1, unit: 'pcs' },
  { id: 'urine-bag', name: 'Urine Bag', category: 'catheters_tubes', defaultQuantity: 1, unit: 'pcs' },
  { id: 'ng-tube', name: 'NG Tube', category: 'catheters_tubes', variants: ['Size 8', 'Size 10', 'Size 12', 'Size 14', 'Size 16', 'Size 18', 'Size 20'], defaultQuantity: 1, unit: 'pcs' },
  { id: 'redivac-drain', name: 'Redivac Drain', category: 'catheters_tubes', defaultQuantity: 1, unit: 'pcs' },
  { id: 'suction-tubing', name: 'Suction Tubing', category: 'catheters_tubes', defaultQuantity: 1, unit: 'pcs' },
  { id: 'specimen-containers', name: 'Specimen Containers', category: 'catheters_tubes', variants: ['Small', 'Medium', 'Big'], defaultQuantity: 2, unit: 'pcs' },

  // Antiseptics & Solutions
  { id: 'povidone-iodine', name: 'Povidone Iodine Solution', category: 'antiseptics', defaultQuantity: 1, unit: 'bottle' },
  { id: 'savlon-solution', name: 'Savlon Solution', category: 'antiseptics', defaultQuantity: 1, unit: 'bottle' },
  { id: 'methylated-spirit', name: 'Methylated Spirit', category: 'antiseptics', defaultQuantity: 1, unit: 'bottle' },
  { id: 'hand-sanitizer', name: 'Hand Sanitizer', category: 'antiseptics', defaultQuantity: 1, unit: 'bottle' },
  { id: 'hand-wash-solution', name: 'Hand Wash Solution', category: 'antiseptics', defaultQuantity: 1, unit: 'bottle' },
  { id: 'ky-jelly', name: 'KY Jelly', category: 'antiseptics', defaultQuantity: 1, unit: 'tube' },

  // Injectable Medications
  { id: 'plain-xylocaine', name: 'Plain Xylocaine', category: 'injections', defaultQuantity: 2, unit: 'vials' },
  { id: 'xylocaine-adrenaline', name: 'Xylocaine Plus Adrenaline', category: 'injections', defaultQuantity: 2, unit: 'vials' },
  { id: 'inj-promethazine', name: 'Inj Promethazine', category: 'injections', defaultQuantity: 2, unit: 'amps' },
  { id: 'inj-hydrocortisone', name: 'Inj Hydrocortisone', category: 'injections', defaultQuantity: 2, unit: 'vials' },
  { id: 'inj-diazepam', name: 'Inj Diazepam', category: 'injections', defaultQuantity: 2, unit: 'amps' },
  { id: 'inj-tramadol', name: 'Inj Tramadol', category: 'injections', defaultQuantity: 2, unit: 'amps' },
  { id: 'inj-pentazocine', name: 'Inj Pentazocine', category: 'injections', defaultQuantity: 2, unit: 'amps' },
  { id: 'inj-kenalog', name: 'Inj Kenalog (Triamcinolone)', category: 'injections', defaultQuantity: 1, unit: 'vials' },
  { id: 'stopain-spray', name: 'Stopain Spray (Topical Anaesthetic)', category: 'injections', defaultQuantity: 1, unit: 'bottle' },
];

export const getProcedurePresets = (purpose: string): string[] => {
  switch (purpose) {
    case 'surgery':
      return [
        'delivery-mat', 'sterile-drape', 'surgical-gloves', 'surgical-blade',
        'syringe-10ml', 'syringe-5ml', 'dressing-packs', 'gamgee-pack',
        'crepe-bandage', 'iv-normal-saline', 'infusion-giving-set', 'cannulae',
        'iv-ceftriaxone', 'water-for-injection', 'vicryl', 'prolene',
        'povidone-iodine', 'plain-xylocaine', 'xylocaine-adrenaline',
        'disposable-gloves', 'inj-tramadol', 'infusion-paracetamol'
      ];
    case 'bedside_debridement':
      return [
        'sterile-drape', 'surgical-gloves', 'surgical-blade', 'syringe-10ml',
        'hydrogen-peroxide', 'wound-clex-spray', 'dressing-packs', 'gamgee-pack',
        'crepe-bandage', 'povidone-iodine', 'plain-xylocaine', 'disposable-gloves',
        'inj-tramadol', 'stopain-spray'
      ];
    case 'wound_dressing':
      return [
        'disposable-gloves', 'dressing-packs', 'hydrogen-peroxide', 'wound-clex-spray',
        'wound-care-honey-gauze', 'hera-wound-gel', 'gamgee-pack', 'crepe-bandage',
        'plaster', 'povidone-iodine', 'savlon-solution'
      ];
    case 'intralesional_injection':
      return [
        'disposable-gloves', 'syringe-2ml', 'syringe-5ml', 'insulin-syringe',
        'inj-kenalog', 'plain-xylocaine', 'povidone-iodine', 'plaster'
      ];
    default:
      return [];
  }
};
