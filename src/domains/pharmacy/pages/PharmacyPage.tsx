import { useState, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Pill,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  X,
  Save,
  Trash2,
  Info,
  FileText,
  Download,
  AlertCircle,
  Activity,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { format } from 'date-fns';
import { generatePrescriptionPDF, generateDispensingSlipPDF } from '../../../utils/prescriptionPdfGenerator';
import { downloadDrugInformationPDF } from '../../../utils/drugInformationPdfGenerator';
import type { Prescription, Medication, MedicationRoute } from '../../../types';
import { PatientSelector } from '../../../components/patient';
import { usePatientMap } from '../../../services/patientHooks';
import { getGFRForPatient, type GFRResult } from '../../../services/gfrCalculationService';
import { getDrugDosingRecommendation, type RenalDosingResult } from '../../../services/renalDosingService';

// Comprehensive Nigerian medication database (BNF & NAFDAC-adapted)
const medicationDatabase = {
  analgesics: [
    { name: 'Paracetamol', genericName: 'Acetaminophen', doses: ['500mg', '1g'], routes: ['oral', 'intravenous', 'rectal'], frequency: ['4 hourly', '6 hourly', '8 hourly'], maxDaily: '4g', renalAdjust: false },
    { name: 'Ibuprofen', genericName: 'Ibuprofen', doses: ['200mg', '400mg', '600mg', '800mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly', '12 hourly'], maxDaily: '2.4g', renalAdjust: true },
    { name: 'Diclofenac', genericName: 'Diclofenac Sodium', doses: ['25mg', '50mg', '75mg', '100mg'], routes: ['oral', 'intramuscular', 'rectal'], frequency: ['8 hourly', '12 hourly'], maxDaily: '150mg', renalAdjust: true },
    { name: 'Tramadol', genericName: 'Tramadol HCl', doses: ['50mg', '100mg', '200mg SR'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['4 hourly', '6 hourly', '8 hourly', '12 hourly'], maxDaily: '400mg', renalAdjust: true },
    { name: 'Morphine', genericName: 'Morphine Sulphate', doses: ['5mg', '10mg', '15mg', '30mg'], routes: ['oral', 'intravenous', 'subcutaneous', 'intramuscular'], frequency: ['4 hourly', '6 hourly'], maxDaily: 'Titrate', renalAdjust: true },
    { name: 'Pentazocine', genericName: 'Pentazocine', doses: ['30mg', '60mg'], routes: ['intramuscular', 'intravenous', 'oral'], frequency: ['4 hourly', '6 hourly'], maxDaily: '360mg', renalAdjust: true },
    { name: 'Piroxicam', genericName: 'Piroxicam', doses: ['10mg', '20mg'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', '12 hourly'], maxDaily: '40mg', renalAdjust: true },
    { name: 'Naproxen', genericName: 'Naproxen', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '1.5g', renalAdjust: true },
    { name: 'Meloxicam', genericName: 'Meloxicam', doses: ['7.5mg', '15mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15mg', renalAdjust: true },
    { name: 'Etoricoxib', genericName: 'Etoricoxib', doses: ['60mg', '90mg', '120mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '120mg', renalAdjust: true },
    { name: 'Ketorolac', genericName: 'Ketorolac', doses: ['10mg', '30mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '90mg', renalAdjust: true },
    { name: 'Pethidine', genericName: 'Meperidine', doses: ['50mg', '100mg'], routes: ['intramuscular', 'intravenous'], frequency: ['4 hourly', '6 hourly'], maxDaily: '600mg', renalAdjust: true },
    { name: 'Fentanyl', genericName: 'Fentanyl', doses: ['25mcg', '50mcg', '100mcg'], routes: ['intravenous', 'transdermal'], frequency: ['PRN', '72 hourly patch'], maxDaily: 'Titrate', renalAdjust: false },
    { name: 'Codeine Phosphate', genericName: 'Codeine', doses: ['15mg', '30mg', '60mg'], routes: ['oral'], frequency: ['4 hourly', '6 hourly'], maxDaily: '240mg', renalAdjust: true },
    { name: 'Celecoxib', genericName: 'Celecoxib', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '400mg', renalAdjust: true },
  ],
  antibiotics: [
    { name: 'Amoxicillin', genericName: 'Amoxicillin', doses: ['250mg', '500mg', '1g'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '3g', renalAdjust: true },
    { name: 'Amoxicillin-Clavulanate', genericName: 'Co-Amoxiclav', doses: ['375mg', '625mg', '1g', '1.2g'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '6g', renalAdjust: true },
    { name: 'Ampicillin', genericName: 'Ampicillin', doses: ['250mg', '500mg', '1g', '2g'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '12g', renalAdjust: true },
    { name: 'Ampicillin-Cloxacillin', genericName: 'Ampiclox', doses: ['250mg', '500mg'], routes: ['oral', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4g', renalAdjust: true },
    { name: 'Flucloxacillin', genericName: 'Flucloxacillin', doses: ['250mg', '500mg', '1g'], routes: ['oral', 'intravenous'], frequency: ['6 hourly'], maxDaily: '8g', renalAdjust: true },
    { name: 'Ceftriaxone', genericName: 'Ceftriaxone', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['12 hourly', '24 hourly'], maxDaily: '4g', renalAdjust: false },
    { name: 'Cefuroxime', genericName: 'Cefuroxime', doses: ['250mg', '500mg', '750mg', '1.5g'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '6g', renalAdjust: true },
    { name: 'Ceftazidime', genericName: 'Ceftazidime', doses: ['500mg', '1g', '2g'], routes: ['intravenous', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '6g', renalAdjust: true },
    { name: 'Cefixime', genericName: 'Cefixime', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['12 hourly', '24 hourly'], maxDaily: '400mg', renalAdjust: true },
    { name: 'Cefpodoxime', genericName: 'Cefpodoxime', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: true },
    { name: 'Ciprofloxacin', genericName: 'Ciprofloxacin', doses: ['250mg', '500mg', '750mg', '200mg IV', '400mg IV'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '1.5g PO, 800mg IV', renalAdjust: true },
    { name: 'Levofloxacin', genericName: 'Levofloxacin', doses: ['250mg', '500mg', '750mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '24 hourly'], maxDaily: '750mg', renalAdjust: true },
    { name: 'Ofloxacin', genericName: 'Ofloxacin', doses: ['200mg', '400mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '800mg', renalAdjust: true },
    { name: 'Moxifloxacin', genericName: 'Moxifloxacin', doses: ['400mg'], routes: ['oral', 'intravenous'], frequency: ['24 hourly'], maxDaily: '400mg', renalAdjust: false },
    { name: 'Metronidazole', genericName: 'Metronidazole', doses: ['200mg', '400mg', '500mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly'], maxDaily: '4g', renalAdjust: false },
    { name: 'Tinidazole', genericName: 'Tinidazole', doses: ['500mg', '1g', '2g'], routes: ['oral'], frequency: ['12 hourly', '24 hourly'], maxDaily: '2g', renalAdjust: false },
    { name: 'Gentamicin', genericName: 'Gentamicin', doses: ['80mg', '120mg', '5-7mg/kg'], routes: ['intravenous', 'intramuscular'], frequency: ['8 hourly', '24 hourly'], maxDaily: '7mg/kg', renalAdjust: true },
    { name: 'Amikacin', genericName: 'Amikacin', doses: ['250mg', '500mg', '15mg/kg'], routes: ['intravenous', 'intramuscular'], frequency: ['12 hourly', '24 hourly'], maxDaily: '15mg/kg', renalAdjust: true },
    { name: 'Azithromycin', genericName: 'Azithromycin', doses: ['250mg', '500mg', '1g'], routes: ['oral', 'intravenous'], frequency: ['24 hourly'], maxDaily: '500mg', renalAdjust: false },
    { name: 'Clarithromycin', genericName: 'Clarithromycin', doses: ['250mg', '500mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '1g', renalAdjust: true },
    { name: 'Erythromycin', genericName: 'Erythromycin', doses: ['250mg', '500mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4g', renalAdjust: false },
    { name: 'Clindamycin', genericName: 'Clindamycin', doses: ['150mg', '300mg', '600mg', '900mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4.8g', renalAdjust: false },
    { name: 'Doxycycline', genericName: 'Doxycycline', doses: ['100mg', '200mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '24 hourly'], maxDaily: '200mg', renalAdjust: false },
    { name: 'Tetracycline', genericName: 'Tetracycline', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['6 hourly'], maxDaily: '2g', renalAdjust: true },
    { name: 'Meropenem', genericName: 'Meropenem', doses: ['500mg', '1g', '2g'], routes: ['intravenous'], frequency: ['8 hourly'], maxDaily: '6g', renalAdjust: true },
    { name: 'Imipenem-Cilastatin', genericName: 'Imipenem', doses: ['250mg', '500mg', '1g'], routes: ['intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4g', renalAdjust: true },
    { name: 'Vancomycin', genericName: 'Vancomycin', doses: ['500mg', '1g', '15-20mg/kg'], routes: ['intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '4g', renalAdjust: true },
    { name: 'Piperacillin-Tazobactam', genericName: 'Piptaz', doses: ['2.25g', '4.5g'], routes: ['intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '18g', renalAdjust: true },
    { name: 'Co-trimoxazole', genericName: 'Sulfamethoxazole-Trimethoprim', doses: ['480mg', '960mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '1920mg', renalAdjust: true },
    { name: 'Nitrofurantoin', genericName: 'Nitrofurantoin', doses: ['50mg', '100mg'], routes: ['oral'], frequency: ['6 hourly', '12 hourly'], maxDaily: '400mg', renalAdjust: true },
  ],
  antiinflammatories: [
    { name: 'Prednisolone', genericName: 'Prednisolone', doses: ['5mg', '10mg', '20mg', '40mg', '60mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly', 'Divided doses'], maxDaily: '60mg', renalAdjust: false },
    { name: 'Hydrocortisone', genericName: 'Hydrocortisone', doses: ['50mg', '100mg', '200mg', '500mg'], routes: ['intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '400mg', renalAdjust: false },
    { name: 'Dexamethasone', genericName: 'Dexamethasone', doses: ['0.5mg', '2mg', '4mg', '8mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once daily', '12 hourly'], maxDaily: '16mg', renalAdjust: false },
    { name: 'Methylprednisolone', genericName: 'Methylprednisolone', doses: ['40mg', '125mg', '500mg', '1g'], routes: ['intravenous', 'intramuscular'], frequency: ['Once daily', '6 hourly'], maxDaily: '1g', renalAdjust: false },
    { name: 'Betamethasone', genericName: 'Betamethasone', doses: ['0.5mg', '4mg', '6mg', '12mg'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', '12 hourly'], maxDaily: '12mg', renalAdjust: false },
    { name: 'Triamcinolone', genericName: 'Triamcinolone', doses: ['4mg', '10mg', '40mg'], routes: ['oral', 'intramuscular', 'intra-articular'], frequency: ['Once daily', 'Weekly'], maxDaily: '48mg', renalAdjust: false },
  ],
  vitamins: [
    { name: 'Vitamin C', genericName: 'Ascorbic Acid', doses: ['100mg', '250mg', '500mg', '1000mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '2g', renalAdjust: false },
    { name: 'Vitamin B Complex', genericName: 'Vitamin B Complex', doses: ['1 tablet', '2 tablets'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', '12 hourly'], maxDaily: '3 tablets', renalAdjust: false },
    { name: 'Vitamin B1 (Thiamine)', genericName: 'Thiamine', doses: ['50mg', '100mg', '300mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['Once daily', '8 hourly'], maxDaily: '300mg', renalAdjust: false },
    { name: 'Vitamin B6 (Pyridoxine)', genericName: 'Pyridoxine', doses: ['25mg', '50mg', '100mg'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', '8 hourly'], maxDaily: '200mg', renalAdjust: false },
    { name: 'Vitamin B12', genericName: 'Cyanocobalamin', doses: ['50mcg', '100mcg', '1000mcg'], routes: ['oral', 'intramuscular'], frequency: ['Once daily', 'Weekly', 'Monthly'], maxDaily: '1000mcg', renalAdjust: false },
    { name: 'Folic Acid', genericName: 'Folic Acid', doses: ['400mcg', '1mg', '5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '15mg', renalAdjust: false },
    { name: 'Vitamin D3', genericName: 'Cholecalciferol', doses: ['400IU', '1000IU', '5000IU', '50000IU'], routes: ['oral'], frequency: ['Once daily', 'Weekly'], maxDaily: '4000IU daily', renalAdjust: false },
    { name: 'Vitamin E', genericName: 'Alpha-Tocopherol', doses: ['100IU', '200IU', '400IU'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1000IU', renalAdjust: false },
    { name: 'Vitamin K (Phytomenadione)', genericName: 'Vitamin K1', doses: ['1mg', '5mg', '10mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once daily', 'Once only'], maxDaily: '40mg', renalAdjust: false },
    { name: 'Ferrous Sulphate', genericName: 'Iron', doses: ['200mg', '300mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '600mg', renalAdjust: false },
    { name: 'Ferrous Gluconate', genericName: 'Iron', doses: ['300mg', '600mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '1200mg', renalAdjust: false },
    { name: 'Ferrous Fumarate', genericName: 'Iron', doses: ['200mg', '322mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '966mg', renalAdjust: false },
    { name: 'Iron Sucrose', genericName: 'Iron Sucrose', doses: ['100mg', '200mg'], routes: ['intravenous'], frequency: ['Once weekly', 'Twice weekly'], maxDaily: '200mg', renalAdjust: true },
    { name: 'Zinc Sulphate', genericName: 'Zinc', doses: ['20mg', '50mg', '220mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '660mg', renalAdjust: true },
    { name: 'Calcium Carbonate', genericName: 'Calcium', doses: ['500mg', '600mg', '1000mg', '1250mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '2500mg', renalAdjust: true },
    { name: 'Calcium Gluconate', genericName: 'Calcium', doses: ['500mg', '1g', '10ml'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '8 hourly'], maxDaily: '3g', renalAdjust: true },
    { name: 'Magnesium Sulphate', genericName: 'Magnesium', doses: ['1g', '2g', '4g'], routes: ['intravenous', 'intramuscular'], frequency: ['Once only', '4 hourly'], maxDaily: '40g', renalAdjust: true },
    { name: 'Multivitamin', genericName: 'Multivitamins', doses: ['1 tablet', '2 tablets'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '2 tablets', renalAdjust: false },
  ],
  anticoagulants: [
    { name: 'Enoxaparin', genericName: 'Enoxaparin', doses: ['20mg', '40mg', '60mg', '80mg', '1mg/kg', '1.5mg/kg'], routes: ['subcutaneous'], frequency: ['Once daily', '12 hourly'], maxDaily: '2mg/kg', renalAdjust: true },
    { name: 'Heparin', genericName: 'Unfractionated Heparin', doses: ['5000units', '10000units', '80units/kg'], routes: ['subcutaneous', 'intravenous'], frequency: ['8 hourly', '12 hourly', 'Infusion'], maxDaily: 'Titrate to APTT', renalAdjust: false },
    { name: 'Warfarin', genericName: 'Warfarin', doses: ['1mg', '2mg', '2.5mg', '3mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: 'Titrate to INR', renalAdjust: false },
    { name: 'Rivaroxaban', genericName: 'Rivaroxaban', doses: ['2.5mg', '10mg', '15mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '20mg', renalAdjust: true },
    { name: 'Apixaban', genericName: 'Apixaban', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '10mg', renalAdjust: true },
    { name: 'Dabigatran', genericName: 'Dabigatran', doses: ['75mg', '110mg', '150mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '300mg', renalAdjust: true },
    { name: 'Aspirin', genericName: 'Acetylsalicylic Acid', doses: ['75mg', '100mg', '150mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: true },
    { name: 'Clopidogrel', genericName: 'Clopidogrel', doses: ['75mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '75mg maintenance', renalAdjust: false },
    { name: 'Ticagrelor', genericName: 'Ticagrelor', doses: ['60mg', '90mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '180mg', renalAdjust: false },
    { name: 'Dipyridamole', genericName: 'Dipyridamole', doses: ['25mg', '75mg', '200mg MR'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '600mg', renalAdjust: false },
  ],
  antipyretics: [
    { name: 'Paracetamol', genericName: 'Acetaminophen', doses: ['500mg', '1g', '120mg/5ml', '250mg/5ml'], routes: ['oral', 'intravenous', 'rectal'], frequency: ['4 hourly', '6 hourly', '8 hourly'], maxDaily: '4g', renalAdjust: false },
    { name: 'Aspirin', genericName: 'Acetylsalicylic Acid', doses: ['300mg', '600mg'], routes: ['oral'], frequency: ['4 hourly', '6 hourly'], maxDaily: '4g', renalAdjust: true },
  ],
  antifungals: [
    { name: 'Fluconazole', genericName: 'Fluconazole', doses: ['50mg', '100mg', '150mg', '200mg', '400mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '800mg', renalAdjust: true },
    { name: 'Itraconazole', genericName: 'Itraconazole', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: false },
    { name: 'Ketoconazole', genericName: 'Ketoconazole', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: false },
    { name: 'Voriconazole', genericName: 'Voriconazole', doses: ['200mg', '300mg', '400mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '600mg', renalAdjust: true },
    { name: 'Amphotericin B', genericName: 'Amphotericin B', doses: ['0.5mg/kg', '1mg/kg'], routes: ['intravenous'], frequency: ['Once daily'], maxDaily: '1.5mg/kg', renalAdjust: true },
    { name: 'Clotrimazole', genericName: 'Clotrimazole', doses: ['1% cream', '10mg lozenge', '100mg pessary', '500mg pessary'], routes: ['topical', 'vaginal', 'oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Miconazole', genericName: 'Miconazole', doses: ['2% cream', '100mg pessary', '200mg pessary'], routes: ['topical', 'vaginal'], frequency: ['12 hourly', 'Once daily'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Nystatin', genericName: 'Nystatin', doses: ['100000units/ml', '500000units tablet'], routes: ['oral', 'topical'], frequency: ['6 hourly', '8 hourly'], maxDaily: '6ml QDS', renalAdjust: false },
    { name: 'Terbinafine', genericName: 'Terbinafine', doses: ['250mg', '1% cream'], routes: ['oral', 'topical'], frequency: ['Once daily', '12 hourly'], maxDaily: '250mg', renalAdjust: true },
    { name: 'Griseofulvin', genericName: 'Griseofulvin', doses: ['125mg', '250mg', '500mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '1g', renalAdjust: false },
  ],
  antihistamines: [
    { name: 'Chlorpheniramine', genericName: 'Chlorpheniramine', doses: ['4mg', '10mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '24mg', renalAdjust: false },
    { name: 'Loratadine', genericName: 'Loratadine', doses: ['10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
    { name: 'Cetirizine', genericName: 'Cetirizine', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '10mg', renalAdjust: true },
    { name: 'Fexofenadine', genericName: 'Fexofenadine', doses: ['60mg', '120mg', '180mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '180mg', renalAdjust: true },
    { name: 'Desloratadine', genericName: 'Desloratadine', doses: ['5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: false },
    { name: 'Levocetirizine', genericName: 'Levocetirizine', doses: ['5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: true },
    { name: 'Promethazine', genericName: 'Promethazine', doses: ['10mg', '25mg', '50mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['6 hourly', '8 hourly', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
    { name: 'Diphenhydramine', genericName: 'Diphenhydramine', doses: ['25mg', '50mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '300mg', renalAdjust: false },
    { name: 'Hydroxyzine', genericName: 'Hydroxyzine', doses: ['10mg', '25mg', '50mg'], routes: ['oral', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '100mg', renalAdjust: true },
    { name: 'Cyproheptadine', genericName: 'Cyproheptadine', doses: ['4mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '32mg', renalAdjust: false },
  ],
  antacids: [
    { name: 'Omeprazole', genericName: 'Omeprazole', doses: ['10mg', '20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '80mg', renalAdjust: false },
    { name: 'Pantoprazole', genericName: 'Pantoprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '80mg', renalAdjust: false },
    { name: 'Esomeprazole', genericName: 'Esomeprazole', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily', '12 hourly'], maxDaily: '80mg', renalAdjust: false },
    { name: 'Lansoprazole', genericName: 'Lansoprazole', doses: ['15mg', '30mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '60mg', renalAdjust: false },
    { name: 'Rabeprazole', genericName: 'Rabeprazole', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '40mg', renalAdjust: false },
    { name: 'Ranitidine', genericName: 'Ranitidine', doses: ['150mg', '300mg', '50mg IV'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '24 hourly'], maxDaily: '300mg', renalAdjust: true },
    { name: 'Famotidine', genericName: 'Famotidine', doses: ['20mg', '40mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '24 hourly'], maxDaily: '80mg', renalAdjust: true },
    { name: 'Cimetidine', genericName: 'Cimetidine', doses: ['200mg', '400mg', '800mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '12 hourly'], maxDaily: '2.4g', renalAdjust: true },
    { name: 'Sucralfate', genericName: 'Sucralfate', doses: ['1g'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '8g', renalAdjust: false },
    { name: 'Misoprostol', genericName: 'Misoprostol', doses: ['200mcg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '800mcg', renalAdjust: false },
    { name: 'Magnesium Trisilicate', genericName: 'Antacid', doses: ['500mg', '10ml'], routes: ['oral'], frequency: ['6 hourly', '8 hourly', 'PRN'], maxDaily: '4g', renalAdjust: true },
    { name: 'Aluminium Hydroxide', genericName: 'Antacid', doses: ['500mg', '10ml'], routes: ['oral'], frequency: ['6 hourly', '8 hourly', 'PRN'], maxDaily: '3.84g', renalAdjust: true },
  ],
  antiemetics: [
    { name: 'Metoclopramide', genericName: 'Metoclopramide', doses: ['10mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '30mg', renalAdjust: true },
    { name: 'Ondansetron', genericName: 'Ondansetron', doses: ['4mg', '8mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['8 hourly', '12 hourly'], maxDaily: '24mg', renalAdjust: false },
    { name: 'Granisetron', genericName: 'Granisetron', doses: ['1mg', '2mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', '24 hourly'], maxDaily: '9mg', renalAdjust: false },
    { name: 'Domperidone', genericName: 'Domperidone', doses: ['10mg', '20mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '30mg', renalAdjust: false },
    { name: 'Prochlorperazine', genericName: 'Prochlorperazine', doses: ['5mg', '10mg', '12.5mg'], routes: ['oral', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '40mg', renalAdjust: false },
    { name: 'Promethazine', genericName: 'Promethazine', doses: ['12.5mg', '25mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
    { name: 'Cyclizine', genericName: 'Cyclizine', doses: ['50mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['8 hourly'], maxDaily: '150mg', renalAdjust: false },
    { name: 'Dimenhydrinate', genericName: 'Dimenhydrinate', doses: ['50mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '400mg', renalAdjust: false },
  ],
  antihypertensives: [
    { name: 'Amlodipine', genericName: 'Amlodipine', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
    { name: 'Nifedipine', genericName: 'Nifedipine', doses: ['10mg', '20mg', '30mg', '60mg'], routes: ['oral', 'sublingual'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '120mg', renalAdjust: false },
    { name: 'Felodipine', genericName: 'Felodipine', doses: ['2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: false },
    { name: 'Lisinopril', genericName: 'Lisinopril', doses: ['2.5mg', '5mg', '10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '80mg', renalAdjust: true },
    { name: 'Enalapril', genericName: 'Enalapril', doses: ['2.5mg', '5mg', '10mg', '20mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '40mg', renalAdjust: true },
    { name: 'Ramipril', genericName: 'Ramipril', doses: ['1.25mg', '2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
    { name: 'Captopril', genericName: 'Captopril', doses: ['6.25mg', '12.5mg', '25mg', '50mg'], routes: ['oral', 'sublingual'], frequency: ['8 hourly', '12 hourly'], maxDaily: '150mg', renalAdjust: true },
    { name: 'Losartan', genericName: 'Losartan', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
    { name: 'Valsartan', genericName: 'Valsartan', doses: ['40mg', '80mg', '160mg', '320mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '320mg', renalAdjust: false },
    { name: 'Irbesartan', genericName: 'Irbesartan', doses: ['75mg', '150mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: false },
    { name: 'Telmisartan', genericName: 'Telmisartan', doses: ['20mg', '40mg', '80mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '80mg', renalAdjust: false },
    { name: 'Atenolol', genericName: 'Atenolol', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: true },
    { name: 'Metoprolol', genericName: 'Metoprolol', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly', 'Once daily'], maxDaily: '400mg', renalAdjust: false },
    { name: 'Bisoprolol', genericName: 'Bisoprolol', doses: ['1.25mg', '2.5mg', '5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: true },
    { name: 'Carvedilol', genericName: 'Carvedilol', doses: ['3.125mg', '6.25mg', '12.5mg', '25mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '50mg', renalAdjust: false },
    { name: 'Propranolol', genericName: 'Propranolol', doses: ['10mg', '20mg', '40mg', '80mg', '160mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '8 hourly', '12 hourly'], maxDaily: '320mg', renalAdjust: false },
    { name: 'Labetalol', genericName: 'Labetalol', doses: ['100mg', '200mg', '400mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '2.4g', renalAdjust: false },
    { name: 'Hydrochlorothiazide', genericName: 'Hydrochlorothiazide', doses: ['12.5mg', '25mg', '50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '50mg', renalAdjust: true },
    { name: 'Furosemide', genericName: 'Furosemide', doses: ['20mg', '40mg', '80mg', '250mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '600mg', renalAdjust: true },
    { name: 'Spironolactone', genericName: 'Spironolactone', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: true },
    { name: 'Indapamide', genericName: 'Indapamide', doses: ['1.5mg', '2.5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2.5mg', renalAdjust: true },
    { name: 'Methyldopa', genericName: 'Methyldopa', doses: ['250mg', '500mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '3g', renalAdjust: true },
    { name: 'Hydralazine', genericName: 'Hydralazine', doses: ['10mg', '25mg', '50mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '300mg', renalAdjust: true },
  ],
  antidiabetics: [
    { name: 'Metformin', genericName: 'Metformin', doses: ['500mg', '850mg', '1000mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly', 'Once daily'], maxDaily: '3g', renalAdjust: true },
    { name: 'Glibenclamide', genericName: 'Glibenclamide', doses: ['2.5mg', '5mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '15mg', renalAdjust: true },
    { name: 'Glimepiride', genericName: 'Glimepiride', doses: ['1mg', '2mg', '3mg', '4mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '8mg', renalAdjust: true },
    { name: 'Gliclazide', genericName: 'Gliclazide', doses: ['30mg MR', '40mg', '60mg MR', '80mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '320mg', renalAdjust: true },
    { name: 'Pioglitazone', genericName: 'Pioglitazone', doses: ['15mg', '30mg', '45mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '45mg', renalAdjust: false },
    { name: 'Sitagliptin', genericName: 'Sitagliptin', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '100mg', renalAdjust: true },
    { name: 'Linagliptin', genericName: 'Linagliptin', doses: ['5mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '5mg', renalAdjust: false },
    { name: 'Empagliflozin', genericName: 'Empagliflozin', doses: ['10mg', '25mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '25mg', renalAdjust: true },
    { name: 'Dapagliflozin', genericName: 'Dapagliflozin', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '10mg', renalAdjust: true },
    { name: 'Insulin Regular', genericName: 'Soluble Insulin', doses: ['4units', '6units', '8units', '10units', '12units', '16units', '20units'], routes: ['subcutaneous', 'intravenous'], frequency: ['Before meals', '6 hourly', '8 hourly'], maxDaily: 'Titrate', renalAdjust: true },
    { name: 'Insulin NPH', genericName: 'Isophane Insulin', doses: ['10units', '12units', '16units', '20units', '24units', '30units'], routes: ['subcutaneous'], frequency: ['Once daily', '12 hourly'], maxDaily: 'Titrate', renalAdjust: true },
    { name: 'Insulin Glargine', genericName: 'Insulin Glargine', doses: ['10units', '14units', '20units', '30units', '40units'], routes: ['subcutaneous'], frequency: ['Once daily'], maxDaily: 'Titrate', renalAdjust: true },
    { name: 'Insulin Aspart', genericName: 'Insulin Aspart', doses: ['4units', '6units', '8units', '10units'], routes: ['subcutaneous'], frequency: ['Before meals'], maxDaily: 'Titrate', renalAdjust: true },
    { name: 'Mixed Insulin 30/70', genericName: 'Biphasic Insulin', doses: ['10units', '16units', '20units', '30units'], routes: ['subcutaneous'], frequency: ['12 hourly', 'Before meals'], maxDaily: 'Titrate', renalAdjust: true },
  ],
  laxatives: [
    { name: 'Lactulose', genericName: 'Lactulose', doses: ['10ml', '15ml', '20ml', '30ml'], routes: ['oral'], frequency: ['12 hourly', '8 hourly', 'Once daily'], maxDaily: '60ml', renalAdjust: false },
    { name: 'Bisacodyl', genericName: 'Bisacodyl', doses: ['5mg', '10mg'], routes: ['oral', 'rectal'], frequency: ['Once daily', 'At night'], maxDaily: '20mg', renalAdjust: false },
    { name: 'Senna', genericName: 'Senna', doses: ['7.5mg', '15mg'], routes: ['oral'], frequency: ['Once daily', 'At night'], maxDaily: '30mg', renalAdjust: false },
    { name: 'Glycerol Suppository', genericName: 'Glycerol', doses: ['1 suppository', '2 suppository'], routes: ['rectal'], frequency: ['PRN', 'Once daily'], maxDaily: '2 suppositories', renalAdjust: false },
    { name: 'Liquid Paraffin', genericName: 'Mineral Oil', doses: ['10ml', '15ml', '30ml'], routes: ['oral'], frequency: ['Once daily', 'At night'], maxDaily: '45ml', renalAdjust: false },
    { name: 'Macrogol (Movicol)', genericName: 'Polyethylene Glycol', doses: ['1 sachet', '2 sachets', '3 sachets'], routes: ['oral'], frequency: ['Once daily', '12 hourly', '8 hourly'], maxDaily: '8 sachets', renalAdjust: false },
    { name: 'Docusate Sodium', genericName: 'Docusate', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '500mg', renalAdjust: false },
  ],
  antidiarrheals: [
    { name: 'Loperamide', genericName: 'Loperamide', doses: ['2mg'], routes: ['oral'], frequency: ['After each loose stool', '8 hourly'], maxDaily: '16mg', renalAdjust: false },
    { name: 'ORS (Oral Rehydration Salts)', genericName: 'ORS', doses: ['1 sachet in 1L water'], routes: ['oral'], frequency: ['After each stool', 'PRN'], maxDaily: 'As needed', renalAdjust: false },
    { name: 'Diphenoxylate-Atropine', genericName: 'Lomotil', doses: ['2.5mg/0.025mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '20mg', renalAdjust: false },
    { name: 'Racecadotril', genericName: 'Racecadotril', doses: ['100mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '400mg', renalAdjust: false },
  ],
  bronchodilators: [
    { name: 'Salbutamol', genericName: 'Salbutamol/Albuterol', doses: ['2mg', '4mg', '100mcg inhaler', '2.5mg nebules', '5mg nebules'], routes: ['oral', 'inhalation'], frequency: ['6 hourly', '8 hourly', 'PRN'], maxDaily: '32mg oral, 800mcg inhaled', renalAdjust: false },
    { name: 'Ipratropium', genericName: 'Ipratropium Bromide', doses: ['20mcg', '40mcg', '250mcg nebules', '500mcg nebules'], routes: ['inhalation'], frequency: ['6 hourly', '8 hourly'], maxDaily: '2mg nebulized', renalAdjust: false },
    { name: 'Aminophylline', genericName: 'Aminophylline', doses: ['100mg', '225mg', '250mg', '500mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '900mg', renalAdjust: true },
    { name: 'Theophylline', genericName: 'Theophylline', doses: ['100mg', '200mg', '300mg', '400mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '900mg', renalAdjust: true },
    { name: 'Formoterol', genericName: 'Formoterol', doses: ['12mcg', '24mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '48mcg', renalAdjust: false },
    { name: 'Salmeterol', genericName: 'Salmeterol', doses: ['25mcg', '50mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '100mcg', renalAdjust: false },
    { name: 'Tiotropium', genericName: 'Tiotropium', doses: ['18mcg', '5mcg'], routes: ['inhalation'], frequency: ['Once daily'], maxDaily: '18mcg', renalAdjust: false },
  ],
  inhaled_steroids: [
    { name: 'Beclometasone', genericName: 'Beclometasone', doses: ['50mcg', '100mcg', '200mcg', '250mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '2000mcg', renalAdjust: false },
    { name: 'Budesonide', genericName: 'Budesonide', doses: ['100mcg', '200mcg', '400mcg'], routes: ['inhalation'], frequency: ['12 hourly', 'Once daily'], maxDaily: '1600mcg', renalAdjust: false },
    { name: 'Fluticasone', genericName: 'Fluticasone', doses: ['50mcg', '125mcg', '250mcg', '500mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '2000mcg', renalAdjust: false },
    { name: 'Seretide (Fluticasone/Salmeterol)', genericName: 'Fluticasone-Salmeterol', doses: ['100/50mcg', '250/50mcg', '500/50mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '1000/100mcg', renalAdjust: false },
    { name: 'Symbicort (Budesonide/Formoterol)', genericName: 'Budesonide-Formoterol', doses: ['80/4.5mcg', '160/4.5mcg', '320/9mcg'], routes: ['inhalation'], frequency: ['12 hourly'], maxDaily: '640/18mcg', renalAdjust: false },
  ],
  antimalarials: [
    { name: 'Artemether-Lumefantrine', genericName: 'Coartem', doses: ['20/120mg', '40/240mg'], routes: ['oral'], frequency: ['At 0, 8, 24, 36, 48, 60 hours'], maxDaily: '6 doses', renalAdjust: false },
    { name: 'Artesunate', genericName: 'Artesunate', doses: ['50mg', '60mg', '120mg', '2.4mg/kg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['At 0, 12, 24 hours then daily'], maxDaily: '7 days course', renalAdjust: false },
    { name: 'Quinine', genericName: 'Quinine', doses: ['300mg', '600mg', '10mg/kg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly'], maxDaily: '1.8g', renalAdjust: true },
    { name: 'Chloroquine', genericName: 'Chloroquine', doses: ['150mg base', '300mg base'], routes: ['oral'], frequency: ['Weekly prophylaxis', 'Treatment course'], maxDaily: '300mg weekly', renalAdjust: true },
    { name: 'Mefloquine', genericName: 'Mefloquine', doses: ['250mg'], routes: ['oral'], frequency: ['Weekly'], maxDaily: '250mg weekly', renalAdjust: false },
    { name: 'Sulfadoxine-Pyrimethamine', genericName: 'Fansidar', doses: ['500/25mg'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '3 tablets', renalAdjust: true },
    { name: 'Proguanil', genericName: 'Proguanil', doses: ['100mg', '200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: true },
    { name: 'Atovaquone-Proguanil', genericName: 'Malarone', doses: ['250/100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
  ],
  antiparasitics: [
    { name: 'Albendazole', genericName: 'Albendazole', doses: ['200mg', '400mg'], routes: ['oral'], frequency: ['Once only', '12 hourly'], maxDaily: '800mg', renalAdjust: false },
    { name: 'Mebendazole', genericName: 'Mebendazole', doses: ['100mg', '500mg'], routes: ['oral'], frequency: ['12 hourly', 'Once only'], maxDaily: '1g', renalAdjust: false },
    { name: 'Ivermectin', genericName: 'Ivermectin', doses: ['3mg', '6mg', '12mg', '200mcg/kg'], routes: ['oral'], frequency: ['Once only', 'Weekly'], maxDaily: '12mg', renalAdjust: false },
    { name: 'Praziquantel', genericName: 'Praziquantel', doses: ['600mg', '40mg/kg'], routes: ['oral'], frequency: ['Single dose', '8 hourly'], maxDaily: '60mg/kg', renalAdjust: false },
    { name: 'Levamisole', genericName: 'Levamisole', doses: ['40mg', '150mg'], routes: ['oral'], frequency: ['Once only'], maxDaily: '150mg', renalAdjust: false },
    { name: 'Niclosamide', genericName: 'Niclosamide', doses: ['500mg', '1g', '2g'], routes: ['oral'], frequency: ['Single dose'], maxDaily: '2g', renalAdjust: false },
    { name: 'Permethrin', genericName: 'Permethrin', doses: ['5% cream', '1% lotion'], routes: ['topical'], frequency: ['Once only', 'Repeat after 7 days'], maxDaily: 'As directed', renalAdjust: false },
  ],
  antiretrovirals: [
    { name: 'TLD (Tenofovir/Lamivudine/Dolutegravir)', genericName: 'TDF/3TC/DTG', doses: ['300/300/50mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
    { name: 'Tenofovir/Lamivudine', genericName: 'TDF/3TC', doses: ['300/300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
    { name: 'Tenofovir/Emtricitabine', genericName: 'TDF/FTC', doses: ['300/200mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: true },
    { name: 'Efavirenz', genericName: 'Efavirenz', doses: ['200mg', '400mg', '600mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '600mg', renalAdjust: false },
    { name: 'Nevirapine', genericName: 'Nevirapine', doses: ['200mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily lead-in'], maxDaily: '400mg', renalAdjust: false },
    { name: 'Atazanavir/Ritonavir', genericName: 'ATV/r', doses: ['300/100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
    { name: 'Lopinavir/Ritonavir', genericName: 'LPV/r', doses: ['200/50mg', '400/100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '800/200mg', renalAdjust: false },
    { name: 'Dolutegravir', genericName: 'Dolutegravir', doses: ['50mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '100mg', renalAdjust: false },
    { name: 'Abacavir/Lamivudine', genericName: 'ABC/3TC', doses: ['600/300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1 tablet', renalAdjust: false },
    { name: 'Zidovudine/Lamivudine', genericName: 'AZT/3TC', doses: ['300/150mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '2 tablets', renalAdjust: true },
  ],
  antituberculosis: [
    { name: 'Rifampicin', genericName: 'Rifampicin', doses: ['150mg', '300mg', '450mg', '600mg'], routes: ['oral', 'intravenous'], frequency: ['Once daily'], maxDaily: '600mg', renalAdjust: false },
    { name: 'Isoniazid', genericName: 'Isoniazid', doses: ['100mg', '300mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '300mg', renalAdjust: false },
    { name: 'Pyrazinamide', genericName: 'Pyrazinamide', doses: ['400mg', '500mg', '750mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '2g', renalAdjust: true },
    { name: 'Ethambutol', genericName: 'Ethambutol', doses: ['400mg', '800mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '1.6g', renalAdjust: true },
    { name: 'RHZE (Fixed Dose)', genericName: '4-drug combo', doses: ['150/75/400/275mg'], routes: ['oral'], frequency: ['Once daily by weight'], maxDaily: 'Weight-based', renalAdjust: true },
    { name: 'RH (Fixed Dose)', genericName: '2-drug combo', doses: ['150/75mg', '300/150mg'], routes: ['oral'], frequency: ['Once daily by weight'], maxDaily: 'Weight-based', renalAdjust: false },
    { name: 'Streptomycin', genericName: 'Streptomycin', doses: ['750mg', '1g', '15mg/kg'], routes: ['intramuscular'], frequency: ['Once daily'], maxDaily: '1g', renalAdjust: true },
  ],
  sedatives: [
    { name: 'Diazepam', genericName: 'Diazepam', doses: ['2mg', '5mg', '10mg'], routes: ['oral', 'intravenous', 'intramuscular', 'rectal'], frequency: ['6 hourly', '8 hourly', '12 hourly', 'PRN'], maxDaily: '40mg', renalAdjust: false },
    { name: 'Lorazepam', genericName: 'Lorazepam', doses: ['0.5mg', '1mg', '2mg', '4mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['8 hourly', '12 hourly', 'PRN'], maxDaily: '10mg', renalAdjust: false },
    { name: 'Midazolam', genericName: 'Midazolam', doses: ['1mg', '2mg', '5mg', '7.5mg', '15mg'], routes: ['oral', 'intravenous', 'intramuscular', 'intranasal'], frequency: ['PRN', 'Once only'], maxDaily: '15mg', renalAdjust: true },
    { name: 'Clonazepam', genericName: 'Clonazepam', doses: ['0.25mg', '0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '20mg', renalAdjust: false },
    { name: 'Zolpidem', genericName: 'Zolpidem', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['At night'], maxDaily: '10mg', renalAdjust: false },
    { name: 'Zopiclone', genericName: 'Zopiclone', doses: ['3.75mg', '7.5mg'], routes: ['oral'], frequency: ['At night'], maxDaily: '7.5mg', renalAdjust: true },
    { name: 'Nitrazepam', genericName: 'Nitrazepam', doses: ['5mg', '10mg'], routes: ['oral'], frequency: ['At night'], maxDaily: '10mg', renalAdjust: false },
    { name: 'Phenobarbital', genericName: 'Phenobarbital', doses: ['30mg', '60mg', '100mg', '200mg'], routes: ['oral', 'intravenous', 'intramuscular'], frequency: ['Once daily', '12 hourly'], maxDaily: '300mg', renalAdjust: true },
  ],
  antipsychotics: [
    { name: 'Haloperidol', genericName: 'Haloperidol', doses: ['0.5mg', '1.5mg', '5mg', '10mg'], routes: ['oral', 'intramuscular', 'intravenous'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '100mg', renalAdjust: false },
    { name: 'Chlorpromazine', genericName: 'Chlorpromazine', doses: ['25mg', '50mg', '100mg'], routes: ['oral', 'intramuscular'], frequency: ['6 hourly', '8 hourly'], maxDaily: '1g', renalAdjust: false },
    { name: 'Risperidone', genericName: 'Risperidone', doses: ['0.5mg', '1mg', '2mg', '3mg', '4mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '16mg', renalAdjust: true },
    { name: 'Olanzapine', genericName: 'Olanzapine', doses: ['2.5mg', '5mg', '10mg', '15mg', '20mg'], routes: ['oral', 'intramuscular'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
    { name: 'Quetiapine', genericName: 'Quetiapine', doses: ['25mg', '50mg', '100mg', '200mg', '300mg'], routes: ['oral'], frequency: ['12 hourly', 'Once daily'], maxDaily: '800mg', renalAdjust: false },
    { name: 'Aripiprazole', genericName: 'Aripiprazole', doses: ['5mg', '10mg', '15mg', '30mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '30mg', renalAdjust: false },
  ],
  antidepressants: [
    { name: 'Amitriptyline', genericName: 'Amitriptyline', doses: ['10mg', '25mg', '50mg', '75mg'], routes: ['oral'], frequency: ['Once daily at night', '12 hourly'], maxDaily: '200mg', renalAdjust: false },
    { name: 'Imipramine', genericName: 'Imipramine', doses: ['10mg', '25mg', '50mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '300mg', renalAdjust: false },
    { name: 'Fluoxetine', genericName: 'Fluoxetine', doses: ['10mg', '20mg', '40mg', '60mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '80mg', renalAdjust: false },
    { name: 'Sertraline', genericName: 'Sertraline', doses: ['25mg', '50mg', '100mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '200mg', renalAdjust: false },
    { name: 'Escitalopram', genericName: 'Escitalopram', doses: ['5mg', '10mg', '20mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '20mg', renalAdjust: false },
    { name: 'Paroxetine', genericName: 'Paroxetine', doses: ['10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '60mg', renalAdjust: true },
    { name: 'Citalopram', genericName: 'Citalopram', doses: ['10mg', '20mg', '40mg'], routes: ['oral'], frequency: ['Once daily'], maxDaily: '40mg', renalAdjust: false },
    { name: 'Venlafaxine', genericName: 'Venlafaxine', doses: ['37.5mg', '75mg', '150mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '375mg', renalAdjust: true },
    { name: 'Mirtazapine', genericName: 'Mirtazapine', doses: ['15mg', '30mg', '45mg'], routes: ['oral'], frequency: ['Once daily at night'], maxDaily: '45mg', renalAdjust: true },
  ],
  anticonvulsants: [
    { name: 'Phenytoin', genericName: 'Phenytoin', doses: ['50mg', '100mg', '300mg', '15-20mg/kg loading'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly', 'Once daily'], maxDaily: '600mg', renalAdjust: false },
    { name: 'Carbamazepine', genericName: 'Carbamazepine', doses: ['100mg', '200mg', '400mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '1.6g', renalAdjust: false },
    { name: 'Sodium Valproate', genericName: 'Valproic Acid', doses: ['200mg', '300mg', '500mg'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '2.5g', renalAdjust: false },
    { name: 'Levetiracetam', genericName: 'Levetiracetam', doses: ['250mg', '500mg', '750mg', '1000mg'], routes: ['oral', 'intravenous'], frequency: ['12 hourly'], maxDaily: '3g', renalAdjust: true },
    { name: 'Lamotrigine', genericName: 'Lamotrigine', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['oral'], frequency: ['Once daily', '12 hourly'], maxDaily: '400mg', renalAdjust: false },
    { name: 'Topiramate', genericName: 'Topiramate', doses: ['25mg', '50mg', '100mg', '200mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '400mg', renalAdjust: true },
    { name: 'Gabapentin', genericName: 'Gabapentin', doses: ['100mg', '300mg', '400mg', '600mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '3.6g', renalAdjust: true },
    { name: 'Pregabalin', genericName: 'Pregabalin', doses: ['25mg', '50mg', '75mg', '150mg', '300mg'], routes: ['oral'], frequency: ['12 hourly', '8 hourly'], maxDaily: '600mg', renalAdjust: true },
    { name: 'Clonazepam', genericName: 'Clonazepam', doses: ['0.5mg', '1mg', '2mg'], routes: ['oral'], frequency: ['8 hourly', '12 hourly'], maxDaily: '20mg', renalAdjust: false },
  ],
  muscleTissue: [
    { name: 'Baclofen', genericName: 'Baclofen', doses: ['5mg', '10mg', '25mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '100mg', renalAdjust: true },
    { name: 'Tizanidine', genericName: 'Tizanidine', doses: ['2mg', '4mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '36mg', renalAdjust: true },
    { name: 'Carisoprodol', genericName: 'Carisoprodol', doses: ['250mg', '350mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '1400mg', renalAdjust: false },
    { name: 'Orphenadrine', genericName: 'Orphenadrine', doses: ['100mg'], routes: ['oral'], frequency: ['12 hourly'], maxDaily: '200mg', renalAdjust: false },
    { name: 'Methocarbamol', genericName: 'Methocarbamol', doses: ['500mg', '750mg', '1g', '1.5g'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '4g oral, 3g IV', renalAdjust: false },
    { name: 'Dantrolene', genericName: 'Dantrolene', doses: ['25mg', '50mg', '100mg'], routes: ['oral', 'intravenous'], frequency: ['6 hourly', '8 hourly'], maxDaily: '400mg', renalAdjust: false },
    { name: 'Tolperisone', genericName: 'Tolperisone', doses: ['50mg', '150mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '450mg', renalAdjust: true },
    { name: 'Eperisone', genericName: 'Eperisone', doses: ['50mg'], routes: ['oral'], frequency: ['8 hourly'], maxDaily: '150mg', renalAdjust: false },
  ],
  eyePreparations: [
    { name: 'Chloramphenicol Eye Drops', genericName: 'Chloramphenicol', doses: ['0.5%'], routes: ['ophthalmic'], frequency: ['2 hourly', '4 hourly', '6 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Ciprofloxacin Eye Drops', genericName: 'Ciprofloxacin', doses: ['0.3%'], routes: ['ophthalmic'], frequency: ['2 hourly', '4 hourly', '6 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Moxifloxacin Eye Drops', genericName: 'Moxifloxacin', doses: ['0.5%'], routes: ['ophthalmic'], frequency: ['8 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Ofloxacin Eye Drops', genericName: 'Ofloxacin', doses: ['0.3%'], routes: ['ophthalmic'], frequency: ['4 hourly', '6 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Gentamicin Eye Drops', genericName: 'Gentamicin', doses: ['0.3%'], routes: ['ophthalmic'], frequency: ['4 hourly', '6 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Prednisolone Eye Drops', genericName: 'Prednisolone', doses: ['0.5%', '1%'], routes: ['ophthalmic'], frequency: ['4 hourly', '6 hourly', '2 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Dexamethasone Eye Drops', genericName: 'Dexamethasone', doses: ['0.1%'], routes: ['ophthalmic'], frequency: ['4 hourly', '6 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Timolol Eye Drops', genericName: 'Timolol', doses: ['0.25%', '0.5%'], routes: ['ophthalmic'], frequency: ['12 hourly'], maxDaily: '1 drop each eye BD', renalAdjust: false },
    { name: 'Latanoprost Eye Drops', genericName: 'Latanoprost', doses: ['0.005%'], routes: ['ophthalmic'], frequency: ['Once daily at night'], maxDaily: '1 drop each eye', renalAdjust: false },
    { name: 'Atropine Eye Drops', genericName: 'Atropine', doses: ['0.5%', '1%'], routes: ['ophthalmic'], frequency: ['12 hourly', '8 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Tropicamide Eye Drops', genericName: 'Tropicamide', doses: ['0.5%', '1%'], routes: ['ophthalmic'], frequency: ['PRN', 'For examination'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Artificial Tears', genericName: 'Hypromellose', doses: ['0.3%', '0.5%'], routes: ['ophthalmic'], frequency: ['PRN', '4 hourly', '6 hourly'], maxDaily: 'As needed', renalAdjust: false },
  ],
  topicalAgents: [
    { name: 'Fusidic Acid Cream', genericName: 'Fusidic Acid', doses: ['2%'], routes: ['topical'], frequency: ['8 hourly', '12 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Mupirocin Ointment', genericName: 'Mupirocin', doses: ['2%'], routes: ['topical'], frequency: ['8 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Silver Sulfadiazine Cream', genericName: 'Silver Sulfadiazine', doses: ['1%'], routes: ['topical'], frequency: ['Once daily', '12 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Neomycin-Bacitracin Ointment', genericName: 'Neomycin-Bacitracin', doses: ['1 application'], routes: ['topical'], frequency: ['8 hourly', '12 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Betamethasone Cream', genericName: 'Betamethasone Valerate', doses: ['0.025%', '0.1%'], routes: ['topical'], frequency: ['12 hourly', 'Once daily'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Hydrocortisone Cream', genericName: 'Hydrocortisone', doses: ['0.5%', '1%', '2.5%'], routes: ['topical'], frequency: ['12 hourly', '8 hourly'], maxDaily: 'As directed', renalAdjust: false },
    { name: 'Clobetasol Cream', genericName: 'Clobetasol Propionate', doses: ['0.05%'], routes: ['topical'], frequency: ['12 hourly'], maxDaily: '50g per week', renalAdjust: false },
    { name: 'Calamine Lotion', genericName: 'Calamine', doses: ['1 application'], routes: ['topical'], frequency: ['PRN', '6 hourly'], maxDaily: 'As needed', renalAdjust: false },
    { name: 'Zinc Oxide Ointment', genericName: 'Zinc Oxide', doses: ['15%', '25%'], routes: ['topical'], frequency: ['PRN', '8 hourly'], maxDaily: 'As needed', renalAdjust: false },
    { name: 'Povidone-Iodine', genericName: 'Povidone-Iodine', doses: ['5%', '10%'], routes: ['topical'], frequency: ['PRN', 'Before procedures'], maxDaily: 'As needed', renalAdjust: false },
    { name: 'Chlorhexidine', genericName: 'Chlorhexidine Gluconate', doses: ['0.5%', '4%'], routes: ['topical'], frequency: ['PRN', 'Before procedures'], maxDaily: 'As needed', renalAdjust: false },
  ],
  others: [
    { name: 'Adrenaline (Epinephrine)', genericName: 'Epinephrine', doses: ['0.5mg', '1mg', '1:1000', '1:10000'], routes: ['intramuscular', 'intravenous', 'subcutaneous'], frequency: ['PRN', 'Every 3-5 mins'], maxDaily: 'Titrate', renalAdjust: false },
    { name: 'Atropine', genericName: 'Atropine', doses: ['0.5mg', '1mg', '0.6mg'], routes: ['intravenous', 'intramuscular'], frequency: ['PRN', 'Every 3-5 mins'], maxDaily: '3mg', renalAdjust: false },
    { name: 'Dopamine', genericName: 'Dopamine', doses: ['2-20mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'Titrate', renalAdjust: true },
    { name: 'Dobutamine', genericName: 'Dobutamine', doses: ['2.5-20mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'Titrate', renalAdjust: false },
    { name: 'Noradrenaline', genericName: 'Norepinephrine', doses: ['0.05-0.5mcg/kg/min'], routes: ['intravenous'], frequency: ['Continuous infusion'], maxDaily: 'Titrate', renalAdjust: false },
    { name: 'Sodium Chloride 0.9%', genericName: 'Normal Saline', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['As prescribed'], maxDaily: 'As needed', renalAdjust: true },
    { name: 'Ringer Lactate', genericName: 'Lactated Ringers', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['As prescribed'], maxDaily: 'As needed', renalAdjust: true },
    { name: 'Dextrose 5%', genericName: '5% Dextrose', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['As prescribed'], maxDaily: 'As needed', renalAdjust: false },
    { name: 'Dextrose Saline', genericName: '4.3% Dextrose in 0.18% Saline', doses: ['500ml', '1000ml'], routes: ['intravenous'], frequency: ['As prescribed'], maxDaily: 'As needed', renalAdjust: false },
    { name: 'Mannitol', genericName: 'Mannitol', doses: ['20%', '0.5-1g/kg'], routes: ['intravenous'], frequency: ['6 hourly', '8 hourly', 'Once'], maxDaily: '2g/kg', renalAdjust: true },
    { name: 'Tranexamic Acid', genericName: 'Tranexamic Acid', doses: ['500mg', '1g'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly'], maxDaily: '4g', renalAdjust: true },
    { name: 'Oxytocin', genericName: 'Oxytocin', doses: ['5units', '10units', '20units'], routes: ['intramuscular', 'intravenous'], frequency: ['PRN', 'Infusion'], maxDaily: 'Titrate', renalAdjust: false },
    { name: 'Misoprostol (Obstetric)', genericName: 'Misoprostol', doses: ['200mcg', '400mcg', '600mcg', '800mcg'], routes: ['oral', 'sublingual', 'rectal', 'vaginal'], frequency: ['Single dose', 'Every 4 hours'], maxDaily: '800mcg', renalAdjust: false },
    { name: 'Ergometrine', genericName: 'Ergometrine', doses: ['0.2mg', '0.5mg'], routes: ['intramuscular', 'intravenous'], frequency: ['PRN'], maxDaily: '1mg', renalAdjust: false },
    { name: 'Naloxone', genericName: 'Naloxone', doses: ['0.4mg', '0.8mg', '2mg'], routes: ['intravenous', 'intramuscular', 'subcutaneous', 'intranasal'], frequency: ['Every 2-3 mins PRN'], maxDaily: 'Titrate', renalAdjust: false },
    { name: 'Flumazenil', genericName: 'Flumazenil', doses: ['0.2mg', '0.5mg', '1mg'], routes: ['intravenous'], frequency: ['Every 1 min PRN'], maxDaily: '5mg', renalAdjust: false },
    { name: 'Neostigmine', genericName: 'Neostigmine', doses: ['0.5mg', '2.5mg'], routes: ['intravenous', 'intramuscular'], frequency: ['PRN'], maxDaily: '5mg', renalAdjust: true },
    { name: 'Pyridostigmine', genericName: 'Pyridostigmine', doses: ['60mg'], routes: ['oral'], frequency: ['6 hourly', '8 hourly'], maxDaily: '360mg', renalAdjust: true },
    { name: 'Potassium Chloride', genericName: 'Potassium Chloride', doses: ['600mg', '10mEq', '20mEq', '40mEq'], routes: ['oral', 'intravenous'], frequency: ['8 hourly', '12 hourly', 'Infusion'], maxDaily: '200mEq', renalAdjust: true },
    { name: 'Sodium Bicarbonate', genericName: 'Sodium Bicarbonate', doses: ['500mg', '1mEq/kg', '8.4%'], routes: ['oral', 'intravenous'], frequency: ['PRN', '6 hourly'], maxDaily: 'Titrate to pH', renalAdjust: true },
  ],
};

// Helper function to calculate doses per day from frequency
const getFrequencyMultiplier = (frequency: string): number => {
  const freq = frequency.toLowerCase();
  if (freq.includes('4 hourly') || freq.includes('qid') || freq.includes('q4h')) return 6;
  if (freq.includes('6 hourly') || freq.includes('qds') || freq.includes('q6h')) return 4;
  if (freq.includes('8 hourly') || freq.includes('tds') || freq.includes('tid') || freq.includes('q8h')) return 3;
  if (freq.includes('12 hourly') || freq.includes('bd') || freq.includes('bid') || freq.includes('q12h')) return 2;
  if (freq.includes('once daily') || freq.includes('od') || freq.includes('daily') || freq.includes('24 hourly') || freq.includes('at night')) return 1;
  if (freq.includes('weekly') || freq.includes('once weekly')) return 0.14; // ~1/7 per day
  if (freq.includes('monthly')) return 0.03; // ~1/30 per day
  if (freq.includes('prn') || freq.includes('stat') || freq.includes('once only') || freq.includes('single dose')) return 1; // default to 1 for PRN
  if (freq.includes('before meals')) return 3; // TID before meals
  if (freq.includes('after each') || freq.includes('after each stool')) return 4; // estimate 4 times
  // Default: try to extract from pattern like "3 times daily"
  const match = freq.match(/(\d+)\s*(times|x)/i);
  if (match) return parseInt(match[1]);
  return 1; // default
};

// Helper function to parse duration into days
const getDurationInDays = (duration: string): number => {
  const dur = duration.toLowerCase().trim();
  
  // Match patterns like "5 days", "5days", "5 day", "5day"
  const dayMatch = dur.match(/^(\d+)\s*days?$/i);
  if (dayMatch) return parseInt(dayMatch[1]);
  
  // Match patterns like "1 week", "2 weeks"
  const weekMatch = dur.match(/^(\d+)\s*weeks?$/i);
  if (weekMatch) return parseInt(weekMatch[1]) * 7;
  
  // Match patterns like "1 month", "2 months"
  const monthMatch = dur.match(/^(\d+)\s*months?$/i);
  if (monthMatch) return parseInt(monthMatch[1]) * 30;
  
  // Single words
  if (dur === 'stat' || dur === 'once' || dur === 'single dose' || dur === 'once only') return 1;
  if (dur === 'continuous' || dur === 'ongoing' || dur === 'long-term') return 30;
  
  // Try to extract just a number (assume days)
  const numMatch = dur.match(/^(\d+)$/);
  if (numMatch) return parseInt(numMatch[1]);
  
  return 0; // Return 0 if can't parse (user should enter quantity manually)
};

// Calculate quantity automatically
const calculateQuantity = (frequency: string, duration: string): number => {
  const dosesPerDay = getFrequencyMultiplier(frequency);
  const days = getDurationInDays(duration);
  
  if (dosesPerDay === 0 || days === 0) return 0;
  
  const calculated = Math.ceil(dosesPerDay * days);
  return calculated > 0 ? calculated : 1;
};

const medicationCategories = [
  { value: 'analgesics', label: 'Analgesics/Pain Relief' },
  { value: 'antibiotics', label: 'Antibiotics' },
  { value: 'antiinflammatories', label: 'Anti-inflammatory/Steroids' },
  { value: 'vitamins', label: 'Vitamins & Minerals' },
  { value: 'anticoagulants', label: 'Anticoagulants/Antiplatelets' },
  { value: 'antipyretics', label: 'Antipyretics' },
  { value: 'antifungals', label: 'Antifungals' },
  { value: 'antihistamines', label: 'Antihistamines/Allergy' },
  { value: 'antacids', label: 'Antacids/PPIs/H2 Blockers' },
  { value: 'antiemetics', label: 'Antiemetics' },
  { value: 'antihypertensives', label: 'Antihypertensives/Cardiac' },
  { value: 'antidiabetics', label: 'Antidiabetics/Insulin' },
  { value: 'laxatives', label: 'Laxatives' },
  { value: 'antidiarrheals', label: 'Antidiarrheals' },
  { value: 'bronchodilators', label: 'Bronchodilators/Respiratory' },
  { value: 'inhaled_steroids', label: 'Inhaled Steroids/Combinations' },
  { value: 'antimalarials', label: 'Antimalarials' },
  { value: 'antiparasitics', label: 'Antiparasitics/Anthelmintics' },
  { value: 'antiretrovirals', label: 'Antiretrovirals (ARVs)' },
  { value: 'antituberculosis', label: 'Anti-TB Drugs' },
  { value: 'sedatives', label: 'Sedatives/Anxiolytics' },
  { value: 'antipsychotics', label: 'Antipsychotics' },
  { value: 'antidepressants', label: 'Antidepressants' },
  { value: 'anticonvulsants', label: 'Anticonvulsants/Epilepsy' },
  { value: 'muscleTissue', label: 'Muscle Relaxants' },
  { value: 'eyePreparations', label: 'Eye Preparations' },
  { value: 'topicalAgents', label: 'Topical Agents/Skin' },
  { value: 'others', label: 'Others/IV Fluids/Emergency' },
];

const routes: { value: MedicationRoute; label: string }[] = [
  { value: 'oral', label: 'Oral (PO)' },
  { value: 'intravenous', label: 'Intravenous (IV)' },
  { value: 'intramuscular', label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous (SC)' },
  { value: 'topical', label: 'Topical' },
  { value: 'rectal', label: 'Rectal (PR)' },
  { value: 'inhalation', label: 'Inhalation' },
  { value: 'sublingual', label: 'Sublingual' },
  { value: 'ophthalmic', label: 'Ophthalmic' },
  { value: 'otic', label: 'Otic' },
];

const prescriptionSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  notes: z.string().optional(),
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

interface MedicationEntry {
  id: string;
  category: string;
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  route: MedicationRoute;
  duration: string;
  quantity: number;
  instructions: string;
}

export default function PharmacyPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [currentMed, setCurrentMed] = useState<Partial<MedicationEntry>>({
    category: 'analgesics',
    route: 'oral',
    quantity: 1,
  });

  const prescriptions = useLiveQuery(() => db.prescriptions.orderBy('prescribedAt').reverse().toArray(), []);
  
  // Use the new patient map hook for efficient lookups
  const patientMap = usePatientMap();

  // Track selected patient's GFR for renal dosing
  const [patientGFR, setPatientGFR] = useState<GFRResult | null>(null);
  const [renalDosingWarnings, setRenalDosingWarnings] = useState<RenalDosingResult[]>([]);
  
  // Watch patientId to fetch GFR
  const selectedPatientId = watch('patientId');
  
  // Fetch patient GFR when patient is selected
  useEffect(() => {
    const fetchPatientGFR = async () => {
      if (!selectedPatientId) {
        setPatientGFR(null);
        return;
      }
      try {
        const gfr = await getGFRForPatient(selectedPatientId);
        setPatientGFR(gfr);
      } catch (error) {
        console.error('Error fetching patient GFR:', error);
        setPatientGFR(null);
      }
    };
    fetchPatientGFR();
  }, [selectedPatientId]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
  });

  const availableMeds = useMemo(() => {
    if (!currentMed.category) return [];
    return medicationDatabase[currentMed.category as keyof typeof medicationDatabase] || [];
  }, [currentMed.category]);

  const selectedMedInfo = useMemo(() => {
    return availableMeds.find(m => m.name === currentMed.name);
  }, [availableMeds, currentMed.name]);

  // Get renal dosing recommendation for selected medication
  const currentRenalDosing = useMemo((): RenalDosingResult | null => {
    if (!selectedMedInfo || !patientGFR) return null;
    try {
      const drugName = selectedMedInfo.genericName || selectedMedInfo.name;
      return getDrugDosingRecommendation(drugName.toLowerCase().replace(/\s+/g, '_'), patientGFR.gfr);
    } catch {
      return null;
    }
  }, [selectedMedInfo, patientGFR]);

  const addMedication = () => {
    if (!currentMed.name || !currentMed.dosage || !currentMed.frequency || !currentMed.duration) {
      toast.error('Please fill in all medication fields');
      return;
    }

    const med: MedicationEntry = {
      id: uuidv4(),
      category: currentMed.category || 'others',
      name: currentMed.name,
      genericName: selectedMedInfo?.genericName || currentMed.name,
      dosage: currentMed.dosage,
      frequency: currentMed.frequency,
      route: currentMed.route || 'oral',
      duration: currentMed.duration,
      quantity: currentMed.quantity || 1,
      instructions: currentMed.instructions || '',
    };

    setMedications([...medications, med]);
    setCurrentMed({
      category: 'analgesics',
      route: 'oral',
      quantity: 1,
    });
  };

  const removeMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id));
  };

  const filteredPrescriptions = useMemo(() => {
    if (!prescriptions) return [];
    return prescriptions.filter((rx) => {
      const patient = patientMap.get(rx.patientId);
      const matchesSearch = searchQuery === '' ||
        (patient && `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || rx.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [prescriptions, searchQuery, statusFilter, patientMap]);

  const onSubmit = async (data: PrescriptionFormData) => {
    if (!user || medications.length === 0) {
      toast.error('Please add at least one medication');
      return;
    }

    try {
      const meds: Medication[] = medications.map(med => ({
        id: med.id,
        name: med.name,
        genericName: med.genericName,
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route,
        duration: med.duration,
        quantity: med.quantity,
        instructions: med.instructions,
        isDispensed: false,
      }));

      const prescription: Prescription = {
        id: uuidv4(),
        patientId: data.patientId,
        hospitalId: user.hospitalId || 'hospital-1',
        medications: meds,
        status: 'pending',
        prescribedBy: user.id,
        prescribedAt: new Date(),
        notes: data.notes,
      };

      await db.prescriptions.add(prescription);
      await syncRecord('prescriptions', prescription as unknown as Record<string, unknown>);
      toast.success('Prescription created successfully!');
      setShowModal(false);
      setMedications([]);
      reset();
    } catch (error) {
      console.error('Error creating prescription:', error);
      toast.error('Failed to create prescription');
    }
  };

  const getStatusBadge = (status: Prescription['status']) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
      case 'dispensed':
        return <span className="badge badge-success"><CheckCircle size={12} /> Dispensed</span>;
      case 'partially_dispensed':
        return <span className="badge badge-info"><AlertTriangle size={12} /> Partial</span>;
      case 'cancelled':
        return <span className="badge badge-danger"><X size={12} /> Cancelled</span>;
      default:
        return null;
    }
  };

  const handleExportPrescription = async (prescription: Prescription) => {
    const patient = patientMap.get(prescription.patientId);
    if (!patient) {
      toast.error('Patient information not found');
      return;
    }

    try {
      // Get prescriber info
      const prescriber = await db.users.get(prescription.prescribedBy);
      
      generatePrescriptionPDF({
        prescriptionId: prescription.id,
        prescribedDate: new Date(prescription.prescribedAt),
        patient: {
          name: `${patient.firstName} ${patient.lastName}`,
          hospitalNumber: patient.hospitalNumber,
          age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
          gender: patient.gender,
          phone: patient.phone,
          address: patient.address,
        },
        hospitalName: 'AstroHEALTH Innovations in Healthcare',
        hospitalPhone: '+234 902 872 4839',
        hospitalEmail: 'info.astrohealth@gmail.com',
        prescribedBy: prescriber ? `${prescriber.firstName} ${prescriber.lastName}`  : 'Unknown',
        prescriberTitle: prescriber?.role || 'Doctor',
        medications: prescription.medications.map(med => ({
          name: med.name,
          genericName: med.genericName,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route,
          duration: med.duration,
          quantity: med.quantity,
          instructions: med.instructions,
          isDispensed: med.isDispensed,
        })),
        status: prescription.status,
        notes: prescription.notes,
      });

      toast.success('Prescription PDF downloaded');
    } catch (error) {
      console.error('Error generating prescription PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleExportDispensingSlip = async (prescription: Prescription) => {
    const patient = patientMap.get(prescription.patientId);
    if (!patient) {
      toast.error('Patient information not found');
      return;
    }

    try {
      const prescriber = await db.users.get(prescription.prescribedBy);
      
      generateDispensingSlipPDF({
        prescriptionId: prescription.id,
        prescribedDate: new Date(prescription.prescribedAt),
        patient: {
          name: `${patient.firstName} ${patient.lastName}`,
          hospitalNumber: patient.hospitalNumber,
        },
        hospitalName: 'AstroHEALTH Innovations in Healthcare',
        prescribedBy: prescriber ? `${prescriber.firstName} ${prescriber.lastName}` : 'Unknown',
        medications: prescription.medications.map(med => ({
          name: med.name,
          genericName: med.genericName,
          dosage: med.dosage,
          frequency: med.frequency,
          route: med.route,
          duration: med.duration,
          quantity: med.quantity,
          instructions: med.instructions,
          isDispensed: med.isDispensed,
        })),
        status: prescription.status,
        dispensedBy: user ? `${user.firstName} ${user.lastName}` : undefined,
        dispensedAt: prescription.dispensedAt ? new Date(prescription.dispensedAt) : undefined,
      });

      toast.success('Dispensing slip PDF downloaded');
    } catch (error) {
      console.error('Error generating dispensing slip:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleExportDrugInformation = async (prescription: Prescription) => {
    const patient = patientMap.get(prescription.patientId);
    if (!patient) {
      toast.error('Patient information not found');
      return;
    }

    try {
      const prescriber = await db.users.get(prescription.prescribedBy);
      
      // Build comprehensive drug information data
      await downloadDrugInformationPDF({
        patientName: `${patient.firstName} ${patient.lastName}`,
        hospitalNumber: patient.hospitalNumber,
        hospitalName: 'AstroHEALTH Innovations in Healthcare',
        prescribedBy: prescriber ? `${prescriber.firstName} ${prescriber.lastName}` : 'Unknown',
        prescriptionDate: new Date(prescription.prescribedAt),
        medications: prescription.medications.map(med => ({
          genericName: (med.genericName || med.name) as string,
          brandName: med.name,
          dosage: med.dosage,
          route: med.route,
          frequency: med.frequency,
          duration: med.duration || 'As directed',
          indication: med.instructions || 'As prescribed by your doctor',
          
          // Common side effects based on medication category
          commonSideEffects: getCommonSideEffects(med.name),
          
          // Serious side effects that require immediate medical attention
          seriousSideEffects: getSeriousSideEffects(med.name),
          
          // Warnings and precautions
          warnings: getWarnings(med.name),
          precautions: getPrecautions(med.name),
          contraindications: getContraindications(med.name),
          
          // Drug and food interactions
          drugInteractions: getDrugInteractions(med.name),
          foodInteractions: getFoodInteractions(med.name),
          
          // Patient instructions
          howToTake: getHowToTake(med.route, med.name),
          whatToAvoid: getWhatToAvoid(med.name),
          whenToSeekHelp: getWhenToSeekHelp(med.name),
          
          // Storage instructions
          storage: getStorageInstructions(med.name),
          
          // Refill guidelines
          refillGuidelines: [
            'Do not refill without consulting your doctor',
            'Schedule follow-up before medication runs out',
            'Report any side effects to your healthcare provider',
            'Bring empty containers to your appointment',
          ],
        })),
      });

      toast.success('Drug information sheet downloaded successfully');
    } catch (error) {
      console.error('Error generating drug information PDF:', error);
      toast.error('Failed to generate drug information sheet');
    }
  };

  // Helper functions for drug information
  const getCommonSideEffects = (medicationName: string): string[] => {
    const lowerName = medicationName.toLowerCase();
    
    if (lowerName.includes('paracetamol') || lowerName.includes('acetaminophen')) {
      return ['Mild nausea', 'Stomach upset (rare)'];
    } else if (lowerName.includes('ibuprofen') || lowerName.includes('diclofenac')) {
      return ['Stomach upset', 'Heartburn', 'Nausea', 'Dizziness', 'Headache'];
    } else if (lowerName.includes('tramadol')) {
      return ['Dizziness', 'Drowsiness', 'Nausea', 'Constipation', 'Headache', 'Dry mouth'];
    } else if (lowerName.includes('morphine')) {
      return ['Drowsiness', 'Constipation', 'Nausea', 'Vomiting', 'Dizziness'];
    } else if (lowerName.includes('amoxicillin') || lowerName.includes('clavulanate')) {
      return ['Diarrhea', 'Nausea', 'Skin rash', 'Stomach upset'];
    } else if (lowerName.includes('ceftriaxone') || lowerName.includes('cefuroxime')) {
      return ['Diarrhea', 'Nausea', 'Injection site reactions', 'Headache'];
    } else if (lowerName.includes('ciprofloxacin')) {
      return ['Nausea', 'Diarrhea', 'Dizziness', 'Headache', 'Trouble sleeping'];
    } else if (lowerName.includes('metronidazole')) {
      return ['Metallic taste', 'Nausea', 'Loss of appetite', 'Headache'];
    } else if (lowerName.includes('gentamicin')) {
      return ['Injection site pain', 'Nausea', 'Vomiting'];
    } else if (lowerName.includes('azithromycin')) {
      return ['Diarrhea', 'Nausea', 'Abdominal pain', 'Headache'];
    } else if (lowerName.includes('prednisolone') || lowerName.includes('dexamethasone')) {
      return ['Increased appetite', 'Weight gain', 'Mood changes', 'Insomnia', 'Indigestion'];
    } else if (lowerName.includes('omeprazole') || lowerName.includes('pantoprazole')) {
      return ['Headache', 'Nausea', 'Diarrhea', 'Abdominal pain'];
    } else if (lowerName.includes('metoclopramide')) {
      return ['Drowsiness', 'Fatigue', 'Restlessness'];
    } else if (lowerName.includes('ondansetron')) {
      return ['Headache', 'Constipation', 'Dizziness'];
    } else if (lowerName.includes('enoxaparin') || lowerName.includes('heparin')) {
      return ['Injection site reactions', 'Easy bruising', 'Minor bleeding'];
    } else if (lowerName.includes('warfarin')) {
      return ['Easy bruising', 'Minor bleeding from gums or nose'];
    }
    
    return ['Nausea', 'Headache', 'Dizziness', 'Stomach upset'];
  };

  const getSeriousSideEffects = (medicationName: string): string[] => {
    const lowerName = medicationName.toLowerCase();
    
    if (lowerName.includes('paracetamol') || lowerName.includes('acetaminophen')) {
      return [
        'Severe skin reactions (rash, blistering)',
        'Yellowing of skin or eyes (jaundice)',
        'Dark urine or pale stools',
        'Severe abdominal pain',
      ];
    } else if (lowerName.includes('ibuprofen') || lowerName.includes('diclofenac')) {
      return [
        'Severe stomach pain or black/tarry stools',
        'Chest pain or difficulty breathing',
        'Severe allergic reaction (swelling, difficulty breathing)',
        'Unusual bleeding or bruising',
      ];
    } else if (lowerName.includes('tramadol') || lowerName.includes('morphine')) {
      return [
        'Slow or difficult breathing',
        'Severe drowsiness or confusion',
        'Seizures',
        'Severe allergic reaction',
      ];
    } else if (lowerName.includes('amoxicillin') || lowerName.includes('clavulanate') || lowerName.includes('ceftriaxone')) {
      return [
        'Severe allergic reaction (difficulty breathing, swelling)',
        'Severe diarrhea or bloody stools',
        'Severe skin rash or blistering',
        'Yellowing of skin or eyes',
      ];
    } else if (lowerName.includes('ciprofloxacin')) {
      return [
        'Tendon pain or swelling',
        'Severe joint or muscle pain',
        'Irregular heartbeat',
        'Severe allergic reaction',
        'Confusion or mood changes',
      ];
    } else if (lowerName.includes('metronidazole')) {
      return [
        'Numbness or tingling in hands/feet',
        'Seizures',
        'Severe dizziness',
        'Unusual weakness',
      ];
    } else if (lowerName.includes('gentamicin')) {
      return [
        'Hearing loss or ringing in ears',
        'Dizziness or balance problems',
        'Decreased urination',
        'Severe allergic reaction',
      ];
    } else if (lowerName.includes('prednisolone') || lowerName.includes('dexamethasone') || lowerName.includes('hydrocortisone')) {
      return [
        'Severe mood changes or depression',
        'Vision problems',
        'Severe swelling',
        'Unusual weight gain',
        'Signs of infection (fever, persistent sore throat)',
      ];
    } else if (lowerName.includes('warfarin') || lowerName.includes('enoxaparin') || lowerName.includes('heparin')) {
      return [
        'Severe bleeding (coughing blood, vomit that looks like coffee grounds)',
        'Severe headache or dizziness',
        'Black or bloody stools',
        'Unusual bruising or prolonged bleeding',
      ];
    }
    
    return [
      'Severe allergic reaction (difficulty breathing, swelling)',
      'Severe skin rash or blistering',
      'Unusual bleeding or bruising',
      'Severe dizziness or fainting',
    ];
  };

  const getWarnings = (medicationName: string): string[] => {
    const lowerName = medicationName.toLowerCase();
    
    if (lowerName.includes('paracetamol')) {
      return ['Do not exceed 4g (4000mg) in 24 hours', 'Overdose can cause severe liver damage'];
    } else if (lowerName.includes('ibuprofen') || lowerName.includes('diclofenac')) {
      return ['May increase risk of heart attack or stroke', 'Can cause stomach ulcers', 'Not recommended in late pregnancy'];
    } else if (lowerName.includes('tramadol') || lowerName.includes('morphine')) {
      return ['Risk of addiction and dependence', 'Can cause drowsiness - do not drive', 'May cause constipation'];
    } else if (lowerName.includes('warfarin')) {
      return ['Regular blood tests required', 'Many drug and food interactions', 'Increased bleeding risk'];
    } else if (lowerName.includes('metronidazole')) {
      return ['AVOID ALCOHOL - causes severe reaction', 'Complete full course'];
    } else if (lowerName.includes('ciprofloxacin')) {
      return ['May cause tendon damage', 'Avoid excessive sun exposure', 'Can affect blood sugar in diabetics'];
    } else if (lowerName.includes('prednisolone') || lowerName.includes('dexamethasone')) {
      return ['Do not stop suddenly', 'May mask signs of infection', 'Can affect blood sugar'];
    }
    
    return ['Take exactly as prescribed', 'Do not share with others', 'Store safely away from children'];
  };

  const getPrecautions = (medicationName: string): string[] => {
    const lowerName = medicationName.toLowerCase();
    
    const precautions: string[] = [];
    
    if (lowerName.includes('ibuprofen') || lowerName.includes('diclofenac')) {
      precautions.push('Take with food to reduce stomach upset', 'Inform doctor if you have kidney problems');
    }
    
    if (lowerName.includes('tramadol') || lowerName.includes('morphine')) {
      precautions.push('Do not drive or operate machinery', 'Avoid alcohol');
    }
    
    if (lowerName.includes('antibiotic') || lowerName.includes('cillin') || lowerName.includes('mycin')) {
      precautions.push('Complete the full course', 'Take at evenly spaced intervals');
    }
    
    if (lowerName.includes('warfarin')) {
      precautions.push('Maintain consistent vitamin K intake', 'Inform all healthcare providers');
    }
    
    if (precautions.length === 0) {
      precautions.push('Inform doctor of all medications you are taking', 'Report any unusual symptoms');
    }
    
    return precautions;
  };

  const getContraindications = (medicationName: string): string[] => {
    const lowerName = medicationName.toLowerCase();
    
    if (lowerName.includes('ibuprofen') || lowerName.includes('diclofenac')) {
      return ['History of stomach ulcers', 'Severe heart failure', 'Severe kidney disease', 'Allergy to NSAIDs'];
    } else if (lowerName.includes('amoxicillin') || lowerName.includes('penicillin')) {
      return ['Allergy to penicillin antibiotics'];
    } else if (lowerName.includes('warfarin')) {
      return ['Active bleeding', 'Recent surgery', 'Severe liver disease'];
    }
    
    return ['Allergy to this medication', 'Pregnancy (consult doctor)', 'Breastfeeding (consult doctor)'];
  };

  const getDrugInteractions = (medicationName: string): string[] => {
    const lowerName = medicationName.toLowerCase();
    
    if (lowerName.includes('warfarin')) {
      return ['Many antibiotics', 'NSAIDs (aspirin, ibuprofen)', 'Other blood thinners', 'Some vitamins'];
    } else if (lowerName.includes('metronidazole')) {
      return ['Warfarin', 'Lithium', 'Alcohol (severe reaction)'];
    } else if (lowerName.includes('ciprofloxacin')) {
      return ['Antacids', 'Iron supplements', 'Dairy products', 'Caffeine'];
    }
    
    return ['Inform doctor of ALL medications including over-the-counter drugs and supplements'];
  };

  const getFoodInteractions = (medicationName: string): string[] => {
    const lowerName = medicationName.toLowerCase();
    
    if (lowerName.includes('ciprofloxacin')) {
      return ['Avoid taking with dairy products', 'Limit caffeine intake'];
    } else if (lowerName.includes('metronidazole')) {
      return ['AVOID ALCOHOL completely during treatment and for 48 hours after'];
    } else if (lowerName.includes('warfarin')) {
      return ['Maintain consistent intake of leafy green vegetables', 'Limit alcohol'];
    } else if (lowerName.includes('paracetamol')) {
      return ['Avoid excessive alcohol'];
    }
    
    return ['Can be taken with or without food unless otherwise directed'];
  };

  const getHowToTake = (route: string, medicationName: string): string[] => {
    const instructions: string[] = [];
    const lowerName = medicationName.toLowerCase();
    
    if (route === 'oral') {
      instructions.push('Swallow tablet/capsule whole with water');
      
      if (lowerName.includes('ibuprofen') || lowerName.includes('diclofenac')) {
        instructions.push('Take with food or milk to reduce stomach upset');
      }
      
      if (lowerName.includes('antibiotic') || lowerName.includes('cillin')) {
        instructions.push('Take at evenly spaced times (e.g., 8am, 4pm, 12am for 8-hourly)');
        instructions.push('Complete the full course even if you feel better');
      }
    } else if (route === 'intravenous' || route === 'intramuscular') {
      instructions.push('Will be administered by healthcare professional');
    } else if (route === 'subcutaneous') {
      instructions.push('Inject under the skin as demonstrated by your nurse');
      instructions.push('Rotate injection sites');
    } else if (route === 'topical') {
      instructions.push('Apply to clean, dry affected area');
      instructions.push('Wash hands before and after application');
    }
    
    return instructions;
  };

  const getWhatToAvoid = (medicationName: string): string[] => {
    const lowerName = medicationName.toLowerCase();
    const toAvoid: string[] = [];
    
    if (lowerName.includes('tramadol') || lowerName.includes('morphine')) {
      toAvoid.push('Do not drive or operate heavy machinery');
      toAvoid.push('Avoid alcohol');
    }
    
    if (lowerName.includes('metronidazole')) {
      toAvoid.push('STRICTLY AVOID ALCOHOL');
    }
    
    if (lowerName.includes('ibuprofen') || lowerName.includes('diclofenac')) {
      toAvoid.push('Avoid taking other NSAIDs simultaneously');
    }
    
    if (lowerName.includes('ciprofloxacin')) {
      toAvoid.push('Avoid excessive sun exposure');
    }
    
    if (toAvoid.length === 0) {
      toAvoid.push('Follow your doctor\'s instructions carefully');
    }
    
    return toAvoid;
  };

  const getWhenToSeekHelp = (_medicationName: string): string[] => {
    return [
      'Difficulty breathing or swallowing',
      'Severe skin rash or itching',
      'Swelling of face, lips, or tongue',
      'Signs of severe allergic reaction',
      'Symptoms that worsen or don\'t improve',
      'Any unexpected severe side effects',
    ];
  };

  const getStorageInstructions = (medicationName: string): string => {
    const lowerName = medicationName.toLowerCase();
    
    if (lowerName.includes('insulin')) {
      return 'Store in refrigerator (2-8°C). Do not freeze. Once in use, can be kept at room temperature for up to 28 days.';
    } else if (lowerName.includes('liquid') || lowerName.includes('suspension')) {
      return 'Store at room temperature. Shake well before use. Discard after expiry date.';
    }
    
    return 'Store at room temperature (15-30°C) away from heat, moisture, and direct sunlight. Keep out of reach of children.';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Pill className="w-7 h-7 text-violet-500" />
            Pharmacy
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Prescription management with BNF-adapted dosing
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} />
          New Prescription
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name..."
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
            title="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="dispensed">Dispensed</option>
            <option value="partially_dispensed">Partially Dispensed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Prescriptions List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Medications</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prescribed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPrescriptions.length > 0 ? (
                filteredPrescriptions.map((rx) => {
                  const patient = patientMap.get(rx.patientId);
                  return (
                    <tr key={rx.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {patient ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                              <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>
                            </div>
                          </div>
                        ) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {rx.medications.slice(0, 3).map((med) => (
                            <span key={med.id} className="badge badge-secondary text-xs">
                              {med.name} {med.dosage}
                            </span>
                          ))}
                          {rx.medications.length > 3 && (
                            <span className="badge badge-info text-xs">
                              +{rx.medications.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(rx.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(rx.prescribedAt), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleExportPrescription(rx)}
                            className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                            title="Download Prescription PDF"
                          >
                            <FileText size={18} />
                          </button>
                          <button
                            onClick={() => handleExportDrugInformation(rx)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download Drug Information Sheet (Side Effects & Warnings)"
                          >
                            <Info size={18} />
                          </button>
                          {(rx.status === 'dispensed' || rx.status === 'partially_dispensed') && (
                            <button
                              onClick={() => handleExportDispensingSlip(rx)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Download Dispensing Slip"
                            >
                              <Download size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Pill className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No prescriptions found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Prescription Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">New Prescription</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[calc(90vh-80px)]">
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Patient Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <PatientSelector
                        value={watch('patientId')}
                        onChange={(patientId) => setValue('patientId', patientId || '')}
                        label="Patient"
                        required
                        error={errors.patientId?.message}
                      />
                    </div>
                    <div>
                      <label className="label">Notes</label>
                      <input {...register('notes')} className="input" placeholder="Additional instructions..." />
                    </div>
                  </div>

                  {/* GFR Display - Shows when patient is selected */}
                  {selectedPatientId && patientGFR && (
                    <div className={`p-4 rounded-lg border ${
                      patientGFR.gfr < 30 ? 'bg-red-50 border-red-200' :
                      patientGFR.gfr < 60 ? 'bg-amber-50 border-amber-200' :
                      'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-5 h-5 flex-shrink-0 ${
                          patientGFR.gfr < 30 ? 'text-red-600' :
                          patientGFR.gfr < 60 ? 'text-amber-600' :
                          'text-green-600'
                        }`} />
                        <div>
                          <p className="font-medium text-gray-900">
                            Patient Renal Function: GFR {Math.round(patientGFR.gfr)} mL/min/1.73m²
                          </p>
                          <p className={`text-sm ${
                            patientGFR.gfr < 30 ? 'text-red-700' :
                            patientGFR.gfr < 60 ? 'text-amber-700' :
                            'text-green-700'
                          }`}>
                            {patientGFR.stage.description}
                            {patientGFR.gfr < 60 && ' - Renal dose adjustments may be required'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPatientId && !patientGFR && (
                    <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
                      <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 flex-shrink-0 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-700">No GFR Available</p>
                          <p className="text-sm text-gray-500">
                            Patient does not have recent creatinine results for GFR calculation. 
                            Consider ordering renal function tests for renally excreted medications.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add Medication Form */}
                  <div className="card border-2 border-dashed border-gray-200 p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Add Medication</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="label text-xs">Category</label>
                        <select
                          value={currentMed.category}
                          onChange={(e) => setCurrentMed({ ...currentMed, category: e.target.value, name: '' })}
                          className="input text-sm"
                          title="Select medication category"
                        >
                          {medicationCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Medication</label>
                        <select
                          value={currentMed.name || ''}
                          onChange={(e) => setCurrentMed({ ...currentMed, name: e.target.value })}
                          className="input text-sm"
                          title="Select medication"
                        >
                          <option value="">Select...</option>
                          {availableMeds.map((med) => (
                            <option key={med.name} value={med.name}>{med.name}</option>
                          ))}
                          <option value="OTHER">Other (specify)</option>
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Dose</label>
                        {selectedMedInfo ? (
                          <select
                            value={currentMed.dosage || ''}
                            onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                            className="input text-sm"
                            title="Select dose"
                          >
                            <option value="">Select...</option>
                            {selectedMedInfo.doses.map((dose) => (
                              <option key={dose} value={dose}>{dose}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={currentMed.dosage || ''}
                            onChange={(e) => setCurrentMed({ ...currentMed, dosage: e.target.value })}
                            className="input text-sm"
                            placeholder="e.g., 500mg"
                          />
                        )}
                      </div>
                      <div>
                        <label className="label text-xs">Frequency</label>
                        {selectedMedInfo ? (
                          <select
                            value={currentMed.frequency || ''}
                            onChange={(e) => {
                              const newFrequency = e.target.value;
                              const newDuration = currentMed.duration || '';
                              const autoQty = calculateQuantity(newFrequency, newDuration);
                              setCurrentMed({ 
                                ...currentMed, 
                                frequency: newFrequency,
                                quantity: autoQty > 0 ? autoQty : currentMed.quantity
                              });
                            }}
                            className="input text-sm"
                            title="Select frequency"
                          >
                            <option value="">Select...</option>
                            {selectedMedInfo.frequency.map((freq) => (
                              <option key={freq} value={freq}>{freq}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={currentMed.frequency || ''}
                            onChange={(e) => {
                              const newFrequency = e.target.value;
                              const newDuration = currentMed.duration || '';
                              const autoQty = calculateQuantity(newFrequency, newDuration);
                              setCurrentMed({ 
                                ...currentMed, 
                                frequency: newFrequency,
                                quantity: autoQty > 0 ? autoQty : currentMed.quantity
                              });
                            }}
                            className="input text-sm"
                            placeholder="e.g., 8 hourly"
                          />
                        )}
                      </div>
                      <div>
                        <label className="label text-xs">Route</label>
                        <select
                          value={currentMed.route}
                          onChange={(e) => setCurrentMed({ ...currentMed, route: e.target.value as MedicationRoute })}
                          className="input text-sm"
                          title="Select route"
                        >
                          {routes.map((route) => (
                            <option key={route.value} value={route.value}>{route.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Duration</label>
                        <input
                          value={currentMed.duration || ''}
                          onChange={(e) => {
                            const newDuration = e.target.value;
                            const newFrequency = currentMed.frequency || '';
                            const autoQty = calculateQuantity(newFrequency, newDuration);
                            setCurrentMed({ 
                              ...currentMed, 
                              duration: newDuration,
                              quantity: autoQty > 0 ? autoQty : currentMed.quantity
                            });
                          }}
                          className="input text-sm"
                          placeholder="e.g., 5 days"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Quantity {currentMed.frequency && currentMed.duration && <span className="text-violet-600 font-normal">(auto-calculated)</span>}</label>
                        <input
                          type="number"
                          value={currentMed.quantity || ''}
                          onChange={(e) => setCurrentMed({ ...currentMed, quantity: Number(e.target.value) })}
                          className="input text-sm"
                          min="1"
                          title="Quantity"
                          placeholder="Qty"
                        />
                      </div>
                      <div className="flex items-end">
                        <button type="button" onClick={addMedication} className="btn btn-primary w-full">
                          <Plus size={16} /> Add
                        </button>
                      </div>
                    </div>

                    {selectedMedInfo && (
                      <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-700">
                          <p><strong>Max daily:</strong> {selectedMedInfo.maxDaily}</p>
                          {selectedMedInfo.renalAdjust && <p className="text-red-600">⚠️ Requires renal dose adjustment</p>}
                        </div>
                      </div>
                    )}

                    {/* Renal Dosing Warning - Shows when medication requires adjustment and patient has impaired renal function */}
                    {selectedMedInfo?.renalAdjust && patientGFR && patientGFR.gfr < 60 && currentRenalDosing && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Activity className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-red-800 text-sm flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              Renal Dosing Adjustment Required
                            </h4>
                            <div className="mt-2 space-y-1 text-xs text-red-700">
                              <p><strong>Patient GFR:</strong> {patientGFR.gfr.toFixed(1)} mL/min/1.73m² ({patientGFR.stage})</p>
                              <p><strong>Normal Dose:</strong> {currentRenalDosing.normalDose}</p>
                              <p><strong>Recommended Adjusted Dose:</strong> <span className="font-semibold text-red-900">{currentRenalDosing.adjustedDose}</span></p>
                              {currentRenalDosing.adjustment && (
                                <p><strong>Adjustment:</strong> {currentRenalDosing.adjustment}</p>
                              )}
                              {currentRenalDosing.notes && (
                                <p className="italic mt-1 p-2 bg-red-100 rounded">{currentRenalDosing.notes}</p>
                              )}
                              {currentRenalDosing.requiresMonitoring && (
                                <p className="flex items-center gap-1 mt-1 font-medium">
                                  <AlertCircle className="w-3 h-3" /> Therapeutic drug monitoring recommended
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Warning for medications that need renal adjustment but patient GFR not available */}
                    {selectedMedInfo?.renalAdjust && !patientGFR && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-amber-700">
                            <p className="font-semibold">GFR Not Available</p>
                            <p className="mt-1">This medication requires renal dose adjustment. Please ensure recent creatinine levels are available to calculate GFR before prescribing.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Medications List */}
                  {medications.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Prescribed Medications ({medications.length})</h3>
                      <div className="space-y-2">
                        {medications.map((med, index) => (
                          <div key={med.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {med.name} {med.dosage} <span className="text-gray-500">({med.genericName})</span>
                                </p>
                                <p className="text-sm text-gray-500">
                                  {med.route.toUpperCase()} • {med.frequency} • {med.duration} • Qty: {med.quantity}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMedication(med.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remove medication"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center gap-4 p-6 border-t bg-gray-50">
                  <p className="text-sm text-gray-500">
                    {medications.length} medication(s) added
                  </p>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={medications.length === 0}>
                      <Save size={18} />
                      Create Prescription
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
