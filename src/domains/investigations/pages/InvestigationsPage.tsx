// Investigations Page
// Handles investigation requests, result uploads, and trend tracking

import { useState, useMemo, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import {
  Plus,
  Search,
  X,
  Save,
  Upload,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  Beaker,
  Activity,
  FileImage,
  Calendar,
  User,
  Eye,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Scan,
  Download,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import { HospitalSelector } from '../../../components/hospital';
import { OCRScanner, ExportOptionsModal } from '../../../components/common';
import { PatientSelector } from '../../../components/patient';
import { createSimpleThermalPDF, THERMAL_PAGE_WIDTH, THERMAL_PAGE_HEIGHT, THERMAL_MARGIN } from '../../../utils/thermalPdfGenerator';
import ClinicalCommentsSection from '../../../components/clinical/ClinicalCommentsSection';
import { InvestigationApprovalPanel } from '../../../components/investigations';
import type { Investigation, InvestigationResult } from '../../../types';

// Investigation category type for type safety
type InvestigationCategory = Investigation['category'];

// Investigation categories and types
const investigationCategories: Array<{
  category: InvestigationCategory;
  label: string;
  icon: string;
  types: Array<{ type: string; name: string; parameters: string[] }>;
}> = [
  {
    category: 'hematology',
    label: 'Hematology',
    icon: '🩸',
    types: [
      { type: 'fbc', name: 'Full Blood Count', parameters: ['WBC', 'RBC', 'Hemoglobin', 'Hematocrit', 'MCV', 'MCH', 'MCHC', 'Platelets', 'Neutrophils', 'Lymphocytes'] },
      { type: 'coagulation', name: 'Coagulation Profile', parameters: ['PT', 'INR', 'aPTT', 'Fibrinogen', 'D-Dimer'] },
      { type: 'blood_group', name: 'Blood Grouping', parameters: ['ABO', 'Rh Factor'] },
      { type: 'esr', name: 'ESR', parameters: ['ESR'] },
      { type: 'blood_film', name: 'Blood Film', parameters: ['RBC Morphology', 'WBC Differential', 'Platelet Estimate'] },
    ],
  },
  {
    category: 'biochemistry',
    label: 'Biochemistry',
    icon: '⚗️',
    types: [
      { type: 'lft', name: 'Liver Function Tests', parameters: ['Total Bilirubin', 'Direct Bilirubin', 'AST', 'ALT', 'ALP', 'GGT', 'Total Protein', 'Albumin'] },
      { type: 'rft', name: 'Renal Function Tests', parameters: ['Urea', 'Creatinine', 'eGFR', 'Sodium', 'Potassium', 'Chloride', 'Bicarbonate'] },
      { type: 'glucose', name: 'Blood Glucose', parameters: ['Fasting Glucose', 'Random Glucose', 'HbA1c'] },
      { type: 'lipid', name: 'Lipid Profile', parameters: ['Total Cholesterol', 'Triglycerides', 'HDL', 'LDL', 'VLDL'] },
      { type: 'electrolytes', name: 'Electrolytes', parameters: ['Sodium', 'Potassium', 'Chloride', 'Bicarbonate', 'Calcium', 'Magnesium', 'Phosphate'] },
      { type: 'thyroid', name: 'Thyroid Function', parameters: ['TSH', 'Free T4', 'Free T3', 'Total T4'] },
      { type: 'cardiac', name: 'Cardiac Markers', parameters: ['Troponin I', 'Troponin T', 'CK-MB', 'BNP', 'Pro-BNP'] },
    ],
  },
  {
    category: 'microbiology',
    label: 'Microbiology',
    icon: '🦠',
    types: [
      { type: 'urine_mcs', name: 'Urine MCS', parameters: ['Organisms', 'WBC', 'RBC', 'Epithelial Cells', 'Sensitivity'] },
      { type: 'blood_culture', name: 'Blood Culture', parameters: ['Organism', 'Sensitivity'] },
      { type: 'wound_swab', name: 'Wound Swab MCS', parameters: ['Organism', 'Sensitivity'] },
      { type: 'sputum', name: 'Sputum MCS', parameters: ['Organism', 'AFB', 'Sensitivity'] },
      { type: 'stool', name: 'Stool MCS', parameters: ['Organism', 'Ova', 'Cyst', 'Occult Blood'] },
    ],
  },
  {
    category: 'imaging',
    label: 'Imaging',
    icon: '📷',
    types: [
      // X-Rays - Head & Neck
      { type: 'xray_skull_ap_lat', name: 'X-Ray Skull (AP & Lateral)', parameters: ['Findings', 'Impression', 'Bone Integrity', 'Sinuses', 'Soft Tissue'] },
      { type: 'xray_facial_bones', name: 'X-Ray Facial Bones', parameters: ['Findings', 'Impression', 'Orbits', 'Nasal Bones', 'Mandible', 'Maxilla'] },
      { type: 'xray_mandible', name: 'X-Ray Mandible (PA & Oblique)', parameters: ['Findings', 'Impression', 'Condyles', 'Body', 'Ramus'] },
      { type: 'xray_nasal_bones', name: 'X-Ray Nasal Bones (Lateral)', parameters: ['Findings', 'Impression', 'Fracture Status'] },
      { type: 'xray_paranasal_sinuses', name: 'X-Ray Paranasal Sinuses (OM View)', parameters: ['Findings', 'Impression', 'Maxillary', 'Frontal', 'Ethmoid', 'Sphenoid', 'Air-Fluid Level'] },
      { type: 'xray_soft_tissue_neck', name: 'X-Ray Soft Tissue Neck (Lateral)', parameters: ['Findings', 'Impression', 'Airway', 'Prevertebral Soft Tissue', 'Epiglottis'] },
      
      // X-Rays - Spine
      { type: 'xray_cervical_spine', name: 'X-Ray Cervical Spine (AP, Lateral, Oblique, Open Mouth)', parameters: ['Findings', 'Impression', 'Alignment', 'Vertebral Bodies', 'Disc Spaces', 'Odontoid', 'Prevertebral Space'] },
      { type: 'xray_thoracic_spine', name: 'X-Ray Thoracic Spine (AP & Lateral)', parameters: ['Findings', 'Impression', 'Alignment', 'Vertebral Bodies', 'Disc Spaces', 'Pedicles'] },
      { type: 'xray_lumbar_spine', name: 'X-Ray Lumbar Spine (AP, Lateral, Oblique)', parameters: ['Findings', 'Impression', 'Alignment', 'Vertebral Bodies', 'Disc Spaces', 'Pars Interarticularis', 'Spondylolisthesis'] },
      { type: 'xray_sacrum_coccyx', name: 'X-Ray Sacrum & Coccyx', parameters: ['Findings', 'Impression', 'Alignment', 'Fractures'] },
      
      // X-Rays - Chest & Thorax
      { type: 'xray_chest_pa', name: 'X-Ray Chest PA', parameters: ['Findings', 'Impression', 'Heart Size', 'Lung Fields', 'Mediastinum', 'Costophrenic Angles', 'Diaphragm'] },
      { type: 'xray_chest_ap', name: 'X-Ray Chest AP (Erect/Supine)', parameters: ['Findings', 'Impression', 'Heart Size', 'Lung Fields', 'Mediastinum', 'ETT Position', 'Lines/Tubes'] },
      { type: 'xray_chest_lateral', name: 'X-Ray Chest Lateral', parameters: ['Findings', 'Impression', 'Retrosternal Space', 'Retrocardiac Space', 'Posterior Costophrenic Angle'] },
      { type: 'xray_ribs', name: 'X-Ray Ribs (AP & Oblique)', parameters: ['Findings', 'Impression', 'Fractures', 'Lesions', 'Pleural Status'] },
      { type: 'xray_sternum', name: 'X-Ray Sternum (Lateral & Oblique)', parameters: ['Findings', 'Impression', 'Manubrium', 'Body', 'Xiphoid'] },
      { type: 'xray_clavicle', name: 'X-Ray Clavicle (AP & AP Cephalic Tilt)', parameters: ['Findings', 'Impression', 'Fracture', 'AC Joint', 'SC Joint'] },
      
      // X-Rays - Abdomen & Pelvis
      { type: 'xray_abdomen_supine', name: 'X-Ray Abdomen Supine', parameters: ['Findings', 'Impression', 'Gas Pattern', 'Calcifications', 'Soft Tissue Masses', 'Psoas Shadows'] },
      { type: 'xray_abdomen_erect', name: 'X-Ray Abdomen Erect', parameters: ['Findings', 'Impression', 'Air-Fluid Levels', 'Free Air', 'Bowel Loops'] },
      { type: 'xray_acute_abdomen_series', name: 'X-Ray Acute Abdomen Series (Supine, Erect, CXR)', parameters: ['Findings', 'Impression', 'Obstruction', 'Perforation', 'Ileus'] },
      { type: 'xray_pelvis_ap', name: 'X-Ray Pelvis AP', parameters: ['Findings', 'Impression', 'Hip Joints', 'Sacroiliac Joints', 'Pubic Symphysis', 'Acetabulum', 'Femoral Heads'] },
      { type: 'xray_hip_ap_lateral', name: 'X-Ray Hip (AP & Lateral/Frog-Leg)', parameters: ['Findings', 'Impression', 'Femoral Head', 'Neck', 'Acetabulum', 'Joint Space', 'Shenton Line'] },
      
      // X-Rays - Upper Limb
      { type: 'xray_shoulder_ap', name: 'X-Ray Shoulder (AP Internal/External Rotation)', parameters: ['Findings', 'Impression', 'Glenohumeral Joint', 'AC Joint', 'Humeral Head', 'Greater Tuberosity'] },
      { type: 'xray_shoulder_axillary', name: 'X-Ray Shoulder Axillary View', parameters: ['Findings', 'Impression', 'Glenohumeral Alignment', 'Acromion', 'Coracoid'] },
      { type: 'xray_shoulder_y_view', name: 'X-Ray Shoulder Y-View (Outlet)', parameters: ['Findings', 'Impression', 'Acromion Type', 'Subacromial Space'] },
      { type: 'xray_humerus_ap_lateral', name: 'X-Ray Humerus (AP & Lateral)', parameters: ['Findings', 'Impression', 'Shaft', 'Proximal', 'Distal', 'Alignment'] },
      { type: 'xray_elbow_ap_lateral', name: 'X-Ray Elbow (AP & Lateral)', parameters: ['Findings', 'Impression', 'Joint Space', 'Fat Pads', 'Radial Head', 'Olecranon', 'Carrying Angle'] },
      { type: 'xray_forearm_ap_lateral', name: 'X-Ray Forearm (AP & Lateral)', parameters: ['Findings', 'Impression', 'Radius', 'Ulna', 'Alignment', 'Radioulnar Joints'] },
      { type: 'xray_wrist_ap_lateral', name: 'X-Ray Wrist (PA & Lateral)', parameters: ['Findings', 'Impression', 'Distal Radius', 'Ulna', 'Carpal Bones', 'Scaphoid', 'Gilula Lines'] },
      { type: 'xray_wrist_scaphoid', name: 'X-Ray Wrist Scaphoid Views', parameters: ['Findings', 'Impression', 'Scaphoid Waist', 'Proximal Pole', 'Distal Pole'] },
      { type: 'xray_hand_ap_oblique', name: 'X-Ray Hand (PA & Oblique)', parameters: ['Findings', 'Impression', 'Metacarpals', 'Phalanges', 'Joints', 'Soft Tissue'] },
      { type: 'xray_fingers', name: 'X-Ray Finger(s) (PA, Lateral, Oblique)', parameters: ['Findings', 'Impression', 'Phalanges', 'IP Joints', 'MCP Joint'] },
      { type: 'xray_thumb', name: 'X-Ray Thumb (AP, Lateral, Oblique)', parameters: ['Findings', 'Impression', 'Metacarpal', 'Phalanges', 'CMC Joint', 'Bennett Fracture'] },
      
      // X-Rays - Lower Limb
      { type: 'xray_femur_ap_lateral', name: 'X-Ray Femur (AP & Lateral)', parameters: ['Findings', 'Impression', 'Shaft', 'Neck', 'Condyles', 'Alignment'] },
      { type: 'xray_knee_ap_lateral', name: 'X-Ray Knee (AP & Lateral)', parameters: ['Findings', 'Impression', 'Joint Space', 'Patella', 'Tibial Plateau', 'Femoral Condyles', 'Alignment'] },
      { type: 'xray_knee_skyline', name: 'X-Ray Knee Skyline (Merchant/Sunrise)', parameters: ['Findings', 'Impression', 'Patellofemoral Joint', 'Patellar Tracking'] },
      { type: 'xray_knee_weight_bearing', name: 'X-Ray Knee Standing/Weight-Bearing', parameters: ['Findings', 'Impression', 'Joint Space Narrowing', 'Varus/Valgus', 'Alignment'] },
      { type: 'xray_tibia_fibula', name: 'X-Ray Tibia/Fibula (AP & Lateral)', parameters: ['Findings', 'Impression', 'Tibial Shaft', 'Fibula', 'Alignment', 'Ankle Mortise'] },
      { type: 'xray_ankle_ap_lateral', name: 'X-Ray Ankle (AP & Lateral)', parameters: ['Findings', 'Impression', 'Mortise', 'Malleoli', 'Talus', 'Joint Space'] },
      { type: 'xray_ankle_mortise', name: 'X-Ray Ankle Mortise View', parameters: ['Findings', 'Impression', 'Medial Clear Space', 'Tibiofibular Overlap', 'Talar Dome'] },
      { type: 'xray_ankle_stress', name: 'X-Ray Ankle Stress Views', parameters: ['Findings', 'Impression', 'Anterior Drawer', 'Talar Tilt', 'Ligament Integrity'] },
      { type: 'xray_foot_ap_lateral', name: 'X-Ray Foot (AP & Lateral)', parameters: ['Findings', 'Impression', 'Metatarsals', 'Phalanges', 'Tarsal Bones', 'Arches'] },
      { type: 'xray_foot_oblique', name: 'X-Ray Foot Oblique', parameters: ['Findings', 'Impression', 'Metatarsal Bases', 'Cuboid', 'Navicular'] },
      { type: 'xray_foot_weight_bearing', name: 'X-Ray Foot Weight-Bearing', parameters: ['Findings', 'Impression', 'Arch Height', 'Talo-First Metatarsal Angle', 'Calcaneal Pitch'] },
      { type: 'xray_calcaneus', name: 'X-Ray Calcaneus (Axial & Lateral)', parameters: ['Findings', 'Impression', 'Bohler Angle', 'Subtalar Joint', 'Fracture Pattern'] },
      { type: 'xray_toes', name: 'X-Ray Toe(s)', parameters: ['Findings', 'Impression', 'Phalanges', 'IP Joints', 'MTP Joint'] },
      
      // Doppler Ultrasound - Lower Limb Arterial (Limb Salvage)
      { type: 'doppler_arterial_lower_limb', name: 'Arterial Doppler Lower Limb', parameters: [
        'Common Femoral Artery - Peak Systolic Velocity (PSV)',
        'Common Femoral Artery - Waveform Pattern',
        'Superficial Femoral Artery - PSV',
        'Superficial Femoral Artery - Stenosis %',
        'Popliteal Artery - PSV',
        'Popliteal Artery - Waveform',
        'Anterior Tibial Artery - PSV',
        'Anterior Tibial Artery - Patency',
        'Posterior Tibial Artery - PSV',
        'Posterior Tibial Artery - Patency',
        'Dorsalis Pedis Artery - PSV',
        'Dorsalis Pedis Artery - Patency',
        'Peroneal Artery - PSV',
        'Peroneal Artery - Patency',
        'ABI (Ankle-Brachial Index)',
        'TBI (Toe-Brachial Index)',
        'Waveform Type (Triphasic/Biphasic/Monophasic)',
        'Stenosis Location',
        'Stenosis Severity (Mild/Moderate/Severe/Occlusion)',
        'Collateral Vessels',
        'Calcification',
        'Impression - Limb Viability',
        'Recommendation'
      ] },
      { type: 'doppler_bilateral_arterial_ll', name: 'Bilateral Arterial Doppler Lower Limbs (Limb Salvage Protocol)', parameters: [
        'Right ABI',
        'Left ABI',
        'Right TBI',
        'Left TBI',
        'Right CFA PSV',
        'Left CFA PSV',
        'Right SFA - Stenosis/Occlusion',
        'Left SFA - Stenosis/Occlusion',
        'Right Popliteal - Stenosis/Occlusion',
        'Left Popliteal - Stenosis/Occlusion',
        'Right Tibial Runoff (AT/PT/Peroneal)',
        'Left Tibial Runoff (AT/PT/Peroneal)',
        'Right Foot Perfusion',
        'Left Foot Perfusion',
        'Critical Limb Ischemia (Yes/No)',
        'Rutherford Classification',
        'WIfI Score - Wound',
        'WIfI Score - Ischemia',
        'WIfI Score - Foot Infection',
        'Amputation Risk',
        'Revascularization Candidacy',
        'Overall Impression',
        'Recommendation'
      ] },
      
      // Doppler Ultrasound - Lower Limb Venous
      { type: 'doppler_venous_lower_limb', name: 'Venous Doppler Lower Limb (DVT Protocol)', parameters: [
        'Common Femoral Vein - Compressibility',
        'Common Femoral Vein - Flow',
        'Common Femoral Vein - Augmentation',
        'Saphenofemoral Junction - Reflux',
        'Great Saphenous Vein - Compressibility',
        'Great Saphenous Vein - Reflux Duration',
        'Great Saphenous Vein - Diameter',
        'Superficial Femoral Vein - Compressibility',
        'Superficial Femoral Vein - Flow',
        'Popliteal Vein - Compressibility',
        'Popliteal Vein - Flow',
        'Saphenopopliteal Junction - Reflux',
        'Small Saphenous Vein - Reflux',
        'Small Saphenous Vein - Diameter',
        'Posterior Tibial Veins - Compressibility',
        'Peroneal Veins - Compressibility',
        'Anterior Tibial Veins - Compressibility',
        'Gastrocnemius Veins - Compressibility',
        'Soleal Veins - Compressibility',
        'Thrombus Present (Yes/No)',
        'Thrombus Location',
        'Thrombus Age (Acute/Subacute/Chronic)',
        'Thrombus Extent',
        'DVT Confirmed (Yes/No)',
        'Impression',
        'Recommendation'
      ] },
      { type: 'doppler_venous_reflux', name: 'Venous Reflux Study (Chronic Venous Insufficiency)', parameters: [
        'Great Saphenous Vein - Reflux Present',
        'GSV Reflux Duration (seconds)',
        'GSV Diameter at SFJ (mm)',
        'GSV Diameter at Thigh (mm)',
        'GSV Diameter at Knee (mm)',
        'GSV Diameter at Calf (mm)',
        'Small Saphenous Vein - Reflux Present',
        'SSV Reflux Duration (seconds)',
        'SSV Diameter at SPJ (mm)',
        'Saphenofemoral Junction Competence',
        'Saphenopopliteal Junction Competence',
        'Perforator Incompetence - Location',
        'Perforator Incompetence - Diameter',
        'Deep Vein Reflux',
        'CEAP Classification - Clinical',
        'CEAP Classification - Etiology',
        'CEAP Classification - Anatomy',
        'CEAP Classification - Pathophysiology',
        'Venous Clinical Severity Score (VCSS)',
        'Varicose Veins Distribution',
        'Skin Changes',
        'Ulcer Present',
        'Impression',
        'Treatment Recommendation'
      ] },
      { type: 'doppler_bilateral_venous_ll', name: 'Bilateral Venous Doppler Lower Limbs', parameters: [
        'Right CFV - DVT',
        'Left CFV - DVT',
        'Right SFV - DVT',
        'Left SFV - DVT',
        'Right Popliteal - DVT',
        'Left Popliteal - DVT',
        'Right Calf Veins - DVT',
        'Left Calf Veins - DVT',
        'Right GSV Reflux',
        'Left GSV Reflux',
        'Right SSV Reflux',
        'Left SSV Reflux',
        'Bilateral Comparison',
        'Impression',
        'Recommendation'
      ] },
      
      // General Ultrasound
      { type: 'ultrasound_abdomen', name: 'Ultrasound Abdomen', parameters: ['Liver', 'Gallbladder', 'Pancreas', 'Spleen', 'Kidneys', 'Aorta', 'Free Fluid', 'Impression'] },
      { type: 'ultrasound_pelvis', name: 'Ultrasound Pelvis', parameters: ['Bladder', 'Uterus', 'Ovaries', 'Prostate', 'Free Fluid', 'Impression'] },
      { type: 'ultrasound_soft_tissue', name: 'Ultrasound Soft Tissue/Mass', parameters: ['Location', 'Size', 'Echogenicity', 'Margins', 'Vascularity', 'Impression'] },
      { type: 'ultrasound_thyroid', name: 'Ultrasound Thyroid', parameters: ['Right Lobe', 'Left Lobe', 'Isthmus', 'Nodules', 'Vascularity', 'Lymph Nodes', 'Impression'] },
      { type: 'ultrasound_breast', name: 'Ultrasound Breast', parameters: ['Location', 'Size', 'BIRADS Category', 'Lymph Nodes', 'Impression'] },
      { type: 'ultrasound_scrotum', name: 'Ultrasound Scrotum', parameters: ['Right Testis', 'Left Testis', 'Epididymis', 'Hydrocele', 'Varicocele', 'Vascularity', 'Impression'] },
      { type: 'ultrasound_renal', name: 'Ultrasound Kidneys & Bladder', parameters: ['Right Kidney Size', 'Left Kidney Size', 'Cortical Thickness', 'Hydronephrosis', 'Stones', 'Bladder', 'Impression'] },
      
      // CT Scans
      { type: 'ct_head', name: 'CT Head (Non-Contrast)', parameters: ['Findings', 'Impression', 'Hemorrhage', 'Infarct', 'Mass Effect', 'Midline Shift'] },
      { type: 'ct_head_contrast', name: 'CT Head with Contrast', parameters: ['Findings', 'Impression', 'Enhancement Pattern', 'Lesions'] },
      { type: 'ct_chest', name: 'CT Chest', parameters: ['Findings', 'Impression', 'Lung Parenchyma', 'Mediastinum', 'Pleura', 'Contrast'] },
      { type: 'ct_abdomen_pelvis', name: 'CT Abdomen & Pelvis', parameters: ['Findings', 'Impression', 'Liver', 'Pancreas', 'Kidneys', 'Bowel', 'Lymph Nodes', 'Contrast'] },
      { type: 'ct_angiography', name: 'CT Angiography', parameters: ['Findings', 'Impression', 'Vessels Assessed', 'Stenosis', 'Aneurysm', 'Occlusion'] },
      { type: 'ct_spine', name: 'CT Spine', parameters: ['Region', 'Findings', 'Impression', 'Fractures', 'Disc', 'Spinal Canal'] },
      
      // MRI
      { type: 'mri_brain', name: 'MRI Brain', parameters: ['Findings', 'Impression', 'Sequences', 'Contrast', 'Lesions'] },
      { type: 'mri_spine', name: 'MRI Spine', parameters: ['Region', 'Findings', 'Impression', 'Disc', 'Cord', 'Contrast'] },
      { type: 'mri_joint', name: 'MRI Joint (Knee/Shoulder/Ankle)', parameters: ['Joint', 'Findings', 'Impression', 'Ligaments', 'Meniscus/Labrum', 'Cartilage', 'Bone'] },
      { type: 'mri_soft_tissue', name: 'MRI Soft Tissue', parameters: ['Location', 'Findings', 'Impression', 'Size', 'Signal Characteristics', 'Contrast Enhancement'] },
      { type: 'mra', name: 'MR Angiography', parameters: ['Vessels', 'Findings', 'Impression', 'Stenosis', 'Aneurysm'] },
      
      // Cardiac Imaging
      { type: 'ecg', name: 'ECG (12-Lead)', parameters: ['Rate', 'Rhythm', 'Axis', 'P Wave', 'PR Interval', 'QRS Complex', 'QT/QTc', 'ST Segment', 'T Wave', 'Findings', 'Impression'] },
      { type: 'echo_tte', name: 'Echocardiogram (TTE)', parameters: ['LV EF', 'LV Dimensions', 'RV Function', 'Valves', 'Wall Motion', 'Pericardium', 'Diastolic Function', 'Impression'] },
      { type: 'echo_tee', name: 'Echocardiogram (TEE)', parameters: ['LA/LAA', 'Valves', 'Aorta', 'Interatrial Septum', 'Thrombus', 'Vegetations', 'Impression'] },
      { type: 'stress_echo', name: 'Stress Echocardiogram', parameters: ['Rest EF', 'Stress EF', 'Wall Motion Abnormality', 'Ischemia', 'Peak HR', 'Impression'] },
      { type: 'carotid_doppler', name: 'Carotid Doppler', parameters: ['Right ICA PSV', 'Right ICA EDV', 'Right ICA Stenosis', 'Left ICA PSV', 'Left ICA EDV', 'Left ICA Stenosis', 'Plaque', 'Impression'] },
    ],
  },
  {
    category: 'histopathology',
    label: 'Histopathology',
    icon: '🔬',
    types: [
      { type: 'biopsy', name: 'Tissue Biopsy', parameters: ['Macroscopic', 'Microscopic', 'Impression', 'Staging'] },
      { type: 'cytology', name: 'Cytology', parameters: ['Findings', 'Impression'] },
      { type: 'frozen_section', name: 'Frozen Section', parameters: ['Findings', 'Impression'] },
    ],
  },
];

// Reference ranges for common parameters
const referenceRanges: Record<string, { min: number; max: number; unit: string }> = {
  'Hemoglobin': { min: 12.0, max: 17.0, unit: 'g/dL' },
  'WBC': { min: 4.0, max: 11.0, unit: 'x10^9/L' },
  'Platelets': { min: 150, max: 450, unit: 'x10^9/L' },
  'Sodium': { min: 135, max: 145, unit: 'mmol/L' },
  'Potassium': { min: 3.5, max: 5.0, unit: 'mmol/L' },
  'Creatinine': { min: 0.6, max: 1.2, unit: 'mg/dL' },
  'Urea': { min: 7, max: 20, unit: 'mg/dL' },
  'Glucose': { min: 70, max: 100, unit: 'mg/dL' },
  'AST': { min: 10, max: 40, unit: 'U/L' },
  'ALT': { min: 7, max: 56, unit: 'U/L' },
};

// Schemas
const investigationSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  hospitalId: z.string().min(1, 'Hospital is required'),
  category: z.enum(['hematology', 'biochemistry', 'microbiology', 'imaging', 'histopathology', 'laboratory', 'radiology', 'pathology', 'cardiology', 'other']),
  type: z.string().min(1, 'Investigation type is required'),
  priority: z.enum(['routine', 'urgent', 'stat']),
  clinicalDetails: z.string().optional(),
  fasting: z.boolean().optional(),
});

const resultUploadSchema = z.object({
  results: z.string().min(1, 'Results are required'),
  interpretation: z.string().optional(),
});

type InvestigationFormData = z.infer<typeof investigationSchema>;
type ResultUploadFormData = z.infer<typeof resultUploadSchema>;

export default function InvestigationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'trends' | 'approvals'>('pending');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientForTrend, setSelectedPatientForTrend] = useState<string>('');
  const [selectedParameterForTrend, setSelectedParameterForTrend] = useState<string>('Hemoglobin');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [ocrExtractedText, setOcrExtractedText] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportInvestigation, setExportInvestigation] = useState<Investigation | null>(null);

  // Fetch data
  const hospitals = useLiveQuery(() => db.hospitals.where('isActive').equals(1).toArray(), []);
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  const investigations = useLiveQuery(() => db.investigations.orderBy('createdAt').reverse().toArray(), []);

  // Filter investigations
  const filteredInvestigations = useMemo(() => {
    if (!investigations) return [];
    return investigations.filter(inv => {
      const matchesTab = activeTab === 'pending' 
        ? ['requested', 'sample_collected', 'processing'].includes(inv.status)
        : inv.status === 'completed';
      const matchesCategory = selectedCategory === 'all' || inv.category === selectedCategory;
      const matchesSearch = inv.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           inv.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesCategory && matchesSearch;
    });
  }, [investigations, activeTab, selectedCategory, searchQuery]);

  // Calculate trends for a parameter
  const calculateTrends = useMemo(() => {
    if (!investigations || !selectedPatientForTrend || !selectedParameterForTrend) return [];
    
    const patientInvestigations = investigations.filter(
      inv => inv.patientId === selectedPatientForTrend && inv.status === 'completed' && inv.results
    );

    const trendData: { date: string; value: number; fullDate: Date }[] = [];
    
    patientInvestigations.forEach(inv => {
      if (inv.results) {
        inv.results.forEach(result => {
          if (result.parameter === selectedParameterForTrend && result.value) {
            const numValue = typeof result.value === 'string' ? parseFloat(result.value) : result.value;
            if (!isNaN(numValue) && result.resultDate) {
              trendData.push({
                date: format(new Date(result.resultDate), 'MMM d'),
                value: numValue,
                fullDate: new Date(result.resultDate),
              });
            }
          }
        });
      }
    });

    return trendData.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
  }, [investigations, selectedPatientForTrend, selectedParameterForTrend]);

  // Forms
  const requestForm = useForm<InvestigationFormData>({
    resolver: zodResolver(investigationSchema),
    defaultValues: {
      priority: 'routine',
      fasting: false,
    },
  });

  const resultForm = useForm<ResultUploadFormData>({
    resolver: zodResolver(resultUploadSchema),
  });

  const selectedCategoryData = investigationCategories.find(c => c.category === requestForm.watch('category'));

  // Handle request investigation
  const handleRequestInvestigation = async (data: InvestigationFormData) => {
    try {
      const patient = patients?.find(p => p.id === data.patientId);
      const hospital = hospitals?.find(h => h.id === data.hospitalId);
      const typeInfo = selectedCategoryData?.types.find(t => t.type === data.type);

      const investigation: Investigation = {
        id: uuidv4(),
        patientId: data.patientId,
        patientName: `${patient?.firstName} ${patient?.lastName}`,
        hospitalNumber: patient?.hospitalNumber,
        hospitalId: data.hospitalId,
        hospitalName: hospital?.name,
        type: data.type,
        typeName: typeInfo?.name || data.type,
        category: data.category as Investigation['category'],
        priority: data.priority,
        status: 'requested',
        clinicalDetails: data.clinicalDetails,
        fasting: data.fasting,
        requestedBy: user?.id || '',
        requestedByName: `${user?.firstName} ${user?.lastName}`,
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.investigations.add(investigation);
      syncRecord('investigations', investigation as unknown as Record<string, unknown>);
      toast.success('Investigation requested successfully');
      setShowRequestModal(false);
      requestForm.reset();
    } catch (error) {
      console.error('Error requesting investigation:', error);
      toast.error('Failed to request investigation');
    }
  };

  // Handle result upload
  const handleResultUpload = async () => {
    if (!selectedInvestigation) return;

    try {
      const results: InvestigationResult[] = Object.entries(resultValues).map(([parameter, value]) => {
        const refRange = referenceRanges[parameter];
        const numValue = parseFloat(value);
        let flag: 'normal' | 'high' | 'low' | 'critical' | undefined;
        
        if (refRange && !isNaN(numValue)) {
          if (numValue < refRange.min) flag = 'low';
          else if (numValue > refRange.max) flag = 'high';
          else flag = 'normal';
        }

        return {
          id: uuidv4(),
          parameter,
          value,
          unit: refRange?.unit || '',
          referenceRange: refRange ? `${refRange.min} - ${refRange.max}` : undefined,
          flag,
          resultDate: new Date(),
        };
      });

      // Handle file upload (in real app, would upload to server)
      let attachments;
      if (uploadedFile) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(uploadedFile);
        });

        attachments = [{
          id: uuidv4(),
          fileName: uploadedFile.name,
          fileType: uploadedFile.type,
          fileSize: uploadedFile.size,
          url: base64,
          uploadedAt: new Date(),
          uploadedBy: user?.id || '',
        }];
      }

      // Merge new results with any existing results (for partial/incremental uploads)
      const existingResults = selectedInvestigation.results || [];
      const mergedResults = [...existingResults];
      for (const newResult of results) {
        const existingIdx = mergedResults.findIndex(
          r => r.parameter.toLowerCase() === newResult.parameter.toLowerCase()
        );
        if (existingIdx >= 0) {
          mergedResults[existingIdx] = newResult;
        } else {
          mergedResults.push(newResult);
        }
      }

      // Determine expected parameters from test type to check completeness
      const testTypes = selectedInvestigation.type?.split(',') || [];
      const allTestDefs = investigationCategories.flatMap(c => c.types);
      const expectedParams: string[] = [];
      testTypes.forEach(type => {
        const test = allTestDefs.find(t => t.type === type.trim() || t.name === type.trim());
        if (test) expectedParams.push(test.name);
      });
      const allResultsFilled = expectedParams.length === 0 ||
        expectedParams.every(p => mergedResults.some(r => r.parameter.toLowerCase() === p.toLowerCase()));

      await db.investigations.update(selectedInvestigation.id, {
        status: allResultsFilled ? 'completed' : 'processing',
        results: mergedResults,
        attachments: [...(selectedInvestigation.attachments || []), ...(attachments || [])],
        interpretation: resultForm.getValues('interpretation'),
        completedBy: user?.id,
        completedByName: `${user?.firstName} ${user?.lastName}`,
        ...(allResultsFilled ? { completedAt: new Date() } : {}),
        updatedAt: new Date(),
      });
      const updatedRecord = await db.investigations.get(selectedInvestigation.id);
      if (updatedRecord) syncRecord('investigations', updatedRecord as unknown as Record<string, unknown>);

      toast.success('Results uploaded successfully');
      setShowResultModal(false);
      setSelectedInvestigation(null);
      setResultValues({});
      setUploadedFile(null);
      resultForm.reset();
    } catch (error) {
      console.error('Error uploading results:', error);
      toast.error('Failed to upload results');
    }
  };

  // Update investigation status
  const updateStatus = async (investigation: Investigation, newStatus: Investigation['status']) => {
    try {
      await db.investigations.update(investigation.id, {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'sample_collected' ? { collectedAt: new Date() } : {}),
        ...(newStatus === 'processing' ? { processingStartedAt: new Date() } : {}),
      });
      const updatedStatusRecord = await db.investigations.get(investigation.id);
      if (updatedStatusRecord) syncRecord('investigations', updatedStatusRecord as unknown as Record<string, unknown>);
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested': return 'badge-info';
      case 'sample_collected': return 'badge-warning';
      case 'processing': return 'badge-purple';
      case 'completed': return 'badge-success';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'stat': return 'badge-danger';
      case 'urgent': return 'badge-warning';
      default: return 'badge-secondary';
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Get trend indicator
  const getTrendIndicator = (data: typeof calculateTrends) => {
    if (data.length < 2) return null;
    const latest = data[data.length - 1].value;
    const previous = data[data.length - 2].value;
    const change = ((latest - previous) / previous) * 100;

    if (Math.abs(change) < 1) {
      return { icon: Minus, color: 'text-gray-500', label: 'Stable' };
    }
    if (change > 0) {
      return { icon: TrendingUp, color: 'text-red-500', label: `+${change.toFixed(1)}%` };
    }
    return { icon: TrendingDown, color: 'text-green-500', label: `${change.toFixed(1)}%` };
  };

  // Generate A4 PDF for investigation request
  const generateInvestigationA4PDF = useCallback((investigation: Investigation): jsPDF => {
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = 20;

    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.text('INVESTIGATION REQUEST', 105, y, { align: 'center' });
    y += 10;

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(investigation.hospitalName || 'AstroHEALTH Hospital', 105, y, { align: 'center' });
    y += 8;

    doc.setFontSize(9);
    doc.text(`Date: ${format(new Date(investigation.requestedAt), 'dd/MM/yyyy HH:mm')}`, 105, y, { align: 'center' });
    y += 12;

    // Divider
    doc.setLineWidth(0.5);
    doc.line(20, y, 190, y);
    y += 10;

    // Patient Info
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('PATIENT INFORMATION', 20, y);
    y += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text(`Name: ${investigation.patientName || 'N/A'}`, 20, y);
    y += 6;
    doc.text(`Hospital Number: ${investigation.hospitalNumber || 'N/A'}`, 20, y);
    y += 10;

    // Investigation Details
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('INVESTIGATION DETAILS', 20, y);
    y += 8;

    const categoryInfo = investigationCategories.find(c => c.category === investigation.category);
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text(`Category: ${categoryInfo?.label || investigation.category}`, 20, y);
    y += 6;
    doc.text(`Investigation: ${investigation.typeName || investigation.type}`, 20, y);
    y += 6;
    doc.text(`Priority: ${investigation.priority.toUpperCase()}`, 20, y);
    y += 6;
    doc.text(`Status: ${investigation.status.replace('_', ' ').toUpperCase()}`, 20, y);
    y += 6;
    if (investigation.fasting) {
      doc.text('Fasting Required: YES', 20, y);
      y += 6;
    }
    y += 4;

    // Clinical Details
    if (investigation.clinicalDetails) {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('CLINICAL DETAILS', 20, y);
      y += 8;

      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      const clinicalLines = doc.splitTextToSize(investigation.clinicalDetails, 170);
      clinicalLines.forEach((line: string) => {
        doc.text(line, 20, y);
        y += 6;
      });
      y += 4;
    }

    // Requested By
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('REQUESTED BY', 20, y);
    y += 8;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text(`Clinician: ${investigation.requestedByName || 'N/A'}`, 20, y);
    y += 6;
    doc.text(`Date/Time: ${format(new Date(investigation.requestedAt), 'dd/MM/yyyy HH:mm')}`, 20, y);
    y += 15;

    // Footer
    doc.setFontSize(9);
    doc.text('Generated by AstroHEALTH EMR System', 105, 280, { align: 'center' });

    return doc;
  }, []);

  // Generate Thermal PDF for investigation request (80mm width, Georgia/Times 12pt)
  const generateInvestigationThermalPDF = useCallback((investigation: Investigation): jsPDF => {
    const categoryInfo = investigationCategories.find(c => c.category === investigation.category);
    
    return createSimpleThermalPDF({
      title: 'INVESTIGATION REQUEST',
      subtitle: investigation.hospitalName || 'AstroHEALTH Hospital',
      patientName: investigation.patientName,
      patientId: investigation.hospitalNumber,
      date: new Date(investigation.requestedAt),
      items: [
        { label: 'Category', value: categoryInfo?.label || investigation.category },
        { label: 'Investigation', value: investigation.typeName || investigation.type },
        { label: 'Priority', value: investigation.priority.toUpperCase() },
        { label: 'Status', value: investigation.status.replace('_', ' ').toUpperCase() },
        ...(investigation.fasting ? [{ label: 'Fasting', value: 'YES' }] : []),
        ...(investigation.clinicalDetails ? [{ label: 'Clinical Details', value: investigation.clinicalDetails }] : []),
      ],
      preparedBy: investigation.requestedByName,
    });
  }, []);

  // Handle export modal open
  const handleOpenExport = (investigation: Investigation) => {
    setExportInvestigation(investigation);
    setShowExportModal(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FlaskConical className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
            Investigations & Results
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Request investigations, upload results, and track trends
          </p>
        </div>
        <button onClick={() => setShowRequestModal(true)} className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} />
          Request Investigation
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 sm:px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'pending'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock size={18} />
            Pending
          </div>
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-3 sm:px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'completed'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            Completed
          </div>
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`px-3 sm:px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'trends'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={18} />
            Trends
          </div>
        </button>
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-3 sm:px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'approvals'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            Approvals
          </div>
        </button>
      </div>

      {/* Filters */}
      {activeTab !== 'trends' && activeTab !== 'approvals' && (
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient or investigation type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input w-full sm:w-64"
            title="Filter by category"
          >
            <option value="all">All Categories</option>
            {investigationCategories.map((cat) => (
              <option key={cat.category} value={cat.category}>
                {cat.icon} {cat.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {activeTab === 'approvals' ? (
        <div className="space-y-4">
          <InvestigationApprovalPanel 
            hospitalId={user?.hospitalId}
            onApprovalComplete={() => toast.success('Approval workflow completed')}
          />
        </div>
      ) : activeTab === 'trends' ? (
        <div className="space-y-4 sm:space-y-6">
          {/* Trend Selection */}
          <div className="card p-4 sm:p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Select Patient and Parameter</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <label className="label">Patient</label>
                <PatientSelector
                  value={selectedPatientForTrend}
                  onChange={(patientId) => setSelectedPatientForTrend(patientId || '')}
                  placeholder="Search patient for trend analysis..."
                />
              </div>
              <div>
                <label className="label">Parameter</label>
                <select
                  value={selectedParameterForTrend}
                  onChange={(e) => setSelectedParameterForTrend(e.target.value)}
                  className="input"
                  title="Select parameter for trend analysis"
                >
                  {Object.keys(referenceRanges).map((param) => (
                    <option key={param} value={param}>{param}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          {selectedPatientForTrend && calculateTrends.length > 0 && (
            <div className="card p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedParameterForTrend} Trend</h3>
                  <p className="text-sm text-gray-500">
                    Reference: {referenceRanges[selectedParameterForTrend]?.min} - {referenceRanges[selectedParameterForTrend]?.max} {referenceRanges[selectedParameterForTrend]?.unit}
                  </p>
                </div>
                {(() => {
                  const trendInfo = getTrendIndicator(calculateTrends);
                  if (!trendInfo) return null;
                  const IconComponent = trendInfo.icon;
                  return (
                    <div className={`flex items-center gap-1 ${trendInfo.color}`}>
                      <IconComponent size={18} />
                      <span className="font-medium">{trendInfo.label}</span>
                    </div>
                  );
                })()}
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={calculateTrends}>
                    <defs>
                      <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    {referenceRanges[selectedParameterForTrend] && (
                      <>
                        <ReferenceLine
                          y={referenceRanges[selectedParameterForTrend].min}
                          stroke="#22c55e"
                          strokeDasharray="3 3"
                          label={{ value: 'Min', position: 'insideRight', fill: '#22c55e', fontSize: 10 }}
                        />
                        <ReferenceLine
                          y={referenceRanges[selectedParameterForTrend].max}
                          stroke="#ef4444"
                          strokeDasharray="3 3"
                          label={{ value: 'Max', position: 'insideRight', fill: '#ef4444', fontSize: 10 }}
                        />
                      </>
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#trendGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Date</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Value</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calculateTrends.map((data, index) => {
                      const ref = referenceRanges[selectedParameterForTrend];
                      const isLow = ref && data.value < ref.min;
                      const isHigh = ref && data.value > ref.max;
                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2">{format(data.fullDate, 'MMM d, yyyy')}</td>
                          <td className="px-4 py-2 font-medium">{data.value} {ref?.unit}</td>
                          <td className="px-4 py-2">
                            <span className={`badge ${isLow ? 'badge-warning' : isHigh ? 'badge-danger' : 'badge-success'}`}>
                              {isLow ? 'Low' : isHigh ? 'High' : 'Normal'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPatientForTrend && calculateTrends.length === 0 && (
            <div className="card p-12 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No trend data available</p>
              <p className="text-sm text-gray-400 mt-1">No completed investigations found for this parameter</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredInvestigations.length > 0 ? (
            filteredInvestigations.map((investigation) => {
              const categoryInfo = investigationCategories.find(c => c.category === investigation.category);
              
              return (
                <motion.div
                  key={investigation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card hover:shadow-lg transition-shadow"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{categoryInfo?.icon}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{investigation.typeName}</h3>
                          <p className="text-sm text-gray-500">{categoryInfo?.label}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className={`badge ${getStatusBadge(investigation.status)}`}>
                          {investigation.status.replace('_', ' ')}
                        </span>
                        {investigation.priority !== 'routine' && (
                          <span className={`badge ${getPriorityBadge(investigation.priority)}`}>
                            {investigation.priority}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User size={14} />
                        <span>{investigation.patientName}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-400">{investigation.hospitalNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>Requested: {format(new Date(investigation.requestedAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      {investigation.clinicalDetails && (
                        <p className="text-gray-500 italic">"{investigation.clinicalDetails}"</p>
                      )}
                    </div>

                    {/* Progress Steps */}
                    {activeTab === 'pending' && (
                      <div className="mt-4 flex items-center gap-1">
                        {['requested', 'sample_collected', 'processing', 'completed'].map((step) => {
                          const stepOrder = ['requested', 'sample_collected', 'processing', 'completed'];
                          const currentIndex = stepOrder.indexOf(investigation.status);
                          const stepIndex = stepOrder.indexOf(step);
                          const isActive = stepIndex <= currentIndex;
                          const isCurrent = step === investigation.status;
                          
                          return (
                            <div key={step} className="flex items-center flex-1">
                              <div
                                className={`w-full h-2 rounded-full ${
                                  isActive ? 'bg-purple-500' : 'bg-gray-200'
                                } ${isCurrent ? 'animate-pulse' : ''}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      {investigation.status === 'requested' && (
                        <button
                          onClick={() => updateStatus(investigation, 'sample_collected')}
                          className="btn btn-sm btn-secondary flex-1"
                        >
                          <Beaker size={14} />
                          Sample Collected
                        </button>
                      )}
                      {investigation.status === 'sample_collected' && (
                        <button
                          onClick={() => updateStatus(investigation, 'processing')}
                          className="btn btn-sm btn-secondary flex-1"
                        >
                          <Activity size={14} />
                          Start Processing
                        </button>
                      )}
                      {investigation.status === 'processing' && (
                        <button
                          onClick={() => {
                            setSelectedInvestigation(investigation);
                            // Pre-populate existing results
                            if (investigation.results?.length) {
                              const existing: Record<string, string> = {};
                              investigation.results.forEach(r => { existing[r.parameter] = String(r.value || ''); });
                              setResultValues(existing);
                            }
                            setShowResultModal(true);
                          }}
                          className="btn btn-sm btn-primary flex-1"
                        >
                          <Upload size={14} />
                          Upload Results
                        </button>
                      )}
                      {investigation.status === 'completed' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedInvestigation(investigation);
                              setShowTrendModal(true);
                            }}
                            className="btn btn-sm btn-secondary flex-1"
                          >
                            <Eye size={14} />
                            View Results
                          </button>
                          {(() => {
                            // Check if any expected results are missing
                            const totalResults = investigation.results?.length || 0;
                            const typeNames = investigation.typeName?.split(',').map(s => s.trim()) || [];
                            const hasIncomplete = typeNames.length > totalResults;
                            return hasIncomplete ? (
                              <button
                                onClick={() => {
                                  setSelectedInvestigation(investigation);
                                  // Pre-populate existing results
                                  const existing: Record<string, string> = {};
                                  investigation.results?.forEach(r => { existing[r.parameter] = String(r.value || ''); });
                                  setResultValues(existing);
                                  setShowResultModal(true);
                                }}
                                className="btn btn-sm btn-warning flex-1"
                              >
                                <Upload size={14} />
                                Add Remaining
                              </button>
                            ) : null;
                          })()}
                        </>
                      )}
                      {/* Download/Print Button for all pending investigations */}
                      <button
                        onClick={() => handleOpenExport(investigation)}
                        className="btn btn-sm btn-secondary"
                        title="Download PDF / Print (80mm Thermal)"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="col-span-full card p-12 text-center">
              <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No investigations found</p>
              <p className="text-sm text-gray-400 mt-1">
                {activeTab === 'pending' ? 'Request a new investigation to get started' : 'No completed investigations yet'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Request Investigation Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Request Investigation</h2>
                <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={requestForm.handleSubmit(handleRequestInvestigation)} className="p-6 space-y-4">
                <div>
                  <label className="label">Patient</label>
                  <PatientSelector
                    value={requestForm.watch('patientId')}
                    onChange={(patientId) => requestForm.setValue('patientId', patientId || '')}
                    placeholder="Search patient by name or hospital number..."
                    error={requestForm.formState.errors.patientId?.message}
                  />
                </div>

                <div>
                  <label className="label">Hospital</label>
                  <Controller
                    name="hospitalId"
                    control={requestForm.control}
                    render={({ field }) => (
                      <HospitalSelector
                        value={field.value}
                        onChange={(hospitalId) => field.onChange(hospitalId || '')}
                        placeholder="Search hospital..."
                        showAddNew={true}
                      />
                    )}
                  />
                </div>

                <div>
                  <label className="label">Category</label>
                  <div className="space-y-2">
                    {investigationCategories.map((cat) => (
                      <div key={cat.category}>
                        <button
                          type="button"
                          onClick={() => {
                            requestForm.setValue('category', cat.category as Investigation['category']);
                            toggleCategory(cat.category);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border ${
                            requestForm.watch('category') === cat.category
                              ? 'border-purple-500 bg-purple-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{cat.icon}</span>
                            <span className="font-medium">{cat.label}</span>
                          </div>
                          {expandedCategories.has(cat.category) ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                        
                        <AnimatePresence>
                          {expandedCategories.has(cat.category) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-8 py-2 space-y-1">
                                {cat.types.map((type) => (
                                  <label
                                    key={type.type}
                                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="radio"
                                      {...requestForm.register('type')}
                                      value={type.type}
                                      className="text-purple-600"
                                    />
                                    <span className="text-sm">{type.name}</span>
                                  </label>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Priority</label>
                    <select {...requestForm.register('priority')} className="input">
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="fasting"
                      {...requestForm.register('fasting')}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="fasting" className="text-sm text-gray-700">Fasting required</label>
                  </div>
                </div>

                <div>
                  <label className="label">Clinical Details</label>
                  <textarea
                    {...requestForm.register('clinicalDetails')}
                    className="input"
                    rows={2}
                    placeholder="Brief clinical history or indication..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowRequestModal(false)} className="btn btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary flex-1">
                    <Save size={18} />
                    Request Investigation
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Upload Modal */}
      <AnimatePresence>
        {showResultModal && selectedInvestigation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowResultModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Upload Results</h2>
                  <p className="text-sm text-gray-500">{selectedInvestigation.typeName} - {selectedInvestigation.patientName}</p>
                </div>
                <button onClick={() => setShowResultModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* OCR Scanner Toggle */}
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">Enter Results</h3>
                  <button
                    type="button"
                    onClick={() => setShowOCRScanner(!showOCRScanner)}
                    className="btn btn-sm btn-secondary flex items-center gap-2"
                  >
                    <Scan size={16} />
                    {showOCRScanner ? 'Hide Scanner' : 'Scan Report'}
                  </button>
                </div>
                
                {/* OCR Scanner for Imaging/Lab Reports */}
                {showOCRScanner && (
                  <div className="mb-4">
                    <OCRScanner
                      onTextExtracted={(text) => {
                        setOcrExtractedText(text);
                        toast.success('Report scanned successfully! Review the extracted text below.');
                      }}
                      documentType={selectedInvestigation.category === 'imaging' ? 'imaging_report' : 'lab_report'}
                    />
                    {ocrExtractedText && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">Extracted Report Text</h4>
                          <button
                            type="button"
                            onClick={() => {
                              setOcrExtractedText('');
                              setShowOCRScanner(false);
                            }}
                            className="text-sm text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </button>
                        </div>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border max-h-40 overflow-y-auto">
                          {ocrExtractedText}
                        </pre>
                        <p className="text-xs text-gray-500 mt-2">
                          Copy values from the extracted text above to fill in the result fields below.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Parameter Inputs */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Result Values</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {investigationCategories
                      .find(c => c.category === selectedInvestigation.category)
                      ?.types.find(t => t.type === selectedInvestigation.type)
                      ?.parameters.map((param) => (
                        <div key={param}>
                          <label className="text-sm text-gray-600">{param}</label>
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={resultValues[param] || ''}
                              onChange={(e) => setResultValues(prev => ({ ...prev, [param]: e.target.value }))}
                              className="input flex-1"
                              placeholder={referenceRanges[param] ? `${referenceRanges[param].min}-${referenceRanges[param].max}` : 'Value'}
                            />
                            {referenceRanges[param] && (
                              <span className="text-xs text-gray-400">{referenceRanges[param].unit}</span>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Upload Attachment</h3>
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-purple-300 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                      title="Upload investigation result file"
                    />
                    {uploadedFile ? (
                      <div className="flex items-center justify-center gap-2">
                        <FileImage className="w-8 h-8 text-purple-500" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                          <p className="text-sm text-gray-500">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedFile(null);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Remove file"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">Click to upload result document</p>
                        <p className="text-sm text-gray-400">PDF, Images (max 10MB)</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Interpretation */}
                <div>
                  <label className="label">Interpretation / Comments</label>
                  <textarea
                    {...resultForm.register('interpretation')}
                    className="input"
                    rows={3}
                    placeholder="Clinical interpretation of results..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowResultModal(false)}
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResultUpload}
                    className="btn btn-primary flex-1"
                  >
                    <Save size={18} />
                    Save Results
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Results Modal */}
      <AnimatePresence>
        {showTrendModal && selectedInvestigation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowTrendModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Investigation Results</h2>
                  <p className="text-sm text-gray-500">{selectedInvestigation.typeName} - {selectedInvestigation.patientName}</p>
                </div>
                <button onClick={() => setShowTrendModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6">
                {selectedInvestigation.results && selectedInvestigation.results.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Parameter</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedInvestigation.results.map((result) => (
                        <tr key={result.id}>
                          <td className="px-4 py-3 font-medium">{result.parameter}</td>
                          <td className="px-4 py-3">{result.value} {result.unit}</td>
                          <td className="px-4 py-3 text-gray-500">{result.referenceRange || '-'}</td>
                          <td className="px-4 py-3">
                            {result.flag && (
                              <span className={`badge ${
                                ['normal', 'A'].includes(result.flag) ? 'badge-success' :
                                ['high', 'H', 'HH'].includes(result.flag) ? 'badge-danger' :
                                ['low', 'L', 'LL'].includes(result.flag) ? 'badge-warning' : 'badge-secondary'
                              }`}>
                                {result.flag}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-center text-gray-500 py-8">No results available</p>
                )}

                {selectedInvestigation.interpretation && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Interpretation</h4>
                    <p className="text-gray-600">{selectedInvestigation.interpretation}</p>
                  </div>
                )}

                {selectedInvestigation.attachments && selectedInvestigation.attachments.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-gray-900 mb-2">Attachments</h4>
                    <div className="flex gap-2">
                      {selectedInvestigation.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <FileImage size={16} />
                          <span className="text-sm">{att.fileName}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical Comments Section */}
                <div className="mt-6">
                  <ClinicalCommentsSection
                    entityType="investigation"
                    entityId={selectedInvestigation.id}
                    patientId={selectedInvestigation.patientId}
                    hospitalId={selectedInvestigation.hospitalId}
                    title="Post-Investigation Notes"
                    placeholder="Add any clarifications, important findings to highlight, or follow-up instructions..."
                    collapsed={false}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Options Modal */}
      {exportInvestigation && (
        <ExportOptionsModal
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false);
            setExportInvestigation(null);
          }}
          title="Export Investigation Request"
          generateA4PDF={() => generateInvestigationA4PDF(exportInvestigation)}
          generateThermalPDF={() => generateInvestigationThermalPDF(exportInvestigation)}
          fileNamePrefix={`investigation_${exportInvestigation.typeName?.replace(/\s+/g, '_') || 'request'}`}
        />
      )}    </div>
  );
}