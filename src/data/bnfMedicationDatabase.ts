/**
 * Comprehensive BNF-Adapted Medication Database
 * AstroHEALTH Innovations in Healthcare
 * 
 * Based on British National Formulary (BNF) structure
 * Adapted for Nigerian clinical practice with NAFDAC-approved medications
 * 
 * Categories follow BNF classification:
 * 1. Gastro-intestinal System
 * 2. Cardiovascular System
 * 3. Respiratory System
 * 4. Central Nervous System
 * 5. Infections
 * 6. Endocrine System
 * 7. Obstetrics, Gynaecology & Urinary Tract
 * 8. Malignant Disease & Immunosuppression
 * 9. Nutrition & Blood
 * 10. Musculoskeletal & Joint Diseases
 * 11. Eye
 * 12. Ear, Nose & Oropharynx
 * 13. Skin
 * 14. Immunological Products & Vaccines
 * 15. Anaesthesia
 */

import type { MedicationRoute } from '../types';

export interface BNFMedication {
  name: string;
  genericName: string;
  doses: string[];
  routes: MedicationRoute[];
  frequency: string[];
  maxDaily: string;
  renalAdjust: boolean;
  hepaticAdjust?: boolean;
  pregnancyCategory?: string;
  controlledDrug?: boolean;
  specialInstructions?: string;
}

export interface BNFCategory {
  id: string;
  name: string;
  subcategories?: { id: string; name: string; medications: BNFMedication[] }[];
  medications?: BNFMedication[];
}

// ============================================
// 1. GASTRO-INTESTINAL SYSTEM
// ============================================
export const gastrointestinalMedications: BNFCategory = {
  id: 'gastrointestinal',
  name: 'Gastro-intestinal System',
  subcategories: [
    {
      id: 'antacids_antisecretory',
      name: 'Antacids & Antisecretory Drugs',
      medications: [
        // Proton Pump Inhibitors
        { name: 'Omeprazole', genericName: 'Omeprazole', doses: ['10mg', '20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Pantoprazole', genericName: 'Pantoprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Esomeprazole', genericName: 'Esomeprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Lansoprazole', genericName: 'Lansoprazole', doses: ['15mg', '30mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Rabeprazole', genericName: 'Rabeprazole', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '40mg', renalAdjust: false },
        // H2 Receptor Antagonists
        { name: 'Ranitidine', genericName: 'Ranitidine', doses: ['150mg', '300mg', '50mg IV'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '24 hourly'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Famotidine', genericName: 'Famotidine', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '24 hourly'], maxDaily: '80mg', renalAdjust: true },
        { name: 'Cimetidine', genericName: 'Cimetidine', doses: ['200mg', '400mg', '800mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '12 hourly'], maxDaily: '2.4g', renalAdjust: true },
        // Antacids
        { name: 'Magnesium Trisilicate', genericName: 'Magnesium Trisilicate', doses: ['500mg', '10ml'], routes: ['oral'], frequency: ['6 hourly', '8 hourly', 'PRN'], maxDaily: '4g', renalAdjust: true },
        { name: 'Aluminium Hydroxide', genericName: 'Aluminium Hydroxide', doses: ['500mg', '10ml'], routes: ['oral'], frequency: ['6 hourly', '8 hourly', 'PRN'], maxDaily: '3.84g', renalAdjust: true },
        { name: 'Calcium Carbonate', genericName: 'Calcium Carbonate (Antacid)', doses: ['500mg', '1g', '1.25g'], routes: ['oral'], frequency: ['PRN', '6 hourly'], maxDaily: '7.5g', renalAdjust: true },
        { name: 'Gaviscon', genericName: 'Sodium Alginate/Potassium Bicarbonate', doses: ['10ml', '20ml'], routes: ['oral'], frequency: ['After meals', '6 hourly'], maxDaily: '80ml', renalAdjust: false },
        // Mucosal Protectants
        { name: 'Sucralfate', genericName: 'Sucralfate', doses: ['1g'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '8g', renalAdjust: false, specialInstructions: 'Take on empty stomach' },
        { name: 'Misoprostol', genericName: 'Misoprostol', doses: ['200mcg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '800mcg', renalAdjust: false },
        { name: 'Bismuth Subsalicylate', genericName: 'Bismuth Subsalicylate', doses: ['262mg', '524mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4.2g', renalAdjust: true },
      ],
    },
    {
      id: 'antiemetics',
      name: 'Antiemetics & Antinauseants',
      medications: [
        { name: 'Metoclopramide', genericName: 'Metoclopramide', doses: ['10mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '30mg', renalAdjust: true },
        { name: 'Ondansetron', genericName: 'Ondansetron', doses: ['4mg', '8mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '24mg', renalAdjust: false },
        { name: 'Granisetron', genericName: 'Granisetron', doses: ['1mg', '2mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '24 hourly'], maxDaily: '9mg', renalAdjust: false },
        { name: 'Domperidone', genericName: 'Domperidone', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Prochlorperazine', genericName: 'Prochlorperazine', doses: ['5mg', '10mg', '12.5mg'], routes: ['oral', 'intramuscular', 'rectal'], frequency: ['6 hourly', '8 hourly'], maxDaily: '40mg', renalAdjust: false },
        { name: 'Promethazine', genericName: 'Promethazine', doses: ['12.5mg', '25mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Cyclizine', genericName: 'Cyclizine', doses: ['50mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['8 hourly'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Dimenhydrinate', genericName: 'Dimenhydrinate', doses: ['50mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Hyoscine (Scopolamine)', genericName: 'Hyoscine Butylbromide', doses: ['10mg', '20mg', '0.3mg patch'], routes: ['oral', 'intravenous', 'transdermal'], frequency: ['8 hourly', '72 hourly patch'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Aprepitant', genericName: 'Aprepitant', doses: ['80mg', '125mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '125mg', renalAdjust: false },
        { name: 'Dexamethasone (Antiemetic)', genericName: 'Dexamethasone', doses: ['4mg', '8mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '20mg', renalAdjust: false },
      ],
    },
    {
      id: 'antispasmodics',
      name: 'Antispasmodics & Motility Drugs',
      medications: [
        { name: 'Hyoscine Butylbromide', genericName: 'Hyoscine Butylbromide', doses: ['10mg', '20mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Dicyclomine', genericName: 'Dicyclomine', doses: ['10mg', '20mg'], routes: ['oral', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Mebeverine', genericName: 'Mebeverine', doses: ['135mg', '200mg MR'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '405mg', renalAdjust: false },
        { name: 'Alverine', genericName: 'Alverine Citrate', doses: ['60mg', '120mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '360mg', renalAdjust: false },
        { name: 'Peppermint Oil', genericName: 'Peppermint Oil', doses: ['0.2ml', '0.4ml'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '1.2ml', renalAdjust: false },
        { name: 'Propantheline', genericName: 'Propantheline', doses: ['15mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '120mg', renalAdjust: true },
      ],
    },
    {
      id: 'laxatives',
      name: 'Laxatives',
      medications: [
        // Osmotic Laxatives
        { name: 'Lactulose', genericName: 'Lactulose', doses: ['10ml', '15ml', '20ml', '30ml'], routes: ['oral'], frequency: ['12 hourly', '8 hourly', 'Once daily'], maxDaily: '60ml', renalAdjust: false },
        { name: 'Macrogol (Movicol)', genericName: 'Polyethylene Glycol', doses: ['1 sachet', '2 sachets', '3 sachets'], routes: ['oral'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '8 sachets', renalAdjust: false },
        { name: 'Magnesium Hydroxide', genericName: 'Magnesium Hydroxide', doses: ['30ml', '45ml'], routes: ['oral'], frequency: ['PRN', 'Once daily'], maxDaily: '90ml', renalAdjust: true },
        { name: 'Magnesium Sulphate (Oral)', genericName: 'Magnesium Sulphate', doses: ['5g', '10g'], routes: ['oral'], frequency: ['Once only'], maxDaily: '10g', renalAdjust: true },
        // Stimulant Laxatives
        { name: 'Bisacodyl', genericName: 'Bisacodyl', doses: ['5mg', '10mg'], routes: ['oral', 'rectal'], frequency: ['Once daily', 'At night'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Senna', genericName: 'Senna', doses: ['7.5mg', '15mg', '15ml'], routes: ['oral'], frequency: ['Once daily', 'At night'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Sodium Picosulfate', genericName: 'Sodium Picosulfate', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['Once daily', 'At night'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Castor Oil', genericName: 'Castor Oil', doses: ['15ml', '30ml'], routes: ['oral'], frequency: ['Once only'], maxDaily: '30ml', renalAdjust: false },
        // Bulk-Forming
        { name: 'Ispaghula Husk (Fybogel)', genericName: 'Ispaghula Husk', doses: ['1 sachet', '2 sachets'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '4 sachets', renalAdjust: false },
        { name: 'Methylcellulose', genericName: 'Methylcellulose', doses: ['500mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '6g', renalAdjust: false },
        // Softeners
        { name: 'Docusate Sodium', genericName: 'Docusate', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '500mg', renalAdjust: false },
        { name: 'Liquid Paraffin', genericName: 'Mineral Oil', doses: ['10ml', '15ml', '30ml'], routes: ['oral'], frequency: ['Once daily', 'At night'], maxDaily: '45ml', renalAdjust: false },
        { name: 'Glycerol Suppository', genericName: 'Glycerol', doses: ['1 suppository', '2 suppository'], routes: ['rectal'], frequency: ['PRN', 'Once daily'], maxDaily: '2 suppositories', renalAdjust: false },
        // Rectal Preparations
        { name: 'Phosphate Enema', genericName: 'Sodium Phosphate', doses: ['1 enema'], routes: ['rectal'], frequency: ['Once only', 'PRN'], maxDaily: '1 enema', renalAdjust: true },
        { name: 'Microlax Enema', genericName: 'Sodium Citrate/Sodium Lauryl', doses: ['5ml'], routes: ['rectal'], frequency: ['PRN'], maxDaily: '1-2 doses', renalAdjust: false },
      ],
    },
    {
      id: 'antidiarrheals',
      name: 'Antidiarrheals',
      medications: [
        { name: 'Loperamide', genericName: 'Loperamide', doses: ['2mg'], routes: ['oral'], frequency: ['After each loose stool', '8 hourly'], maxDaily: '16mg', renalAdjust: false },
        { name: 'Diphenoxylate-Atropine', genericName: 'Lomotil', doses: ['2.5mg/0.025mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Codeine Phosphate', genericName: 'Codeine', doses: ['15mg', '30mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '240mg', renalAdjust: true, controlledDrug: true },
        { name: 'Racecadotril', genericName: 'Racecadotril', doses: ['100mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '400mg', renalAdjust: false },
        { name: 'ORS (Oral Rehydration Salts)', genericName: 'ORS', doses: ['1 sachet in 200ml water', '1 sachet in 1L water'], routes: ['oral'], frequency: ['After each stool', 'PRN'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Kaolin-Pectin', genericName: 'Kaolin-Pectin', doses: ['30ml', '60ml'], routes: ['oral'], frequency: ['After each stool', '6 hourly'], maxDaily: 'As needed', renalAdjust: false },
      ],
    },
    {
      id: 'ibd_drugs',
      name: 'Inflammatory Bowel Disease Drugs',
      medications: [
        { name: 'Sulfasalazine', genericName: 'Sulfasalazine', doses: ['500mg', '1g'], routes: ['oral', 'rectal'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4g', renalAdjust: true },
        { name: 'Mesalazine (5-ASA)', genericName: 'Mesalazine', doses: ['400mg', '500mg', '800mg', '1g', '1.2g'], routes: ['oral', 'rectal'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '4.8g', renalAdjust: true },
        { name: 'Olsalazine', genericName: 'Olsalazine', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '3g', renalAdjust: true },
        { name: 'Balsalazide', genericName: 'Balsalazide', doses: ['750mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '6.75g', renalAdjust: true },
        { name: 'Budesonide (Enteric)', genericName: 'Budesonide', doses: ['3mg', '9mg'], routes: ['oral'], frequency: ['Once daily', '8 hourly'], maxDaily: '9mg', renalAdjust: false },
        { name: 'Prednisolone (IBD)', genericName: 'Prednisolone', doses: ['5mg', '10mg', '20mg', '40mg'], routes: ['oral', 'rectal'], frequency: ['Once daily'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Hydrocortisone Foam', genericName: 'Hydrocortisone', doses: ['1 applicator'], routes: ['rectal'], frequency: ['Once daily', '12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Azathioprine', genericName: 'Azathioprine', doses: ['25mg', '50mg', '75mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '2.5mg/kg', renalAdjust: true },
        { name: 'Mercaptopurine', genericName: 'Mercaptopurine', doses: ['25mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '75mg/m2', renalAdjust: true },
        { name: 'Methotrexate (IBD)', genericName: 'Methotrexate', doses: ['7.5mg', '15mg', '25mg'], routes: ['oral', 'subcutaneous', 'intramuscular'], frequency: ['Once weekly'], maxDaily: '25mg/week', renalAdjust: true },
        { name: 'Infliximab', genericName: 'Infliximab', doses: ['5mg/kg'], routes: ['intravenous'], frequency: ['0, 2, 6 weeks then 8 weekly'], maxDaily: '10mg/kg', renalAdjust: false },
        { name: 'Adalimumab', genericName: 'Adalimumab', doses: ['40mg', '80mg', '160mg'], routes: ['subcutaneous'], frequency: ['Every 2 weeks'], maxDaily: '80mg/week', renalAdjust: false },
      ],
    },
    {
      id: 'hepatobiliary',
      name: 'Hepatobiliary Drugs',
      medications: [
        { name: 'Ursodeoxycholic Acid', genericName: 'Ursodeoxycholic Acid', doses: ['150mg', '250mg', '300mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly', 'Once daily'], maxDaily: '15mg/kg', renalAdjust: false },
        { name: 'Cholestyramine', genericName: 'Cholestyramine', doses: ['4g'], routes: ['oral'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '24g', renalAdjust: false },
        { name: 'Colestipol', genericName: 'Colestipol', doses: ['5g'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '30g', renalAdjust: false },
        { name: 'Rifaximin', genericName: 'Rifaximin', doses: ['200mg', '400mg', '550mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '1650mg', renalAdjust: false },
        { name: 'Lactulose (Hepatic Encephalopathy)', genericName: 'Lactulose', doses: ['30ml', '45ml', '60ml'], routes: ['oral'], frequency: ['8 hourly', '6 hourly'], maxDaily: '180ml', renalAdjust: false },
        { name: 'Silymarin (Milk Thistle)', genericName: 'Silymarin', doses: ['70mg', '140mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '420mg', renalAdjust: false },
        { name: 'N-Acetylcysteine (Liver)', genericName: 'N-Acetylcysteine', doses: ['150mg/kg loading', '50mg/kg', '100mg/kg'], routes: ['intravenous'], frequency: ['Per protocol'], maxDaily: '300mg/kg/day', renalAdjust: false },
      ],
    },
    {
      id: 'pancreatic',
      name: 'Pancreatic Enzymes',
      medications: [
        { name: 'Pancreatin (Creon)', genericName: 'Pancreatin', doses: ['10000 units', '25000 units', '40000 units'], routes: ['oral'], frequency: ['With meals', '8 hourly'], maxDaily: 'Titrate to stool', renalAdjust: false },
        { name: 'Pancrelipase', genericName: 'Pancrelipase', doses: ['4200 units', '10500 units', '21000 units'], routes: ['oral'], frequency: ['With meals'], maxDaily: '2500 units/kg/meal', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 2. CARDIOVASCULAR SYSTEM
// ============================================
export const cardiovascularMedications: BNFCategory = {
  id: 'cardiovascular',
  name: 'Cardiovascular System',
  subcategories: [
    {
      id: 'antihypertensives',
      name: 'Antihypertensives',
      medications: [
        // ACE Inhibitors
        { name: 'Lisinopril', genericName: 'Lisinopril', doses: ['2.5mg', '5mg', '10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '80mg', renalAdjust: true },
        { name: 'Enalapril', genericName: 'Enalapril', doses: ['2.5mg', '5mg', '10mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '40mg', renalAdjust: true },
        { name: 'Ramipril', genericName: 'Ramipril', doses: ['1.25mg', '2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Captopril', genericName: 'Captopril', doses: ['6.25mg', '12.5mg', '25mg', '50mg'], routes: ['oral', 'sublingual'], frequency: ['8 hourly', '12 hourly'], maxDaily: '150mg', renalAdjust: true },
        { name: 'Perindopril', genericName: 'Perindopril', doses: ['2mg', '4mg', '8mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '16mg', renalAdjust: true },
        { name: 'Fosinopril', genericName: 'Fosinopril', doses: ['10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: false },
        // ARBs
        { name: 'Losartan', genericName: 'Losartan', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Valsartan', genericName: 'Valsartan', doses: ['40mg', '80mg', '160mg', '320mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '320mg', renalAdjust: false },
        { name: 'Irbesartan', genericName: 'Irbesartan', doses: ['75mg', '150mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Telmisartan', genericName: 'Telmisartan', doses: ['20mg', '40mg', '80mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Candesartan', genericName: 'Candesartan', doses: ['4mg', '8mg', '16mg', '32mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '32mg', renalAdjust: true },
        { name: 'Olmesartan', genericName: 'Olmesartan', doses: ['10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: false },
        // Calcium Channel Blockers
        { name: 'Amlodipine', genericName: 'Amlodipine', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Nifedipine', genericName: 'Nifedipine', doses: ['10mg', '20mg', '30mg MR', '60mg MR'], routes: ['oral', 'sublingual'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '120mg', renalAdjust: false },
        { name: 'Felodipine', genericName: 'Felodipine', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Diltiazem', genericName: 'Diltiazem', doses: ['60mg', '90mg', '120mg', '180mg', '240mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '480mg', renalAdjust: false },
        { name: 'Verapamil', genericName: 'Verapamil', doses: ['40mg', '80mg', '120mg', '240mg SR'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '480mg', renalAdjust: false },
        { name: 'Lercanidipine', genericName: 'Lercanidipine', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
        // Alpha Blockers
        { name: 'Prazosin', genericName: 'Prazosin', doses: ['0.5mg', '1mg', '2mg', '5mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Doxazosin', genericName: 'Doxazosin', doses: ['1mg', '2mg', '4mg', '8mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '16mg', renalAdjust: false },
        { name: 'Terazosin', genericName: 'Terazosin', doses: ['1mg', '2mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
        // Centrally Acting
        { name: 'Methyldopa', genericName: 'Methyldopa', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '3g', renalAdjust: true },
        { name: 'Clonidine', genericName: 'Clonidine', doses: ['75mcg', '150mcg', '300mcg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '1.2mg', renalAdjust: true },
        // Direct Vasodilators
        { name: 'Hydralazine', genericName: 'Hydralazine', doses: ['10mg', '25mg', '50mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Minoxidil', genericName: 'Minoxidil', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Sodium Nitroprusside', genericName: 'Sodium Nitroprusside', doses: ['0.3-10mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: '10mcg/kg/min', renalAdjust: true },
      ],
    },
    {
      id: 'beta_blockers',
      name: 'Beta-Blockers',
      medications: [
        { name: 'Atenolol', genericName: 'Atenolol', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Metoprolol', genericName: 'Metoprolol', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', 'Once daily'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Bisoprolol', genericName: 'Bisoprolol', doses: ['1.25mg', '2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Carvedilol', genericName: 'Carvedilol', doses: ['3.125mg', '6.25mg', '12.5mg', '25mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '50mg', renalAdjust: false },
        { name: 'Propranolol', genericName: 'Propranolol', doses: ['10mg', '20mg', '40mg', '80mg', '160mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '8 hourly', '12 hourly'], maxDaily: '320mg', renalAdjust: false },
        { name: 'Labetalol', genericName: 'Labetalol', doses: ['100mg', '200mg', '400mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '2.4g', renalAdjust: false },
        { name: 'Nebivolol', genericName: 'Nebivolol', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: true },
        { name: 'Sotalol', genericName: 'Sotalol', doses: ['40mg', '80mg', '160mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '320mg', renalAdjust: true },
        { name: 'Esmolol', genericName: 'Esmolol', doses: ['50-200mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: '300mcg/kg/min', renalAdjust: false },
      ],
    },
    {
      id: 'diuretics',
      name: 'Diuretics',
      medications: [
        // Loop Diuretics
        { name: 'Furosemide', genericName: 'Furosemide', doses: ['20mg', '40mg', '80mg', '250mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '600mg', renalAdjust: true },
        { name: 'Bumetanide', genericName: 'Bumetanide', doses: ['0.5mg', '1mg', '2mg', '5mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Torsemide', genericName: 'Torsemide', doses: ['5mg', '10mg', '20mg', '100mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: false },
        // Thiazides
        { name: 'Hydrochlorothiazide', genericName: 'Hydrochlorothiazide', doses: ['12.5mg', '25mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mg', renalAdjust: true },
        { name: 'Chlorthalidone', genericName: 'Chlorthalidone', doses: ['12.5mg', '25mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mg', renalAdjust: true },
        { name: 'Indapamide', genericName: 'Indapamide', doses: ['1.5mg SR', '2.5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2.5mg', renalAdjust: true },
        { name: 'Metolazone', genericName: 'Metolazone', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: true },
        // Potassium-Sparing
        { name: 'Spironolactone', genericName: 'Spironolactone', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Eplerenone', genericName: 'Eplerenone', doses: ['25mg', '50mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Amiloride', genericName: 'Amiloride', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Triamterene', genericName: 'Triamterene', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '300mg', renalAdjust: true },
        // Osmotic
        { name: 'Mannitol', genericName: 'Mannitol', doses: ['20%', '0.5-1g/kg'], routes: ['intravenous'], frequency: ['6 hourly', '8 hourly', 'Once'], maxDaily: '2g/kg', renalAdjust: true },
      ],
    },
    {
      id: 'antianginals',
      name: 'Antianginals & Coronary Vasodilators',
      medications: [
        { name: 'Glyceryl Trinitrate (GTN)', genericName: 'Nitroglycerin', doses: ['0.3mg', '0.4mg', '0.5mg', '5mg patch', '10mg patch'], routes: ['sublingual', 'transdermal', 'intravenous'], frequency: ['PRN', '24 hourly patch'], maxDaily: '15mg SL', renalAdjust: false },
        { name: 'Isosorbide Dinitrate', genericName: 'Isosorbide Dinitrate', doses: ['5mg', '10mg', '20mg', '40mg'], routes: ['oral', 'sublingual'], frequency: ['8 hourly', '12 hourly'], maxDaily: '160mg', renalAdjust: false },
        { name: 'Isosorbide Mononitrate', genericName: 'Isosorbide Mononitrate', doses: ['10mg', '20mg', '40mg', '60mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '120mg', renalAdjust: false },
        { name: 'Nicorandil', genericName: 'Nicorandil', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '60mg', renalAdjust: true },
        { name: 'Ivabradine', genericName: 'Ivabradine', doses: ['2.5mg', '5mg', '7.5mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '15mg', renalAdjust: false },
        { name: 'Ranolazine', genericName: 'Ranolazine', doses: ['375mg', '500mg', '750mg', '1000mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2g', renalAdjust: false },
        { name: 'Trimetazidine', genericName: 'Trimetazidine', doses: ['20mg', '35mg MR'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '70mg', renalAdjust: true },
      ],
    },
    {
      id: 'antiarrhythmics',
      name: 'Antiarrhythmics',
      medications: [
        // Class I
        { name: 'Lidocaine', genericName: 'Lidocaine', doses: ['1-1.5mg/kg bolus', '1-4mg/min infusion'], routes: ['intravenous'], frequency: ['Bolus then infusion'], maxDaily: '300mg/hour', renalAdjust: true, hepaticAdjust: true },
        { name: 'Flecainide', genericName: 'Flecainide', doses: ['50mg', '100mg', '150mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Propafenone', genericName: 'Propafenone', doses: ['150mg', '225mg', '300mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '900mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Mexiletine', genericName: 'Mexiletine', doses: ['100mg', '150mg', '200mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '1.2g', renalAdjust: true },
        // Class II - See Beta-Blockers
        // Class III
        { name: 'Amiodarone', genericName: 'Amiodarone', doses: ['100mg', '200mg', '300mg', '5mg/kg loading'], routes: ['oral', 'intravenous'], frequency: ['Once daily', 'Loading dose'], maxDaily: '1.2g (loading)', renalAdjust: false, hepaticAdjust: true },
        { name: 'Dronedarone', genericName: 'Dronedarone', doses: ['400mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '800mg', renalAdjust: false },
        // Class IV - See CCBs
        // Others
        { name: 'Adenosine', genericName: 'Adenosine', doses: ['6mg', '12mg', '18mg'], routes: ['intravenous'], frequency: ['Rapid bolus'], maxDaily: '36mg total', renalAdjust: false },
        { name: 'Digoxin', genericName: 'Digoxin', doses: ['62.5mcg', '125mcg', '250mcg', '500mcg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '500mcg', renalAdjust: true },
        { name: 'Atropine', genericName: 'Atropine', doses: ['0.5mg', '1mg', '0.6mg'], routes: ['intravenous', 'intramuscular'], frequency: ['PRN', 'Every 3-5 mins'], maxDaily: '3mg', renalAdjust: false },
        { name: 'Isoprenaline', genericName: 'Isoprenaline', doses: ['1-10mcg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'Titrate', renalAdjust: false },
      ],
    },
    {
      id: 'anticoagulants',
      name: 'Anticoagulants & Antiplatelets',
      medications: [
        // Heparins
        { name: 'Enoxaparin', genericName: 'Enoxaparin', doses: ['20mg', '40mg', '60mg', '80mg', '1mg/kg', '1.5mg/kg'], routes: ['subcutaneous'], frequency: ['Once daily', '12 hourly'], maxDaily: '2mg/kg', renalAdjust: true },
        { name: 'Heparin (Unfractionated)', genericName: 'Heparin', doses: ['5000units', '10000units', '80units/kg'], routes: ['subcutaneous', 'intravenous'], frequency: ['8 hourly', '12 hourly', 'Infusion'], maxDaily: 'Titrate to APTT', renalAdjust: false },
        { name: 'Dalteparin', genericName: 'Dalteparin', doses: ['2500units', '5000units', '200units/kg'], routes: ['subcutaneous'], frequency: ['Once daily', '12 hourly'], maxDaily: '18000units', renalAdjust: true },
        { name: 'Tinzaparin', genericName: 'Tinzaparin', doses: ['3500units', '4500units', '175units/kg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '18000units', renalAdjust: true },
        { name: 'Fondaparinux', genericName: 'Fondaparinux', doses: ['2.5mg', '5mg', '7.5mg', '10mg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
        // Vitamin K Antagonists
        { name: 'Warfarin', genericName: 'Warfarin', doses: ['1mg', '2mg', '2.5mg', '3mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: 'Titrate to INR', renalAdjust: false },
        { name: 'Acenocoumarol', genericName: 'Acenocoumarol', doses: ['1mg', '2mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: 'Titrate to INR', renalAdjust: false },
        { name: 'Phenprocoumon', genericName: 'Phenprocoumon', doses: ['3mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: 'Titrate to INR', renalAdjust: false },
        // DOACs
        { name: 'Rivaroxaban', genericName: 'Rivaroxaban', doses: ['2.5mg', '10mg', '15mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Apixaban', genericName: 'Apixaban', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Dabigatran', genericName: 'Dabigatran', doses: ['75mg', '110mg', '150mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Edoxaban', genericName: 'Edoxaban', doses: ['30mg', '60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '60mg', renalAdjust: true },
        // Antiplatelets
        { name: 'Aspirin', genericName: 'Acetylsalicylic Acid', doses: ['75mg', '100mg', '150mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Clopidogrel', genericName: 'Clopidogrel', doses: ['75mg', '300mg', '600mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '75mg maintenance', renalAdjust: false },
        { name: 'Ticagrelor', genericName: 'Ticagrelor', doses: ['60mg', '90mg', '180mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '180mg', renalAdjust: false },
        { name: 'Prasugrel', genericName: 'Prasugrel', doses: ['5mg', '10mg', '60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Dipyridamole', genericName: 'Dipyridamole', doses: ['25mg', '75mg', '200mg MR'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '600mg', renalAdjust: false },
        { name: 'Cilostazol', genericName: 'Cilostazol', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: true },
        // Reversal Agents
        { name: 'Protamine Sulphate', genericName: 'Protamine', doses: ['1mg per 100 units heparin'], routes: ['intravenous'], frequency: ['Once'], maxDaily: '50mg', renalAdjust: false },
        { name: 'Vitamin K (Phytomenadione)', genericName: 'Vitamin K1', doses: ['1mg', '5mg', '10mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', 'Once only'], maxDaily: '40mg', renalAdjust: false },
        { name: 'Idarucizumab', genericName: 'Idarucizumab', doses: ['5g'], routes: ['intravenous'], frequency: ['Once only'], maxDaily: '5g', renalAdjust: false },
        { name: 'Andexanet Alfa', genericName: 'Andexanet Alfa', doses: ['400mg', '800mg bolus'], routes: ['intravenous'], frequency: ['Once only'], maxDaily: '1 dose', renalAdjust: false },
      ],
    },
    {
      id: 'lipid_lowering',
      name: 'Lipid-Lowering Drugs',
      medications: [
        // Statins
        { name: 'Atorvastatin', genericName: 'Atorvastatin', doses: ['10mg', '20mg', '40mg', '80mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Rosuvastatin', genericName: 'Rosuvastatin', doses: ['5mg', '10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: true },
        { name: 'Simvastatin', genericName: 'Simvastatin', doses: ['10mg', '20mg', '40mg', '80mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Pravastatin', genericName: 'Pravastatin', doses: ['10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: true },
        { name: 'Fluvastatin', genericName: 'Fluvastatin', doses: ['20mg', '40mg', '80mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Pitavastatin', genericName: 'Pitavastatin', doses: ['1mg', '2mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '4mg', renalAdjust: true },
        // Fibrates
        { name: 'Fenofibrate', genericName: 'Fenofibrate', doses: ['67mg', '145mg', '160mg', '200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Gemfibrozil', genericName: 'Gemfibrozil', doses: ['600mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1.2g', renalAdjust: true },
        { name: 'Bezafibrate', genericName: 'Bezafibrate', doses: ['200mg', '400mg MR'], routes: ['oral'], frequency: ['8 hourly', 'Once daily'], maxDaily: '600mg', renalAdjust: true },
        // Others
        { name: 'Ezetimibe', genericName: 'Ezetimibe', doses: ['10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Omega-3 Fatty Acids', genericName: 'Omega-3', doses: ['1g', '2g', '4g'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '4g', renalAdjust: false },
        { name: 'Nicotinic Acid (Niacin)', genericName: 'Niacin', doses: ['500mg', '1g', '2g'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2g', renalAdjust: false },
        { name: 'Evolocumab', genericName: 'Evolocumab', doses: ['140mg', '420mg'], routes: ['subcutaneous'], frequency: ['Every 2 weeks', 'Monthly'], maxDaily: '420mg/month', renalAdjust: false },
        { name: 'Alirocumab', genericName: 'Alirocumab', doses: ['75mg', '150mg'], routes: ['subcutaneous'], frequency: ['Every 2 weeks'], maxDaily: '150mg q2w', renalAdjust: false },
      ],
    },
    {
      id: 'heart_failure',
      name: 'Heart Failure Drugs',
      medications: [
        { name: 'Sacubitril/Valsartan', genericName: 'Entresto', doses: ['24/26mg', '49/51mg', '97/103mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '194/206mg', renalAdjust: true },
        { name: 'Hydralazine/Isosorbide Dinitrate', genericName: 'BiDil', doses: ['37.5/20mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '225/120mg', renalAdjust: true },
        { name: 'Dobutamine', genericName: 'Dobutamine', doses: ['2.5-20mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'Titrate', renalAdjust: false },
        { name: 'Milrinone', genericName: 'Milrinone', doses: ['0.25-0.75mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: '1.13mg/kg/day', renalAdjust: true },
        { name: 'Levosimendan', genericName: 'Levosimendan', doses: ['0.05-0.2mcg/kg/min'], routes: ['intravenous'], frequency: ['24-hour infusion'], maxDaily: '24hr course', renalAdjust: false },
      ],
    },
    {
      id: 'vasopressors',
      name: 'Vasopressors & Inotropes',
      medications: [
        { name: 'Adrenaline (Epinephrine)', genericName: 'Epinephrine', doses: ['0.5mg', '1mg', '0.01-0.5mcg/kg/min'], routes: ['intramuscular', 'intravenous', 'subcutaneous'], frequency: ['PRN', 'Every 3-5 mins', 'Infusion'], maxDaily: 'Titrate', renalAdjust: false },
        { name: 'Noradrenaline (Norepinephrine)', genericName: 'Norepinephrine', doses: ['0.05-0.5mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'Titrate', renalAdjust: false },
        { name: 'Dopamine', genericName: 'Dopamine', doses: ['2-20mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'Titrate', renalAdjust: true },
        { name: 'Vasopressin', genericName: 'Vasopressin', doses: ['0.01-0.04 units/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: '0.04 units/min', renalAdjust: false },
        { name: 'Phenylephrine', genericName: 'Phenylephrine', doses: ['50-200mcg bolus', '0.5-5mcg/kg/min'], routes: ['intravenous'], frequency: ['Bolus/Infusion'], maxDaily: 'Titrate', renalAdjust: false },
        { name: 'Metaraminol', genericName: 'Metaraminol', doses: ['0.5-5mg bolus', '0.5-5mg/hr'], routes: ['intravenous'], frequency: ['Bolus/Infusion'], maxDaily: 'Titrate', renalAdjust: false },
        { name: 'Ephedrine', genericName: 'Ephedrine', doses: ['3mg', '6mg', '9mg', '12mg'], routes: ['intravenous'], frequency: ['PRN bolus'], maxDaily: '150mg', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 3. RESPIRATORY SYSTEM
// ============================================
export const respiratoryMedications: BNFCategory = {
  id: 'respiratory',
  name: 'Respiratory System',
  subcategories: [
    {
      id: 'bronchodilators',
      name: 'Bronchodilators',
      medications: [
        // Beta-2 Agonists - Short Acting
        { name: 'Salbutamol', genericName: 'Salbutamol/Albuterol', doses: ['100mcg/puff', '2.5mg nebule', '5mg nebule', '2mg', '4mg'], routes: ['inhalation', 'nebulization', 'oral', 'intravenous'], frequency: ['PRN', '6 hourly', '4 hourly'], maxDaily: '32mg nebulized', renalAdjust: false },
        { name: 'Terbutaline', genericName: 'Terbutaline', doses: ['250mcg/puff', '500mcg/puff', '2.5mg', '5mg'], routes: ['inhalation', 'oral', 'subcutaneous'], frequency: ['PRN', '8 hourly', '6 hourly'], maxDaily: '15mg oral', renalAdjust: false },
        { name: 'Fenoterol', genericName: 'Fenoterol', doses: ['100mcg/puff', '200mcg/puff'], routes: ['inhalation'], frequency: ['PRN', '8 hourly'], maxDaily: '1.6mg inhaled', renalAdjust: false },
        // Beta-2 Agonists - Long Acting
        { name: 'Salmeterol', genericName: 'Salmeterol', doses: ['25mcg/puff', '50mcg/puff'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '100mcg', renalAdjust: false },
        { name: 'Formoterol', genericName: 'Formoterol', doses: ['6mcg/puff', '12mcg/puff'], routes: ['inhalation'], frequency: ['12 hourly', 'Once daily'], maxDaily: '48mcg', renalAdjust: false },
        { name: 'Indacaterol', genericName: 'Indacaterol', doses: ['150mcg', '300mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '300mcg', renalAdjust: false },
        { name: 'Olodaterol', genericName: 'Olodaterol', doses: ['2.5mcg', '5mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '5mcg', renalAdjust: false },
        { name: 'Vilanterol', genericName: 'Vilanterol', doses: ['25mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '25mcg', renalAdjust: false },
        // Anticholinergics - Short Acting
        { name: 'Ipratropium', genericName: 'Ipratropium Bromide', doses: ['20mcg/puff', '40mcg/puff', '250mcg nebule', '500mcg nebule'], routes: ['inhalation', 'nebulization'], frequency: ['6 hourly', '8 hourly'], maxDaily: '2mg nebulized', renalAdjust: false },
        // Anticholinergics - Long Acting
        { name: 'Tiotropium', genericName: 'Tiotropium', doses: ['18mcg', '2.5mcg Respimat'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '18mcg', renalAdjust: false },
        { name: 'Glycopyrronium', genericName: 'Glycopyrronium', doses: ['50mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '50mcg', renalAdjust: true },
        { name: 'Umeclidinium', genericName: 'Umeclidinium', doses: ['62.5mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '62.5mcg', renalAdjust: false },
        { name: 'Aclidinium', genericName: 'Aclidinium', doses: ['322mcg', '400mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '800mcg', renalAdjust: false },
        // Methylxanthines
        { name: 'Theophylline', genericName: 'Theophylline', doses: ['100mg', '200mg', '300mg', '400mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '900mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Aminophylline', genericName: 'Aminophylline', doses: ['100mg', '225mg', '250mg IV', '5mg/kg loading'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', 'Loading then infusion'], maxDaily: '900mg oral', renalAdjust: false, hepaticAdjust: true },
        { name: 'Doxofylline', genericName: 'Doxofylline', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '1.2g', renalAdjust: false },
      ],
    },
    {
      id: 'inhaled_corticosteroids',
      name: 'Inhaled Corticosteroids',
      medications: [
        { name: 'Beclometasone', genericName: 'Beclometasone Dipropionate', doses: ['50mcg/puff', '100mcg/puff', '200mcg/puff', '250mcg/puff'], routes: ['inhalation'], frequency: ['12 hourly', '6 hourly'], maxDaily: '2000mcg', renalAdjust: false },
        { name: 'Budesonide (Inhaled)', genericName: 'Budesonide', doses: ['100mcg', '200mcg', '400mcg', '0.5mg nebule', '1mg nebule'], routes: ['inhalation', 'nebulization'], frequency: ['12 hourly', 'Once daily'], maxDaily: '1600mcg', renalAdjust: false },
        { name: 'Fluticasone Propionate', genericName: 'Fluticasone', doses: ['50mcg', '100mcg', '125mcg', '250mcg', '500mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '1000mcg', renalAdjust: false },
        { name: 'Fluticasone Furoate', genericName: 'Fluticasone Furoate', doses: ['100mcg', '200mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '200mcg', renalAdjust: false },
        { name: 'Ciclesonide', genericName: 'Ciclesonide', doses: ['80mcg', '160mcg'], routes: ['inhalation'], frequency: ['Once daily', '12 hourly'], maxDaily: '320mcg', renalAdjust: false },
        { name: 'Mometasone (Inhaled)', genericName: 'Mometasone Furoate', doses: ['100mcg', '200mcg', '400mcg'], routes: ['inhalation'], frequency: ['Once daily', '12 hourly'], maxDaily: '800mcg', renalAdjust: false },
      ],
    },
    {
      id: 'combination_inhalers',
      name: 'Combination Inhalers',
      medications: [
        { name: 'Budesonide/Formoterol', genericName: 'Symbicort', doses: ['80/4.5mcg', '160/4.5mcg', '320/9mcg'], routes: ['inhalation'], frequency: ['12 hourly', 'Once daily', 'PRN'], maxDaily: '4 puffs 320/9', renalAdjust: false },
        { name: 'Fluticasone/Salmeterol', genericName: 'Seretide/Advair', doses: ['100/50mcg', '250/50mcg', '500/50mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '2 puffs 500/50', renalAdjust: false },
        { name: 'Fluticasone/Vilanterol', genericName: 'Relvar', doses: ['92/22mcg', '184/22mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '184/22mcg', renalAdjust: false },
        { name: 'Beclometasone/Formoterol', genericName: 'Foster', doses: ['100/6mcg', '200/6mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '4 puffs 200/6', renalAdjust: false },
        { name: 'Fluticasone/Formoterol', genericName: 'Flutiform', doses: ['50/5mcg', '125/5mcg', '250/10mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '4 puffs 250/10', renalAdjust: false },
        { name: 'Tiotropium/Olodaterol', genericName: 'Spiolto', doses: ['2.5/2.5mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '5/5mcg', renalAdjust: false },
        { name: 'Umeclidinium/Vilanterol', genericName: 'Anoro', doses: ['62.5/25mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '62.5/25mcg', renalAdjust: false },
        { name: 'Glycopyrronium/Formoterol', genericName: 'Bevespi', doses: ['7.2/5mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '14.4/10mcg', renalAdjust: false },
        { name: 'Triple Therapy (Fluticasone/Umeclidinium/Vilanterol)', genericName: 'Trelegy', doses: ['100/62.5/25mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '100/62.5/25mcg', renalAdjust: false },
        { name: 'Triple Therapy (Beclometasone/Formoterol/Glycopyrronium)', genericName: 'Trimbow', doses: ['87/5/9mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '4 puffs', renalAdjust: false },
        { name: 'Salbutamol/Ipratropium', genericName: 'Combivent', doses: ['100/20mcg', '2.5mg/0.5mg nebule'], routes: ['inhalation', 'nebulization'], frequency: ['6 hourly', 'PRN'], maxDaily: '12 puffs', renalAdjust: false },
      ],
    },
    {
      id: 'leukotriene_antagonists',
      name: 'Leukotriene Receptor Antagonists',
      medications: [
        { name: 'Montelukast', genericName: 'Montelukast', doses: ['4mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Zafirlukast', genericName: 'Zafirlukast', doses: ['20mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '80mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Pranlukast', genericName: 'Pranlukast', doses: ['225mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '450mg', renalAdjust: false },
      ],
    },
    {
      id: 'mucolytics_expectorants',
      name: 'Mucolytics & Expectorants',
      medications: [
        { name: 'Acetylcysteine (Mucolytic)', genericName: 'N-Acetylcysteine', doses: ['200mg', '600mg'], routes: ['oral', 'nebulization'], frequency: ['8 hourly', '12 hourly'], maxDaily: '1.8g', renalAdjust: false },
        { name: 'Carbocisteine', genericName: 'Carbocisteine', doses: ['250mg', '375mg', '500mg', '750mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '2.25g', renalAdjust: false },
        { name: 'Bromhexine', genericName: 'Bromhexine', doses: ['4mg', '8mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '48mg', renalAdjust: false },
        { name: 'Ambroxol', genericName: 'Ambroxol', doses: ['30mg', '75mg SR'], routes: ['oral'], frequency: ['8 hourly', 'Once daily'], maxDaily: '120mg', renalAdjust: true },
        { name: 'Guaifenesin', genericName: 'Guaifenesin', doses: ['100mg', '200mg', '600mg'], routes: ['oral'], frequency: ['6 hourly', '12 hourly'], maxDaily: '2.4g', renalAdjust: false },
        { name: 'Erdosteine', genericName: 'Erdosteine', doses: ['300mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '900mg', renalAdjust: true },
        { name: 'Dornase Alfa', genericName: 'Dornase Alfa', doses: ['2.5mg'], routes: ['nebulization'], frequency: ['Once daily'], maxDaily: '2.5mg', renalAdjust: false },
        { name: 'Hypertonic Saline', genericName: 'Sodium Chloride 3-7%', doses: ['4ml 3%', '4ml 7%'], routes: ['nebulization'], frequency: ['12 hourly', '8 hourly'], maxDaily: 'As needed', renalAdjust: false },
      ],
    },
    {
      id: 'cough_suppressants',
      name: 'Cough Suppressants',
      medications: [
        { name: 'Codeine (Cough)', genericName: 'Codeine Linctus', doses: ['5mg/5ml', '10mg', '15mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '60mg', renalAdjust: true, controlledDrug: true },
        { name: 'Dextromethorphan', genericName: 'Dextromethorphan', doses: ['10mg', '15mg', '30mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '120mg', renalAdjust: false },
        { name: 'Pholcodine', genericName: 'Pholcodine', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '45mg', renalAdjust: false },
        { name: 'Benzonatate', genericName: 'Benzonatate', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '600mg', renalAdjust: false },
      ],
    },
    {
      id: 'antihistamines_allergic',
      name: 'Antihistamines (Allergic Rhinitis)',
      medications: [
        // Non-sedating
        { name: 'Loratadine', genericName: 'Loratadine', doses: ['10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Cetirizine', genericName: 'Cetirizine', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Levocetirizine', genericName: 'Levocetirizine', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: true },
        { name: 'Fexofenadine', genericName: 'Fexofenadine', doses: ['60mg', '120mg', '180mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '180mg', renalAdjust: true },
        { name: 'Desloratadine', genericName: 'Desloratadine', doses: ['5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: true },
        { name: 'Bilastine', genericName: 'Bilastine', doses: ['20mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Rupatadine', genericName: 'Rupatadine', doses: ['10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
        // Sedating
        { name: 'Chlorpheniramine', genericName: 'Chlorpheniramine', doses: ['4mg', '10mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '24mg', renalAdjust: true },
        { name: 'Diphenhydramine', genericName: 'Diphenhydramine', doses: ['25mg', '50mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Hydroxyzine', genericName: 'Hydroxyzine', doses: ['10mg', '25mg', '50mg'], routes: ['oral', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Promethazine (Allergy)', genericName: 'Promethazine', doses: ['10mg', '25mg'], routes: ['oral', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Cyproheptadine', genericName: 'Cyproheptadine', doses: ['4mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '32mg', renalAdjust: false },
      ],
    },
    {
      id: 'nasal_preparations',
      name: 'Nasal Preparations',
      medications: [
        { name: 'Beclometasone Nasal', genericName: 'Beclometasone', doses: ['50mcg/spray', '100mcg/spray'], routes: ['intranasal'], frequency: ['12 hourly', 'Once daily'], maxDaily: '400mcg', renalAdjust: false },
        { name: 'Fluticasone Nasal', genericName: 'Fluticasone', doses: ['50mcg/spray'], routes: ['intranasal'], frequency: ['Once daily', '12 hourly'], maxDaily: '200mcg', renalAdjust: false },
        { name: 'Mometasone Nasal', genericName: 'Mometasone', doses: ['50mcg/spray'], routes: ['intranasal'], frequency: ['Once daily'], maxDaily: '200mcg', renalAdjust: false },
        { name: 'Budesonide Nasal', genericName: 'Budesonide', doses: ['32mcg/spray', '64mcg/spray'], routes: ['intranasal'], frequency: ['Once daily', '12 hourly'], maxDaily: '256mcg', renalAdjust: false },
        { name: 'Triamcinolone Nasal', genericName: 'Triamcinolone', doses: ['55mcg/spray'], routes: ['intranasal'], frequency: ['Once daily'], maxDaily: '220mcg', renalAdjust: false },
        { name: 'Azelastine Nasal', genericName: 'Azelastine', doses: ['137mcg/spray'], routes: ['intranasal'], frequency: ['12 hourly'], maxDaily: '548mcg', renalAdjust: false },
        { name: 'Oxymetazoline Nasal', genericName: 'Oxymetazoline', doses: ['0.05%'], routes: ['intranasal'], frequency: ['12 hourly'], maxDaily: 'Max 3 days use', renalAdjust: false },
        { name: 'Xylometazoline Nasal', genericName: 'Xylometazoline', doses: ['0.05%', '0.1%'], routes: ['intranasal'], frequency: ['8 hourly', '12 hourly'], maxDaily: 'Max 7 days use', renalAdjust: false },
        { name: 'Sodium Cromoglicate Nasal', genericName: 'Cromolyn', doses: ['2%', '4%'], routes: ['intranasal'], frequency: ['6 hourly'], maxDaily: '4 doses daily', renalAdjust: false },
        { name: 'Ipratropium Nasal', genericName: 'Ipratropium', doses: ['21mcg/spray'], routes: ['intranasal'], frequency: ['6 hourly', '8 hourly'], maxDaily: '84mcg per nostril', renalAdjust: false },
      ],
    },
    {
      id: 'respiratory_stimulants',
      name: 'Respiratory Stimulants & Oxygen',
      medications: [
        { name: 'Doxapram', genericName: 'Doxapram', doses: ['1-1.5mg/kg IV', '1.5-4mg/min infusion'], routes: ['intravenous'], frequency: ['Bolus or infusion'], maxDaily: '4mg/min', renalAdjust: true },
        { name: 'Caffeine Citrate', genericName: 'Caffeine', doses: ['20mg/kg loading', '5mg/kg maintenance'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '10mg/kg/day', renalAdjust: true },
        { name: 'Oxygen', genericName: 'Medical Oxygen', doses: ['1-15 L/min', '24-100% FiO2'], routes: ['inhalation'], frequency: ['Continuous'], maxDaily: 'Titrate to SpO2', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 4. CENTRAL NERVOUS SYSTEM
// ============================================
export const cnsMedications: BNFCategory = {
  id: 'cns',
  name: 'Central Nervous System',
  subcategories: [
    {
      id: 'analgesics_nonopioid',
      name: 'Non-Opioid Analgesics',
      medications: [
        { name: 'Paracetamol', genericName: 'Paracetamol/Acetaminophen', doses: ['250mg', '500mg', '650mg', '1g', '10mg/ml IV'], routes: ['oral', 'intravenous', 'rectal'], frequency: ['4 hourly', '6 hourly'], maxDaily: '4g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Ibuprofen', genericName: 'Ibuprofen', doses: ['200mg', '400mg', '600mg', '800mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '2.4g', renalAdjust: true },
        { name: 'Diclofenac', genericName: 'Diclofenac', doses: ['25mg', '50mg', '75mg', '100mg SR'], routes: ['oral', 'intramuscular', 'rectal'], frequency: ['8 hourly', '12 hourly'], maxDaily: '150mg', renalAdjust: true },
        { name: 'Naproxen', genericName: 'Naproxen', doses: ['250mg', '375mg', '500mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1.25g', renalAdjust: true },
        { name: 'Piroxicam', genericName: 'Piroxicam', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Meloxicam', genericName: 'Meloxicam', doses: ['7.5mg', '15mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15mg', renalAdjust: true },
        { name: 'Celecoxib', genericName: 'Celecoxib', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Etoricoxib', genericName: 'Etoricoxib', doses: ['30mg', '60mg', '90mg', '120mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '120mg', renalAdjust: true },
        { name: 'Ketorolac', genericName: 'Ketorolac', doses: ['10mg', '30mg IV/IM'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly'], maxDaily: '40mg oral, 120mg IV', renalAdjust: true },
        { name: 'Indomethacin', genericName: 'Indomethacin', doses: ['25mg', '50mg', '75mg SR'], routes: ['oral', 'rectal'], frequency: ['8 hourly', '12 hourly'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Mefenamic Acid', genericName: 'Mefenamic Acid', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '1.5g', renalAdjust: true },
        { name: 'Ketoprofen', genericName: 'Ketoprofen', doses: ['50mg', '100mg', '200mg SR'], routes: ['oral', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Aspirin (Analgesic)', genericName: 'Aspirin', doses: ['300mg', '600mg', '900mg'], routes: ['oral'], frequency: ['4 hourly', '6 hourly'], maxDaily: '4g', renalAdjust: true },
      ],
    },
    {
      id: 'opioid_analgesics',
      name: 'Opioid Analgesics',
      medications: [
        { name: 'Morphine', genericName: 'Morphine', doses: ['2.5mg', '5mg', '10mg', '15mg', '20mg', '30mg', '60mg SR', '100mg SR'], routes: ['oral', 'intravenous', 'intramuscular', 'subcutaneous'], frequency: ['4 hourly', '6 hourly', '12 hourly SR'], maxDaily: 'Titrate', renalAdjust: true, controlledDrug: true },
        { name: 'Tramadol', genericName: 'Tramadol', doses: ['50mg', '100mg', '150mg SR', '200mg SR', '100mg IV'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly', '12 hourly SR'], maxDaily: '400mg', renalAdjust: true, controlledDrug: true },
        { name: 'Codeine', genericName: 'Codeine Phosphate', doses: ['15mg', '30mg', '60mg'], routes: ['oral', 'intramuscular'], frequency: ['4 hourly', '6 hourly'], maxDaily: '240mg', renalAdjust: true, controlledDrug: true },
        { name: 'Pethidine', genericName: 'Meperidine', doses: ['25mg', '50mg', '75mg', '100mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['3-4 hourly'], maxDaily: '600mg', renalAdjust: true, controlledDrug: true },
        { name: 'Fentanyl', genericName: 'Fentanyl', doses: ['25mcg/hr patch', '50mcg/hr patch', '75mcg/hr patch', '100mcg/hr patch', '50-100mcg IV'], routes: ['transdermal', 'intravenous', 'sublingual'], frequency: ['72 hourly patch', 'PRN IV'], maxDaily: 'Titrate', renalAdjust: false, controlledDrug: true },
        { name: 'Oxycodone', genericName: 'Oxycodone', doses: ['5mg', '10mg', '15mg', '20mg', '40mg CR', '80mg CR'], routes: ['oral'], frequency: ['4-6 hourly', '12 hourly CR'], maxDaily: 'Titrate', renalAdjust: true, controlledDrug: true },
        { name: 'Hydromorphone', genericName: 'Hydromorphone', doses: ['2mg', '4mg', '8mg'], routes: ['oral', 'intravenous', 'subcutaneous'], frequency: ['4 hourly', '6 hourly'], maxDaily: 'Titrate', renalAdjust: true, controlledDrug: true },
        { name: 'Buprenorphine', genericName: 'Buprenorphine', doses: ['200mcg', '400mcg', '5mcg/hr patch', '10mcg/hr patch', '20mcg/hr patch'], routes: ['sublingual', 'transdermal'], frequency: ['6-8 hourly SL', '7 days patch'], maxDaily: '32mg SL', renalAdjust: false, controlledDrug: true },
        { name: 'Nalbuphine', genericName: 'Nalbuphine', doses: ['10mg', '20mg'], routes: ['intravenous', 'intramuscular', 'subcutaneous'], frequency: ['3-6 hourly'], maxDaily: '160mg', renalAdjust: true },
        { name: 'Pentazocine', genericName: 'Pentazocine', doses: ['25mg', '50mg', '30mg IV'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['3-4 hourly'], maxDaily: '360mg oral', renalAdjust: true, controlledDrug: true },
        { name: 'Tapentadol', genericName: 'Tapentadol', doses: ['50mg', '75mg', '100mg', '150mg ER', '200mg ER'], routes: ['oral'], frequency: ['4-6 hourly', '12 hourly ER'], maxDaily: '500mg', renalAdjust: true, controlledDrug: true },
      ],
    },
    {
      id: 'opioid_antagonists',
      name: 'Opioid Antagonists',
      medications: [
        { name: 'Naloxone', genericName: 'Naloxone', doses: ['0.1mg', '0.4mg', '2mg'], routes: ['intravenous', 'intramuscular', 'intranasal', 'subcutaneous'], frequency: ['Every 2-3 mins PRN'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Naltrexone', genericName: 'Naltrexone', doses: ['25mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mg', renalAdjust: true, hepaticAdjust: true },
        { name: 'Methylnaltrexone', genericName: 'Methylnaltrexone', doses: ['8mg', '12mg'], routes: ['subcutaneous'], frequency: ['Every other day'], maxDaily: '12mg', renalAdjust: true },
      ],
    },
    {
      id: 'neuropathic_pain',
      name: 'Neuropathic Pain Agents',
      medications: [
        { name: 'Gabapentin', genericName: 'Gabapentin', doses: ['100mg', '300mg', '400mg', '600mg', '800mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '3.6g', renalAdjust: true },
        { name: 'Pregabalin', genericName: 'Pregabalin', doses: ['25mg', '50mg', '75mg', '100mg', '150mg', '200mg', '300mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '600mg', renalAdjust: true, controlledDrug: true },
        { name: 'Amitriptyline (Pain)', genericName: 'Amitriptyline', doses: ['10mg', '25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Nortriptyline (Pain)', genericName: 'Nortriptyline', doses: ['10mg', '25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Duloxetine (Pain)', genericName: 'Duloxetine', doses: ['20mg', '30mg', '60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '120mg', renalAdjust: true },
        { name: 'Carbamazepine (Pain)', genericName: 'Carbamazepine', doses: ['100mg', '200mg', '400mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '1.6g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Capsaicin Cream', genericName: 'Capsaicin', doses: ['0.025%', '0.075%', '8% patch'], routes: ['topical'], frequency: ['8 hourly', '12 hourly'], maxDaily: '4 applications', renalAdjust: false },
        { name: 'Lidocaine Patch 5%', genericName: 'Lidocaine', doses: ['5% patch'], routes: ['topical'], frequency: ['12 hours on, 12 hours off'], maxDaily: '3 patches', renalAdjust: false },
      ],
    },
    {
      id: 'migraine',
      name: 'Migraine Treatment',
      medications: [
        // Acute Treatment - Triptans
        { name: 'Sumatriptan', genericName: 'Sumatriptan', doses: ['25mg', '50mg', '100mg', '6mg SC', '10mg nasal', '20mg nasal'], routes: ['oral', 'subcutaneous', 'intranasal'], frequency: ['PRN', 'May repeat after 2hrs'], maxDaily: '200mg oral, 12mg SC', renalAdjust: true },
        { name: 'Rizatriptan', genericName: 'Rizatriptan', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['PRN', 'May repeat after 2hrs'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Zolmitriptan', genericName: 'Zolmitriptan', doses: ['2.5mg', '5mg', '5mg nasal'], routes: ['oral', 'intranasal'], frequency: ['PRN', 'May repeat after 2hrs'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Eletriptan', genericName: 'Eletriptan', doses: ['20mg', '40mg'], routes: ['oral'], frequency: ['PRN', 'May repeat after 2hrs'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Naratriptan', genericName: 'Naratriptan', doses: ['2.5mg'], routes: ['oral'], frequency: ['PRN', 'May repeat after 4hrs'], maxDaily: '5mg', renalAdjust: true },
        { name: 'Frovatriptan', genericName: 'Frovatriptan', doses: ['2.5mg'], routes: ['oral'], frequency: ['PRN', 'May repeat after 2hrs'], maxDaily: '7.5mg', renalAdjust: false },
        { name: 'Almotriptan', genericName: 'Almotriptan', doses: ['6.25mg', '12.5mg'], routes: ['oral'], frequency: ['PRN', 'May repeat after 2hrs'], maxDaily: '25mg', renalAdjust: true },
        // Acute - Other
        { name: 'Ergotamine', genericName: 'Ergotamine', doses: ['1mg', '2mg'], routes: ['oral', 'sublingual', 'rectal'], frequency: ['At onset, may repeat 0.5-1mg'], maxDaily: '6mg', renalAdjust: true },
        { name: 'Dihydroergotamine', genericName: 'Dihydroergotamine', doses: ['1mg IV/IM/SC', '4mg nasal'], routes: ['intravenous', 'intramuscular', 'subcutaneous', 'intranasal'], frequency: ['PRN'], maxDaily: '6mg', renalAdjust: true },
        // Prophylaxis
        { name: 'Propranolol (Migraine)', genericName: 'Propranolol', doses: ['40mg', '80mg', '160mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '240mg', renalAdjust: false },
        { name: 'Topiramate (Migraine)', genericName: 'Topiramate', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Valproate (Migraine)', genericName: 'Sodium Valproate', doses: ['200mg', '400mg', '600mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '1.5g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Amitriptyline (Migraine)', genericName: 'Amitriptyline', doses: ['10mg', '25mg', '50mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Flunarizine', genericName: 'Flunarizine', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Pizotifen', genericName: 'Pizotifen', doses: ['0.5mg', '1.5mg'], routes: ['oral'], frequency: ['Once daily at night', '8 hourly'], maxDaily: '4.5mg', renalAdjust: false },
        { name: 'Candesartan (Migraine)', genericName: 'Candesartan', doses: ['8mg', '16mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '16mg', renalAdjust: true },
        // CGRP Antagonists
        { name: 'Erenumab', genericName: 'Erenumab', doses: ['70mg', '140mg'], routes: ['subcutaneous'], frequency: ['Once monthly'], maxDaily: '140mg/month', renalAdjust: false },
        { name: 'Fremanezumab', genericName: 'Fremanezumab', doses: ['225mg', '675mg'], routes: ['subcutaneous'], frequency: ['Monthly or quarterly'], maxDaily: '225mg/month', renalAdjust: false },
        { name: 'Galcanezumab', genericName: 'Galcanezumab', doses: ['120mg', '240mg'], routes: ['subcutaneous'], frequency: ['Once monthly'], maxDaily: '120mg/month', renalAdjust: false },
      ],
    },
    {
      id: 'anticonvulsants',
      name: 'Anticonvulsants / Antiepileptics',
      medications: [
        { name: 'Phenytoin', genericName: 'Phenytoin', doses: ['50mg', '100mg', '300mg', '15-20mg/kg loading'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '600mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Carbamazepine', genericName: 'Carbamazepine', doses: ['100mg', '200mg', '400mg', '200mg CR', '400mg CR'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '1.6g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Sodium Valproate', genericName: 'Valproic Acid', doses: ['200mg', '300mg', '500mg', '500mg CR', '100mg/ml syrup'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '8 hourly'], maxDaily: '2.5g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Levetiracetam', genericName: 'Levetiracetam', doses: ['250mg', '500mg', '750mg', '1000mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '3g', renalAdjust: true },
        { name: 'Lamotrigine', genericName: 'Lamotrigine', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Topiramate', genericName: 'Topiramate', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Oxcarbazepine', genericName: 'Oxcarbazepine', doses: ['150mg', '300mg', '600mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2.4g', renalAdjust: true },
        { name: 'Lacosamide', genericName: 'Lacosamide', doses: ['50mg', '100mg', '150mg', '200mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Brivaracetam', genericName: 'Brivaracetam', doses: ['25mg', '50mg', '75mg', '100mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Perampanel', genericName: 'Perampanel', doses: ['2mg', '4mg', '6mg', '8mg', '10mg', '12mg'], routes: ['oral'], frequency: ['Once daily at bedtime'], maxDaily: '12mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Clobazam', genericName: 'Clobazam', doses: ['5mg', '10mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '60mg', renalAdjust: false, hepaticAdjust: true, controlledDrug: true },
        { name: 'Clonazepam', genericName: 'Clonazepam', doses: ['0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '20mg', renalAdjust: false, controlledDrug: true },
        { name: 'Phenobarbital', genericName: 'Phenobarbital', doses: ['15mg', '30mg', '60mg', '100mg', '15-20mg/kg loading'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once daily', '12 hourly'], maxDaily: '300mg', renalAdjust: true, controlledDrug: true },
        { name: 'Primidone', genericName: 'Primidone', doses: ['125mg', '250mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '2g', renalAdjust: true, controlledDrug: true },
        { name: 'Ethosuximide', genericName: 'Ethosuximide', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '2g', renalAdjust: false },
        { name: 'Vigabatrin', genericName: 'Vigabatrin', doses: ['500mg', '1g', '1.5g'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '3g', renalAdjust: true },
        { name: 'Zonisamide', genericName: 'Zonisamide', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '500mg', renalAdjust: true },
        { name: 'Eslicarbazepine', genericName: 'Eslicarbazepine', doses: ['400mg', '800mg', '1200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1200mg', renalAdjust: true },
        { name: 'Rufinamide', genericName: 'Rufinamide', doses: ['100mg', '200mg', '400mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '3.2g', renalAdjust: false },
        // Status Epilepticus
        { name: 'Diazepam (Status)', genericName: 'Diazepam', doses: ['5mg', '10mg', '0.2-0.3mg/kg'], routes: ['intravenous', 'rectal'], frequency: ['PRN', 'May repeat x2'], maxDaily: '30mg', renalAdjust: false, controlledDrug: true },
        { name: 'Lorazepam (Status)', genericName: 'Lorazepam', doses: ['2mg', '4mg', '0.1mg/kg'], routes: ['intravenous'], frequency: ['PRN', 'May repeat once'], maxDaily: '8mg', renalAdjust: false, controlledDrug: true },
        { name: 'Midazolam (Status)', genericName: 'Midazolam', doses: ['5mg', '10mg', '0.1-0.2mg/kg'], routes: ['intravenous', 'intramuscular', 'buccal', 'intranasal'], frequency: ['PRN', 'May repeat once'], maxDaily: '10mg buccal', renalAdjust: false, controlledDrug: true },
        { name: 'Fosphenytoin', genericName: 'Fosphenytoin', doses: ['15-20mg PE/kg'], routes: ['intravenous', 'intramuscular'], frequency: ['Loading dose'], maxDaily: '30mg PE/kg', renalAdjust: false },
      ],
    },
    {
      id: 'anxiolytics_hypnotics',
      name: 'Anxiolytics & Hypnotics',
      medications: [
        // Benzodiazepines
        { name: 'Diazepam', genericName: 'Diazepam', doses: ['2mg', '5mg', '10mg'], routes: ['oral', 'intravenous', 'intramuscular', 'rectal'], frequency: ['8 hourly', '12 hourly', 'PRN'], maxDaily: '30mg', renalAdjust: false, controlledDrug: true },
        { name: 'Lorazepam', genericName: 'Lorazepam', doses: ['0.5mg', '1mg', '2mg'], routes: ['oral', 'intravenous', 'intramuscular', 'sublingual'], frequency: ['8 hourly', '12 hourly'], maxDaily: '10mg', renalAdjust: false, controlledDrug: true },
        { name: 'Alprazolam', genericName: 'Alprazolam', doses: ['0.25mg', '0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '10mg', renalAdjust: false, controlledDrug: true },
        { name: 'Clonazepam (Anxiety)', genericName: 'Clonazepam', doses: ['0.25mg', '0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '6mg', renalAdjust: false, controlledDrug: true },
        { name: 'Bromazepam', genericName: 'Bromazepam', doses: ['1.5mg', '3mg', '6mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '18mg', renalAdjust: false, controlledDrug: true },
        { name: 'Chlordiazepoxide', genericName: 'Chlordiazepoxide', doses: ['5mg', '10mg', '25mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '100mg', renalAdjust: false, controlledDrug: true },
        { name: 'Oxazepam', genericName: 'Oxazepam', doses: ['10mg', '15mg', '30mg'], routes: ['oral'], frequency: ['8 hourly', '6 hourly'], maxDaily: '120mg', renalAdjust: false, controlledDrug: true },
        // Hypnotics - Benzodiazepines
        { name: 'Temazepam', genericName: 'Temazepam', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['At bedtime'], maxDaily: '30mg', renalAdjust: false, controlledDrug: true },
        { name: 'Nitrazepam', genericName: 'Nitrazepam', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['At bedtime'], maxDaily: '10mg', renalAdjust: false, controlledDrug: true },
        { name: 'Flurazepam', genericName: 'Flurazepam', doses: ['15mg', '30mg'], routes: ['oral'], frequency: ['At bedtime'], maxDaily: '30mg', renalAdjust: false, controlledDrug: true },
        { name: 'Triazolam', genericName: 'Triazolam', doses: ['0.125mg', '0.25mg'], routes: ['oral'], frequency: ['At bedtime'], maxDaily: '0.5mg', renalAdjust: false, controlledDrug: true },
        // Z-Drugs
        { name: 'Zopiclone', genericName: 'Zopiclone', doses: ['3.75mg', '7.5mg'], routes: ['oral'], frequency: ['At bedtime'], maxDaily: '7.5mg', renalAdjust: true, hepaticAdjust: true, controlledDrug: true },
        { name: 'Zolpidem', genericName: 'Zolpidem', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['At bedtime'], maxDaily: '10mg', renalAdjust: false, hepaticAdjust: true, controlledDrug: true },
        { name: 'Eszopiclone', genericName: 'Eszopiclone', doses: ['1mg', '2mg', '3mg'], routes: ['oral'], frequency: ['At bedtime'], maxDaily: '3mg', renalAdjust: false, hepaticAdjust: true, controlledDrug: true },
        { name: 'Zaleplon', genericName: 'Zaleplon', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['At bedtime'], maxDaily: '10mg', renalAdjust: false, hepaticAdjust: true, controlledDrug: true },
        // Melatonin Agonists
        { name: 'Melatonin', genericName: 'Melatonin', doses: ['2mg', '3mg', '5mg'], routes: ['oral'], frequency: ['30 mins before bedtime'], maxDaily: '5mg', renalAdjust: false },
        { name: 'Ramelteon', genericName: 'Ramelteon', doses: ['8mg'], routes: ['oral'], frequency: ['At bedtime'], maxDaily: '8mg', renalAdjust: false, hepaticAdjust: true },
        // Other Anxiolytics
        { name: 'Buspirone', genericName: 'Buspirone', doses: ['5mg', '10mg', '15mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '60mg', renalAdjust: true },
        { name: 'Hydroxyzine (Anxiety)', genericName: 'Hydroxyzine', doses: ['10mg', '25mg', '50mg'], routes: ['oral'], frequency: ['8 hourly', '6 hourly'], maxDaily: '100mg', renalAdjust: true },
      ],
    },
    {
      id: 'antidepressants',
      name: 'Antidepressants',
      medications: [
        // SSRIs
        { name: 'Sertraline', genericName: 'Sertraline', doses: ['25mg', '50mg', '100mg', '150mg', '200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Fluoxetine', genericName: 'Fluoxetine', doses: ['10mg', '20mg', '40mg', '60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '80mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Paroxetine', genericName: 'Paroxetine', doses: ['10mg', '20mg', '30mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mg', renalAdjust: true },
        { name: 'Citalopram', genericName: 'Citalopram', doses: ['10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Escitalopram', genericName: 'Escitalopram', doses: ['5mg', '10mg', '20mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Fluvoxamine', genericName: 'Fluvoxamine', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '300mg', renalAdjust: false },
        // SNRIs
        { name: 'Venlafaxine', genericName: 'Venlafaxine', doses: ['37.5mg', '75mg', '150mg', '225mg XR'], routes: ['oral'], frequency: ['12 hourly', 'Once daily XR'], maxDaily: '375mg', renalAdjust: true, hepaticAdjust: true },
        { name: 'Duloxetine', genericName: 'Duloxetine', doses: ['20mg', '30mg', '40mg', '60mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '120mg', renalAdjust: true },
        { name: 'Desvenlafaxine', genericName: 'Desvenlafaxine', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Milnacipran', genericName: 'Milnacipran', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: true },
        // TCAs
        { name: 'Amitriptyline', genericName: 'Amitriptyline', doses: ['10mg', '25mg', '50mg', '75mg', '100mg'], routes: ['oral'], frequency: ['Once daily at night', '8 hourly'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Nortriptyline', genericName: 'Nortriptyline', doses: ['10mg', '25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['Once daily at night', '8 hourly'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Imipramine', genericName: 'Imipramine', doses: ['10mg', '25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['Once daily at night', '8 hourly'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Clomipramine', genericName: 'Clomipramine', doses: ['10mg', '25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['Once daily at night', '8 hourly'], maxDaily: '250mg', renalAdjust: false },
        { name: 'Doxepin', genericName: 'Doxepin', doses: ['10mg', '25mg', '50mg', '75mg', '100mg'], routes: ['oral'], frequency: ['Once daily at night', '8 hourly'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Trimipramine', genericName: 'Trimipramine', doses: ['25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Dosulepin', genericName: 'Dosulepin', doses: ['25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['Once daily at night', '8 hourly'], maxDaily: '225mg', renalAdjust: false },
        // Others
        { name: 'Mirtazapine', genericName: 'Mirtazapine', doses: ['15mg', '30mg', '45mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '45mg', renalAdjust: true },
        { name: 'Bupropion', genericName: 'Bupropion', doses: ['75mg', '100mg', '150mg SR', '300mg XL'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '450mg', renalAdjust: true, hepaticAdjust: true },
        { name: 'Trazodone', genericName: 'Trazodone', doses: ['50mg', '100mg', '150mg', '300mg'], routes: ['oral'], frequency: ['Once daily at night', '12 hourly'], maxDaily: '600mg', renalAdjust: false },
        { name: 'Vortioxetine', genericName: 'Vortioxetine', doses: ['5mg', '10mg', '15mg', '20mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Agomelatine', genericName: 'Agomelatine', doses: ['25mg', '50mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '50mg', renalAdjust: false, hepaticAdjust: true },
        // MAOIs
        { name: 'Phenelzine', genericName: 'Phenelzine', doses: ['15mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '90mg', renalAdjust: false },
        { name: 'Tranylcypromine', genericName: 'Tranylcypromine', doses: ['10mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Moclobemide', genericName: 'Moclobemide', doses: ['150mg', '300mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '600mg', renalAdjust: false, hepaticAdjust: true },
      ],
    },
    {
      id: 'antipsychotics',
      name: 'Antipsychotics',
      medications: [
        // First Generation (Typical)
        { name: 'Haloperidol', genericName: 'Haloperidol', doses: ['0.5mg', '1mg', '2mg', '5mg', '10mg', '5mg IM'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Chlorpromazine', genericName: 'Chlorpromazine', doses: ['10mg', '25mg', '50mg', '100mg'], routes: ['oral', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '1g', renalAdjust: false },
        { name: 'Fluphenazine', genericName: 'Fluphenazine', doses: ['1mg', '2.5mg', '5mg', '25mg depot'], routes: ['oral', 'intramuscular'], frequency: ['8 hourly', '2-4 weekly depot'], maxDaily: '20mg oral', renalAdjust: false },
        { name: 'Trifluoperazine', genericName: 'Trifluoperazine', doses: ['1mg', '2mg', '5mg', '10mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '40mg', renalAdjust: false },
        { name: 'Perphenazine', genericName: 'Perphenazine', doses: ['2mg', '4mg', '8mg', '16mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '64mg', renalAdjust: false },
        { name: 'Sulpiride', genericName: 'Sulpiride', doses: ['50mg', '100mg', '200mg', '400mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '2.4g', renalAdjust: true },
        { name: 'Amisulpride', genericName: 'Amisulpride', doses: ['50mg', '100mg', '200mg', '400mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '1.2g', renalAdjust: true },
        { name: 'Pimozide', genericName: 'Pimozide', doses: ['2mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Zuclopenthixol', genericName: 'Zuclopenthixol', doses: ['10mg', '25mg', '40mg', '100mg depot'], routes: ['oral', 'intramuscular'], frequency: ['8 hourly', '2-4 weekly depot'], maxDaily: '150mg oral', renalAdjust: false },
        // Second Generation (Atypical)
        { name: 'Risperidone', genericName: 'Risperidone', doses: ['0.5mg', '1mg', '2mg', '3mg', '4mg', '25mg depot', '37.5mg depot', '50mg depot'], routes: ['oral', 'intramuscular'], frequency: ['12 hourly', 'Once daily', '2 weekly depot'], maxDaily: '16mg oral', renalAdjust: true },
        { name: 'Olanzapine', genericName: 'Olanzapine', doses: ['2.5mg', '5mg', '7.5mg', '10mg', '15mg', '20mg', '10mg IM'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', 'PRN IM'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Quetiapine', genericName: 'Quetiapine', doses: ['25mg', '50mg', '100mg', '150mg', '200mg', '300mg', '400mg XR'], routes: ['oral'], frequency: ['12 hourly', 'Once daily XR'], maxDaily: '800mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Aripiprazole', genericName: 'Aripiprazole', doses: ['5mg', '10mg', '15mg', '20mg', '30mg', '400mg depot'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', 'Monthly depot'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Ziprasidone', genericName: 'Ziprasidone', doses: ['20mg', '40mg', '60mg', '80mg'], routes: ['oral', 'intramuscular'], frequency: ['12 hourly'], maxDaily: '160mg', renalAdjust: false },
        { name: 'Paliperidone', genericName: 'Paliperidone', doses: ['3mg', '6mg', '9mg', '12mg', '75mg depot', '100mg depot', '150mg depot'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', 'Monthly depot'], maxDaily: '12mg oral', renalAdjust: true },
        { name: 'Clozapine', genericName: 'Clozapine', doses: ['12.5mg', '25mg', '50mg', '100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '900mg', renalAdjust: false, specialInstructions: 'Requires blood monitoring' },
        { name: 'Lurasidone', genericName: 'Lurasidone', doses: ['20mg', '40mg', '60mg', '80mg', '120mg', '160mg'], routes: ['oral'], frequency: ['Once daily with food'], maxDaily: '160mg', renalAdjust: true },
        { name: 'Brexpiprazole', genericName: 'Brexpiprazole', doses: ['0.5mg', '1mg', '2mg', '3mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '4mg', renalAdjust: true },
        { name: 'Cariprazine', genericName: 'Cariprazine', doses: ['1.5mg', '3mg', '4.5mg', '6mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '6mg', renalAdjust: false },
      ],
    },
    {
      id: 'parkinsons',
      name: 'Parkinsonism & Related Disorders',
      medications: [
        // Levodopa Combinations
        { name: 'Levodopa/Carbidopa', genericName: 'Sinemet', doses: ['100/10mg', '100/25mg', '250/25mg', '100/25mg CR', '200/50mg CR'], routes: ['oral'], frequency: ['8 hourly', '6 hourly', '12 hourly CR'], maxDaily: '2g levodopa', renalAdjust: false },
        { name: 'Levodopa/Benserazide', genericName: 'Madopar', doses: ['50/12.5mg', '100/25mg', '200/50mg', '100/25mg HBS'], routes: ['oral'], frequency: ['8 hourly', '6 hourly'], maxDaily: '2g levodopa', renalAdjust: false },
        { name: 'Levodopa/Carbidopa/Entacapone', genericName: 'Stalevo', doses: ['50/12.5/200mg', '100/25/200mg', '150/37.5/200mg', '200/50/200mg'], routes: ['oral'], frequency: ['8 hourly', '6 hourly'], maxDaily: '8 tablets', renalAdjust: false },
        // Dopamine Agonists
        { name: 'Pramipexole', genericName: 'Pramipexole', doses: ['0.088mg', '0.18mg', '0.35mg', '0.7mg', '1.1mg'], routes: ['oral'], frequency: ['8 hourly', 'Once daily ER'], maxDaily: '4.5mg', renalAdjust: true },
        { name: 'Ropinirole', genericName: 'Ropinirole', doses: ['0.25mg', '0.5mg', '1mg', '2mg', '4mg', '8mg XL'], routes: ['oral'], frequency: ['8 hourly', 'Once daily XL'], maxDaily: '24mg', renalAdjust: false },
        { name: 'Rotigotine', genericName: 'Rotigotine', doses: ['1mg/24hr', '2mg/24hr', '4mg/24hr', '6mg/24hr', '8mg/24hr'], routes: ['transdermal'], frequency: ['Once daily patch'], maxDaily: '16mg/24hr', renalAdjust: false },
        { name: 'Apomorphine', genericName: 'Apomorphine', doses: ['2mg', '3mg', '4mg', '5mg', '6mg SC'], routes: ['subcutaneous'], frequency: ['PRN, max 5 times daily'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Bromocriptine', genericName: 'Bromocriptine', doses: ['1.25mg', '2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Cabergoline', genericName: 'Cabergoline', doses: ['0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '6mg', renalAdjust: false },
        // MAO-B Inhibitors
        { name: 'Selegiline', genericName: 'Selegiline', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Rasagiline', genericName: 'Rasagiline', doses: ['0.5mg', '1mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Safinamide', genericName: 'Safinamide', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: false },
        // COMT Inhibitors
        { name: 'Entacapone', genericName: 'Entacapone', doses: ['200mg'], routes: ['oral'], frequency: ['With each levodopa dose'], maxDaily: '2g', renalAdjust: false },
        { name: 'Tolcapone', genericName: 'Tolcapone', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '600mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Opicapone', genericName: 'Opicapone', doses: ['50mg'], routes: ['oral'], frequency: ['Once daily at bedtime'], maxDaily: '50mg', renalAdjust: false },
        // Anticholinergics
        { name: 'Trihexyphenidyl', genericName: 'Benzhexol', doses: ['2mg', '5mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '15mg', renalAdjust: false },
        { name: 'Procyclidine', genericName: 'Procyclidine', doses: ['2.5mg', '5mg'], routes: ['oral', 'intramuscular'], frequency: ['8 hourly'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Biperiden', genericName: 'Biperiden', doses: ['2mg', '4mg'], routes: ['oral', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '16mg', renalAdjust: false },
        { name: 'Orphenadrine', genericName: 'Orphenadrine', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '400mg', renalAdjust: false },
        // Others
        { name: 'Amantadine', genericName: 'Amantadine', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Istradefylline', genericName: 'Istradefylline', doses: ['20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: false },
      ],
    },
    {
      id: 'dementia',
      name: 'Dementia & Cognitive Enhancers',
      medications: [
        { name: 'Donepezil', genericName: 'Donepezil', doses: ['5mg', '10mg', '23mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '23mg', renalAdjust: false },
        { name: 'Rivastigmine', genericName: 'Rivastigmine', doses: ['1.5mg', '3mg', '4.5mg', '6mg', '4.6mg/24hr patch', '9.5mg/24hr patch', '13.3mg/24hr patch'], routes: ['oral', 'transdermal'], frequency: ['12 hourly', 'Once daily patch'], maxDaily: '12mg oral, 13.3mg patch', renalAdjust: false },
        { name: 'Galantamine', genericName: 'Galantamine', doses: ['4mg', '8mg', '12mg', '8mg ER', '16mg ER', '24mg ER'], routes: ['oral'], frequency: ['12 hourly', 'Once daily ER'], maxDaily: '24mg', renalAdjust: true },
        { name: 'Memantine', genericName: 'Memantine', doses: ['5mg', '10mg', '20mg', '14mg ER', '28mg ER'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '20mg', renalAdjust: true },
      ],
    },
    {
      id: 'adhd_narcolepsy',
      name: 'ADHD & Narcolepsy',
      medications: [
        { name: 'Methylphenidate', genericName: 'Methylphenidate', doses: ['5mg', '10mg', '20mg', '18mg ER', '27mg ER', '36mg ER', '54mg ER'], routes: ['oral'], frequency: ['12 hourly', '8 hourly', 'Once daily ER'], maxDaily: '60mg', renalAdjust: false, controlledDrug: true },
        { name: 'Dexamfetamine', genericName: 'Dextroamphetamine', doses: ['5mg', '10mg', '15mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '40mg', renalAdjust: false, controlledDrug: true },
        { name: 'Lisdexamfetamine', genericName: 'Lisdexamfetamine', doses: ['20mg', '30mg', '40mg', '50mg', '60mg', '70mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '70mg', renalAdjust: true, controlledDrug: true },
        { name: 'Atomoxetine', genericName: 'Atomoxetine', doses: ['10mg', '18mg', '25mg', '40mg', '60mg', '80mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Modafinil', genericName: 'Modafinil', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['Once daily in morning'], maxDaily: '400mg', renalAdjust: false, controlledDrug: true },
        { name: 'Armodafinil', genericName: 'Armodafinil', doses: ['50mg', '150mg', '250mg'], routes: ['oral'], frequency: ['Once daily in morning'], maxDaily: '250mg', renalAdjust: false, controlledDrug: true },
        { name: 'Guanfacine', genericName: 'Guanfacine', doses: ['1mg', '2mg', '3mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '4mg', renalAdjust: true },
        { name: 'Sodium Oxybate', genericName: 'Sodium Oxybate', doses: ['2.25g', '4.5g', '6g', '9g'], routes: ['oral'], frequency: ['Divided in 2 doses at night'], maxDaily: '9g', renalAdjust: false, controlledDrug: true },
        { name: 'Pitolisant', genericName: 'Pitolisant', doses: ['4.45mg', '8.9mg', '17.8mg', '35.6mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '35.6mg', renalAdjust: true },
        { name: 'Solriamfetol', genericName: 'Solriamfetol', doses: ['75mg', '150mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '150mg', renalAdjust: true, controlledDrug: true },
      ],
    },
  ],
};

// ============================================
// 5. INFECTIONS
// ============================================
export const infectionMedications: BNFCategory = {
  id: 'infections',
  name: 'Infections',
  subcategories: [
    {
      id: 'penicillins',
      name: 'Penicillins',
      medications: [
        // Benzylpenicillin & Phenoxymethylpenicillin
        { name: 'Benzylpenicillin', genericName: 'Penicillin G', doses: ['600mg', '1.2g', '2.4g', '3.6g', '4.8g'], routes: ['intravenous', 'intramuscular'], frequency: ['4 hourly', '6 hourly'], maxDaily: '14.4g', renalAdjust: true },
        { name: 'Phenoxymethylpenicillin', genericName: 'Penicillin V', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '3g', renalAdjust: true },
        { name: 'Procaine Penicillin', genericName: 'Procaine Benzylpenicillin', doses: ['600mg', '1.2g', '3g'], routes: ['intramuscular'], frequency: ['Once daily', '12 hourly'], maxDaily: '4.8g', renalAdjust: true },
        { name: 'Benzathine Penicillin', genericName: 'Benzathine Benzylpenicillin', doses: ['1.2MU', '2.4MU'], routes: ['intramuscular'], frequency: ['Single dose', 'Every 2-4 weeks'], maxDaily: '2.4MU', renalAdjust: true },
        // Aminopenicillins
        { name: 'Amoxicillin', genericName: 'Amoxicillin', doses: ['250mg', '500mg', '1g'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '6 hourly'], maxDaily: '6g', renalAdjust: true },
        { name: 'Ampicillin', genericName: 'Ampicillin', doses: ['250mg', '500mg', '1g', '2g'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly'], maxDaily: '12g', renalAdjust: true },
        // Beta-lactamase Resistant
        { name: 'Flucloxacillin', genericName: 'Flucloxacillin', doses: ['250mg', '500mg', '1g', '2g'], routes: ['oral', 'intravenous'], frequency: ['6 hourly'], maxDaily: '8g', renalAdjust: true },
        { name: 'Cloxacillin', genericName: 'Cloxacillin', doses: ['250mg', '500mg', '1g'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly'], maxDaily: '6g', renalAdjust: true },
        { name: 'Dicloxacillin', genericName: 'Dicloxacillin', doses: ['125mg', '250mg', '500mg'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '2g', renalAdjust: true },
        { name: 'Nafcillin', genericName: 'Nafcillin', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['4 hourly', '6 hourly'], maxDaily: '12g', renalAdjust: false },
        { name: 'Oxacillin', genericName: 'Oxacillin', doses: ['250mg', '500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['4 hourly', '6 hourly'], maxDaily: '12g', renalAdjust: false },
        // Broad-spectrum with Beta-lactamase Inhibitors
        { name: 'Amoxicillin/Clavulanate', genericName: 'Co-amoxiclav', doses: ['375mg', '625mg', '1g', '1.2g IV'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '3g amoxicillin', renalAdjust: true },
        { name: 'Ampicillin/Sulbactam', genericName: 'Unasyn', doses: ['1.5g', '3g'], routes: ['intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '12g', renalAdjust: true },
        { name: 'Piperacillin/Tazobactam', genericName: 'Tazocin', doses: ['2.25g', '4.5g'], routes: ['intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '18g', renalAdjust: true },
        { name: 'Ticarcillin/Clavulanate', genericName: 'Timentin', doses: ['3.1g'], routes: ['intravenous'], frequency: ['4 hourly', '6 hourly'], maxDaily: '18.6g', renalAdjust: true },
        // Antipseudomonal
        { name: 'Piperacillin', genericName: 'Piperacillin', doses: ['2g', '3g', '4g'], routes: ['intravenous', 'intramuscular'], frequency: ['4 hourly', '6 hourly'], maxDaily: '24g', renalAdjust: true },
        { name: 'Ticarcillin', genericName: 'Ticarcillin', doses: ['1g', '3g'], routes: ['intravenous'], frequency: ['4 hourly', '6 hourly'], maxDaily: '18g', renalAdjust: true },
        { name: 'Azlocillin', genericName: 'Azlocillin', doses: ['2g', '5g'], routes: ['intravenous'], frequency: ['8 hourly', '6 hourly'], maxDaily: '15g', renalAdjust: true },
        { name: 'Mezlocillin', genericName: 'Mezlocillin', doses: ['2g', '3g', '4g'], routes: ['intravenous', 'intramuscular'], frequency: ['4 hourly', '6 hourly'], maxDaily: '24g', renalAdjust: true },
      ],
    },
    {
      id: 'cephalosporins',
      name: 'Cephalosporins',
      medications: [
        // First Generation
        { name: 'Cephalexin', genericName: 'Cefalexin', doses: ['250mg', '500mg', '1g'], routes: ['oral'], frequency: ['6 hourly', '8 hourly', '12 hourly'], maxDaily: '4g', renalAdjust: true },
        { name: 'Cefadroxil', genericName: 'Cefadroxil', doses: ['500mg', '1g'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '2g', renalAdjust: true },
        { name: 'Cefazolin', genericName: 'Cefazolin', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['8 hourly', '6 hourly'], maxDaily: '12g', renalAdjust: true },
        { name: 'Cefradine', genericName: 'Cephradine', doses: ['250mg', '500mg', '1g'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly', '12 hourly'], maxDaily: '4g', renalAdjust: true },
        // Second Generation
        { name: 'Cefuroxime', genericName: 'Cefuroxime', doses: ['125mg', '250mg', '500mg', '750mg', '1.5g'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '9g', renalAdjust: true },
        { name: 'Cefaclor', genericName: 'Cefaclor', doses: ['250mg', '375mg MR', '500mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '4g', renalAdjust: true },
        { name: 'Cefprozil', genericName: 'Cefprozil', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '1g', renalAdjust: true },
        { name: 'Cefoxitin', genericName: 'Cefoxitin', doses: ['1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '12g', renalAdjust: true },
        { name: 'Cefotetan', genericName: 'Cefotetan', doses: ['1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['12 hourly'], maxDaily: '6g', renalAdjust: true },
        // Third Generation
        { name: 'Ceftriaxone', genericName: 'Ceftriaxone', doses: ['250mg', '500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['Once daily', '12 hourly'], maxDaily: '4g', renalAdjust: false },
        { name: 'Cefotaxime', genericName: 'Cefotaxime', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['8 hourly', '6 hourly', '4 hourly'], maxDaily: '12g', renalAdjust: true },
        { name: 'Ceftazidime', genericName: 'Ceftazidime', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '6g', renalAdjust: true },
        { name: 'Cefixime', genericName: 'Cefixime', doses: ['100mg', '200mg', '400mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Cefpodoxime', genericName: 'Cefpodoxime', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '800mg', renalAdjust: true },
        { name: 'Ceftibuten', genericName: 'Ceftibuten', doses: ['400mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Cefdinir', genericName: 'Cefdinir', doses: ['300mg', '600mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '600mg', renalAdjust: true },
        { name: 'Cefoperazone', genericName: 'Cefoperazone', doses: ['1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['12 hourly', '8 hourly'], maxDaily: '12g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Cefoperazone/Sulbactam', genericName: 'Sulperazone', doses: ['1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['12 hourly', '8 hourly'], maxDaily: '8g', renalAdjust: false },
        // Fourth Generation
        { name: 'Cefepime', genericName: 'Cefepime', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '6g', renalAdjust: true },
        { name: 'Cefpirome', genericName: 'Cefpirome', doses: ['1g', '2g'], routes: ['intravenous'], frequency: ['12 hourly'], maxDaily: '4g', renalAdjust: true },
        // Fifth Generation
        { name: 'Ceftaroline', genericName: 'Ceftaroline Fosamil', doses: ['600mg'], routes: ['intravenous'], frequency: ['12 hourly'], maxDaily: '1.2g', renalAdjust: true },
        { name: 'Ceftobiprole', genericName: 'Ceftobiprole', doses: ['500mg'], routes: ['intravenous'], frequency: ['8 hourly'], maxDaily: '1.5g', renalAdjust: true },
        // Anti-pseudomonal with Beta-lactamase Inhibitor
        { name: 'Ceftazidime/Avibactam', genericName: 'Avycaz', doses: ['2.5g'], routes: ['intravenous'], frequency: ['8 hourly'], maxDaily: '7.5g', renalAdjust: true },
        { name: 'Ceftolozane/Tazobactam', genericName: 'Zerbaxa', doses: ['1.5g', '3g'], routes: ['intravenous'], frequency: ['8 hourly'], maxDaily: '9g', renalAdjust: true },
      ],
    },
    {
      id: 'carbapenems_monobactams',
      name: 'Carbapenems & Monobactams',
      medications: [
        // Carbapenems
        { name: 'Meropenem', genericName: 'Meropenem', doses: ['500mg', '1g', '2g'], routes: ['intravenous'], frequency: ['8 hourly'], maxDaily: '6g', renalAdjust: true },
        { name: 'Imipenem/Cilastatin', genericName: 'Primaxin', doses: ['250mg', '500mg', '1g'], routes: ['intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4g', renalAdjust: true },
        { name: 'Ertapenem', genericName: 'Ertapenem', doses: ['1g'], routes: ['intravenous', 'intramuscular'], frequency: ['Once daily'], maxDaily: '1g', renalAdjust: true },
        { name: 'Doripenem', genericName: 'Doripenem', doses: ['500mg'], routes: ['intravenous'], frequency: ['8 hourly'], maxDaily: '1.5g', renalAdjust: true },
        { name: 'Meropenem/Vaborbactam', genericName: 'Vabomere', doses: ['4g'], routes: ['intravenous'], frequency: ['8 hourly'], maxDaily: '12g', renalAdjust: true },
        { name: 'Imipenem/Cilastatin/Relebactam', genericName: 'Recarbrio', doses: ['1.25g'], routes: ['intravenous'], frequency: ['6 hourly'], maxDaily: '5g', renalAdjust: true },
        // Monobactam
        { name: 'Aztreonam', genericName: 'Aztreonam', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['8 hourly', '6 hourly'], maxDaily: '8g', renalAdjust: true },
      ],
    },
    {
      id: 'aminoglycosides',
      name: 'Aminoglycosides',
      medications: [
        { name: 'Gentamicin', genericName: 'Gentamicin', doses: ['1mg/kg', '3mg/kg', '5-7mg/kg', '80mg', '120mg', '240mg'], routes: ['intravenous', 'intramuscular'], frequency: ['8 hourly', 'Once daily'], maxDaily: '7mg/kg', renalAdjust: true },
        { name: 'Amikacin', genericName: 'Amikacin', doses: ['7.5mg/kg', '15mg/kg', '500mg', '1g'], routes: ['intravenous', 'intramuscular'], frequency: ['12 hourly', 'Once daily'], maxDaily: '15mg/kg', renalAdjust: true },
        { name: 'Tobramycin', genericName: 'Tobramycin', doses: ['1mg/kg', '3mg/kg', '5-7mg/kg', '80mg'], routes: ['intravenous', 'intramuscular', 'nebulization'], frequency: ['8 hourly', 'Once daily'], maxDaily: '7mg/kg', renalAdjust: true },
        { name: 'Streptomycin', genericName: 'Streptomycin', doses: ['15mg/kg', '1g'], routes: ['intramuscular'], frequency: ['Once daily'], maxDaily: '1g', renalAdjust: true },
        { name: 'Neomycin', genericName: 'Neomycin', doses: ['500mg', '1g'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '12g', renalAdjust: true, specialInstructions: 'Not absorbed; for GI decontamination' },
        { name: 'Kanamycin', genericName: 'Kanamycin', doses: ['7.5mg/kg', '15mg/kg'], routes: ['intravenous', 'intramuscular'], frequency: ['12 hourly', '8 hourly'], maxDaily: '1.5g', renalAdjust: true },
        { name: 'Netilmicin', genericName: 'Netilmicin', doses: ['4-6mg/kg', '150mg'], routes: ['intravenous', 'intramuscular'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '7.5mg/kg', renalAdjust: true },
        { name: 'Plazomicin', genericName: 'Plazomicin', doses: ['15mg/kg'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '15mg/kg', renalAdjust: true },
      ],
    },
    {
      id: 'macrolides',
      name: 'Macrolides & Related',
      medications: [
        { name: 'Azithromycin', genericName: 'Azithromycin', doses: ['250mg', '500mg', '1g', '2g'], routes: ['oral', 'intravenous'], frequency: ['Once daily', 'Single dose'], maxDaily: '2g', renalAdjust: false },
        { name: 'Clarithromycin', genericName: 'Clarithromycin', doses: ['250mg', '500mg', '500mg XL'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', 'Once daily XL'], maxDaily: '1g', renalAdjust: true },
        { name: 'Erythromycin', genericName: 'Erythromycin', doses: ['250mg', '500mg', '1g IV'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '12 hourly'], maxDaily: '4g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Roxithromycin', genericName: 'Roxithromycin', doses: ['150mg', '300mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Spiramycin', genericName: 'Spiramycin', doses: ['1g', '1.5g', '3MU'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '9MU', renalAdjust: false },
        { name: 'Fidaxomicin', genericName: 'Fidaxomicin', doses: ['200mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: false },
        // Lincosamides
        { name: 'Clindamycin', genericName: 'Clindamycin', doses: ['150mg', '300mg', '450mg', '600mg', '900mg IV'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4.8g', renalAdjust: false },
        { name: 'Lincomycin', genericName: 'Lincomycin', doses: ['500mg', '600mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '8g', renalAdjust: true },
      ],
    },
    {
      id: 'fluoroquinolones',
      name: 'Fluoroquinolones',
      medications: [
        { name: 'Ciprofloxacin', genericName: 'Ciprofloxacin', doses: ['250mg', '500mg', '750mg', '200mg IV', '400mg IV'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '8 hourly'], maxDaily: '1.5g oral, 1.2g IV', renalAdjust: true },
        { name: 'Levofloxacin', genericName: 'Levofloxacin', doses: ['250mg', '500mg', '750mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '750mg', renalAdjust: true },
        { name: 'Moxifloxacin', genericName: 'Moxifloxacin', doses: ['400mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Ofloxacin', genericName: 'Ofloxacin', doses: ['200mg', '400mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '800mg', renalAdjust: true },
        { name: 'Norfloxacin', genericName: 'Norfloxacin', doses: ['400mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '800mg', renalAdjust: true },
        { name: 'Gemifloxacin', genericName: 'Gemifloxacin', doses: ['320mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '320mg', renalAdjust: true },
        { name: 'Delafloxacin', genericName: 'Delafloxacin', doses: ['300mg IV', '450mg oral'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '900mg oral', renalAdjust: true },
        { name: 'Nalidixic Acid', genericName: 'Nalidixic Acid', doses: ['500mg', '1g'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '4g', renalAdjust: true },
      ],
    },
    {
      id: 'tetracyclines',
      name: 'Tetracyclines & Glycylcyclines',
      medications: [
        { name: 'Doxycycline', genericName: 'Doxycycline', doses: ['50mg', '100mg', '200mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Tetracycline', genericName: 'Tetracycline', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '2g', renalAdjust: true },
        { name: 'Minocycline', genericName: 'Minocycline', doses: ['50mg', '100mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Oxytetracycline', genericName: 'Oxytetracycline', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '2g', renalAdjust: true },
        { name: 'Demeclocycline', genericName: 'Demeclocycline', doses: ['150mg', '300mg'], routes: ['oral'], frequency: ['6 hourly', '12 hourly'], maxDaily: '1.2g', renalAdjust: true },
        { name: 'Tigecycline', genericName: 'Tigecycline', doses: ['50mg', '100mg loading'], routes: ['intravenous'], frequency: ['12 hourly'], maxDaily: '100mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Eravacycline', genericName: 'Eravacycline', doses: ['1mg/kg'], routes: ['intravenous'], frequency: ['12 hourly'], maxDaily: '2mg/kg', renalAdjust: false },
        { name: 'Omadacycline', genericName: 'Omadacycline', doses: ['100mg IV', '300mg oral'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Sarecycline', genericName: 'Sarecycline', doses: ['60mg', '100mg', '150mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '150mg', renalAdjust: false },
      ],
    },
    {
      id: 'glycopeptides_lipopeptides',
      name: 'Glycopeptides & Lipopeptides',
      medications: [
        { name: 'Vancomycin', genericName: 'Vancomycin', doses: ['125mg oral', '250mg oral', '500mg IV', '1g IV', '1.5g IV', '15-20mg/kg IV'], routes: ['oral', 'intravenous'], frequency: ['6 hourly oral', '8 hourly IV', '12 hourly IV'], maxDaily: '4g', renalAdjust: true },
        { name: 'Teicoplanin', genericName: 'Teicoplanin', doses: ['200mg', '400mg', '6mg/kg', '12mg/kg loading'], routes: ['intravenous', 'intramuscular'], frequency: ['Once daily', '12 hourly loading'], maxDaily: '800mg', renalAdjust: true },
        { name: 'Dalbavancin', genericName: 'Dalbavancin', doses: ['1g', '1.5g'], routes: ['intravenous'], frequency: ['Once weekly x2', 'Single dose 1.5g'], maxDaily: '1.5g single', renalAdjust: true },
        { name: 'Oritavancin', genericName: 'Oritavancin', doses: ['1200mg'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '1200mg', renalAdjust: false },
        { name: 'Telavancin', genericName: 'Telavancin', doses: ['10mg/kg'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '10mg/kg', renalAdjust: true },
        { name: 'Daptomycin', genericName: 'Daptomycin', doses: ['4mg/kg', '6mg/kg', '8mg/kg', '10mg/kg', '12mg/kg'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '12mg/kg', renalAdjust: true },
      ],
    },
    {
      id: 'oxazolidinones_others',
      name: 'Oxazolidinones & Other Antibacterials',
      medications: [
        { name: 'Linezolid', genericName: 'Linezolid', doses: ['400mg', '600mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '1.2g', renalAdjust: false },
        { name: 'Tedizolid', genericName: 'Tedizolid', doses: ['200mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Chloramphenicol', genericName: 'Chloramphenicol', doses: ['250mg', '500mg', '1g IV'], routes: ['oral', 'intravenous'], frequency: ['6 hourly'], maxDaily: '4g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Metronidazole', genericName: 'Metronidazole', doses: ['200mg', '400mg', '500mg', '500mg IV'], routes: ['oral', 'intravenous', 'rectal'], frequency: ['8 hourly', '12 hourly'], maxDaily: '4g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Tinidazole', genericName: 'Tinidazole', doses: ['500mg', '1g', '2g'], routes: ['oral'], frequency: ['Once daily', '12 hourly', 'Single dose'], maxDaily: '2g', renalAdjust: false },
        { name: 'Nitrofurantoin', genericName: 'Nitrofurantoin', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['6 hourly', '12 hourly MR'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Fosfomycin', genericName: 'Fosfomycin', doses: ['3g sachet', '2g IV', '4g IV'], routes: ['oral', 'intravenous'], frequency: ['Single dose oral', '8 hourly IV'], maxDaily: '24g IV', renalAdjust: true },
        { name: 'Trimethoprim', genericName: 'Trimethoprim', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Trimethoprim/Sulfamethoxazole', genericName: 'Co-trimoxazole', doses: ['480mg', '960mg', '80/400mg IV', '160/800mg IV'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '6 hourly for PCP'], maxDaily: '2.88g', renalAdjust: true },
        { name: 'Sulfadiazine', genericName: 'Sulfadiazine', doses: ['500mg', '1g'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '8g', renalAdjust: true },
        { name: 'Colistin (Colistimethate)', genericName: 'Colistimethate Sodium', doses: ['1MU', '2MU', '3MU', '9MU loading'], routes: ['intravenous', 'nebulization'], frequency: ['8 hourly', '12 hourly'], maxDaily: '9MU', renalAdjust: true },
        { name: 'Polymyxin B', genericName: 'Polymyxin B', doses: ['15000-25000 units/kg/day'], routes: ['intravenous'], frequency: ['12 hourly'], maxDaily: '25000 units/kg', renalAdjust: true },
        { name: 'Rifampicin', genericName: 'Rifampicin', doses: ['150mg', '300mg', '450mg', '600mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '1.2g', renalAdjust: false, hepaticAdjust: true },
        { name: 'Fusidic Acid', genericName: 'Fusidic Acid', doses: ['250mg', '500mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly'], maxDaily: '1.5g', renalAdjust: false },
        { name: 'Mupirocin', genericName: 'Mupirocin', doses: ['2% ointment', '2% nasal'], routes: ['topical', 'intranasal'], frequency: ['8 hourly', '12 hourly nasal'], maxDaily: '3 applications', renalAdjust: false },
      ],
    },
    {
      id: 'antifungals',
      name: 'Antifungals',
      medications: [
        // Azoles
        { name: 'Fluconazole', genericName: 'Fluconazole', doses: ['50mg', '100mg', '150mg', '200mg', '400mg', '800mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', 'Single dose 150mg'], maxDaily: '800mg', renalAdjust: true },
        { name: 'Itraconazole', genericName: 'Itraconazole', doses: ['100mg', '200mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Voriconazole', genericName: 'Voriconazole', doses: ['50mg', '200mg', '6mg/kg loading', '4mg/kg IV'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '8mg/kg IV', renalAdjust: true },
        { name: 'Posaconazole', genericName: 'Posaconazole', doses: ['100mg', '200mg', '300mg DR'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '8 hourly suspension'], maxDaily: '800mg', renalAdjust: false },
        { name: 'Isavuconazole', genericName: 'Isavuconazole', doses: ['200mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly loading then once daily'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Ketoconazole', genericName: 'Ketoconazole', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Miconazole', genericName: 'Miconazole', doses: ['2% cream', '2% gel', '100mg pessary'], routes: ['topical', 'vaginal', 'oral gel'], frequency: ['12 hourly', '6 hourly gel'], maxDaily: 'As directed', renalAdjust: false },
        { name: 'Clotrimazole', genericName: 'Clotrimazole', doses: ['1% cream', '10mg troche', '100mg pessary', '500mg pessary'], routes: ['topical', 'vaginal', 'oral'], frequency: ['12 hourly', '5 times daily troche'], maxDaily: 'As directed', renalAdjust: false },
        // Echinocandins
        { name: 'Caspofungin', genericName: 'Caspofungin', doses: ['50mg', '70mg loading'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '70mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Micafungin', genericName: 'Micafungin', doses: ['50mg', '100mg', '150mg'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Anidulafungin', genericName: 'Anidulafungin', doses: ['100mg', '200mg loading'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: false },
        // Polyenes
        { name: 'Amphotericin B (Conventional)', genericName: 'Amphotericin B Deoxycholate', doses: ['0.5-1mg/kg'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '1.5mg/kg', renalAdjust: true },
        { name: 'Amphotericin B Liposomal', genericName: 'AmBisome', doses: ['3mg/kg', '5mg/kg'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '5mg/kg', renalAdjust: false },
        { name: 'Amphotericin B Lipid Complex', genericName: 'Abelcet', doses: ['5mg/kg'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '5mg/kg', renalAdjust: false },
        { name: 'Nystatin', genericName: 'Nystatin', doses: ['100000 units', '500000 units', '100000 units/ml suspension'], routes: ['oral', 'topical', 'vaginal'], frequency: ['6 hourly', '8 hourly'], maxDaily: '6MU', renalAdjust: false },
        // Others
        { name: 'Flucytosine', genericName: 'Flucytosine', doses: ['25mg/kg', '37.5mg/kg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly'], maxDaily: '200mg/kg', renalAdjust: true },
        { name: 'Terbinafine', genericName: 'Terbinafine', doses: ['250mg', '1% cream'], routes: ['oral', 'topical'], frequency: ['Once daily'], maxDaily: '250mg', renalAdjust: true },
        { name: 'Griseofulvin', genericName: 'Griseofulvin', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '1g', renalAdjust: false },
      ],
    },
    {
      id: 'antivirals',
      name: 'Antivirals',
      medications: [
        // Herpes Viruses
        { name: 'Aciclovir', genericName: 'Acyclovir', doses: ['200mg', '400mg', '800mg', '5mg/kg IV', '10mg/kg IV'], routes: ['oral', 'intravenous', 'topical'], frequency: ['5 times daily', '8 hourly IV'], maxDaily: '4g oral', renalAdjust: true },
        { name: 'Valaciclovir', genericName: 'Valacyclovir', doses: ['500mg', '1g'], routes: ['oral'], frequency: ['12 hourly', '8 hourly', 'Once daily'], maxDaily: '3g', renalAdjust: true },
        { name: 'Famciclovir', genericName: 'Famciclovir', doses: ['125mg', '250mg', '500mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '1.5g', renalAdjust: true },
        { name: 'Ganciclovir', genericName: 'Ganciclovir', doses: ['5mg/kg', '1g oral'], routes: ['intravenous', 'oral'], frequency: ['12 hourly IV', '8 hourly oral'], maxDaily: '10mg/kg IV', renalAdjust: true },
        { name: 'Valganciclovir', genericName: 'Valganciclovir', doses: ['450mg', '900mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '1.8g', renalAdjust: true },
        { name: 'Foscarnet', genericName: 'Foscarnet', doses: ['60mg/kg', '90mg/kg', '120mg/kg'], routes: ['intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '180mg/kg', renalAdjust: true },
        { name: 'Cidofovir', genericName: 'Cidofovir', doses: ['5mg/kg'], routes: ['intravenous'], frequency: ['Weekly then every 2 weeks'], maxDaily: '5mg/kg', renalAdjust: true },
        // Influenza
        { name: 'Oseltamivir', genericName: 'Oseltamivir', doses: ['30mg', '45mg', '75mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '150mg', renalAdjust: true },
        { name: 'Zanamivir', genericName: 'Zanamivir', doses: ['10mg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Peramivir', genericName: 'Peramivir', doses: ['600mg'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '600mg', renalAdjust: true },
        { name: 'Baloxavir', genericName: 'Baloxavir Marboxil', doses: ['40mg', '80mg'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Amantadine', genericName: 'Amantadine', doses: ['100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Rimantadine', genericName: 'Rimantadine', doses: ['100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: true },
        // Hepatitis B
        { name: 'Entecavir', genericName: 'Entecavir', doses: ['0.5mg', '1mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1mg', renalAdjust: true },
        { name: 'Tenofovir DF', genericName: 'Tenofovir Disoproxil', doses: ['245mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Tenofovir AF', genericName: 'Tenofovir Alafenamide', doses: ['25mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '25mg', renalAdjust: true },
        { name: 'Lamivudine (HBV)', genericName: 'Lamivudine', doses: ['100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Adefovir', genericName: 'Adefovir Dipivoxil', doses: ['10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Telbivudine', genericName: 'Telbivudine', doses: ['600mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '600mg', renalAdjust: true },
        // Hepatitis C - Direct Acting Antivirals
        { name: 'Sofosbuvir', genericName: 'Sofosbuvir', doses: ['400mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Sofosbuvir/Ledipasvir', genericName: 'Harvoni', doses: ['400/90mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        { name: 'Sofosbuvir/Velpatasvir', genericName: 'Epclusa', doses: ['400/100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        { name: 'Sofosbuvir/Velpatasvir/Voxilaprevir', genericName: 'Vosevi', doses: ['400/100/100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        { name: 'Glecaprevir/Pibrentasvir', genericName: 'Mavyret', doses: ['100/40mg x3'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '3 tablets', renalAdjust: false },
        { name: 'Daclatasvir', genericName: 'Daclatasvir', doses: ['30mg', '60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Ribavirin', genericName: 'Ribavirin', doses: ['200mg', '400mg', '600mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1.4g', renalAdjust: true },
        // Other Antivirals
        { name: 'Interferon alfa-2a', genericName: 'Peginterferon alfa-2a', doses: ['180mcg'], routes: ['subcutaneous'], frequency: ['Once weekly'], maxDaily: '180mcg/week', renalAdjust: true },
        { name: 'Interferon alfa-2b', genericName: 'Peginterferon alfa-2b', doses: ['1.5mcg/kg'], routes: ['subcutaneous'], frequency: ['Once weekly'], maxDaily: '1.5mcg/kg/week', renalAdjust: true },
      ],
    },
    {
      id: 'antiretrovirals',
      name: 'Antiretrovirals (HIV)',
      medications: [
        // NRTIs
        { name: 'Tenofovir/Emtricitabine', genericName: 'Truvada', doses: ['300/200mg', '25/200mg TAF'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        { name: 'Abacavir/Lamivudine', genericName: 'Epzicom/Kivexa', doses: ['600/300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        { name: 'Lamivudine', genericName: 'Lamivudine', doses: ['150mg', '300mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Emtricitabine', genericName: 'Emtricitabine', doses: ['200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Abacavir', genericName: 'Abacavir', doses: ['300mg', '600mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '600mg', renalAdjust: false },
        { name: 'Zidovudine', genericName: 'Zidovudine/AZT', doses: ['100mg', '250mg', '300mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '8 hourly'], maxDaily: '600mg', renalAdjust: true },
        { name: 'Stavudine', genericName: 'Stavudine', doses: ['15mg', '20mg', '30mg', '40mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '80mg', renalAdjust: true },
        { name: 'Didanosine', genericName: 'Didanosine', doses: ['125mg', '200mg', '250mg', '400mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '400mg', renalAdjust: true },
        // NNRTIs
        { name: 'Efavirenz', genericName: 'Efavirenz', doses: ['50mg', '200mg', '600mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '600mg', renalAdjust: false },
        { name: 'Nevirapine', genericName: 'Nevirapine', doses: ['200mg', '400mg XR'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Rilpivirine', genericName: 'Rilpivirine', doses: ['25mg'], routes: ['oral'], frequency: ['Once daily with food'], maxDaily: '25mg', renalAdjust: false },
        { name: 'Etravirine', genericName: 'Etravirine', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Doravirine', genericName: 'Doravirine', doses: ['100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: false },
        // Protease Inhibitors
        { name: 'Atazanavir', genericName: 'Atazanavir', doses: ['150mg', '200mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Darunavir', genericName: 'Darunavir', doses: ['400mg', '600mg', '800mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '1200mg', renalAdjust: false },
        { name: 'Lopinavir/Ritonavir', genericName: 'Kaletra', doses: ['200/50mg', '400/100mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '800/200mg', renalAdjust: false },
        { name: 'Ritonavir', genericName: 'Ritonavir', doses: ['100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '600mg', renalAdjust: false },
        { name: 'Cobicistat', genericName: 'Cobicistat', doses: ['150mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '150mg', renalAdjust: false },
        // Integrase Inhibitors
        { name: 'Dolutegravir', genericName: 'Dolutegravir', doses: ['50mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Raltegravir', genericName: 'Raltegravir', doses: ['400mg', '600mg HD'], routes: ['oral'], frequency: ['12 hourly', 'Once daily HD'], maxDaily: '1200mg', renalAdjust: false },
        { name: 'Elvitegravir', genericName: 'Elvitegravir', doses: ['85mg', '150mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Bictegravir', genericName: 'Bictegravir', doses: ['50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mg', renalAdjust: false },
        { name: 'Cabotegravir', genericName: 'Cabotegravir', doses: ['30mg oral', '400mg IM', '600mg IM'], routes: ['oral', 'intramuscular'], frequency: ['Once daily oral', 'Monthly/bimonthly IM'], maxDaily: '600mg IM', renalAdjust: false },
        // Entry/Fusion Inhibitors
        { name: 'Maraviroc', genericName: 'Maraviroc', doses: ['150mg', '300mg', '600mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1200mg', renalAdjust: true },
        { name: 'Enfuvirtide', genericName: 'Enfuvirtide', doses: ['90mg'], routes: ['subcutaneous'], frequency: ['12 hourly'], maxDaily: '180mg', renalAdjust: false },
        { name: 'Ibalizumab', genericName: 'Ibalizumab', doses: ['2000mg loading', '800mg'], routes: ['intravenous'], frequency: ['Every 2 weeks'], maxDaily: '800mg q2w', renalAdjust: false },
        { name: 'Fostemsavir', genericName: 'Fostemsavir', doses: ['600mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1.2g', renalAdjust: false },
        // Fixed Dose Combinations
        { name: 'Biktarvy', genericName: 'Bictegravir/Emtricitabine/TAF', doses: ['50/200/25mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        { name: 'Triumeq', genericName: 'Dolutegravir/Abacavir/Lamivudine', doses: ['50/600/300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
        { name: 'Genvoya', genericName: 'Elvitegravir/Cobicistat/Emtricitabine/TAF', doses: ['150/150/200/10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        { name: 'Symtuza', genericName: 'Darunavir/Cobicistat/Emtricitabine/TAF', doses: ['800/150/200/10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        { name: 'Delstrigo', genericName: 'Doravirine/Lamivudine/TDF', doses: ['100/300/300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        { name: 'Cabenuva', genericName: 'Cabotegravir/Rilpivirine LA', doses: ['400/600mg or 600/900mg'], routes: ['intramuscular'], frequency: ['Monthly or bimonthly'], maxDaily: 'Per schedule', renalAdjust: false },
      ],
    },
    {
      id: 'antimalarials',
      name: 'Antimalarials',
      medications: [
        { name: 'Artemether/Lumefantrine', genericName: 'Coartem', doses: ['20/120mg x4', '20/120mg x6'], routes: ['oral'], frequency: ['0, 8, 24, 36, 48, 60 hours'], maxDaily: '480/2880mg course', renalAdjust: false },
        { name: 'Artesunate', genericName: 'Artesunate', doses: ['2.4mg/kg', '60mg', '120mg'], routes: ['intravenous', 'intramuscular', 'rectal'], frequency: ['0, 12, 24 hours then daily'], maxDaily: '2.4mg/kg x3 first day', renalAdjust: false },
        { name: 'Artemether', genericName: 'Artemether', doses: ['3.2mg/kg loading', '1.6mg/kg'], routes: ['intramuscular'], frequency: ['Loading then daily'], maxDaily: '3.2mg/kg', renalAdjust: false },
        { name: 'Dihydroartemisinin/Piperaquine', genericName: 'Eurartesim', doses: ['40/320mg'], routes: ['oral'], frequency: ['Once daily x 3 days'], maxDaily: '4 tablets', renalAdjust: false },
        { name: 'Artesunate/Amodiaquine', genericName: 'ASAQ', doses: ['25/67.5mg', '50/135mg', '100/270mg'], routes: ['oral'], frequency: ['Once daily x 3 days'], maxDaily: '200/540mg', renalAdjust: false },
        { name: 'Artesunate/Mefloquine', genericName: 'ASMQ', doses: ['100/220mg'], routes: ['oral'], frequency: ['Once daily x 3 days'], maxDaily: '200/440mg', renalAdjust: false },
        { name: 'Artesunate/Pyronaridine', genericName: 'Pyramax', doses: ['60/180mg'], routes: ['oral'], frequency: ['Once daily x 3 days'], maxDaily: '4 tablets', renalAdjust: false },
        { name: 'Quinine', genericName: 'Quinine Sulphate/Dihydrochloride', doses: ['300mg', '600mg', '20mg/kg loading IV', '10mg/kg IV'], routes: ['oral', 'intravenous'], frequency: ['8 hourly'], maxDaily: '1.8g oral', renalAdjust: true },
        { name: 'Chloroquine', genericName: 'Chloroquine', doses: ['150mg base', '300mg base', '10mg/kg'], routes: ['oral'], frequency: ['Stat, 6h, 24h, 48h'], maxDaily: '25mg base/kg total', renalAdjust: true },
        { name: 'Primaquine', genericName: 'Primaquine', doses: ['7.5mg', '15mg', '30mg', '45mg'], routes: ['oral'], frequency: ['Once daily x 14 days'], maxDaily: '45mg', renalAdjust: true },
        { name: 'Amodiaquine', genericName: 'Amodiaquine', doses: ['153mg base', '200mg'], routes: ['oral'], frequency: ['Once daily x 3 days'], maxDaily: '10mg/kg/day', renalAdjust: false },
        { name: 'Mefloquine', genericName: 'Mefloquine', doses: ['250mg'], routes: ['oral'], frequency: ['Weekly prophylaxis', 'Treatment split dose'], maxDaily: '1.25g treatment', renalAdjust: false },
        { name: 'Atovaquone/Proguanil', genericName: 'Malarone', doses: ['250/100mg', '62.5/25mg paed'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '250/100mg', renalAdjust: true },
        { name: 'Doxycycline (Malaria)', genericName: 'Doxycycline', doses: ['100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Sulfadoxine/Pyrimethamine', genericName: 'Fansidar', doses: ['500/25mg'], routes: ['oral'], frequency: ['Single dose treatment', 'Monthly IPTp'], maxDaily: '3 tablets single dose', renalAdjust: true },
        { name: 'Proguanil', genericName: 'Proguanil', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Pyrimethamine', genericName: 'Pyrimethamine', doses: ['25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['Once daily', 'Weekly'], maxDaily: '75mg', renalAdjust: false },
        { name: 'Tafenoquine', genericName: 'Tafenoquine', doses: ['100mg', '300mg'], routes: ['oral'], frequency: ['Weekly prophylaxis', 'Single dose cure'], maxDaily: '300mg', renalAdjust: false },
      ],
    },
    {
      id: 'antituberculous',
      name: 'Antituberculous Drugs',
      medications: [
        // First Line
        { name: 'Isoniazid', genericName: 'Isoniazid', doses: ['100mg', '300mg', '5mg/kg', '10mg/kg'], routes: ['oral', 'intramuscular'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Rifampicin (TB)', genericName: 'Rifampicin', doses: ['150mg', '300mg', '450mg', '600mg', '10mg/kg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '600mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Pyrazinamide', genericName: 'Pyrazinamide', doses: ['400mg', '500mg', '25mg/kg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2g', renalAdjust: true },
        { name: 'Ethambutol', genericName: 'Ethambutol', doses: ['100mg', '400mg', '15mg/kg', '25mg/kg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '25mg/kg', renalAdjust: true },
        { name: 'RHZE (Fixed Dose)', genericName: 'Rifampicin/Isoniazid/Pyrazinamide/Ethambutol', doses: ['150/75/400/275mg'], routes: ['oral'], frequency: ['Once daily weight-based'], maxDaily: '5 tablets', renalAdjust: true },
        { name: 'RH (Fixed Dose)', genericName: 'Rifampicin/Isoniazid', doses: ['150/75mg', '300/150mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: 'Weight-based', renalAdjust: false },
        // Second Line
        { name: 'Streptomycin (TB)', genericName: 'Streptomycin', doses: ['15mg/kg', '750mg', '1g'], routes: ['intramuscular'], frequency: ['Once daily'], maxDaily: '1g', renalAdjust: true },
        { name: 'Amikacin (TB)', genericName: 'Amikacin', doses: ['15mg/kg', '750mg', '1g'], routes: ['intravenous', 'intramuscular'], frequency: ['Once daily'], maxDaily: '1g', renalAdjust: true },
        { name: 'Kanamycin (TB)', genericName: 'Kanamycin', doses: ['15mg/kg', '1g'], routes: ['intramuscular'], frequency: ['Once daily'], maxDaily: '1g', renalAdjust: true },
        { name: 'Capreomycin', genericName: 'Capreomycin', doses: ['15mg/kg', '1g'], routes: ['intramuscular'], frequency: ['Once daily'], maxDaily: '1g', renalAdjust: true },
        { name: 'Levofloxacin (TB)', genericName: 'Levofloxacin', doses: ['500mg', '750mg', '1g'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1g', renalAdjust: true },
        { name: 'Moxifloxacin (TB)', genericName: 'Moxifloxacin', doses: ['400mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Ethionamide', genericName: 'Ethionamide', doses: ['250mg', '500mg', '15mg/kg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '1g', renalAdjust: true },
        { name: 'Prothionamide', genericName: 'Prothionamide', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '1g', renalAdjust: true },
        { name: 'Cycloserine', genericName: 'Cycloserine', doses: ['250mg', '500mg', '10-15mg/kg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1g', renalAdjust: true },
        { name: 'Terizidone', genericName: 'Terizidone', doses: ['300mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '900mg', renalAdjust: true },
        { name: 'Para-aminosalicylic Acid', genericName: 'PAS', doses: ['4g', '8g'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '12g', renalAdjust: true },
        { name: 'Bedaquiline', genericName: 'Bedaquiline', doses: ['400mg loading', '200mg'], routes: ['oral'], frequency: ['Once daily x 2 weeks then 3x weekly'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Delamanid', genericName: 'Delamanid', doses: ['100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Pretomanid', genericName: 'Pretomanid', doses: ['200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Linezolid (TB)', genericName: 'Linezolid', doses: ['300mg', '600mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '600mg', renalAdjust: false },
        { name: 'Clofazimine', genericName: 'Clofazimine', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Rifapentine', genericName: 'Rifapentine', doses: ['150mg', '600mg', '900mg'], routes: ['oral'], frequency: ['Once weekly', 'Once daily'], maxDaily: '900mg', renalAdjust: false },
        { name: 'Rifabutin', genericName: 'Rifabutin', doses: ['150mg', '300mg', '450mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '600mg', renalAdjust: true },
      ],
    },
    {
      id: 'antiparasitics',
      name: 'Antiparasitic Drugs',
      medications: [
        // Anthelmintics
        { name: 'Albendazole', genericName: 'Albendazole', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['Single dose', '12 hourly'], maxDaily: '800mg', renalAdjust: false },
        { name: 'Mebendazole', genericName: 'Mebendazole', doses: ['100mg', '500mg'], routes: ['oral'], frequency: ['Single dose', '12 hourly x 3 days'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Praziquantel', genericName: 'Praziquantel', doses: ['150mg', '600mg', '20mg/kg', '40mg/kg', '60mg/kg'], routes: ['oral'], frequency: ['Single dose', '4-6 hourly x 1 day'], maxDaily: '60mg/kg', renalAdjust: false },
        { name: 'Ivermectin', genericName: 'Ivermectin', doses: ['3mg', '6mg', '12mg', '200mcg/kg'], routes: ['oral'], frequency: ['Single dose', '12 monthly'], maxDaily: '400mcg/kg', renalAdjust: false },
        { name: 'Pyrantel Pamoate', genericName: 'Pyrantel', doses: ['125mg', '250mg', '10mg/kg'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '1g', renalAdjust: false },
        { name: 'Niclosamide', genericName: 'Niclosamide', doses: ['500mg', '1g', '2g'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '2g', renalAdjust: false },
        { name: 'Levamisole', genericName: 'Levamisole', doses: ['50mg', '150mg', '2.5mg/kg'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Diethylcarbamazine', genericName: 'DEC', doses: ['50mg', '100mg', '6mg/kg'], routes: ['oral'], frequency: ['8 hourly', 'Once daily'], maxDaily: '6mg/kg', renalAdjust: true },
        { name: 'Triclabendazole', genericName: 'Triclabendazole', doses: ['250mg', '10mg/kg'], routes: ['oral'], frequency: ['Single dose or 2 doses 12 hours apart'], maxDaily: '20mg/kg', renalAdjust: false },
        // Antiprotozoals
        { name: 'Metronidazole (Antiparasitic)', genericName: 'Metronidazole', doses: ['200mg', '400mg', '500mg', '750mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly'], maxDaily: '2.25g', renalAdjust: false },
        { name: 'Tinidazole (Antiparasitic)', genericName: 'Tinidazole', doses: ['500mg', '1g', '2g'], routes: ['oral'], frequency: ['Single dose', 'Once daily x 3 days'], maxDaily: '2g', renalAdjust: false },
        { name: 'Secnidazole', genericName: 'Secnidazole', doses: ['1g', '2g'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '2g', renalAdjust: false },
        { name: 'Ornidazole', genericName: 'Ornidazole', doses: ['500mg', '1g', '1.5g'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '1.5g', renalAdjust: false },
        { name: 'Diloxanide Furoate', genericName: 'Diloxanide', doses: ['500mg'], routes: ['oral'], frequency: ['8 hourly x 10 days'], maxDaily: '1.5g', renalAdjust: false },
        { name: 'Paromomycin', genericName: 'Paromomycin', doses: ['500mg', '25-35mg/kg'], routes: ['oral'], frequency: ['8 hourly x 7 days'], maxDaily: '3g', renalAdjust: false },
        { name: 'Nitazoxanide', genericName: 'Nitazoxanide', doses: ['100mg', '200mg', '500mg'], routes: ['oral'], frequency: ['12 hourly x 3 days'], maxDaily: '1g', renalAdjust: false },
        { name: 'Pentamidine', genericName: 'Pentamidine', doses: ['4mg/kg', '300mg'], routes: ['intravenous', 'intramuscular', 'nebulization'], frequency: ['Once daily', 'Every 4 weeks nebulized'], maxDaily: '4mg/kg', renalAdjust: true },
        { name: 'Suramin', genericName: 'Suramin', doses: ['1g'], routes: ['intravenous'], frequency: ['Weekly x 5'], maxDaily: '1g', renalAdjust: true },
        { name: 'Melarsoprol', genericName: 'Melarsoprol', doses: ['2.2mg/kg', '3.6mg/kg'], routes: ['intravenous'], frequency: ['Once daily x 10 days'], maxDaily: '180mg', renalAdjust: false },
        { name: 'Eflornithine', genericName: 'Eflornithine', doses: ['100mg/kg', '150mg/kg'], routes: ['intravenous'], frequency: ['6 hourly x 14 days'], maxDaily: '400mg/kg', renalAdjust: true },
        { name: 'Nifurtimox', genericName: 'Nifurtimox', doses: ['8-10mg/kg'], routes: ['oral'], frequency: ['8 hourly x 90-120 days'], maxDaily: '15mg/kg', renalAdjust: false },
        { name: 'Benznidazole', genericName: 'Benznidazole', doses: ['5-7mg/kg'], routes: ['oral'], frequency: ['12 hourly x 60 days'], maxDaily: '7.5mg/kg', renalAdjust: false },
        { name: 'Sodium Stibogluconate', genericName: 'Pentavalent Antimonial', doses: ['20mg Sb/kg'], routes: ['intravenous', 'intramuscular'], frequency: ['Once daily x 28 days'], maxDaily: '850mg Sb', renalAdjust: true },
        { name: 'Amphotericin B (Leishmaniasis)', genericName: 'Liposomal Amphotericin', doses: ['3mg/kg', '10mg/kg total'], routes: ['intravenous'], frequency: ['Days 1-5, then 14, 21'], maxDaily: '3mg/kg', renalAdjust: false },
        { name: 'Miltefosine', genericName: 'Miltefosine', doses: ['50mg', '2.5mg/kg'], routes: ['oral'], frequency: ['12 hourly x 28 days'], maxDaily: '150mg', renalAdjust: false },
        // Scabicides & Pediculicides
        { name: 'Permethrin', genericName: 'Permethrin', doses: ['1% lotion', '5% cream'], routes: ['topical'], frequency: ['Single application, repeat in 7 days'], maxDaily: 'Full body application', renalAdjust: false },
        { name: 'Benzyl Benzoate', genericName: 'Benzyl Benzoate', doses: ['25% emulsion'], routes: ['topical'], frequency: ['Daily x 3 days'], maxDaily: 'Full body application', renalAdjust: false },
        { name: 'Lindane', genericName: 'Lindane', doses: ['1% lotion', '1% shampoo'], routes: ['topical'], frequency: ['Single application'], maxDaily: '30ml', renalAdjust: false },
        { name: 'Malathion', genericName: 'Malathion', doses: ['0.5% lotion'], routes: ['topical'], frequency: ['Single application'], maxDaily: 'Full scalp', renalAdjust: false },
        { name: 'Ivermectin (Topical)', genericName: 'Ivermectin', doses: ['0.5% lotion', '1% cream'], routes: ['topical'], frequency: ['Single application'], maxDaily: 'Affected area', renalAdjust: false },
        { name: 'Spinosad', genericName: 'Spinosad', doses: ['0.9% suspension'], routes: ['topical'], frequency: ['Single application'], maxDaily: 'Full scalp', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 6. ENDOCRINE SYSTEM
// ============================================
export const endocrineMedications: BNFCategory = {
  id: 'endocrine',
  name: 'Endocrine System',
  subcategories: [
    {
      id: 'diabetes_insulins',
      name: 'Insulins',
      medications: [
        // Rapid-Acting Insulins
        { name: 'Insulin Lispro', genericName: 'Humalog', doses: ['100 units/ml', '200 units/ml'], routes: ['subcutaneous', 'intravenous'], frequency: ['With meals', 'Continuous infusion'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Insulin Aspart', genericName: 'NovoRapid', doses: ['100 units/ml'], routes: ['subcutaneous', 'intravenous'], frequency: ['With meals', 'Continuous infusion'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Insulin Glulisine', genericName: 'Apidra', doses: ['100 units/ml'], routes: ['subcutaneous', 'intravenous'], frequency: ['With meals'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Faster Insulin Aspart', genericName: 'Fiasp', doses: ['100 units/ml'], routes: ['subcutaneous', 'intravenous'], frequency: ['With meals'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Insulin Lispro-aabc', genericName: 'Lyumjev', doses: ['100 units/ml', '200 units/ml'], routes: ['subcutaneous'], frequency: ['With meals'], maxDaily: 'Individualized', renalAdjust: true },
        // Short-Acting Insulins
        { name: 'Regular Insulin', genericName: 'Actrapid/Humulin R', doses: ['100 units/ml'], routes: ['subcutaneous', 'intravenous', 'intramuscular'], frequency: ['30 min before meals', '8 hourly'], maxDaily: 'Individualized', renalAdjust: true },
        // Intermediate-Acting Insulins
        { name: 'Isophane Insulin (NPH)', genericName: 'Insulatard/Humulin N', doses: ['100 units/ml'], routes: ['subcutaneous'], frequency: ['Once daily', '12 hourly'], maxDaily: 'Individualized', renalAdjust: true },
        // Long-Acting Insulins
        { name: 'Insulin Glargine', genericName: 'Lantus/Basaglar', doses: ['100 units/ml', '300 units/ml Toujeo'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Insulin Detemir', genericName: 'Levemir', doses: ['100 units/ml'], routes: ['subcutaneous'], frequency: ['Once daily', '12 hourly'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Insulin Degludec', genericName: 'Tresiba', doses: ['100 units/ml', '200 units/ml'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: 'Individualized', renalAdjust: true },
        // Pre-mixed Insulins
        { name: 'Biphasic Insulin Aspart 30/70', genericName: 'NovoMix 30', doses: ['100 units/ml'], routes: ['subcutaneous'], frequency: ['With meals'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Biphasic Insulin Lispro 25/75', genericName: 'Humalog Mix 25', doses: ['100 units/ml'], routes: ['subcutaneous'], frequency: ['With meals'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Biphasic Insulin Lispro 50/50', genericName: 'Humalog Mix 50', doses: ['100 units/ml'], routes: ['subcutaneous'], frequency: ['With meals'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Biphasic Isophane 30/70', genericName: 'Mixtard 30/Humulin 70/30', doses: ['100 units/ml'], routes: ['subcutaneous'], frequency: ['Before meals'], maxDaily: 'Individualized', renalAdjust: true },
        { name: 'Insulin Degludec/Aspart', genericName: 'Ryzodeg', doses: ['100 units/ml'], routes: ['subcutaneous'], frequency: ['With main meal'], maxDaily: 'Individualized', renalAdjust: true },
        // Insulin + GLP-1 Combinations
        { name: 'Insulin Glargine/Lixisenatide', genericName: 'Soliqua', doses: ['100 units/33mcg per ml'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '60 units', renalAdjust: true },
        { name: 'Insulin Degludec/Liraglutide', genericName: 'Xultophy', doses: ['100 units/3.6mg per ml'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '50 units', renalAdjust: true },
      ],
    },
    {
      id: 'diabetes_oral',
      name: 'Oral Antidiabetics',
      medications: [
        // Biguanides
        { name: 'Metformin', genericName: 'Metformin', doses: ['500mg', '850mg', '1000mg', '500mg XR', '750mg XR', '1000mg XR'], routes: ['oral'], frequency: ['12 hourly', '8 hourly', 'Once daily XR'], maxDaily: '3g', renalAdjust: true },
        // Sulfonylureas
        { name: 'Gliclazide', genericName: 'Gliclazide', doses: ['40mg', '80mg', '30mg MR', '60mg MR'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '320mg or 120mg MR', renalAdjust: true },
        { name: 'Glimepiride', genericName: 'Glimepiride', doses: ['1mg', '2mg', '3mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '6mg', renalAdjust: true },
        { name: 'Glibenclamide', genericName: 'Glyburide', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '15mg', renalAdjust: true },
        { name: 'Glipizide', genericName: 'Glipizide', doses: ['2.5mg', '5mg', '10mg', '5mg XL', '10mg XL'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '40mg or 20mg XL', renalAdjust: true },
        { name: 'Tolbutamide', genericName: 'Tolbutamide', doses: ['500mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '2g', renalAdjust: true },
        // Meglitinides
        { name: 'Repaglinide', genericName: 'Repaglinide', doses: ['0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['With meals (up to 4x daily)'], maxDaily: '16mg', renalAdjust: true },
        { name: 'Nateglinide', genericName: 'Nateglinide', doses: ['60mg', '120mg', '180mg'], routes: ['oral'], frequency: ['With meals'], maxDaily: '540mg', renalAdjust: true },
        // Thiazolidinediones
        { name: 'Pioglitazone', genericName: 'Pioglitazone', doses: ['15mg', '30mg', '45mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '45mg', renalAdjust: false },
        // Alpha-Glucosidase Inhibitors
        { name: 'Acarbose', genericName: 'Acarbose', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['With meals'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Miglitol', genericName: 'Miglitol', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['With meals'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Voglibose', genericName: 'Voglibose', doses: ['0.2mg', '0.3mg'], routes: ['oral'], frequency: ['With meals'], maxDaily: '0.9mg', renalAdjust: true },
      ],
    },
    {
      id: 'diabetes_dpp4',
      name: 'DPP-4 Inhibitors',
      medications: [
        { name: 'Sitagliptin', genericName: 'Sitagliptin', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Saxagliptin', genericName: 'Saxagliptin', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: true },
        { name: 'Linagliptin', genericName: 'Linagliptin', doses: ['5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: false },
        { name: 'Alogliptin', genericName: 'Alogliptin', doses: ['6.25mg', '12.5mg', '25mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '25mg', renalAdjust: true },
        { name: 'Vildagliptin', genericName: 'Vildagliptin', doses: ['50mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Teneligliptin', genericName: 'Teneligliptin', doses: ['20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: false },
        // DPP-4 + Metformin Combinations
        { name: 'Sitagliptin/Metformin', genericName: 'Janumet', doses: ['50/500mg', '50/850mg', '50/1000mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '100/2000mg', renalAdjust: true },
        { name: 'Linagliptin/Metformin', genericName: 'Jentadueto', doses: ['2.5/500mg', '2.5/850mg', '2.5/1000mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '5/2000mg', renalAdjust: true },
        { name: 'Saxagliptin/Metformin', genericName: 'Kombiglyze', doses: ['2.5/500mg', '2.5/1000mg', '5/500mg', '5/1000mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '5/2000mg', renalAdjust: true },
        { name: 'Vildagliptin/Metformin', genericName: 'Galvumet', doses: ['50/500mg', '50/850mg', '50/1000mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '100/2000mg', renalAdjust: true },
      ],
    },
    {
      id: 'diabetes_sglt2',
      name: 'SGLT2 Inhibitors',
      medications: [
        { name: 'Empagliflozin', genericName: 'Empagliflozin', doses: ['10mg', '25mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '25mg', renalAdjust: true },
        { name: 'Dapagliflozin', genericName: 'Dapagliflozin', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Canagliflozin', genericName: 'Canagliflozin', doses: ['100mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Ertugliflozin', genericName: 'Ertugliflozin', doses: ['5mg', '15mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15mg', renalAdjust: true },
        { name: 'Sotagliflozin', genericName: 'Sotagliflozin', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '400mg', renalAdjust: true },
        // SGLT2 + Metformin Combinations
        { name: 'Empagliflozin/Metformin', genericName: 'Synjardy', doses: ['5/500mg', '5/1000mg', '12.5/500mg', '12.5/1000mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '25/2000mg', renalAdjust: true },
        { name: 'Dapagliflozin/Metformin', genericName: 'Xigduo', doses: ['5/850mg', '5/1000mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '10/2000mg', renalAdjust: true },
        { name: 'Canagliflozin/Metformin', genericName: 'Invokamet', doses: ['50/500mg', '50/1000mg', '150/500mg', '150/1000mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '300/2000mg', renalAdjust: true },
        // Triple Combinations
        { name: 'Empagliflozin/Linagliptin', genericName: 'Glyxambi', doses: ['10/5mg', '25/5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '25/5mg', renalAdjust: true },
        { name: 'Dapagliflozin/Saxagliptin', genericName: 'Qtern', doses: ['10/5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10/5mg', renalAdjust: true },
        { name: 'Ertugliflozin/Sitagliptin', genericName: 'Steglujan', doses: ['5/100mg', '15/100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15/100mg', renalAdjust: true },
      ],
    },
    {
      id: 'diabetes_glp1',
      name: 'GLP-1 Receptor Agonists',
      medications: [
        { name: 'Liraglutide', genericName: 'Victoza', doses: ['0.6mg', '1.2mg', '1.8mg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '1.8mg', renalAdjust: true },
        { name: 'Semaglutide (SC)', genericName: 'Ozempic', doses: ['0.25mg', '0.5mg', '1mg', '2mg'], routes: ['subcutaneous'], frequency: ['Once weekly'], maxDaily: '2mg/week', renalAdjust: true },
        { name: 'Semaglutide (Oral)', genericName: 'Rybelsus', doses: ['3mg', '7mg', '14mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '14mg', renalAdjust: true },
        { name: 'Dulaglutide', genericName: 'Trulicity', doses: ['0.75mg', '1.5mg', '3mg', '4.5mg'], routes: ['subcutaneous'], frequency: ['Once weekly'], maxDaily: '4.5mg/week', renalAdjust: true },
        { name: 'Exenatide', genericName: 'Byetta', doses: ['5mcg', '10mcg'], routes: ['subcutaneous'], frequency: ['12 hourly'], maxDaily: '20mcg', renalAdjust: true },
        { name: 'Exenatide ER', genericName: 'Bydureon', doses: ['2mg'], routes: ['subcutaneous'], frequency: ['Once weekly'], maxDaily: '2mg/week', renalAdjust: true },
        { name: 'Lixisenatide', genericName: 'Lyxumia', doses: ['10mcg', '20mcg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '20mcg', renalAdjust: true },
        { name: 'Tirzepatide', genericName: 'Mounjaro', doses: ['2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'], routes: ['subcutaneous'], frequency: ['Once weekly'], maxDaily: '15mg/week', renalAdjust: true },
        // GLP-1 for Obesity
        { name: 'Liraglutide (Obesity)', genericName: 'Saxenda', doses: ['0.6mg', '1.2mg', '1.8mg', '2.4mg', '3mg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '3mg', renalAdjust: true },
        { name: 'Semaglutide (Obesity)', genericName: 'Wegovy', doses: ['0.25mg', '0.5mg', '1mg', '1.7mg', '2.4mg'], routes: ['subcutaneous'], frequency: ['Once weekly'], maxDaily: '2.4mg/week', renalAdjust: true },
      ],
    },
    {
      id: 'diabetes_other',
      name: 'Other Antidiabetic Agents',
      medications: [
        // Amylin Analogues
        { name: 'Pramlintide', genericName: 'Pramlintide', doses: ['15mcg', '30mcg', '45mcg', '60mcg', '120mcg'], routes: ['subcutaneous'], frequency: ['With meals'], maxDaily: '360mcg', renalAdjust: false },
        // Dopamine Agonists
        { name: 'Bromocriptine (Diabetes)', genericName: 'Bromocriptine QR', doses: ['0.8mg', '1.6mg', '2.4mg', '3.2mg', '4.8mg'], routes: ['oral'], frequency: ['Once daily morning'], maxDaily: '4.8mg', renalAdjust: false },
        // Bile Acid Sequestrants
        { name: 'Colesevelam (Diabetes)', genericName: 'Colesevelam', doses: ['625mg', '1.875g', '3.75g'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '3.75g', renalAdjust: false },
        // Glucagon
        { name: 'Glucagon', genericName: 'Glucagon', doses: ['0.5mg', '1mg'], routes: ['subcutaneous', 'intramuscular', 'intravenous'], frequency: ['As needed for hypoglycemia'], maxDaily: '1mg', renalAdjust: false },
        { name: 'Glucagon Nasal', genericName: 'Baqsimi', doses: ['3mg'], routes: ['intranasal'], frequency: ['Single dose'], maxDaily: '3mg', renalAdjust: false },
        { name: 'Dasiglucagon', genericName: 'Zegalogue', doses: ['0.6mg'], routes: ['subcutaneous'], frequency: ['Single dose'], maxDaily: '0.6mg', renalAdjust: false },
        // Glucose
        { name: 'Dextrose 50%', genericName: 'Glucose', doses: ['25g', '50ml'], routes: ['intravenous'], frequency: ['As needed'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Dextrose 10%', genericName: 'Glucose', doses: ['100ml', '250ml', '500ml'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Glucose Gel', genericName: 'Oral Glucose', doses: ['15g', '20g'], routes: ['oral'], frequency: ['As needed'], maxDaily: 'As needed', renalAdjust: false },
      ],
    },
    {
      id: 'thyroid',
      name: 'Thyroid Disorders',
      medications: [
        // Hypothyroidism
        { name: 'Levothyroxine', genericName: 'Levothyroxine/T4', doses: ['12.5mcg', '25mcg', '50mcg', '75mcg', '88mcg', '100mcg', '112mcg', '125mcg', '137mcg', '150mcg', '175mcg', '200mcg', '300mcg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '300mcg', renalAdjust: false },
        { name: 'Liothyronine', genericName: 'Liothyronine/T3', doses: ['5mcg', '10mcg', '20mcg', '25mcg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '100mcg', renalAdjust: false },
        { name: 'Desiccated Thyroid', genericName: 'Armour Thyroid', doses: ['15mg', '30mg', '60mg', '90mg', '120mg', '180mg', '240mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Liotrix', genericName: 'T4/T3 Combination', doses: ['12.5/3.1mcg', '25/6.25mcg', '50/12.5mcg', '100/25mcg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100/25mcg', renalAdjust: false },
        // Hyperthyroidism
        { name: 'Carbimazole', genericName: 'Carbimazole', doses: ['5mg', '10mg', '20mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Methimazole', genericName: 'Methimazole', doses: ['5mg', '10mg', '20mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '40mg', renalAdjust: false },
        { name: 'Propylthiouracil', genericName: 'Propylthiouracil', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '600mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Potassium Iodide', genericName: 'Lugol\'s Solution/SSKI', doses: ['50mg', '65mg', '130mg', '1-5 drops'], routes: ['oral'], frequency: ['8 hourly', 'Once daily'], maxDaily: '500mg', renalAdjust: true },
        { name: 'Sodium Iodide I-131', genericName: 'Radioactive Iodine', doses: ['5-30 mCi', '100-200 mCi'], routes: ['oral'], frequency: ['Single dose'], maxDaily: 'Single dose', renalAdjust: true },
      ],
    },
    {
      id: 'corticosteroids',
      name: 'Corticosteroids',
      medications: [
        // Glucocorticoids
        { name: 'Prednisolone', genericName: 'Prednisolone', doses: ['1mg', '5mg', '10mg', '20mg', '25mg', '30mg', '40mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Prednisone', genericName: 'Prednisone', doses: ['1mg', '2.5mg', '5mg', '10mg', '20mg', '50mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Methylprednisolone (Oral)', genericName: 'Medrol', doses: ['2mg', '4mg', '8mg', '16mg', '32mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '48mg', renalAdjust: false },
        { name: 'Methylprednisolone (IV)', genericName: 'Solu-Medrol', doses: ['40mg', '125mg', '500mg', '1g'], routes: ['intravenous', 'intramuscular'], frequency: ['Once daily', '6 hourly'], maxDaily: '1g pulse', renalAdjust: false },
        { name: 'Hydrocortisone', genericName: 'Hydrocortisone', doses: ['5mg', '10mg', '20mg', '100mg', '250mg', '500mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['8 hourly', '6 hourly'], maxDaily: '500mg IV', renalAdjust: false },
        { name: 'Dexamethasone', genericName: 'Dexamethasone', doses: ['0.5mg', '0.75mg', '1mg', '1.5mg', '2mg', '4mg', '6mg', '8mg', '10mg', '20mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once daily', '6 hourly'], maxDaily: '40mg', renalAdjust: false },
        { name: 'Betamethasone', genericName: 'Betamethasone', doses: ['0.5mg', '0.6mg', '4mg', '6mg'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', '12 hourly'], maxDaily: '8mg', renalAdjust: false },
        { name: 'Triamcinolone', genericName: 'Triamcinolone', doses: ['4mg', '8mg', '10mg/ml', '40mg/ml'], routes: ['oral', 'intramuscular', 'intra-articular'], frequency: ['Once daily', 'Every 2-4 weeks injection'], maxDaily: '48mg oral', renalAdjust: false },
        { name: 'Deflazacort', genericName: 'Deflazacort', doses: ['6mg', '18mg', '30mg', '36mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '90mg', renalAdjust: false },
        { name: 'Budesonide (Oral)', genericName: 'Entocort', doses: ['3mg', '9mg'], routes: ['oral'], frequency: ['Once daily', '8 hourly'], maxDaily: '9mg', renalAdjust: false },
        // Mineralocorticoids
        { name: 'Fludrocortisone', genericName: 'Fludrocortisone', doses: ['0.05mg', '0.1mg', '0.2mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '0.3mg', renalAdjust: false },
      ],
    },
    {
      id: 'sex_hormones_male',
      name: 'Male Sex Hormones & Antagonists',
      medications: [
        // Androgens
        { name: 'Testosterone Enanthate', genericName: 'Testosterone Enanthate', doses: ['50mg', '100mg', '200mg', '250mg'], routes: ['intramuscular'], frequency: ['Every 2-4 weeks'], maxDaily: '400mg/month', renalAdjust: false },
        { name: 'Testosterone Cypionate', genericName: 'Testosterone Cypionate', doses: ['50mg', '100mg', '200mg'], routes: ['intramuscular'], frequency: ['Every 1-2 weeks'], maxDaily: '400mg/month', renalAdjust: false },
        { name: 'Testosterone Undecanoate (IM)', genericName: 'Nebido', doses: ['1000mg'], routes: ['intramuscular'], frequency: ['Every 10-14 weeks'], maxDaily: '1000mg/10 weeks', renalAdjust: false },
        { name: 'Testosterone Undecanoate (Oral)', genericName: 'Andriol', doses: ['40mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '160mg', renalAdjust: false },
        { name: 'Testosterone Gel', genericName: 'AndroGel/Testogel', doses: ['1%', '1.62%', '2%', '25mg', '50mg sachets'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Testosterone Patch', genericName: 'Androderm', doses: ['2mg', '4mg'], routes: ['transdermal'], frequency: ['Once daily'], maxDaily: '6mg', renalAdjust: false },
        // Anti-androgens
        { name: 'Cyproterone Acetate', genericName: 'Cyproterone', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '300mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Finasteride', genericName: 'Finasteride', doses: ['1mg', '5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: false },
        { name: 'Dutasteride', genericName: 'Dutasteride', doses: ['0.5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '0.5mg', renalAdjust: false },
        { name: 'Bicalutamide', genericName: 'Bicalutamide', doses: ['50mg', '150mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Flutamide', genericName: 'Flutamide', doses: ['250mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '750mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Enzalutamide', genericName: 'Enzalutamide', doses: ['40mg', '80mg', '160mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '160mg', renalAdjust: false },
        { name: 'Apalutamide', genericName: 'Apalutamide', doses: ['60mg', '240mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '240mg', renalAdjust: false },
        { name: 'Darolutamide', genericName: 'Darolutamide', doses: ['300mg', '600mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1200mg', renalAdjust: true },
        // Erectile Dysfunction
        { name: 'Sildenafil', genericName: 'Sildenafil', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['As needed'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Tadalafil', genericName: 'Tadalafil', doses: ['2.5mg', '5mg', '10mg', '20mg'], routes: ['oral'], frequency: ['As needed', 'Once daily'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Vardenafil', genericName: 'Vardenafil', doses: ['5mg', '10mg', '20mg'], routes: ['oral'], frequency: ['As needed'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Avanafil', genericName: 'Avanafil', doses: ['50mg', '100mg', '200mg'], routes: ['oral'], frequency: ['As needed'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Alprostadil', genericName: 'Alprostadil', doses: ['10mcg', '20mcg', '40mcg', '125mcg', '250mcg', '500mcg', '1000mcg'], routes: ['intracavernosal', 'intraurethral'], frequency: ['As needed'], maxDaily: '60mcg injection', renalAdjust: false },
      ],
    },
    {
      id: 'sex_hormones_female',
      name: 'Female Sex Hormones',
      medications: [
        // Estrogens
        { name: 'Estradiol (Oral)', genericName: 'Estradiol', doses: ['0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2mg', renalAdjust: false },
        { name: 'Estradiol Valerate', genericName: 'Progynova', doses: ['1mg', '2mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2mg', renalAdjust: false },
        { name: 'Estradiol Patch', genericName: 'Estraderm/Climara', doses: ['25mcg', '37.5mcg', '50mcg', '75mcg', '100mcg'], routes: ['transdermal'], frequency: ['Twice weekly', 'Weekly'], maxDaily: '100mcg', renalAdjust: false },
        { name: 'Estradiol Gel', genericName: 'Estrogel/Divigel', doses: ['0.06%', '0.1%', '0.5mg', '1mg'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1.5mg', renalAdjust: false },
        { name: 'Conjugated Estrogens', genericName: 'Premarin', doses: ['0.3mg', '0.45mg', '0.625mg', '0.9mg', '1.25mg'], routes: ['oral', 'intravenous', 'vaginal'], frequency: ['Once daily'], maxDaily: '1.25mg', renalAdjust: false },
        { name: 'Ethinylestradiol', genericName: 'Ethinylestradiol', doses: ['10mcg', '20mcg', '30mcg', '35mcg', '50mcg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mcg', renalAdjust: false },
        // Progestogens
        { name: 'Medroxyprogesterone (Oral)', genericName: 'Provera', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily', 'Cyclically'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Medroxyprogesterone (Depot)', genericName: 'Depo-Provera', doses: ['150mg', '104mg'], routes: ['intramuscular', 'subcutaneous'], frequency: ['Every 12-13 weeks'], maxDaily: '150mg/12 weeks', renalAdjust: false },
        { name: 'Norethisterone', genericName: 'Norethisterone', doses: ['0.35mg', '5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15mg', renalAdjust: false },
        { name: 'Progesterone (Oral)', genericName: 'Prometrium', doses: ['100mg', '200mg', '300mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Progesterone (Vaginal)', genericName: 'Utrogestan/Crinone', doses: ['100mg', '200mg', '400mg', '8% gel'], routes: ['vaginal'], frequency: ['Once daily', '12 hourly'], maxDaily: '800mg', renalAdjust: false },
        { name: 'Dydrogesterone', genericName: 'Duphaston', doses: ['10mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Levonorgestrel (Oral)', genericName: 'Levonorgestrel', doses: ['0.03mg', '0.075mg', '1.5mg EC'], routes: ['oral'], frequency: ['Once daily', 'Single dose EC'], maxDaily: '1.5mg', renalAdjust: false },
        { name: 'Levonorgestrel IUS', genericName: 'Mirena/Kyleena', doses: ['52mg/5yr', '19.5mg/5yr'], routes: ['intrauterine'], frequency: ['Every 5 years'], maxDaily: 'IUS', renalAdjust: false },
        { name: 'Etonogestrel Implant', genericName: 'Nexplanon', doses: ['68mg'], routes: ['subdermal'], frequency: ['Every 3 years'], maxDaily: 'Implant', renalAdjust: false },
        { name: 'Ulipristal Acetate', genericName: 'Ella/Esmya', doses: ['30mg EC', '5mg'], routes: ['oral'], frequency: ['Single dose EC', 'Once daily'], maxDaily: '30mg', renalAdjust: false },
        // Combined HRT
        { name: 'Estradiol/Norethisterone', genericName: 'Kliogest/Activelle', doses: ['1/0.5mg', '2/1mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2/1mg', renalAdjust: false },
        { name: 'Estradiol/Dydrogesterone', genericName: 'Femoston', doses: ['1/5mg', '1/10mg', '2/10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2/10mg', renalAdjust: false },
        { name: 'Conjugated Estrogens/Bazedoxifene', genericName: 'Duavee', doses: ['0.45/20mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '0.45/20mg', renalAdjust: false },
        // Anti-estrogens
        { name: 'Clomifene', genericName: 'Clomiphene', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['Once daily x 5 days'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Tamoxifen', genericName: 'Tamoxifen', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '40mg', renalAdjust: false },
        { name: 'Raloxifene', genericName: 'Raloxifene', doses: ['60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Fulvestrant', genericName: 'Fulvestrant', doses: ['250mg', '500mg'], routes: ['intramuscular'], frequency: ['Monthly'], maxDaily: '500mg/month', renalAdjust: false },
      ],
    },
    {
      id: 'pituitary_hypothalamic',
      name: 'Pituitary & Hypothalamic Hormones',
      medications: [
        // Growth Hormone
        { name: 'Somatropin', genericName: 'Human Growth Hormone', doses: ['0.025-0.05mg/kg/day', '5mg', '10mg', '12mg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '0.067mg/kg', renalAdjust: false },
        { name: 'Pegvisomant', genericName: 'Pegvisomant', doses: ['10mg', '15mg', '20mg', '25mg', '30mg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Mecasermin', genericName: 'IGF-1', doses: ['20-120mcg/kg'], routes: ['subcutaneous'], frequency: ['12 hourly'], maxDaily: '120mcg/kg/dose', renalAdjust: false },
        { name: 'Tesamorelin', genericName: 'Tesamorelin', doses: ['2mg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '2mg', renalAdjust: false },
        // Posterior Pituitary
        { name: 'Desmopressin', genericName: 'Desmopressin', doses: ['100mcg', '200mcg', '0.1mg', '0.2mg', '4mcg/ml', '10mcg nasal', '120mcg', '240mcg ODT'], routes: ['oral', 'intranasal', 'subcutaneous', 'intravenous'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '1.2mg oral', renalAdjust: true },
        { name: 'Vasopressin', genericName: 'Arginine Vasopressin', doses: ['20 units/ml', '0.01-0.04 units/min'], routes: ['intravenous', 'intramuscular'], frequency: ['Continuous infusion'], maxDaily: '0.04 units/min', renalAdjust: false },
        { name: 'Terlipressin', genericName: 'Terlipressin', doses: ['1mg', '2mg'], routes: ['intravenous'], frequency: ['4-6 hourly', 'Continuous infusion'], maxDaily: '12mg', renalAdjust: false },
        { name: 'Oxytocin', genericName: 'Syntocinon', doses: ['5 units', '10 units', '1-20 mU/min'], routes: ['intravenous', 'intramuscular'], frequency: ['Titrated', 'Single dose'], maxDaily: '20 mU/min', renalAdjust: false },
        { name: 'Carbetocin', genericName: 'Carbetocin', doses: ['100mcg'], routes: ['intravenous', 'intramuscular'], frequency: ['Single dose'], maxDaily: '100mcg', renalAdjust: false },
        // Anterior Pituitary
        { name: 'Corticotropin (ACTH)', genericName: 'Corticotropin', doses: ['25 units', '40 units', '80 units'], routes: ['intramuscular', 'subcutaneous'], frequency: ['Every 24-72 hours'], maxDaily: '80 units', renalAdjust: false },
        { name: 'Cosyntropin', genericName: 'Synacthen', doses: ['250mcg', '1mg'], routes: ['intravenous', 'intramuscular'], frequency: ['Diagnostic test'], maxDaily: 'Diagnostic', renalAdjust: false },
        // GnRH Agonists
        { name: 'Leuprolide', genericName: 'Leuprorelin', doses: ['3.75mg', '7.5mg', '11.25mg', '22.5mg', '30mg', '45mg'], routes: ['intramuscular', 'subcutaneous'], frequency: ['Monthly', 'Every 3-6 months'], maxDaily: 'Per injection schedule', renalAdjust: false },
        { name: 'Goserelin', genericName: 'Goserelin', doses: ['3.6mg', '10.8mg'], routes: ['subcutaneous'], frequency: ['Monthly', 'Every 3 months'], maxDaily: 'Per injection schedule', renalAdjust: false },
        { name: 'Triptorelin', genericName: 'Triptorelin', doses: ['3.75mg', '11.25mg', '22.5mg'], routes: ['intramuscular'], frequency: ['Monthly', 'Every 3-6 months'], maxDaily: 'Per injection schedule', renalAdjust: false },
        { name: 'Buserelin', genericName: 'Buserelin', doses: ['100mcg', '300mcg', '6.3mg implant', '9.45mg implant'], routes: ['intranasal', 'subcutaneous'], frequency: ['8 hourly nasal', 'Every 2-3 months implant'], maxDaily: '900mcg nasal', renalAdjust: false },
        { name: 'Nafarelin', genericName: 'Nafarelin', doses: ['200mcg', '400mcg'], routes: ['intranasal'], frequency: ['12 hourly'], maxDaily: '800mcg', renalAdjust: false },
        // GnRH Antagonists
        { name: 'Degarelix', genericName: 'Degarelix', doses: ['80mg', '120mg', '240mg loading'], routes: ['subcutaneous'], frequency: ['Monthly'], maxDaily: '80mg/month', renalAdjust: false },
        { name: 'Cetrorelix', genericName: 'Cetrorelix', doses: ['0.25mg', '3mg'], routes: ['subcutaneous'], frequency: ['Once daily', 'Single dose'], maxDaily: '3mg', renalAdjust: false },
        { name: 'Ganirelix', genericName: 'Ganirelix', doses: ['0.25mg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '0.25mg', renalAdjust: false },
        { name: 'Elagolix', genericName: 'Elagolix', doses: ['150mg', '200mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Relugolix', genericName: 'Relugolix', doses: ['40mg', '120mg loading'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: false },
        // Prolactin Modulators
        { name: 'Bromocriptine', genericName: 'Bromocriptine', doses: ['1.25mg', '2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Cabergoline', genericName: 'Cabergoline', doses: ['0.25mg', '0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['Once weekly', 'Twice weekly'], maxDaily: '4.5mg/week', renalAdjust: false },
        { name: 'Quinagolide', genericName: 'Quinagolide', doses: ['25mcg', '50mcg', '75mcg', '150mcg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mcg', renalAdjust: false },
      ],
    },
    {
      id: 'bone_metabolism',
      name: 'Bone Metabolism Drugs',
      medications: [
        // Bisphosphonates
        { name: 'Alendronate', genericName: 'Alendronic Acid', doses: ['5mg', '10mg', '35mg', '70mg'], routes: ['oral'], frequency: ['Once daily', 'Once weekly'], maxDaily: '70mg/week', renalAdjust: true },
        { name: 'Risedronate', genericName: 'Risedronic Acid', doses: ['5mg', '35mg', '75mg', '150mg'], routes: ['oral'], frequency: ['Once daily', 'Once weekly', 'Once monthly'], maxDaily: '150mg/month', renalAdjust: true },
        { name: 'Ibandronate', genericName: 'Ibandronic Acid', doses: ['2.5mg', '150mg', '3mg IV'], routes: ['oral', 'intravenous'], frequency: ['Once daily', 'Once monthly oral', 'Every 3 months IV'], maxDaily: '150mg/month', renalAdjust: true },
        { name: 'Zoledronic Acid', genericName: 'Zoledronate', doses: ['4mg', '5mg'], routes: ['intravenous'], frequency: ['Every 3-4 weeks cancer', 'Yearly osteoporosis'], maxDaily: '5mg/year', renalAdjust: true },
        { name: 'Pamidronate', genericName: 'Pamidronic Acid', doses: ['30mg', '60mg', '90mg'], routes: ['intravenous'], frequency: ['Every 3-4 weeks'], maxDaily: '90mg', renalAdjust: true },
        { name: 'Etidronate', genericName: 'Etidronic Acid', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['Once daily cyclical'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Clodronate', genericName: 'Clodronic Acid', doses: ['400mg', '800mg', '1600mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '3200mg', renalAdjust: true },
        // RANK Ligand Inhibitor
        { name: 'Denosumab', genericName: 'Denosumab', doses: ['60mg', '120mg'], routes: ['subcutaneous'], frequency: ['Every 6 months osteo', 'Every 4 weeks cancer'], maxDaily: '120mg/4 weeks', renalAdjust: false },
        // Parathyroid Hormone
        { name: 'Teriparatide', genericName: 'Teriparatide', doses: ['20mcg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '20mcg', renalAdjust: false },
        { name: 'Abaloparatide', genericName: 'Abaloparatide', doses: ['80mcg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '80mcg', renalAdjust: false },
        // Sclerostin Inhibitor
        { name: 'Romosozumab', genericName: 'Romosozumab', doses: ['105mg x2', '210mg'], routes: ['subcutaneous'], frequency: ['Once monthly'], maxDaily: '210mg/month', renalAdjust: false },
        // Calcium & Vitamin D
        { name: 'Calcium Carbonate', genericName: 'Calcium Carbonate', doses: ['500mg', '600mg', '1000mg', '1250mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '2500mg elemental', renalAdjust: true },
        { name: 'Calcium Citrate', genericName: 'Calcium Citrate', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '2500mg elemental', renalAdjust: true },
        { name: 'Calcium Gluconate (IV)', genericName: 'Calcium Gluconate', doses: ['1g', '2g', '10ml 10%'], routes: ['intravenous'], frequency: ['Slow IV', 'Continuous infusion'], maxDaily: '15g', renalAdjust: true },
        { name: 'Calcium Chloride', genericName: 'Calcium Chloride', doses: ['500mg', '1g', '10ml 10%'], routes: ['intravenous'], frequency: ['Slow IV push'], maxDaily: '3g', renalAdjust: true },
        { name: 'Cholecalciferol', genericName: 'Vitamin D3', doses: ['400IU', '800IU', '1000IU', '2000IU', '5000IU', '10000IU', '25000IU', '50000IU'], routes: ['oral'], frequency: ['Once daily', 'Once weekly', 'Once monthly'], maxDaily: '10000IU', renalAdjust: false },
        { name: 'Ergocalciferol', genericName: 'Vitamin D2', doses: ['400IU', '1000IU', '50000IU'], routes: ['oral'], frequency: ['Once daily', 'Once weekly'], maxDaily: '50000IU', renalAdjust: false },
        { name: 'Calcitriol', genericName: 'Calcitriol', doses: ['0.25mcg', '0.5mcg', '1mcg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '3 times weekly'], maxDaily: '2mcg', renalAdjust: false },
        { name: 'Alfacalcidol', genericName: 'Alfacalcidol', doses: ['0.25mcg', '0.5mcg', '1mcg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '3mcg', renalAdjust: false },
        { name: 'Paricalcitol', genericName: 'Paricalcitol', doses: ['1mcg', '2mcg', '4mcg', '5mcg IV'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '3 times weekly'], maxDaily: '32mcg', renalAdjust: false },
        // Calcitonin
        { name: 'Calcitonin (Salmon)', genericName: 'Calcitonin', doses: ['50 units', '100 units', '200 units nasal'], routes: ['subcutaneous', 'intramuscular', 'intranasal'], frequency: ['Once daily', '12 hourly'], maxDaily: '400 units', renalAdjust: false },
        // Calcimimetics
        { name: 'Cinacalcet', genericName: 'Cinacalcet', doses: ['30mg', '60mg', '90mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '180mg', renalAdjust: false },
        { name: 'Etelcalcetide', genericName: 'Etelcalcetide', doses: ['2.5mg', '5mg', '10mg'], routes: ['intravenous'], frequency: ['3 times weekly with dialysis'], maxDaily: '15mg 3x/week', renalAdjust: false },
      ],
    },
    {
      id: 'adrenal',
      name: 'Adrenal Disorders',
      medications: [
        // Adrenal Insufficiency (see corticosteroids)
        { name: 'Hydrocortisone (Adrenal)', genericName: 'Hydrocortisone', doses: ['10mg', '15mg', '20mg', '5mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '30mg', renalAdjust: false, specialInstructions: 'Stress dosing: double/triple dose' },
        { name: 'Cortisone', genericName: 'Cortisone Acetate', doses: ['25mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '75mg', renalAdjust: false },
        { name: 'Plenadren', genericName: 'Hydrocortisone Modified-Release', doses: ['5mg', '20mg'], routes: ['oral'], frequency: ['Once daily morning'], maxDaily: '30mg', renalAdjust: false },
        // Cushings Syndrome
        { name: 'Metyrapone', genericName: 'Metyrapone', doses: ['250mg'], routes: ['oral'], frequency: ['8 hourly', '6 hourly'], maxDaily: '6g', renalAdjust: false },
        { name: 'Ketoconazole (Cushing)', genericName: 'Ketoconazole', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '1200mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Osilodrostat', genericName: 'Osilodrostat', doses: ['1mg', '2mg', '5mg', '10mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Mifepristone (Cushing)', genericName: 'Mifepristone', doses: ['300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1200mg', renalAdjust: false },
        { name: 'Pasireotide', genericName: 'Pasireotide', doses: ['0.3mg', '0.6mg', '0.9mg', '10mg', '20mg', '40mg', '60mg LAR'], routes: ['subcutaneous', 'intramuscular'], frequency: ['12 hourly SC', 'Monthly LAR'], maxDaily: '1.8mg SC', renalAdjust: false },
        { name: 'Mitotane', genericName: 'Mitotane', doses: ['500mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '6g', renalAdjust: false },
        // Pheochromocytoma
        { name: 'Phenoxybenzamine', genericName: 'Phenoxybenzamine', doses: ['10mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '240mg', renalAdjust: false },
        { name: 'Phentolamine', genericName: 'Phentolamine', doses: ['5mg', '10mg'], routes: ['intravenous'], frequency: ['Bolus or infusion'], maxDaily: 'Titrated', renalAdjust: false },
        { name: 'Metyrosine', genericName: 'Metyrosine', doses: ['250mg'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '4g', renalAdjust: true },
        // Primary Aldosteronism
        { name: 'Spironolactone (Aldosteronism)', genericName: 'Spironolactone', doses: ['12.5mg', '25mg', '50mg', '100mg', '200mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Eplerenone (Aldosteronism)', genericName: 'Eplerenone', doses: ['25mg', '50mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: true },
      ],
    },
  ],
};

// ============================================
// 7. OBSTETRICS, GYNAECOLOGY & URINARY TRACT
// ============================================
export const obstetricsUrologyMedications: BNFCategory = {
  id: 'obstetrics_urology',
  name: 'Obstetrics, Gynaecology & Urinary Tract',
  subcategories: [
    {
      id: 'obstetric_drugs',
      name: 'Obstetric Drugs',
      medications: [
        // Prostaglandins & Oxytocics
        { name: 'Oxytocin (Obstetric)', genericName: 'Syntocinon', doses: ['5 units', '10 units', '1-20 mU/min', '40 units/500ml'], routes: ['intravenous', 'intramuscular'], frequency: ['Titrated infusion', 'Single dose'], maxDaily: '40 units', renalAdjust: false },
        { name: 'Carbetocin (Obstetric)', genericName: 'Carbetocin', doses: ['100mcg'], routes: ['intravenous', 'intramuscular'], frequency: ['Single dose'], maxDaily: '100mcg', renalAdjust: false },
        { name: 'Ergometrine', genericName: 'Ergometrine', doses: ['200mcg', '500mcg'], routes: ['intravenous', 'intramuscular'], frequency: ['Single dose', '2-4 hourly PRN'], maxDaily: '1mg', renalAdjust: false },
        { name: 'Syntometrine', genericName: 'Oxytocin/Ergometrine', doses: ['5 units/500mcg'], routes: ['intramuscular'], frequency: ['Single dose'], maxDaily: '1 ampoule', renalAdjust: false },
        { name: 'Misoprostol (Obstetric)', genericName: 'Misoprostol', doses: ['25mcg', '50mcg', '100mcg', '200mcg', '400mcg', '600mcg', '800mcg'], routes: ['oral', 'sublingual', 'vaginal', 'rectal'], frequency: ['Single dose', '3 hourly'], maxDaily: '1600mcg', renalAdjust: true },
        { name: 'Dinoprostone', genericName: 'Prostaglandin E2', doses: ['0.5mg gel', '1mg', '2mg', '3mg', '10mg pessary'], routes: ['vaginal', 'intracervical'], frequency: ['6 hourly'], maxDaily: '3mg gel', renalAdjust: false },
        { name: 'Carboprost', genericName: 'Carboprost Tromethamine', doses: ['250mcg'], routes: ['intramuscular', 'intramyometrial'], frequency: ['Every 15-90 min'], maxDaily: '2mg (8 doses)', renalAdjust: false },
        { name: 'Sulprostone', genericName: 'Sulprostone', doses: ['500mcg'], routes: ['intravenous'], frequency: ['Infusion'], maxDaily: '1.5mg', renalAdjust: false },
        // Tocolytics
        { name: 'Atosiban', genericName: 'Atosiban', doses: ['6.75mg bolus', '300mcg/min then 100mcg/min'], routes: ['intravenous'], frequency: ['Infusion up to 48h'], maxDaily: '330mg', renalAdjust: false },
        { name: 'Nifedipine (Tocolytic)', genericName: 'Nifedipine', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['20 min x3 then 8 hourly'], maxDaily: '160mg', renalAdjust: false },
        { name: 'Ritodrine', genericName: 'Ritodrine', doses: ['50mcg/min escalating'], routes: ['intravenous'], frequency: ['Infusion'], maxDaily: '350mcg/min', renalAdjust: false },
        { name: 'Salbutamol (Tocolytic)', genericName: 'Salbutamol', doses: ['10-45mcg/min'], routes: ['intravenous'], frequency: ['Infusion'], maxDaily: '45mcg/min', renalAdjust: false },
        { name: 'Terbutaline (Tocolytic)', genericName: 'Terbutaline', doses: ['250mcg', '2.5-10mcg/min'], routes: ['subcutaneous', 'intravenous'], frequency: ['Every 4-6 hours SC', 'Infusion'], maxDaily: '1.5mg SC', renalAdjust: false },
        { name: 'Indomethacin (Tocolytic)', genericName: 'Indomethacin', doses: ['50mg', '100mg loading', '25mg'], routes: ['oral', 'rectal'], frequency: ['6 hourly', '8 hourly'], maxDaily: '200mg', renalAdjust: true },
        // Magnesium for Pre-eclampsia/Eclampsia
        { name: 'Magnesium Sulfate (Eclampsia)', genericName: 'Magnesium Sulfate', doses: ['4g loading', '1g/hour maintenance', '2g if recurrence'], routes: ['intravenous'], frequency: ['Loading then infusion 24h'], maxDaily: '24g/24h', renalAdjust: true },
        // Fetal Lung Maturation
        { name: 'Betamethasone (Antenatal)', genericName: 'Betamethasone', doses: ['12mg'], routes: ['intramuscular'], frequency: ['2 doses 24h apart'], maxDaily: '24mg course', renalAdjust: false },
        { name: 'Dexamethasone (Antenatal)', genericName: 'Dexamethasone', doses: ['6mg'], routes: ['intramuscular'], frequency: ['4 doses 12h apart'], maxDaily: '24mg course', renalAdjust: false },
        // Rhesus Prophylaxis
        { name: 'Anti-D Immunoglobulin', genericName: 'Anti-D (Rho) Immune Globulin', doses: ['300mcg', '500IU', '1500IU', '250mcg'], routes: ['intramuscular', 'intravenous'], frequency: ['Single dose', 'Within 72h of event'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'gynaecological_drugs',
      name: 'Gynaecological Drugs',
      medications: [
        // Menstrual Disorders
        { name: 'Tranexamic Acid (Menorrhagia)', genericName: 'Tranexamic Acid', doses: ['500mg', '1g', '1.3g'], routes: ['oral', 'intravenous'], frequency: ['8 hourly x 4 days'], maxDaily: '4g', renalAdjust: true },
        { name: 'Mefenamic Acid', genericName: 'Mefenamic Acid', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '1.5g', renalAdjust: true },
        { name: 'Norethisterone (Menorrhagia)', genericName: 'Norethisterone', doses: ['5mg'], routes: ['oral'], frequency: ['8 hourly days 5-26 of cycle'], maxDaily: '15mg', renalAdjust: false },
        { name: 'Danazol', genericName: 'Danazol', doses: ['100mg', '200mg', '400mg', '600mg', '800mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '800mg', renalAdjust: false },
        // Endometriosis
        { name: 'Dienogest', genericName: 'Dienogest', doses: ['2mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2mg', renalAdjust: false },
        { name: 'Norethisterone Acetate (Endometriosis)', genericName: 'Norethisterone', doses: ['2.5mg', '5mg', '10mg', '15mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Gestrinone', genericName: 'Gestrinone', doses: ['2.5mg'], routes: ['oral'], frequency: ['Twice weekly'], maxDaily: '5mg/week', renalAdjust: false },
        // Menopause (see Female Sex Hormones)
        // Vaginal Atrophy
        { name: 'Estradiol Vaginal', genericName: 'Vagifem/Imvexxy', doses: ['4mcg', '10mcg', '25mcg'], routes: ['vaginal'], frequency: ['Once daily x 2 weeks then twice weekly'], maxDaily: '25mcg', renalAdjust: false },
        { name: 'Estriol Vaginal', genericName: 'Ovestin', doses: ['0.5mg', '1mg'], routes: ['vaginal'], frequency: ['Once daily initially then twice weekly'], maxDaily: '1mg', renalAdjust: false },
        { name: 'Prasterone', genericName: 'DHEA Vaginal', doses: ['6.5mg'], routes: ['vaginal'], frequency: ['Once daily'], maxDaily: '6.5mg', renalAdjust: false },
        { name: 'Ospemifene', genericName: 'Ospemifene', doses: ['60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '60mg', renalAdjust: false },
        // Bacterial Vaginosis
        { name: 'Metronidazole Vaginal', genericName: 'Metronidazole', doses: ['0.75% gel', '500mg pessary'], routes: ['vaginal'], frequency: ['Once daily x 5 days', '12 hourly x 7 days'], maxDaily: '1g', renalAdjust: false },
        { name: 'Clindamycin Vaginal', genericName: 'Clindamycin', doses: ['2% cream', '100mg ovule'], routes: ['vaginal'], frequency: ['Once daily x 3-7 days'], maxDaily: '100mg', renalAdjust: false },
        // Candidiasis
        { name: 'Clotrimazole Vaginal', genericName: 'Clotrimazole', doses: ['100mg', '200mg', '500mg'], routes: ['vaginal'], frequency: ['Once daily x 6d', 'x 3d', 'Single dose'], maxDaily: '500mg', renalAdjust: false },
        { name: 'Miconazole Vaginal', genericName: 'Miconazole', doses: ['100mg', '200mg', '400mg', '1200mg'], routes: ['vaginal'], frequency: ['Once daily', 'Single dose'], maxDaily: '1200mg', renalAdjust: false },
        { name: 'Econazole Vaginal', genericName: 'Econazole', doses: ['150mg'], routes: ['vaginal'], frequency: ['Once daily x 3 days'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Fluconazole (Vaginal Candidiasis)', genericName: 'Fluconazole', doses: ['150mg'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '150mg', renalAdjust: true },
        { name: 'Itraconazole (Vaginal)', genericName: 'Itraconazole', doses: ['200mg'], routes: ['oral'], frequency: ['12 hourly x 1 day'], maxDaily: '400mg', renalAdjust: false },
        // Trichomoniasis
        { name: 'Metronidazole (Trichomoniasis)', genericName: 'Metronidazole', doses: ['400mg', '500mg', '2g'], routes: ['oral'], frequency: ['12 hourly x 7d', 'Single dose 2g'], maxDaily: '2g', renalAdjust: false },
        { name: 'Tinidazole (Trichomoniasis)', genericName: 'Tinidazole', doses: ['2g'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '2g', renalAdjust: false },
        { name: 'Secnidazole (Trichomoniasis)', genericName: 'Secnidazole', doses: ['2g'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '2g', renalAdjust: false },
      ],
    },
    {
      id: 'contraceptives',
      name: 'Contraceptives',
      medications: [
        // Combined Oral Contraceptives
        { name: 'Ethinylestradiol/Levonorgestrel', genericName: 'Microgynon/Ovranette', doses: ['20/100mcg', '30/150mcg', '50/250mcg'], routes: ['oral'], frequency: ['Once daily x 21d, 7d break'], maxDaily: '1 tablet', renalAdjust: false },
        { name: 'Ethinylestradiol/Norethisterone', genericName: 'Brevinor/Loestrin', doses: ['35/500mcg', '35/1000mcg', '20/1000mcg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
        { name: 'Ethinylestradiol/Desogestrel', genericName: 'Marvelon/Mercilon', doses: ['30/150mcg', '20/150mcg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
        { name: 'Ethinylestradiol/Gestodene', genericName: 'Femodene/Femodette', doses: ['30/75mcg', '20/75mcg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
        { name: 'Ethinylestradiol/Drospirenone', genericName: 'Yasmin/Yaz', doses: ['30/3mg', '20/3mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
        { name: 'Ethinylestradiol/Norgestimate', genericName: 'Cilest', doses: ['35/250mcg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
        { name: 'Ethinylestradiol/Dienogest', genericName: 'Qlaira', doses: ['Variable multiphasic'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
        { name: 'Estetrol/Drospirenone', genericName: 'Drovelis/Nextstellis', doses: ['15mg/3mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
        // Progestogen-Only Pills
        { name: 'Desogestrel', genericName: 'Cerazette', doses: ['75mcg'], routes: ['oral'], frequency: ['Once daily continuous'], maxDaily: '75mcg', renalAdjust: false },
        { name: 'Norethisterone POP', genericName: 'Noriday', doses: ['350mcg'], routes: ['oral'], frequency: ['Once daily continuous'], maxDaily: '350mcg', renalAdjust: false },
        { name: 'Levonorgestrel POP', genericName: 'Norgeston', doses: ['30mcg'], routes: ['oral'], frequency: ['Once daily continuous'], maxDaily: '30mcg', renalAdjust: false },
        { name: 'Drospirenone POP', genericName: 'Slynd', doses: ['4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '4mg', renalAdjust: false },
        // Long-Acting Reversible Contraceptives
        { name: 'Medroxyprogesterone Depot', genericName: 'Depo-Provera', doses: ['150mg IM', '104mg SC'], routes: ['intramuscular', 'subcutaneous'], frequency: ['Every 12-13 weeks'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Norethisterone Enanthate', genericName: 'Noristerat', doses: ['200mg'], routes: ['intramuscular'], frequency: ['Every 8 weeks'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Levonorgestrel IUS 52mg', genericName: 'Mirena', doses: ['52mg'], routes: ['intrauterine'], frequency: ['Every 5-8 years'], maxDaily: 'Device', renalAdjust: false },
        { name: 'Levonorgestrel IUS 19.5mg', genericName: 'Kyleena', doses: ['19.5mg'], routes: ['intrauterine'], frequency: ['Every 5 years'], maxDaily: 'Device', renalAdjust: false },
        { name: 'Levonorgestrel IUS 13.5mg', genericName: 'Jaydess/Skyla', doses: ['13.5mg'], routes: ['intrauterine'], frequency: ['Every 3 years'], maxDaily: 'Device', renalAdjust: false },
        { name: 'Etonogestrel Implant', genericName: 'Nexplanon', doses: ['68mg'], routes: ['subdermal'], frequency: ['Every 3 years'], maxDaily: 'Implant', renalAdjust: false },
        { name: 'Copper IUD', genericName: 'Paragard/Nova-T', doses: ['380mm² copper'], routes: ['intrauterine'], frequency: ['Every 5-10 years'], maxDaily: 'Device', renalAdjust: false },
        // Contraceptive Patches/Rings
        { name: 'Ethinylestradiol/Norelgestromin Patch', genericName: 'Evra', doses: ['33.9/203mcg daily release'], routes: ['transdermal'], frequency: ['Weekly x 3, 1 week off'], maxDaily: 'Patch', renalAdjust: false },
        { name: 'Ethinylestradiol/Etonogestrel Ring', genericName: 'NuvaRing', doses: ['15/120mcg daily release'], routes: ['vaginal'], frequency: ['3 weeks in, 1 week out'], maxDaily: 'Ring', renalAdjust: false },
        { name: 'Segesterone/Ethinylestradiol Ring', genericName: 'Annovera', doses: ['150mcg/13mcg daily'], routes: ['vaginal'], frequency: ['3 weeks in, 1 week out x 13 cycles'], maxDaily: 'Ring', renalAdjust: false },
        // Emergency Contraception
        { name: 'Levonorgestrel EC', genericName: 'Plan B/Levonelle', doses: ['1.5mg'], routes: ['oral'], frequency: ['Single dose within 72h'], maxDaily: '1.5mg', renalAdjust: false },
        { name: 'Ulipristal Acetate EC', genericName: 'Ella', doses: ['30mg'], routes: ['oral'], frequency: ['Single dose within 120h'], maxDaily: '30mg', renalAdjust: false },
        // Spermicides
        { name: 'Nonoxynol-9', genericName: 'Nonoxynol-9', doses: ['2%', '4%', '52.5mg', '100mg'], routes: ['vaginal'], frequency: ['Before intercourse'], maxDaily: 'As needed', renalAdjust: false },
      ],
    },
    {
      id: 'urinary_incontinence',
      name: 'Urinary Incontinence & Retention',
      medications: [
        // Antimuscarinics for OAB
        { name: 'Oxybutynin', genericName: 'Oxybutynin', doses: ['2.5mg', '5mg', '5mg XL', '10mg XL', '3.9mg/24h patch'], routes: ['oral', 'transdermal'], frequency: ['8 hourly', 'Once daily XL', 'Twice weekly patch'], maxDaily: '20mg oral', renalAdjust: true },
        { name: 'Tolterodine', genericName: 'Tolterodine', doses: ['1mg', '2mg', '4mg ER'], routes: ['oral'], frequency: ['12 hourly', 'Once daily ER'], maxDaily: '4mg', renalAdjust: true },
        { name: 'Solifenacin', genericName: 'Solifenacin', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Darifenacin', genericName: 'Darifenacin', doses: ['7.5mg', '15mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Fesoterodine', genericName: 'Fesoterodine', doses: ['4mg', '8mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '8mg', renalAdjust: true },
        { name: 'Trospium', genericName: 'Trospium', doses: ['20mg', '60mg XR'], routes: ['oral'], frequency: ['12 hourly', 'Once daily XR'], maxDaily: '40mg', renalAdjust: true },
        { name: 'Propiverine', genericName: 'Propiverine', doses: ['15mg', '30mg MR'], routes: ['oral'], frequency: ['8 hourly', 'Once daily MR'], maxDaily: '45mg', renalAdjust: true },
        { name: 'Flavoxate', genericName: 'Flavoxate', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '600mg', renalAdjust: false },
        // Beta-3 Agonists
        { name: 'Mirabegron', genericName: 'Mirabegron', doses: ['25mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mg', renalAdjust: true },
        { name: 'Vibegron', genericName: 'Vibegron', doses: ['75mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '75mg', renalAdjust: false },
        // Combination
        { name: 'Solifenacin/Mirabegron', genericName: 'Betmiga Plus', doses: ['5/25mg', '5/50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5/50mg', renalAdjust: true },
        // Stress Incontinence
        { name: 'Duloxetine (Incontinence)', genericName: 'Duloxetine', doses: ['20mg', '40mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '80mg', renalAdjust: true },
        // Urinary Retention (Cholinergics)
        { name: 'Bethanechol', genericName: 'Bethanechol', doses: ['10mg', '25mg', '50mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Distigmine', genericName: 'Distigmine', doses: ['5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: true },
        // Nocturia
        { name: 'Desmopressin (Nocturia)', genericName: 'Desmopressin', doses: ['25mcg', '50mcg nasal', '100mcg', '200mcg oral', '25mcg ODT', '50mcg ODT'], routes: ['oral', 'sublingual', 'intranasal'], frequency: ['At bedtime'], maxDaily: '50mcg nasal, 200mcg oral', renalAdjust: true },
      ],
    },
    {
      id: 'bph_prostate',
      name: 'Benign Prostatic Hyperplasia',
      medications: [
        // Alpha-1 Blockers
        { name: 'Tamsulosin', genericName: 'Tamsulosin', doses: ['400mcg', '0.4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '400mcg', renalAdjust: false },
        { name: 'Alfuzosin', genericName: 'Alfuzosin', doses: ['2.5mg', '10mg XL'], routes: ['oral'], frequency: ['8 hourly', 'Once daily XL'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Doxazosin (BPH)', genericName: 'Doxazosin', doses: ['1mg', '2mg', '4mg', '8mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '8mg', renalAdjust: false },
        { name: 'Terazosin (BPH)', genericName: 'Terazosin', doses: ['1mg', '2mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Prazosin (BPH)', genericName: 'Prazosin', doses: ['0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Silodosin', genericName: 'Silodosin', doses: ['4mg', '8mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '8mg', renalAdjust: true },
        // 5-Alpha Reductase Inhibitors
        { name: 'Finasteride (BPH)', genericName: 'Finasteride', doses: ['5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: false },
        { name: 'Dutasteride (BPH)', genericName: 'Dutasteride', doses: ['0.5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '0.5mg', renalAdjust: false },
        // Combination
        { name: 'Tamsulosin/Dutasteride', genericName: 'Combodart/Jalyn', doses: ['0.4/0.5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 capsule', renalAdjust: false },
        { name: 'Tamsulosin/Solifenacin', genericName: 'Vesomni', doses: ['0.4/6mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
        // PDE5 Inhibitor
        { name: 'Tadalafil (BPH)', genericName: 'Tadalafil', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: true },
      ],
    },
    {
      id: 'urinary_tract_infections',
      name: 'Urinary Tract Infection Treatments',
      medications: [
        // Uncomplicated UTI
        { name: 'Nitrofurantoin (UTI)', genericName: 'Nitrofurantoin', doses: ['50mg', '100mg', '100mg MR'], routes: ['oral'], frequency: ['6 hourly', '12 hourly MR'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Trimethoprim (UTI)', genericName: 'Trimethoprim', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Fosfomycin (UTI)', genericName: 'Fosfomycin', doses: ['3g'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '3g', renalAdjust: true },
        { name: 'Pivmecillinam', genericName: 'Pivmecillinam', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['8 hourly', '6 hourly'], maxDaily: '1.2g', renalAdjust: true },
        // Prophylaxis
        { name: 'Nitrofurantoin Prophylaxis', genericName: 'Nitrofurantoin', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Trimethoprim Prophylaxis', genericName: 'Trimethoprim', doses: ['100mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Cefalexin Prophylaxis', genericName: 'Cefalexin', doses: ['125mg', '250mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '250mg', renalAdjust: true },
        // Adjunctive
        { name: 'Methenamine Hippurate', genericName: 'Hiprex', doses: ['1g'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2g', renalAdjust: true },
        { name: 'Cranberry Extract', genericName: 'Cranberry', doses: ['400mg', '500mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1g', renalAdjust: false },
        { name: 'D-Mannose', genericName: 'D-Mannose', doses: ['500mg', '1g', '2g'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '6g', renalAdjust: false },
        // Alkalinizing Agents
        { name: 'Potassium Citrate', genericName: 'Potassium Citrate', doses: ['3g'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '9g', renalAdjust: true },
        { name: 'Sodium Citrate', genericName: 'Sodium Citrate', doses: ['4g'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '12g', renalAdjust: true },
        { name: 'Sodium Bicarbonate (UTI)', genericName: 'Sodium Bicarbonate', doses: ['3g'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '6g', renalAdjust: true },
        // Bladder Instillations
        { name: 'Pentosan Polysulfate', genericName: 'Elmiron', doses: ['100mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Dimethyl Sulfoxide', genericName: 'DMSO', doses: ['50ml 50%'], routes: ['intravesical'], frequency: ['Weekly'], maxDaily: 'Weekly instillation', renalAdjust: false },
        { name: 'Hyaluronic Acid/Chondroitin', genericName: 'iAluRil', doses: ['50ml'], routes: ['intravesical'], frequency: ['Weekly then monthly'], maxDaily: 'Per schedule', renalAdjust: false },
      ],
    },
    {
      id: 'kidney_stones',
      name: 'Urolithiasis & Kidney Stones',
      medications: [
        // Medical Expulsive Therapy
        { name: 'Tamsulosin (MET)', genericName: 'Tamsulosin', doses: ['400mcg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '400mcg', renalAdjust: false },
        { name: 'Nifedipine (MET)', genericName: 'Nifedipine', doses: ['30mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '30mg', renalAdjust: false },
        // Prevention - Calcium Stones
        { name: 'Potassium Citrate (Stones)', genericName: 'Potassium Citrate', doses: ['10mEq', '15mEq', '20mEq'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '100mEq', renalAdjust: true },
        { name: 'Sodium Citrate (Stones)', genericName: 'Sodium Citrate', doses: ['10mEq', '30mEq'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '90mEq', renalAdjust: true },
        { name: 'Thiazide (Stones)', genericName: 'Hydrochlorothiazide', doses: ['12.5mg', '25mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mg', renalAdjust: true },
        { name: 'Indapamide (Stones)', genericName: 'Indapamide', doses: ['1.25mg', '2.5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2.5mg', renalAdjust: true },
        { name: 'Chlorthalidone (Stones)', genericName: 'Chlorthalidone', doses: ['12.5mg', '25mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '25mg', renalAdjust: true },
        // Uric Acid Stones
        { name: 'Allopurinol (Stones)', genericName: 'Allopurinol', doses: ['100mg', '200mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '800mg', renalAdjust: true },
        { name: 'Febuxostat (Stones)', genericName: 'Febuxostat', doses: ['40mg', '80mg', '120mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '120mg', renalAdjust: true },
        // Cystine Stones
        { name: 'Tiopronin', genericName: 'Tiopronin', doses: ['100mg', '200mg', '250mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '2g', renalAdjust: true },
        { name: 'Penicillamine (Stones)', genericName: 'Penicillamine', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '2g', renalAdjust: true },
        { name: 'Captopril (Cystinuria)', genericName: 'Captopril', doses: ['25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '150mg', renalAdjust: true },
        // Struvite Stones
        { name: 'Acetohydroxamic Acid', genericName: 'AHA', doses: ['250mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '1.5g', renalAdjust: true },
        // Dissolution Therapy
        { name: 'Potassium Bicarbonate/Citrate', genericName: 'Polycitra-K', doses: ['10mEq', '20mEq'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '60mEq', renalAdjust: true },
      ],
    },
  ],
};

// ============================================
// 8. MALIGNANT DISEASE & IMMUNOSUPPRESSION
// ============================================
export const malignantImmunoMedications: BNFCategory = {
  id: 'malignant_immuno',
  name: 'Malignant Disease & Immunosuppression',
  subcategories: [
    {
      id: 'alkylating_agents',
      name: 'Alkylating Agents',
      medications: [
        // Nitrogen Mustards
        { name: 'Cyclophosphamide', genericName: 'Cyclophosphamide', doses: ['50mg', '100mg', '200mg', '500mg', '1g', '2g', '750mg/m²', '1.5g/m²'], routes: ['oral', 'intravenous'], frequency: ['Once daily oral', 'Various IV protocols'], maxDaily: 'Protocol-dependent', renalAdjust: true },
        { name: 'Ifosfamide', genericName: 'Ifosfamide', doses: ['1g', '2g', '1.2-3g/m²'], routes: ['intravenous'], frequency: ['Per protocol'], maxDaily: '3g/m²', renalAdjust: true, specialInstructions: 'Give with Mesna' },
        { name: 'Melphalan', genericName: 'Melphalan', doses: ['2mg', '5mg', '0.15mg/kg', '140-200mg/m²'], routes: ['oral', 'intravenous'], frequency: ['Once daily', 'Per protocol'], maxDaily: 'Protocol-dependent', renalAdjust: true },
        { name: 'Chlorambucil', genericName: 'Chlorambucil', doses: ['2mg', '5mg', '10mg', '0.1-0.2mg/kg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Bendamustine', genericName: 'Bendamustine', doses: ['90mg/m²', '100mg/m²', '120mg/m²'], routes: ['intravenous'], frequency: ['Days 1-2 every 28 days'], maxDaily: '120mg/m²', renalAdjust: true },
        { name: 'Estramustine', genericName: 'Estramustine', doses: ['140mg', '280mg', '560mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '560mg', renalAdjust: false },
        // Nitrosoureas
        { name: 'Carmustine', genericName: 'BCNU', doses: ['75-100mg/m²', '150-200mg/m²', 'Wafer 7.7mg x8'], routes: ['intravenous', 'implant'], frequency: ['Every 6 weeks'], maxDaily: '200mg/m²', renalAdjust: true },
        { name: 'Lomustine', genericName: 'CCNU', doses: ['100mg/m²', '130mg/m²'], routes: ['oral'], frequency: ['Every 6 weeks'], maxDaily: '130mg/m²', renalAdjust: true },
        { name: 'Streptozocin', genericName: 'Streptozocin', doses: ['500mg/m²', '1g/m²'], routes: ['intravenous'], frequency: ['Daily x 5, every 6 weeks'], maxDaily: '1.5g/m²', renalAdjust: true },
        // Other Alkylating
        { name: 'Busulfan', genericName: 'Busulfan', doses: ['2mg', '4mg', '0.8mg/kg IV', '1mg/kg IV'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '6 hourly IV'], maxDaily: 'Protocol-dependent', renalAdjust: false, hepaticAdjust: true },
        { name: 'Temozolomide', genericName: 'Temozolomide', doses: ['5mg', '20mg', '100mg', '140mg', '180mg', '250mg', '75mg/m²', '150-200mg/m²'], routes: ['oral', 'intravenous'], frequency: ['Once daily x 5 days/28', 'Continuous with RT'], maxDaily: '200mg/m²', renalAdjust: true },
        { name: 'Dacarbazine', genericName: 'DTIC', doses: ['150-250mg/m²', '850-1000mg/m²'], routes: ['intravenous'], frequency: ['Days 1-5 every 21-28 days'], maxDaily: 'Protocol-dependent', renalAdjust: true },
        { name: 'Procarbazine', genericName: 'Procarbazine', doses: ['50mg', '100mg', '100mg/m²'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Thiotepa', genericName: 'Thiotepa', doses: ['15mg', '300mg/m²', '400mg/m²'], routes: ['intravenous', 'intravesical'], frequency: ['Per protocol'], maxDaily: 'Protocol-dependent', renalAdjust: true },
        { name: 'Treosulfan', genericName: 'Treosulfan', doses: ['5g/m²', '7g/m²', '10-14g/m²'], routes: ['oral', 'intravenous'], frequency: ['Per protocol'], maxDaily: 'Protocol-dependent', renalAdjust: true },
      ],
    },
    {
      id: 'antimetabolites',
      name: 'Antimetabolites',
      medications: [
        // Folate Antagonists
        { name: 'Methotrexate', genericName: 'Methotrexate', doses: ['2.5mg', '5mg', '7.5mg', '10mg', '15mg', '20mg', '25mg', '50mg/m²', '1g/m²', '3g/m²', '8g/m²', '12g/m²'], routes: ['oral', 'intramuscular', 'subcutaneous', 'intravenous', 'intrathecal'], frequency: ['Once weekly', 'Per protocol'], maxDaily: 'Protocol-dependent', renalAdjust: true },
        { name: 'Pemetrexed', genericName: 'Pemetrexed', doses: ['500mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days'], maxDaily: '500mg/m²', renalAdjust: true, specialInstructions: 'Folic acid and B12 supplementation required' },
        { name: 'Pralatrexate', genericName: 'Pralatrexate', doses: ['30mg/m²'], routes: ['intravenous'], frequency: ['Weekly x 6 of 7 weeks'], maxDaily: '30mg/m²', renalAdjust: true },
        { name: 'Raltitrexed', genericName: 'Raltitrexed', doses: ['3mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days'], maxDaily: '3mg/m²', renalAdjust: true },
        // Pyrimidine Analogues
        { name: 'Fluorouracil', genericName: '5-FU', doses: ['250mg', '500mg', '400mg/m²', '600mg/m²', '1000mg/m²', '2400mg/m²'], routes: ['intravenous', 'topical'], frequency: ['Bolus or continuous infusion'], maxDaily: 'Protocol-dependent', renalAdjust: true },
        { name: 'Capecitabine', genericName: 'Capecitabine', doses: ['150mg', '500mg', '1000mg/m²', '1250mg/m²'], routes: ['oral'], frequency: ['12 hourly days 1-14 of 21'], maxDaily: '2500mg/m²', renalAdjust: true },
        { name: 'Tegafur/Uracil', genericName: 'UFT', doses: ['100/224mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '300mg tegafur', renalAdjust: true },
        { name: 'Tegafur/Gimeracil/Oteracil', genericName: 'S-1', doses: ['15mg', '20mg', '25mg'], routes: ['oral'], frequency: ['12 hourly x 28 days of 42'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Trifluridine/Tipiracil', genericName: 'Lonsurf', doses: ['15/6.14mg', '20/8.19mg'], routes: ['oral'], frequency: ['12 hourly days 1-5, 8-12 of 28'], maxDaily: '35mg/m²', renalAdjust: true },
        { name: 'Cytarabine', genericName: 'Ara-C', doses: ['100-200mg/m²', '1-3g/m²', '10-30mg intrathecal'], routes: ['intravenous', 'subcutaneous', 'intrathecal'], frequency: ['Per protocol'], maxDaily: '3g/m²', renalAdjust: true },
        { name: 'Gemcitabine', genericName: 'Gemcitabine', doses: ['1000mg/m²', '1250mg/m²'], routes: ['intravenous'], frequency: ['Weekly x 3 of 4, or days 1,8 of 21'], maxDaily: '1250mg/m²', renalAdjust: false },
        { name: 'Azacitidine', genericName: 'Azacitidine', doses: ['75mg/m²'], routes: ['subcutaneous', 'intravenous'], frequency: ['Daily x 7 of 28 days'], maxDaily: '75mg/m²', renalAdjust: true },
        { name: 'Decitabine', genericName: 'Decitabine', doses: ['15mg/m²', '20mg/m²'], routes: ['intravenous'], frequency: ['8 hourly x 3 days every 6 weeks'], maxDaily: '45mg/m²', renalAdjust: true },
        { name: 'Decitabine/Cedazuridine', genericName: 'Inqovi', doses: ['35/100mg'], routes: ['oral'], frequency: ['Once daily x 5 days of 28'], maxDaily: '35/100mg', renalAdjust: true },
        // Purine Analogues
        { name: 'Mercaptopurine', genericName: '6-MP', doses: ['50mg', '1.5-2.5mg/kg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: true },
        { name: 'Thioguanine', genericName: '6-TG', doses: ['40mg', '2-3mg/kg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Fludarabine', genericName: 'Fludarabine', doses: ['25mg/m²', '40mg/m²'], routes: ['intravenous', 'oral'], frequency: ['Daily x 5 every 28 days'], maxDaily: '40mg/m²', renalAdjust: true },
        { name: 'Cladribine', genericName: '2-CdA', doses: ['0.09mg/kg', '0.14mg/kg', '10mg'], routes: ['intravenous', 'subcutaneous', 'oral'], frequency: ['Daily x 5-7'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Pentostatin', genericName: 'Deoxycoformycin', doses: ['4mg/m²'], routes: ['intravenous'], frequency: ['Every 2 weeks'], maxDaily: '4mg/m²', renalAdjust: true },
        { name: 'Clofarabine', genericName: 'Clofarabine', doses: ['52mg/m²'], routes: ['intravenous'], frequency: ['Daily x 5 every 2-6 weeks'], maxDaily: '52mg/m²', renalAdjust: true },
        { name: 'Nelarabine', genericName: 'Nelarabine', doses: ['650mg/m²', '1500mg/m²'], routes: ['intravenous'], frequency: ['Days 1,3,5 every 21 days'], maxDaily: '1500mg/m²', renalAdjust: true },
        { name: 'Hydroxyurea', genericName: 'Hydroxycarbamide', doses: ['500mg', '1g', '15-30mg/kg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '35mg/kg', renalAdjust: true },
      ],
    },
    {
      id: 'cytotoxic_antibiotics',
      name: 'Cytotoxic Antibiotics',
      medications: [
        // Anthracyclines
        { name: 'Doxorubicin', genericName: 'Doxorubicin', doses: ['10mg', '50mg', '60-75mg/m²', '20mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days', 'Weekly'], maxDaily: '75mg/m²', renalAdjust: false, hepaticAdjust: true, specialInstructions: 'Cumulative max 450-550mg/m²' },
        { name: 'Liposomal Doxorubicin', genericName: 'Doxil/Caelyx', doses: ['20mg/m²', '30mg/m²', '40mg/m²', '50mg/m²'], routes: ['intravenous'], frequency: ['Every 28 days'], maxDaily: '50mg/m²', renalAdjust: false },
        { name: 'Daunorubicin', genericName: 'Daunorubicin', doses: ['25mg/m²', '45-60mg/m²'], routes: ['intravenous'], frequency: ['Days 1-3 induction'], maxDaily: '60mg/m²', renalAdjust: false, hepaticAdjust: true },
        { name: 'Liposomal Daunorubicin/Cytarabine', genericName: 'Vyxeos', doses: ['44/100mg/m²'], routes: ['intravenous'], frequency: ['Days 1,3,5'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Epirubicin', genericName: 'Epirubicin', doses: ['50mg', '100mg', '60-100mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days'], maxDaily: '120mg/m²', renalAdjust: false, hepaticAdjust: true },
        { name: 'Idarubicin', genericName: 'Idarubicin', doses: ['5mg', '10mg', '12mg/m²', '8mg/m² oral'], routes: ['intravenous', 'oral'], frequency: ['Days 1-3'], maxDaily: '12mg/m²', renalAdjust: false, hepaticAdjust: true },
        { name: 'Mitoxantrone', genericName: 'Mitoxantrone', doses: ['10mg', '12-14mg/m²'], routes: ['intravenous'], frequency: ['Days 1-3', 'Every 21 days'], maxDaily: '14mg/m²', renalAdjust: false },
        { name: 'Pixantrone', genericName: 'Pixantrone', doses: ['50mg/m²'], routes: ['intravenous'], frequency: ['Days 1,8,15 every 28 days'], maxDaily: '50mg/m²', renalAdjust: false },
        // Other Antibiotics
        { name: 'Bleomycin', genericName: 'Bleomycin', doses: ['10 units', '15 units', '30 units', '10-20 units/m²'], routes: ['intravenous', 'intramuscular', 'subcutaneous', 'intrapleural'], frequency: ['Weekly', 'Per protocol'], maxDaily: '30 units', renalAdjust: true, specialInstructions: 'Cumulative max 400 units' },
        { name: 'Mitomycin C', genericName: 'Mitomycin', doses: ['5mg', '10mg', '20mg', '10-20mg/m²', '40mg intravesical'], routes: ['intravenous', 'intravesical'], frequency: ['Every 6-8 weeks', 'Weekly intravesical'], maxDaily: '20mg/m²', renalAdjust: true },
        { name: 'Dactinomycin', genericName: 'Actinomycin D', doses: ['0.5mg', '0.015mg/kg', '1.25mg/m²'], routes: ['intravenous'], frequency: ['Per protocol'], maxDaily: '0.5mg/day', renalAdjust: false },
        { name: 'Plicamycin', genericName: 'Mithramycin', doses: ['25mcg/kg'], routes: ['intravenous'], frequency: ['Daily x 8-10 days'], maxDaily: '30mcg/kg', renalAdjust: true },
      ],
    },
    {
      id: 'vinca_taxanes',
      name: 'Vinca Alkaloids & Taxanes',
      medications: [
        // Vinca Alkaloids
        { name: 'Vincristine', genericName: 'Vincristine', doses: ['1mg', '2mg', '1.4mg/m²'], routes: ['intravenous'], frequency: ['Weekly', 'Per protocol'], maxDaily: '2mg cap', renalAdjust: false, hepaticAdjust: true },
        { name: 'Vinblastine', genericName: 'Vinblastine', doses: ['6mg/m²', '10mg/m²'], routes: ['intravenous'], frequency: ['Weekly', 'Every 2 weeks'], maxDaily: '10mg/m²', renalAdjust: false, hepaticAdjust: true },
        { name: 'Vinorelbine', genericName: 'Vinorelbine', doses: ['25-30mg/m²', '60-80mg/m² oral'], routes: ['intravenous', 'oral'], frequency: ['Weekly', 'Days 1,8 of 21'], maxDaily: '30mg/m² IV', renalAdjust: false, hepaticAdjust: true },
        { name: 'Vindesine', genericName: 'Vindesine', doses: ['3mg/m²'], routes: ['intravenous'], frequency: ['Weekly'], maxDaily: '4mg/m²', renalAdjust: false, hepaticAdjust: true },
        { name: 'Vinflunine', genericName: 'Vinflunine', doses: ['280-320mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days'], maxDaily: '320mg/m²', renalAdjust: true },
        // Taxanes
        { name: 'Paclitaxel', genericName: 'Paclitaxel', doses: ['135mg/m²', '175mg/m²', '80mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days', 'Weekly'], maxDaily: '175mg/m²', renalAdjust: false, hepaticAdjust: true },
        { name: 'Nab-Paclitaxel', genericName: 'Abraxane', doses: ['100mg/m²', '125mg/m²', '260mg/m²'], routes: ['intravenous'], frequency: ['Weekly x 3 of 4', 'Every 21 days'], maxDaily: '260mg/m²', renalAdjust: false },
        { name: 'Docetaxel', genericName: 'Docetaxel', doses: ['60mg/m²', '75mg/m²', '100mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days'], maxDaily: '100mg/m²', renalAdjust: false, hepaticAdjust: true },
        { name: 'Cabazitaxel', genericName: 'Cabazitaxel', doses: ['20mg/m²', '25mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days'], maxDaily: '25mg/m²', renalAdjust: false, hepaticAdjust: true },
        // Epothilones
        { name: 'Ixabepilone', genericName: 'Ixabepilone', doses: ['40mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days'], maxDaily: '40mg/m²', renalAdjust: false, hepaticAdjust: true },
      ],
    },
    {
      id: 'topoisomerase_inhibitors',
      name: 'Topoisomerase Inhibitors',
      medications: [
        // Topoisomerase I Inhibitors
        { name: 'Irinotecan', genericName: 'Irinotecan', doses: ['125mg/m²', '180mg/m²', '300-350mg/m²'], routes: ['intravenous'], frequency: ['Weekly x 4 of 6', 'Every 2-3 weeks'], maxDaily: '350mg/m²', renalAdjust: false, hepaticAdjust: true },
        { name: 'Liposomal Irinotecan', genericName: 'Onivyde', doses: ['70mg/m²', '80mg/m²'], routes: ['intravenous'], frequency: ['Every 2 weeks'], maxDaily: '80mg/m²', renalAdjust: false },
        { name: 'Topotecan', genericName: 'Topotecan', doses: ['1.5mg/m²', '2.3mg/m² oral', '4mg/m²'], routes: ['intravenous', 'oral'], frequency: ['Daily x 5 every 21 days', 'Days 1-5'], maxDaily: '4mg/m²', renalAdjust: true },
        { name: 'Sacituzumab Govitecan', genericName: 'Trodelvy', doses: ['10mg/kg'], routes: ['intravenous'], frequency: ['Days 1,8 of 21'], maxDaily: '10mg/kg', renalAdjust: false },
        // Topoisomerase II Inhibitors
        { name: 'Etoposide', genericName: 'VP-16', doses: ['50mg', '100mg', '100mg/m²', '200mg/m²'], routes: ['oral', 'intravenous'], frequency: ['Daily x 3-5 days'], maxDaily: '200mg/m²', renalAdjust: true },
        { name: 'Etoposide Phosphate', genericName: 'Etopophos', doses: ['100mg/m²'], routes: ['intravenous'], frequency: ['Days 1-3'], maxDaily: '100mg/m²', renalAdjust: true },
        { name: 'Teniposide', genericName: 'VM-26', doses: ['100mg/m²', '165mg/m²'], routes: ['intravenous'], frequency: ['Twice weekly x 4'], maxDaily: '165mg/m²', renalAdjust: true },
      ],
    },
    {
      id: 'platinum_compounds',
      name: 'Platinum Compounds',
      medications: [
        { name: 'Cisplatin', genericName: 'Cisplatin', doses: ['20mg/m²', '50mg/m²', '75-100mg/m²'], routes: ['intravenous'], frequency: ['Every 21 days', 'Days 1-5'], maxDaily: '100mg/m²', renalAdjust: true, specialInstructions: 'Prehydration essential' },
        { name: 'Carboplatin', genericName: 'Carboplatin', doses: ['AUC 4', 'AUC 5', 'AUC 6', 'AUC 7', '300-400mg/m²'], routes: ['intravenous'], frequency: ['Every 21-28 days'], maxDaily: 'AUC 7', renalAdjust: true },
        { name: 'Oxaliplatin', genericName: 'Oxaliplatin', doses: ['85mg/m²', '130mg/m²'], routes: ['intravenous'], frequency: ['Every 2-3 weeks'], maxDaily: '130mg/m²', renalAdjust: true },
        { name: 'Nedaplatin', genericName: 'Nedaplatin', doses: ['80-100mg/m²'], routes: ['intravenous'], frequency: ['Every 3-4 weeks'], maxDaily: '100mg/m²', renalAdjust: true },
        { name: 'Lobaplatin', genericName: 'Lobaplatin', doses: ['30-50mg/m²'], routes: ['intravenous'], frequency: ['Every 3-4 weeks'], maxDaily: '50mg/m²', renalAdjust: true },
      ],
    },
    {
      id: 'targeted_therapy',
      name: 'Targeted Therapy - Tyrosine Kinase Inhibitors',
      medications: [
        // BCR-ABL TKIs
        { name: 'Imatinib', genericName: 'Imatinib', doses: ['100mg', '400mg', '600mg', '800mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '800mg', renalAdjust: true },
        { name: 'Dasatinib', genericName: 'Dasatinib', doses: ['20mg', '50mg', '70mg', '100mg', '140mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '180mg', renalAdjust: false },
        { name: 'Nilotinib', genericName: 'Nilotinib', doses: ['150mg', '200mg', '300mg', '400mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '800mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Bosutinib', genericName: 'Bosutinib', doses: ['100mg', '400mg', '500mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '600mg', renalAdjust: true },
        { name: 'Ponatinib', genericName: 'Ponatinib', doses: ['15mg', '30mg', '45mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '45mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Asciminib', genericName: 'Asciminib', doses: ['40mg', '80mg', '200mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '200mg', renalAdjust: false },
        // EGFR TKIs
        { name: 'Erlotinib', genericName: 'Erlotinib', doses: ['100mg', '150mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Gefitinib', genericName: 'Gefitinib', doses: ['250mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '250mg', renalAdjust: false },
        { name: 'Afatinib', genericName: 'Afatinib', doses: ['20mg', '30mg', '40mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mg', renalAdjust: false },
        { name: 'Osimertinib', genericName: 'Osimertinib', doses: ['40mg', '80mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Dacomitinib', genericName: 'Dacomitinib', doses: ['15mg', '30mg', '45mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '45mg', renalAdjust: false },
        { name: 'Mobocertinib', genericName: 'Mobocertinib', doses: ['160mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '160mg', renalAdjust: false },
        // ALK/ROS1 Inhibitors
        { name: 'Crizotinib', genericName: 'Crizotinib', doses: ['200mg', '250mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '500mg', renalAdjust: true },
        { name: 'Ceritinib', genericName: 'Ceritinib', doses: ['150mg', '450mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '750mg', renalAdjust: false },
        { name: 'Alectinib', genericName: 'Alectinib', doses: ['150mg', '600mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1200mg', renalAdjust: false },
        { name: 'Brigatinib', genericName: 'Brigatinib', doses: ['90mg', '180mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '180mg', renalAdjust: false },
        { name: 'Lorlatinib', genericName: 'Lorlatinib', doses: ['25mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Entrectinib', genericName: 'Entrectinib', doses: ['100mg', '200mg', '600mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '600mg', renalAdjust: false },
        // Multi-kinase/VEGFR TKIs
        { name: 'Sorafenib', genericName: 'Sorafenib', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '800mg', renalAdjust: false },
        { name: 'Sunitinib', genericName: 'Sunitinib', doses: ['12.5mg', '25mg', '37.5mg', '50mg'], routes: ['oral'], frequency: ['Once daily 4/6 weeks or continuous'], maxDaily: '50mg', renalAdjust: false },
        { name: 'Pazopanib', genericName: 'Pazopanib', doses: ['200mg', '400mg', '800mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '800mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Axitinib', genericName: 'Axitinib', doses: ['1mg', '3mg', '5mg', '7mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Cabozantinib', genericName: 'Cabozantinib', doses: ['20mg', '40mg', '60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Lenvatinib', genericName: 'Lenvatinib', doses: ['4mg', '8mg', '10mg', '14mg', '18mg', '20mg', '24mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '24mg', renalAdjust: true },
        { name: 'Vandetanib', genericName: 'Vandetanib', doses: ['100mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Regorafenib', genericName: 'Regorafenib', doses: ['40mg', '120mg', '160mg'], routes: ['oral'], frequency: ['Once daily x 21 of 28 days'], maxDaily: '160mg', renalAdjust: false },
        { name: 'Tivozanib', genericName: 'Tivozanib', doses: ['1.34mg'], routes: ['oral'], frequency: ['Once daily x 21 of 28 days'], maxDaily: '1.34mg', renalAdjust: false },
      ],
    },
    {
      id: 'immunotherapy',
      name: 'Immunotherapy - Checkpoint Inhibitors',
      medications: [
        // PD-1 Inhibitors
        { name: 'Pembrolizumab', genericName: 'Pembrolizumab', doses: ['200mg', '400mg', '2mg/kg'], routes: ['intravenous'], frequency: ['Every 3 weeks', 'Every 6 weeks'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Nivolumab', genericName: 'Nivolumab', doses: ['240mg', '480mg', '3mg/kg', '1mg/kg'], routes: ['intravenous'], frequency: ['Every 2 weeks', 'Every 4 weeks'], maxDaily: '480mg', renalAdjust: false },
        { name: 'Cemiplimab', genericName: 'Cemiplimab', doses: ['350mg'], routes: ['intravenous'], frequency: ['Every 3 weeks'], maxDaily: '350mg', renalAdjust: false },
        { name: 'Dostarlimab', genericName: 'Dostarlimab', doses: ['500mg', '1000mg'], routes: ['intravenous'], frequency: ['Every 3 weeks x 4, then every 6 weeks'], maxDaily: '1000mg', renalAdjust: false },
        { name: 'Toripalimab', genericName: 'Toripalimab', doses: ['240mg'], routes: ['intravenous'], frequency: ['Every 3 weeks'], maxDaily: '240mg', renalAdjust: false },
        // PD-L1 Inhibitors
        { name: 'Atezolizumab', genericName: 'Atezolizumab', doses: ['840mg', '1200mg', '1680mg'], routes: ['intravenous'], frequency: ['Every 2-4 weeks'], maxDaily: '1680mg', renalAdjust: false },
        { name: 'Durvalumab', genericName: 'Durvalumab', doses: ['10mg/kg', '1500mg'], routes: ['intravenous'], frequency: ['Every 2-4 weeks'], maxDaily: '1500mg', renalAdjust: false },
        { name: 'Avelumab', genericName: 'Avelumab', doses: ['800mg'], routes: ['intravenous'], frequency: ['Every 2 weeks'], maxDaily: '800mg', renalAdjust: false },
        // CTLA-4 Inhibitors
        { name: 'Ipilimumab', genericName: 'Ipilimumab', doses: ['1mg/kg', '3mg/kg', '10mg/kg'], routes: ['intravenous'], frequency: ['Every 3-6 weeks'], maxDaily: '10mg/kg', renalAdjust: false },
        { name: 'Tremelimumab', genericName: 'Tremelimumab', doses: ['75mg', '300mg'], routes: ['intravenous'], frequency: ['Single dose or every 4 weeks'], maxDaily: '300mg', renalAdjust: false },
        // LAG-3 Inhibitor
        { name: 'Relatlimab', genericName: 'Opdualag (with Nivolumab)', doses: ['160mg/480mg'], routes: ['intravenous'], frequency: ['Every 4 weeks'], maxDaily: 'Fixed dose combo', renalAdjust: false },
      ],
    },
    {
      id: 'monoclonal_antibodies',
      name: 'Monoclonal Antibodies - Non-checkpoint',
      medications: [
        // Anti-CD20
        { name: 'Rituximab', genericName: 'Rituximab', doses: ['375mg/m²', '500mg', '1000mg', '1400mg SC'], routes: ['intravenous', 'subcutaneous'], frequency: ['Weekly x 4-8', 'Every 2-6 months'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Obinutuzumab', genericName: 'Obinutuzumab', doses: ['100mg', '900mg', '1000mg'], routes: ['intravenous'], frequency: ['Per protocol'], maxDaily: '1000mg', renalAdjust: false },
        { name: 'Ofatumumab', genericName: 'Ofatumumab', doses: ['300mg', '1000mg', '2000mg', '20mg SC'], routes: ['intravenous', 'subcutaneous'], frequency: ['Per protocol'], maxDaily: '2000mg', renalAdjust: false },
        // Anti-HER2
        { name: 'Trastuzumab', genericName: 'Trastuzumab', doses: ['4-8mg/kg loading', '2-6mg/kg', '600mg SC'], routes: ['intravenous', 'subcutaneous'], frequency: ['Weekly', 'Every 3 weeks'], maxDaily: '8mg/kg loading', renalAdjust: false },
        { name: 'Pertuzumab', genericName: 'Pertuzumab', doses: ['840mg loading', '420mg'], routes: ['intravenous'], frequency: ['Every 3 weeks'], maxDaily: '840mg', renalAdjust: false },
        { name: 'Trastuzumab/Pertuzumab', genericName: 'Phesgo', doses: ['1200/600mg loading', '600/600mg'], routes: ['subcutaneous'], frequency: ['Every 3 weeks'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Trastuzumab Deruxtecan', genericName: 'Enhertu', doses: ['5.4mg/kg', '6.4mg/kg'], routes: ['intravenous'], frequency: ['Every 3 weeks'], maxDaily: '6.4mg/kg', renalAdjust: false },
        { name: 'Trastuzumab Emtansine', genericName: 'Kadcyla', doses: ['3.6mg/kg'], routes: ['intravenous'], frequency: ['Every 3 weeks'], maxDaily: '3.6mg/kg', renalAdjust: false },
        { name: 'Margetuximab', genericName: 'Margetuximab', doses: ['15mg/kg'], routes: ['intravenous'], frequency: ['Every 3 weeks'], maxDaily: '15mg/kg', renalAdjust: false },
        // Anti-EGFR
        { name: 'Cetuximab', genericName: 'Cetuximab', doses: ['400mg/m² loading', '250mg/m²'], routes: ['intravenous'], frequency: ['Weekly'], maxDaily: '400mg/m²', renalAdjust: false },
        { name: 'Panitumumab', genericName: 'Panitumumab', doses: ['6mg/kg'], routes: ['intravenous'], frequency: ['Every 2 weeks'], maxDaily: '6mg/kg', renalAdjust: false },
        { name: 'Necitumumab', genericName: 'Necitumumab', doses: ['800mg'], routes: ['intravenous'], frequency: ['Days 1,8 every 21 days'], maxDaily: '800mg', renalAdjust: false },
        // Anti-VEGF
        { name: 'Bevacizumab', genericName: 'Bevacizumab', doses: ['5mg/kg', '7.5mg/kg', '10mg/kg', '15mg/kg'], routes: ['intravenous'], frequency: ['Every 2-3 weeks'], maxDaily: '15mg/kg', renalAdjust: false },
        { name: 'Ramucirumab', genericName: 'Ramucirumab', doses: ['8mg/kg', '10mg/kg'], routes: ['intravenous'], frequency: ['Every 2 weeks'], maxDaily: '10mg/kg', renalAdjust: false },
        // Other
        { name: 'Brentuximab Vedotin', genericName: 'Adcetris', doses: ['1.2mg/kg', '1.8mg/kg'], routes: ['intravenous'], frequency: ['Every 3 weeks'], maxDaily: '1.8mg/kg max 180mg', renalAdjust: false },
        { name: 'Daratumumab', genericName: 'Daratumumab', doses: ['16mg/kg', '1800mg SC'], routes: ['intravenous', 'subcutaneous'], frequency: ['Weekly then monthly'], maxDaily: '16mg/kg', renalAdjust: false },
        { name: 'Isatuximab', genericName: 'Isatuximab', doses: ['10mg/kg'], routes: ['intravenous'], frequency: ['Weekly x 4 then every 2 weeks'], maxDaily: '10mg/kg', renalAdjust: false },
        { name: 'Elotuzumab', genericName: 'Elotuzumab', doses: ['10mg/kg', '20mg/kg'], routes: ['intravenous'], frequency: ['Weekly x 8 then every 2 weeks'], maxDaily: '20mg/kg', renalAdjust: false },
        { name: 'Alemtuzumab', genericName: 'Alemtuzumab', doses: ['3mg', '10mg', '30mg', '12mg'], routes: ['intravenous', 'subcutaneous'], frequency: ['Escalating daily x 5'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Dinutuximab', genericName: 'Dinutuximab', doses: ['17.5mg/m²'], routes: ['intravenous'], frequency: ['Days 4-7 per cycle'], maxDaily: '17.5mg/m²', renalAdjust: false },
        { name: 'Mogamulizumab', genericName: 'Mogamulizumab', doses: ['1mg/kg'], routes: ['intravenous'], frequency: ['Weekly x 4 then every 2 weeks'], maxDaily: '1mg/kg', renalAdjust: false },
        { name: 'Polatuzumab Vedotin', genericName: 'Polivy', doses: ['1.8mg/kg'], routes: ['intravenous'], frequency: ['Every 21 days'], maxDaily: '1.8mg/kg', renalAdjust: false },
        { name: 'Enfortumab Vedotin', genericName: 'Padcev', doses: ['1.25mg/kg'], routes: ['intravenous'], frequency: ['Days 1,8,15 of 28'], maxDaily: '1.25mg/kg max 125mg', renalAdjust: false },
      ],
    },
    {
      id: 'immunosuppressants',
      name: 'Immunosuppressants',
      medications: [
        // Calcineurin Inhibitors
        { name: 'Ciclosporin', genericName: 'Cyclosporine', doses: ['10mg', '25mg', '50mg', '100mg', '2-5mg/kg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '15mg/kg', renalAdjust: true },
        { name: 'Tacrolimus', genericName: 'Tacrolimus', doses: ['0.5mg', '1mg', '5mg', '0.03-0.2mg/kg', '0.5mg XR', '1mg XR', '5mg XR'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', 'Once daily XR'], maxDaily: '0.3mg/kg', renalAdjust: true },
        { name: 'Tacrolimus Extended Release', genericName: 'Advagraf/Envarsus', doses: ['0.5mg', '1mg', '3mg', '5mg', '0.75mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '0.2mg/kg', renalAdjust: true },
        { name: 'Voclosporin', genericName: 'Voclosporin', doses: ['7.9mg', '23.7mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '47.4mg', renalAdjust: true },
        // Antiproliferatives
        { name: 'Azathioprine', genericName: 'Azathioprine', doses: ['25mg', '50mg', '75mg', '100mg', '1-3mg/kg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '3mg/kg', renalAdjust: true },
        { name: 'Mycophenolate Mofetil', genericName: 'CellCept', doses: ['250mg', '500mg', '1g', '1.5g'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '3g', renalAdjust: true },
        { name: 'Mycophenolate Sodium', genericName: 'Myfortic', doses: ['180mg', '360mg', '720mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1440mg', renalAdjust: true },
        { name: 'Leflunomide', genericName: 'Leflunomide', doses: ['10mg', '20mg', '100mg loading'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Teriflunomide', genericName: 'Teriflunomide', doses: ['7mg', '14mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '14mg', renalAdjust: false },
        // mTOR Inhibitors
        { name: 'Sirolimus', genericName: 'Sirolimus', doses: ['0.5mg', '1mg', '2mg', '6mg loading'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: false },
        { name: 'Everolimus', genericName: 'Everolimus', doses: ['0.25mg', '0.5mg', '0.75mg', '2.5mg', '5mg', '7.5mg', '10mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Temsirolimus', genericName: 'Temsirolimus', doses: ['25mg'], routes: ['intravenous'], frequency: ['Weekly'], maxDaily: '25mg', renalAdjust: false },
        // Anti-thymocyte Globulins
        { name: 'Anti-thymocyte Globulin (Rabbit)', genericName: 'Thymoglobulin', doses: ['1.5mg/kg', '0.5-2mg/kg'], routes: ['intravenous'], frequency: ['Daily x 3-5 days'], maxDaily: '2mg/kg', renalAdjust: false },
        { name: 'Anti-thymocyte Globulin (Horse)', genericName: 'ATGAM', doses: ['10-15mg/kg', '15-40mg/kg'], routes: ['intravenous'], frequency: ['Daily x 8-14 days'], maxDaily: '40mg/kg', renalAdjust: false },
        // Other
        { name: 'Basiliximab', genericName: 'Basiliximab', doses: ['20mg'], routes: ['intravenous'], frequency: ['Day 0 and day 4 post-transplant'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Belatacept', genericName: 'Belatacept', doses: ['5mg/kg', '10mg/kg'], routes: ['intravenous'], frequency: ['Days 1,5, weeks 2,4,8,12, then monthly'], maxDaily: '10mg/kg', renalAdjust: false },
        { name: 'Abatacept', genericName: 'Abatacept', doses: ['125mg', '500mg', '750mg', '1g'], routes: ['subcutaneous', 'intravenous'], frequency: ['Weekly SC', 'Every 4 weeks IV'], maxDaily: '1g', renalAdjust: false },
        { name: 'Belimumab', genericName: 'Belimumab', doses: ['200mg', '400mg', '10mg/kg'], routes: ['subcutaneous', 'intravenous'], frequency: ['Weekly SC', 'Every 4 weeks IV'], maxDaily: '10mg/kg', renalAdjust: false },
        { name: 'Eculizumab', genericName: 'Eculizumab', doses: ['600mg', '900mg', '1200mg'], routes: ['intravenous'], frequency: ['Weekly x 4, then every 2 weeks'], maxDaily: '1200mg', renalAdjust: false },
        { name: 'Ravulizumab', genericName: 'Ravulizumab', doses: ['2400mg', '3000mg', '3600mg loading'], routes: ['intravenous'], frequency: ['Every 8 weeks'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'supportive_oncology',
      name: 'Supportive Care in Oncology',
      medications: [
        // Bone Marrow Stimulants
        { name: 'Filgrastim', genericName: 'G-CSF', doses: ['300mcg', '480mcg', '5mcg/kg', '10mcg/kg'], routes: ['subcutaneous', 'intravenous'], frequency: ['Once daily'], maxDaily: '10mcg/kg', renalAdjust: false },
        { name: 'Pegfilgrastim', genericName: 'PEG-G-CSF', doses: ['6mg'], routes: ['subcutaneous'], frequency: ['Once per chemo cycle'], maxDaily: '6mg', renalAdjust: false },
        { name: 'Lipegfilgrastim', genericName: 'Lonquex', doses: ['6mg'], routes: ['subcutaneous'], frequency: ['Once per chemo cycle'], maxDaily: '6mg', renalAdjust: false },
        { name: 'Sargramostim', genericName: 'GM-CSF', doses: ['250mcg/m²'], routes: ['subcutaneous', 'intravenous'], frequency: ['Once daily'], maxDaily: '500mcg/m²', renalAdjust: false },
        { name: 'Epoetin Alfa', genericName: 'Erythropoietin', doses: ['10000 units', '40000 units', '150 units/kg'], routes: ['subcutaneous', 'intravenous'], frequency: ['1-3 times weekly'], maxDaily: '40000 units', renalAdjust: false },
        { name: 'Darbepoetin Alfa', genericName: 'Darbepoetin', doses: ['25mcg', '40mcg', '60mcg', '100mcg', '150mcg', '200mcg', '300mcg', '500mcg'], routes: ['subcutaneous', 'intravenous'], frequency: ['Weekly', 'Every 2-3 weeks'], maxDaily: '500mcg', renalAdjust: false },
        { name: 'Romiplostim', genericName: 'Romiplostim', doses: ['1mcg/kg', '2-10mcg/kg'], routes: ['subcutaneous'], frequency: ['Weekly'], maxDaily: '10mcg/kg', renalAdjust: false },
        { name: 'Eltrombopag', genericName: 'Eltrombopag', doses: ['25mg', '50mg', '75mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Avatrombopag', genericName: 'Avatrombopag', doses: ['20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: false },
        { name: 'Luspatercept', genericName: 'Luspatercept', doses: ['1mg/kg', '1.33mg/kg', '1.75mg/kg'], routes: ['subcutaneous'], frequency: ['Every 3 weeks'], maxDaily: '1.75mg/kg', renalAdjust: false },
        // Uroprotection
        { name: 'Mesna', genericName: 'Mesna', doses: ['200mg', '400mg', '600mg', '20% of ifosfamide dose'], routes: ['oral', 'intravenous'], frequency: ['With ifosfamide/cyclophosphamide'], maxDaily: 'Equal to oxazaphosphorine dose', renalAdjust: true },
        { name: 'Amifostine', genericName: 'Amifostine', doses: ['740mg/m²', '910mg/m²', '200mg/m²'], routes: ['intravenous'], frequency: ['Before chemo/RT'], maxDaily: '910mg/m²', renalAdjust: false },
        // Rescue Agents
        { name: 'Leucovorin', genericName: 'Folinic Acid', doses: ['15mg', '25mg', '100mg', '350mg', '10-25mg/m²'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly'], maxDaily: 'Per protocol', renalAdjust: true },
        { name: 'Levoleucovorin', genericName: 'Levoleucovorin', doses: ['25mg', '50mg', '100mg', '175mg', '200mg/m²'], routes: ['intravenous'], frequency: ['Per protocol'], maxDaily: '200mg/m²', renalAdjust: true },
        { name: 'Glucarpidase', genericName: 'Glucarpidase', doses: ['50 units/kg'], routes: ['intravenous'], frequency: ['Single dose for MTX toxicity'], maxDaily: '50 units/kg', renalAdjust: false },
        { name: 'Dexrazoxane', genericName: 'Dexrazoxane', doses: ['500mg/m²', '1000mg/m²', '10:1 ratio to doxorubicin'], routes: ['intravenous'], frequency: ['Before anthracycline'], maxDaily: '1000mg/m²', renalAdjust: true },
        { name: 'Rasburicase', genericName: 'Rasburicase', doses: ['0.2mg/kg'], routes: ['intravenous'], frequency: ['Once daily x 5-7 days'], maxDaily: '0.2mg/kg', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 9. NUTRITION & BLOOD
// ============================================
export const nutritionBloodMedications: BNFCategory = {
  id: 'nutrition_blood',
  name: 'Nutrition & Blood',
  subcategories: [
    {
      id: 'iron_deficiency',
      name: 'Iron Deficiency Anaemia',
      medications: [
        // Oral Iron
        { name: 'Ferrous Sulfate', genericName: 'Ferrous Sulfate', doses: ['200mg', '325mg', '300mg modified-release'], routes: ['oral'], frequency: ['Once to 3 times daily'], maxDaily: '600mg', renalAdjust: false, specialInstructions: 'Take on empty stomach, avoid with antacids' },
        { name: 'Ferrous Fumarate', genericName: 'Ferrous Fumarate', doses: ['210mg', '305mg', '322mg'], routes: ['oral'], frequency: ['Once to 3 times daily'], maxDaily: '600mg', renalAdjust: false },
        { name: 'Ferrous Gluconate', genericName: 'Ferrous Gluconate', doses: ['300mg', '325mg'], routes: ['oral'], frequency: ['Once to 3 times daily'], maxDaily: '900mg', renalAdjust: false },
        { name: 'Ferric Maltol', genericName: 'Ferric Maltol', doses: ['30mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '60mg', renalAdjust: true },
        { name: 'Sodium Feredetate', genericName: 'Sodium Feredetate', doses: ['190mg/5ml', '27.5mg Fe/5ml'], routes: ['oral'], frequency: ['Once to 3 times daily'], maxDaily: 'Age-dependent', renalAdjust: false },
        { name: 'Polysaccharide Iron Complex', genericName: 'Polysaccharide Iron', doses: ['150mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '150mg', renalAdjust: false },
        // Parenteral Iron
        { name: 'Iron Sucrose', genericName: 'Venofer', doses: ['100mg', '200mg', '500mg', '2-5mg/kg'], routes: ['intravenous'], frequency: ['1-3 times weekly'], maxDaily: '500mg', renalAdjust: false },
        { name: 'Ferric Carboxymaltose', genericName: 'Ferinject', doses: ['500mg', '750mg', '1000mg', '15mg/kg'], routes: ['intravenous'], frequency: ['Single dose or repeated weekly'], maxDaily: '1000mg', renalAdjust: false },
        { name: 'Iron Isomaltoside 1000', genericName: 'Monofer', doses: ['500mg', '1000mg', '1500mg', '2000mg', '20mg/kg'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '20mg/kg', renalAdjust: false },
        { name: 'Ferric Derisomaltose', genericName: 'Monoferric', doses: ['1000mg', '20mg/kg'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '20mg/kg max 2000mg', renalAdjust: false },
        { name: 'Iron Dextran', genericName: 'Iron Dextran', doses: ['100mg', 'Total dose infusion'], routes: ['intravenous', 'intramuscular'], frequency: ['As required'], maxDaily: 'Calculated replacement', renalAdjust: false },
        { name: 'Ferumoxytol', genericName: 'Feraheme', doses: ['510mg'], routes: ['intravenous'], frequency: ['2 doses 3-8 days apart'], maxDaily: '510mg', renalAdjust: false },
      ],
    },
    {
      id: 'megaloblastic_anaemia',
      name: 'Megaloblastic Anaemia (B12 & Folate)',
      medications: [
        // Vitamin B12
        { name: 'Hydroxocobalamin', genericName: 'Hydroxocobalamin', doses: ['1mg/1ml', '1000mcg'], routes: ['intramuscular'], frequency: ['3x weekly x 2 weeks, then every 3 months'], maxDaily: '1mg', renalAdjust: false },
        { name: 'Cyanocobalamin', genericName: 'Cyanocobalamin', doses: ['50mcg', '100mcg', '250mcg', '500mcg', '1000mcg', '1mg/ml injection'], routes: ['oral', 'intramuscular', 'subcutaneous'], frequency: ['Once daily oral', 'Monthly injection'], maxDaily: '2000mcg oral', renalAdjust: false },
        { name: 'Methylcobalamin', genericName: 'Methylcobalamin', doses: ['500mcg', '1000mcg', '1500mcg', '5000mcg'], routes: ['oral', 'sublingual'], frequency: ['Once daily'], maxDaily: '5000mcg', renalAdjust: false },
        // Folate
        { name: 'Folic Acid', genericName: 'Folic Acid', doses: ['400mcg', '1mg', '5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15mg', renalAdjust: false },
        { name: 'Folinic Acid', genericName: 'Calcium Folinate', doses: ['15mg', '25mg', '100mg', '350mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Per protocol'], maxDaily: 'Per protocol', renalAdjust: true },
      ],
    },
    {
      id: 'haemolytic_aplastic',
      name: 'Haemolytic & Aplastic Anaemia',
      medications: [
        // Immunosuppressants for Aplastic
        { name: 'Anti-thymocyte Globulin (Horse)', genericName: 'ATGAM', doses: ['15mg/kg', '40mg/kg'], routes: ['intravenous'], frequency: ['Daily x 4-14 days'], maxDaily: '40mg/kg', renalAdjust: false },
        { name: 'Anti-thymocyte Globulin (Rabbit)', genericName: 'Thymoglobulin', doses: ['2.5-3.5mg/kg'], routes: ['intravenous'], frequency: ['Daily x 5 days'], maxDaily: '3.5mg/kg', renalAdjust: false },
        { name: 'Ciclosporin', genericName: 'Cyclosporine', doses: ['3-6mg/kg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '15mg/kg', renalAdjust: true },
        { name: 'Eltrombopag', genericName: 'Eltrombopag', doses: ['50mg', '75mg', '100mg', '150mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '150mg', renalAdjust: false },
        // For Haemolysis
        { name: 'Prednisolone', genericName: 'Prednisolone', doses: ['1mg/kg', '60mg', '1-2mg/kg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Rituximab', genericName: 'Rituximab', doses: ['375mg/m²'], routes: ['intravenous'], frequency: ['Weekly x 4'], maxDaily: '375mg/m²', renalAdjust: false },
        { name: 'Eculizumab', genericName: 'Eculizumab', doses: ['600mg', '900mg'], routes: ['intravenous'], frequency: ['Weekly x 4, then every 2 weeks'], maxDaily: '1200mg', renalAdjust: false },
        { name: 'Ravulizumab', genericName: 'Ravulizumab', doses: ['2400mg', '3000mg loading'], routes: ['intravenous'], frequency: ['Every 8 weeks'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Danazol', genericName: 'Danazol', doses: ['200mg', '400mg', '600mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '800mg', renalAdjust: false },
      ],
    },
    {
      id: 'sickle_cell',
      name: 'Sickle Cell Disease',
      medications: [
        { name: 'Hydroxycarbamide', genericName: 'Hydroxyurea', doses: ['500mg', '1g', '15-35mg/kg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '35mg/kg', renalAdjust: true },
        { name: 'Voxelotor', genericName: 'Voxelotor', doses: ['1500mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1500mg', renalAdjust: false },
        { name: 'Crizanlizumab', genericName: 'Crizanlizumab', doses: ['5mg/kg'], routes: ['intravenous'], frequency: ['Weeks 0, 2, then every 4 weeks'], maxDaily: '5mg/kg', renalAdjust: false },
        { name: 'L-Glutamine', genericName: 'L-Glutamine', doses: ['5g', '10g', '15g'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '30g', renalAdjust: false },
        // Pain Crisis Management
        { name: 'Morphine', genericName: 'Morphine', doses: ['5mg', '10mg', '15mg', '0.1-0.15mg/kg IV'], routes: ['oral', 'intravenous', 'subcutaneous'], frequency: ['4 hourly PRN', 'Continuous infusion'], maxDaily: 'As required', renalAdjust: true, controlledDrug: true },
        { name: 'Folic Acid', genericName: 'Folic Acid', doses: ['5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: false },
        { name: 'Penicillin V', genericName: 'Phenoxymethylpenicillin', doses: ['125mg', '250mg', '500mg'], routes: ['oral'], frequency: ['12 hourly prophylaxis'], maxDaily: '500mg', renalAdjust: true },
      ],
    },
    {
      id: 'anticoagulants_antithrombotics',
      name: 'Anticoagulants & Antithrombotics',
      medications: [
        // Vitamin K Antagonists
        { name: 'Warfarin', genericName: 'Warfarin', doses: ['0.5mg', '1mg', '2mg', '2.5mg', '3mg', '4mg', '5mg', '6mg', '7.5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: 'INR-guided', renalAdjust: false, specialInstructions: 'INR monitoring required' },
        { name: 'Acenocoumarol', genericName: 'Nicoumalone', doses: ['1mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: 'INR-guided', renalAdjust: false },
        { name: 'Phenindione', genericName: 'Phenindione', doses: ['10mg', '25mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: false },
        // DOACs
        { name: 'Rivaroxaban', genericName: 'Rivaroxaban', doses: ['2.5mg', '10mg', '15mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Apixaban', genericName: 'Apixaban', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '10mg', renalAdjust: true },
        { name: 'Edoxaban', genericName: 'Edoxaban', doses: ['30mg', '60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '60mg', renalAdjust: true },
        { name: 'Dabigatran', genericName: 'Dabigatran', doses: ['75mg', '110mg', '150mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '300mg', renalAdjust: true },
        // Heparins
        { name: 'Unfractionated Heparin', genericName: 'Heparin', doses: ['1000 units/ml', '5000 units/ml', '25000 units/ml', '5000 units SC', '80 units/kg bolus', '18 units/kg/hr'], routes: ['subcutaneous', 'intravenous'], frequency: ['Continuous infusion', '12 hourly SC'], maxDaily: 'APTT-guided', renalAdjust: false },
        { name: 'Enoxaparin', genericName: 'Enoxaparin', doses: ['20mg', '40mg', '60mg', '80mg', '100mg', '120mg', '150mg', '1mg/kg', '1.5mg/kg'], routes: ['subcutaneous'], frequency: ['Once daily', '12 hourly'], maxDaily: '1.5mg/kg', renalAdjust: true },
        { name: 'Dalteparin', genericName: 'Dalteparin', doses: ['2500 units', '5000 units', '7500 units', '10000 units', '12500 units', '15000 units', '18000 units', '200 units/kg'], routes: ['subcutaneous'], frequency: ['Once daily', '12 hourly'], maxDaily: '18000 units', renalAdjust: true },
        { name: 'Tinzaparin', genericName: 'Tinzaparin', doses: ['3500 units', '4500 units', '175 units/kg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '175 units/kg', renalAdjust: true },
        { name: 'Fondaparinux', genericName: 'Fondaparinux', doses: ['1.5mg', '2.5mg', '5mg', '7.5mg', '10mg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
        // Parenteral Anticoagulants
        { name: 'Argatroban', genericName: 'Argatroban', doses: ['2mcg/kg/min', '0.5-2mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: '10mcg/kg/min', renalAdjust: false, hepaticAdjust: true },
        { name: 'Bivalirudin', genericName: 'Bivalirudin', doses: ['0.75mg/kg bolus', '1.75mg/kg/hr'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: '2.5mg/kg/hr', renalAdjust: true },
        { name: 'Danaparoid', genericName: 'Danaparoid', doses: ['750 units', '1250 units', '1500 units', '2000 units', '2500 units'], routes: ['subcutaneous', 'intravenous'], frequency: ['12 hourly', 'Continuous infusion'], maxDaily: 'Per protocol', renalAdjust: true },
        // Reversal Agents
        { name: 'Protamine Sulfate', genericName: 'Protamine', doses: ['1mg per 100 units heparin', '50mg max'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '50mg', renalAdjust: false },
        { name: 'Idarucizumab', genericName: 'Praxbind', doses: ['5g (2x2.5g vials)'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '5g', renalAdjust: false },
        { name: 'Andexanet Alfa', genericName: 'Ondexxya', doses: ['400mg bolus + 4mg/min x 2hr', '800mg bolus + 8mg/min x 2hr'], routes: ['intravenous'], frequency: ['Single course'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Vitamin K1', genericName: 'Phytomenadione', doses: ['1mg', '2mg', '5mg', '10mg'], routes: ['oral', 'intravenous'], frequency: ['Single dose, repeat as needed'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Prothrombin Complex Concentrate', genericName: 'Beriplex/Octaplex', doses: ['25-50 units/kg'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '50 units/kg', renalAdjust: false },
      ],
    },
    {
      id: 'antiplatelets',
      name: 'Antiplatelet Drugs',
      medications: [
        { name: 'Aspirin', genericName: 'Acetylsalicylic Acid', doses: ['75mg', '100mg', '150mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg antiplatelet', renalAdjust: true },
        { name: 'Clopidogrel', genericName: 'Clopidogrel', doses: ['75mg', '300mg loading', '600mg loading'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '75mg maintenance', renalAdjust: false },
        { name: 'Prasugrel', genericName: 'Prasugrel', doses: ['5mg', '10mg', '60mg loading'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Ticagrelor', genericName: 'Ticagrelor', doses: ['60mg', '90mg', '180mg loading'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '180mg', renalAdjust: false },
        { name: 'Cangrelor', genericName: 'Cangrelor', doses: ['30mcg/kg bolus', '4mcg/kg/min'], routes: ['intravenous'], frequency: ['Bolus + 2hr infusion'], maxDaily: '4mcg/kg/min', renalAdjust: false },
        { name: 'Dipyridamole', genericName: 'Dipyridamole', doses: ['100mg', '200mg MR'], routes: ['oral'], frequency: ['8 hourly', '12 hourly MR'], maxDaily: '600mg', renalAdjust: false },
        { name: 'Dipyridamole/Aspirin', genericName: 'Aggrenox', doses: ['200mg/25mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '400mg/50mg', renalAdjust: true },
        { name: 'Cilostazol', genericName: 'Cilostazol', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Ticlopidine', genericName: 'Ticlopidine', doses: ['250mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '500mg', renalAdjust: true },
        // GP IIb/IIIa Inhibitors
        { name: 'Abciximab', genericName: 'Abciximab', doses: ['0.25mg/kg bolus', '0.125mcg/kg/min'], routes: ['intravenous'], frequency: ['Bolus + 12hr infusion'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Eptifibatide', genericName: 'Eptifibatide', doses: ['180mcg/kg bolus', '2mcg/kg/min'], routes: ['intravenous'], frequency: ['Bolus x2 + 18-24hr infusion'], maxDaily: 'Per protocol', renalAdjust: true },
        { name: 'Tirofiban', genericName: 'Tirofiban', doses: ['25mcg/kg bolus', '0.15mcg/kg/min'], routes: ['intravenous'], frequency: ['Bolus + 18-24hr infusion'], maxDaily: 'Per protocol', renalAdjust: true },
      ],
    },
    {
      id: 'haemostatics',
      name: 'Haemostatics & Antifibrinolytics',
      medications: [
        { name: 'Tranexamic Acid', genericName: 'Tranexamic Acid', doses: ['500mg', '650mg', '1g', '1-1.5g IV', '10-15mg/kg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '6-8 hourly IV'], maxDaily: '4g', renalAdjust: true },
        { name: 'Aminocaproic Acid', genericName: 'Aminocaproic Acid', doses: ['5g', '1g/hr', '4-5g loading'], routes: ['oral', 'intravenous'], frequency: ['Continuous or 6 hourly'], maxDaily: '24g', renalAdjust: true },
        { name: 'Desmopressin', genericName: 'DDAVP', doses: ['0.3mcg/kg', '300mcg nasal', '150mcg nasal'], routes: ['intravenous', 'subcutaneous', 'nasal'], frequency: ['Pre-procedure', 'As needed'], maxDaily: '0.4mcg/kg', renalAdjust: true },
        { name: 'Vitamin K1', genericName: 'Phytomenadione', doses: ['1mg', '2mg', '5mg', '10mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Etamsylate', genericName: 'Etamsylate', doses: ['500mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly'], maxDaily: '2g', renalAdjust: false },
        // Clotting Factors
        { name: 'Factor VIII', genericName: 'Antihemophilic Factor', doses: ['Per body weight and target level'], routes: ['intravenous'], frequency: ['As needed'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Factor IX', genericName: 'Factor IX Concentrate', doses: ['Per body weight and target level'], routes: ['intravenous'], frequency: ['As needed'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Factor VIIa (Recombinant)', genericName: 'NovoSeven', doses: ['90mcg/kg', '270mcg/kg'], routes: ['intravenous'], frequency: ['Every 2-3 hours'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Factor XIII', genericName: 'Factor XIII Concentrate', doses: ['40 units/kg'], routes: ['intravenous'], frequency: ['Monthly prophylaxis'], maxDaily: '40 units/kg', renalAdjust: false },
        { name: 'Emicizumab', genericName: 'Emicizumab', doses: ['3mg/kg weekly x4', '1.5mg/kg weekly', '3mg/kg every 2 weeks', '6mg/kg every 4 weeks'], routes: ['subcutaneous'], frequency: ['Weekly to monthly'], maxDaily: '6mg/kg every 4 weeks', renalAdjust: false },
        { name: 'Fibrinogen Concentrate', genericName: 'RiaSTAP/Haemocomplettan', doses: ['70mg/kg', '4g'], routes: ['intravenous'], frequency: ['As needed'], maxDaily: '8g', renalAdjust: false },
        { name: 'Prothrombin Complex Concentrate', genericName: 'Beriplex', doses: ['25-50 units/kg'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '50 units/kg', renalAdjust: false },
        { name: 'Fresh Frozen Plasma', genericName: 'FFP', doses: ['10-15ml/kg', '15-20ml/kg'], routes: ['intravenous'], frequency: ['As needed'], maxDaily: '30ml/kg', renalAdjust: false },
        { name: 'Cryoprecipitate', genericName: 'Cryoprecipitate', doses: ['1-2 pools (10 units)', '1 pool per 5-10kg'], routes: ['intravenous'], frequency: ['As needed'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Platelets', genericName: 'Platelet Concentrate', doses: ['1 pool (4-6 units)', '1 apheresis unit'], routes: ['intravenous'], frequency: ['As needed'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'electrolytes',
      name: 'Electrolyte Replacement',
      medications: [
        // Potassium
        { name: 'Potassium Chloride Oral', genericName: 'Potassium Chloride', doses: ['600mg', '750mg', '1g', '1.2g', '20mmol', '40mmol'], routes: ['oral'], frequency: ['12-8 hourly'], maxDaily: '100mmol', renalAdjust: true },
        { name: 'Potassium Chloride IV', genericName: 'Potassium Chloride', doses: ['10mmol', '20mmol', '40mmol', '10mmol/hr', '20mmol/hr', '40mmol/hr'], routes: ['intravenous'], frequency: ['Per replacement protocol'], maxDaily: '40mmol/hr central', renalAdjust: true, specialInstructions: 'Max 10mmol/hr peripheral, monitor ECG' },
        { name: 'Potassium Phosphate', genericName: 'Potassium Phosphate', doses: ['10mmol phosphate', '15mmol phosphate'], routes: ['intravenous'], frequency: ['Over 6 hours'], maxDaily: '30mmol phosphate', renalAdjust: true },
        // Sodium
        { name: 'Sodium Chloride 0.9%', genericName: 'Normal Saline', doses: ['250ml', '500ml', '1000ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: 'Volume-dependent', renalAdjust: true },
        { name: 'Sodium Chloride 3%', genericName: 'Hypertonic Saline', doses: ['100ml', '150ml', '250ml'], routes: ['intravenous'], frequency: ['1-2ml/kg/hr'], maxDaily: 'Goal Na correction', renalAdjust: true, specialInstructions: 'Max 10-12mmol/L/24hr correction' },
        { name: 'Sodium Bicarbonate', genericName: 'Sodium Bicarbonate', doses: ['500mg', '600mg', '1.26% IV', '8.4% IV', '1-2mmol/kg'], routes: ['oral', 'intravenous'], frequency: ['As required'], maxDaily: 'pH-guided', renalAdjust: true },
        // Magnesium
        { name: 'Magnesium Sulfate IV', genericName: 'Magnesium Sulfate', doses: ['2g', '4g', '8mmol', '20mmol'], routes: ['intravenous'], frequency: ['Over 20min-2hr'], maxDaily: '40mmol', renalAdjust: true },
        { name: 'Magnesium Glycerophosphate', genericName: 'Magnesium Glycerophosphate', doses: ['4mmol', '97.2mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '24mmol', renalAdjust: true },
        { name: 'Magnesium Aspartate', genericName: 'Magnesium Aspartate', doses: ['10mmol'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mmol', renalAdjust: true },
        { name: 'Magnesium Oxide', genericName: 'Magnesium Oxide', doses: ['400mg', '500mg'], routes: ['oral'], frequency: ['Once to twice daily'], maxDaily: '1g', renalAdjust: true },
        { name: 'Magnesium Citrate', genericName: 'Magnesium Citrate', doses: ['150mg', '200mg'], routes: ['oral'], frequency: ['Once to twice daily'], maxDaily: '400mg elemental', renalAdjust: true },
        // Calcium
        { name: 'Calcium Gluconate 10%', genericName: 'Calcium Gluconate', doses: ['10ml (2.2mmol Ca)', '20ml', '30ml'], routes: ['intravenous'], frequency: ['Over 10-30min'], maxDaily: '9mmol', renalAdjust: true },
        { name: 'Calcium Chloride 10%', genericName: 'Calcium Chloride', doses: ['5ml', '10ml (6.8mmol Ca)'], routes: ['intravenous'], frequency: ['Emergency use'], maxDaily: 'Per protocol', renalAdjust: true, specialInstructions: 'Central line preferred, causes necrosis if extravasation' },
        { name: 'Calcium Carbonate', genericName: 'Calcium Carbonate', doses: ['500mg', '600mg', '1g', '1.25g', '1.5g'], routes: ['oral'], frequency: ['8-12 hourly with meals'], maxDaily: '3g', renalAdjust: true },
        { name: 'Calcium Citrate', genericName: 'Calcium Citrate', doses: ['500mg', '950mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2g', renalAdjust: true },
        // Phosphate
        { name: 'Phosphate Sandoz', genericName: 'Sodium Phosphate', doses: ['500mg (16mmol phosphate)', '1g'], routes: ['oral'], frequency: ['8-12 hourly'], maxDaily: '3g', renalAdjust: true },
        { name: 'Sodium Phosphate IV', genericName: 'Sodium Glycerophosphate', doses: ['10mmol', '20mmol', '30mmol'], routes: ['intravenous'], frequency: ['Over 6-12 hours'], maxDaily: '50mmol', renalAdjust: true },
      ],
    },
    {
      id: 'vitamins_minerals',
      name: 'Vitamins & Minerals',
      medications: [
        // Fat-soluble Vitamins
        { name: 'Vitamin A', genericName: 'Retinol', doses: ['5000 units', '10000 units', '25000 units', '50000 units', '200000 units'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', 'Single high dose'], maxDaily: '25000 units chronic', renalAdjust: false },
        { name: 'Vitamin D3', genericName: 'Colecalciferol', doses: ['400 units', '800 units', '1000 units', '2000 units', '5000 units', '20000 units', '50000 units'], routes: ['oral'], frequency: ['Once daily', 'Weekly high dose'], maxDaily: '4000 units maintenance', renalAdjust: false },
        { name: 'Vitamin D2', genericName: 'Ergocalciferol', doses: ['50000 units'], routes: ['oral'], frequency: ['Weekly x 8-12 weeks'], maxDaily: '50000 units weekly', renalAdjust: false },
        { name: 'Calcitriol', genericName: 'Calcitriol', doses: ['0.25mcg', '0.5mcg', '1mcg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '3mcg', renalAdjust: true },
        { name: 'Alfacalcidol', genericName: 'Alfacalcidol', doses: ['0.25mcg', '0.5mcg', '1mcg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '3mcg', renalAdjust: true },
        { name: 'Paricalcitol', genericName: 'Paricalcitol', doses: ['1mcg', '2mcg', '4mcg'], routes: ['oral', 'intravenous'], frequency: ['Every other day', '3x weekly'], maxDaily: '32mcg/week', renalAdjust: true },
        { name: 'Vitamin E', genericName: 'Alpha-tocopherol', doses: ['100 units', '200 units', '400 units', '1000 units'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1000 units', renalAdjust: false },
        { name: 'Vitamin K1', genericName: 'Phytomenadione', doses: ['1mg', '2mg', '5mg', '10mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
        // Water-soluble Vitamins
        { name: 'Thiamine (B1)', genericName: 'Thiamine', doses: ['50mg', '100mg', '200mg', '500mg IV', 'Pabrinex pair 1+2'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once to 3 times daily'], maxDaily: '300mg oral', renalAdjust: false },
        { name: 'Pabrinex IV', genericName: 'Thiamine/Riboflavin/Pyridoxine/Nicotinamide', doses: ['Pairs 1+2'], routes: ['intravenous', 'intramuscular'], frequency: ['8 hourly x 3-5 days, then once daily'], maxDaily: '3 pairs', renalAdjust: false },
        { name: 'Riboflavin (B2)', genericName: 'Riboflavin', doses: ['5mg', '10mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Niacin (B3)', genericName: 'Nicotinic Acid', doses: ['50mg', '100mg', '500mg', '1g', '2g'], routes: ['oral'], frequency: ['Once to 3 times daily'], maxDaily: '6g', renalAdjust: false },
        { name: 'Pyridoxine (B6)', genericName: 'Pyridoxine', doses: ['10mg', '25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Vitamin C', genericName: 'Ascorbic Acid', doses: ['100mg', '250mg', '500mg', '1g'], routes: ['oral', 'intravenous'], frequency: ['Once to 3 times daily'], maxDaily: '2g', renalAdjust: true },
        { name: 'Biotin', genericName: 'Biotin', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
        // Trace Elements
        { name: 'Zinc Sulfate', genericName: 'Zinc Sulfate', doses: ['45mg', '90mg', '125mg', '220mg'], routes: ['oral'], frequency: ['Once to 3 times daily'], maxDaily: '50mg elemental', renalAdjust: true },
        { name: 'Selenium', genericName: 'Selenium', doses: ['55mcg', '100mcg', '200mcg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '400mcg', renalAdjust: true },
        { name: 'Copper', genericName: 'Copper Sulfate', doses: ['2mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '4mg', renalAdjust: false },
        { name: 'Manganese', genericName: 'Manganese', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: false },
        { name: 'Multivitamin', genericName: 'Multivitamins', doses: ['1 tablet', '1 capsule', '5ml'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 dose', renalAdjust: false },
      ],
    },
    {
      id: 'parenteral_nutrition',
      name: 'Parenteral & Enteral Nutrition',
      medications: [
        // Parenteral Nutrition Solutions
        { name: 'Kabiven', genericName: 'PN - Glucose/Lipid/Amino Acids', doses: ['1026ml', '1540ml', '2053ml', '2566ml'], routes: ['central intravenous'], frequency: ['Over 12-24 hours'], maxDaily: '40kcal/kg', renalAdjust: true },
        { name: 'Olimel N7E', genericName: 'PN with electrolytes', doses: ['1000ml', '1500ml', '2000ml'], routes: ['central intravenous'], frequency: ['Over 12-24 hours'], maxDaily: '40ml/kg', renalAdjust: true },
        { name: 'Smofkabiven', genericName: 'PN with fish oil', doses: ['986ml', '1477ml', '1970ml'], routes: ['central intravenous'], frequency: ['Over 12-24 hours'], maxDaily: '35ml/kg', renalAdjust: true },
        { name: 'Nutriflex Lipid Plus', genericName: 'PN - All-in-one', doses: ['1250ml', '1875ml', '2500ml'], routes: ['central intravenous'], frequency: ['Over 12-24 hours'], maxDaily: 'Per calculation', renalAdjust: true },
        { name: 'Intralipid 20%', genericName: 'Lipid Emulsion', doses: ['100ml', '250ml', '500ml'], routes: ['intravenous'], frequency: ['Part of PN regimen'], maxDaily: '3g fat/kg', renalAdjust: false },
        { name: 'SMOFlipid 20%', genericName: 'SMOF Lipid Emulsion', doses: ['100ml', '250ml', '500ml'], routes: ['intravenous'], frequency: ['Part of PN regimen'], maxDaily: '2g fat/kg', renalAdjust: false },
        { name: 'Omegaven', genericName: 'Fish Oil Emulsion', doses: ['50ml', '100ml'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '2ml/kg', renalAdjust: false },
        { name: 'Aminoven 10%', genericName: 'Amino Acid Solution', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['Part of PN regimen'], maxDaily: '1.5-2g AA/kg', renalAdjust: true },
        { name: 'Glucose 50%', genericName: 'Dextrose 50%', doses: ['50ml', '250ml', '500ml'], routes: ['central intravenous'], frequency: ['Part of PN regimen'], maxDaily: '5mg/kg/min', renalAdjust: false },
        { name: 'Glucose 20%', genericName: 'Dextrose 20%', doses: ['250ml', '500ml', '1000ml'], routes: ['intravenous'], frequency: ['Part of PN regimen'], maxDaily: '5mg/kg/min', renalAdjust: false },
        // Additives
        { name: 'Additrace', genericName: 'Trace Elements', doses: ['10ml'], routes: ['intravenous'], frequency: ['Once daily with PN'], maxDaily: '10ml', renalAdjust: true },
        { name: 'Decan', genericName: 'Trace Elements', doses: ['10ml'], routes: ['intravenous'], frequency: ['Once daily with PN'], maxDaily: '10ml', renalAdjust: true },
        { name: 'Cernevit', genericName: 'Multivitamin IV', doses: ['1 vial (5ml)'], routes: ['intravenous'], frequency: ['Once daily with PN'], maxDaily: '1 vial', renalAdjust: false },
        { name: 'Soluvit N', genericName: 'Water-soluble Vitamins', doses: ['1 vial'], routes: ['intravenous'], frequency: ['Once daily with PN'], maxDaily: '1 vial', renalAdjust: false },
        { name: 'Vitlipid N', genericName: 'Fat-soluble Vitamins', doses: ['10ml'], routes: ['intravenous'], frequency: ['Once daily with lipid'], maxDaily: '10ml', renalAdjust: false },
        // Enteral Nutrition
        { name: 'Ensure', genericName: 'Standard Polymeric Feed', doses: ['200ml', '220ml', '1.0kcal/ml', '1.5kcal/ml'], routes: ['oral', 'enteral'], frequency: ['As required'], maxDaily: '2000kcal', renalAdjust: false },
        { name: 'Fresubin', genericName: 'Polymeric Feed', doses: ['200ml', '500ml', '1.0-1.5kcal/ml'], routes: ['oral', 'enteral'], frequency: ['As required'], maxDaily: '2500kcal', renalAdjust: false },
        { name: 'Nutrison', genericName: 'Standard Enteral Feed', doses: ['500ml', '1000ml', '1.0-1.5kcal/ml'], routes: ['enteral'], frequency: ['Continuous or bolus'], maxDaily: '2500kcal', renalAdjust: false },
        { name: 'Peptamen', genericName: 'Peptide-based Feed', doses: ['250ml', '500ml', '1.0-1.5kcal/ml'], routes: ['enteral'], frequency: ['Continuous or bolus'], maxDaily: '2000kcal', renalAdjust: true },
        { name: 'Nepro', genericName: 'Renal-specific Feed', doses: ['220ml', '2.0kcal/ml'], routes: ['oral', 'enteral'], frequency: ['As required'], maxDaily: '1500kcal', renalAdjust: true },
        { name: 'Pulmocare', genericName: 'Respiratory-specific Feed', doses: ['237ml', '1.5kcal/ml'], routes: ['oral', 'enteral'], frequency: ['As required'], maxDaily: '1500kcal', renalAdjust: false },
        { name: 'Glucerna', genericName: 'Diabetic Feed', doses: ['200ml', '237ml', '1.0-1.5kcal/ml'], routes: ['oral', 'enteral'], frequency: ['As required'], maxDaily: '2000kcal', renalAdjust: false },
        { name: 'Modulen IBD', genericName: 'IBD-specific Feed', doses: ['400g powder', '1kcal/ml'], routes: ['oral', 'enteral'], frequency: ['As required'], maxDaily: '2000kcal', renalAdjust: false },
      ],
    },
    {
      id: 'fluids_volume',
      name: 'IV Fluids & Volume Expanders',
      medications: [
        // Crystalloids
        { name: 'Sodium Chloride 0.9%', genericName: 'Normal Saline', doses: ['100ml', '250ml', '500ml', '1000ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: 'Fluid balance guided', renalAdjust: true },
        { name: 'Sodium Chloride 0.45%', genericName: 'Half-Normal Saline', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: 'Fluid balance guided', renalAdjust: true },
        { name: 'Glucose 5%', genericName: 'Dextrose 5%', doses: ['250ml', '500ml', '1000ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: 'Fluid balance guided', renalAdjust: false },
        { name: 'Glucose 10%', genericName: 'Dextrose 10%', doses: ['250ml', '500ml', '1000ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: 'Fluid balance guided', renalAdjust: false },
        { name: 'Hartmanns Solution', genericName: 'Compound Sodium Lactate', doses: ['250ml', '500ml', '1000ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: '40ml/kg', renalAdjust: true },
        { name: 'Ringers Lactate', genericName: 'Lactated Ringers', doses: ['250ml', '500ml', '1000ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: '40ml/kg', renalAdjust: true },
        { name: 'Plasmalyte', genericName: 'Plasmalyte 148', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: '50ml/kg', renalAdjust: true },
        { name: 'Glucose 5% + NaCl 0.9%', genericName: 'Dextrose-Saline', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['Maintenance'], maxDaily: '40ml/kg', renalAdjust: true },
        { name: 'Glucose 5% + NaCl 0.45%', genericName: 'Half Dextrose-Saline', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['Maintenance'], maxDaily: '40ml/kg', renalAdjust: true },
        { name: 'Glucose 5% + KCl 20mmol', genericName: 'Dextrose with Potassium', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['Maintenance'], maxDaily: 'Per potassium protocol', renalAdjust: true },
        // Colloids
        { name: 'Albumin 4-5%', genericName: 'Human Albumin Solution', doses: ['100ml', '250ml', '500ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: '2g/kg', renalAdjust: false },
        { name: 'Albumin 20-25%', genericName: 'Concentrated Albumin', doses: ['50ml', '100ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: '2g/kg', renalAdjust: false },
        { name: 'Gelofusine', genericName: 'Gelatin', doses: ['500ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: '30ml/kg', renalAdjust: false },
        { name: 'Haemaccel', genericName: 'Gelatin', doses: ['500ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: '30ml/kg', renalAdjust: false },
        { name: 'Voluven', genericName: 'HES 6%', doses: ['500ml'], routes: ['intravenous'], frequency: ['As required'], maxDaily: '30ml/kg', renalAdjust: true, specialInstructions: 'Avoid in sepsis, renal impairment' },
        // Hypertonic Solutions
        { name: 'Mannitol 20%', genericName: 'Mannitol', doses: ['100ml', '250ml', '500ml', '0.25-1g/kg'], routes: ['intravenous'], frequency: ['Over 15-30min'], maxDaily: '200g', renalAdjust: true },
        { name: 'Hypertonic Saline 3%', genericName: 'Hypertonic Saline', doses: ['100ml', '250ml'], routes: ['intravenous'], frequency: ['1-2ml/kg/hr'], maxDaily: 'Na correction guided', renalAdjust: true },
        { name: 'Hypertonic Saline 7.5%', genericName: 'Hypertonic Saline Rescue', doses: ['100ml', '250ml'], routes: ['intravenous'], frequency: ['Bolus in emergency'], maxDaily: '250ml', renalAdjust: true },
        { name: 'Sodium Bicarbonate 8.4%', genericName: 'Sodium Bicarbonate', doses: ['50ml', '100ml', '1-2mmol/kg'], routes: ['intravenous'], frequency: ['As required'], maxDaily: 'pH guided', renalAdjust: true },
      ],
    },
  ],
};

// ============================================
// 10. MUSCULOSKELETAL & JOINT DISEASES
// ============================================
export const musculoskeletalMedications: BNFCategory = {
  id: 'musculoskeletal',
  name: 'Musculoskeletal & Joint Diseases',
  subcategories: [
    {
      id: 'nsaids',
      name: 'NSAIDs (Non-Steroidal Anti-Inflammatory Drugs)',
      medications: [
        // Non-selective NSAIDs
        { name: 'Ibuprofen', genericName: 'Ibuprofen', doses: ['200mg', '400mg', '600mg', '800mg', '10mg/kg paediatric'], routes: ['oral', 'topical'], frequency: ['6-8 hourly'], maxDaily: '2400mg (1200mg OTC)', renalAdjust: true, specialInstructions: 'Take with food, avoid in renal impairment' },
        { name: 'Naproxen', genericName: 'Naproxen', doses: ['250mg', '375mg', '500mg', '750mg', '1g'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1250mg acutely, 1g chronic', renalAdjust: true },
        { name: 'Diclofenac', genericName: 'Diclofenac', doses: ['25mg', '50mg', '75mg', '100mg', '75mg/3ml IM'], routes: ['oral', 'intramuscular', 'rectal', 'topical'], frequency: ['8-12 hourly'], maxDaily: '150mg', renalAdjust: true },
        { name: 'Diclofenac Topical Gel', genericName: 'Voltarol Gel', doses: ['1%', '2.32%', '10%'], routes: ['topical'], frequency: ['8-12 hourly'], maxDaily: '8g gel (1%)', renalAdjust: false },
        { name: 'Ketoprofen', genericName: 'Ketoprofen', doses: ['50mg', '100mg', '100mg IM', '200mg MR'], routes: ['oral', 'intramuscular', 'topical'], frequency: ['6-12 hourly', 'Once daily MR'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Indomethacin', genericName: 'Indometacin', doses: ['25mg', '50mg', '75mg MR', '100mg suppository'], routes: ['oral', 'rectal'], frequency: ['8-12 hourly'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Piroxicam', genericName: 'Piroxicam', doses: ['10mg', '20mg'], routes: ['oral', 'topical'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Meloxicam', genericName: 'Meloxicam', doses: ['7.5mg', '15mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15mg', renalAdjust: true },
        { name: 'Sulindac', genericName: 'Sulindac', doses: ['150mg', '200mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Tenoxicam', genericName: 'Tenoxicam', doses: ['20mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: true },
        { name: 'Aceclofenac', genericName: 'Aceclofenac', doses: ['100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Mefenamic Acid', genericName: 'Mefenamic Acid', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '1.5g', renalAdjust: true },
        { name: 'Etodolac', genericName: 'Etodolac', doses: ['200mg', '300mg', '400mg', '500mg', '600mg MR'], routes: ['oral'], frequency: ['12 hourly', 'Once daily MR'], maxDaily: '600mg', renalAdjust: true },
        { name: 'Nabumetone', genericName: 'Nabumetone', doses: ['500mg', '1g'], routes: ['oral'], frequency: ['Once-twice daily'], maxDaily: '2g', renalAdjust: true },
        { name: 'Flurbiprofen', genericName: 'Flurbiprofen', doses: ['50mg', '100mg', '200mg MR'], routes: ['oral'], frequency: ['8-12 hourly'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Dexketoprofen', genericName: 'Dexketoprofen', doses: ['12.5mg', '25mg', '50mg IM/IV'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['8 hourly'], maxDaily: '75mg oral, 150mg IV', renalAdjust: true },
        { name: 'Ketorolac', genericName: 'Ketorolac', doses: ['10mg', '30mg IM/IV', '60mg IM', '15mg IV'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly'], maxDaily: '40mg oral, 90mg parenteral', renalAdjust: true, specialInstructions: 'Max 5 days treatment' },
        // COX-2 Selective Inhibitors
        { name: 'Celecoxib', genericName: 'Celecoxib', doses: ['100mg', '200mg', '400mg'], routes: ['oral'], frequency: ['Once-twice daily'], maxDaily: '400mg', renalAdjust: true },
        { name: 'Etoricoxib', genericName: 'Etoricoxib', doses: ['30mg', '60mg', '90mg', '120mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '120mg acute, 60-90mg chronic', renalAdjust: true },
        { name: 'Parecoxib', genericName: 'Parecoxib', doses: ['20mg', '40mg'], routes: ['intravenous', 'intramuscular'], frequency: ['6-12 hourly'], maxDaily: '80mg', renalAdjust: true, specialInstructions: 'Max 3 days perioperative' },
      ],
    },
    {
      id: 'dmards_conventional',
      name: 'DMARDs - Conventional Synthetic',
      medications: [
        { name: 'Methotrexate', genericName: 'Methotrexate', doses: ['2.5mg', '5mg', '7.5mg', '10mg', '15mg', '20mg', '25mg', '50mg/2ml SC'], routes: ['oral', 'subcutaneous', 'intramuscular'], frequency: ['Once weekly'], maxDaily: '25mg/week', renalAdjust: true, specialInstructions: 'Folic acid 5mg next day' },
        { name: 'Sulfasalazine', genericName: 'Sulphasalazine', doses: ['500mg', '500mg EC'], routes: ['oral'], frequency: ['12 hourly, increase to 8 hourly'], maxDaily: '3g', renalAdjust: true },
        { name: 'Leflunomide', genericName: 'Leflunomide', doses: ['10mg', '20mg', '100mg loading'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Hydroxychloroquine', genericName: 'Hydroxychloroquine', doses: ['200mg', '400mg', '5mg/kg'], routes: ['oral'], frequency: ['Once-twice daily'], maxDaily: '5mg/kg ideal body weight', renalAdjust: true, specialInstructions: 'Annual retinal screening' },
        { name: 'Azathioprine', genericName: 'Azathioprine', doses: ['25mg', '50mg', '1-3mg/kg'], routes: ['oral'], frequency: ['Once-twice daily'], maxDaily: '3mg/kg', renalAdjust: true, specialInstructions: 'Check TPMT before starting' },
        { name: 'Ciclosporin', genericName: 'Ciclosporin', doses: ['25mg', '50mg', '100mg', '2.5-5mg/kg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '5mg/kg', renalAdjust: true },
        { name: 'Mycophenolate Mofetil', genericName: 'CellCept', doses: ['250mg', '500mg', '1g'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '3g', renalAdjust: true },
        { name: 'D-Penicillamine', genericName: 'Penicillamine', doses: ['125mg', '250mg'], routes: ['oral'], frequency: ['Once daily, increase'], maxDaily: '1.5g', renalAdjust: true },
        { name: 'Gold (Auranofin)', genericName: 'Auranofin', doses: ['3mg'], routes: ['oral'], frequency: ['Once-twice daily'], maxDaily: '9mg', renalAdjust: true },
        { name: 'Gold (Sodium Aurothiomalate)', genericName: 'Myocrisin', doses: ['10mg', '25mg', '50mg'], routes: ['intramuscular'], frequency: ['Weekly then monthly'], maxDaily: '50mg/week', renalAdjust: true },
      ],
    },
    {
      id: 'dmards_targeted',
      name: 'DMARDs - Targeted Synthetic (JAK Inhibitors)',
      medications: [
        { name: 'Tofacitinib', genericName: 'Tofacitinib', doses: ['5mg', '10mg', '11mg XR'], routes: ['oral'], frequency: ['12 hourly', 'Once daily XR'], maxDaily: '10mg IR, 11mg XR', renalAdjust: true },
        { name: 'Baricitinib', genericName: 'Baricitinib', doses: ['2mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '4mg', renalAdjust: true },
        { name: 'Upadacitinib', genericName: 'Upadacitinib', doses: ['15mg', '30mg', '45mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '45mg (IBD), 30mg (PsA)', renalAdjust: true },
        { name: 'Filgotinib', genericName: 'Filgotinib', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Apremilast', genericName: 'Apremilast', doses: ['10mg', '20mg', '30mg'], routes: ['oral'], frequency: ['12 hourly after titration'], maxDaily: '60mg', renalAdjust: true },
        { name: 'Deucravacitinib', genericName: 'Deucravacitinib', doses: ['6mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '6mg', renalAdjust: false },
      ],
    },
    {
      id: 'biologics_tnf',
      name: 'Biologic DMARDs - Anti-TNF',
      medications: [
        { name: 'Adalimumab', genericName: 'Adalimumab', doses: ['20mg', '40mg', '80mg loading'], routes: ['subcutaneous'], frequency: ['Every 2 weeks', 'Weekly'], maxDaily: '40mg/week', renalAdjust: false },
        { name: 'Etanercept', genericName: 'Etanercept', doses: ['25mg', '50mg'], routes: ['subcutaneous'], frequency: ['Weekly', 'Twice weekly'], maxDaily: '50mg/week', renalAdjust: false },
        { name: 'Infliximab', genericName: 'Infliximab', doses: ['3mg/kg', '5mg/kg', '10mg/kg'], routes: ['intravenous', 'subcutaneous'], frequency: ['Weeks 0,2,6 then every 8 weeks'], maxDaily: '10mg/kg', renalAdjust: false },
        { name: 'Certolizumab Pegol', genericName: 'Certolizumab', doses: ['200mg', '400mg loading'], routes: ['subcutaneous'], frequency: ['Every 2 weeks', 'Every 4 weeks'], maxDaily: '400mg every 2 weeks', renalAdjust: false },
        { name: 'Golimumab', genericName: 'Golimumab', doses: ['50mg', '100mg', '2mg/kg IV'], routes: ['subcutaneous', 'intravenous'], frequency: ['Every 4 weeks', 'Every 8 weeks IV'], maxDaily: '100mg/month', renalAdjust: false },
      ],
    },
    {
      id: 'biologics_other',
      name: 'Biologic DMARDs - Non-TNF',
      medications: [
        // IL-6 Inhibitors
        { name: 'Tocilizumab', genericName: 'Tocilizumab', doses: ['162mg SC', '4-8mg/kg IV'], routes: ['subcutaneous', 'intravenous'], frequency: ['Weekly SC', 'Every 4 weeks IV'], maxDaily: '800mg', renalAdjust: false },
        { name: 'Sarilumab', genericName: 'Sarilumab', doses: ['150mg', '200mg'], routes: ['subcutaneous'], frequency: ['Every 2 weeks'], maxDaily: '200mg every 2 weeks', renalAdjust: false },
        // IL-1 Inhibitors
        { name: 'Anakinra', genericName: 'Anakinra', doses: ['100mg', '1-2mg/kg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '8mg/kg', renalAdjust: true },
        { name: 'Canakinumab', genericName: 'Canakinumab', doses: ['150mg', '2-4mg/kg'], routes: ['subcutaneous'], frequency: ['Every 4-8 weeks'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Rilonacept', genericName: 'Rilonacept', doses: ['160mg', '320mg loading'], routes: ['subcutaneous'], frequency: ['Weekly'], maxDaily: '320mg', renalAdjust: false },
        // B-cell Depleting
        { name: 'Rituximab', genericName: 'Rituximab', doses: ['500mg', '1000mg', '375mg/m²'], routes: ['intravenous', 'subcutaneous'], frequency: ['2 doses 2 weeks apart, every 6-12 months'], maxDaily: '1000mg', renalAdjust: false },
        // T-cell Costimulation Blocker
        { name: 'Abatacept', genericName: 'Abatacept', doses: ['125mg SC', '500mg', '750mg', '1g IV'], routes: ['subcutaneous', 'intravenous'], frequency: ['Weekly SC', 'Every 4 weeks IV'], maxDaily: '1g IV', renalAdjust: false },
        // IL-17 Inhibitors
        { name: 'Secukinumab', genericName: 'Secukinumab', doses: ['150mg', '300mg'], routes: ['subcutaneous'], frequency: ['Weekly x 5, then every 4 weeks'], maxDaily: '300mg', renalAdjust: false },
        { name: 'Ixekizumab', genericName: 'Ixekizumab', doses: ['80mg', '160mg loading'], routes: ['subcutaneous'], frequency: ['Every 2-4 weeks'], maxDaily: '160mg', renalAdjust: false },
        { name: 'Brodalumab', genericName: 'Brodalumab', doses: ['210mg'], routes: ['subcutaneous'], frequency: ['Weekly x 3, then every 2 weeks'], maxDaily: '210mg', renalAdjust: false },
        { name: 'Bimekizumab', genericName: 'Bimekizumab', doses: ['160mg', '320mg'], routes: ['subcutaneous'], frequency: ['Every 4-8 weeks'], maxDaily: '320mg', renalAdjust: false },
        // IL-23 Inhibitors
        { name: 'Ustekinumab', genericName: 'Ustekinumab', doses: ['45mg', '90mg', '6mg/kg IV loading'], routes: ['subcutaneous', 'intravenous'], frequency: ['Every 12 weeks'], maxDaily: '90mg', renalAdjust: false },
        { name: 'Guselkumab', genericName: 'Guselkumab', doses: ['100mg'], routes: ['subcutaneous'], frequency: ['Weeks 0,4, then every 8 weeks'], maxDaily: '100mg', renalAdjust: false },
        { name: 'Risankizumab', genericName: 'Risankizumab', doses: ['75mg', '150mg', '600mg IV'], routes: ['subcutaneous', 'intravenous'], frequency: ['Every 12 weeks'], maxDaily: '180mg SC', renalAdjust: false },
        { name: 'Tildrakizumab', genericName: 'Tildrakizumab', doses: ['100mg', '200mg'], routes: ['subcutaneous'], frequency: ['Weeks 0,4, then every 12 weeks'], maxDaily: '200mg', renalAdjust: false },
      ],
    },
    {
      id: 'gout_hyperuricaemia',
      name: 'Gout & Hyperuricaemia',
      medications: [
        // Acute Gout
        { name: 'Colchicine', genericName: 'Colchicine', doses: ['500mcg', '0.5mg', '1mg loading'], routes: ['oral'], frequency: ['6-12 hourly', 'Loading then 500mcg after 1hr'], maxDaily: '6mg total course, 1.5mg/day prophylaxis', renalAdjust: true, specialInstructions: 'Low dose better tolerated' },
        { name: 'Naproxen', genericName: 'Naproxen', doses: ['500mg', '750mg loading'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '1250mg day 1, then 1g', renalAdjust: true },
        { name: 'Indomethacin', genericName: 'Indometacin', doses: ['50mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Prednisolone', genericName: 'Prednisolone', doses: ['30-40mg'], routes: ['oral'], frequency: ['Once daily x 3-5 days'], maxDaily: '40mg', renalAdjust: false },
        { name: 'Methylprednisolone', genericName: 'Methylprednisolone', doses: ['40-80mg', '120mg'], routes: ['intramuscular'], frequency: ['Single dose'], maxDaily: '120mg', renalAdjust: false },
        { name: 'Triamcinolone', genericName: 'Triamcinolone', doses: ['10-40mg intra-articular'], routes: ['intra-articular'], frequency: ['Single injection'], maxDaily: '80mg', renalAdjust: false },
        // Urate-Lowering Therapy
        { name: 'Allopurinol', genericName: 'Allopurinol', doses: ['100mg', '200mg', '300mg', '600mg', '900mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '900mg', renalAdjust: true, specialInstructions: 'Start low, titrate to urate target' },
        { name: 'Febuxostat', genericName: 'Febuxostat', doses: ['40mg', '80mg', '120mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '120mg', renalAdjust: true },
        { name: 'Benzbromarone', genericName: 'Benzbromarone', doses: ['50mg', '100mg', '200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: false, hepaticAdjust: true },
        { name: 'Probenecid', genericName: 'Probenecid', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2g', renalAdjust: true },
        { name: 'Sulfinpyrazone', genericName: 'Sulfinpyrazone', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['8-12 hourly'], maxDaily: '800mg', renalAdjust: true },
        { name: 'Lesinurad', genericName: 'Lesinurad', doses: ['200mg'], routes: ['oral'], frequency: ['Once daily with XOI'], maxDaily: '200mg', renalAdjust: true },
        // Refractory Gout
        { name: 'Pegloticase', genericName: 'Pegloticase', doses: ['8mg'], routes: ['intravenous'], frequency: ['Every 2 weeks'], maxDaily: '8mg', renalAdjust: false },
        { name: 'Rasburicase', genericName: 'Rasburicase', doses: ['0.2mg/kg'], routes: ['intravenous'], frequency: ['Daily x 5-7 days'], maxDaily: '0.2mg/kg', renalAdjust: false },
      ],
    },
    {
      id: 'muscle_relaxants',
      name: 'Muscle Relaxants & Antispasmodics',
      medications: [
        // Central Muscle Relaxants
        { name: 'Baclofen', genericName: 'Baclofen', doses: ['5mg', '10mg', '25mg', 'Intrathecal 25-1200mcg/day'], routes: ['oral', 'intrathecal'], frequency: ['8 hourly, titrate'], maxDaily: '100mg oral', renalAdjust: true },
        { name: 'Tizanidine', genericName: 'Tizanidine', doses: ['2mg', '4mg', '6mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '36mg', renalAdjust: true },
        { name: 'Dantrolene', genericName: 'Dantrolene', doses: ['25mg', '50mg', '100mg', '1-2.5mg/kg IV (MH)'], routes: ['oral', 'intravenous'], frequency: ['6-8 hourly oral'], maxDaily: '400mg oral', renalAdjust: false, hepaticAdjust: true },
        { name: 'Methocarbamol', genericName: 'Methocarbamol', doses: ['500mg', '750mg', '1g', '1.5g'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6-8 hourly'], maxDaily: '4.5g IV, 6g oral', renalAdjust: true },
        { name: 'Carisoprodol', genericName: 'Carisoprodol', doses: ['250mg', '350mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '1400mg', renalAdjust: true, controlledDrug: true },
        { name: 'Cyclobenzaprine', genericName: 'Cyclobenzaprine', doses: ['5mg', '7.5mg', '10mg', '15mg ER', '30mg ER'], routes: ['oral'], frequency: ['8 hourly', 'Once daily ER'], maxDaily: '30mg', renalAdjust: false },
        { name: 'Orphenadrine', genericName: 'Orphenadrine', doses: ['100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: true },
        { name: 'Chlorzoxazone', genericName: 'Chlorzoxazone', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['6-8 hourly'], maxDaily: '3g', renalAdjust: false },
        { name: 'Quinine Sulfate', genericName: 'Quinine', doses: ['200mg', '300mg'], routes: ['oral'], frequency: ['At bedtime for cramps'], maxDaily: '300mg', renalAdjust: true },
        // Botulinum Toxin
        { name: 'Botulinum Toxin A (Botox)', genericName: 'OnabotulinumtoxinA', doses: ['50 units', '100 units', '200 units', 'Variable by indication'], routes: ['intramuscular', 'intradermal'], frequency: ['Every 12 weeks'], maxDaily: '360 units/session', renalAdjust: false },
        { name: 'Botulinum Toxin A (Dysport)', genericName: 'AbobotulinumtoxinA', doses: ['300 units', '500 units', '1000 units'], routes: ['intramuscular'], frequency: ['Every 12-16 weeks'], maxDaily: '1500 units', renalAdjust: false },
        { name: 'Botulinum Toxin B', genericName: 'RimabotulinumtoxinB', doses: ['2500 units', '5000 units', '10000 units'], routes: ['intramuscular'], frequency: ['Every 12-16 weeks'], maxDaily: '15000 units', renalAdjust: false },
      ],
    },
    {
      id: 'osteoporosis',
      name: 'Bone Disorders & Osteoporosis',
      medications: [
        // Bisphosphonates - Oral
        { name: 'Alendronic Acid', genericName: 'Alendronate', doses: ['10mg', '70mg'], routes: ['oral'], frequency: ['Once daily', 'Once weekly'], maxDaily: '10mg', renalAdjust: true, specialInstructions: 'Upright 30min, empty stomach' },
        { name: 'Risedronate', genericName: 'Risedronate', doses: ['5mg', '35mg', '75mg', '150mg'], routes: ['oral'], frequency: ['Once daily', 'Weekly', 'Monthly'], maxDaily: '5mg', renalAdjust: true },
        { name: 'Ibandronic Acid', genericName: 'Ibandronate', doses: ['50mg', '150mg', '3mg IV'], routes: ['oral', 'intravenous'], frequency: ['Once daily', 'Monthly', 'Every 3 months IV'], maxDaily: '50mg', renalAdjust: true },
        // Bisphosphonates - IV
        { name: 'Zoledronic Acid', genericName: 'Zoledronate', doses: ['4mg', '5mg'], routes: ['intravenous'], frequency: ['Once yearly (osteoporosis)', 'Every 3-4 weeks (malignancy)'], maxDaily: '5mg', renalAdjust: true },
        { name: 'Pamidronate', genericName: 'Pamidronate', doses: ['30mg', '60mg', '90mg'], routes: ['intravenous'], frequency: ['Every 3-4 weeks'], maxDaily: '90mg', renalAdjust: true },
        // RANK-L Inhibitor
        { name: 'Denosumab', genericName: 'Denosumab', doses: ['60mg (Prolia)', '120mg (Xgeva)'], routes: ['subcutaneous'], frequency: ['Every 6 months (osteoporosis)', 'Every 4 weeks (malignancy)'], maxDaily: '120mg monthly', renalAdjust: false },
        // PTH Analogues
        { name: 'Teriparatide', genericName: 'Teriparatide', doses: ['20mcg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '20mcg', renalAdjust: true, specialInstructions: 'Max 24 months treatment' },
        { name: 'Abaloparatide', genericName: 'Abaloparatide', doses: ['80mcg'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: '80mcg', renalAdjust: true },
        // Romosozumab
        { name: 'Romosozumab', genericName: 'Romosozumab', doses: ['210mg (2x105mg)'], routes: ['subcutaneous'], frequency: ['Monthly x 12 months'], maxDaily: '210mg', renalAdjust: false },
        // Strontium
        { name: 'Strontium Ranelate', genericName: 'Strontium Ranelate', doses: ['2g'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2g', renalAdjust: true },
        // Selective Estrogen Receptor Modulators
        { name: 'Raloxifene', genericName: 'Raloxifene', doses: ['60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '60mg', renalAdjust: false },
        { name: 'Bazedoxifene', genericName: 'Bazedoxifene', doses: ['20mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
        // Calcitonin
        { name: 'Calcitonin (Salmon)', genericName: 'Calcitonin', doses: ['50 units', '100 units', '200 units nasal'], routes: ['subcutaneous', 'intramuscular', 'nasal'], frequency: ['Once daily', 'Alternate days'], maxDaily: '400 units', renalAdjust: true },
      ],
    },
    {
      id: 'local_joint_injections',
      name: 'Local & Intra-articular Preparations',
      medications: [
        // Corticosteroid Injections
        { name: 'Triamcinolone Acetonide', genericName: 'Triamcinolone', doses: ['10mg', '20mg', '40mg', '80mg'], routes: ['intra-articular', 'soft tissue'], frequency: ['Max 3-4 per year per joint'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Methylprednisolone Acetate', genericName: 'Depo-Medrol', doses: ['20mg', '40mg', '80mg'], routes: ['intra-articular', 'soft tissue'], frequency: ['Max 3-4 per year per joint'], maxDaily: '80mg', renalAdjust: false },
        { name: 'Hydrocortisone Acetate', genericName: 'Hydrocortisone', doses: ['25mg', '50mg'], routes: ['intra-articular', 'soft tissue'], frequency: ['As required'], maxDaily: '50mg', renalAdjust: false },
        { name: 'Betamethasone Acetate/Phosphate', genericName: 'Celestone', doses: ['3mg', '6mg'], routes: ['intra-articular', 'soft tissue'], frequency: ['As required'], maxDaily: '12mg', renalAdjust: false },
        { name: 'Dexamethasone', genericName: 'Dexamethasone', doses: ['4mg', '8mg'], routes: ['intra-articular', 'soft tissue'], frequency: ['As required'], maxDaily: '16mg', renalAdjust: false },
        // Viscosupplementation
        { name: 'Hyaluronic Acid (Synvisc)', genericName: 'Hylan G-F 20', doses: ['6ml (48mg)'], routes: ['intra-articular'], frequency: ['Single injection or 3 weekly'], maxDaily: '6ml', renalAdjust: false },
        { name: 'Hyaluronic Acid (Durolane)', genericName: 'Hyaluronic Acid', doses: ['3ml (60mg)'], routes: ['intra-articular'], frequency: ['Single injection'], maxDaily: '3ml', renalAdjust: false },
        { name: 'Hyaluronic Acid (Ostenil)', genericName: 'Sodium Hyaluronate', doses: ['2ml (20mg)', '2ml (40mg)'], routes: ['intra-articular'], frequency: ['3-5 weekly injections'], maxDaily: '2ml', renalAdjust: false },
        { name: 'Hyaluronic Acid (Supartz)', genericName: 'Sodium Hyaluronate', doses: ['2.5ml'], routes: ['intra-articular'], frequency: ['5 weekly injections'], maxDaily: '2.5ml', renalAdjust: false },
        // Local Anaesthetics (Joint)
        { name: 'Lidocaine (Intra-articular)', genericName: 'Lidocaine', doses: ['1%', '2%', '5-10ml'], routes: ['intra-articular'], frequency: ['With steroid injection'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Bupivacaine (Intra-articular)', genericName: 'Bupivacaine', doses: ['0.25%', '0.5%', '10-20ml'], routes: ['intra-articular'], frequency: ['Post-arthroscopy'], maxDaily: '150mg', renalAdjust: false },
      ],
    },
    {
      id: 'topical_musculoskeletal',
      name: 'Topical Musculoskeletal Preparations',
      medications: [
        // Topical NSAIDs
        { name: 'Diclofenac Gel 1%', genericName: 'Voltarol Emulgel', doses: ['1% gel', '2-4g'], routes: ['topical'], frequency: ['8-12 hourly'], maxDaily: '8g', renalAdjust: false },
        { name: 'Diclofenac Gel 2.32%', genericName: 'Voltarol 12 Hour', doses: ['2.32% gel', '2-4g'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '8g', renalAdjust: false },
        { name: 'Ibuprofen Gel 5%', genericName: 'Ibuleve Gel', doses: ['5% gel', '4-10cm'], routes: ['topical'], frequency: ['8 hourly'], maxDaily: '30cm strip', renalAdjust: false },
        { name: 'Ibuprofen Gel 10%', genericName: 'Ibuleve Maximum', doses: ['10% gel'], routes: ['topical'], frequency: ['8 hourly'], maxDaily: 'Per package', renalAdjust: false },
        { name: 'Ketoprofen Gel', genericName: 'Oruvail Gel', doses: ['2.5% gel'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '15g', renalAdjust: false },
        { name: 'Piroxicam Gel', genericName: 'Feldene Gel', doses: ['0.5% gel'], routes: ['topical'], frequency: ['8-12 hourly'], maxDaily: '4g', renalAdjust: false },
        { name: 'Felbinac Gel', genericName: 'Traxam Gel', doses: ['3% gel'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: 'Per package', renalAdjust: false },
        { name: 'Diclofenac Patch', genericName: 'Voltarol Medicated Plaster', doses: ['140mg patch'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 patches', renalAdjust: false },
        // Rubefacients & Counterirritants
        { name: 'Capsaicin Cream 0.025%', genericName: 'Capsaicin', doses: ['0.025% cream'], routes: ['topical'], frequency: ['6-8 hourly'], maxDaily: '4 applications', renalAdjust: false },
        { name: 'Capsaicin Cream 0.075%', genericName: 'Capsaicin HP', doses: ['0.075% cream'], routes: ['topical'], frequency: ['8 hourly'], maxDaily: '4 applications', renalAdjust: false },
        { name: 'Capsaicin Patch 8%', genericName: 'Qutenza', doses: ['8% patch (179mg)'], routes: ['topical'], frequency: ['Every 3 months'], maxDaily: '4 patches/session', renalAdjust: false },
        { name: 'Menthol/Methyl Salicylate', genericName: 'Deep Heat', doses: ['Cream/spray'], routes: ['topical'], frequency: ['8 hourly'], maxDaily: '4 applications', renalAdjust: false },
        { name: 'Camphor/Menthol', genericName: 'Tiger Balm', doses: ['Ointment'], routes: ['topical'], frequency: ['8 hourly'], maxDaily: '4 applications', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 11. EYE
// ============================================
export const eyeMedications: BNFCategory = {
  id: 'eye',
  name: 'Eye',
  subcategories: [
    {
      id: 'eye_anti_infective',
      name: 'Eye Anti-infectives',
      medications: [
        // Antibacterial Eye Preparations
        { name: 'Chloramphenicol Eye Drops', genericName: 'Chloramphenicol', doses: ['0.5% drops'], routes: ['ophthalmic'], frequency: ['2 hourly initially, then 4-6 hourly'], maxDaily: 'As directed', renalAdjust: false },
        { name: 'Chloramphenicol Eye Ointment', genericName: 'Chloramphenicol', doses: ['1% ointment'], routes: ['ophthalmic'], frequency: ['8-12 hourly, or at night'], maxDaily: 'As directed', renalAdjust: false },
        { name: 'Fusidic Acid Eye Drops', genericName: 'Fusidic Acid', doses: ['1% viscous drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Ciprofloxacin Eye Drops', genericName: 'Ciprofloxacin', doses: ['0.3% drops'], routes: ['ophthalmic'], frequency: ['Every 2 hours x 2 days, then 4 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Ofloxacin Eye Drops', genericName: 'Ofloxacin', doses: ['0.3% drops'], routes: ['ophthalmic'], frequency: ['2-4 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Levofloxacin Eye Drops', genericName: 'Levofloxacin', doses: ['0.5% drops'], routes: ['ophthalmic'], frequency: ['2 hourly x 2 days, then 4 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Moxifloxacin Eye Drops', genericName: 'Moxifloxacin', doses: ['0.5% drops'], routes: ['ophthalmic'], frequency: ['8 hourly x 7 days'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Gatifloxacin Eye Drops', genericName: 'Gatifloxacin', doses: ['0.3% drops', '0.5% drops'], routes: ['ophthalmic'], frequency: ['2-4 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Besifloxacin Eye Drops', genericName: 'Besifloxacin', doses: ['0.6% suspension'], routes: ['ophthalmic'], frequency: ['8 hourly x 7 days'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Gentamicin Eye Drops', genericName: 'Gentamicin', doses: ['0.3% drops'], routes: ['ophthalmic'], frequency: ['2-4 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Tobramycin Eye Drops', genericName: 'Tobramycin', doses: ['0.3% drops', '0.3% ointment'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Neomycin/Polymyxin B Eye Drops', genericName: 'Neosporin Ophthalmic', doses: ['Drops/ointment'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Azithromycin Eye Drops', genericName: 'Azithromycin', doses: ['1% drops', '1.5% drops'], routes: ['ophthalmic'], frequency: ['12 hourly x 2 days, then once daily'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Erythromycin Eye Ointment', genericName: 'Erythromycin', doses: ['0.5% ointment'], routes: ['ophthalmic'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
        // Antiviral Eye Preparations
        { name: 'Aciclovir Eye Ointment', genericName: 'Acyclovir', doses: ['3% ointment'], routes: ['ophthalmic'], frequency: ['5 times daily'], maxDaily: '5 applications', renalAdjust: false },
        { name: 'Ganciclovir Eye Gel', genericName: 'Ganciclovir', doses: ['0.15% gel'], routes: ['ophthalmic'], frequency: ['5 times daily, then 8 hourly'], maxDaily: '5 applications', renalAdjust: false },
        { name: 'Trifluridine Eye Drops', genericName: 'Trifluridine', doses: ['1% drops'], routes: ['ophthalmic'], frequency: ['2 hourly while awake'], maxDaily: '9 drops', renalAdjust: false },
        // Antifungal Eye Preparations
        { name: 'Natamycin Eye Drops', genericName: 'Natamycin', doses: ['5% suspension'], routes: ['ophthalmic'], frequency: ['Hourly initially, then 6-8 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Voriconazole Eye Drops', genericName: 'Voriconazole', doses: ['1% compounded'], routes: ['ophthalmic'], frequency: ['Hourly initially'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Amphotericin B Eye Drops', genericName: 'Amphotericin B', doses: ['0.15-0.5% compounded'], routes: ['ophthalmic'], frequency: ['Hourly initially'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'eye_antiinflammatory',
      name: 'Eye Anti-inflammatory & Corticosteroids',
      medications: [
        // Corticosteroid Eye Drops
        { name: 'Dexamethasone Eye Drops', genericName: 'Dexamethasone', doses: ['0.1% drops'], routes: ['ophthalmic'], frequency: ['4-6 hourly, reduce as inflammation subsides'], maxDaily: '6 doses', renalAdjust: false },
        { name: 'Prednisolone Acetate Eye Drops', genericName: 'Prednisolone', doses: ['0.5% drops', '1% drops'], routes: ['ophthalmic'], frequency: ['2-4 hourly initially'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Prednisolone Sodium Phosphate', genericName: 'Prednisolone', doses: ['0.5% drops'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Fluorometholone Eye Drops', genericName: 'Fluorometholone', doses: ['0.1% drops'], routes: ['ophthalmic'], frequency: ['4 hourly initially'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Loteprednol Eye Drops', genericName: 'Loteprednol', doses: ['0.2% drops', '0.5% drops'], routes: ['ophthalmic'], frequency: ['4 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Rimexolone Eye Drops', genericName: 'Rimexolone', doses: ['1% drops'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Difluprednate Eye Drops', genericName: 'Difluprednate', doses: ['0.05% emulsion'], routes: ['ophthalmic'], frequency: ['4 hourly x 2 weeks, then taper'], maxDaily: 'Per protocol', renalAdjust: false },
        // NSAID Eye Drops
        { name: 'Ketorolac Eye Drops', genericName: 'Ketorolac', doses: ['0.4% drops', '0.5% drops'], routes: ['ophthalmic'], frequency: ['4 hourly'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Diclofenac Eye Drops', genericName: 'Diclofenac', doses: ['0.1% drops'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Nepafenac Eye Drops', genericName: 'Nepafenac', doses: ['0.1% drops', '0.3% drops'], routes: ['ophthalmic'], frequency: ['8 hourly', 'Once daily 0.3%'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Bromfenac Eye Drops', genericName: 'Bromfenac', doses: ['0.07% drops', '0.09% drops'], routes: ['ophthalmic'], frequency: ['Once daily'], maxDaily: '1 dose', renalAdjust: false },
        { name: 'Flurbiprofen Eye Drops', genericName: 'Flurbiprofen', doses: ['0.03% drops'], routes: ['ophthalmic'], frequency: ['Every 30min starting 2hr pre-op'], maxDaily: 'Per protocol', renalAdjust: false },
        // Combinations
        { name: 'Tobramycin/Dexamethasone Eye Drops', genericName: 'Tobradex', doses: ['Drops/ointment'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Neomycin/Polymyxin B/Dexamethasone', genericName: 'Maxitrol', doses: ['Drops/ointment'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Chloramphenicol/Dexamethasone', genericName: 'Chloramphenicol/Dexamethasone', doses: ['Drops'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Loteprednol/Tobramycin', genericName: 'Zylet', doses: ['Drops'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'eye_antiallergic',
      name: 'Eye Anti-allergy & Mast Cell Stabilisers',
      medications: [
        { name: 'Sodium Cromoglicate Eye Drops', genericName: 'Cromolyn', doses: ['2% drops'], routes: ['ophthalmic'], frequency: ['4-6 hourly'], maxDaily: '6 doses', renalAdjust: false },
        { name: 'Nedocromil Eye Drops', genericName: 'Nedocromil', doses: ['2% drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Lodoxamide Eye Drops', genericName: 'Lodoxamide', doses: ['0.1% drops'], routes: ['ophthalmic'], frequency: ['6 hourly'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Ketotifen Eye Drops', genericName: 'Ketotifen', doses: ['0.025% drops'], routes: ['ophthalmic'], frequency: ['8-12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Olopatadine Eye Drops', genericName: 'Olopatadine', doses: ['0.1% drops', '0.2% drops', '0.7% drops'], routes: ['ophthalmic'], frequency: ['12 hourly', 'Once daily 0.2%/0.7%'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Azelastine Eye Drops', genericName: 'Azelastine', doses: ['0.05% drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Epinastine Eye Drops', genericName: 'Epinastine', doses: ['0.05% drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Bepotastine Eye Drops', genericName: 'Bepotastine', doses: ['1.5% drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Alcaftadine Eye Drops', genericName: 'Alcaftadine', doses: ['0.25% drops'], routes: ['ophthalmic'], frequency: ['Once daily'], maxDaily: '1 dose', renalAdjust: false },
        { name: 'Emedastine Eye Drops', genericName: 'Emedastine', doses: ['0.05% drops'], routes: ['ophthalmic'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Antazoline/Xylometazoline Eye Drops', genericName: 'Otrivine-Antistin', doses: ['Drops'], routes: ['ophthalmic'], frequency: ['8-12 hourly'], maxDaily: '2 doses', renalAdjust: false },
      ],
    },
    {
      id: 'eye_glaucoma',
      name: 'Glaucoma & Ocular Hypertension',
      medications: [
        // Prostaglandin Analogues
        { name: 'Latanoprost Eye Drops', genericName: 'Latanoprost', doses: ['0.005% drops'], routes: ['ophthalmic'], frequency: ['Once daily at night'], maxDaily: '1 drop/eye', renalAdjust: false },
        { name: 'Travoprost Eye Drops', genericName: 'Travoprost', doses: ['0.004% drops'], routes: ['ophthalmic'], frequency: ['Once daily at night'], maxDaily: '1 drop/eye', renalAdjust: false },
        { name: 'Bimatoprost Eye Drops', genericName: 'Bimatoprost', doses: ['0.01% drops', '0.03% drops'], routes: ['ophthalmic'], frequency: ['Once daily at night'], maxDaily: '1 drop/eye', renalAdjust: false },
        { name: 'Tafluprost Eye Drops', genericName: 'Tafluprost', doses: ['0.0015% drops'], routes: ['ophthalmic'], frequency: ['Once daily at night'], maxDaily: '1 drop/eye', renalAdjust: false },
        { name: 'Latanoprostene Bunod', genericName: 'Latanoprostene Bunod', doses: ['0.024% drops'], routes: ['ophthalmic'], frequency: ['Once daily at night'], maxDaily: '1 drop/eye', renalAdjust: false },
        // Beta-Blockers
        { name: 'Timolol Eye Drops', genericName: 'Timolol', doses: ['0.25% drops', '0.5% drops', '0.1% gel'], routes: ['ophthalmic'], frequency: ['12 hourly', 'Once daily gel'], maxDaily: '2 drops/eye', renalAdjust: false },
        { name: 'Betaxolol Eye Drops', genericName: 'Betaxolol', doses: ['0.25% suspension', '0.5% drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 drops/eye', renalAdjust: false },
        { name: 'Levobunolol Eye Drops', genericName: 'Levobunolol', doses: ['0.25% drops', '0.5% drops'], routes: ['ophthalmic'], frequency: ['Once-twice daily'], maxDaily: '2 drops/eye', renalAdjust: false },
        { name: 'Carteolol Eye Drops', genericName: 'Carteolol', doses: ['1% drops', '2% drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 drops/eye', renalAdjust: false },
        // Carbonic Anhydrase Inhibitors - Topical
        { name: 'Dorzolamide Eye Drops', genericName: 'Dorzolamide', doses: ['2% drops'], routes: ['ophthalmic'], frequency: ['8 hourly'], maxDaily: '3 drops/eye', renalAdjust: true },
        { name: 'Brinzolamide Eye Drops', genericName: 'Brinzolamide', doses: ['1% suspension'], routes: ['ophthalmic'], frequency: ['8-12 hourly'], maxDaily: '3 drops/eye', renalAdjust: true },
        // Carbonic Anhydrase Inhibitors - Systemic
        { name: 'Acetazolamide', genericName: 'Acetazolamide', doses: ['250mg', '500mg SR', '500mg IV'], routes: ['oral', 'intravenous'], frequency: ['6-8 hourly'], maxDaily: '1g', renalAdjust: true },
        // Alpha-2 Agonists
        { name: 'Brimonidine Eye Drops', genericName: 'Brimonidine', doses: ['0.1% drops', '0.15% drops', '0.2% drops'], routes: ['ophthalmic'], frequency: ['8-12 hourly'], maxDaily: '3 drops/eye', renalAdjust: false },
        { name: 'Apraclonidine Eye Drops', genericName: 'Apraclonidine', doses: ['0.5% drops', '1% drops'], routes: ['ophthalmic'], frequency: ['8 hourly', 'Pre/post laser'], maxDaily: '3 drops/eye', renalAdjust: false },
        // Miotics
        { name: 'Pilocarpine Eye Drops', genericName: 'Pilocarpine', doses: ['1% drops', '2% drops', '4% drops'], routes: ['ophthalmic'], frequency: ['6-8 hourly'], maxDaily: '4 drops/eye', renalAdjust: false },
        // ROCK Inhibitor
        { name: 'Netarsudil Eye Drops', genericName: 'Netarsudil', doses: ['0.02% drops'], routes: ['ophthalmic'], frequency: ['Once daily at night'], maxDaily: '1 drop/eye', renalAdjust: false },
        // Combinations
        { name: 'Latanoprost/Timolol', genericName: 'Xalacom', doses: ['Drops'], routes: ['ophthalmic'], frequency: ['Once daily'], maxDaily: '1 drop/eye', renalAdjust: false },
        { name: 'Dorzolamide/Timolol', genericName: 'Cosopt', doses: ['Drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 drops/eye', renalAdjust: true },
        { name: 'Brimonidine/Timolol', genericName: 'Combigan', doses: ['Drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 drops/eye', renalAdjust: false },
        { name: 'Brinzolamide/Brimonidine', genericName: 'Simbrinza', doses: ['Drops'], routes: ['ophthalmic'], frequency: ['8-12 hourly'], maxDaily: '3 drops/eye', renalAdjust: true },
        { name: 'Brimonidine/Brinzolamide/Timolol', genericName: 'Triple therapy', doses: ['Compounded'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: 'Per protocol', renalAdjust: true },
        { name: 'Netarsudil/Latanoprost', genericName: 'Rocklatan', doses: ['Drops'], routes: ['ophthalmic'], frequency: ['Once daily at night'], maxDaily: '1 drop/eye', renalAdjust: false },
      ],
    },
    {
      id: 'eye_lubricants',
      name: 'Dry Eye & Ocular Lubricants',
      medications: [
        { name: 'Hypromellose Eye Drops', genericName: 'Hypromellose', doses: ['0.3% drops', '0.5% drops'], routes: ['ophthalmic'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Carbomer Eye Gel', genericName: 'Carbomer 940', doses: ['0.2% gel'], routes: ['ophthalmic'], frequency: ['8-12 hourly'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Polyvinyl Alcohol Eye Drops', genericName: 'Liquifilm Tears', doses: ['1.4% drops'], routes: ['ophthalmic'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Sodium Hyaluronate Eye Drops', genericName: 'Sodium Hyaluronate', doses: ['0.1% drops', '0.15% drops', '0.18% drops', '0.2% drops'], routes: ['ophthalmic'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Carmellose Eye Drops', genericName: 'Carmellose', doses: ['0.5% drops', '1% drops'], routes: ['ophthalmic'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Hydroxypropyl Guar Eye Drops', genericName: 'Systane', doses: ['Drops', 'Gel drops'], routes: ['ophthalmic'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Trehalose/Hyaluronate Eye Drops', genericName: 'Thealoz Duo', doses: ['Drops', 'Gel'], routes: ['ophthalmic'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Paraffin Eye Ointment', genericName: 'Lacri-Lube', doses: ['Ointment'], routes: ['ophthalmic'], frequency: ['At night'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Castor Oil Eye Drops', genericName: 'Castor Oil', doses: ['Lipid drops'], routes: ['ophthalmic'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Perfluorohexyloctane', genericName: 'Miebo', doses: ['Drops'], routes: ['ophthalmic'], frequency: ['4 times daily'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Ciclosporin Eye Drops', genericName: 'Ciclosporin', doses: ['0.05% drops', '0.1% drops'], routes: ['ophthalmic'], frequency: ['Once-twice daily'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Lifitegrast Eye Drops', genericName: 'Lifitegrast', doses: ['5% drops'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Varenicline Nasal Spray', genericName: 'Tyrvaya', doses: ['0.03mg/spray'], routes: ['nasal'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false, specialInstructions: 'For dry eye via lacrimal stimulation' },
      ],
    },
    {
      id: 'eye_mydriatics_cycloplegics',
      name: 'Mydriatics & Cycloplegics',
      medications: [
        { name: 'Tropicamide Eye Drops', genericName: 'Tropicamide', doses: ['0.5% drops', '1% drops'], routes: ['ophthalmic'], frequency: ['Pre-examination'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Cyclopentolate Eye Drops', genericName: 'Cyclopentolate', doses: ['0.5% drops', '1% drops'], routes: ['ophthalmic'], frequency: ['Pre-refraction'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Atropine Eye Drops', genericName: 'Atropine', doses: ['0.5% drops', '1% drops'], routes: ['ophthalmic'], frequency: ['Once-twice daily'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Homatropine Eye Drops', genericName: 'Homatropine', doses: ['2% drops', '5% drops'], routes: ['ophthalmic'], frequency: ['Pre-refraction'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Phenylephrine Eye Drops', genericName: 'Phenylephrine', doses: ['2.5% drops', '10% drops'], routes: ['ophthalmic'], frequency: ['Pre-examination'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Tropicamide/Phenylephrine', genericName: 'Mydrin-P', doses: ['Combination drops'], routes: ['ophthalmic'], frequency: ['Pre-examination'], maxDaily: 'Per procedure', renalAdjust: false },
      ],
    },
    {
      id: 'eye_other',
      name: 'Other Eye Preparations',
      medications: [
        // Local Anaesthetics
        { name: 'Proxymetacaine Eye Drops', genericName: 'Proparacaine', doses: ['0.5% drops'], routes: ['ophthalmic'], frequency: ['Pre-procedure'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Oxybuprocaine Eye Drops', genericName: 'Benoxinate', doses: ['0.4% drops'], routes: ['ophthalmic'], frequency: ['Pre-procedure'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Tetracaine Eye Drops', genericName: 'Amethocaine', doses: ['0.5% drops', '1% drops'], routes: ['ophthalmic'], frequency: ['Pre-procedure'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Lidocaine Eye Gel', genericName: 'Lidocaine', doses: ['2% gel'], routes: ['ophthalmic'], frequency: ['Pre-procedure'], maxDaily: 'Per procedure', renalAdjust: false },
        // Anti-VEGF Intravitreal
        { name: 'Ranibizumab', genericName: 'Ranibizumab', doses: ['0.5mg/0.05ml', '0.3mg/0.05ml'], routes: ['intravitreal'], frequency: ['Every 4-8 weeks'], maxDaily: '0.5mg', renalAdjust: false },
        { name: 'Aflibercept', genericName: 'Aflibercept', doses: ['2mg/0.05ml', '8mg/0.07ml'], routes: ['intravitreal'], frequency: ['Every 4-16 weeks'], maxDaily: '8mg', renalAdjust: false },
        { name: 'Bevacizumab', genericName: 'Bevacizumab', doses: ['1.25mg/0.05ml'], routes: ['intravitreal'], frequency: ['Every 4-8 weeks'], maxDaily: '1.25mg', renalAdjust: false },
        { name: 'Brolucizumab', genericName: 'Brolucizumab', doses: ['6mg/0.05ml'], routes: ['intravitreal'], frequency: ['Every 8-12 weeks'], maxDaily: '6mg', renalAdjust: false },
        { name: 'Faricimab', genericName: 'Faricimab', doses: ['6mg/0.05ml'], routes: ['intravitreal'], frequency: ['Every 8-16 weeks'], maxDaily: '6mg', renalAdjust: false },
        // Intravitreal Steroids
        { name: 'Dexamethasone Implant', genericName: 'Ozurdex', doses: ['0.7mg implant'], routes: ['intravitreal'], frequency: ['Every 3-6 months'], maxDaily: '0.7mg', renalAdjust: false },
        { name: 'Fluocinolone Implant', genericName: 'Iluvien', doses: ['0.19mg implant'], routes: ['intravitreal'], frequency: ['Every 3 years'], maxDaily: '0.19mg', renalAdjust: false },
        { name: 'Triamcinolone Intravitreal', genericName: 'Triamcinolone', doses: ['4mg/0.1ml'], routes: ['intravitreal'], frequency: ['As required'], maxDaily: '4mg', renalAdjust: false },
        // Diagnostic Stains
        { name: 'Fluorescein Eye Drops', genericName: 'Fluorescein', doses: ['1% drops', '2% drops'], routes: ['ophthalmic'], frequency: ['Diagnostic'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Lissamine Green Eye Drops', genericName: 'Lissamine Green', doses: ['Strips'], routes: ['ophthalmic'], frequency: ['Diagnostic'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Rose Bengal Eye Drops', genericName: 'Rose Bengal', doses: ['1% drops'], routes: ['ophthalmic'], frequency: ['Diagnostic'], maxDaily: 'Per procedure', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 12. EAR, NOSE & OROPHARYNX
// ============================================
export const entMedications: BNFCategory = {
  id: 'ent',
  name: 'Ear, Nose & Oropharynx',
  subcategories: [
    {
      id: 'ear_preparations',
      name: 'Ear Preparations',
      medications: [
        // Cerumenolytics
        { name: 'Sodium Bicarbonate Ear Drops', genericName: 'Sodium Bicarbonate', doses: ['5% drops'], routes: ['otic'], frequency: ['8-12 hourly x 3-7 days before syringing'], maxDaily: '2-3 doses', renalAdjust: false },
        { name: 'Olive Oil Ear Drops', genericName: 'Olive Oil', doses: ['Drops'], routes: ['otic'], frequency: ['8 hourly x 3-7 days'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Almond Oil Ear Drops', genericName: 'Almond Oil', doses: ['Drops'], routes: ['otic'], frequency: ['8 hourly x 3-7 days'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Docusate Sodium Ear Drops', genericName: 'Docusate', doses: ['5% drops'], routes: ['otic'], frequency: ['12 hourly x 2 days'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Carbamide Peroxide Ear Drops', genericName: 'Carbamide Peroxide', doses: ['6.5% drops'], routes: ['otic'], frequency: ['12 hourly x 3-4 days'], maxDaily: '2 doses', renalAdjust: false },
        // Antibacterial/Antifungal
        { name: 'Ciprofloxacin Ear Drops', genericName: 'Ciprofloxacin', doses: ['0.2% drops', '0.3% drops'], routes: ['otic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Ofloxacin Ear Drops', genericName: 'Ofloxacin', doses: ['0.3% drops'], routes: ['otic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Gentamicin Ear Drops', genericName: 'Gentamicin', doses: ['0.3% drops'], routes: ['otic'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false, specialInstructions: 'Avoid if perforated eardrum' },
        { name: 'Neomycin Ear Drops', genericName: 'Neomycin', doses: ['0.5% drops'], routes: ['otic'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false, specialInstructions: 'Avoid if perforated eardrum' },
        { name: 'Chloramphenicol Ear Drops', genericName: 'Chloramphenicol', doses: ['5% drops', '10% drops'], routes: ['otic'], frequency: ['8-12 hourly'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Clotrimazole Ear Drops', genericName: 'Clotrimazole', doses: ['1% solution'], routes: ['otic'], frequency: ['8-12 hourly'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Acetic Acid Ear Drops', genericName: 'Acetic Acid', doses: ['2% drops'], routes: ['otic'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
        // Steroid Combinations
        { name: 'Dexamethasone/Ciprofloxacin Ear Drops', genericName: 'Cetraxal Plus', doses: ['Drops'], routes: ['otic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Betamethasone/Neomycin Ear Drops', genericName: 'Betnesol-N', doses: ['Drops'], routes: ['otic'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Prednisolone/Neomycin Ear Drops', genericName: 'Predsol-N', doses: ['Drops'], routes: ['otic'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Hydrocortisone/Neomycin/Polymyxin', genericName: 'Otosporin', doses: ['Drops'], routes: ['otic'], frequency: ['8 hourly'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Fluocinolone/Ciprofloxacin Ear Drops', genericName: 'Ciproxin HC', doses: ['Drops'], routes: ['otic'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Dexamethasone/Framycetin/Gramicidin', genericName: 'Sofradex', doses: ['Drops'], routes: ['otic'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
        // Analgesics
        { name: 'Lidocaine/Phenazone Ear Drops', genericName: 'Auralgan', doses: ['Drops'], routes: ['otic'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
      ],
    },
    {
      id: 'nasal_preparations',
      name: 'Nasal Preparations',
      medications: [
        // Decongestants
        { name: 'Xylometazoline Nasal Spray', genericName: 'Xylometazoline', doses: ['0.05% paediatric', '0.1% adult'], routes: ['nasal'], frequency: ['8-12 hourly'], maxDaily: '2-3 doses', renalAdjust: false, specialInstructions: 'Max 7 days use' },
        { name: 'Oxymetazoline Nasal Spray', genericName: 'Oxymetazoline', doses: ['0.025% paediatric', '0.05% adult'], routes: ['nasal'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false, specialInstructions: 'Max 5-7 days use' },
        { name: 'Phenylephrine Nasal Spray', genericName: 'Phenylephrine', doses: ['0.25% drops', '0.5% spray'], routes: ['nasal'], frequency: ['4-6 hourly'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Ephedrine Nasal Drops', genericName: 'Ephedrine', doses: ['0.5% drops', '1% drops'], routes: ['nasal'], frequency: ['8 hourly'], maxDaily: '3 doses', renalAdjust: false, specialInstructions: 'Max 7 days use' },
        // Nasal Corticosteroids
        { name: 'Beclometasone Nasal Spray', genericName: 'Beclomethasone', doses: ['50mcg/spray'], routes: ['nasal'], frequency: ['12 hourly, 2 sprays each nostril'], maxDaily: '400mcg', renalAdjust: false },
        { name: 'Fluticasone Propionate Nasal Spray', genericName: 'Fluticasone Propionate', doses: ['50mcg/spray'], routes: ['nasal'], frequency: ['Once-twice daily, 2 sprays each nostril'], maxDaily: '200mcg', renalAdjust: false },
        { name: 'Fluticasone Furoate Nasal Spray', genericName: 'Fluticasone Furoate', doses: ['27.5mcg/spray'], routes: ['nasal'], frequency: ['Once daily, 2 sprays each nostril'], maxDaily: '110mcg', renalAdjust: false },
        { name: 'Mometasone Nasal Spray', genericName: 'Mometasone', doses: ['50mcg/spray'], routes: ['nasal'], frequency: ['Once daily, 2 sprays each nostril'], maxDaily: '200mcg', renalAdjust: false },
        { name: 'Triamcinolone Nasal Spray', genericName: 'Triamcinolone', doses: ['55mcg/spray'], routes: ['nasal'], frequency: ['Once daily, 2 sprays each nostril'], maxDaily: '220mcg', renalAdjust: false },
        { name: 'Budesonide Nasal Spray', genericName: 'Budesonide', doses: ['64mcg/spray', '100mcg/spray'], routes: ['nasal'], frequency: ['Once-twice daily'], maxDaily: '256mcg', renalAdjust: false },
        { name: 'Ciclesonide Nasal Spray', genericName: 'Ciclesonide', doses: ['50mcg/spray'], routes: ['nasal'], frequency: ['Once daily, 2 sprays each nostril'], maxDaily: '200mcg', renalAdjust: false },
        // Antihistamine Nasal
        { name: 'Azelastine Nasal Spray', genericName: 'Azelastine', doses: ['140mcg/spray'], routes: ['nasal'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Olopatadine Nasal Spray', genericName: 'Olopatadine', doses: ['665mcg/spray'], routes: ['nasal'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        // Combinations
        { name: 'Azelastine/Fluticasone Nasal Spray', genericName: 'Dymista', doses: ['137mcg/50mcg/spray'], routes: ['nasal'], frequency: ['12 hourly, 1 spray each nostril'], maxDaily: '2 doses', renalAdjust: false },
        // Anticholinergic
        { name: 'Ipratropium Nasal Spray', genericName: 'Ipratropium', doses: ['21mcg/spray', '42mcg/spray'], routes: ['nasal'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
        // Saline
        { name: 'Sodium Chloride Nasal Spray', genericName: 'Normal Saline', doses: ['0.9% spray/drops'], routes: ['nasal'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Hypertonic Saline Nasal Spray', genericName: 'Hypertonic Saline', doses: ['3% spray'], routes: ['nasal'], frequency: ['8-12 hourly'], maxDaily: '3 doses', renalAdjust: false },
        // Nasal Antibiotics
        { name: 'Mupirocin Nasal Ointment', genericName: 'Mupirocin', doses: ['2% ointment'], routes: ['nasal'], frequency: ['8-12 hourly x 5-7 days'], maxDaily: '3 doses', renalAdjust: false, specialInstructions: 'MRSA decolonisation' },
        // Epistaxis
        { name: 'Tranexamic Acid Nasal Spray', genericName: 'Tranexamic Acid', doses: ['10mg/spray'], routes: ['nasal'], frequency: ['For epistaxis'], maxDaily: 'Per protocol', renalAdjust: true },
      ],
    },
    {
      id: 'oropharynx_preparations',
      name: 'Oropharyngeal Preparations',
      medications: [
        // Antiseptic/Antibacterial Lozenges/Sprays
        { name: 'Chlorhexidine Mouthwash', genericName: 'Chlorhexidine', doses: ['0.2% mouthwash'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Chlorhexidine Gel', genericName: 'Chlorhexidine', doses: ['1% gel'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Hexetidine Mouthwash', genericName: 'Hexetidine', doses: ['0.1% mouthwash'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Povidone-Iodine Mouthwash', genericName: 'Povidone-Iodine', doses: ['1% mouthwash'], routes: ['oral'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Hydrogen Peroxide Mouthwash', genericName: 'Hydrogen Peroxide', doses: ['1.5% mouthwash', '6% solution diluted'], routes: ['oral'], frequency: ['8-12 hourly'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Benzydamine Mouthwash/Spray', genericName: 'Benzydamine', doses: ['0.15% mouthwash', 'Spray'], routes: ['oral'], frequency: ['4-6 hourly'], maxDaily: '6 doses', renalAdjust: false },
        // Antifungal Oral
        { name: 'Nystatin Oral Suspension', genericName: 'Nystatin', doses: ['100000 units/ml'], routes: ['oral'], frequency: ['6 hourly x 7 days'], maxDaily: '4 doses', renalAdjust: false, specialInstructions: 'Hold in mouth before swallowing' },
        { name: 'Miconazole Oral Gel', genericName: 'Miconazole', doses: ['24mg/ml gel'], routes: ['oral'], frequency: ['6 hourly x 7 days'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Amphotericin Lozenges', genericName: 'Amphotericin', doses: ['10mg lozenges'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '4 doses', renalAdjust: false },
        // Analgesic/Anti-inflammatory
        { name: 'Benzocaine Lozenges', genericName: 'Benzocaine', doses: ['10mg lozenges'], routes: ['oral'], frequency: ['4 hourly PRN'], maxDaily: '6 doses', renalAdjust: false },
        { name: 'Lidocaine Gel/Spray', genericName: 'Lidocaine', doses: ['2% gel', '4% spray'], routes: ['oral'], frequency: ['6-8 hourly'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Flurbiprofen Lozenges', genericName: 'Flurbiprofen', doses: ['8.75mg lozenges'], routes: ['oral'], frequency: ['3-6 hourly'], maxDaily: '5 lozenges', renalAdjust: true },
        // Dry Mouth
        { name: 'Artificial Saliva (Carmellose)', genericName: 'Glandosane', doses: ['Spray'], routes: ['oral'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Artificial Saliva (Mucin-based)', genericName: 'BioXtra', doses: ['Gel/spray'], routes: ['oral'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Pilocarpine', genericName: 'Pilocarpine', doses: ['5mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '30mg', renalAdjust: false, specialInstructions: 'For radiation-induced xerostomia' },
        // Oral Ulcers
        { name: 'Hydrocortisone Oromucosal Tablets', genericName: 'Corlan', doses: ['2.5mg pellets'], routes: ['oral'], frequency: ['6 hourly, dissolve near ulcer'], maxDaily: '4 doses', renalAdjust: false },
        { name: 'Triamcinolone Dental Paste', genericName: 'Adcortyl in Orabase', doses: ['0.1% paste'], routes: ['oral'], frequency: ['8-12 hourly'], maxDaily: '3 doses', renalAdjust: false },
        { name: 'Beclometasone Inhaler (for oral ulcers)', genericName: 'Beclometasone', doses: ['50-100mcg/spray'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2 doses', renalAdjust: false },
        { name: 'Carmellose Oral Paste', genericName: 'Orabase', doses: ['Paste'], routes: ['oral'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 13. SKIN
// ============================================
export const skinMedications: BNFCategory = {
  id: 'skin',
  name: 'Skin',
  subcategories: [
    {
      id: 'emollients',
      name: 'Emollients & Barrier Preparations',
      medications: [
        { name: 'White Soft Paraffin', genericName: 'White Soft Paraffin', doses: ['Ointment'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Yellow Soft Paraffin', genericName: 'Yellow Soft Paraffin', doses: ['Ointment'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Emulsifying Ointment', genericName: 'Emulsifying Ointment', doses: ['Ointment'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Aqueous Cream', genericName: 'Aqueous Cream', doses: ['Cream'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Cetomacrogol Cream', genericName: 'Cetomacrogol', doses: ['Cream'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Diprobase', genericName: 'Diprobase', doses: ['Cream', 'Ointment'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Doublebase', genericName: 'Doublebase', doses: ['Gel', 'Emollient'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Hydromol', genericName: 'Hydromol', doses: ['Cream', 'Ointment'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Epaderm', genericName: 'Epaderm', doses: ['Cream', 'Ointment'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Cetraben', genericName: 'Cetraben', doses: ['Cream', 'Ointment'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'E45', genericName: 'E45', doses: ['Cream', 'Lotion'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Oilatum', genericName: 'Oilatum', doses: ['Cream', 'Junior cream', 'Bath'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Aveeno', genericName: 'Aveeno', doses: ['Cream', 'Lotion', 'Bath'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        // Barrier Preparations
        { name: 'Zinc Oxide Cream', genericName: 'Zinc Oxide', doses: ['15% cream/ointment'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Zinc/Castor Oil Cream', genericName: 'Zinc/Castor Oil', doses: ['Cream'], routes: ['topical'], frequency: ['Each nappy change'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Dimethicone Barrier Cream', genericName: 'Dimethicone', doses: ['1000 cream'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Sudocrem', genericName: 'Sudocrem', doses: ['Cream'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Cavilon Barrier Film', genericName: 'Cavilon', doses: ['Film'], routes: ['topical'], frequency: ['72 hourly'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'topical_corticosteroids',
      name: 'Topical Corticosteroids',
      medications: [
        // Mild
        { name: 'Hydrocortisone 0.5%', genericName: 'Hydrocortisone', doses: ['0.5% cream/ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Hydrocortisone 1%', genericName: 'Hydrocortisone', doses: ['1% cream/ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Hydrocortisone 2.5%', genericName: 'Hydrocortisone', doses: ['2.5% cream/ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        // Moderate
        { name: 'Clobetasone Butyrate 0.05%', genericName: 'Eumovate', doses: ['0.05% cream/ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Betamethasone Valerate 0.025%', genericName: 'Betnovate RD', doses: ['0.025% cream/ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Fluocinolone Acetonide 0.00625%', genericName: 'Synalar 1 in 4', doses: ['0.00625% cream'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Triamcinolone Acetonide 0.02%', genericName: 'Triamcinolone', doses: ['0.02% cream'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        // Potent
        { name: 'Betamethasone Valerate 0.1%', genericName: 'Betnovate', doses: ['0.1% cream/ointment/lotion'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Betamethasone Dipropionate 0.05%', genericName: 'Diprosone', doses: ['0.05% cream/ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Mometasone Furoate 0.1%', genericName: 'Elocon', doses: ['0.1% cream/ointment'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Fluocinolone Acetonide 0.025%', genericName: 'Synalar', doses: ['0.025% cream/ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Fluocinonide 0.05%', genericName: 'Fluocinonide', doses: ['0.05% cream/ointment/gel'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Triamcinolone Acetonide 0.1%', genericName: 'Triamcinolone', doses: ['0.1% cream/ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Hydrocortisone Butyrate 0.1%', genericName: 'Locoid', doses: ['0.1% cream/ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        // Very Potent
        { name: 'Clobetasol Propionate 0.05%', genericName: 'Dermovate', doses: ['0.05% cream/ointment/scalp'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false, specialInstructions: 'Max 2 weeks continuous, 50g/week' },
        { name: 'Diflucortolone Valerate 0.3%', genericName: 'Nerisone Forte', doses: ['0.3% ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Halcinonide 0.1%', genericName: 'Halcinonide', doses: ['0.1% cream'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        // Combinations with Antimicrobials
        { name: 'Hydrocortisone/Fusidic Acid', genericName: 'Fucidin H', doses: ['Cream'], routes: ['topical'], frequency: ['8-12 hourly'], maxDaily: '3 applications', renalAdjust: false },
        { name: 'Hydrocortisone/Miconazole', genericName: 'Daktacort', doses: ['Cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Hydrocortisone/Clotrimazole', genericName: 'Canesten HC', doses: ['Cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Betamethasone/Fusidic Acid', genericName: 'Fucicort', doses: ['Cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Betamethasone/Clotrimazole', genericName: 'Lotriderm', doses: ['Cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Betamethasone/Neomycin', genericName: 'Betnovate-N', doses: ['Cream/ointment'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Clobetasone/Nystatin/Oxytetracycline', genericName: 'Trimovate', doses: ['Cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
      ],
    },
    {
      id: 'topical_anti_infective',
      name: 'Topical Anti-infective Preparations',
      medications: [
        // Antibacterials
        { name: 'Fusidic Acid Cream', genericName: 'Fusidic Acid', doses: ['2% cream/ointment'], routes: ['topical'], frequency: ['8-12 hourly'], maxDaily: '3 applications', renalAdjust: false },
        { name: 'Mupirocin Ointment', genericName: 'Mupirocin', doses: ['2% ointment'], routes: ['topical'], frequency: ['8 hourly x 10 days'], maxDaily: '3 applications', renalAdjust: false },
        { name: 'Retapamulin Ointment', genericName: 'Retapamulin', doses: ['1% ointment'], routes: ['topical'], frequency: ['12 hourly x 5 days'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Neomycin Cream', genericName: 'Neomycin', doses: ['0.5% cream'], routes: ['topical'], frequency: ['8 hourly'], maxDaily: '3 applications', renalAdjust: false },
        { name: 'Silver Sulfadiazine Cream', genericName: 'Flamazine', doses: ['1% cream'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Metronidazole Gel', genericName: 'Metronidazole', doses: ['0.75% gel', '0.8% gel'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Clindamycin Solution/Gel', genericName: 'Clindamycin', doses: ['1% solution/gel/lotion'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Erythromycin Gel', genericName: 'Erythromycin', doses: ['2% gel', '4% solution'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        // Antifungals
        { name: 'Clotrimazole Cream', genericName: 'Clotrimazole', doses: ['1% cream'], routes: ['topical'], frequency: ['8-12 hourly'], maxDaily: '3 applications', renalAdjust: false },
        { name: 'Miconazole Cream', genericName: 'Miconazole', doses: ['2% cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Ketoconazole Cream', genericName: 'Ketoconazole', doses: ['2% cream'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Ketoconazole Shampoo', genericName: 'Ketoconazole', doses: ['2% shampoo'], routes: ['topical'], frequency: ['Twice weekly'], maxDaily: '2 applications/week', renalAdjust: false },
        { name: 'Terbinafine Cream', genericName: 'Terbinafine', doses: ['1% cream'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Amorolfine Nail Lacquer', genericName: 'Amorolfine', doses: ['5% lacquer'], routes: ['topical'], frequency: ['Once-twice weekly'], maxDaily: '2 applications/week', renalAdjust: false },
        { name: 'Ciclopirox Nail Lacquer', genericName: 'Ciclopirox', doses: ['8% lacquer'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Nystatin Cream', genericName: 'Nystatin', doses: ['100000 units/g cream'], routes: ['topical'], frequency: ['8-12 hourly'], maxDaily: '3 applications', renalAdjust: false },
        // Antivirals
        { name: 'Aciclovir Cream', genericName: 'Acyclovir', doses: ['5% cream'], routes: ['topical'], frequency: ['5 times daily x 5-10 days'], maxDaily: '5 applications', renalAdjust: false },
        { name: 'Penciclovir Cream', genericName: 'Penciclovir', doses: ['1% cream'], routes: ['topical'], frequency: ['2 hourly while awake x 4 days'], maxDaily: '8 applications', renalAdjust: false },
        // Antiparasitics
        { name: 'Permethrin Cream', genericName: 'Permethrin', doses: ['5% cream'], routes: ['topical'], frequency: ['Single application, repeat after 7 days'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Malathion Lotion', genericName: 'Malathion', doses: ['0.5% lotion'], routes: ['topical'], frequency: ['Single application'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Benzyl Benzoate', genericName: 'Benzyl Benzoate', doses: ['25% emulsion'], routes: ['topical'], frequency: ['Apply x 3 consecutive days'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Dimeticone Lotion', genericName: 'Dimeticone', doses: ['4% lotion'], routes: ['topical'], frequency: ['Single application'], maxDaily: '1 application', renalAdjust: false },
      ],
    },
    {
      id: 'acne_rosacea',
      name: 'Acne & Rosacea',
      medications: [
        // Topical Retinoids
        { name: 'Tretinoin Cream', genericName: 'Tretinoin', doses: ['0.025%', '0.05%', '0.1% cream/gel'], routes: ['topical'], frequency: ['Once daily at night'], maxDaily: '1 application', renalAdjust: false, pregnancyCategory: 'X' },
        { name: 'Adapalene Gel', genericName: 'Adapalene', doses: ['0.1% gel/cream', '0.3% gel'], routes: ['topical'], frequency: ['Once daily at night'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Tazarotene Gel', genericName: 'Tazarotene', doses: ['0.05% gel', '0.1% gel'], routes: ['topical'], frequency: ['Once daily at night'], maxDaily: '1 application', renalAdjust: false, pregnancyCategory: 'X' },
        { name: 'Trifarotene Cream', genericName: 'Trifarotene', doses: ['0.005% cream'], routes: ['topical'], frequency: ['Once daily at night'], maxDaily: '1 application', renalAdjust: false },
        // Benzoyl Peroxide
        { name: 'Benzoyl Peroxide Gel', genericName: 'Benzoyl Peroxide', doses: ['2.5%', '4%', '5%', '10% gel/wash'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Benzoyl Peroxide/Clindamycin', genericName: 'Duac', doses: ['Gel'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Benzoyl Peroxide/Adapalene', genericName: 'Epiduo', doses: ['2.5%/0.1% gel', '2.5%/0.3% gel'], routes: ['topical'], frequency: ['Once daily at night'], maxDaily: '1 application', renalAdjust: false },
        // Azelaic Acid
        { name: 'Azelaic Acid Cream', genericName: 'Azelaic Acid', doses: ['15% gel', '20% cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        // Topical Antibiotics
        { name: 'Clindamycin/Tretinoin', genericName: 'Clindamycin/Tretinoin', doses: ['Gel'], routes: ['topical'], frequency: ['Once daily at night'], maxDaily: '1 application', renalAdjust: false },
        // Rosacea Specific
        { name: 'Metronidazole Gel (Rosacea)', genericName: 'Metronidazole', doses: ['0.75% gel/cream', '1% cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Ivermectin Cream', genericName: 'Ivermectin', doses: ['1% cream'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Brimonidine Gel', genericName: 'Brimonidine', doses: ['0.33% gel'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Oxymetazoline Cream', genericName: 'Oxymetazoline', doses: ['1% cream'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        // Oral Acne Treatments
        { name: 'Isotretinoin', genericName: 'Isotretinoin', doses: ['10mg', '20mg', '40mg', '0.5-1mg/kg/day'], routes: ['oral'], frequency: ['Once-twice daily with food'], maxDaily: '1mg/kg', renalAdjust: false, pregnancyCategory: 'X', specialInstructions: 'Pregnancy prevention programme required' },
        { name: 'Doxycycline (Acne)', genericName: 'Doxycycline', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['Once-twice daily'], maxDaily: '200mg', renalAdjust: false },
        { name: 'Lymecycline', genericName: 'Lymecycline', doses: ['408mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '408mg', renalAdjust: true },
        { name: 'Minocycline', genericName: 'Minocycline', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['Once-twice daily'], maxDaily: '200mg', renalAdjust: true },
      ],
    },
    {
      id: 'psoriasis_eczema',
      name: 'Psoriasis & Eczema Preparations',
      medications: [
        // Vitamin D Analogues
        { name: 'Calcipotriol Ointment', genericName: 'Calcipotriol', doses: ['50mcg/g ointment/cream/scalp'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '100g/week', renalAdjust: false },
        { name: 'Calcitriol Ointment', genericName: 'Calcitriol', doses: ['3mcg/g ointment'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '35g/day', renalAdjust: true },
        { name: 'Tacalcitol Ointment', genericName: 'Tacalcitol', doses: ['4mcg/g ointment'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '10g/day', renalAdjust: false },
        { name: 'Calcipotriol/Betamethasone', genericName: 'Dovobet/Enstilar', doses: ['Gel', 'Ointment', 'Foam'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '15g/day', renalAdjust: false },
        // Coal Tar
        { name: 'Coal Tar Ointment', genericName: 'Coal Tar', doses: ['1-5% ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Coal Tar Shampoo', genericName: 'Coal Tar', doses: ['Shampoo'], routes: ['topical'], frequency: ['Twice weekly'], maxDaily: '2 applications/week', renalAdjust: false },
        { name: 'Coal Tar/Salicylic Acid', genericName: 'Cocois', doses: ['Scalp ointment'], routes: ['topical'], frequency: ['Once weekly'], maxDaily: '1 application', renalAdjust: false },
        // Dithranol
        { name: 'Dithranol Cream', genericName: 'Dithranol', doses: ['0.1%', '0.25%', '0.5%', '1%', '2% cream'], routes: ['topical'], frequency: ['Once daily short contact'], maxDaily: '1 application', renalAdjust: false },
        // Calcineurin Inhibitors (Topical)
        { name: 'Tacrolimus Ointment', genericName: 'Protopic', doses: ['0.03% ointment', '0.1% ointment'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Pimecrolimus Cream', genericName: 'Elidel', doses: ['1% cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        // PDE4 Inhibitors
        { name: 'Crisaborole Ointment', genericName: 'Crisaborole', doses: ['2% ointment'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Roflumilast Cream', genericName: 'Roflumilast', doses: ['0.3% cream'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        // JAK Inhibitor (Topical)
        { name: 'Ruxolitinib Cream', genericName: 'Ruxolitinib', doses: ['1.5% cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        { name: 'Delgocitinib Cream', genericName: 'Delgocitinib', doses: ['0.5% cream'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '2 applications', renalAdjust: false },
        // Salicylic Acid
        { name: 'Salicylic Acid Ointment', genericName: 'Salicylic Acid', doses: ['2%', '5%', '10% ointment'], routes: ['topical'], frequency: ['Once-twice daily'], maxDaily: '2 applications', renalAdjust: false },
      ],
    },
    {
      id: 'wound_ulcer_skin',
      name: 'Wound & Ulcer Preparations',
      medications: [
        // Wound Cleansers
        { name: 'Normal Saline Irrigation', genericName: 'Sodium Chloride', doses: ['0.9% solution'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Povidone-Iodine Solution', genericName: 'Povidone-Iodine', doses: ['10% solution'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Chlorhexidine Solution', genericName: 'Chlorhexidine', doses: ['0.05%', '0.5% solution'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Hydrogen Peroxide Solution', genericName: 'Hydrogen Peroxide', doses: ['3% solution'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Polyhexanide Solution', genericName: 'Prontosan', doses: ['Solution', 'Gel'], routes: ['topical'], frequency: ['Each dressing change'], maxDaily: 'As needed', renalAdjust: false },
        { name: 'Octenidine Solution', genericName: 'Octenisan', doses: ['Solution'], routes: ['topical'], frequency: ['As required'], maxDaily: 'As needed', renalAdjust: false },
        // Enzymatic Debriding
        { name: 'Collagenase Ointment', genericName: 'Collagenase', doses: ['Ointment'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        // Honey-based
        { name: 'Medical Grade Honey', genericName: 'Medihoney', doses: ['Gel', 'Dressing'], routes: ['topical'], frequency: ['Each dressing change'], maxDaily: 'Per protocol', renalAdjust: false },
        // Growth Factors
        { name: 'Becaplermin Gel', genericName: 'Becaplermin', doses: ['0.01% gel'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false, specialInstructions: 'Diabetic foot ulcers' },
        // Skin Substitutes
        { name: 'Apligraf', genericName: 'Apligraf', doses: ['Living skin construct'], routes: ['topical'], frequency: ['Weekly'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Dermagraft', genericName: 'Dermagraft', doses: ['Dermal substitute'], routes: ['topical'], frequency: ['Weekly x 8'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'antiperspirants_hyperhidrosis',
      name: 'Antiperspirants & Hyperhidrosis',
      medications: [
        { name: 'Aluminium Chloride', genericName: 'Driclor', doses: ['20% solution'], routes: ['topical'], frequency: ['At night'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Glycopyrronium Bromide Topical', genericName: 'Qbrexza', doses: ['2.4% cloth'], routes: ['topical'], frequency: ['Once daily'], maxDaily: '1 application', renalAdjust: false },
        { name: 'Glycopyrronium Bromide Oral', genericName: 'Glycopyrronium', doses: ['1mg', '2mg'], routes: ['oral'], frequency: ['8-12 hourly'], maxDaily: '8mg', renalAdjust: true },
        { name: 'Oxybutynin Oral', genericName: 'Oxybutynin', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['8-12 hourly'], maxDaily: '15mg', renalAdjust: true },
        { name: 'Botulinum Toxin (Hyperhidrosis)', genericName: 'Botox', doses: ['50 units per axilla'], routes: ['intradermal'], frequency: ['Every 4-6 months'], maxDaily: '200 units', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 14. IMMUNOLOGICAL PRODUCTS & VACCINES
// ============================================
export const vaccinesMedications: BNFCategory = {
  id: 'vaccines',
  name: 'Immunological Products & Vaccines',
  subcategories: [
    {
      id: 'immunoglobulins',
      name: 'Immunoglobulins',
      medications: [
        // Normal Immunoglobulin
        { name: 'Normal Immunoglobulin IV', genericName: 'IVIG', doses: ['0.4-2g/kg'], routes: ['intravenous'], frequency: ['Monthly or per protocol'], maxDaily: '2g/kg', renalAdjust: true },
        { name: 'Normal Immunoglobulin SC', genericName: 'SCIG', doses: ['0.1-0.2g/kg/week'], routes: ['subcutaneous'], frequency: ['Weekly'], maxDaily: '0.2g/kg', renalAdjust: true },
        // Specific Immunoglobulins
        { name: 'Hepatitis B Immunoglobulin', genericName: 'HBIG', doses: ['500 IU', '200 IU/kg'], routes: ['intramuscular', 'intravenous'], frequency: ['Single dose or per protocol'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Tetanus Immunoglobulin', genericName: 'TIG', doses: ['250 IU', '500 IU'], routes: ['intramuscular'], frequency: ['Single dose'], maxDaily: '500 IU', renalAdjust: false },
        { name: 'Rabies Immunoglobulin', genericName: 'RIG', doses: ['20 IU/kg'], routes: ['intramuscular', 'infiltration'], frequency: ['Single dose'], maxDaily: '20 IU/kg', renalAdjust: false },
        { name: 'Varicella-Zoster Immunoglobulin', genericName: 'VZIG', doses: ['250mg per 10kg'], routes: ['intramuscular'], frequency: ['Single dose'], maxDaily: 'Per weight', renalAdjust: false },
        { name: 'Anti-D Immunoglobulin', genericName: 'Anti-D (Rh)', doses: ['250 IU', '500 IU', '1500 IU'], routes: ['intramuscular', 'intravenous'], frequency: ['Per protocol'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Cytomegalovirus Immunoglobulin', genericName: 'CMV-IG', doses: ['100-150mg/kg'], routes: ['intravenous'], frequency: ['Per protocol'], maxDaily: 'Per protocol', renalAdjust: true },
        { name: 'Botulism Antitoxin', genericName: 'Botulism Antitoxin', doses: ['1 vial'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '1 vial', renalAdjust: false },
        { name: 'Palivizumab', genericName: 'Palivizumab', doses: ['15mg/kg'], routes: ['intramuscular'], frequency: ['Monthly during RSV season'], maxDaily: '15mg/kg', renalAdjust: false },
      ],
    },
    {
      id: 'vaccines_childhood',
      name: 'Childhood Vaccines',
      medications: [
        { name: 'BCG Vaccine', genericName: 'Bacillus Calmette-Guérin', doses: ['0.05ml intradermal'], routes: ['intradermal'], frequency: ['Single dose at birth'], maxDaily: 'Single dose', renalAdjust: false },
        { name: 'Hepatitis B Vaccine', genericName: 'Hepatitis B', doses: ['10mcg paediatric', '20mcg adult'], routes: ['intramuscular'], frequency: ['0, 1, 6 months'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'DTaP/IPV/Hib/HepB (Hexavalent)', genericName: 'Hexaxim/Infanrix Hexa', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['2, 4, 6 months + booster'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'DTaP/IPV/Hib (Pentavalent)', genericName: 'Pentaxim', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['2, 4, 6 months + booster'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Pneumococcal Conjugate Vaccine', genericName: 'PCV13/PCV15/PCV20', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['2, 4, 6 months + booster'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Rotavirus Vaccine', genericName: 'Rotarix/RotaTeq', doses: ['1ml/1.5ml oral'], routes: ['oral'], frequency: ['2, 4 months (Rotarix) or 2, 4, 6 months (RotaTeq)'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'MMR Vaccine', genericName: 'Measles/Mumps/Rubella', doses: ['0.5ml'], routes: ['subcutaneous', 'intramuscular'], frequency: ['12-15 months, 4-6 years'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'MMRV Vaccine', genericName: 'Measles/Mumps/Rubella/Varicella', doses: ['0.5ml'], routes: ['subcutaneous'], frequency: ['12-15 months, 4-6 years'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Varicella Vaccine', genericName: 'Varicella', doses: ['0.5ml'], routes: ['subcutaneous'], frequency: ['12-15 months, 4-6 years'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Meningococcal ACWY Vaccine', genericName: 'MenACWY', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['9-12 months + booster, adolescent'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Meningococcal B Vaccine', genericName: 'Bexsero/Trumenba', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['2, 4 months + booster'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Haemophilus influenzae b Vaccine', genericName: 'Hib', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['2, 4, 6 months + booster'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Polio Vaccine (IPV)', genericName: 'Inactivated Polio', doses: ['0.5ml'], routes: ['intramuscular', 'subcutaneous'], frequency: ['2, 4, 6 months + booster'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Polio Vaccine (OPV)', genericName: 'Oral Polio', doses: ['2 drops oral'], routes: ['oral'], frequency: ['Per national schedule'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'DTP Vaccine', genericName: 'Diphtheria/Tetanus/Pertussis', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['Per schedule'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Td/Tdap Vaccine', genericName: 'Tetanus/Diphtheria ± Pertussis', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['Adolescent booster, every 10 years'], maxDaily: 'Per schedule', renalAdjust: false },
      ],
    },
    {
      id: 'vaccines_adult',
      name: 'Adult & Travel Vaccines',
      medications: [
        { name: 'Influenza Vaccine (Inactivated)', genericName: 'Flu Vaccine', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['Annually'], maxDaily: 'Single dose', renalAdjust: false },
        { name: 'Influenza Vaccine (Live)', genericName: 'FluMist', doses: ['0.2ml nasal'], routes: ['nasal'], frequency: ['Annually'], maxDaily: 'Single dose', renalAdjust: false },
        { name: 'Pneumococcal Polysaccharide Vaccine', genericName: 'PPSV23', doses: ['0.5ml'], routes: ['intramuscular', 'subcutaneous'], frequency: ['Single dose, revaccination at 5 years if indicated'], maxDaily: 'Single dose', renalAdjust: false },
        { name: 'Shingles Vaccine (Recombinant)', genericName: 'Shingrix', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['0, 2-6 months (2 doses)'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Shingles Vaccine (Live)', genericName: 'Zostavax', doses: ['0.65ml'], routes: ['subcutaneous'], frequency: ['Single dose'], maxDaily: 'Single dose', renalAdjust: false },
        { name: 'HPV Vaccine', genericName: 'Gardasil 9', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['0, 2, 6 months or 0, 6-12 months'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Hepatitis A Vaccine', genericName: 'Hepatitis A', doses: ['1440 ELISA units adult', '720 ELISA units paediatric'], routes: ['intramuscular'], frequency: ['0, 6-12 months'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Hepatitis A+B Combined Vaccine', genericName: 'Twinrix', doses: ['1ml adult'], routes: ['intramuscular'], frequency: ['0, 1, 6 months'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Typhoid Vaccine (Injectable)', genericName: 'Typhim Vi', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['Single dose, revaccinate every 3 years'], maxDaily: 'Single dose', renalAdjust: false },
        { name: 'Typhoid Vaccine (Oral)', genericName: 'Vivotif', doses: ['1 capsule'], routes: ['oral'], frequency: ['Days 1, 3, 5, 7'], maxDaily: '1 capsule', renalAdjust: false },
        { name: 'Cholera Vaccine', genericName: 'Dukoral', doses: ['3ml oral'], routes: ['oral'], frequency: ['2 doses, 1-6 weeks apart'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Yellow Fever Vaccine', genericName: 'Yellow Fever', doses: ['0.5ml'], routes: ['subcutaneous'], frequency: ['Single dose (lifelong immunity)'], maxDaily: 'Single dose', renalAdjust: false },
        { name: 'Japanese Encephalitis Vaccine', genericName: 'Ixiaro', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['0, 28 days'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Rabies Vaccine', genericName: 'Rabies', doses: ['1ml'], routes: ['intramuscular', 'intradermal'], frequency: ['Pre-exposure: 0, 7, 21-28 days; Post-exposure: 0, 3, 7, 14 days'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Tick-Borne Encephalitis Vaccine', genericName: 'TBE Vaccine', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['0, 1-3 months, 5-12 months'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'Anthrax Vaccine', genericName: 'AVA/BioThrax', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['0, 4 weeks, 6 months then annual'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'COVID-19 Vaccine (mRNA)', genericName: 'Pfizer/Moderna', doses: ['0.3ml/0.5ml'], routes: ['intramuscular'], frequency: ['Primary + boosters per guidelines'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'COVID-19 Vaccine (Viral Vector)', genericName: 'AstraZeneca/J&J', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['Per guidelines'], maxDaily: 'Per schedule', renalAdjust: false },
        { name: 'RSV Vaccine', genericName: 'Arexvy/Abrysvo', doses: ['0.5ml'], routes: ['intramuscular'], frequency: ['Single dose'], maxDaily: 'Single dose', renalAdjust: false },
      ],
    },
    {
      id: 'antivenoms',
      name: 'Antivenoms & Antitoxins',
      medications: [
        { name: 'Polyvalent Snake Antivenom', genericName: 'Snake Antivenom', doses: ['10-20 vials'], routes: ['intravenous'], frequency: ['Per protocol'], maxDaily: 'Per protocol', renalAdjust: false, specialInstructions: 'Premedicate with adrenaline/antihistamine' },
        { name: 'Scorpion Antivenom', genericName: 'Scorpion Antivenom', doses: ['1-3 vials'], routes: ['intravenous'], frequency: ['Per protocol'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Spider Antivenom', genericName: 'Spider Antivenom', doses: ['1-2 vials'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Diphtheria Antitoxin', genericName: 'Diphtheria Antitoxin', doses: ['20000-100000 units'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Digoxin-Specific Antibody', genericName: 'DigiFab/Digibind', doses: ['38mg/vial'], routes: ['intravenous'], frequency: ['Per digoxin level'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
  ],
};

// ============================================
// 15. ANAESTHESIA
// ============================================
export const anaesthesiaMedications: BNFCategory = {
  id: 'anaesthesia',
  name: 'Anaesthesia',
  subcategories: [
    {
      id: 'general_anaesthetics_iv',
      name: 'Intravenous Anaesthetics',
      medications: [
        { name: 'Propofol', genericName: 'Propofol', doses: ['10mg/ml', '20mg/ml', '1-2.5mg/kg induction', '4-12mg/kg/hr maintenance'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'Per protocol', renalAdjust: false, specialInstructions: 'Lipid emulsion, strict aseptic technique' },
        { name: 'Thiopental', genericName: 'Thiopentone', doses: ['25mg/ml', '3-5mg/kg induction'], routes: ['intravenous'], frequency: ['Single bolus'], maxDaily: 'Per protocol', renalAdjust: true, controlledDrug: true },
        { name: 'Ketamine', genericName: 'Ketamine', doses: ['50mg/ml', '1-2mg/kg IV', '4-6mg/kg IM'], routes: ['intravenous', 'intramuscular'], frequency: ['Single dose or infusion'], maxDaily: 'Per protocol', renalAdjust: false, controlledDrug: true },
        { name: 'Etomidate', genericName: 'Etomidate', doses: ['2mg/ml', '0.3mg/kg'], routes: ['intravenous'], frequency: ['Single bolus'], maxDaily: '0.3mg/kg', renalAdjust: false },
        { name: 'Midazolam', genericName: 'Midazolam', doses: ['1mg/ml', '5mg/ml', '0.03-0.1mg/kg'], routes: ['intravenous', 'intramuscular', 'buccal'], frequency: ['Single dose or infusion'], maxDaily: 'Per protocol', renalAdjust: true, controlledDrug: true },
        { name: 'Dexmedetomidine', genericName: 'Dexmedetomidine', doses: ['100mcg/ml', '0.5-1mcg/kg loading', '0.2-0.7mcg/kg/hr'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: '24hr max', renalAdjust: false },
        { name: 'Remimazolam', genericName: 'Remimazolam', doses: ['20mg', '5mg induction', '1mg/kg/hr'], routes: ['intravenous'], frequency: ['Bolus + infusion'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'general_anaesthetics_inhalation',
      name: 'Inhalational Anaesthetics',
      medications: [
        { name: 'Sevoflurane', genericName: 'Sevoflurane', doses: ['Induction 4-8%', 'Maintenance 1-3%'], routes: ['inhalation'], frequency: ['Continuous during anaesthesia'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Desflurane', genericName: 'Desflurane', doses: ['Induction 4-11%', 'Maintenance 2.5-8.5%'], routes: ['inhalation'], frequency: ['Continuous during anaesthesia'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Isoflurane', genericName: 'Isoflurane', doses: ['Induction 1.5-3%', 'Maintenance 1-2.5%'], routes: ['inhalation'], frequency: ['Continuous during anaesthesia'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Nitrous Oxide', genericName: 'Nitrous Oxide', doses: ['50-70% with oxygen'], routes: ['inhalation'], frequency: ['Continuous during anaesthesia'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Halothane', genericName: 'Halothane', doses: ['Induction 2-4%', 'Maintenance 0.5-2%'], routes: ['inhalation'], frequency: ['Continuous during anaesthesia'], maxDaily: 'Per protocol', renalAdjust: false, specialInstructions: 'Avoid repeat use within 3 months (hepatotoxicity risk)' },
        { name: 'Xenon', genericName: 'Xenon', doses: ['60-70%'], routes: ['inhalation'], frequency: ['Continuous during anaesthesia'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'local_anaesthetics',
      name: 'Local Anaesthetics',
      medications: [
        { name: 'Lidocaine', genericName: 'Lidocaine', doses: ['0.5%', '1%', '2%', 'Max 3mg/kg', 'Max 7mg/kg with adrenaline'], routes: ['subcutaneous', 'infiltration', 'nerve block', 'epidural', 'spinal'], frequency: ['Single dose'], maxDaily: '300mg (500mg with adrenaline)', renalAdjust: false },
        { name: 'Lidocaine with Adrenaline', genericName: 'Lidocaine/Epinephrine', doses: ['1:100000', '1:200000'], routes: ['subcutaneous', 'infiltration'], frequency: ['Single dose'], maxDaily: '500mg', renalAdjust: false, specialInstructions: 'Avoid in end-arteries (digits, penis)' },
        { name: 'Bupivacaine', genericName: 'Bupivacaine', doses: ['0.25%', '0.5%', 'Max 2mg/kg'], routes: ['infiltration', 'nerve block', 'epidural', 'spinal'], frequency: ['Single dose'], maxDaily: '175mg', renalAdjust: false },
        { name: 'Bupivacaine Heavy (Spinal)', genericName: 'Bupivacaine Hyperbaric', doses: ['0.5% heavy', '1-3ml'], routes: ['spinal'], frequency: ['Single dose'], maxDaily: '20mg', renalAdjust: false },
        { name: 'Levobupivacaine', genericName: 'Levobupivacaine', doses: ['0.25%', '0.5%', '0.75%'], routes: ['infiltration', 'nerve block', 'epidural'], frequency: ['Single dose'], maxDaily: '150mg', renalAdjust: false },
        { name: 'Ropivacaine', genericName: 'Ropivacaine', doses: ['0.2%', '0.5%', '0.75%', '1%'], routes: ['infiltration', 'nerve block', 'epidural'], frequency: ['Single dose or infusion'], maxDaily: '225mg bolus, 28mg/hr infusion', renalAdjust: false },
        { name: 'Prilocaine', genericName: 'Prilocaine', doses: ['0.5%', '1%', '2%', 'Max 6mg/kg'], routes: ['infiltration', 'nerve block'], frequency: ['Single dose'], maxDaily: '400mg', renalAdjust: false },
        { name: 'Articaine', genericName: 'Articaine', doses: ['4% with adrenaline'], routes: ['dental infiltration'], frequency: ['Single dose'], maxDaily: '7mg/kg', renalAdjust: false },
        { name: 'Chloroprocaine', genericName: 'Chloroprocaine', doses: ['2%', '3%'], routes: ['epidural', 'infiltration'], frequency: ['Single dose'], maxDaily: '800mg', renalAdjust: false },
        { name: 'EMLA Cream', genericName: 'Lidocaine/Prilocaine', doses: ['2.5%/2.5% cream'], routes: ['topical'], frequency: ['Apply 1hr before procedure'], maxDaily: 'Per area', renalAdjust: false },
        { name: 'Lidocaine Spray', genericName: 'Lidocaine', doses: ['4%', '10% spray'], routes: ['topical'], frequency: ['Before procedure'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Cocaine', genericName: 'Cocaine', doses: ['4%', '10% solution'], routes: ['topical nasal'], frequency: ['Before ENT procedure'], maxDaily: '1.5mg/kg', renalAdjust: false, controlledDrug: true },
      ],
    },
    {
      id: 'neuromuscular_blockers',
      name: 'Neuromuscular Blocking Drugs',
      medications: [
        // Depolarising
        { name: 'Suxamethonium', genericName: 'Succinylcholine', doses: ['50mg/ml', '1-1.5mg/kg'], routes: ['intravenous'], frequency: ['Single bolus'], maxDaily: '150mg', renalAdjust: false, specialInstructions: 'Depolarising - contraindicated in burns, hyperkalaemia, neuromuscular disease' },
        // Non-depolarising - Aminosteroids
        { name: 'Rocuronium', genericName: 'Rocuronium', doses: ['10mg/ml', '0.6mg/kg intubation', '0.15mg/kg top-up'], routes: ['intravenous'], frequency: ['Bolus or infusion'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Vecuronium', genericName: 'Vecuronium', doses: ['10mg vial', '0.08-0.1mg/kg'], routes: ['intravenous'], frequency: ['Bolus'], maxDaily: 'Per protocol', renalAdjust: true },
        { name: 'Pancuronium', genericName: 'Pancuronium', doses: ['2mg/ml', '0.08-0.1mg/kg'], routes: ['intravenous'], frequency: ['Bolus'], maxDaily: 'Per protocol', renalAdjust: true },
        // Non-depolarising - Benzylisoquinoliniums
        { name: 'Atracurium', genericName: 'Atracurium', doses: ['10mg/ml', '0.5mg/kg'], routes: ['intravenous'], frequency: ['Bolus or infusion'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Cisatracurium', genericName: 'Cisatracurium', doses: ['2mg/ml', '5mg/ml', '0.15mg/kg'], routes: ['intravenous'], frequency: ['Bolus or infusion'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Mivacurium', genericName: 'Mivacurium', doses: ['2mg/ml', '0.15-0.2mg/kg'], routes: ['intravenous'], frequency: ['Bolus'], maxDaily: 'Per protocol', renalAdjust: false },
      ],
    },
    {
      id: 'reversal_agents',
      name: 'Reversal Agents & Antagonists',
      medications: [
        { name: 'Neostigmine', genericName: 'Neostigmine', doses: ['2.5mg/ml', '0.05mg/kg'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '5mg', renalAdjust: true, specialInstructions: 'Always give with glycopyrronium or atropine' },
        { name: 'Neostigmine/Glycopyrronium', genericName: 'Neostigmine/Glycopyrrolate', doses: ['2.5mg/0.5mg'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '5mg/1mg', renalAdjust: true },
        { name: 'Sugammadex', genericName: 'Sugammadex', doses: ['100mg/ml', '2mg/kg (moderate)', '4mg/kg (deep)', '16mg/kg (immediate)'], routes: ['intravenous'], frequency: ['Single dose'], maxDaily: '16mg/kg', renalAdjust: true },
        { name: 'Flumazenil', genericName: 'Flumazenil', doses: ['0.1mg/ml', '0.2mg initial, up to 1mg'], routes: ['intravenous'], frequency: ['Titrated doses'], maxDaily: '2mg', renalAdjust: false },
        { name: 'Naloxone', genericName: 'Naloxone', doses: ['0.4mg/ml', '0.1-0.4mg'], routes: ['intravenous', 'intramuscular', 'subcutaneous', 'intranasal'], frequency: ['Titrated to effect'], maxDaily: '10mg', renalAdjust: false },
        { name: 'Atropine', genericName: 'Atropine', doses: ['0.6mg/ml', '0.3-0.6mg', '20mcg/kg'], routes: ['intravenous'], frequency: ['With anticholinesterase'], maxDaily: '3mg', renalAdjust: false },
        { name: 'Glycopyrronium', genericName: 'Glycopyrrolate', doses: ['0.2mg/ml', '0.2-0.4mg'], routes: ['intravenous'], frequency: ['With anticholinesterase'], maxDaily: '1mg', renalAdjust: true },
      ],
    },
    {
      id: 'sedation_procedural',
      name: 'Sedation & Procedural Analgesia',
      medications: [
        { name: 'Propofol Sedation', genericName: 'Propofol', doses: ['0.5-1mg/kg bolus', '1.5-4.5mg/kg/hr infusion'], routes: ['intravenous'], frequency: ['Titrated to sedation level'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Midazolam Sedation', genericName: 'Midazolam', doses: ['1-2.5mg IV', '0.5mg/kg buccal'], routes: ['intravenous', 'buccal'], frequency: ['Titrated'], maxDaily: '7.5mg', renalAdjust: true, controlledDrug: true },
        { name: 'Fentanyl Sedation', genericName: 'Fentanyl', doses: ['25-100mcg'], routes: ['intravenous'], frequency: ['Titrated'], maxDaily: 'Per protocol', renalAdjust: false, controlledDrug: true },
        { name: 'Alfentanil', genericName: 'Alfentanil', doses: ['500mcg/ml', '10-20mcg/kg'], routes: ['intravenous'], frequency: ['Bolus or infusion'], maxDaily: 'Per protocol', renalAdjust: false, controlledDrug: true },
        { name: 'Remifentanil', genericName: 'Remifentanil', doses: ['1mg/2mg vials', '0.05-0.2mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'Per protocol', renalAdjust: false, controlledDrug: true },
        { name: 'Entonox', genericName: 'Nitrous Oxide/Oxygen', doses: ['50%/50%'], routes: ['inhalation'], frequency: ['Self-administered'], maxDaily: 'Per procedure', renalAdjust: false },
        { name: 'Methoxyflurane', genericName: 'Penthrox', doses: ['3ml inhaler'], routes: ['inhalation'], frequency: ['Self-administered'], maxDaily: '6ml/day, 15ml/week', renalAdjust: false },
      ],
    },
    {
      id: 'perioperative_drugs',
      name: 'Perioperative Drugs',
      medications: [
        // Antiemetics
        { name: 'Ondansetron Periop', genericName: 'Ondansetron', doses: ['4mg', '8mg'], routes: ['intravenous'], frequency: ['At induction or end of surgery'], maxDaily: '16mg', renalAdjust: false },
        { name: 'Dexamethasone Antiemetic', genericName: 'Dexamethasone', doses: ['4mg', '8mg'], routes: ['intravenous'], frequency: ['At induction'], maxDaily: '8mg', renalAdjust: false },
        { name: 'Droperidol', genericName: 'Droperidol', doses: ['0.625mg', '1.25mg'], routes: ['intravenous'], frequency: ['At end of surgery'], maxDaily: '2.5mg', renalAdjust: false },
        { name: 'Aprepitant', genericName: 'Aprepitant', doses: ['40mg'], routes: ['oral'], frequency: ['1-3hr before anaesthesia'], maxDaily: '40mg', renalAdjust: false },
        // Premedicants
        { name: 'Temazepam Premed', genericName: 'Temazepam', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['Night before and morning of surgery'], maxDaily: '40mg', renalAdjust: true, controlledDrug: true },
        { name: 'Lorazepam Premed', genericName: 'Lorazepam', doses: ['1mg', '2mg'], routes: ['oral', 'sublingual'], frequency: ['1-2hr before surgery'], maxDaily: '4mg', renalAdjust: true, controlledDrug: true },
        { name: 'Ranitidine Premed', genericName: 'Ranitidine', doses: ['150mg', '300mg'], routes: ['oral'], frequency: ['Night before and morning'], maxDaily: '300mg', renalAdjust: true },
        { name: 'Sodium Citrate', genericName: 'Sodium Citrate', doses: ['30ml 0.3M'], routes: ['oral'], frequency: ['Before emergency GA'], maxDaily: '30ml', renalAdjust: false },
        { name: 'Metoclopramide Premed', genericName: 'Metoclopramide', doses: ['10mg'], routes: ['oral', 'intravenous'], frequency: ['Pre-induction'], maxDaily: '30mg', renalAdjust: true },
        // Anticholinergics
        { name: 'Atropine Premed', genericName: 'Atropine', doses: ['0.3-0.6mg'], routes: ['intramuscular', 'intravenous'], frequency: ['Pre-induction'], maxDaily: '1.2mg', renalAdjust: false },
        { name: 'Hyoscine Hydrobromide', genericName: 'Scopolamine', doses: ['0.2-0.4mg'], routes: ['intramuscular', 'intravenous'], frequency: ['Pre-induction'], maxDaily: '0.6mg', renalAdjust: false },
      ],
    },
    {
      id: 'antidotes_emergency',
      name: 'Antidotes & Emergency Drugs',
      medications: [
        // Antidotes
        { name: 'N-Acetylcysteine', genericName: 'Acetylcysteine', doses: ['200mg/ml', '150mg/kg then 50mg/kg then 100mg/kg'], routes: ['intravenous'], frequency: ['Per Rumack-Matthew nomogram'], maxDaily: 'Per protocol', renalAdjust: false, specialInstructions: 'Paracetamol overdose' },
        { name: 'Activated Charcoal', genericName: 'Charcoal', doses: ['50g', '1g/kg'], routes: ['oral', 'nasogastric'], frequency: ['Single dose within 1hr ingestion'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Methylene Blue', genericName: 'Methylthioninium Chloride', doses: ['50mg/10ml', '1-2mg/kg'], routes: ['intravenous'], frequency: ['Over 5 minutes, repeat if needed'], maxDaily: '7mg/kg', renalAdjust: false, specialInstructions: 'Methaemoglobinaemia' },
        { name: 'Calcium Gluconate', genericName: 'Calcium Gluconate', doses: ['10% (2.2mmol/10ml)', '10-20ml'], routes: ['intravenous'], frequency: ['Slow IV'], maxDaily: 'Per protocol', renalAdjust: false, specialInstructions: 'Hyperkalaemia, calcium channel blocker OD, HF burn' },
        { name: 'Calcium Chloride', genericName: 'Calcium Chloride', doses: ['10% (6.8mmol/10ml)', '5-10ml'], routes: ['intravenous'], frequency: ['Slow IV, central line preferred'], maxDaily: 'Per protocol', renalAdjust: false },
        { name: 'Glucagon', genericName: 'Glucagon', doses: ['1mg', '2-10mg high dose'], routes: ['intravenous', 'intramuscular', 'subcutaneous'], frequency: ['Per protocol'], maxDaily: '10mg', renalAdjust: false, specialInstructions: 'Hypoglycaemia, beta-blocker OD' },
        { name: 'Hydroxocobalamin', genericName: 'Hydroxocobalamin', doses: ['5g vial'], routes: ['intravenous'], frequency: ['Over 15min, repeat if needed'], maxDaily: '10g', renalAdjust: false, specialInstructions: 'Cyanide poisoning' },
        { name: 'Sodium Nitrite', genericName: 'Sodium Nitrite', doses: ['3%', '300mg'], routes: ['intravenous'], frequency: ['Over 5 minutes'], maxDaily: '300mg', renalAdjust: false, specialInstructions: 'Cyanide antidote (with thiosulfate)' },
        { name: 'Sodium Thiosulfate', genericName: 'Sodium Thiosulfate', doses: ['25%', '12.5g'], routes: ['intravenous'], frequency: ['Over 10 minutes'], maxDaily: '12.5g', renalAdjust: true, specialInstructions: 'Cyanide antidote' },
        { name: 'Dantrolene', genericName: 'Dantrolene', doses: ['20mg vial', '2.5mg/kg'], routes: ['intravenous'], frequency: ['Repeat until effect, up to 10mg/kg'], maxDaily: '10mg/kg', renalAdjust: false, specialInstructions: 'Malignant hyperthermia' },
        { name: 'Lipid Emulsion 20%', genericName: 'Intralipid', doses: ['20%', '1.5ml/kg bolus', '0.25ml/kg/min'], routes: ['intravenous'], frequency: ['Bolus + infusion'], maxDaily: '12.5ml/kg', renalAdjust: false, specialInstructions: 'Local anaesthetic systemic toxicity (LAST)' },
        { name: 'Pralidoxime', genericName: 'Pralidoxime', doses: ['1g', '30mg/kg'], routes: ['intravenous'], frequency: ['Over 20 minutes'], maxDaily: '12g', renalAdjust: true, specialInstructions: 'Organophosphate poisoning' },
        { name: 'Physostigmine', genericName: 'Physostigmine', doses: ['1mg/ml', '0.5-2mg'], routes: ['intravenous'], frequency: ['Slow IV over 5 minutes'], maxDaily: '4mg', renalAdjust: false, specialInstructions: 'Anticholinergic toxicity' },
        { name: 'Fomepizole', genericName: 'Fomepizole', doses: ['1g/ml', '15mg/kg loading'], routes: ['intravenous'], frequency: ['Loading then 10mg/kg 12hrly'], maxDaily: 'Per protocol', renalAdjust: true, specialInstructions: 'Ethylene glycol/methanol poisoning' },
        { name: 'Ethanol IV', genericName: 'Ethanol', doses: ['10%', '0.6g/kg loading'], routes: ['intravenous'], frequency: ['Loading then 0.1g/kg/hr'], maxDaily: 'Per protocol', renalAdjust: false, specialInstructions: 'Ethylene glycol/methanol (if fomepizole unavailable)' },
        { name: 'Desferrioxamine', genericName: 'Deferoxamine', doses: ['500mg vial', '15mg/kg/hr'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: '80mg/kg', renalAdjust: true, specialInstructions: 'Iron overdose' },
        { name: 'Dimercaprol', genericName: 'BAL', doses: ['100mg/ml', '3-5mg/kg'], routes: ['intramuscular'], frequency: ['4-6 hourly'], maxDaily: '5mg/kg', renalAdjust: false, specialInstructions: 'Heavy metal poisoning' },
        { name: 'Penicillamine', genericName: 'Penicillamine', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['6-12 hourly'], maxDaily: '2g', renalAdjust: true, specialInstructions: 'Copper, lead poisoning' },
        { name: 'Protamine', genericName: 'Protamine Sulfate', doses: ['10mg/ml', '1mg per 100 units heparin'], routes: ['intravenous'], frequency: ['Slow IV'], maxDaily: '50mg', renalAdjust: false, specialInstructions: 'Heparin reversal' },
        { name: 'Vitamin K (Phytomenadione)', genericName: 'Vitamin K1', doses: ['2mg/ml', '10mg/ml', '5-10mg'], routes: ['intravenous', 'oral'], frequency: ['Single dose'], maxDaily: '40mg', renalAdjust: false, specialInstructions: 'Warfarin reversal, vitamin K deficiency' },
        { name: 'Idarucizumab', genericName: 'Praxbind', doses: ['2.5g/50ml x 2'], routes: ['intravenous'], frequency: ['2 vials as bolus'], maxDaily: '5g', renalAdjust: false, specialInstructions: 'Dabigatran reversal' },
        { name: 'Andexanet Alfa', genericName: 'Andexxa', doses: ['200mg vial', '400-800mg bolus'], routes: ['intravenous'], frequency: ['Bolus + infusion'], maxDaily: 'Per protocol', renalAdjust: false, specialInstructions: 'Factor Xa inhibitor reversal' },
      ],
    },
  ],
};

// Export all categories as a combined object
export const bnfMedicationDatabase = {
  gastrointestinal: gastrointestinalMedications,
  cardiovascular: cardiovascularMedications,
  respiratory: respiratoryMedications,
  cns: cnsMedications,
  infections: infectionMedications,
  endocrine: endocrineMedications,
  obstetricsUrology: obstetricsUrologyMedications,
  malignantImmuno: malignantImmunoMedications,
  nutritionBlood: nutritionBloodMedications,
  musculoskeletal: musculoskeletalMedications,
  eye: eyeMedications,
  ent: entMedications,
  skin: skinMedications,
  vaccines: vaccinesMedications,
  anaesthesia: anaesthesiaMedications,
};

// Export category list for UI
export const bnfCategories = [
  // Gastrointestinal
  { value: 'antacids_antisecretory', label: 'Antacids & Antisecretory Drugs', parent: 'gastrointestinal' },
  { value: 'antiemetics', label: 'Antiemetics & Antinauseants', parent: 'gastrointestinal' },
  { value: 'antispasmodics', label: 'Antispasmodics & Motility Drugs', parent: 'gastrointestinal' },
  { value: 'laxatives', label: 'Laxatives', parent: 'gastrointestinal' },
  { value: 'antidiarrheals', label: 'Antidiarrheals', parent: 'gastrointestinal' },
  { value: 'ibd_drugs', label: 'Inflammatory Bowel Disease Drugs', parent: 'gastrointestinal' },
  { value: 'hepatobiliary', label: 'Hepatobiliary Drugs', parent: 'gastrointestinal' },
  { value: 'pancreatic', label: 'Pancreatic Enzymes', parent: 'gastrointestinal' },
  // Cardiovascular
  { value: 'antihypertensives', label: 'Antihypertensives', parent: 'cardiovascular' },
  { value: 'beta_blockers', label: 'Beta-Blockers', parent: 'cardiovascular' },
  { value: 'diuretics', label: 'Diuretics', parent: 'cardiovascular' },
  { value: 'antianginals', label: 'Antianginals & Coronary Vasodilators', parent: 'cardiovascular' },
  { value: 'antiarrhythmics', label: 'Antiarrhythmics', parent: 'cardiovascular' },
  { value: 'anticoagulants', label: 'Anticoagulants & Antiplatelets', parent: 'cardiovascular' },
  { value: 'lipid_lowering', label: 'Lipid-Lowering Drugs', parent: 'cardiovascular' },
  { value: 'heart_failure', label: 'Heart Failure Drugs', parent: 'cardiovascular' },
  { value: 'vasopressors', label: 'Vasopressors & Inotropes', parent: 'cardiovascular' },
  // Respiratory
  { value: 'bronchodilators', label: 'Bronchodilators', parent: 'respiratory' },
  { value: 'inhaled_corticosteroids', label: 'Inhaled Corticosteroids', parent: 'respiratory' },
  { value: 'combination_inhalers', label: 'Combination Inhalers', parent: 'respiratory' },
  { value: 'leukotriene_antagonists', label: 'Leukotriene Receptor Antagonists', parent: 'respiratory' },
  { value: 'mucolytics_expectorants', label: 'Mucolytics & Expectorants', parent: 'respiratory' },
  { value: 'cough_suppressants', label: 'Cough Suppressants', parent: 'respiratory' },
  { value: 'antihistamines_allergic', label: 'Antihistamines (Allergic Rhinitis)', parent: 'respiratory' },
  { value: 'nasal_preparations', label: 'Nasal Preparations', parent: 'respiratory' },
  { value: 'respiratory_stimulants', label: 'Respiratory Stimulants & Oxygen', parent: 'respiratory' },
  // CNS
  { value: 'analgesics_nonopioid', label: 'Non-Opioid Analgesics', parent: 'cns' },
  { value: 'opioid_analgesics', label: 'Opioid Analgesics', parent: 'cns' },
  { value: 'opioid_antagonists', label: 'Opioid Antagonists', parent: 'cns' },
  { value: 'neuropathic_pain', label: 'Neuropathic Pain Agents', parent: 'cns' },
  { value: 'migraine', label: 'Migraine Treatment', parent: 'cns' },
  { value: 'anticonvulsants', label: 'Anticonvulsants / Antiepileptics', parent: 'cns' },
  { value: 'anxiolytics_hypnotics', label: 'Anxiolytics & Hypnotics', parent: 'cns' },
  { value: 'antidepressants', label: 'Antidepressants', parent: 'cns' },
  { value: 'antipsychotics', label: 'Antipsychotics', parent: 'cns' },
  { value: 'parkinsons', label: 'Parkinsonism & Related Disorders', parent: 'cns' },
  { value: 'dementia', label: 'Dementia & Cognitive Enhancers', parent: 'cns' },
  { value: 'adhd_narcolepsy', label: 'ADHD & Narcolepsy', parent: 'cns' },
  // Infections
  { value: 'penicillins', label: 'Penicillins', parent: 'infections' },
  { value: 'cephalosporins', label: 'Cephalosporins', parent: 'infections' },
  { value: 'carbapenems_monobactams', label: 'Carbapenems & Monobactams', parent: 'infections' },
  { value: 'aminoglycosides', label: 'Aminoglycosides', parent: 'infections' },
  { value: 'macrolides', label: 'Macrolides & Related', parent: 'infections' },
  { value: 'fluoroquinolones', label: 'Fluoroquinolones', parent: 'infections' },
  { value: 'tetracyclines', label: 'Tetracyclines & Glycylcyclines', parent: 'infections' },
  { value: 'glycopeptides_lipopeptides', label: 'Glycopeptides & Lipopeptides', parent: 'infections' },
  { value: 'oxazolidinones_others', label: 'Oxazolidinones & Other Antibacterials', parent: 'infections' },
  { value: 'antifungals', label: 'Antifungals', parent: 'infections' },
  { value: 'antivirals', label: 'Antivirals', parent: 'infections' },
  { value: 'antiretrovirals', label: 'Antiretrovirals (HIV)', parent: 'infections' },
  { value: 'antimalarials', label: 'Antimalarials', parent: 'infections' },
  { value: 'antituberculous', label: 'Antituberculous Drugs', parent: 'infections' },
  { value: 'antiparasitics', label: 'Antiparasitic Drugs', parent: 'infections' },
  // Endocrine
  { value: 'diabetes_insulins', label: 'Insulins', parent: 'endocrine' },
  { value: 'diabetes_oral', label: 'Oral Antidiabetics', parent: 'endocrine' },
  { value: 'diabetes_dpp4', label: 'DPP-4 Inhibitors', parent: 'endocrine' },
  { value: 'diabetes_sglt2', label: 'SGLT2 Inhibitors', parent: 'endocrine' },
  { value: 'diabetes_glp1', label: 'GLP-1 Receptor Agonists', parent: 'endocrine' },
  { value: 'diabetes_other', label: 'Other Antidiabetic Agents', parent: 'endocrine' },
  { value: 'thyroid', label: 'Thyroid Disorders', parent: 'endocrine' },
  { value: 'corticosteroids', label: 'Corticosteroids', parent: 'endocrine' },
  { value: 'sex_hormones_male', label: 'Male Sex Hormones & Antagonists', parent: 'endocrine' },
  { value: 'sex_hormones_female', label: 'Female Sex Hormones', parent: 'endocrine' },
  { value: 'pituitary_hypothalamic', label: 'Pituitary & Hypothalamic Hormones', parent: 'endocrine' },
  { value: 'bone_metabolism', label: 'Bone Metabolism Drugs', parent: 'endocrine' },
  { value: 'adrenal', label: 'Adrenal Disorders', parent: 'endocrine' },
  // Obstetrics, Gynaecology & Urology
  { value: 'obstetric_drugs', label: 'Obstetric Drugs', parent: 'obstetrics_urology' },
  { value: 'gynaecological_drugs', label: 'Gynaecological Drugs', parent: 'obstetrics_urology' },
  { value: 'contraceptives', label: 'Contraceptives', parent: 'obstetrics_urology' },
  { value: 'urinary_incontinence', label: 'Urinary Incontinence & Retention', parent: 'obstetrics_urology' },
  { value: 'bph_prostate', label: 'Benign Prostatic Hyperplasia', parent: 'obstetrics_urology' },
  { value: 'urinary_tract_infections', label: 'Urinary Tract Infection Treatments', parent: 'obstetrics_urology' },
  { value: 'kidney_stones', label: 'Urolithiasis & Kidney Stones', parent: 'obstetrics_urology' },
  // Malignant Disease & Immunosuppression
  { value: 'alkylating_agents', label: 'Alkylating Agents', parent: 'malignant_immuno' },
  { value: 'antimetabolites', label: 'Antimetabolites', parent: 'malignant_immuno' },
  { value: 'cytotoxic_antibiotics', label: 'Cytotoxic Antibiotics', parent: 'malignant_immuno' },
  { value: 'vinca_taxanes', label: 'Vinca Alkaloids & Taxanes', parent: 'malignant_immuno' },
  { value: 'topoisomerase_inhibitors', label: 'Topoisomerase Inhibitors', parent: 'malignant_immuno' },
  { value: 'platinum_compounds', label: 'Platinum Compounds', parent: 'malignant_immuno' },
  { value: 'targeted_therapy', label: 'Targeted Therapy - TKIs', parent: 'malignant_immuno' },
  { value: 'immunotherapy', label: 'Immunotherapy - Checkpoint Inhibitors', parent: 'malignant_immuno' },
  { value: 'monoclonal_antibodies', label: 'Monoclonal Antibodies', parent: 'malignant_immuno' },
  { value: 'immunosuppressants', label: 'Immunosuppressants', parent: 'malignant_immuno' },
  { value: 'supportive_oncology', label: 'Supportive Care in Oncology', parent: 'malignant_immuno' },
  // Nutrition & Blood
  { value: 'iron_deficiency', label: 'Iron Deficiency Anaemia', parent: 'nutrition_blood' },
  { value: 'megaloblastic_anaemia', label: 'Megaloblastic Anaemia (B12 & Folate)', parent: 'nutrition_blood' },
  { value: 'haemolytic_aplastic', label: 'Haemolytic & Aplastic Anaemia', parent: 'nutrition_blood' },
  { value: 'sickle_cell', label: 'Sickle Cell Disease', parent: 'nutrition_blood' },
  { value: 'anticoagulants_antithrombotics', label: 'Anticoagulants & Antithrombotics', parent: 'nutrition_blood' },
  { value: 'antiplatelets', label: 'Antiplatelet Drugs', parent: 'nutrition_blood' },
  { value: 'haemostatics', label: 'Haemostatics & Antifibrinolytics', parent: 'nutrition_blood' },
  { value: 'electrolytes', label: 'Electrolyte Replacement', parent: 'nutrition_blood' },
  { value: 'vitamins_minerals', label: 'Vitamins & Minerals', parent: 'nutrition_blood' },
  { value: 'parenteral_nutrition', label: 'Parenteral & Enteral Nutrition', parent: 'nutrition_blood' },
  { value: 'fluids_volume', label: 'IV Fluids & Volume Expanders', parent: 'nutrition_blood' },
  // Musculoskeletal & Joint Diseases
  { value: 'nsaids', label: 'NSAIDs', parent: 'musculoskeletal' },
  { value: 'dmards_conventional', label: 'DMARDs - Conventional Synthetic', parent: 'musculoskeletal' },
  { value: 'dmards_targeted', label: 'DMARDs - Targeted Synthetic (JAK Inhibitors)', parent: 'musculoskeletal' },
  { value: 'biologics_tnf', label: 'Biologic DMARDs - Anti-TNF', parent: 'musculoskeletal' },
  { value: 'biologics_other', label: 'Biologic DMARDs - Non-TNF', parent: 'musculoskeletal' },
  { value: 'gout_hyperuricaemia', label: 'Gout & Hyperuricaemia', parent: 'musculoskeletal' },
  { value: 'muscle_relaxants', label: 'Muscle Relaxants & Antispasmodics', parent: 'musculoskeletal' },
  { value: 'osteoporosis', label: 'Bone Disorders & Osteoporosis', parent: 'musculoskeletal' },
  { value: 'local_joint_injections', label: 'Local & Intra-articular Preparations', parent: 'musculoskeletal' },
  { value: 'topical_musculoskeletal', label: 'Topical Musculoskeletal Preparations', parent: 'musculoskeletal' },
  // Eye
  { value: 'eye_anti_infective', label: 'Eye Anti-infectives', parent: 'eye' },
  { value: 'eye_antiinflammatory', label: 'Eye Anti-inflammatory & Corticosteroids', parent: 'eye' },
  { value: 'eye_antiallergic', label: 'Eye Anti-allergy & Mast Cell Stabilisers', parent: 'eye' },
  { value: 'eye_glaucoma', label: 'Glaucoma & Ocular Hypertension', parent: 'eye' },
  { value: 'eye_lubricants', label: 'Dry Eye & Ocular Lubricants', parent: 'eye' },
  { value: 'eye_mydriatics_cycloplegics', label: 'Mydriatics & Cycloplegics', parent: 'eye' },
  { value: 'eye_other', label: 'Other Eye Preparations', parent: 'eye' },
  // Ear, Nose & Oropharynx
  { value: 'ear_preparations', label: 'Ear Preparations', parent: 'ent' },
  { value: 'nasal_preparations_ent', label: 'Nasal Preparations', parent: 'ent' },
  { value: 'oropharynx_preparations', label: 'Oropharyngeal Preparations', parent: 'ent' },
  // Skin
  { value: 'emollients', label: 'Emollients & Barrier Preparations', parent: 'skin' },
  { value: 'topical_corticosteroids', label: 'Topical Corticosteroids', parent: 'skin' },
  { value: 'topical_anti_infective', label: 'Topical Anti-infective Preparations', parent: 'skin' },
  { value: 'acne_rosacea', label: 'Acne & Rosacea', parent: 'skin' },
  { value: 'psoriasis_eczema', label: 'Psoriasis & Eczema Preparations', parent: 'skin' },
  { value: 'wound_ulcer_skin', label: 'Wound & Ulcer Preparations', parent: 'skin' },
  { value: 'antiperspirants_hyperhidrosis', label: 'Antiperspirants & Hyperhidrosis', parent: 'skin' },
  // Immunological Products & Vaccines
  { value: 'immunoglobulins', label: 'Immunoglobulins', parent: 'vaccines' },
  { value: 'vaccines_childhood', label: 'Childhood Vaccines', parent: 'vaccines' },
  { value: 'vaccines_adult', label: 'Adult & Travel Vaccines', parent: 'vaccines' },
  { value: 'antivenoms', label: 'Antivenoms & Antitoxins', parent: 'vaccines' },
  // Anaesthesia
  { value: 'general_anaesthetics_iv', label: 'Intravenous Anaesthetics', parent: 'anaesthesia' },
  { value: 'general_anaesthetics_inhalation', label: 'Inhalational Anaesthetics', parent: 'anaesthesia' },
  { value: 'local_anaesthetics', label: 'Local Anaesthetics', parent: 'anaesthesia' },
  { value: 'neuromuscular_blockers', label: 'Neuromuscular Blocking Drugs', parent: 'anaesthesia' },
  { value: 'reversal_agents', label: 'Reversal Agents & Antagonists', parent: 'anaesthesia' },
  { value: 'sedation_procedural', label: 'Sedation & Procedural Analgesia', parent: 'anaesthesia' },
  { value: 'perioperative_drugs', label: 'Perioperative Drugs', parent: 'anaesthesia' },
  { value: 'antidotes_emergency', label: 'Antidotes & Emergency Drugs', parent: 'anaesthesia' },
];

// Helper function to get all medications from a category
export function getMedicationsForCategory(categoryId: string): BNFMedication[] {
  for (const category of Object.values(bnfMedicationDatabase)) {
    if (category.subcategories) {
      const subcat = category.subcategories.find(s => s.id === categoryId);
      if (subcat) return subcat.medications;
    }
    if (category.id === categoryId && category.medications) {
      return category.medications;
    }
  }
  return [];
}

// Helper function to search medications
export function searchMedications(query: string): BNFMedication[] {
  const results: BNFMedication[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const category of Object.values(bnfMedicationDatabase)) {
    if (category.subcategories) {
      for (const subcat of category.subcategories) {
        for (const med of subcat.medications) {
          if (med.name.toLowerCase().includes(lowerQuery) || 
              med.genericName.toLowerCase().includes(lowerQuery)) {
            results.push(med);
          }
        }
      }
    }
  }
  
  return results;
}
