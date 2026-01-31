/**
 * ============================================================
 * Dressing Protocol Print Generator
 * ============================================================
 * 
 * Generates dressing protocol documents for 80mm thermal printer
 * Printer: XP-T80Q
 * Font: Georgia, 12pt, 0.8 line spacing
 * ============================================================
 */

import { THERMAL_PRINTER_CONFIG, THERMAL_TYPOGRAPHY, THERMAL_LAYOUT } from './thermalPrintConfig';
import { format } from 'date-fns';

// Wound phase protocols (matching WoundsPage.tsx)
export interface WoundPhaseProtocol {
  name: string;
  description: string;
  granulationPercent: string;
  dressingFrequency: string;
  protocol: string[];
  color?: string;
}

// ============================================================
// PAIN MANAGEMENT PROTOCOLS FOR WOUND DRESSING
// ============================================================
export interface PainManagementProtocol {
  painLevel: 'mild' | 'moderate' | 'severe';
  score: string;
  firstLine: string[];
  alternativeForPUD: string[]; // For patients with peptic ulcer/gastritis
  notes: string[];
}

export const PAIN_MANAGEMENT_PROTOCOLS: Record<string, PainManagementProtocol> = {
  mild: {
    painLevel: 'mild',
    score: '1-3/10',
    firstLine: [
      'Paracetamol 1g PO 30 mins before dressing',
      'May add Ibuprofen 400mg PO if no contraindications',
    ],
    alternativeForPUD: [
      'Paracetamol 1g PO 30 mins before dressing',
      '⚠️ AVOID NSAIDs - Patient has PUD/Gastritis risk',
      'Consider Tramadol 50mg PO if paracetamol insufficient',
    ],
    notes: [
      'Reassess pain during and after dressing',
      'Document pain score before, during, and after',
    ],
  },
  moderate: {
    painLevel: 'moderate',
    score: '4-6/10',
    firstLine: [
      'Paracetamol 1g + Ibuprofen 400mg PO 30-45 mins before',
      'Or Tramadol 50-100mg PO 30 mins before dressing',
      'Consider IV Paracetamol 1g if oral not tolerated',
    ],
    alternativeForPUD: [
      'Paracetamol 1g PO/IV 30 mins before dressing',
      '⚠️ AVOID NSAIDs - Patient has PUD/Gastritis risk',
      'Tramadol 50-100mg PO 30 mins before dressing',
      'Consider adding PPI cover: Omeprazole 20mg if needed',
    ],
    notes: [
      'May require top-up analgesia during procedure',
      'Allow rest periods during long dressing changes',
      'Consider anxiolytic if significant anxiety',
    ],
  },
  severe: {
    painLevel: 'severe',
    score: '7-10/10',
    firstLine: [
      'IV Morphine 2.5-5mg or Pentazocine 30mg 15 mins before',
      'IV Paracetamol 1g as adjunct',
      'Ketamine 0.3-0.5mg/kg IV for procedural sedation if available',
      'Consider conscious sedation for extensive burns',
    ],
    alternativeForPUD: [
      'IV Morphine 2.5-5mg or Pentazocine 30mg 15 mins before',
      'IV Paracetamol 1g as adjunct',
      '⚠️ AVOID all NSAIDs including IV Ketorolac',
      'Add IV Omeprazole 40mg for gastroprotection',
      'Consider Ketamine for procedural sedation',
    ],
    notes: [
      'Requires monitoring during and after opioid use',
      'Have reversal agent (Naloxone) available',
      'Consider theatre/procedural room for extensive dressings',
      'Document oxygen saturation, BP, and level of consciousness',
    ],
  },
};

// ============================================================
// UNIVERSAL DRESSING PREPARATION STEPS
// ============================================================
export const UNIVERSAL_DRESSING_PREPARATION = {
  step1_painControl: {
    title: 'Step 1: Pain Assessment & Control',
    description: 'Ensure adequate analgesia before starting',
    actions: [
      'Assess pain using 0-10 numerical rating scale',
      'Check for PUD/Gastritis history or risk factors',
      'Administer appropriate analgesia based on pain level',
      'Wait adequate time for analgesia to take effect (15-30 mins)',
      'Document pre-procedure pain score',
    ],
  },
  step2_sterileField: {
    title: 'Step 2: Set Up Sterile Field',
    description: 'Prepare aseptic environment',
    actions: [
      'Perform hand hygiene (soap & water or alcohol rub)',
      'Don sterile gloves (and gown if extensive wound)',
      'Prepare sterile trolley with sterile drape',
      'Open dressing packs using aseptic technique',
      'Pour solutions into sterile gallipots',
    ],
  },
  step3_crossCheckItems: {
    title: 'Step 3: Cross-Check Dressing Items',
    description: 'Verify all required materials before starting',
    actions: [
      'Verify cleaning solution (Wound Clex Spray)',
      'Check first layer supplies (Sofratule, Hera Gel)',
      'Confirm secondary layer (Woundcare-Honey Gauze for deep burns)',
      'Prepare capillary layer (Sterile dry gauze)',
      'Prepare absorbent layer (Sterile cotton wool pads)',
      'Prepare restraining layer (Crepe bandage or plaster)',
      'Have scissors, forceps, and disposal bag ready',
    ],
  },
};

// ============================================================
// BURN WOUND DRESSING PROTOCOLS
// ============================================================
export interface BurnDressingProtocol {
  name: string;
  description: string;
  burnDepth: string;
  dressingFrequency: string;
  preparation: string[];
  protocol: string[];
  restrainingLayer: string[];
  specialConsiderations: string[];
  weeklySwabRequired: boolean;
}

export const BURN_DRESSING_PROTOCOLS: Record<string, BurnDressingProtocol> = {
  superficial: {
    name: 'Superficial (1st Degree) Burn Dressing',
    description: 'Epidermal burns - intact skin, erythema, no blisters',
    burnDepth: 'Superficial/Epidermal',
    dressingFrequency: 'Daily or as needed',
    preparation: [
      ...UNIVERSAL_DRESSING_PREPARATION.step1_painControl.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step2_sterileField.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step3_crossCheckItems.actions,
    ],
    protocol: [
      '1. Clean with Wound Clex Spray solution',
      '2. Pat dry with sterile gauze',
      '3. Apply moisturizing cream or aloe vera gel',
      '4. Cover with non-adherent dressing if needed',
      '5. Secure with light gauze or tubular bandage',
    ],
    restrainingLayer: ['Light gauze wrap or tubular bandage'],
    specialConsiderations: [
      'Usually heals within 7-10 days',
      'Monitor for conversion to deeper burn',
      'Keep moisturized to prevent cracking',
    ],
    weeklySwabRequired: true,
  },
  superficial_partial: {
    name: 'Superficial Partial Thickness (2nd Degree) Burn',
    description: 'Dermal burns - blisters, moist, pink base, very painful',
    burnDepth: 'Superficial Partial Thickness',
    dressingFrequency: 'Every 2-3 days',
    preparation: [
      ...UNIVERSAL_DRESSING_PREPARATION.step1_painControl.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step2_sterileField.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step3_crossCheckItems.actions,
    ],
    protocol: [
      '1. Irrigate with Wound Clex Spray solution',
      '2. Carefully debride loose skin and deroofed blisters',
      '3. First layer: Apply Sofratule embedded with Hera Gel',
      '4. Capillary layer: Overlay with 3 layers sterile dry gauze',
      '5. Absorbent layer: Apply sterile cotton wool pads',
      '6. Restraining layer: Secure with crepe bandage or plaster',
    ],
    restrainingLayer: [
      'Crepe bandage for limbs/trunk',
      'Plaster/tape for small areas',
      'Tubular bandage for fingers/toes',
    ],
    specialConsiderations: [
      'Heals within 2-3 weeks if no infection',
      'High infection risk - monitor closely',
      'Very painful - ensure adequate analgesia',
      'Weekly wound swab for culture mandatory',
    ],
    weeklySwabRequired: true,
  },
  deep_partial: {
    name: 'Deep Partial Thickness (Deep 2nd Degree) Burn',
    description: 'Deep dermal burns - pale, less painful, prolonged healing',
    burnDepth: 'Deep Partial Thickness',
    dressingFrequency: 'Every 2-3 days',
    preparation: [
      ...UNIVERSAL_DRESSING_PREPARATION.step1_painControl.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step2_sterileField.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step3_crossCheckItems.actions,
    ],
    protocol: [
      '1. Irrigate thoroughly with Wound Clex Spray solution',
      '2. Debride necrotic tissue and slough',
      '3. First layer: Apply Sofratule + Hera Gel',
      '4. Second layer: Apply Woundcare-Honey Gauze (for deep dermal)',
      '5. Capillary layer: 3-4 layers sterile dry gauze',
      '6. Absorbent layer: Generous cotton wool pads',
      '7. Restraining layer: Secure with crepe bandage',
    ],
    restrainingLayer: [
      'Crepe bandage - ensure not too tight',
      'Check circulation after application',
    ],
    specialConsiderations: [
      'May require surgical debridement',
      'Consider early grafting if not healing by 3 weeks',
      'High risk of hypertrophic scarring',
      'Weekly wound swab mandatory',
      'May convert to full thickness - monitor',
    ],
    weeklySwabRequired: true,
  },
  full_thickness: {
    name: 'Full Thickness (3rd Degree) Burn Dressing',
    description: 'Complete skin destruction - leathery, painless, requires grafting',
    burnDepth: 'Full Thickness',
    dressingFrequency: 'Daily to alternate day',
    preparation: [
      ...UNIVERSAL_DRESSING_PREPARATION.step1_painControl.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step2_sterileField.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step3_crossCheckItems.actions,
    ],
    protocol: [
      '1. Irrigate with Wound Clex Spray solution',
      '2. Debride eschar edges and loose tissue',
      '3. First layer: Apply Sofratule + generous Hera Gel',
      '4. Second layer: Apply Woundcare-Honey Gauze (essential for 3rd degree)',
      '5. Capillary layer: 4-5 layers sterile dry gauze',
      '6. Absorbent layer: Thick padding with cotton wool',
      '7. Restraining layer: Crepe bandage - ensure adequate pressure',
    ],
    restrainingLayer: [
      'Crepe bandage with firm (not tight) pressure',
      'Plaster reinforcement at high movement areas',
      'Consider splinting for joints',
    ],
    specialConsiderations: [
      'Will NOT heal without surgery - requires skin grafting',
      'Prepare patient for surgical intervention',
      'Monitor for eschar separation and infection',
      'Weekly wound swab mandatory',
      'Nutritional support essential',
      'Physiotherapy to prevent contractures',
    ],
    weeklySwabRequired: true,
  },
  post_graft: {
    name: 'Post-Skin Graft Burn Site Dressing',
    description: 'Care of grafted burn wound',
    burnDepth: 'Post-Grafting',
    dressingFrequency: 'As directed by surgeon',
    preparation: [
      ...UNIVERSAL_DRESSING_PREPARATION.step1_painControl.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step2_sterileField.actions,
      ...UNIVERSAL_DRESSING_PREPARATION.step3_crossCheckItems.actions,
    ],
    protocol: [
      '1. Remove outer dressings carefully',
      '2. If stuck, moisten with saline (NOT Wound Clex for fresh grafts)',
      '3. Irrigate gently with Wound Clex Spray solution',
      '4. Assess graft take - color, adherence, exudate',
      '5. Apply Sofratule embedded with Hera Gel',
      '6. Capillary layer: 3 layers sterile dry gauze',
      '7. Absorbent layer: Cotton wool pads',
      '8. Restraining layer: Crepe bandage - secure but not tight',
    ],
    restrainingLayer: [
      'Crepe bandage - avoid shear forces',
      'Consider tie-over dressing if instructed',
      'Splint to immobilize area',
    ],
    specialConsiderations: [
      'Handle graft site with extreme care',
      'Avoid shear forces - can dislodge graft',
      'First dressing typically by surgeon at day 5',
      'Report any graft discoloration immediately',
      'Weekly wound swab until healed',
    ],
    weeklySwabRequired: true,
  },
};

// ============================================================
// DRESSING CHECKLIST ITEMS
// ============================================================
export const DRESSING_CHECKLIST = {
  cleaningSolution: {
    name: 'Cleaning Solution',
    item: 'Wound Clex Spray',
    quantity: '1-2 bottles depending on wound size',
    purpose: 'Antimicrobial wound irrigation',
  },
  firstLayer: {
    name: 'First/Contact Layer',
    items: [
      { name: 'Sofratule', purpose: 'Non-adherent contact layer' },
      { name: 'Hera Gel', purpose: 'Hydrogel for moist wound healing' },
    ],
  },
  secondLayer: {
    name: 'Secondary Layer (for deep/3rd degree burns)',
    item: 'Woundcare-Honey Gauze',
    purpose: 'Antimicrobial, debridement, promotes granulation',
    indication: 'Deep partial thickness and full thickness burns',
  },
  capillaryLayer: {
    name: 'Capillary Layer',
    item: 'Sterile Dry Gauze',
    quantity: '3-5 layers depending on exudate',
    purpose: 'Wick away exudate from wound surface',
  },
  absorbentLayer: {
    name: 'Absorbent Layer',
    item: 'Sterile Cotton Wool Pads',
    quantity: 'Generous padding as needed',
    purpose: 'Absorb excess exudate',
  },
  restrainingLayer: {
    name: 'Restraining/Securing Layer',
    items: [
      { name: 'Crepe Bandage', indication: 'Limbs, trunk, large areas' },
      { name: 'Plaster/Tape', indication: 'Small wounds, reinforcement' },
      { name: 'Tubular Bandage', indication: 'Digits, cylindrical body parts' },
    ],
    purpose: 'Secure dressing in place',
  },
};

export const WOUND_PHASES: Record<string, WoundPhaseProtocol> = {
  extension: {
    name: 'Extension Phase',
    description: 'Necrotic and edematous with no evidence of granulation or healthy tissue',
    granulationPercent: '0%',
    dressingFrequency: 'Daily',
    protocol: [
      '── PREPARATION ──',
      '• Assess pain (0-10 scale) and give analgesia 30 mins before',
      '• Avoid NSAIDs if PUD/gastritis risk - use Paracetamol ± Tramadol',
      '• Set up sterile field and don sterile gloves',
      '• Cross-check all dressing items before starting',
      '── PROCEDURE ──',
      'Clean with Wound Clex Solution',
      'Pack with first layer: Hera Gel',
      'Second layer: Woundcare-Honey Gauze',
      'Capillary layer: Sterile Gauze',
      'Absorbent layer: Cotton Wool',
      'Restraining layer: Crepe bandage or plaster',
    ],
  },
  transition: {
    name: 'Transition Phase',
    description: 'Granulation up to 40% of wound surface, edema reduced, discharges minimal',
    granulationPercent: '1-40%',
    dressingFrequency: 'Alternate Day',
    protocol: [
      '── PREPARATION ──',
      '• Assess pain (0-10 scale) and give analgesia 30 mins before',
      '• Avoid NSAIDs if PUD/gastritis risk - use Paracetamol ± Tramadol',
      '• Set up sterile field and don sterile gloves',
      '• Cross-check all dressing items before starting',
      '── PROCEDURE ──',
      'Clean with Wound Clex Solution',
      'Pack with first layer: Hera Gel',
      'Second layer: Woundcare-Honey Gauze',
      'Capillary layer: Sterile Gauze',
      'Absorbent layer: Cotton Wool',
      'Restraining layer: Crepe bandage or plaster',
    ],
  },
  repair: {
    name: 'Repair/Indolent Phase',
    description: 'Active granulation and epithelialization, minimal to no exudate',
    granulationPercent: '>40%',
    dressingFrequency: 'Alternate Day',
    protocol: [
      '── PREPARATION ──',
      '• Assess pain (0-10 scale) and give analgesia 30 mins before',
      '• Avoid NSAIDs if PUD/gastritis risk - use Paracetamol ± Tramadol',
      '• Set up sterile field and don sterile gloves',
      '• Cross-check all dressing items before starting',
      '── PROCEDURE ──',
      'Clean with Wound Clex Solution',
      'Pack with first layer: Hera Gel',
      'Second layer: Woundcare-Honey Gauze',
      'Capillary layer: Sterile Gauze',
      'Absorbent layer: Cotton Wool',
      'Restraining layer: Crepe bandage or plaster',
    ],
  },
};

// Skin Graft and Donor Site Dressing Protocols
export interface SkinGraftProtocol {
  name: string;
  description: string;
  dressingFrequency: string;
  preparation: string[];
  protocol: string[];
  warnings?: string[];
}

export const SKIN_GRAFT_PROTOCOLS: Record<string, SkinGraftProtocol> = {
  skin_graft_site: {
    name: 'Skin Graft Recipient Site',
    description: 'Post-operative dressing for skin graft recipient site',
    dressingFrequency: 'As directed by surgeon',
    preparation: [
      '── PREPARATION ──',
      '• Assess pain (0-10 scale) and give analgesia 30 mins before',
      '• Avoid NSAIDs if PUD/gastritis risk - use Paracetamol ± Tramadol',
      '• Set up sterile field and don sterile gloves',
      '• Cross-check all dressing items before starting',
    ],
    protocol: [
      '── PROCEDURE ──',
      '1. Irrigate using Wound Clex Spray solution',
      '2. Apply Sofratulle gauze embedded with Hera Gel',
      '3. Overlay with 3 layers of sterile dry gauze',
      '4. Secure with crepe bandage or plaster as appropriate for the site',
    ],
    warnings: [
      'Handle graft site with extreme care',
      'Do not apply excessive pressure',
      'Monitor for signs of graft failure (discoloration, separation)',
    ],
  },
  donor_site: {
    name: 'Skin Graft Donor Site',
    description: 'Post-operative dressing for donor site after surgeon removes intraoperative dressing',
    dressingFrequency: 'As directed by surgeon',
    preparation: [
      '── PREPARATION ──',
      '• Assess pain (0-10 scale) and give analgesia 30 mins before',
      '• Avoid NSAIDs if PUD/gastritis risk - use Paracetamol ± Tramadol',
      '• Set up sterile field and don sterile gloves',
      '• Cross-check all dressing items before starting',
    ],
    protocol: [
      '── PROCEDURE ──',
      '1. After surgeon removes last Sofratulle layer of intraoperative dressing:',
      '2. Irrigate gently with Wound Clex Solution',
      '3. Apply Hera Gel embedded in Sofratulle gauze',
      '4. Overlay with 4 layers of sterile dry gauze',
      '5. Secure with crepe bandage or plaster as appropriate',
    ],
    warnings: [
      '⚠️ DO NOT force any Sofratulle layer out if stuck and dry',
      '⚠️ If stuck: Simply trim the edges and overlay with sterile dry gauze',
      '⚠️ Secure with crepe bandage',
      '⚠️ When removing primary intraoperative dressings, do so CAREFULLY',
      '⚠️ DO NOT attempt to moisten with any solution',
      '⚠️ If stuck and dry, allow it in place',
    ],
  },
};

export interface DressingProtocolData {
  patientName: string;
  hospitalNumber: string;
  wardBed?: string;
  woundLocation: string;
  woundType: string;
  woundDimensions: {
    length: number;
    width: number;
    depth?: number;
    area?: number;
  };
  tissueTypes: string[];
  exudateAmount: string;
  exudateType?: string;
  phase: keyof typeof WOUND_PHASES;
  painLevel?: number;
  specialInstructions?: string;
  assessedBy: string;
  assessedAt: Date;
  nextDressingDate?: Date;
  hospitalName?: string;
}

/**
 * Generate dressing protocol HTML for 80mm thermal printer
 */
export function generateDressingProtocolHTML(data: DressingProtocolData): string {
  const phase = WOUND_PHASES[data.phase];
  const printDate = format(new Date(), 'dd/MM/yyyy HH:mm');
  const assessmentDate = format(data.assessedAt, 'dd/MM/yyyy');
  
  const nextDressing = data.nextDressingDate 
    ? format(data.nextDressingDate, 'dd/MM/yyyy')
    : phase.dressingFrequency === 'Daily' 
      ? format(new Date(Date.now() + 24 * 60 * 60 * 1000), 'dd/MM/yyyy')
      : format(new Date(Date.now() + 48 * 60 * 60 * 1000), 'dd/MM/yyyy');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dressing Protocol - ${data.patientName}</title>
  <style>
    @page {
      size: ${THERMAL_PRINTER_CONFIG.paperWidth}mm auto;
      margin: ${THERMAL_LAYOUT.marginTop}mm ${THERMAL_LAYOUT.marginRight}mm ${THERMAL_LAYOUT.marginBottom}mm ${THERMAL_LAYOUT.marginLeft}mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: ${THERMAL_TYPOGRAPHY.fontFamily};
      font-size: ${THERMAL_TYPOGRAPHY.fontSize}pt;
      line-height: ${THERMAL_TYPOGRAPHY.lineHeight};
      color: #000;
      background: #fff;
      width: ${THERMAL_PRINTER_CONFIG.printableWidth}mm;
      max-width: ${THERMAL_PRINTER_CONFIG.printableWidth}mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .container {
      width: 100%;
      padding: 0;
    }
    
    .header {
      text-align: center;
      padding-bottom: 2mm;
      border-bottom: 2px solid #000;
      margin-bottom: 2mm;
    }
    
    .header h1 {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeTitle}pt;
      font-weight: bold;
      margin-bottom: 1mm;
      text-transform: uppercase;
    }
    
    .header h2 {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
    }
    
    .header .hospital {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
      margin-top: 1mm;
    }
    
    .section {
      margin: 2mm 0;
      padding-bottom: 2mm;
      border-bottom: 1px dashed #000;
    }
    
    .section:last-child {
      border-bottom: none;
    }
    
    .section-title {
      font-weight: bold;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader - 2}pt;
      text-transform: uppercase;
      margin-bottom: 1mm;
      background: #000;
      color: #fff;
      padding: 1mm 2mm;
      text-align: center;
    }
    
    .row {
      display: flex;
      justify-content: space-between;
      margin: 0.5mm 0;
    }
    
    .row .label {
      font-weight: bold;
    }
    
    .row .value {
      text-align: right;
    }
    
    .phase-box {
      border: 2px solid #000;
      padding: 2mm;
      margin: 2mm 0;
      text-align: center;
    }
    
    .phase-name {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .phase-freq {
      font-size: ${THERMAL_TYPOGRAPHY.fontSize}pt;
      margin-top: 1mm;
    }
    
    .protocol-list {
      list-style: none;
      padding: 0;
      margin: 1mm 0;
    }
    
    .protocol-list li {
      padding: 1mm 0;
      border-bottom: 1px dotted #ccc;
      display: flex;
    }
    
    .protocol-list li:last-child {
      border-bottom: none;
    }
    
    .step-num {
      font-weight: bold;
      min-width: 5mm;
      margin-right: 2mm;
    }
    
    .dimensions-box {
      border: 1px solid #000;
      padding: 2mm;
      margin: 1mm 0;
      text-align: center;
    }
    
    .dim-title {
      font-weight: bold;
      margin-bottom: 1mm;
    }
    
    .dim-values {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
    }
    
    .tissue-types {
      display: flex;
      flex-wrap: wrap;
      gap: 1mm;
      margin: 1mm 0;
    }
    
    .tissue-tag {
      border: 1px solid #000;
      padding: 0.5mm 2mm;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .warning-box {
      border: 2px solid #000;
      padding: 2mm;
      margin: 2mm 0;
      text-align: center;
      background: #f0f0f0;
    }
    
    .warning-title {
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .next-dressing {
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeHeader}pt;
      font-weight: bold;
      text-align: center;
      padding: 2mm;
      border: 2px dashed #000;
      margin: 2mm 0;
    }
    
    .footer {
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 2px solid #000;
      text-align: center;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .signature-line {
      margin-top: 8mm;
      border-top: 1px solid #000;
      padding-top: 1mm;
      text-align: center;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    .qr-placeholder {
      text-align: center;
      margin: 2mm 0;
      font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Dressing Protocol</h1>
      <h2>Wound Care Instructions</h2>
      ${data.hospitalName ? `<div class="hospital">${data.hospitalName}</div>` : ''}
    </div>
    
    <!-- Patient Information -->
    <div class="section">
      <div class="section-title">Patient Details</div>
      <div class="row">
        <span class="label">Name:</span>
        <span class="value">${data.patientName}</span>
      </div>
      <div class="row">
        <span class="label">Hosp No:</span>
        <span class="value">${data.hospitalNumber}</span>
      </div>
      ${data.wardBed ? `
      <div class="row">
        <span class="label">Ward/Bed:</span>
        <span class="value">${data.wardBed}</span>
      </div>
      ` : ''}
      <div class="row">
        <span class="label">Date:</span>
        <span class="value">${assessmentDate}</span>
      </div>
    </div>
    
    <!-- Wound Information -->
    <div class="section">
      <div class="section-title">Wound Details</div>
      <div class="row">
        <span class="label">Location:</span>
        <span class="value">${data.woundLocation}</span>
      </div>
      <div class="row">
        <span class="label">Type:</span>
        <span class="value">${data.woundType}</span>
      </div>
      
      <div class="dimensions-box">
        <div class="dim-title">Dimensions</div>
        <div class="dim-values">
          ${data.woundDimensions.length} × ${data.woundDimensions.width}${data.woundDimensions.depth ? ` × ${data.woundDimensions.depth}` : ''} cm
        </div>
        ${data.woundDimensions.area ? `<div>Area: ${data.woundDimensions.area} cm²</div>` : ''}
      </div>
      
      <div class="row">
        <span class="label">Exudate:</span>
        <span class="value">${data.exudateAmount}${data.exudateType ? ` (${data.exudateType})` : ''}</span>
      </div>
      ${data.painLevel !== undefined ? `
      <div class="row">
        <span class="label">Pain Level:</span>
        <span class="value">${data.painLevel}/10</span>
      </div>
      ` : ''}
      
      <div style="margin-top: 1mm;">
        <span class="label">Tissue Types:</span>
        <div class="tissue-types">
          ${data.tissueTypes.map(t => `<span class="tissue-tag">${t}</span>`).join('')}
        </div>
      </div>
    </div>
    
    <!-- Wound Phase -->
    <div class="section">
      <div class="phase-box">
        <div class="phase-name">${phase.name}</div>
        <div class="phase-freq">Dressing: ${phase.dressingFrequency}</div>
      </div>
      <div style="font-size: ${THERMAL_TYPOGRAPHY.fontSizeSmall}pt; text-align: center; margin-top: 1mm;">
        ${phase.description}
      </div>
    </div>
    
    <!-- Dressing Protocol -->
    <div class="section">
      <div class="section-title">Dressing Protocol</div>
      <ol class="protocol-list">
        ${phase.protocol.map((step, index) => `
          <li>
            <span class="step-num">${index + 1}.</span>
            <span>${step}</span>
          </li>
        `).join('')}
      </ol>
    </div>
    
    ${data.specialInstructions ? `
    <!-- Special Instructions -->
    <div class="section">
      <div class="warning-box">
        <div class="warning-title">⚠ Special Instructions</div>
        <div>${data.specialInstructions}</div>
      </div>
    </div>
    ` : ''}
    
    <!-- Next Dressing -->
    <div class="next-dressing">
      NEXT DRESSING: ${nextDressing}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="row">
        <span class="label">Assessed by:</span>
        <span class="value">${data.assessedBy}</span>
      </div>
      <div class="signature-line">
        Signature / Stamp
      </div>
      <div style="margin-top: 2mm;">
        Printed: ${printDate}
      </div>
      <div style="margin-top: 1mm;">
        *** END OF PROTOCOL ***
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Print dressing protocol to thermal printer
 */
export function printDressingProtocol(data: DressingProtocolData): void {
  const html = generateDressingProtocolHTML(data);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };
}

/**
 * Download dressing protocol as HTML file
 */
export function downloadDressingProtocol(data: DressingProtocolData, filename?: string): void {
  const html = generateDressingProtocolHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `dressing-protocol-${data.hospitalNumber}-${format(new Date(), 'yyyyMMdd')}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export dressing protocol as PDF (using browser print to PDF)
 */
export function exportDressingProtocolPDF(data: DressingProtocolData): void {
  const html = generateDressingProtocolHTML(data);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Prompt user to save as PDF
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      // User can choose "Save as PDF" in print dialog
      printWindow.print();
    }, 250);
  };
}

/**
 * Determine wound phase based on tissue types
 */
export function determineWoundPhase(tissueTypes: string[], granulationPercent?: number): keyof typeof WOUND_PHASES {
  const hasNecrotic = tissueTypes.includes('necrotic') || tissueTypes.includes('eschar');
  const hasSlough = tissueTypes.includes('slough');
  const hasGranulation = tissueTypes.includes('granulation');

  if (hasNecrotic || (hasSlough && !hasGranulation)) {
    return 'extension';
  } else if (hasGranulation && (granulationPercent === undefined || granulationPercent <= 40)) {
    return 'transition';
  } else {
    return 'repair';
  }
}

// ============================================================
// SKIN GRAFT PROTOCOL PRINT FUNCTIONS
// ============================================================

export interface SkinGraftProtocolData {
  patientName: string;
  hospitalNumber: string;
  wardBed?: string;
  graftType: 'skin_graft_site' | 'donor_site';
  graftLocation: string;
  surgeryDate: Date;
  postOpDay: number;
  specialInstructions?: string;
  assessedBy: string;
  assessedAt: Date;
  hospitalName?: string;
}

/**
 * Generate skin graft protocol HTML for 80mm thermal printer
 */
export function generateSkinGraftProtocolHTML(data: SkinGraftProtocolData): string {
  const protocol = SKIN_GRAFT_PROTOCOLS[data.graftType];
  const printDate = format(new Date(), 'dd/MM/yyyy HH:mm');
  const surgeryDate = format(data.surgeryDate, 'dd/MM/yyyy');
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Skin Graft Protocol - ${data.patientName}</title>
  <style>
    @page {
      size: ${THERMAL_PRINTER_CONFIG.paperWidth}mm auto;
      margin: ${THERMAL_LAYOUT.marginTop}mm ${THERMAL_LAYOUT.marginRight}mm ${THERMAL_LAYOUT.marginBottom}mm ${THERMAL_LAYOUT.marginLeft}mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 0.8;
      color: #000;
      background: #fff;
      width: ${THERMAL_PRINTER_CONFIG.printableWidth}mm;
      max-width: ${THERMAL_PRINTER_CONFIG.printableWidth}mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    .container {
      width: 100%;
      padding: 2mm;
    }
    
    .header {
      text-align: center;
      padding-bottom: 3mm;
      border-bottom: 2px solid #000;
      margin-bottom: 3mm;
    }
    
    .header h1 {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 2mm;
      text-transform: uppercase;
    }
    
    .header h2 {
      font-size: 12pt;
      font-weight: bold;
    }
    
    .header .hospital {
      font-size: 10pt;
      margin-top: 1mm;
    }
    
    .section {
      margin: 3mm 0;
      padding-bottom: 2mm;
      border-bottom: 1px dashed #000;
    }
    
    .section:last-child {
      border-bottom: none;
    }
    
    .section-title {
      font-weight: bold;
      font-size: 11pt;
      text-transform: uppercase;
      margin-bottom: 2mm;
      background: #000;
      color: #fff;
      padding: 2mm;
      text-align: center;
    }
    
    .row {
      display: flex;
      justify-content: space-between;
      margin: 1mm 0;
      line-height: 1.2;
    }
    
    .row .label {
      font-weight: bold;
    }
    
    .row .value {
      text-align: right;
    }
    
    .protocol-box {
      border: 2px solid #000;
      padding: 3mm;
      margin: 2mm 0;
      background: #f9f9f9;
    }
    
    .protocol-title {
      font-weight: bold;
      font-size: 12pt;
      text-align: center;
      margin-bottom: 2mm;
      text-transform: uppercase;
    }
    
    .protocol-step {
      margin: 2mm 0;
      padding-left: 2mm;
      line-height: 1.3;
      font-size: 11pt;
    }
    
    .warning-box {
      border: 3px solid #000;
      padding: 3mm;
      margin: 3mm 0;
      background: #fff;
    }
    
    .warning-title {
      font-weight: bold;
      font-size: 12pt;
      text-align: center;
      margin-bottom: 2mm;
      text-transform: uppercase;
    }
    
    .warning-item {
      margin: 2mm 0;
      font-size: 11pt;
      font-weight: bold;
      line-height: 1.3;
    }
    
    .post-op-day {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      padding: 2mm;
      border: 2px solid #000;
      margin: 2mm 0;
    }
    
    .footer {
      margin-top: 3mm;
      padding-top: 2mm;
      border-top: 2px solid #000;
      text-align: center;
      font-size: 10pt;
    }
    
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 8mm;
      padding-top: 1mm;
      text-align: center;
      font-size: 9pt;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>🏥 SKIN GRAFT PROTOCOL</h1>
      <h2>${protocol.name}</h2>
      ${data.hospitalName ? `<div class="hospital">${data.hospitalName}</div>` : ''}
    </div>
    
    <!-- Patient Information -->
    <div class="section">
      <div class="section-title">📋 Patient Information</div>
      <div class="row">
        <span class="label">Patient:</span>
        <span class="value">${data.patientName}</span>
      </div>
      <div class="row">
        <span class="label">Hospital No:</span>
        <span class="value">${data.hospitalNumber}</span>
      </div>
      ${data.wardBed ? `
      <div class="row">
        <span class="label">Ward/Bed:</span>
        <span class="value">${data.wardBed}</span>
      </div>
      ` : ''}
      <div class="row">
        <span class="label">Graft Location:</span>
        <span class="value">${data.graftLocation}</span>
      </div>
      <div class="row">
        <span class="label">Surgery Date:</span>
        <span class="value">${surgeryDate}</span>
      </div>
    </div>
    
    <!-- Post-Op Day Counter -->
    <div class="post-op-day">
      📅 POST-OP DAY: ${data.postOpDay}
    </div>
    
    <!-- Protocol Steps -->
    <div class="section">
      <div class="protocol-box">
        <div class="protocol-title">✅ Dressing Protocol</div>
        ${protocol.protocol.map(step => `
          <div class="protocol-step">• ${step}</div>
        `).join('')}
      </div>
    </div>
    
    <!-- Warnings -->
    ${protocol.warnings && protocol.warnings.length > 0 ? `
    <div class="section">
      <div class="warning-box">
        <div class="warning-title">⚠️ IMPORTANT WARNINGS</div>
        ${protocol.warnings.map(warning => `
          <div class="warning-item">${warning}</div>
        `).join('')}
      </div>
    </div>
    ` : ''}
    
    <!-- Special Instructions -->
    ${data.specialInstructions ? `
    <div class="section">
      <div class="section-title">📝 Special Instructions</div>
      <div style="padding: 2mm; line-height: 1.3;">
        ${data.specialInstructions}
      </div>
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      <div class="row">
        <span class="label">Assessed by:</span>
        <span class="value">${data.assessedBy}</span>
      </div>
      <div class="signature-line">
        Signature / Stamp
      </div>
      <div style="margin-top: 2mm;">
        Printed: ${printDate}
      </div>
      <div style="margin-top: 1mm;">
        *** END OF PROTOCOL ***
      </div>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Print skin graft protocol to 80mm thermal printer
 */
export function printSkinGraftProtocol(data: SkinGraftProtocolData): void {
  const html = generateSkinGraftProtocolHTML(data);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };
}

/**
 * Export skin graft protocol as PDF (using browser print to PDF)
 */
export function exportSkinGraftProtocolPDF(data: SkinGraftProtocolData): void {
  const html = generateSkinGraftProtocolHTML(data);
  
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    throw new Error('Failed to open print window. Please allow popups.');
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  };
}
