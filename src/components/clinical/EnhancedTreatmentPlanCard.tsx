import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Pill,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  X,
  FlaskConical,
  Scissors,
  UserCheck,
  FileText,
  LineChart,
  Trash2,
  AlertTriangle,
  Bell,
  CheckSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import { db } from '../../database';
import { syncRecord } from '../../services/cloudSyncService';
import type { 
  TreatmentPlan, 
  Prescription,
  MedicationRoute,
  Investigation,
} from '../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface EnhancedTreatmentPlanCardProps {
  patientId: string;
  admissionId?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'wound' | 'burn' | 'surgery' | 'general';
  clinicianId: string;
  clinicianName: string;
  hospitalId: string;
}

// ============== MEDICATION DATABASE ==============
const medicationCategories = [
  { value: 'analgesics', label: 'Analgesics/Pain Relief' },
  { value: 'nsaids', label: 'NSAIDs' },
  { value: 'opioids', label: 'Opioid Analgesics' },
  { value: 'antibiotics_penicillins', label: 'Antibiotics - Penicillins' },
  { value: 'antibiotics_cephalosporins', label: 'Antibiotics - Cephalosporins' },
  { value: 'antibiotics_macrolides', label: 'Antibiotics - Macrolides' },
  { value: 'antibiotics_quinolones', label: 'Antibiotics - Quinolones' },
  { value: 'antibiotics_aminoglycosides', label: 'Antibiotics - Aminoglycosides' },
  { value: 'antibiotics_others', label: 'Antibiotics - Others' },
  { value: 'antiinflammatories', label: 'Corticosteroids/Anti-inflammatories' },
  { value: 'vitamins', label: 'Vitamins & Supplements' },
  { value: 'minerals', label: 'Minerals & Electrolytes' },
  { value: 'anticoagulants', label: 'Anticoagulants & Antiplatelets' },
  { value: 'antifungals', label: 'Antifungals' },
  { value: 'antivirals', label: 'Antivirals' },
  { value: 'antihistamines', label: 'Antihistamines' },
  { value: 'antihypertensives_ace', label: 'Antihypertensives - ACE Inhibitors' },
  { value: 'antihypertensives_arbs', label: 'Antihypertensives - ARBs' },
  { value: 'antihypertensives_ccbs', label: 'Antihypertensives - Calcium Channel Blockers' },
  { value: 'antihypertensives_betablockers', label: 'Antihypertensives - Beta Blockers' },
  { value: 'antihypertensives_diuretics', label: 'Diuretics' },
  { value: 'gastrointestinal_ppis', label: 'GI - Proton Pump Inhibitors' },
  { value: 'gastrointestinal_h2blockers', label: 'GI - H2 Blockers' },
  { value: 'gastrointestinal_antiemetics', label: 'GI - Antiemetics' },
  { value: 'gastrointestinal_laxatives', label: 'GI - Laxatives' },
  { value: 'gastrointestinal_antidiarrheals', label: 'GI - Antidiarrheals' },
  { value: 'diabetes_oral', label: 'Diabetes - Oral Agents' },
  { value: 'diabetes_insulin', label: 'Diabetes - Insulins' },
  { value: 'sedatives', label: 'Sedatives & Anxiolytics' },
  { value: 'antipsychotics', label: 'Antipsychotics' },
  { value: 'antidepressants', label: 'Antidepressants' },
  { value: 'antiepileptics', label: 'Antiepileptics/Anticonvulsants' },
  { value: 'bronchodilators', label: 'Bronchodilators' },
  { value: 'antiasthmatics', label: 'Antiasthmatics/Steroids Inhalers' },
  { value: 'thyroid', label: 'Thyroid Medications' },
  { value: 'antiparasitics', label: 'Antiparasitics/Antihelminthics' },
  { value: 'antimalarials', label: 'Antimalarials' },
  { value: 'vaccines', label: 'Vaccines & Immunoglobulins' },
  { value: 'eye_preparations', label: 'Eye Preparations' },
  { value: 'ear_preparations', label: 'Ear Preparations' },
  { value: 'topical', label: 'Topical Preparations' },
  { value: 'anaesthetics', label: 'Anaesthetics' },
  { value: 'muscle_relaxants', label: 'Muscle Relaxants' },
  { value: 'other', label: 'Other Medications' },
];

interface MedicationInfo {
  name: string;
  doses: string[];
  routes: MedicationRoute[];
  maxDailyDose?: string;
  warning?: string;
  contraindications?: string;
}

const commonMedications: Record<string, MedicationInfo[]> = {
  analgesics: [
    { name: 'Paracetamol', doses: ['500mg', '1g'], routes: ['oral', 'intravenous', 'rectal'], maxDailyDose: '4g/day', warning: 'Hepatotoxic in overdose. Avoid in severe liver disease.' },
    { name: 'Paracetamol/Codeine', doses: ['500mg/8mg', '500mg/30mg'], routes: ['oral'], maxDailyDose: '8 tablets/day', warning: 'Contains codeine - may cause constipation and sedation' },
  ],
  nsaids: [
    { name: 'Ibuprofen', doses: ['200mg', '400mg', '600mg'], routes: ['oral'], maxDailyDose: '2.4g/day', warning: 'GI bleeding risk. Avoid in renal impairment, asthma, pregnancy.' },
    { name: 'Diclofenac', doses: ['25mg', '50mg', '75mg', '100mg'], routes: ['oral', 'intramuscular', 'rectal'], maxDailyDose: '150mg/day', warning: 'Cardiovascular risk. Avoid in heart failure.' },
    { name: 'Naproxen', doses: ['250mg', '500mg'], routes: ['oral'], maxDailyDose: '1.25g/day', warning: 'GI bleeding risk. Take with food.' },
    { name: 'Piroxicam', doses: ['10mg', '20mg'], routes: ['oral'], maxDailyDose: '20mg/day', warning: 'High GI risk. Not first-line therapy.' },
    { name: 'Meloxicam', doses: ['7.5mg', '15mg'], routes: ['oral'], maxDailyDose: '15mg/day', warning: 'COX-2 selective. Lower GI risk.' },
    { name: 'Ketorolac', doses: ['10mg', '30mg'], routes: ['oral', 'intramuscular', 'intravenous'], maxDailyDose: '40mg/day (max 5 days)', warning: 'Short-term use only. High GI bleeding risk.' },
  ],
  opioids: [
    { name: 'Tramadol', doses: ['50mg', '100mg'], routes: ['oral', 'intravenous', 'intramuscular'], maxDailyDose: '400mg/day', warning: 'Seizure risk. Serotonin syndrome with SSRIs.' },
    { name: 'Morphine Sulphate', doses: ['5mg', '10mg', '15mg', '20mg', '30mg'], routes: ['oral', 'intravenous', 'subcutaneous', 'intramuscular'], maxDailyDose: 'Titrate to effect', warning: 'Respiratory depression. Constipation. Addiction potential.' },
    { name: 'Pethidine', doses: ['50mg', '100mg'], routes: ['intramuscular', 'intravenous'], maxDailyDose: '400mg/day', warning: 'Avoid in renal impairment. Seizure risk.' },
    { name: 'Pentazocine', doses: ['30mg', '60mg'], routes: ['intramuscular', 'intravenous'], maxDailyDose: '360mg/day', warning: 'Mixed agonist-antagonist. May precipitate withdrawal in opioid-dependent patients.' },
    { name: 'Codeine Phosphate', doses: ['15mg', '30mg', '60mg'], routes: ['oral'], maxDailyDose: '240mg/day', warning: 'Constipation. Variable metabolism.' },
    { name: 'Fentanyl', doses: ['25mcg/hr', '50mcg/hr', '75mcg/hr', '100mcg/hr'], routes: ['topical', 'intravenous'], maxDailyDose: 'Titrate to effect', warning: 'Potent. Patch takes 12-24hrs to peak effect.' },
  ],
  antibiotics_penicillins: [
    { name: 'Amoxicillin', doses: ['250mg', '500mg', '1g'], routes: ['oral'], maxDailyDose: '3g/day', warning: 'Penicillin allergy. Rash with EBV infection.' },
    { name: 'Amoxicillin-Clavulanate (Augmentin)', doses: ['375mg', '625mg', '1g', '1.2g'], routes: ['oral', 'intravenous'], maxDailyDose: '1.2g IV q8h or 625mg PO TDS', warning: 'Hepatotoxicity with prolonged use. Diarrhea common.' },
    { name: 'Ampicillin', doses: ['250mg', '500mg', '1g', '2g'], routes: ['oral', 'intravenous', 'intramuscular'], maxDailyDose: '12g/day IV', warning: 'Penicillin allergy. IV for severe infections.' },
    { name: 'Flucloxacillin', doses: ['250mg', '500mg', '1g', '2g'], routes: ['oral', 'intravenous'], maxDailyDose: '8g/day IV', warning: 'Hepatotoxicity (esp. >2 weeks). Take on empty stomach.' },
    { name: 'Piperacillin-Tazobactam', doses: ['2.25g', '4.5g'], routes: ['intravenous'], maxDailyDose: '18g/day piperacillin', warning: 'Broad spectrum. Reserve for serious infections.' },
    { name: 'Benzylpenicillin', doses: ['600mg', '1.2g', '2.4g'], routes: ['intravenous', 'intramuscular'], maxDailyDose: '14.4g/day', warning: 'Penicillin allergy. High doses may cause seizures.' },
    { name: 'Phenoxymethylpenicillin', doses: ['250mg', '500mg'], routes: ['oral'], maxDailyDose: '2g/day', warning: 'Take on empty stomach. Limited spectrum.' },
  ],
  antibiotics_cephalosporins: [
    { name: 'Ceftriaxone', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], maxDailyDose: '4g/day', warning: 'Avoid with calcium infusions in neonates. Once daily dosing.' },
    { name: 'Cefuroxime', doses: ['250mg', '500mg', '750mg', '1.5g'], routes: ['oral', 'intravenous'], maxDailyDose: '1.5g IV q8h', warning: 'Oral (axetil) with food for better absorption.' },
    { name: 'Cefixime', doses: ['200mg', '400mg'], routes: ['oral'], maxDailyDose: '400mg/day', warning: '3rd generation. Good for UTI, gonorrhea.' },
    { name: 'Ceftazidime', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], maxDailyDose: '6g/day', warning: 'Pseudomonas coverage. Adjust in renal impairment.' },
    { name: 'Cefotaxime', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], maxDailyDose: '12g/day', warning: '3rd generation. Good CNS penetration.' },
    { name: 'Cephalexin', doses: ['250mg', '500mg', '1g'], routes: ['oral'], maxDailyDose: '4g/day', warning: '1st generation. Skin/soft tissue, UTI.' },
    { name: 'Cefepime', doses: ['1g', '2g'], routes: ['intravenous'], maxDailyDose: '6g/day', warning: '4th generation. Neurotoxicity in renal impairment.' },
  ],
  antibiotics_macrolides: [
    { name: 'Azithromycin', doses: ['250mg', '500mg'], routes: ['oral', 'intravenous'], maxDailyDose: '500mg/day', warning: 'QT prolongation. Take 1hr before or 2hrs after meals.' },
    { name: 'Erythromycin', doses: ['250mg', '500mg'], routes: ['oral', 'intravenous'], maxDailyDose: '4g/day', warning: 'GI upset common. QT prolongation. Many drug interactions.' },
    { name: 'Clarithromycin', doses: ['250mg', '500mg'], routes: ['oral', 'intravenous'], maxDailyDose: '1g/day', warning: 'Metallic taste. Many drug interactions.' },
  ],
  antibiotics_quinolones: [
    { name: 'Ciprofloxacin', doses: ['250mg', '500mg', '750mg', '200mg', '400mg'], routes: ['oral', 'intravenous'], maxDailyDose: '1.5g/day PO, 1.2g/day IV', warning: 'Tendon rupture, QT prolongation, CNS effects. Avoid in children.' },
    { name: 'Levofloxacin', doses: ['250mg', '500mg', '750mg'], routes: ['oral', 'intravenous'], maxDailyDose: '750mg/day', warning: 'Tendon rupture, QT prolongation. Adjust in renal impairment.' },
    { name: 'Moxifloxacin', doses: ['400mg'], routes: ['oral', 'intravenous'], maxDailyDose: '400mg/day', warning: 'QT prolongation. No renal adjustment needed. Good respiratory coverage.' },
    { name: 'Ofloxacin', doses: ['200mg', '400mg'], routes: ['oral'], maxDailyDose: '800mg/day', warning: 'Similar warnings to other quinolones.' },
  ],
  antibiotics_aminoglycosides: [
    { name: 'Gentamicin', doses: ['80mg', '120mg', '240mg', '5-7mg/kg'], routes: ['intravenous', 'intramuscular'], maxDailyDose: '7mg/kg/day', warning: 'NEPHROTOXIC & OTOTOXIC. Monitor levels. Once daily dosing preferred.' },
    { name: 'Amikacin', doses: ['500mg', '1g', '15mg/kg'], routes: ['intravenous', 'intramuscular'], maxDailyDose: '15mg/kg/day', warning: 'NEPHROTOXIC & OTOTOXIC. Reserve for resistant organisms.' },
    { name: 'Streptomycin', doses: ['500mg', '1g'], routes: ['intramuscular'], maxDailyDose: '1g/day', warning: 'TB treatment. Ototoxic. IM only.' },
  ],
  antibiotics_others: [
    { name: 'Metronidazole', doses: ['200mg', '400mg', '500mg'], routes: ['oral', 'intravenous', 'rectal'], maxDailyDose: '2g/day', warning: 'Disulfiram reaction with alcohol. Metallic taste.' },
    { name: 'Clindamycin', doses: ['150mg', '300mg', '600mg', '900mg'], routes: ['oral', 'intravenous'], maxDailyDose: '2.7g/day IV', warning: 'C. difficile colitis risk. Good bone penetration.' },
    { name: 'Vancomycin', doses: ['500mg', '1g', '1.5g'], routes: ['intravenous', 'oral'], maxDailyDose: '2g/day IV (adjust by levels)', warning: 'NEPHROTOXIC. Red man syndrome. Monitor trough levels.' },
    { name: 'Trimethoprim-Sulfamethoxazole', doses: ['480mg', '960mg'], routes: ['oral', 'intravenous'], maxDailyDose: '1920mg/day', warning: 'Sulfa allergy. Hyperkalemia. Avoid in G6PD deficiency.' },
    { name: 'Doxycycline', doses: ['100mg', '200mg'], routes: ['oral', 'intravenous'], maxDailyDose: '200mg/day', warning: 'Photosensitivity. Avoid in pregnancy/children. Take upright with water.' },
    { name: 'Nitrofurantoin', doses: ['50mg', '100mg'], routes: ['oral'], maxDailyDose: '400mg/day', warning: 'Only for uncomplicated UTI. Pulmonary toxicity with long-term use.' },
    { name: 'Linezolid', doses: ['600mg'], routes: ['oral', 'intravenous'], maxDailyDose: '1.2g/day', warning: 'MAOI activity. Serotonin syndrome. Bone marrow suppression.' },
    { name: 'Meropenem', doses: ['500mg', '1g', '2g'], routes: ['intravenous'], maxDailyDose: '6g/day', warning: 'Reserve for serious infections. Seizure risk.' },
    { name: 'Imipenem-Cilastatin', doses: ['500mg', '1g'], routes: ['intravenous'], maxDailyDose: '4g/day', warning: 'Seizure risk (higher than meropenem). Reserve for serious infections.' },
    { name: 'Colistin', doses: ['2MU', '4.5MU'], routes: ['intravenous', 'inhalation'], maxDailyDose: '9MU/day', warning: 'NEPHROTOXIC. Last resort for MDR gram-negatives.' },
    { name: 'Fosfomycin', doses: ['3g'], routes: ['oral'], maxDailyDose: '3g single dose', warning: 'Single dose for uncomplicated UTI.' },
  ],
  antiinflammatories: [
    { name: 'Prednisolone', doses: ['5mg', '10mg', '20mg', '40mg', '60mg'], routes: ['oral'], maxDailyDose: 'Varies by indication', warning: 'Hyperglycemia, immunosuppression, osteoporosis. Taper if >2 weeks.' },
    { name: 'Hydrocortisone', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['intravenous', 'intramuscular', 'oral'], maxDailyDose: '300-400mg/day for stress', warning: 'Adrenal suppression. Use IV for acute adrenal crisis.' },
    { name: 'Dexamethasone', doses: ['0.5mg', '2mg', '4mg', '8mg'], routes: ['oral', 'intravenous', 'intramuscular'], maxDailyDose: 'Varies (potent)', warning: 'Very potent. Long half-life. Minimal mineralocorticoid effect.' },
    { name: 'Methylprednisolone', doses: ['4mg', '16mg', '40mg', '125mg', '500mg', '1g'], routes: ['oral', 'intravenous'], maxDailyDose: 'Pulse: 1g/day x3', warning: 'IV for pulse therapy. Cardiac effects at high doses.' },
    { name: 'Betamethasone', doses: ['0.5mg', '4mg'], routes: ['oral', 'intramuscular'], maxDailyDose: 'Varies', warning: 'Long-acting. IM depot for fetal lung maturity.' },
  ],
  vitamins: [
    { name: 'Vitamin C (Ascorbic Acid)', doses: ['250mg', '500mg', '1000mg'], routes: ['oral', 'intravenous'], maxDailyDose: '2g/day', warning: 'High doses may cause kidney stones. Increases iron absorption.' },
    { name: 'Vitamin B Complex', doses: ['1 tablet', '2 tablets'], routes: ['oral'], maxDailyDose: '2 tablets/day', warning: 'May turn urine bright yellow (riboflavin).' },
    { name: 'Vitamin B1 (Thiamine)', doses: ['50mg', '100mg', '200mg'], routes: ['oral', 'intravenous', 'intramuscular'], maxDailyDose: '300mg/day', warning: 'Give before glucose in alcoholics (prevent Wernicke).' },
    { name: 'Vitamin B6 (Pyridoxine)', doses: ['10mg', '25mg', '50mg'], routes: ['oral'], maxDailyDose: '100mg/day', warning: 'Neuropathy with chronic high doses.' },
    { name: 'Vitamin B12 (Cyanocobalamin)', doses: ['50mcg', '100mcg', '1000mcg'], routes: ['oral', 'intramuscular'], maxDailyDose: '1000mcg/day', warning: 'IM for pernicious anemia. Oral for dietary deficiency.' },
    { name: 'Folic Acid', doses: ['400mcg', '1mg', '5mg'], routes: ['oral'], maxDailyDose: '5mg/day', warning: 'Check B12 status first. May mask B12 deficiency.' },
    { name: 'Vitamin D3 (Cholecalciferol)', doses: ['400IU', '1000IU', '2000IU', '50000IU'], routes: ['oral'], maxDailyDose: '4000IU/day maintenance', warning: 'Monitor calcium. High doses for deficiency treatment.' },
    { name: 'Vitamin E (Tocopherol)', doses: ['100IU', '400IU'], routes: ['oral'], maxDailyDose: '1000mg/day', warning: 'May increase bleeding risk with anticoagulants.' },
    { name: 'Vitamin K (Phytomenadione)', doses: ['1mg', '2mg', '5mg', '10mg'], routes: ['oral', 'intravenous'], maxDailyDose: '10mg/day', warning: 'IV for warfarin reversal. Give slowly.' },
    { name: 'Vitamin A (Retinol)', doses: ['5000IU', '10000IU', '25000IU'], routes: ['oral'], maxDailyDose: '10000IU/day', warning: 'TERATOGENIC. Avoid in pregnancy. Hepatotoxic in excess.' },
  ],
  minerals: [
    { name: 'Ferrous Sulphate', doses: ['200mg', '300mg'], routes: ['oral'], maxDailyDose: '600mg/day', warning: 'GI upset. Take with vitamin C. Constipation.' },
    { name: 'Ferrous Fumarate', doses: ['200mg', '322mg'], routes: ['oral'], maxDailyDose: '600mg/day', warning: 'Better tolerated than sulphate. Black stools normal.' },
    { name: 'Iron Sucrose', doses: ['100mg', '200mg'], routes: ['intravenous'], maxDailyDose: '200mg per dose', warning: 'IV iron for oral intolerance/malabsorption.' },
    { name: 'Calcium Carbonate', doses: ['500mg', '1000mg', '1250mg'], routes: ['oral'], maxDailyDose: '3000mg/day', warning: 'Take with food. Constipation. Avoid in hypercalcemia.' },
    { name: 'Calcium Gluconate', doses: ['1g', '2g'], routes: ['intravenous'], maxDailyDose: '2g IV slowly', warning: 'Give slowly. Monitor ECG in hypercalcemia treatment.' },
    { name: 'Zinc Sulphate', doses: ['20mg', '50mg', '220mg'], routes: ['oral'], maxDailyDose: '50mg elemental zinc/day', warning: 'GI upset. May affect copper absorption.' },
    { name: 'Magnesium Sulphate', doses: ['1g', '2g', '4g'], routes: ['intravenous', 'intramuscular'], maxDailyDose: '4g IV loading', warning: 'Monitor reflexes, RR, urine output. Antidote: calcium gluconate.' },
    { name: 'Potassium Chloride', doses: ['600mg', '1.2g', '20mmol', '40mmol'], routes: ['oral', 'intravenous'], maxDailyDose: '100mmol/day', warning: 'IV max 10mmol/hr via peripheral line. Monitor ECG.' },
  ],
  anticoagulants: [
    { name: 'Enoxaparin', doses: ['20mg', '40mg', '60mg', '80mg', '100mg', '1mg/kg'], routes: ['subcutaneous'], maxDailyDose: '1mg/kg BD treatment dose', warning: 'Adjust for renal impairment. Monitor anti-Xa if needed.' },
    { name: 'Heparin (Unfractionated)', doses: ['5000units', '10000units', '25000units/50ml'], routes: ['subcutaneous', 'intravenous'], maxDailyDose: 'Titrate to APTT', warning: 'Monitor APTT. HIT risk. Protamine reverses.' },
    { name: 'Warfarin', doses: ['1mg', '2mg', '3mg', '5mg'], routes: ['oral'], maxDailyDose: 'Titrate to INR', warning: 'Many food/drug interactions. Regular INR monitoring. Vitamin K reverses.' },
    { name: 'Rivaroxaban', doses: ['10mg', '15mg', '20mg'], routes: ['oral'], maxDailyDose: '20mg/day', warning: 'Take with food. No routine monitoring. Avoid in severe renal impairment.' },
    { name: 'Apixaban', doses: ['2.5mg', '5mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'Reduce dose if elderly + low weight or renal impairment.' },
    { name: 'Aspirin', doses: ['75mg', '100mg', '300mg'], routes: ['oral'], maxDailyDose: '300mg/day for antithrombotic', warning: 'GI bleeding. Avoid in active peptic ulcer, children (Reye syndrome).' },
    { name: 'Clopidogrel', doses: ['75mg', '300mg'], routes: ['oral'], maxDailyDose: '75mg/day maintenance', warning: '300mg loading dose. Avoid with omeprazole.' },
  ],
  antifungals: [
    { name: 'Fluconazole', doses: ['50mg', '100mg', '150mg', '200mg', '400mg'], routes: ['oral', 'intravenous'], maxDailyDose: '400mg/day', warning: 'QT prolongation. Hepatotoxicity. Many drug interactions.' },
    { name: 'Itraconazole', doses: ['100mg', '200mg'], routes: ['oral'], maxDailyDose: '400mg/day', warning: 'Take capsules with food. Many drug interactions.' },
    { name: 'Voriconazole', doses: ['200mg', '400mg'], routes: ['oral', 'intravenous'], maxDailyDose: '400mg/day maintenance', warning: 'Visual disturbances. Hepatotoxicity. CYP450 interactions.' },
    { name: 'Nystatin', doses: ['100000units', '500000units'], routes: ['oral', 'topical'], maxDailyDose: '2MU/day', warning: 'Not absorbed. Local treatment only.' },
    { name: 'Clotrimazole', doses: ['1%', '10mg troche'], routes: ['topical', 'oral'], maxDailyDose: '5 troches/day', warning: 'Topical only (cream). Troches for oral candidiasis.' },
    { name: 'Amphotericin B', doses: ['0.5mg/kg', '1mg/kg'], routes: ['intravenous'], maxDailyDose: '1.5mg/kg/day', warning: 'NEPHROTOXIC. Infusion reactions (premedicate). Liposomal form safer.' },
    { name: 'Terbinafine', doses: ['250mg'], routes: ['oral'], maxDailyDose: '250mg/day', warning: 'Hepatotoxicity. For dermatophytes. 6 weeks for fingernails, 12 weeks for toenails.' },
    { name: 'Griseofulvin', doses: ['500mg', '1g'], routes: ['oral'], maxDailyDose: '1g/day', warning: 'Take with fatty food. Photosensitivity. Long treatment course.' },
  ],
  antivirals: [
    { name: 'Acyclovir', doses: ['200mg', '400mg', '800mg', '5mg/kg', '10mg/kg'], routes: ['oral', 'intravenous'], maxDailyDose: '800mg 5x daily PO; 10mg/kg q8h IV', warning: 'Hydrate well. Nephrotoxic. Adjust for renal impairment.' },
    { name: 'Valacyclovir', doses: ['500mg', '1g'], routes: ['oral'], maxDailyDose: '3g/day', warning: 'Prodrug of acyclovir. Better bioavailability.' },
    { name: 'Oseltamivir', doses: ['75mg'], routes: ['oral'], maxDailyDose: '150mg/day', warning: 'Start within 48hrs of flu symptoms. GI upset common.' },
    { name: 'Tenofovir', doses: ['245mg', '300mg'], routes: ['oral'], maxDailyDose: '300mg/day', warning: 'Nephrotoxicity. Bone effects. Check renal function.' },
    { name: 'Lamivudine', doses: ['100mg', '150mg', '300mg'], routes: ['oral'], maxDailyDose: '300mg/day (HIV); 100mg/day (HBV)', warning: 'Different doses for HIV vs HBV. Resistance develops.' },
  ],
  antihistamines: [
    { name: 'Chlorpheniramine', doses: ['4mg'], routes: ['oral', 'intramuscular', 'intravenous'], maxDailyDose: '24mg/day', warning: 'Sedating. Avoid in elderly (confusion).' },
    { name: 'Loratadine', doses: ['10mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'Non-sedating. Once daily.' },
    { name: 'Cetirizine', doses: ['5mg', '10mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'Low sedation. May cause drowsiness in some.' },
    { name: 'Fexofenadine', doses: ['120mg', '180mg'], routes: ['oral'], maxDailyDose: '180mg/day', warning: 'Non-sedating. Avoid grapefruit juice.' },
    { name: 'Promethazine', doses: ['10mg', '25mg', '50mg'], routes: ['oral', 'intramuscular', 'rectal'], maxDailyDose: '100mg/day', warning: 'Highly sedating. Antiemetic effect. Tissue necrosis if extravasates.' },
    { name: 'Diphenhydramine', doses: ['25mg', '50mg'], routes: ['oral', 'intramuscular', 'intravenous'], maxDailyDose: '300mg/day', warning: 'Sedating. Anticholinergic. Avoid in elderly.' },
  ],
  antihypertensives_ace: [
    { name: 'Lisinopril', doses: ['2.5mg', '5mg', '10mg', '20mg', '40mg'], routes: ['oral'], maxDailyDose: '80mg/day', warning: 'Dry cough. Angioedema. Avoid in pregnancy. Monitor K+ and creatinine.' },
    { name: 'Enalapril', doses: ['2.5mg', '5mg', '10mg', '20mg'], routes: ['oral'], maxDailyDose: '40mg/day', warning: 'Same warnings as lisinopril. Twice daily dosing.' },
    { name: 'Ramipril', doses: ['1.25mg', '2.5mg', '5mg', '10mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'Same class warnings. Cardioprotective in high-risk patients.' },
    { name: 'Perindopril', doses: ['2mg', '4mg', '8mg'], routes: ['oral'], maxDailyDose: '8mg/day', warning: 'Take in morning. Same class warnings.' },
    { name: 'Captopril', doses: ['12.5mg', '25mg', '50mg'], routes: ['oral'], maxDailyDose: '150mg/day', warning: 'Three times daily. Taste disturbance. First-dose hypotension.' },
  ],
  antihypertensives_arbs: [
    { name: 'Losartan', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], maxDailyDose: '100mg/day', warning: 'No cough (unlike ACEi). Avoid in pregnancy. Monitor K+ and renal function.' },
    { name: 'Valsartan', doses: ['40mg', '80mg', '160mg', '320mg'], routes: ['oral'], maxDailyDose: '320mg/day', warning: 'Same class warnings. Heart failure indication.' },
    { name: 'Irbesartan', doses: ['75mg', '150mg', '300mg'], routes: ['oral'], maxDailyDose: '300mg/day', warning: 'Renoprotective in diabetic nephropathy.' },
    { name: 'Telmisartan', doses: ['20mg', '40mg', '80mg'], routes: ['oral'], maxDailyDose: '80mg/day', warning: 'Long half-life. Once daily.' },
    { name: 'Candesartan', doses: ['4mg', '8mg', '16mg', '32mg'], routes: ['oral'], maxDailyDose: '32mg/day', warning: 'Heart failure indication. Once daily.' },
  ],
  antihypertensives_ccbs: [
    { name: 'Amlodipine', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'Ankle edema. Long half-life. Once daily.' },
    { name: 'Nifedipine', doses: ['10mg', '20mg', '30mg', '60mg'], routes: ['oral'], maxDailyDose: '90mg/day (SR)', warning: 'Use slow-release only. Flushing, headache, reflex tachycardia.' },
    { name: 'Diltiazem', doses: ['60mg', '90mg', '120mg', '180mg', '240mg'], routes: ['oral'], maxDailyDose: '360mg/day', warning: 'Avoid with beta-blockers (heart block). Constipation.' },
    { name: 'Verapamil', doses: ['40mg', '80mg', '120mg', '240mg'], routes: ['oral', 'intravenous'], maxDailyDose: '480mg/day', warning: 'Avoid with beta-blockers. Constipation. Negative inotrope.' },
    { name: 'Felodipine', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'Avoid grapefruit juice. Ankle edema.' },
  ],
  antihypertensives_betablockers: [
    { name: 'Atenolol', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], maxDailyDose: '100mg/day', warning: 'Cardioselective. Avoid in asthma (use with caution). Bradycardia.' },
    { name: 'Metoprolol', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['oral', 'intravenous'], maxDailyDose: '200mg/day', warning: 'Cardioselective. Heart failure indication (start low, go slow).' },
    { name: 'Bisoprolol', doses: ['1.25mg', '2.5mg', '5mg', '10mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'Highly cardioselective. Heart failure indication.' },
    { name: 'Carvedilol', doses: ['3.125mg', '6.25mg', '12.5mg', '25mg'], routes: ['oral'], maxDailyDose: '50mg/day', warning: 'Non-selective + alpha-block. Heart failure indication.' },
    { name: 'Propranolol', doses: ['10mg', '20mg', '40mg', '80mg', '160mg'], routes: ['oral'], maxDailyDose: '320mg/day', warning: 'Non-selective. Avoid in asthma. Tremor, migraine, anxiety indications.' },
    { name: 'Labetalol', doses: ['100mg', '200mg', '400mg'], routes: ['oral', 'intravenous'], maxDailyDose: '2.4g/day', warning: 'Alpha + beta block. IV for hypertensive emergencies. Safe in pregnancy.' },
  ],
  antihypertensives_diuretics: [
    { name: 'Furosemide', doses: ['20mg', '40mg', '80mg', '120mg', '250mg'], routes: ['oral', 'intravenous'], maxDailyDose: '600mg/day', warning: 'OTOTOXIC at high doses. Monitor electrolytes. Hypokalemia.' },
    { name: 'Hydrochlorothiazide', doses: ['12.5mg', '25mg', '50mg'], routes: ['oral'], maxDailyDose: '50mg/day', warning: 'Hypokalemia, hyperuricemia, hyperglycemia. Low-dose preferred.' },
    { name: 'Indapamide', doses: ['1.5mg', '2.5mg'], routes: ['oral'], maxDailyDose: '2.5mg/day', warning: 'Thiazide-like. Less metabolic effects. Once daily.' },
    { name: 'Spironolactone', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], maxDailyDose: '400mg/day', warning: 'K+ sparing. Gynecomastia. Avoid with ACEi/ARB (hyperkalemia).' },
    { name: 'Amiloride', doses: ['5mg', '10mg'], routes: ['oral'], maxDailyDose: '20mg/day', warning: 'K+ sparing. Use with thiazide to prevent hypokalemia.' },
    { name: 'Metolazone', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], maxDailyDose: '20mg/day', warning: 'Powerful with loop diuretics. Monitor electrolytes closely.' },
    { name: 'Mannitol', doses: ['0.5g/kg', '1g/kg', '20%'], routes: ['intravenous'], maxDailyDose: '2g/kg/day', warning: 'For raised ICP, acute kidney injury. May cause fluid overload initially.' },
  ],
  gastrointestinal_ppis: [
    { name: 'Omeprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], maxDailyDose: '40mg/day', warning: 'Long-term: B12 deficiency, hypomagnesemia, fractures, C. diff.' },
    { name: 'Esomeprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], maxDailyDose: '40mg/day', warning: 'S-isomer of omeprazole. Same warnings.' },
    { name: 'Pantoprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], maxDailyDose: '80mg/day', warning: 'Fewer drug interactions. Same class warnings.' },
    { name: 'Lansoprazole', doses: ['15mg', '30mg'], routes: ['oral'], maxDailyDose: '30mg/day', warning: 'Take before food. Same class warnings.' },
    { name: 'Rabeprazole', doses: ['10mg', '20mg'], routes: ['oral'], maxDailyDose: '20mg/day', warning: 'Same class warnings.' },
  ],
  gastrointestinal_h2blockers: [
    { name: 'Ranitidine', doses: ['150mg', '300mg'], routes: ['oral', 'intravenous'], maxDailyDose: '300mg/day', warning: 'Withdrawn in many countries (NDMA contamination). Check availability.' },
    { name: 'Famotidine', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], maxDailyDose: '40mg/day', warning: 'Alternative to ranitidine. Less potent than PPIs.' },
    { name: 'Cimetidine', doses: ['200mg', '400mg', '800mg'], routes: ['oral'], maxDailyDose: '800mg/day', warning: 'Many drug interactions (CYP450). Gynecomastia.' },
  ],
  gastrointestinal_antiemetics: [
    { name: 'Metoclopramide', doses: ['10mg'], routes: ['oral', 'intravenous', 'intramuscular'], maxDailyDose: '30mg/day (max 5 days)', warning: 'Extrapyramidal side effects. Avoid long-term. Max 5 days.' },
    { name: 'Ondansetron', doses: ['4mg', '8mg'], routes: ['oral', 'intravenous'], maxDailyDose: '24mg/day', warning: 'QT prolongation. Constipation. Excellent for chemo-induced nausea.' },
    { name: 'Domperidone', doses: ['10mg'], routes: ['oral'], maxDailyDose: '30mg/day', warning: 'QT prolongation. Avoid in cardiac disease. Does not cross BBB.' },
    { name: 'Prochlorperazine', doses: ['5mg', '10mg', '12.5mg'], routes: ['oral', 'intramuscular'], maxDailyDose: '40mg/day', warning: 'Extrapyramidal effects. Avoid in Parkinson disease.' },
    { name: 'Cyclizine', doses: ['50mg'], routes: ['oral', 'intramuscular', 'intravenous'], maxDailyDose: '150mg/day', warning: 'Anticholinergic. For motion sickness, vestibular disorders.' },
    { name: 'Granisetron', doses: ['1mg', '2mg'], routes: ['oral', 'intravenous'], maxDailyDose: '9mg/day', warning: '5-HT3 antagonist. For chemo-induced nausea.' },
  ],
  gastrointestinal_laxatives: [
    { name: 'Lactulose', doses: ['10ml', '15ml', '20ml', '30ml'], routes: ['oral'], maxDailyDose: '60ml/day', warning: 'May cause bloating, flatulence. Also for hepatic encephalopathy.' },
    { name: 'Bisacodyl', doses: ['5mg', '10mg'], routes: ['oral', 'rectal'], maxDailyDose: '10mg/day', warning: 'Stimulant. Takes 6-12 hours oral, 15-60 min rectal.' },
    { name: 'Senna', doses: ['7.5mg', '15mg'], routes: ['oral'], maxDailyDose: '30mg/day', warning: 'Stimulant. Takes 8-12 hours. May cause abdominal cramps.' },
    { name: 'Macrogol (PEG)', doses: ['1 sachet', '2 sachets'], routes: ['oral'], maxDailyDose: '8 sachets/day for impaction', warning: 'Osmotic. Needs adequate fluid intake.' },
    { name: 'Docusate', doses: ['100mg', '200mg'], routes: ['oral'], maxDailyDose: '500mg/day', warning: 'Stool softener. Takes 1-3 days.' },
    { name: 'Glycerin Suppository', doses: ['2g', '4g'], routes: ['rectal'], maxDailyDose: 'As needed', warning: 'Works in 15-30 minutes. Local action only.' },
  ],
  gastrointestinal_antidiarrheals: [
    { name: 'Loperamide', doses: ['2mg'], routes: ['oral'], maxDailyDose: '16mg/day', warning: 'Avoid in bloody diarrhea, C. diff, dysentery. May cause constipation.' },
    { name: 'Oral Rehydration Salts', doses: ['1 sachet in 200ml'], routes: ['oral'], maxDailyDose: 'As needed for hydration', warning: 'First-line for dehydration. Do not dilute incorrectly.' },
    { name: 'Codeine Phosphate', doses: ['15mg', '30mg'], routes: ['oral'], maxDailyDose: '240mg/day', warning: 'Opioid. Constipating effect. For short-term use.' },
  ],
  diabetes_oral: [
    { name: 'Metformin', doses: ['500mg', '850mg', '1000mg'], routes: ['oral'], maxDailyDose: '2550mg/day', warning: 'GI upset. Lactic acidosis (rare). Hold before contrast. Avoid in renal impairment.' },
    { name: 'Glibenclamide', doses: ['2.5mg', '5mg'], routes: ['oral'], maxDailyDose: '15mg/day', warning: 'Hypoglycemia risk. Avoid in elderly and renal impairment.' },
    { name: 'Gliclazide', doses: ['40mg', '80mg', '30mg MR', '60mg MR'], routes: ['oral'], maxDailyDose: '320mg/day or 120mg MR', warning: 'Hypoglycemia risk. Sulfonylurea.' },
    { name: 'Glimepiride', doses: ['1mg', '2mg', '3mg', '4mg'], routes: ['oral'], maxDailyDose: '6mg/day', warning: 'Once daily sulfonylurea. Hypoglycemia risk.' },
    { name: 'Sitagliptin', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], maxDailyDose: '100mg/day', warning: 'DPP-4 inhibitor. Low hypoglycemia risk. Adjust for renal function.' },
    { name: 'Empagliflozin', doses: ['10mg', '25mg'], routes: ['oral'], maxDailyDose: '25mg/day', warning: 'SGLT2 inhibitor. Cardio/renoprotective. Genital infections, DKA risk.' },
    { name: 'Dapagliflozin', doses: ['5mg', '10mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'SGLT2 inhibitor. Heart failure benefit. Same warnings as empagliflozin.' },
    { name: 'Pioglitazone', doses: ['15mg', '30mg', '45mg'], routes: ['oral'], maxDailyDose: '45mg/day', warning: 'Fluid retention. Avoid in heart failure. Bladder cancer concern.' },
  ],
  diabetes_insulin: [
    { name: 'Insulin Regular (Actrapid)', doses: ['5units', '10units', '15units', '20units'], routes: ['subcutaneous', 'intravenous'], maxDailyDose: 'Titrate to glucose', warning: 'Short-acting. Give 30 min before meals. Can use IV.' },
    { name: 'Insulin Lispro (Humalog)', doses: ['5units', '10units', '15units', '20units'], routes: ['subcutaneous'], maxDailyDose: 'Titrate to glucose', warning: 'Rapid-acting. Give with meals. Cannot use IV.' },
    { name: 'Insulin Aspart (NovoRapid)', doses: ['5units', '10units', '15units', '20units'], routes: ['subcutaneous', 'intravenous'], maxDailyDose: 'Titrate to glucose', warning: 'Rapid-acting. Give with meals.' },
    { name: 'Insulin Glargine (Lantus)', doses: ['10units', '20units', '30units', '40units'], routes: ['subcutaneous'], maxDailyDose: 'Titrate to glucose', warning: 'Long-acting. Once daily. Do not mix with other insulins.' },
    { name: 'Insulin Detemir (Levemir)', doses: ['10units', '20units', '30units'], routes: ['subcutaneous'], maxDailyDose: 'Titrate to glucose', warning: 'Long-acting. Once or twice daily.' },
    { name: 'Insulin Degludec (Tresiba)', doses: ['10units', '20units', '30units', '40units'], routes: ['subcutaneous'], maxDailyDose: 'Titrate to glucose', warning: 'Ultra long-acting. Very flat profile. Once daily.' },
    { name: 'Insulin NPH (Insulatard)', doses: ['10units', '20units', '30units'], routes: ['subcutaneous'], maxDailyDose: 'Titrate to glucose', warning: 'Intermediate-acting. Usually twice daily. Can mix with regular.' },
    { name: 'Mixed Insulin 30/70', doses: ['10units', '20units', '30units'], routes: ['subcutaneous'], maxDailyDose: 'Titrate to glucose', warning: '30% short-acting, 70% intermediate. Twice daily with meals.' },
  ],
  sedatives: [
    { name: 'Diazepam', doses: ['2mg', '5mg', '10mg'], routes: ['oral', 'intravenous', 'rectal'], maxDailyDose: '30mg/day', warning: 'Long half-life. Respiratory depression. Dependence. Avoid in elderly.' },
    { name: 'Midazolam', doses: ['2.5mg', '5mg', '7.5mg', '10mg'], routes: ['intravenous', 'intramuscular', 'oral'], maxDailyDose: '15mg for sedation', warning: 'Short-acting. Respiratory depression. Titrate slowly IV.' },
    { name: 'Lorazepam', doses: ['0.5mg', '1mg', '2mg', '4mg'], routes: ['oral', 'intravenous', 'intramuscular'], maxDailyDose: '10mg/day', warning: 'Medium half-life. Status epilepticus. Refrigerate injection.' },
    { name: 'Alprazolam', doses: ['0.25mg', '0.5mg', '1mg'], routes: ['oral'], maxDailyDose: '4mg/day', warning: 'High dependence potential. Short-acting. Avoid long-term.' },
    { name: 'Zolpidem', doses: ['5mg', '10mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'For insomnia only. Short-term use. Complex sleep behaviors.' },
    { name: 'Zopiclone', doses: ['3.75mg', '7.5mg'], routes: ['oral'], maxDailyDose: '7.5mg/day', warning: 'Metallic taste. Short-term use. May cause dependence.' },
  ],
  antipsychotics: [
    { name: 'Haloperidol', doses: ['0.5mg', '1mg', '2mg', '5mg', '10mg'], routes: ['oral', 'intramuscular', 'intravenous'], maxDailyDose: '20mg/day', warning: 'Extrapyramidal effects. QT prolongation. Avoid IV in elderly.' },
    { name: 'Olanzapine', doses: ['2.5mg', '5mg', '10mg', '15mg'], routes: ['oral', 'intramuscular'], maxDailyDose: '20mg/day', warning: 'Metabolic syndrome, weight gain. Sedating.' },
    { name: 'Risperidone', doses: ['0.5mg', '1mg', '2mg', '3mg', '4mg'], routes: ['oral'], maxDailyDose: '16mg/day', warning: 'Hyperprolactinemia. Less sedating than olanzapine.' },
    { name: 'Quetiapine', doses: ['25mg', '50mg', '100mg', '200mg', '300mg'], routes: ['oral'], maxDailyDose: '800mg/day', warning: 'Sedating. Metabolic effects. Also used for insomnia (low dose).' },
    { name: 'Chlorpromazine', doses: ['25mg', '50mg', '100mg'], routes: ['oral', 'intramuscular'], maxDailyDose: '1g/day', warning: 'Very sedating. Hypotension. Photosensitivity.' },
  ],
  antidepressants: [
    { name: 'Amitriptyline', doses: ['10mg', '25mg', '50mg', '75mg'], routes: ['oral'], maxDailyDose: '150mg/day', warning: 'Anticholinergic. Sedating. Cardiac toxicity in overdose. Also for neuropathic pain.' },
    { name: 'Sertraline', doses: ['25mg', '50mg', '100mg', '150mg', '200mg'], routes: ['oral'], maxDailyDose: '200mg/day', warning: 'SSRI. GI upset initially. Serotonin syndrome with MAOIs.' },
    { name: 'Fluoxetine', doses: ['20mg', '40mg', '60mg'], routes: ['oral'], maxDailyDose: '80mg/day', warning: 'Long half-life. Many drug interactions. Activating.' },
    { name: 'Escitalopram', doses: ['5mg', '10mg', '20mg'], routes: ['oral'], maxDailyDose: '20mg/day', warning: 'Well-tolerated SSRI. QT prolongation at high doses.' },
    { name: 'Venlafaxine', doses: ['37.5mg', '75mg', '150mg', '225mg'], routes: ['oral'], maxDailyDose: '375mg/day', warning: 'SNRI. May increase BP. Discontinuation syndrome.' },
    { name: 'Mirtazapine', doses: ['15mg', '30mg', '45mg'], routes: ['oral'], maxDailyDose: '45mg/day', warning: 'Sedating at low doses. Weight gain. Good for poor appetite/insomnia.' },
  ],
  antiepileptics: [
    { name: 'Phenytoin', doses: ['100mg', '200mg', '300mg'], routes: ['oral', 'intravenous'], maxDailyDose: '600mg/day', warning: 'Narrow therapeutic index. Many interactions. Gum hypertrophy. Monitor levels.' },
    { name: 'Sodium Valproate', doses: ['200mg', '500mg', '1000mg'], routes: ['oral', 'intravenous'], maxDailyDose: '2.5g/day', warning: 'Teratogenic. Weight gain. Hepatotoxicity. Monitor LFTs.' },
    { name: 'Carbamazepine', doses: ['100mg', '200mg', '400mg'], routes: ['oral'], maxDailyDose: '1.8g/day', warning: 'Autoinduction. Many interactions. Hyponatremia. HLA-B*1502 in Asians.' },
    { name: 'Levetiracetam', doses: ['250mg', '500mg', '750mg', '1000mg'], routes: ['oral', 'intravenous'], maxDailyDose: '3g/day', warning: 'Few interactions. Psychiatric side effects (irritability).' },
    { name: 'Lamotrigine', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['oral'], maxDailyDose: '500mg/day', warning: 'Slow titration required. SJS risk. Interactions with valproate.' },
    { name: 'Gabapentin', doses: ['100mg', '300mg', '400mg', '600mg', '800mg'], routes: ['oral'], maxDailyDose: '3.6g/day', warning: 'Renal excretion. Also for neuropathic pain. Abuse potential.' },
    { name: 'Pregabalin', doses: ['25mg', '50mg', '75mg', '150mg', '300mg'], routes: ['oral'], maxDailyDose: '600mg/day', warning: 'Neuropathic pain, anxiety. Abuse potential. Adjust for renal function.' },
  ],
  bronchodilators: [
    { name: 'Salbutamol', doses: ['2.5mg/2.5ml', '5mg/2.5ml', '100mcg/puff', '2mg', '4mg'], routes: ['inhalation', 'oral', 'intravenous'], maxDailyDose: 'PRN for inhalers', warning: 'Tachycardia, tremor, hypokalemia. Use PRN, not regular.' },
    { name: 'Ipratropium', doses: ['250mcg/ml', '500mcg/ml', '20mcg/puff'], routes: ['inhalation'], maxDailyDose: 'QID dosing', warning: 'Anticholinergic. Dry mouth. Combined with salbutamol often.' },
    { name: 'Tiotropium', doses: ['18mcg', '2.5mcg'], routes: ['inhalation'], maxDailyDose: '18mcg/day', warning: 'Long-acting. Once daily. For COPD maintenance.' },
    { name: 'Salmeterol', doses: ['25mcg', '50mcg'], routes: ['inhalation'], maxDailyDose: '100mcg/day', warning: 'Long-acting. Must use with ICS in asthma. Twice daily.' },
    { name: 'Formoterol', doses: ['6mcg', '12mcg'], routes: ['inhalation'], maxDailyDose: '48mcg/day', warning: 'Long-acting. Fast onset. Must use with ICS in asthma.' },
    { name: 'Aminophylline', doses: ['250mg', '500mg'], routes: ['intravenous'], maxDailyDose: '900mg/day', warning: 'Narrow therapeutic index. Arrhythmias, seizures. Monitor levels.' },
    { name: 'Theophylline', doses: ['100mg', '200mg', '300mg', '400mg'], routes: ['oral'], maxDailyDose: '900mg/day', warning: 'Narrow therapeutic index. Many interactions. Monitor levels.' },
  ],
  antiasthmatics: [
    { name: 'Beclomethasone', doses: ['50mcg', '100mcg', '200mcg', '250mcg'], routes: ['inhalation'], maxDailyDose: '1000mcg/day', warning: 'Rinse mouth after use (thrush). Adrenal suppression at high doses.' },
    { name: 'Budesonide', doses: ['100mcg', '200mcg', '400mcg'], routes: ['inhalation'], maxDailyDose: '1600mcg/day', warning: 'Rinse mouth after use. Combined products available (Symbicort).' },
    { name: 'Fluticasone', doses: ['50mcg', '100mcg', '125mcg', '250mcg', '500mcg'], routes: ['inhalation'], maxDailyDose: '1000mcg/day', warning: 'Most potent ICS. Rinse mouth. Adrenal suppression risk.' },
    { name: 'Montelukast', doses: ['4mg', '5mg', '10mg'], routes: ['oral'], maxDailyDose: '10mg/day', warning: 'Leukotriene antagonist. Psychiatric effects reported. Once daily at night.' },
  ],
  thyroid: [
    { name: 'Levothyroxine', doses: ['25mcg', '50mcg', '75mcg', '100mcg', '125mcg', '150mcg'], routes: ['oral'], maxDailyDose: '200mcg/day (usually)', warning: 'Take on empty stomach. Wait 4hrs from iron/calcium. Start low in elderly/cardiac.' },
    { name: 'Carbimazole', doses: ['5mg', '10mg', '20mg'], routes: ['oral'], maxDailyDose: '60mg/day initially', warning: 'Agranulocytosis (sore throat = urgent FBC). Teratogenic.' },
    { name: 'Propylthiouracil', doses: ['50mg', '100mg'], routes: ['oral'], maxDailyDose: '600mg/day', warning: 'Hepatotoxicity. Reserved for 1st trimester pregnancy, thyroid storm.' },
    { name: 'Lugol Iodine', doses: ['0.1ml', '0.3ml', '0.5ml'], routes: ['oral'], maxDailyDose: '0.5ml TDS', warning: 'Pre-operatively for thyroidectomy. Wolff-Chaikoff effect.' },
  ],
  antiparasitics: [
    { name: 'Albendazole', doses: ['200mg', '400mg'], routes: ['oral'], maxDailyDose: '800mg/day', warning: 'Teratogenic. Take with fatty food. For roundworms, hookworms, etc.' },
    { name: 'Mebendazole', doses: ['100mg', '500mg'], routes: ['oral'], maxDailyDose: '500mg single dose', warning: 'Poorly absorbed. Repeat after 2 weeks for pinworms.' },
    { name: 'Ivermectin', doses: ['3mg', '6mg', '12mg', '200mcg/kg'], routes: ['oral'], maxDailyDose: '200mcg/kg single dose', warning: 'Onchocerciasis, scabies, strongyloides. May exacerbate Loa loa.' },
    { name: 'Praziquantel', doses: ['150mg', '600mg'], routes: ['oral'], maxDailyDose: '60mg/kg/day', warning: 'For schistosomiasis, tapeworms. Take with food.' },
    { name: 'Metronidazole', doses: ['200mg', '400mg', '500mg'], routes: ['oral', 'intravenous'], maxDailyDose: '2g/day', warning: 'For giardia, amoebiasis. Disulfiram reaction with alcohol.' },
  ],
  antimalarials: [
    { name: 'Artemether-Lumefantrine', doses: ['20/120mg', '4 tablets'], routes: ['oral'], maxDailyDose: '4 tabs BD x 3 days', warning: 'Take with fatty food. ACT first-line for P. falciparum.' },
    { name: 'Artesunate', doses: ['60mg', '120mg', '2.4mg/kg'], routes: ['intravenous', 'intramuscular'], maxDailyDose: '2.4mg/kg at 0,12,24h then daily', warning: 'For severe malaria. Delayed hemolysis possible.' },
    { name: 'Quinine', doses: ['300mg', '600mg', '10mg/kg'], routes: ['oral', 'intravenous'], maxDailyDose: '600mg TDS', warning: 'Cinchonism. Hypoglycemia. QT prolongation. For severe/resistant malaria.' },
    { name: 'Chloroquine', doses: ['155mg base', '310mg base'], routes: ['oral'], maxDailyDose: '10mg base/kg D1, 5mg base/kg D2,3', warning: 'Resistance widespread. For P. vivax, P. ovale. Retinopathy with long use.' },
    { name: 'Primaquine', doses: ['7.5mg', '15mg', '30mg'], routes: ['oral'], maxDailyDose: '30mg/day for 14 days', warning: 'For P. vivax/ovale radical cure. Hemolysis in G6PD deficiency.' },
  ],
  vaccines: [
    { name: 'Tetanus Toxoid', doses: ['0.5ml'], routes: ['intramuscular'], maxDailyDose: 'Single dose', warning: 'Booster every 10 years. Give with TIG if high-risk wound and incomplete vaccination.' },
    { name: 'Anti-Tetanus Immunoglobulin', doses: ['250units', '500units'], routes: ['intramuscular'], maxDailyDose: '500units', warning: 'Give at different site from vaccine. For high-risk wounds.' },
    { name: 'Hepatitis B Vaccine', doses: ['10mcg', '20mcg'], routes: ['intramuscular'], maxDailyDose: 'Per schedule', warning: '3 doses (0, 1, 6 months). Check anti-HBs after high-risk exposure.' },
    { name: 'Hepatitis B Immunoglobulin', doses: ['100-500IU'], routes: ['intramuscular'], maxDailyDose: 'Single dose', warning: 'For post-exposure prophylaxis. Give within 72 hours of exposure.' },
    { name: 'Rabies Vaccine', doses: ['1ml'], routes: ['intramuscular'], maxDailyDose: 'Per schedule', warning: 'PEP: Days 0, 3, 7, 14 (+ RIG for category III).' },
    { name: 'Rabies Immunoglobulin', doses: ['20IU/kg'], routes: ['intramuscular'], maxDailyDose: '20IU/kg', warning: 'Infiltrate around wound. Give with first vaccine dose only.' },
  ],
  eye_preparations: [
    { name: 'Chloramphenicol Eye Drops', doses: ['0.5%'], routes: ['ophthalmic'], maxDailyDose: '1-2 drops 4-6x daily', warning: 'Bacterial conjunctivitis. 5-7 day course.' },
    { name: 'Ciprofloxacin Eye Drops', doses: ['0.3%'], routes: ['ophthalmic'], maxDailyDose: '1-2 drops 4x daily', warning: 'Broad spectrum. For severe infections, corneal ulcers.' },
    { name: 'Timolol Eye Drops', doses: ['0.25%', '0.5%'], routes: ['ophthalmic'], maxDailyDose: '1 drop BD', warning: 'For glaucoma. Systemic absorption - avoid in asthma/heart block.' },
    { name: 'Latanoprost Eye Drops', doses: ['0.005%'], routes: ['ophthalmic'], maxDailyDose: '1 drop at night', warning: 'Prostaglandin. Iris pigmentation changes. Eyelash growth.' },
    { name: 'Artificial Tears', doses: ['0.5%', '1%'], routes: ['ophthalmic'], maxDailyDose: 'PRN', warning: 'For dry eyes. Various formulations available.' },
    { name: 'Prednisolone Eye Drops', doses: ['0.5%', '1%'], routes: ['ophthalmic'], maxDailyDose: '1-2 drops 4-6x daily', warning: 'Steroid. Monitor IOP. Risk of cataract, infection.' },
  ],
  ear_preparations: [
    { name: 'Ciprofloxacin-Dexamethasone Ear Drops', doses: ['0.3%/0.1%'], routes: ['otic'], maxDailyDose: '4 drops BD', warning: 'For otitis externa/media with perforation. 7 day course.' },
    { name: 'Neomycin-Hydrocortisone Ear Drops', doses: ['0.5%/1%'], routes: ['otic'], maxDailyDose: '3 drops TDS-QID', warning: 'Not if tympanic membrane perforated (ototoxicity).' },
    { name: 'Acetic Acid Ear Drops', doses: ['2%'], routes: ['otic'], maxDailyDose: '3-4 drops TDS', warning: 'For otitis externa. Acidifies canal.' },
  ],
  topical: [
    { name: 'Silver Sulfadiazine Cream', doses: ['1%'], routes: ['topical'], maxDailyDose: 'Apply 1-2x daily', warning: 'For burns. May delay wound healing. Avoid near eyes.' },
    { name: 'Fusidic Acid Cream', doses: ['2%'], routes: ['topical'], maxDailyDose: 'Apply TDS', warning: 'For impetigo, minor infections. Limit use to 2 weeks (resistance).' },
    { name: 'Mupirocin Ointment', doses: ['2%'], routes: ['topical'], maxDailyDose: 'Apply TDS', warning: 'For MRSA, impetigo. Max 10 days.' },
    { name: 'Betamethasone Cream', doses: ['0.025%', '0.1%'], routes: ['topical'], maxDailyDose: 'Apply BD', warning: 'Potent steroid. Skin atrophy with prolonged use. Avoid face.' },
    { name: 'Hydrocortisone Cream', doses: ['0.5%', '1%'], routes: ['topical'], maxDailyDose: 'Apply BD', warning: 'Mild steroid. Safe for face, short-term.' },
    { name: 'Clotrimazole Cream', doses: ['1%'], routes: ['topical'], maxDailyDose: 'Apply BD-TDS', warning: 'For fungal skin infections. 2-4 week course.' },
    { name: 'Povidone-Iodine', doses: ['7.5%', '10%'], routes: ['topical'], maxDailyDose: 'As needed', warning: 'Antiseptic. May delay wound healing. Thyroid effects if large area.' },
    { name: 'Hydrogen Peroxide', doses: ['3%', '6%'], routes: ['topical'], maxDailyDose: 'As needed', warning: 'For wound cleaning. Do not use in deep wounds or inject.' },
  ],
  anaesthetics: [
    { name: 'Lidocaine', doses: ['0.5%', '1%', '2%'], routes: ['topical', 'subcutaneous', 'intravenous'], maxDailyDose: '4.5mg/kg without adrenaline, 7mg/kg with', warning: 'CNS and cardiac toxicity in overdose. Intralipid for toxicity.' },
    { name: 'Lidocaine with Adrenaline', doses: ['1%+1:200000', '2%+1:200000'], routes: ['subcutaneous'], maxDailyDose: '7mg/kg lidocaine', warning: 'Avoid in end-arteries (fingers, toes, penis, nose, ears).' },
    { name: 'Bupivacaine', doses: ['0.25%', '0.5%'], routes: ['subcutaneous', 'epidural', 'spinal'], maxDailyDose: '2mg/kg', warning: 'Long-acting. Cardiotoxic in overdose. Not for IV regional.' },
    { name: 'Ketamine', doses: ['0.5mg/kg', '1mg/kg', '2mg/kg'], routes: ['intravenous', 'intramuscular'], maxDailyDose: 'Titrate to effect', warning: 'Dissociative. Emergence phenomena. Increased secretions.' },
    { name: 'Propofol', doses: ['1-2.5mg/kg', '1%', '2%'], routes: ['intravenous'], maxDailyDose: 'Titrate to effect', warning: 'Respiratory depression. Hypotension. Egg/soy allergy.' },
  ],
  muscle_relaxants: [
    { name: 'Baclofen', doses: ['5mg', '10mg', '25mg'], routes: ['oral'], maxDailyDose: '80mg/day', warning: 'For spasticity. Drowsiness. Withdrawal seizures if stopped abruptly.' },
    { name: 'Tizanidine', doses: ['2mg', '4mg', '6mg'], routes: ['oral'], maxDailyDose: '36mg/day', warning: 'Sedation, hypotension. Hepatotoxicity. Start low.' },
    { name: 'Cyclobenzaprine', doses: ['5mg', '10mg'], routes: ['oral'], maxDailyDose: '30mg/day', warning: 'For acute muscle spasm. Anticholinergic. Short-term use only.' },
    { name: 'Suxamethonium', doses: ['1-1.5mg/kg'], routes: ['intravenous'], maxDailyDose: 'Single bolus', warning: 'Depolarizing blocker. Hyperkalemia, malignant hyperthermia risk. For RSI.' },
    { name: 'Rocuronium', doses: ['0.6-1.2mg/kg'], routes: ['intravenous'], maxDailyDose: 'Per anesthesia', warning: 'Non-depolarizing. Sugammadex reverses. For intubation.' },
    { name: 'Atracurium', doses: ['0.5mg/kg'], routes: ['intravenous'], maxDailyDose: 'Per anesthesia', warning: 'Non-depolarizing. Hofmann degradation. Histamine release.' },
  ],
  other: [],
};

// ============== INVESTIGATION TYPES ==============
const investigationTypes = [
  // Hematology
  { value: 'full_blood_count', label: 'Full Blood Count (FBC)', category: 'hematology' },
  { value: 'esr', label: 'Erythrocyte Sedimentation Rate (ESR)', category: 'hematology' },
  { value: 'coagulation', label: 'Coagulation Profile (PT/INR/APTT)', category: 'hematology' },
  { value: 'd_dimer', label: 'D-Dimer', category: 'hematology' },
  { value: 'fibrinogen', label: 'Fibrinogen', category: 'hematology' },
  { value: 'blood_film', label: 'Peripheral Blood Film', category: 'hematology' },
  { value: 'reticulocyte', label: 'Reticulocyte Count', category: 'hematology' },
  { value: 'sickling_test', label: 'Sickling Test/Hb Electrophoresis', category: 'hematology' },
  { value: 'g6pd', label: 'G6PD Assay', category: 'hematology' },
  { value: 'crossmatch', label: 'Blood Grouping & Crossmatch', category: 'hematology' },
  // Biochemistry
  { value: 'electrolytes', label: 'Electrolytes, Urea & Creatinine (E/U/Cr)', category: 'biochemistry' },
  { value: 'liver_function', label: 'Liver Function Test (LFT)', category: 'biochemistry' },
  { value: 'renal_function', label: 'Renal Function Test (RFT)', category: 'biochemistry' },
  { value: 'blood_glucose_fasting', label: 'Fasting Blood Glucose (FBG)', category: 'biochemistry' },
  { value: 'blood_glucose_random', label: 'Random Blood Glucose (RBG)', category: 'biochemistry' },
  { value: 'blood_glucose_2hr', label: '2-Hour Postprandial Glucose', category: 'biochemistry' },
  { value: 'ogtt', label: 'Oral Glucose Tolerance Test (OGTT)', category: 'biochemistry' },
  { value: 'hba1c', label: 'HbA1c', category: 'biochemistry' },
  { value: 'lipid_profile', label: 'Lipid Profile', category: 'biochemistry' },
  { value: 'serum_amylase', label: 'Serum Amylase', category: 'biochemistry' },
  { value: 'serum_lipase', label: 'Serum Lipase', category: 'biochemistry' },
  { value: 'thyroid_function', label: 'Thyroid Function Test (TFT)', category: 'biochemistry' },
  { value: 'serum_calcium', label: 'Serum Calcium (Total & Ionized)', category: 'biochemistry' },
  { value: 'serum_phosphate', label: 'Serum Phosphate', category: 'biochemistry' },
  { value: 'serum_magnesium', label: 'Serum Magnesium', category: 'biochemistry' },
  { value: 'serum_uric_acid', label: 'Serum Uric Acid', category: 'biochemistry' },
  { value: 'serum_protein', label: 'Total Protein & Albumin', category: 'biochemistry' },
  { value: 'cardiac_enzymes', label: 'Cardiac Enzymes (Troponin, CK-MB)', category: 'biochemistry' },
  { value: 'bnp', label: 'BNP/NT-proBNP', category: 'biochemistry' },
  { value: 'crp', label: 'C-Reactive Protein (CRP)', category: 'biochemistry' },
  { value: 'procalcitonin', label: 'Procalcitonin', category: 'biochemistry' },
  { value: 'lactate', label: 'Serum Lactate', category: 'biochemistry' },
  { value: 'arterial_blood_gas', label: 'Arterial Blood Gas (ABG)', category: 'biochemistry' },
  { value: 'venous_blood_gas', label: 'Venous Blood Gas', category: 'biochemistry' },
  { value: 'serum_iron', label: 'Serum Iron & TIBC', category: 'biochemistry' },
  { value: 'ferritin', label: 'Serum Ferritin', category: 'biochemistry' },
  { value: 'b12_folate', label: 'Vitamin B12 & Folate', category: 'biochemistry' },
  { value: 'vitamin_d', label: '25-Hydroxy Vitamin D', category: 'biochemistry' },
  { value: 'psa', label: 'Prostate Specific Antigen (PSA)', category: 'biochemistry' },
  { value: 'tumor_markers', label: 'Tumor Markers (CEA, AFP, CA-125, etc.)', category: 'biochemistry' },
  // Urinalysis
  { value: 'urinalysis', label: 'Urinalysis (Dipstick)', category: 'urinalysis' },
  { value: 'urine_mcs', label: 'Urine Microscopy, Culture & Sensitivity', category: 'urinalysis' },
  { value: 'urine_protein_creatinine', label: 'Urine Protein:Creatinine Ratio', category: 'urinalysis' },
  { value: 'urine_albumin_creatinine', label: 'Urine Albumin:Creatinine Ratio', category: 'urinalysis' },
  { value: '24hr_urine_protein', label: '24-Hour Urine Protein', category: 'urinalysis' },
  { value: '24hr_urine_creatinine', label: '24-Hour Urine Creatinine Clearance', category: 'urinalysis' },
  { value: 'pregnancy_test', label: 'Urine Pregnancy Test', category: 'urinalysis' },
  // Microbiology
  { value: 'blood_culture', label: 'Blood Culture & Sensitivity', category: 'microbiology' },
  { value: 'wound_swab', label: 'Wound Swab M/C/S', category: 'microbiology' },
  { value: 'sputum_mcs', label: 'Sputum M/C/S', category: 'microbiology' },
  { value: 'stool_mcs', label: 'Stool M/C/S', category: 'microbiology' },
  { value: 'stool_occult_blood', label: 'Stool Occult Blood', category: 'microbiology' },
  { value: 'csf_analysis', label: 'CSF Analysis', category: 'microbiology' },
  { value: 'ascitic_fluid', label: 'Ascitic Fluid Analysis', category: 'microbiology' },
  { value: 'pleural_fluid', label: 'Pleural Fluid Analysis', category: 'microbiology' },
  { value: 'joint_fluid', label: 'Synovial Fluid Analysis', category: 'microbiology' },
  { value: 'throat_swab', label: 'Throat Swab M/C/S', category: 'microbiology' },
  { value: 'nasal_swab', label: 'Nasal Swab', category: 'microbiology' },
  { value: 'genital_swab', label: 'High Vaginal/Urethral Swab M/C/S', category: 'microbiology' },
  { value: 'afb_smear', label: 'AFB Smear (ZN Stain)', category: 'microbiology' },
  { value: 'genexpert', label: 'GeneXpert MTB/RIF', category: 'microbiology' },
  { value: 'tb_culture', label: 'TB Culture', category: 'microbiology' },
  { value: 'malaria_parasite', label: 'Malaria Parasite (MP)', category: 'microbiology' },
  { value: 'malaria_rdt', label: 'Malaria RDT', category: 'microbiology' },
  // Serology
  { value: 'hiv_screening', label: 'HIV 1 & 2 Screening', category: 'serology' },
  { value: 'hbsag', label: 'Hepatitis B Surface Antigen (HBsAg)', category: 'serology' },
  { value: 'anti_hcv', label: 'Hepatitis C Antibody (Anti-HCV)', category: 'serology' },
  { value: 'hep_b_panel', label: 'Hepatitis B Panel', category: 'serology' },
  { value: 'vdrl', label: 'VDRL/RPR', category: 'serology' },
  { value: 'widal', label: 'Widal Test', category: 'serology' },
  { value: 'rheumatoid_factor', label: 'Rheumatoid Factor', category: 'serology' },
  { value: 'ana', label: 'Antinuclear Antibody (ANA)', category: 'serology' },
  { value: 'anca', label: 'ANCA', category: 'serology' },
  { value: 'anti_ccp', label: 'Anti-CCP Antibody', category: 'serology' },
  { value: 'aso_titre', label: 'ASO Titre', category: 'serology' },
  // Imaging
  { value: 'xray_chest', label: 'Chest X-Ray (CXR)', category: 'imaging' },
  { value: 'xray_abdomen', label: 'Abdominal X-Ray', category: 'imaging' },
  { value: 'xray_spine', label: 'Spine X-Ray', category: 'imaging' },
  { value: 'xray_limb', label: 'Limb X-Ray', category: 'imaging' },
  { value: 'xray_pelvis', label: 'Pelvic X-Ray', category: 'imaging' },
  { value: 'xray_skull', label: 'Skull X-Ray', category: 'imaging' },
  { value: 'ultrasound_abdomen', label: 'Abdominal Ultrasound', category: 'imaging' },
  { value: 'ultrasound_pelvis', label: 'Pelvic Ultrasound', category: 'imaging' },
  { value: 'ultrasound_kidney', label: 'Renal Ultrasound', category: 'imaging' },
  { value: 'ultrasound_thyroid', label: 'Thyroid Ultrasound', category: 'imaging' },
  { value: 'ultrasound_doppler', label: 'Doppler Ultrasound', category: 'imaging' },
  { value: 'ct_head', label: 'CT Scan Head', category: 'imaging' },
  { value: 'ct_chest', label: 'CT Scan Chest', category: 'imaging' },
  { value: 'ct_abdomen', label: 'CT Scan Abdomen/Pelvis', category: 'imaging' },
  { value: 'ct_angiography', label: 'CT Angiography', category: 'imaging' },
  { value: 'mri_brain', label: 'MRI Brain', category: 'imaging' },
  { value: 'mri_spine', label: 'MRI Spine', category: 'imaging' },
  { value: 'mri_limb', label: 'MRI Limb', category: 'imaging' },
  { value: 'mammography', label: 'Mammography', category: 'imaging' },
  // Cardiology
  { value: 'ecg', label: 'ECG (12-Lead)', category: 'cardiology' },
  { value: 'echocardiogram', label: 'Echocardiogram (2D Echo)', category: 'cardiology' },
  { value: 'stress_test', label: 'Exercise Stress Test', category: 'cardiology' },
  { value: 'holter', label: 'Holter Monitor (24-48hr)', category: 'cardiology' },
  { value: 'ambulatory_bp', label: 'Ambulatory BP Monitor (24hr)', category: 'cardiology' },
  // Pulmonology
  { value: 'spirometry', label: 'Spirometry/PFT', category: 'pulmonology' },
  { value: 'peak_flow', label: 'Peak Expiratory Flow Rate', category: 'pulmonology' },
  // GI/Endoscopy
  { value: 'upper_gi_endoscopy', label: 'Upper GI Endoscopy (OGD)', category: 'gi' },
  { value: 'colonoscopy', label: 'Colonoscopy', category: 'gi' },
  { value: 'sigmoidoscopy', label: 'Sigmoidoscopy', category: 'gi' },
  { value: 'ercp', label: 'ERCP', category: 'gi' },
  // Histopathology
  { value: 'biopsy', label: 'Tissue Biopsy/Histopathology', category: 'histopathology' },
  { value: 'fnac', label: 'Fine Needle Aspiration Cytology (FNAC)', category: 'histopathology' },
  { value: 'pap_smear', label: 'Pap Smear', category: 'histopathology' },
  // Other
  { value: 'nerve_conduction', label: 'Nerve Conduction Studies/EMG', category: 'other' },
  { value: 'eeg', label: 'EEG', category: 'other' },
  { value: 'bone_densitometry', label: 'Bone Densitometry (DEXA)', category: 'other' },
];

// Investigation Frequency Options
const investigationFrequencyOptions = [
  { value: 'once', label: 'Once only' },
  { value: 'daily', label: 'Daily' },
  { value: 'bd', label: 'Twice daily' },
  { value: 'alternate_days', label: 'Alternate days' },
  { value: 'twice_weekly', label: 'Twice weekly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'prn', label: 'As needed/PRN' },
  { value: 'pre_op', label: 'Pre-operatively' },
  { value: 'post_op', label: 'Post-operatively' },
  { value: 'serial', label: 'Serial (specify in details)' },
];

// ============== PROCEDURE TYPES WITH PRE-PROCEDURE CHECKLISTS ==============
interface ProcedureType {
  value: string;
  label: string;
  category: string;
  preProcedureChecklist: string[];
  planningRequirements: string[];
}

const procedureTypes: ProcedureType[] = [
  { 
    value: 'wound_debridement', 
    label: 'Wound Debridement',
    category: 'wound_care',
    preProcedureChecklist: [
      'Informed consent obtained',
      'Coagulation profile checked (PT/INR/APTT)',
      'FBC checked (Hb, platelet count)',
      'Wound assessment documented',
      'Analgesia/sedation arranged',
      'Sterile dressing pack available',
      'Surgical instruments prepared',
      'Antibiotics administered if indicated',
    ],
    planningRequirements: [
      'Assess wound size, depth, and tissue involvement',
      'Identify necrotic tissue extent',
      'Plan anesthesia type (local/regional/general)',
      'Arrange post-procedure dressing materials',
      'Schedule follow-up wound assessment',
    ],
  },
  { 
    value: 'wound_dressing', 
    label: 'Wound Dressing Change',
    category: 'wound_care',
    preProcedureChecklist: [
      'Hand hygiene performed',
      'Sterile dressing pack available',
      'Appropriate dressing materials selected',
      'Analgesia given if needed (30 min prior)',
      'Patient positioned comfortably',
      'Previous dressing condition noted',
    ],
    planningRequirements: [
      'Review wound type and healing stage',
      'Select appropriate dressing type',
      'Assess need for wound culture if infected',
      'Document wound measurements',
    ],
  },
  { 
    value: 'abscess_drainage', 
    label: 'Abscess Incision & Drainage',
    category: 'minor_surgery',
    preProcedureChecklist: [
      'Informed consent obtained',
      'Abscess size and fluctuance confirmed',
      'Coagulation profile checked if on anticoagulants',
      'Local anesthetic drawn up',
      'Sterile I&D pack prepared',
      'Culture swab ready for specimen',
      'Packing material available (if needed)',
      'Post-procedure antibiotics prescribed if indicated',
    ],
    planningRequirements: [
      'Confirm abscess maturity (fluctuance)',
      'Plan incision site (avoid neurovascular structures)',
      'Decide on packing vs primary closure',
      'Arrange follow-up for wound check',
    ],
  },
  { 
    value: 'suturing', 
    label: 'Suturing/Wound Closure',
    category: 'minor_surgery',
    preProcedureChecklist: [
      'Wound cleaned and irrigated',
      'Tetanus status verified (TT given if needed)',
      'Local anesthetic administered',
      'Suture material selected (appropriate type and size)',
      'Sterile suture pack available',
      'Wound edges viable for closure',
      'Foreign bodies excluded (X-ray if needed)',
    ],
    planningRequirements: [
      'Assess wound depth and tissue layers',
      'Check for tendon, nerve, vessel injury',
      'Select suture technique (simple, mattress, subcuticular)',
      'Plan suture removal date',
    ],
  },
  { 
    value: 'catheterization', 
    label: 'Urinary Catheterization',
    category: 'urological',
    preProcedureChecklist: [
      'Indication documented',
      'Allergy to latex checked',
      'Appropriate catheter size selected',
      'Sterile catheterization pack available',
      'Urine drainage bag attached',
      'Consent obtained (or emergency indication)',
      'Sterile gloves and antiseptic ready',
    ],
    planningRequirements: [
      'Determine catheter type (Foley, 3-way, suprapubic)',
      'Select appropriate French size',
      'Plan for catheter care and monitoring',
      'Document trial of void if applicable',
    ],
  },
  { 
    value: 'ng_tube', 
    label: 'NG Tube Insertion',
    category: 'gi_procedures',
    preProcedureChecklist: [
      'Indication documented (decompression, feeding, medication)',
      'Patient in upright or semi-recumbent position',
      'NG tube size selected appropriately',
      'Lubricant and tape available',
      'Cup of water with straw ready (if conscious)',
      'Auscultation planned for confirmation',
      'X-ray ordered for feeding tube confirmation',
    ],
    planningRequirements: [
      'Measure NEX length (nose-ear-xiphoid)',
      'Check for contraindications (basal skull fracture, esophageal varices)',
      'Plan tube use (aspiration, feeding, medication)',
      'Arrange X-ray confirmation if for feeding',
    ],
  },
  { 
    value: 'central_line', 
    label: 'Central Line Insertion',
    category: 'vascular_access',
    preProcedureChecklist: [
      'Informed consent obtained',
      'Coagulation profile checked (INR <1.5, platelets >50)',
      'Sterile CVC insertion kit available',
      'Ultrasound machine available for guidance',
      'Sterile gown, gloves, full draping',
      'Chlorhexidine skin prep ready',
      'Post-procedure CXR ordered',
      'Patient positioned (Trendelenburg for IJ/subclavian)',
    ],
    planningRequirements: [
      'Select insertion site (IJ, subclavian, femoral)',
      'Verify no local infection at insertion site',
      'Review anatomy and identify landmarks',
      'Prepare for possible complications',
      'Arrange post-insertion CXR for line position',
    ],
  },
  { 
    value: 'iv_cannulation', 
    label: 'IV Cannulation',
    category: 'vascular_access',
    preProcedureChecklist: [
      'Cannula size selected (18-22G typical)',
      'Tourniquet and swabs ready',
      'IV extension and flush prepared',
      'Tegaderm/securing tape available',
      'Sharps container nearby',
      'Vein identified and assessed',
    ],
    planningRequirements: [
      'Assess patient veins (fragile, difficult access)',
      'Consider ultrasound guidance if difficult',
      'Select appropriate gauge for intended use',
    ],
  },
  { 
    value: 'blood_transfusion', 
    label: 'Blood Transfusion',
    category: 'transfusion',
    preProcedureChecklist: [
      'Informed consent obtained',
      'Blood group and crossmatch verified',
      'Pre-transfusion vital signs recorded',
      'Blood product verified by 2 staff at bedside',
      'Patient ID band checked against blood bag',
      'IV access patent with adequate gauge (18G preferred)',
      'Transfusion reaction medications available',
      'Blood warmer set up if needed',
    ],
    planningRequirements: [
      'Document indication for transfusion',
      'Order pre-transfusion FBC if not recent',
      'Calculate volume needed based on Hb/clinical status',
      'Plan transfusion rate (usually 2-4 hours per unit)',
      'Schedule post-transfusion Hb check',
    ],
  },
  { 
    value: 'skin_graft', 
    label: 'Skin Grafting',
    category: 'plastic_surgery',
    preProcedureChecklist: [
      'Informed consent obtained',
      'Wound bed prepared (granulating, clean)',
      'Pre-operative FBC, coagulation checked',
      'Blood typed and crossmatched',
      'Donor site identified and marked',
      'Dermatome/graft harvesting equipment ready',
      'Antibiotics administered',
      'Anesthesia team informed',
      'Post-op bed with appropriate dressings arranged',
    ],
    planningRequirements: [
      'Assess recipient site readiness (granulation, no infection)',
      'Calculate graft size needed',
      'Plan graft type (split-thickness, full-thickness)',
      'Identify donor site (thigh, arm)',
      'Arrange post-operative immobilization if needed',
    ],
  },
  { 
    value: 'amputation', 
    label: 'Amputation',
    category: 'major_surgery',
    preProcedureChecklist: [
      'Informed consent obtained (include prosthesis discussion)',
      'Amputation level marked and verified',
      'Cross-matched blood available',
      'Pre-operative antibiotics given',
      'DVT prophylaxis considered',
      'Anesthesia clearance obtained',
      'Surgical team and instruments ready',
      'Pathology specimen container ready',
      'Post-op physiotherapy referral made',
      'Psychiatric/counseling support arranged',
    ],
    planningRequirements: [
      'Determine amputation level based on vascular assessment',
      'Review angiography/Doppler findings',
      'Consult prosthetics team',
      'Plan stump care and rehabilitation',
      'Address phantom limb pain management',
    ],
  },
  { 
    value: 'escharotomy', 
    label: 'Escharotomy',
    category: 'burns',
    preProcedureChecklist: [
      'Circumferential burn with compromised circulation confirmed',
      'Pulses/capillary refill documented pre-procedure',
      'Informed consent (or emergency procedure)',
      'Sterile escharotomy tray prepared',
      'Cautery/electrosurgery available',
      'Analgesia/sedation administered',
      'Sterile dressings ready for post-procedure',
    ],
    planningRequirements: [
      'Identify areas of circumferential eschar',
      'Mark incision lines (avoid major vessels/nerves)',
      'Prepare for thoracic escharotomy if chest burns',
      'Monitor compartment pressures',
    ],
  },
  { 
    value: 'fasciotomy', 
    label: 'Fasciotomy',
    category: 'emergency_surgery',
    preProcedureChecklist: [
      'Compartment syndrome diagnosed/highly suspected',
      'Compartment pressures measured if available',
      'Consent obtained (emergency procedure if needed)',
      'Blood available (may have bleeding)',
      'Sterile fasciotomy set prepared',
      'Anesthesia ready (GA usually)',
      'Post-op wound care/VAC therapy considered',
    ],
    planningRequirements: [
      'Identify affected compartments (all 4 in leg)',
      'Plan incision approach (two-incision for leg)',
      'Prepare for delayed closure or skin grafting',
      'ICU bed if needed for monitoring',
    ],
  },
  { 
    value: 'npwt', 
    label: 'NPWT Application',
    category: 'wound_care',
    preProcedureChecklist: [
      'Wound bed clean (no active infection, exposed vessels)',
      'Wound measurements documented',
      'NPWT machine and canisters available',
      'Foam/gauze dressing cut to wound size',
      'Transparent adhesive drape available',
      'Patient educated on device management',
      'Analgesia given prior to application',
    ],
    planningRequirements: [
      'Confirm no contraindications (malignancy, fistula to organs)',
      'Select appropriate pressure setting',
      'Plan dressing change schedule (every 48-72 hours)',
      'Arrange sufficient supplies for duration',
    ],
  },
  { 
    value: 'physiotherapy', 
    label: 'Physiotherapy Session',
    category: 'rehabilitation',
    preProcedureChecklist: [
      'Patient stable for mobilization',
      'Weight-bearing status clarified',
      'Pain adequately controlled',
      'Walking aids available if needed',
      'Physiotherapist referral completed',
      'Precautions documented (fall risk, etc.)',
    ],
    planningRequirements: [
      'Define physiotherapy goals',
      'Identify mobility restrictions',
      'Plan progression of exercises',
      'Schedule regular sessions',
    ],
  },
  { 
    value: 'lumbar_puncture', 
    label: 'Lumbar Puncture',
    category: 'neurology',
    preProcedureChecklist: [
      'Informed consent obtained',
      'Coagulation profile checked (INR <1.5, platelets >50)',
      'CT head done if raised ICP suspected',
      'Sterile LP kit prepared',
      'Patient positioned (lateral decubitus or sitting)',
      'CSF specimen bottles ready (protein, glucose, cell count, culture)',
      'Opening pressure manometer available',
    ],
    planningRequirements: [
      'Review indication (meningitis, SAH, MS, etc.)',
      'Exclude raised ICP (no papilledema, CT if needed)',
      'Plan tests needed on CSF',
      'Arrange post-LP bed rest and monitoring',
    ],
  },
  { 
    value: 'chest_drain', 
    label: 'Chest Drain Insertion',
    category: 'thoracic',
    preProcedureChecklist: [
      'Informed consent obtained',
      'CXR/CT confirms indication (pneumothorax, effusion)',
      'Coagulation checked',
      'Chest drain kit and underwater seal prepared',
      'Sterile gown and draping',
      'Local anesthetic drawn up',
      'Insertion site marked (safe triangle)',
      'Post-procedure CXR ordered',
    ],
    planningRequirements: [
      'Determine drain size based on indication',
      'Identify safe triangle for insertion',
      'Plan drain management (suction, swing, drain)',
      'Arrange follow-up imaging',
    ],
  },
  { 
    value: 'paracentesis', 
    label: 'Abdominal Paracentesis',
    category: 'gi_procedures',
    preProcedureChecklist: [
      'Informed consent obtained',
      'Ultrasound-guided site marked',
      'Coagulation profile checked',
      'Sterile paracentesis kit ready',
      'Specimen bottles prepared (cell count, protein, culture)',
      'Albumin available if large volume planned',
      'Drainage bag attached',
    ],
    planningRequirements: [
      'Determine diagnostic vs therapeutic',
      'Plan albumin replacement if >5L removed',
      'Monitor for post-procedure complications',
    ],
  },
  { 
    value: 'thoracentesis', 
    label: 'Thoracentesis',
    category: 'thoracic',
    preProcedureChecklist: [
      'Informed consent obtained',
      'CXR/ultrasound confirms effusion',
      'Site marked with ultrasound guidance',
      'Sterile thoracentesis kit ready',
      'Specimen bottles prepared (protein, LDH, cell count, culture)',
      'Patient positioned (sitting, leaning forward)',
      'Post-procedure CXR planned',
    ],
    planningRequirements: [
      'Determine diagnostic vs therapeutic',
      'Apply Light criteria for exudate/transudate',
      'Limit to 1-1.5L per session (re-expansion pulmonary edema)',
    ],
  },
  { 
    value: 'other', 
    label: 'Other Procedure',
    category: 'other',
    preProcedureChecklist: [
      'Procedure-specific consent obtained',
      'Required equipment prepared',
      'Staff assigned and briefed',
      'Patient prepared and positioned',
    ],
    planningRequirements: [
      'Document procedure details',
      'Identify specific requirements',
    ],
  },
];

const routeOptions: { value: MedicationRoute; label: string }[] = [
  { value: 'oral', label: 'Oral (PO)' },
  { value: 'intravenous', label: 'Intravenous (IV)' },
  { value: 'intramuscular', label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous (SC)' },
  { value: 'topical', label: 'Topical' },
  { value: 'rectal', label: 'Rectal (PR)' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'sublingual', label: 'Sublingual (SL)' },
  { value: 'ophthalmic', label: 'Ophthalmic' },
  { value: 'otic', label: 'Otic (Ear)' },
  { value: 'nasal', label: 'Nasal' },
  { value: 'transdermal', label: 'Transdermal (Patch)' },
  { value: 'epidural', label: 'Epidural' },
  { value: 'spinal', label: 'Spinal/Intrathecal' },
  { value: 'intrathecal', label: 'Intrathecal (IT)' },
  { value: 'nebulizer', label: 'Nebulizer' },
  { value: 'vaginal', label: 'Vaginal (PV)' },
  { value: 'buccal', label: 'Buccal' },
  { value: 'intradermal', label: 'Intradermal (ID)' },
  { value: 'intranasal', label: 'Intranasal' },
  { value: 'intravesical', label: 'Intravesical (Bladder)' },
  { value: 'intraarticular', label: 'Intraarticular (Joint)' },
];

const frequencyOptions = [
  'Once daily', 'Twice daily', 'Three times daily', 'Four times daily',
  'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'Every 12 hours',
  'Once only', 'As needed (PRN)', 'Before meals', 'After meals',
  'At bedtime', 'Weekly', 'Alternate days',
];

const priorityOptions = [
  { value: 'routine', label: 'Routine', color: 'bg-gray-100 text-gray-700' },
  { value: 'urgent', label: 'Urgent', color: 'bg-amber-100 text-amber-700' },
  { value: 'stat', label: 'STAT', color: 'bg-red-100 text-red-700' },
];

// ============== SCHEMAS ==============
const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name required'),
  category: z.string().min(1, 'Category required'),
  dosage: z.string().min(1, 'Dosage required'),
  frequency: z.string().min(1, 'Frequency required'),
  route: z.string().min(1, 'Route required'),
  duration: z.string().min(1, 'Duration required'),
  quantity: z.number().min(1, 'Quantity required'),
  instructions: z.string().optional(),
});

const investigationSchema = z.object({
  type: z.string().min(1, 'Investigation type required'),
  priority: z.string().min(1, 'Priority required'),
  frequency: z.string().min(1, 'Frequency required'),
  clinicalDetails: z.string().optional(),
  fasting: z.boolean().optional(),
});

const procedureSchema = z.object({
  type: z.string().min(1, 'Procedure type required'),
  description: z.string().optional(),
  scheduledDate: z.string().min(1, 'Scheduled date required'),
  scheduledTime: z.string().optional(),
  priority: z.string().min(1, 'Priority required'),
  notes: z.string().optional(),
  assignedTo: z.string().optional(),
  checklistCompleted: z.array(z.string()).optional(),
});

const implementationLogSchema = z.object({
  actionType: z.string().min(1, 'Action type required'),
  details: z.string().min(3, 'Details required'),
  notes: z.string().optional(),
});

type MedicationFormData = z.infer<typeof medicationSchema>;
type InvestigationFormData = z.infer<typeof investigationSchema>;
type ProcedureFormData = z.infer<typeof procedureSchema>;
type ImplementationLogFormData = z.infer<typeof implementationLogSchema>;

// ============== INTERFACES ==============
interface TreatmentPlanProcedure {
  id: string;
  type: string;
  typeName: string;
  category?: string;
  description?: string;
  scheduledDate: Date;
  scheduledTime?: string;
  priority: 'routine' | 'urgent' | 'stat';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  completedAt?: Date;
  completedBy?: string;
  completedByName?: string;
  createdAt: Date;
  preProcedureChecklist: { item: string; completed: boolean; completedBy?: string; completedAt?: Date }[];
  planningRequirements: string[];
  notificationsSent?: { userId: string; sentAt: Date }[];
}

interface ImplementationLog {
  id: string;
  treatmentPlanId: string;
  actionType: 'medication_administered' | 'investigation_collected' | 'procedure_performed' | 'dressing_changed' | 'vitals_recorded' | 'other';
  actionTypeName: string;
  details: string;
  notes?: string;
  performedBy: string;
  performedByName: string;
  performedAt: Date;
  linkedItemId?: string; // ID of prescription, investigation, or procedure
}

// Extended Treatment Plan with additional fields
interface ExtendedTreatmentPlan extends TreatmentPlan {
  linkedPrescriptionIds?: string[];
  linkedInvestigationIds?: string[];
  procedures?: TreatmentPlanProcedure[];
  implementationLogs?: ImplementationLog[];
}

// ============== COMPONENT ==============
export default function EnhancedTreatmentPlanCard({
  patientId,
  admissionId,
  relatedEntityId,
  relatedEntityType = 'general',
  clinicianId,
  clinicianName,
  hospitalId,
}: EnhancedTreatmentPlanCardProps) {
  // Modal states
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'investigations' | 'procedures' | 'tracking'>('overview');
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showInvestigationModal, setShowInvestigationModal] = useState(false);
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<string[]>([]);
  
  // Medication form state
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedMedication, setSelectedMedication] = useState<MedicationInfo | null>(null);
  const [medications, setMedications] = useState<MedicationFormData[]>([]);
  
  // Procedure form state
  const [selectedProcedureType, setSelectedProcedureType] = useState<ProcedureType | null>(null);
  const [procedureChecklist, setProcedureChecklist] = useState<{ item: string; completed: boolean }[]>([]);

  // Fetch treatment plans
  const treatmentPlans = useLiveQuery(
    () => {
      if (admissionId) {
        return db.treatmentPlans
          .where('relatedEntityId')
          .equals(admissionId)
          .toArray();
      }
      if (relatedEntityId) {
        return db.treatmentPlans
          .where('relatedEntityId')
          .equals(relatedEntityId)
          .toArray();
      }
      return db.treatmentPlans
        .where('patientId')
        .equals(patientId)
        .toArray();
    },
    [patientId, admissionId, relatedEntityId]
  ) as ExtendedTreatmentPlan[] | undefined;

  // Fetch linked prescriptions
  const prescriptions = useLiveQuery(
    () => db.prescriptions.where('patientId').equals(patientId).toArray(),
    [patientId]
  );

  // Fetch linked investigations
  const investigations = useLiveQuery(
    () => db.investigations.where('patientId').equals(patientId).toArray(),
    [patientId]
  );

  // Fetch users for assignment
  const users = useLiveQuery(() => db.users.toArray(), []);

  const userMap = useMemo(() => {
    const map = new Map<string, { firstName: string; lastName: string; role: string }>();
    users?.forEach(u => map.set(u.id, { firstName: u.firstName, lastName: u.lastName, role: u.role }));
    return map;
  }, [users]);

  // Forms
  const { register: registerMed, handleSubmit: handleSubmitMed, reset: resetMed, formState: { errors: medErrors }, setValue: setMedValue, watch: watchMed } = useForm<MedicationFormData>({
    resolver: zodResolver(medicationSchema),
    defaultValues: { quantity: 1 },
  });

  // Watch frequency and duration for auto-calculation
  const watchedFrequency = watchMed('frequency');
  const watchedDuration = watchMed('duration');

  // Helper function to get doses per day from frequency
  const getDosesPerDay = (frequency: string): number => {
    const freqLower = frequency?.toLowerCase() || '';
    if (freqLower.includes('once daily') || freqLower.includes('at bedtime') || freqLower.includes('weekly')) return 1;
    if (freqLower.includes('twice daily') || freqLower.includes('every 12 hours')) return 2;
    if (freqLower.includes('three times daily') || freqLower.includes('every 8 hours')) return 3;
    if (freqLower.includes('four times daily') || freqLower.includes('every 6 hours')) return 4;
    if (freqLower.includes('every 4 hours')) return 6;
    if (freqLower.includes('once only')) return 1;
    if (freqLower.includes('alternate days')) return 0.5;
    if (freqLower.includes('before meals') || freqLower.includes('after meals')) return 3;
    return 1; // Default
  };

  // Parse duration to get number of days
  const parseDurationToDays = (duration: string): number => {
    if (!duration) return 0;
    const match = duration.match(/(\d+)/);
    if (!match) return 0;
    const num = parseInt(match[1], 10);
    const durLower = duration.toLowerCase();
    if (durLower.includes('week')) return num * 7;
    if (durLower.includes('month')) return num * 30;
    return num; // Assume days by default
  };

  // Auto-calculate quantity when frequency or duration changes
  useEffect(() => {
    if (watchedFrequency && watchedDuration) {
      const dosesPerDay = getDosesPerDay(watchedFrequency);
      const days = parseDurationToDays(watchedDuration);
      if (dosesPerDay > 0 && days > 0) {
        const calculatedQuantity = Math.ceil(dosesPerDay * days);
        setMedValue('quantity', calculatedQuantity);
      }
    }
  }, [watchedFrequency, watchedDuration, setMedValue]);

  const { register: registerInv, handleSubmit: handleSubmitInv, reset: resetInv, formState: { errors: invErrors } } = useForm<InvestigationFormData>({
    resolver: zodResolver(investigationSchema),
    defaultValues: { priority: 'routine', fasting: false },
  });

  const { register: registerProc, handleSubmit: handleSubmitProc, reset: resetProc, formState: { errors: procErrors } } = useForm<ProcedureFormData>({
    resolver: zodResolver(procedureSchema),
    defaultValues: { priority: 'routine', scheduledDate: new Date().toISOString().split('T')[0] },
  });

  const { register: registerLog, handleSubmit: handleSubmitLog, reset: resetLog, formState: { errors: logErrors } } = useForm<ImplementationLogFormData>({
    resolver: zodResolver(implementationLogSchema),
  });

  // ============== HANDLERS ==============
  
  const addMedicationToList = (data: MedicationFormData) => {
    setMedications(prev => [...prev, data]);
    resetMed();
    setSelectedCategory('');
    setSelectedMedication(null);
    toast.success('Medication added to prescription');
  };

  const removeMedication = (index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index));
  };

  const submitPrescription = async () => {
    if (!selectedPlanId || medications.length === 0) {
      toast.error('Add at least one medication');
      return;
    }

    try {
      const prescription: Prescription = {
        id: uuidv4(),
        patientId,
        hospitalId,
        encounterId: admissionId,
        medications: medications.map(med => ({
          id: uuidv4(),
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route as MedicationRoute,
          duration: med.duration,
          quantity: med.quantity,
          instructions: med.instructions,
          isDispensed: false,
        })),
        status: 'pending',
        prescribedBy: clinicianId,
        prescribedAt: new Date(),
        notes: `Linked to Treatment Plan`,
      };

      await db.prescriptions.add(prescription);
      syncRecord('prescriptions', prescription as unknown as Record<string, unknown>);

      // Link to treatment plan
      const plan = await db.treatmentPlans.get(selectedPlanId) as ExtendedTreatmentPlan;
      if (plan) {
        const linkedPrescriptionIds = [...(plan.linkedPrescriptionIds || []), prescription.id];
        await db.treatmentPlans.update(selectedPlanId, { 
          linkedPrescriptionIds,
          updatedAt: new Date() 
        } as Partial<ExtendedTreatmentPlan>);
      }

      setMedications([]);
      setShowMedicationModal(false);
      toast.success('Prescription created successfully!');
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    }
  };

  const submitInvestigation = async (data: InvestigationFormData) => {
    if (!selectedPlanId) return;

    try {
      const invType = investigationTypes.find(t => t.value === data.type);
      const investigation: Investigation = {
        id: uuidv4(),
        patientId,
        hospitalId,
        admissionId,
        type: data.type,
        typeName: invType?.label || data.type,
        category: invType?.category as Investigation['category'] || 'other',
        priority: data.priority as 'routine' | 'urgent' | 'stat',
        status: 'requested',
        fasting: data.fasting,
        clinicalDetails: data.clinicalDetails,
        requestedBy: clinicianId,
        requestedByName: clinicianName,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.investigations.add(investigation);
      syncRecord('investigations', investigation as unknown as Record<string, unknown>);

      // Link to treatment plan
      const plan = await db.treatmentPlans.get(selectedPlanId) as ExtendedTreatmentPlan;
      if (plan) {
        const linkedInvestigationIds = [...(plan.linkedInvestigationIds || []), investigation.id];
        await db.treatmentPlans.update(selectedPlanId, { 
          linkedInvestigationIds,
          updatedAt: new Date() 
        } as Partial<ExtendedTreatmentPlan>);
      }

      resetInv();
      setShowInvestigationModal(false);
      toast.success('Investigation requested successfully!');
    } catch (error) {
      console.error('Error requesting investigation:', error);
      toast.error('Failed to request investigation');
    }
  };

  const submitProcedure = async (data: ProcedureFormData) => {
    if (!selectedPlanId) return;

    try {
      const procType = procedureTypes.find(t => t.value === data.type);
      const assignedUser = data.assignedTo ? userMap.get(data.assignedTo) : null;
      
      // Build checklist with completion status
      const checklistWithStatus = procedureChecklist.map(item => ({
        item: item.item,
        completed: item.completed,
        completedBy: item.completed ? clinicianId : undefined,
        completedAt: item.completed ? new Date() : undefined,
      }));

      const procedure: TreatmentPlanProcedure = {
        id: uuidv4(),
        type: data.type,
        typeName: procType?.label || data.type,
        category: procType?.category,
        description: data.description,
        scheduledDate: new Date(data.scheduledDate),
        scheduledTime: data.scheduledTime,
        priority: data.priority as 'routine' | 'urgent' | 'stat',
        status: 'scheduled',
        assignedTo: data.assignedTo,
        assignedToName: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : undefined,
        notes: data.notes,
        createdAt: new Date(),
        preProcedureChecklist: checklistWithStatus,
        planningRequirements: procType?.planningRequirements || [],
        notificationsSent: [],
      };

      const plan = await db.treatmentPlans.get(selectedPlanId) as ExtendedTreatmentPlan;
      if (plan) {
        const procedures = [...(plan.procedures || []), procedure];
        await db.treatmentPlans.update(selectedPlanId, { 
          procedures,
          updatedAt: new Date() 
        } as Partial<ExtendedTreatmentPlan>);
      }

      // Send notification to assigned staff
      if (data.assignedTo && assignedUser) {
        try {
          const notification = {
            id: uuidv4(),
            userId: data.assignedTo,
            type: 'procedure_assigned',
            title: `New Procedure Assigned: ${procedure.typeName}`,
            message: `You have been assigned to perform ${procedure.typeName} for patient. Scheduled: ${format(procedure.scheduledDate, 'PPP')}${procedure.scheduledTime ? ` at ${procedure.scheduledTime}` : ''}. Priority: ${data.priority.toUpperCase()}`,
            relatedEntityId: selectedPlanId,
            relatedEntityType: 'treatment_plan',
            isRead: false,
            createdAt: new Date(),
            hospitalId,
          };
          await db.table('notifications').add(notification);
          
          // Update procedure with notification sent
          procedure.notificationsSent = [{ userId: data.assignedTo, sentAt: new Date() }];
          
          toast.success(`Procedure scheduled! Notification sent to ${assignedUser.firstName} ${assignedUser.lastName}`);
        } catch (notifError) {
          console.error('Error sending notification:', notifError);
          toast.success('Procedure scheduled! (Notification could not be sent)');
        }
      } else {
        toast.success('Procedure scheduled successfully!');
      }

      resetProc();
      setShowProcedureModal(false);
      setSelectedProcedureType(null);
      setProcedureChecklist([]);
    } catch (error) {
      console.error('Error scheduling procedure:', error);
      toast.error('Failed to schedule procedure');
    }
  };

  const submitImplementationLog = async (data: ImplementationLogFormData) => {
    if (!selectedPlanId) return;

    try {
      const actionLabels: Record<string, string> = {
        medication_administered: 'Medication Administered',
        investigation_collected: 'Investigation Sample Collected',
        procedure_performed: 'Procedure Performed',
        dressing_changed: 'Dressing Changed',
        vitals_recorded: 'Vitals Recorded',
        other: 'Other Action',
      };

      const log: ImplementationLog = {
        id: uuidv4(),
        treatmentPlanId: selectedPlanId,
        actionType: data.actionType as ImplementationLog['actionType'],
        actionTypeName: actionLabels[data.actionType] || data.actionType,
        details: data.details,
        notes: data.notes,
        performedBy: clinicianId,
        performedByName: clinicianName,
        performedAt: new Date(),
      };

      const plan = await db.treatmentPlans.get(selectedPlanId) as ExtendedTreatmentPlan;
      if (plan) {
        const implementationLogs = [...(plan.implementationLogs || []), log];
        await db.treatmentPlans.update(selectedPlanId, { 
          implementationLogs,
          updatedAt: new Date() 
        } as Partial<ExtendedTreatmentPlan>);
      }

      resetLog();
      setShowLogModal(false);
      toast.success('Implementation logged successfully!');
    } catch (error) {
      console.error('Error logging implementation:', error);
      toast.error('Failed to log implementation');
    }
  };

  const markProcedureComplete = async (planId: string, procedureId: string) => {
    try {
      const plan = await db.treatmentPlans.get(planId) as ExtendedTreatmentPlan;
      if (!plan) return;

      const procedures = (plan.procedures || []).map(p => {
        if (p.id === procedureId) {
          return {
            ...p,
            status: 'completed' as const,
            completedAt: new Date(),
            completedBy: clinicianId,
            completedByName: clinicianName,
          };
        }
        return p;
      });

      await db.treatmentPlans.update(planId, { procedures, updatedAt: new Date() } as Partial<ExtendedTreatmentPlan>);
      toast.success('Procedure marked as complete');
    } catch (error) {
      console.error('Error updating procedure:', error);
      toast.error('Failed to update procedure');
    }
  };

  const togglePlanExpand = (planId: string) => {
    setExpandedPlans(prev =>
      prev.includes(planId)
        ? prev.filter(id => id !== planId)
        : [...prev, planId]
    );
  };

  // ============== CHART DATA ==============
  const getInvestigationTrendData = (investigationIds: string[]) => {
    if (!investigations) return [];

    const linkedInvs = investigations.filter(inv => investigationIds.includes(inv.id));
    const dataPoints: { date: string; [key: string]: string | number }[] = [];

    linkedInvs.forEach(inv => {
      if (inv.results && inv.results.length > 0) {
        inv.results.forEach(result => {
          const dateStr = format(new Date(inv.completedAt || inv.requestedAt), 'MMM d');
          const existing = dataPoints.find(dp => dp.date === dateStr);
          const numValue = typeof result.value === 'number' ? result.value : parseFloat(result.value);
          
          if (!isNaN(numValue)) {
            if (existing) {
              existing[result.parameter] = numValue;
            } else {
              dataPoints.push({ date: dateStr, [result.parameter]: numValue });
            }
          }
        });
      }
    });

    return dataPoints;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      completed: 'bg-blue-100 text-blue-700',
      on_hold: 'bg-amber-100 text-amber-700',
      discontinued: 'bg-red-100 text-red-700',
      pending: 'bg-gray-100 text-gray-700',
      dispensed: 'bg-green-100 text-green-700',
      requested: 'bg-blue-100 text-blue-700',
      processing: 'bg-amber-100 text-amber-700',
      scheduled: 'bg-purple-100 text-purple-700',
      in_progress: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </span>
    );
  };

  // ============== RENDER ==============
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <ClipboardList className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Treatment Plan Management</h2>
              <p className="text-sm text-gray-500">Prescriptions, Investigations, Procedures & Tracking</p>
            </div>
          </div>
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Treatment Plan
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          {[
            { id: 'overview', label: 'Overview', icon: ClipboardList },
            { id: 'medications', label: 'Medications', icon: Pill },
            { id: 'investigations', label: 'Investigations', icon: FlaskConical },
            { id: 'procedures', label: 'Procedures', icon: Scissors },
            { id: 'tracking', label: 'Implementation Tracking', icon: UserCheck },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {(!treatmentPlans || treatmentPlans.length === 0) && (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Treatment Plans</h3>
          <p className="text-gray-500 mb-4">Create a treatment plan to manage medications, investigations, and procedures.</p>
          <button
            onClick={() => setShowNewPlanModal(true)}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Create Treatment Plan
          </button>
        </div>
      )}

      {/* Treatment Plans */}
      {treatmentPlans && treatmentPlans.length > 0 && (
        <div className="space-y-4">
          {treatmentPlans.map(plan => {
            const extPlan = plan as ExtendedTreatmentPlan;
            const isExpanded = expandedPlans.includes(plan.id);
            const daysActive = differenceInDays(new Date(), new Date(plan.startDate));
            const linkedPrescriptions = prescriptions?.filter(p => extPlan.linkedPrescriptionIds?.includes(p.id)) || [];
            const linkedInvestigations = investigations?.filter(i => extPlan.linkedInvestigationIds?.includes(i.id)) || [];
            const procedures = extPlan.procedures || [];
            const logs = extPlan.implementationLogs || [];

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm border overflow-hidden"
              >
                {/* Plan Header */}
                <div
                  className="p-4 bg-gradient-to-r from-sky-50 to-white flex items-center justify-between cursor-pointer"
                  onClick={() => togglePlanExpand(plan.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-sky-100 rounded-lg">
                      {isExpanded ? <ChevronUp size={20} className="text-sky-600" /> : <ChevronDown size={20} className="text-sky-600" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{plan.title}</h3>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Started {format(new Date(plan.startDate), 'MMM d, yyyy')}
                        </span>
                        <span>•</span>
                        <span>{daysActive} days active</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Pill size={14} /> {linkedPrescriptions.length} Prescriptions
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <FlaskConical size={14} /> {linkedInvestigations.length} Investigations
                      </div>
                    </div>
                    {getStatusBadge(plan.status)}
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t"
                    >
                      <div className="p-4 space-y-6">
                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setShowMedicationModal(true);
                            }}
                            className="btn btn-secondary flex items-center gap-2 text-sm"
                          >
                            <Pill size={16} />
                            Add Prescription
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setShowInvestigationModal(true);
                            }}
                            className="btn btn-secondary flex items-center gap-2 text-sm"
                          >
                            <FlaskConical size={16} />
                            Request Investigation
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setShowProcedureModal(true);
                            }}
                            className="btn btn-secondary flex items-center gap-2 text-sm"
                          >
                            <Scissors size={16} />
                            Schedule Procedure
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPlanId(plan.id);
                              setShowLogModal(true);
                            }}
                            className="btn btn-secondary flex items-center gap-2 text-sm"
                          >
                            <UserCheck size={16} />
                            Log Implementation
                          </button>
                        </div>

                        {/* Overview Tab Content */}
                        {activeTab === 'overview' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-blue-700 mb-2">
                                <Pill size={18} />
                                <span className="font-medium">Prescriptions</span>
                              </div>
                              <p className="text-2xl font-bold text-blue-900">{linkedPrescriptions.length}</p>
                              <p className="text-sm text-blue-600">
                                {linkedPrescriptions.filter(p => p.status === 'dispensed').length} dispensed
                              </p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-purple-700 mb-2">
                                <FlaskConical size={18} />
                                <span className="font-medium">Investigations</span>
                              </div>
                              <p className="text-2xl font-bold text-purple-900">{linkedInvestigations.length}</p>
                              <p className="text-sm text-purple-600">
                                {linkedInvestigations.filter(i => i.status === 'completed').length} completed
                              </p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-amber-700 mb-2">
                                <Scissors size={18} />
                                <span className="font-medium">Procedures</span>
                              </div>
                              <p className="text-2xl font-bold text-amber-900">{procedures.length}</p>
                              <p className="text-sm text-amber-600">
                                {procedures.filter(p => p.status === 'completed').length} completed
                              </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-green-700 mb-2">
                                <UserCheck size={18} />
                                <span className="font-medium">Implementation Logs</span>
                              </div>
                              <p className="text-2xl font-bold text-green-900">{logs.length}</p>
                              <p className="text-sm text-green-600">Total entries</p>
                            </div>
                          </div>
                        )}

                        {/* Medications Tab */}
                        {activeTab === 'medications' && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Pill size={18} className="text-blue-600" />
                              Linked Prescriptions
                            </h4>
                            {linkedPrescriptions.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No prescriptions linked to this plan</p>
                            ) : (
                              <div className="space-y-3">
                                {linkedPrescriptions.map(rx => (
                                  <div key={rx.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <FileText size={16} className="text-gray-400" />
                                        <span className="text-sm text-gray-500">
                                          Prescribed {format(new Date(rx.prescribedAt), 'MMM d, yyyy h:mm a')}
                                        </span>
                                      </div>
                                      {getStatusBadge(rx.status)}
                                    </div>
                                    <div className="grid gap-2">
                                      {rx.medications.map((med, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                          <div>
                                            <p className="font-medium text-gray-900">{med.name}</p>
                                            <p className="text-sm text-gray-500">
                                              {med.dosage} • {med.frequency} • {med.route} • {med.duration}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-sm text-gray-500">Qty: {med.quantity}</p>
                                            {med.isDispensed && (
                                              <span className="text-xs text-green-600 flex items-center gap-1">
                                                <CheckCircle size={12} /> Dispensed
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Investigations Tab */}
                        {activeTab === 'investigations' && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <FlaskConical size={18} className="text-purple-600" />
                              Linked Investigations
                            </h4>
                            {linkedInvestigations.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No investigations linked to this plan</p>
                            ) : (
                              <>
                                {/* Investigation Trend Chart */}
                                {linkedInvestigations.some(i => i.results && i.results.length > 0) && (
                                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <h5 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                      <LineChart size={16} />
                                      Results Trend
                                    </h5>
                                    <ResponsiveContainer width="100%" height={200}>
                                      <RechartsLineChart data={getInvestigationTrendData(extPlan.linkedInvestigationIds || [])}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        {linkedInvestigations
                                          .flatMap(inv => inv.results || [])
                                          .filter((r, i, arr) => arr.findIndex(x => x.parameter === r.parameter) === i)
                                          .slice(0, 3)
                                          .map((result, idx) => (
                                            <Line
                                              key={result.parameter}
                                              type="monotone"
                                              dataKey={result.parameter}
                                              stroke={['#3b82f6', '#10b981', '#f59e0b'][idx % 3]}
                                              strokeWidth={2}
                                            />
                                          ))}
                                      </RechartsLineChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}

                                {/* Investigation List */}
                                <div className="space-y-3">
                                  {linkedInvestigations.map(inv => (
                                    <div key={inv.id} className="border rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="font-medium text-gray-900">{inv.typeName || inv.type}</p>
                                          <p className="text-sm text-gray-500">
                                            Requested {format(new Date(inv.requestedAt), 'MMM d, yyyy h:mm a')}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {getStatusBadge(inv.status)}
                                          {getStatusBadge(inv.priority)}
                                        </div>
                                      </div>
                                      
                                      {/* Results */}
                                      {inv.results && inv.results.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                          <p className="text-sm font-medium text-gray-700 mb-2">Results:</p>
                                          <div className="grid gap-2">
                                            {inv.results.map((result, idx) => (
                                              <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                                                <span className="text-sm text-gray-700">{result.parameter}</span>
                                                <div className="flex items-center gap-2">
                                                  <span className={`font-medium ${
                                                    result.status === 'high' || result.status === 'critical' ? 'text-red-600' :
                                                    result.status === 'low' ? 'text-amber-600' : 'text-green-600'
                                                  }`}>
                                                    {result.value} {result.unit}
                                                  </span>
                                                  {result.referenceRange && (
                                                    <span className="text-xs text-gray-400">({result.referenceRange})</span>
                                                  )}
                                                  {result.trend && (
                                                    result.trend === 'increasing' ? <TrendingUp size={14} className="text-red-500" /> :
                                                    result.trend === 'decreasing' ? <TrendingDown size={14} className="text-green-500" /> :
                                                    <Minus size={14} className="text-gray-400" />
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* Procedures Tab */}
                        {activeTab === 'procedures' && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <Scissors size={18} className="text-amber-600" />
                              Scheduled Procedures
                            </h4>
                            {procedures.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No procedures scheduled</p>
                            ) : (
                              <div className="space-y-3">
                                {procedures.map(proc => (
                                  <div key={proc.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div>
                                        <p className="font-medium text-gray-900">{proc.typeName}</p>
                                        <p className="text-sm text-gray-500">
                                          Scheduled: {format(new Date(proc.scheduledDate), 'MMM d, yyyy')}
                                          {proc.scheduledTime && ` at ${proc.scheduledTime}`}
                                        </p>
                                        {proc.assignedToName && (
                                          <p className="text-sm text-gray-500">
                                            Assigned to: {proc.assignedToName}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {getStatusBadge(proc.status)}
                                        {getStatusBadge(proc.priority)}
                                      </div>
                                    </div>
                                    {proc.description && (
                                      <p className="text-sm text-gray-600 mb-2">{proc.description}</p>
                                    )}
                                    {proc.status !== 'completed' && proc.status !== 'cancelled' && (
                                      <button
                                        onClick={() => markProcedureComplete(plan.id, proc.id)}
                                        className="btn btn-sm btn-primary mt-2"
                                      >
                                        <CheckCircle size={14} />
                                        Mark Complete
                                      </button>
                                    )}
                                    {proc.completedAt && (
                                      <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                        <CheckCircle size={12} />
                                        Completed by {proc.completedByName} on {format(new Date(proc.completedAt), 'MMM d, yyyy h:mm a')}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Implementation Tracking Tab */}
                        {activeTab === 'tracking' && (
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                              <UserCheck size={18} className="text-green-600" />
                              Implementation Timeline
                            </h4>
                            {logs.length === 0 ? (
                              <p className="text-gray-500 text-center py-4">No implementation logs yet</p>
                            ) : (
                              <div className="relative pl-4 border-l-2 border-gray-200 space-y-4">
                                {logs
                                  .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime())
                                  .map(log => (
                                    <div key={log.id} className="relative">
                                      <div className="absolute -left-[25px] top-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white" />
                                      <div className="bg-gray-50 rounded-lg p-4 ml-4">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium text-gray-900">{log.actionTypeName}</span>
                                          <span className="text-xs text-gray-500">
                                            {format(new Date(log.performedAt), 'MMM d, yyyy h:mm a')}
                                          </span>
                                        </div>
                                        <p className="text-sm text-gray-700">{log.details}</p>
                                        {log.notes && (
                                          <p className="text-sm text-gray-500 mt-1 italic">Note: {log.notes}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-2">
                                          By: {log.performedByName}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ============== MODALS ============== */}

      {/* New Plan Modal */}
      <AnimatePresence>
        {showNewPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowNewPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Create Treatment Plan</h3>
                  <button onClick={() => setShowNewPlanModal(false)} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const title = formData.get('title') as string;
                    const description = formData.get('description') as string;

                    if (!title) {
                      toast.error('Plan title is required');
                      return;
                    }

                    try {
                      const plan: ExtendedTreatmentPlan = {
                        id: uuidv4(),
                        patientId,
                        relatedEntityId: admissionId || relatedEntityId,
                        relatedEntityType,
                        title,
                        description,
                        clinicalGoals: [],
                        orders: [],
                        frequency: 'Once daily',
                        startDate: new Date(),
                        status: 'active',
                        createdBy: clinicianId,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        linkedPrescriptionIds: [],
                        linkedInvestigationIds: [],
                        procedures: [],
                        implementationLogs: [],
                      };

                      await db.treatmentPlans.add(plan);
                      syncRecord('treatment_plans', plan as unknown as Record<string, unknown>);
                      toast.success('Treatment plan created!');
                      setShowNewPlanModal(false);
                      setSelectedPlanId(plan.id);
                      setExpandedPlans(prev => [...prev, plan.id]);
                    } catch (error) {
                      console.error('Error creating plan:', error);
                      toast.error('Failed to create treatment plan');
                    }
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="label">Plan Title *</label>
                    <input name="title" className="input" placeholder="e.g., Post-Cellulitis Ulcer Care Plan" required />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea name="description" className="input" rows={3} placeholder="Brief description of the treatment approach..." />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowNewPlanModal(false)} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">
                      <Save size={16} />
                      Create Plan
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Medication Modal */}
      <AnimatePresence>
        {showMedicationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => { setShowMedicationModal(false); setMedications([]); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Add Prescription</h3>
                  <button onClick={() => { setShowMedicationModal(false); setMedications([]); }} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                {/* Added Medications List */}
                {medications.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-2">Medications to Prescribe:</h4>
                    <div className="space-y-2">
                      {medications.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                          <div>
                            <p className="font-medium text-blue-900">{med.name}</p>
                            <p className="text-sm text-blue-700">{med.dosage} • {med.frequency} • {med.route} • {med.duration}</p>
                          </div>
                          <button onClick={() => removeMedication(idx)} className="text-red-500 hover:text-red-700" title="Remove medication" aria-label="Remove medication">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button onClick={submitPrescription} className="btn btn-primary w-full mt-4">
                      <Save size={16} />
                      Submit Prescription ({medications.length} medication{medications.length > 1 ? 's' : ''})
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmitMed(addMedicationToList)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Category *</label>
                      <select
                        {...registerMed('category')}
                        className={`input ${medErrors.category ? 'input-error' : ''}`}
                        value={selectedCategory}
                        onChange={(e) => {
                          setSelectedCategory(e.target.value);
                          setMedValue('category', e.target.value);
                          setSelectedMedication(null);
                        }}
                      >
                        <option value="">Select category...</option>
                        {medicationCategories.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Medication *</label>
                      <select
                        {...registerMed('name')}
                        className={`input ${medErrors.name ? 'input-error' : ''}`}
                        onChange={(e) => {
                          const med = commonMedications[selectedCategory]?.find(m => m.name === e.target.value);
                          setSelectedMedication(med || null);
                          setMedValue('name', e.target.value);
                        }}
                        disabled={!selectedCategory}
                      >
                        <option value="">Select medication...</option>
                        {selectedCategory && commonMedications[selectedCategory]?.map(med => (
                          <option key={med.name} value={med.name}>{med.name}</option>
                        ))}
                        <option value="other">Other (specify)</option>
                      </select>
                    </div>
                  </div>

                  {/* Max Dosage Warning */}
                  {selectedMedication && (selectedMedication.warning || selectedMedication.maxDailyDose) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                        <div className="space-y-1">
                          {selectedMedication.maxDailyDose && (
                            <p className="text-sm font-medium text-amber-800">
                              <span className="font-bold">Maximum Daily Dose:</span> {selectedMedication.maxDailyDose}
                            </p>
                          )}
                          {selectedMedication.warning && (
                            <p className="text-sm text-amber-700">
                              <span className="font-bold">Warning:</span> {selectedMedication.warning}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Dose *</label>
                      {selectedMedication ? (
                        <select {...registerMed('dosage')} className={`input ${medErrors.dosage ? 'input-error' : ''}`}>
                          <option value="">Select dose...</option>
                          {selectedMedication.doses.map(dose => (
                            <option key={dose} value={dose}>{dose}</option>
                          ))}
                        </select>
                      ) : (
                        <input {...registerMed('dosage')} className={`input ${medErrors.dosage ? 'input-error' : ''}`} placeholder="e.g., 500mg" />
                      )}
                    </div>
                    <div>
                      <label className="label">Frequency *</label>
                      <select {...registerMed('frequency')} className={`input ${medErrors.frequency ? 'input-error' : ''}`}>
                        <option value="">Select frequency...</option>
                        {frequencyOptions.map(freq => (
                          <option key={freq} value={freq}>{freq}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Route *</label>
                      {selectedMedication ? (
                        <select {...registerMed('route')} className={`input ${medErrors.route ? 'input-error' : ''}`}>
                          <option value="">Select route...</option>
                          {selectedMedication.routes.map(route => (
                            <option key={route} value={route}>
                              {routeOptions.find(r => r.value === route)?.label || route}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select {...registerMed('route')} className={`input ${medErrors.route ? 'input-error' : ''}`}>
                          <option value="">Select route...</option>
                          {routeOptions.map(route => (
                            <option key={route.value} value={route.value}>{route.label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="label">Duration *</label>
                      <input {...registerMed('duration')} className={`input ${medErrors.duration ? 'input-error' : ''}`} placeholder="e.g., 5 days" />
                    </div>
                    <div>
                      <label className="label">Quantity * <span className="text-xs text-gray-500">(auto-calculated)</span></label>
                      <input type="number" {...registerMed('quantity', { valueAsNumber: true })} className={`input ${medErrors.quantity ? 'input-error' : ''} bg-gray-50`} min={1} readOnly title="Auto-calculated from frequency and duration" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Instructions</label>
                    <textarea {...registerMed('instructions')} className="input" rows={2} placeholder="Additional instructions..." />
                  </div>

                  <button type="submit" className="btn btn-secondary w-full">
                    <Plus size={16} />
                    Add Medication to List
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Investigation Modal */}
      <AnimatePresence>
        {showInvestigationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowInvestigationModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Request Investigation</h3>
                  <button onClick={() => setShowInvestigationModal(false)} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitInv(submitInvestigation)} className="space-y-4">
                  <div>
                    <label className="label">Investigation Type *</label>
                    <select {...registerInv('type')} className={`input ${invErrors.type ? 'input-error' : ''}`}>
                      <option value="">Select investigation...</option>
                      <optgroup label="Hematology">
                        {investigationTypes.filter(i => i.category === 'hematology').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Biochemistry">
                        {investigationTypes.filter(i => i.category === 'biochemistry').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Urinalysis">
                        {investigationTypes.filter(i => i.category === 'urinalysis').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Microbiology">
                        {investigationTypes.filter(i => i.category === 'microbiology').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Serology">
                        {investigationTypes.filter(i => i.category === 'serology').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Imaging">
                        {investigationTypes.filter(i => i.category === 'imaging').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Cardiology">
                        {investigationTypes.filter(i => i.category === 'cardiology').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Pulmonology">
                        {investigationTypes.filter(i => i.category === 'pulmonology').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="GI/Endoscopy">
                        {investigationTypes.filter(i => i.category === 'gi').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Histopathology">
                        {investigationTypes.filter(i => i.category === 'histopathology').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Other">
                        {investigationTypes.filter(i => i.category === 'other').map(inv => (
                          <option key={inv.value} value={inv.value}>{inv.label}</option>
                        ))}
                      </optgroup>
                    </select>
                    {invErrors.type && <p className="text-sm text-red-500 mt-1">{invErrors.type.message}</p>}
                  </div>

                  <div>
                    <label className="label">Frequency *</label>
                    <select {...registerInv('frequency')} className={`input ${invErrors.frequency ? 'input-error' : ''}`}>
                      <option value="">Select frequency...</option>
                      {investigationFrequencyOptions.map(freq => (
                        <option key={freq.value} value={freq.value}>{freq.label}</option>
                      ))}
                    </select>
                    {invErrors.frequency && <p className="text-sm text-red-500 mt-1">{invErrors.frequency.message}</p>}
                  </div>

                  <div>
                    <label className="label">Priority *</label>
                    <div className="flex gap-4">
                      {priorityOptions.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2">
                          <input type="radio" {...registerInv('priority')} value={opt.value} className="text-sky-600" />
                          <span className={`px-2 py-1 rounded text-sm ${opt.color}`}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Clinical Details</label>
                    <textarea {...registerInv('clinicalDetails')} className="input" rows={2} placeholder="Relevant clinical information..." />
                  </div>

                  <div className="flex items-center gap-2">
                    <input type="checkbox" {...registerInv('fasting')} id="fasting" className="rounded text-sky-600" />
                    <label htmlFor="fasting" className="text-sm text-gray-700">Fasting required</label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowInvestigationModal(false)} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">
                      <FlaskConical size={16} />
                      Request Investigation
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Procedure Modal */}
      <AnimatePresence>
        {showProcedureModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => { setShowProcedureModal(false); setSelectedProcedureType(null); setProcedureChecklist([]); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Schedule Procedure</h3>
                  <button onClick={() => { setShowProcedureModal(false); setSelectedProcedureType(null); setProcedureChecklist([]); }} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitProc(submitProcedure)} className="space-y-4">
                  <div>
                    <label className="label">Procedure Type *</label>
                    <select 
                      {...registerProc('type')} 
                      className={`input ${procErrors.type ? 'input-error' : ''}`}
                      onChange={(e) => {
                        const proc = procedureTypes.find(p => p.value === e.target.value);
                        setSelectedProcedureType(proc || null);
                        if (proc) {
                          setProcedureChecklist(proc.preProcedureChecklist.map(item => ({ item, completed: false })));
                        } else {
                          setProcedureChecklist([]);
                        }
                      }}
                    >
                      <option value="">Select procedure...</option>
                      <optgroup label="Wound Care">
                        {procedureTypes.filter(p => p.category === 'wound_care').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Minor Surgery">
                        {procedureTypes.filter(p => p.category === 'minor_surgery').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Vascular Access">
                        {procedureTypes.filter(p => p.category === 'vascular_access').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="GI Procedures">
                        {procedureTypes.filter(p => p.category === 'gi_procedures').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Thoracic">
                        {procedureTypes.filter(p => p.category === 'thoracic').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Urological">
                        {procedureTypes.filter(p => p.category === 'urological').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Neurology">
                        {procedureTypes.filter(p => p.category === 'neurology').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Burns">
                        {procedureTypes.filter(p => p.category === 'burns').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Major Surgery">
                        {procedureTypes.filter(p => p.category === 'major_surgery').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Plastic Surgery">
                        {procedureTypes.filter(p => p.category === 'plastic_surgery').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Emergency Surgery">
                        {procedureTypes.filter(p => p.category === 'emergency_surgery').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Transfusion">
                        {procedureTypes.filter(p => p.category === 'transfusion').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Rehabilitation">
                        {procedureTypes.filter(p => p.category === 'rehabilitation').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Other">
                        {procedureTypes.filter(p => p.category === 'other').map(proc => (
                          <option key={proc.value} value={proc.value}>{proc.label}</option>
                        ))}
                      </optgroup>
                    </select>
                    {procErrors.type && <p className="text-sm text-red-500 mt-1">{procErrors.type.message}</p>}
                  </div>

                  {/* Pre-Procedure Checklist */}
                  {selectedProcedureType && (
                    <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <CheckSquare className="text-amber-600" size={18} />
                        <h4 className="font-medium text-amber-800">Pre-Procedure Checklist</h4>
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {procedureChecklist.map((item, index) => (
                          <label key={index} className="flex items-start gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={(e) => {
                                const updated = [...procedureChecklist];
                                updated[index] = { ...item, completed: e.target.checked };
                                setProcedureChecklist(updated);
                              }}
                              className="mt-1 rounded text-amber-600"
                            />
                            <span className={item.completed ? 'text-gray-500 line-through' : 'text-gray-700'}>
                              {item.item}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-amber-700">
                          {procedureChecklist.filter(i => i.completed).length} / {procedureChecklist.length} items completed
                        </span>
                        {procedureChecklist.length > 0 && procedureChecklist.every(i => i.completed) && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle size={12} /> Ready
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Planning Requirements */}
                  {selectedProcedureType && selectedProcedureType.planningRequirements.length > 0 && (
                    <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <ClipboardList className="text-blue-600" size={18} />
                        <h4 className="font-medium text-blue-800">Planning Requirements</h4>
                      </div>
                      <ul className="space-y-1 text-sm text-blue-700">
                        {selectedProcedureType.planningRequirements.map((req, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <label className="label">Description</label>
                    <textarea {...registerProc('description')} className="input" rows={2} placeholder="Procedure details..." />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Scheduled Date *</label>
                      <input type="date" {...registerProc('scheduledDate')} className={`input ${procErrors.scheduledDate ? 'input-error' : ''}`} />
                    </div>
                    <div>
                      <label className="label">Time</label>
                      <input type="time" {...registerProc('scheduledTime')} className="input" />
                    </div>
                  </div>

                  <div>
                    <label className="label">Assign To</label>
                    <select {...registerProc('assignedTo')} className="input">
                      <option value="">Select staff member...</option>
                      {users?.filter(u => ['surgeon', 'doctor', 'nurse'].includes(u.role)).map(user => (
                        <option key={user.id} value={user.id}>{user.firstName} {user.lastName} ({user.role})</option>
                      ))}
                    </select>
                    {selectedProcedureType && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Bell size={12} />
                        Assigned staff will receive a notification
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="label">Priority *</label>
                    <div className="flex gap-4">
                      {priorityOptions.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2">
                          <input type="radio" {...registerProc('priority')} value={opt.value} className="text-sky-600" />
                          <span className={`px-2 py-1 rounded text-sm ${opt.color}`}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea {...registerProc('notes')} className="input" rows={2} placeholder="Additional notes..." />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => { setShowProcedureModal(false); setSelectedProcedureType(null); setProcedureChecklist([]); }} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">
                      <Scissors size={16} />
                      Schedule Procedure
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Implementation Log Modal */}
      <AnimatePresence>
        {showLogModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLogModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Log Implementation</h3>
                  <button onClick={() => setShowLogModal(false)} className="text-gray-400 hover:text-gray-600" title="Close" aria-label="Close modal">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmitLog(submitImplementationLog)} className="space-y-4">
                  <div>
                    <label className="label">Action Type *</label>
                    <select {...registerLog('actionType')} className={`input ${logErrors.actionType ? 'input-error' : ''}`}>
                      <option value="">Select action...</option>
                      <option value="medication_administered">Medication Administered</option>
                      <option value="investigation_collected">Investigation Sample Collected</option>
                      <option value="procedure_performed">Procedure Performed</option>
                      <option value="dressing_changed">Dressing Changed</option>
                      <option value="vitals_recorded">Vitals Recorded</option>
                      <option value="other">Other</option>
                    </select>
                    {logErrors.actionType && <p className="text-sm text-red-500 mt-1">{logErrors.actionType.message}</p>}
                  </div>

                  <div>
                    <label className="label">Details *</label>
                    <textarea
                      {...registerLog('details')}
                      className={`input ${logErrors.details ? 'input-error' : ''}`}
                      rows={3}
                      placeholder="Describe what was done..."
                    />
                    {logErrors.details && <p className="text-sm text-red-500 mt-1">{logErrors.details.message}</p>}
                  </div>

                  <div>
                    <label className="label">Notes</label>
                    <textarea {...registerLog('notes')} className="input" rows={2} placeholder="Additional notes or observations..." />
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                    <p><strong>Logged by:</strong> {clinicianName}</p>
                    <p><strong>Timestamp:</strong> {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setShowLogModal(false)} className="btn btn-secondary">Cancel</button>
                    <button type="submit" className="btn btn-primary">
                      <UserCheck size={16} />
                      Log Implementation
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
