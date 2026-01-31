/**
 * Lifestyle Modifications Generator Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Auto-generates personalized lifestyle modification recommendations
 * based on patient's comorbidities and surgical history
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Cigarette,
  Wine,
  Dumbbell,
  Scale,
  Moon,
  Brain,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Droplets,
  Pill,
  Stethoscope,
  Leaf,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

// ============================================
// LIFESTYLE MODIFICATION DATABASE
// ============================================

export type ComorbidityType =
  | 'hypertension'
  | 'diabetes_type1'
  | 'diabetes_type2'
  | 'heart_disease'
  | 'heart_failure'
  | 'stroke'
  | 'obesity'
  | 'copd'
  | 'asthma'
  | 'kidney_disease'
  | 'liver_disease'
  | 'arthritis'
  | 'osteoporosis'
  | 'cancer'
  | 'depression'
  | 'anxiety'
  | 'thyroid_disorder'
  | 'anaemia'
  | 'hiv'
  | 'sickle_cell';

export type SurgeryCategory =
  | 'abdominal'
  | 'cardiac'
  | 'orthopaedic'
  | 'neurosurgery'
  | 'thoracic'
  | 'vascular'
  | 'urological'
  | 'gynaecological'
  | 'wound_debridement'
  | 'burns'
  | 'amputation'
  | 'general';

export interface LifestyleCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface LifestyleRecommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  frequency?: string;
  warning?: string;
  priority: 'high' | 'medium' | 'low';
  applicableFor: {
    comorbidities?: ComorbidityType[];
    surgeries?: SurgeryCategory[];
    all?: boolean;
  };
  contraindicated?: ComorbidityType[];
  nigerianContext?: string;
}

export const lifestyleCategories: LifestyleCategory[] = [
  { id: 'diet', name: 'Dietary Modifications', icon: 'Leaf', description: 'Food and nutrition guidelines' },
  { id: 'exercise', name: 'Physical Activity', icon: 'Dumbbell', description: 'Exercise and movement' },
  { id: 'smoking', name: 'Smoking Cessation', icon: 'Cigarette', description: 'Tobacco and nicotine' },
  { id: 'alcohol', name: 'Alcohol Moderation', icon: 'Wine', description: 'Alcohol consumption' },
  { id: 'weight', name: 'Weight Management', icon: 'Scale', description: 'Healthy weight maintenance' },
  { id: 'sleep', name: 'Sleep Hygiene', icon: 'Moon', description: 'Rest and recovery' },
  { id: 'stress', name: 'Stress Management', icon: 'Brain', description: 'Mental wellness' },
  { id: 'hydration', name: 'Hydration', icon: 'Droplets', description: 'Fluid intake' },
  { id: 'medications', name: 'Medication Adherence', icon: 'Pill', description: 'Drug compliance' },
  { id: 'monitoring', name: 'Self-Monitoring', icon: 'Stethoscope', description: 'Home health checks' },
];

export const lifestyleRecommendations: LifestyleRecommendation[] = [
  // DIETARY MODIFICATIONS
  {
    id: 'diet-low-sodium',
    category: 'diet',
    title: 'Reduce Salt/Sodium Intake',
    description: 'Limit salt intake to less than 5g (1 teaspoon) per day. Avoid adding salt to cooked food and reduce processed foods.',
    priority: 'high',
    applicableFor: { comorbidities: ['hypertension', 'heart_disease', 'heart_failure', 'kidney_disease', 'stroke'] },
    nigerianContext: 'Reduce maggi/knorr cubes in cooking. Use natural spices like curry, thyme, and onions for flavour instead.',
  },
  {
    id: 'diet-low-sugar',
    category: 'diet',
    title: 'Control Sugar Intake',
    description: 'Limit added sugars and refined carbohydrates. Choose complex carbohydrates with low glycemic index.',
    priority: 'high',
    applicableFor: { comorbidities: ['diabetes_type1', 'diabetes_type2', 'obesity', 'heart_disease'] },
    nigerianContext: 'Reduce sugar in tea/pap, choose whole grains like ofada rice, and limit soft drinks and malt.',
  },
  {
    id: 'diet-high-fiber',
    category: 'diet',
    title: 'Increase Dietary Fiber',
    description: 'Eat more fruits, vegetables, legumes, and whole grains. Aim for 25-30g of fiber daily.',
    priority: 'medium',
    applicableFor: { comorbidities: ['diabetes_type2', 'obesity', 'heart_disease', 'hypertension'] },
    nigerianContext: 'Include beans (ewa), vegetables (efo, ugwu), unripe plantain, and oats regularly.',
  },
  {
    id: 'diet-heart-healthy',
    category: 'diet',
    title: 'Heart-Healthy Diet',
    description: 'Emphasize fruits, vegetables, fish, lean proteins, and healthy fats. Limit saturated and trans fats.',
    priority: 'high',
    applicableFor: { comorbidities: ['heart_disease', 'heart_failure', 'stroke', 'hypertension'] },
    nigerianContext: 'Eat more fish (mackerel, titus), reduce red meat, use groundnut oil in moderation, avoid fried foods.',
  },
  {
    id: 'diet-protein-healing',
    category: 'diet',
    title: 'Adequate Protein for Healing',
    description: 'Increase protein intake to 1.2-1.5g per kg body weight to support wound healing and tissue repair.',
    priority: 'high',
    applicableFor: { surgeries: ['wound_debridement', 'burns', 'amputation', 'abdominal', 'orthopaedic'] },
    nigerianContext: 'Include eggs, fish, chicken, beans, and groundnuts daily. Moi moi and akara are good protein sources.',
  },
  {
    id: 'diet-vitamin-c',
    category: 'diet',
    title: 'Vitamin C for Wound Healing',
    description: 'Consume vitamin C-rich foods daily to support collagen synthesis and wound healing.',
    priority: 'medium',
    applicableFor: { surgeries: ['wound_debridement', 'burns', 'amputation', 'general'] },
    nigerianContext: 'Eat oranges, pineapples, pawpaw, guava, and vegetables like tomatoes and green peppers.',
  },
  {
    id: 'diet-iron-rich',
    category: 'diet',
    title: 'Iron-Rich Foods for Anaemia',
    description: 'Consume iron-rich foods with vitamin C to enhance absorption. Avoid tea/coffee with meals.',
    priority: 'high',
    applicableFor: { comorbidities: ['anaemia', 'sickle_cell'] },
    nigerianContext: 'Eat liver, red meat, beans, leafy vegetables (efo, ugwu), and drink zobo. Take with orange juice.',
  },
  {
    id: 'diet-renal',
    category: 'diet',
    title: 'Kidney-Friendly Diet',
    description: 'Limit potassium, phosphorus, and protein as advised. Control fluid intake if prescribed.',
    priority: 'high',
    applicableFor: { comorbidities: ['kidney_disease'] },
    nigerianContext: 'Reduce plantain, potatoes, oranges, and crayfish. Follow your dietician\'s specific guidance.',
    warning: 'Strict dietary modifications - consult your nephrologist',
  },
  {
    id: 'diet-liver-friendly',
    category: 'diet',
    title: 'Liver-Supportive Diet',
    description: 'Avoid alcohol completely, limit fatty foods, ensure adequate protein unless contraindicated.',
    priority: 'high',
    applicableFor: { comorbidities: ['liver_disease'] },
    nigerianContext: 'Absolutely no alcohol, palm wine, or ogogoro. Eat small frequent meals with lean proteins.',
    warning: 'Alcohol is strictly prohibited',
  },
  {
    id: 'diet-calcium',
    category: 'diet',
    title: 'Calcium and Vitamin D',
    description: 'Ensure adequate calcium (1000-1200mg/day) and vitamin D for bone health.',
    priority: 'high',
    applicableFor: { comorbidities: ['osteoporosis', 'arthritis'], surgeries: ['orthopaedic'] },
    nigerianContext: 'Include milk, yoghurt, crayfish, small dried fish (iru), and leafy vegetables. Get morning sunlight.',
  },

  // PHYSICAL ACTIVITY
  {
    id: 'exercise-walking',
    category: 'exercise',
    title: 'Regular Walking',
    description: 'Walk for at least 30 minutes most days of the week. Start gradually and increase duration.',
    frequency: '30 minutes, 5 days/week',
    priority: 'high',
    applicableFor: { all: true },
    contraindicated: [],
    nigerianContext: 'Walk in the morning or evening to avoid afternoon heat. Use shaded areas or indoor spaces.',
  },
  {
    id: 'exercise-post-surgery',
    category: 'exercise',
    title: 'Post-Surgery Mobilization',
    description: 'Start with gentle movements and progress as tolerated. Follow your physiotherapist\'s guidance.',
    priority: 'high',
    applicableFor: { surgeries: ['abdominal', 'cardiac', 'orthopaedic', 'neurosurgery', 'thoracic', 'general'] },
    warning: 'Do not lift heavy objects or strain for 6-8 weeks post-surgery',
  },
  {
    id: 'exercise-cardiac-rehab',
    category: 'exercise',
    title: 'Cardiac Rehabilitation Exercise',
    description: 'Participate in supervised cardiac rehabilitation program. Progress gradually under medical supervision.',
    frequency: 'As prescribed by cardiac team',
    priority: 'high',
    applicableFor: { comorbidities: ['heart_disease', 'heart_failure'], surgeries: ['cardiac'] },
    warning: 'Stop if you experience chest pain, dizziness, or severe shortness of breath',
  },
  {
    id: 'exercise-joint-friendly',
    category: 'exercise',
    title: 'Low-Impact Exercises',
    description: 'Swimming, cycling, and walking are easier on joints. Avoid high-impact activities.',
    frequency: '20-30 minutes, 5 days/week',
    priority: 'medium',
    applicableFor: { comorbidities: ['arthritis', 'osteoporosis', 'obesity'] },
    nigerianContext: 'If swimming is not accessible, water walking or chair exercises are alternatives.',
  },
  {
    id: 'exercise-breathing',
    category: 'exercise',
    title: 'Breathing Exercises',
    description: 'Practice deep breathing exercises to improve lung function and reduce stress.',
    frequency: '10 minutes, 3 times daily',
    priority: 'medium',
    applicableFor: { comorbidities: ['copd', 'asthma', 'anxiety'], surgeries: ['thoracic', 'cardiac', 'abdominal'] },
  },
  {
    id: 'exercise-amputation',
    category: 'exercise',
    title: 'Post-Amputation Exercises',
    description: 'Residual limb conditioning, phantom limb management, and mobility training.',
    priority: 'high',
    applicableFor: { surgeries: ['amputation'] },
    warning: 'Work with a physiotherapist experienced in amputee rehabilitation',
  },

  // SMOKING CESSATION
  {
    id: 'smoking-quit',
    category: 'smoking',
    title: 'Stop Smoking Completely',
    description: 'Quitting smoking is the single most important thing you can do for your health. Seek support.',
    priority: 'high',
    applicableFor: { comorbidities: ['heart_disease', 'stroke', 'copd', 'asthma', 'hypertension', 'diabetes_type2', 'cancer'] },
    nigerianContext: 'Avoid areas where people smoke. Chew kolanut or bitter kola if you need oral fixation.',
  },
  {
    id: 'smoking-wound',
    category: 'smoking',
    title: 'Avoid Smoking During Healing',
    description: 'Smoking impairs wound healing by reducing blood flow. Avoid all tobacco products.',
    priority: 'high',
    applicableFor: { surgeries: ['wound_debridement', 'burns', 'amputation', 'general', 'vascular'] },
    warning: 'Smoking significantly delays wound healing and increases infection risk',
  },

  // ALCOHOL
  {
    id: 'alcohol-moderation',
    category: 'alcohol',
    title: 'Limit Alcohol Intake',
    description: 'Men: max 2 drinks/day. Women: max 1 drink/day. One drink = 1 bottle of beer or 1 glass of wine.',
    priority: 'medium',
    applicableFor: { comorbidities: ['hypertension', 'heart_disease', 'diabetes_type2', 'obesity'] },
    nigerianContext: 'This includes beer, palm wine, ogogoro, and all alcoholic drinks.',
  },
  {
    id: 'alcohol-avoid',
    category: 'alcohol',
    title: 'Avoid Alcohol Completely',
    description: 'Complete abstinence from alcohol is required for your condition.',
    priority: 'high',
    applicableFor: { comorbidities: ['liver_disease', 'depression'] },
    warning: 'Alcohol is strictly prohibited',
    nigerianContext: 'No palm wine, beer, ogogoro, or any alcoholic beverage including "small stout".',
  },
  {
    id: 'alcohol-medication',
    category: 'alcohol',
    title: 'Avoid Alcohol with Medications',
    description: 'Alcohol interacts with many medications. Avoid alcohol while taking your prescribed drugs.',
    priority: 'high',
    applicableFor: { surgeries: ['general', 'abdominal', 'cardiac', 'neurosurgery'] },
  },

  // WEIGHT MANAGEMENT
  {
    id: 'weight-loss',
    category: 'weight',
    title: 'Achieve Healthy Weight',
    description: 'Lose 5-10% of body weight through diet and exercise. This significantly improves health outcomes.',
    priority: 'high',
    applicableFor: { comorbidities: ['obesity', 'hypertension', 'diabetes_type2', 'heart_disease', 'arthritis'] },
  },
  {
    id: 'weight-monitoring',
    category: 'weight',
    title: 'Regular Weight Monitoring',
    description: 'Weigh yourself weekly at the same time, wearing similar clothing.',
    frequency: 'Weekly',
    priority: 'medium',
    applicableFor: { comorbidities: ['obesity', 'heart_failure', 'kidney_disease'] },
    warning: 'Sudden weight gain may indicate fluid retention - contact your doctor',
  },

  // SLEEP HYGIENE
  {
    id: 'sleep-regular',
    category: 'sleep',
    title: 'Maintain Regular Sleep Schedule',
    description: 'Go to bed and wake up at consistent times. Aim for 7-9 hours of quality sleep.',
    frequency: '7-9 hours nightly',
    priority: 'medium',
    applicableFor: { all: true },
    nigerianContext: 'Avoid generator noise at night if possible. Use fans or AC for comfortable sleep environment.',
  },
  {
    id: 'sleep-apnea',
    category: 'sleep',
    title: 'Address Sleep Apnea',
    description: 'If you snore heavily or feel tired despite sleeping, you may have sleep apnea. Report to your doctor.',
    priority: 'medium',
    applicableFor: { comorbidities: ['obesity', 'hypertension', 'heart_disease', 'heart_failure'] },
  },

  // STRESS MANAGEMENT
  {
    id: 'stress-reduction',
    category: 'stress',
    title: 'Practice Stress Reduction',
    description: 'Use relaxation techniques, prayer, meditation, or other calming activities daily.',
    frequency: '10-20 minutes daily',
    priority: 'medium',
    applicableFor: { comorbidities: ['hypertension', 'heart_disease', 'anxiety', 'depression', 'diabetes_type2'] },
    nigerianContext: 'Prayer, meditation, listening to calm music, or spending time in nature can help.',
  },
  {
    id: 'stress-support',
    category: 'stress',
    title: 'Seek Social Support',
    description: 'Connect with family, friends, support groups, or religious community. Don\'t isolate.',
    priority: 'medium',
    applicableFor: { comorbidities: ['depression', 'anxiety', 'cancer'] },
    nigerianContext: 'Church/mosque community, family gatherings, and support groups are valuable resources.',
  },

  // HYDRATION
  {
    id: 'hydration-adequate',
    category: 'hydration',
    title: 'Adequate Fluid Intake',
    description: 'Drink at least 8 glasses (2 liters) of water daily unless fluid restricted.',
    frequency: '2-3 liters daily',
    priority: 'medium',
    applicableFor: { all: true },
    nigerianContext: 'Carry water with you. Drink more during hot weather or when working outdoors.',
  },
  {
    id: 'hydration-restricted',
    category: 'hydration',
    title: 'Follow Fluid Restriction',
    description: 'Limit fluid intake to prescribed amount. Measure all fluids including soups and fruits.',
    priority: 'high',
    applicableFor: { comorbidities: ['heart_failure', 'kidney_disease'] },
    warning: 'Strict fluid restriction as prescribed by your doctor',
  },

  // MEDICATION ADHERENCE
  {
    id: 'med-adherence',
    category: 'medications',
    title: 'Take Medications as Prescribed',
    description: 'Never skip doses or stop medications without consulting your doctor.',
    priority: 'high',
    applicableFor: { all: true },
    nigerianContext: 'Set phone alarms, use pill boxes, or ask family members to remind you.',
  },
  {
    id: 'med-anticoagulant',
    category: 'medications',
    title: 'Anticoagulant Precautions',
    description: 'Take blood thinners at same time daily. Watch for unusual bleeding. Attend regular INR checks.',
    priority: 'high',
    applicableFor: { comorbidities: ['heart_disease', 'stroke'] },
    warning: 'Report unusual bleeding, bruising, or black stool immediately',
  },
  {
    id: 'med-insulin',
    category: 'medications',
    title: 'Insulin Management',
    description: 'Store insulin properly, rotate injection sites, monitor blood sugar as prescribed.',
    priority: 'high',
    applicableFor: { comorbidities: ['diabetes_type1', 'diabetes_type2'] },
    nigerianContext: 'Keep insulin in fridge or cool box. Don\'t leave in hot car or under sun.',
  },

  // SELF-MONITORING
  {
    id: 'monitor-bp',
    category: 'monitoring',
    title: 'Home Blood Pressure Monitoring',
    description: 'Check BP at least twice weekly. Keep a log to share with your doctor.',
    frequency: '2-3 times per week',
    priority: 'high',
    applicableFor: { comorbidities: ['hypertension', 'heart_disease', 'kidney_disease', 'stroke'] },
    nigerianContext: 'Digital BP monitors are available at pharmacies. Sit quietly for 5 minutes before checking.',
  },
  {
    id: 'monitor-glucose',
    category: 'monitoring',
    title: 'Blood Sugar Monitoring',
    description: 'Check fasting and post-meal blood sugar as advised. Keep a log book.',
    frequency: 'As prescribed',
    priority: 'high',
    applicableFor: { comorbidities: ['diabetes_type1', 'diabetes_type2'] },
    nigerianContext: 'Glucometers and strips available at pharmacies. Check in the morning before eating.',
  },
  {
    id: 'monitor-wounds',
    category: 'monitoring',
    title: 'Wound Monitoring',
    description: 'Check wounds daily for signs of infection: redness, swelling, discharge, fever.',
    frequency: 'Daily',
    priority: 'high',
    applicableFor: { surgeries: ['wound_debridement', 'burns', 'amputation', 'general', 'abdominal'] },
    warning: 'Report signs of infection immediately: fever, increased redness, pus, or foul smell',
  },
  {
    id: 'monitor-weight-fluid',
    category: 'monitoring',
    title: 'Daily Weight for Fluid Balance',
    description: 'Weigh yourself every morning before breakfast. Report weight gain >1kg in one day.',
    frequency: 'Daily',
    priority: 'high',
    applicableFor: { comorbidities: ['heart_failure'] },
    warning: 'Sudden weight gain indicates fluid retention - contact your doctor',
  },
];

// ============================================
// COMPONENT
// ============================================

interface PatientProfile {
  name: string;
  hospitalNumber: string;
  comorbidities: ComorbidityType[];
  surgeryType?: SurgeryCategory;
  surgeryName?: string;
  diagnosisOnDischarge?: string;
}

interface Props {
  patientProfile: PatientProfile;
  onRecommendationsGenerated?: (recommendations: LifestyleRecommendation[]) => void;
  readOnly?: boolean;
}

const comorbidityLabels: Record<ComorbidityType, string> = {
  hypertension: 'Hypertension',
  diabetes_type1: 'Type 1 Diabetes',
  diabetes_type2: 'Type 2 Diabetes',
  heart_disease: 'Coronary Heart Disease',
  heart_failure: 'Heart Failure',
  stroke: 'Stroke/CVA',
  obesity: 'Obesity',
  copd: 'COPD',
  asthma: 'Asthma',
  kidney_disease: 'Chronic Kidney Disease',
  liver_disease: 'Liver Disease',
  arthritis: 'Arthritis',
  osteoporosis: 'Osteoporosis',
  cancer: 'Cancer',
  depression: 'Depression',
  anxiety: 'Anxiety',
  thyroid_disorder: 'Thyroid Disorder',
  anaemia: 'Anaemia',
  hiv: 'HIV/AIDS',
  sickle_cell: 'Sickle Cell Disease',
};

export default function LifestyleModifications({
  patientProfile,
  onRecommendationsGenerated,
  readOnly = false,
}: Props) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['diet', 'exercise']);
  const [customRecommendations, setCustomRecommendations] = useState<string[]>([]);
  const [newCustomRec, setNewCustomRec] = useState('');

  // Generate recommendations based on patient profile
  const recommendations = useMemo(() => {
    const matchedRecs: LifestyleRecommendation[] = [];

    lifestyleRecommendations.forEach(rec => {
      // Check if contraindicated
      if (rec.contraindicated?.some(c => patientProfile.comorbidities.includes(c))) {
        return;
      }

      // Check if applicable
      let applicable = false;

      if (rec.applicableFor.all) {
        applicable = true;
      }

      if (rec.applicableFor.comorbidities?.some(c => patientProfile.comorbidities.includes(c))) {
        applicable = true;
      }

      if (rec.applicableFor.surgeries && patientProfile.surgeryType) {
        if (rec.applicableFor.surgeries.includes(patientProfile.surgeryType)) {
          applicable = true;
        }
      }

      if (applicable) {
        matchedRecs.push(rec);
      }
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    matchedRecs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    if (onRecommendationsGenerated) {
      onRecommendationsGenerated(matchedRecs);
    }

    return matchedRecs;
  }, [patientProfile, onRecommendationsGenerated]);

  // Group by category
  const groupedRecommendations = useMemo(() => {
    const groups: Record<string, LifestyleRecommendation[]> = {};
    recommendations.forEach(rec => {
      if (!groups[rec.category]) groups[rec.category] = [];
      groups[rec.category].push(rec);
    });
    return groups;
  }, [recommendations]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(c => c !== categoryId) : [...prev, categoryId]
    );
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'diet': return Leaf;
      case 'exercise': return Dumbbell;
      case 'smoking': return Cigarette;
      case 'alcohol': return Wine;
      case 'weight': return Scale;
      case 'sleep': return Moon;
      case 'stress': return Brain;
      case 'hydration': return Droplets;
      case 'medications': return Pill;
      case 'monitoring': return Stethoscope;
      default: return Activity;
    }
  };

  const addCustomRecommendation = () => {
    if (newCustomRec.trim()) {
      setCustomRecommendations(prev => [...prev, newCustomRec.trim()]);
      setNewCustomRec('');
    }
  };

  // Generate PDF
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(34, 197, 94);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Lifestyle Modifications Guide', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Personalized recommendations for your health', pageWidth / 2, 25, { align: 'center' });
    doc.text('AstroHEALTH Innovations in Healthcare', pageWidth / 2, 33, { align: 'center' });

    yPos = 50;

    // Patient Info
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
    doc.setFontSize(10);
    doc.text(`Patient: ${patientProfile.name}`, 20, yPos + 8);
    doc.text(`Hospital No: ${patientProfile.hospitalNumber}`, 20, yPos + 15);
    doc.text(`Date: ${format(new Date(), 'PPpp')}`, 20, yPos + 22);
    yPos += 35;

    // Conditions
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Your Health Conditions:', 15, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const conditions = patientProfile.comorbidities.map(c => comorbidityLabels[c]).join(', ');
    const splitConditions = doc.splitTextToSize(conditions || 'None documented', pageWidth - 40);
    doc.text(splitConditions, 20, yPos);
    yPos += splitConditions.length * 5 + 10;

    if (patientProfile.surgeryType) {
      doc.text(`Recent Surgery: ${patientProfile.surgeryName || patientProfile.surgeryType}`, 20, yPos);
      yPos += 10;
    }

    // Recommendations
    Object.entries(groupedRecommendations).forEach(([categoryId, recs]) => {
      const category = lifestyleCategories.find(c => c.id === categoryId);
      if (!category || recs.length === 0) return;

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Category Header
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 101, 52);
      doc.text(category.name.toUpperCase(), 20, yPos + 7);
      yPos += 15;

      doc.setTextColor(0, 0, 0);
      recs.forEach(rec => {
        if (yPos > 265) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const prioritySymbol = rec.priority === 'high' ? '●' : rec.priority === 'medium' ? '◐' : '○';
        doc.text(`${prioritySymbol} ${rec.title}`, 20, yPos);
        yPos += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const splitDesc = doc.splitTextToSize(rec.description, pageWidth - 50);
        doc.text(splitDesc, 25, yPos);
        yPos += splitDesc.length * 4 + 2;

        if (rec.nigerianContext) {
          doc.setTextColor(34, 139, 34);
          const splitContext = doc.splitTextToSize(`Local tip: ${rec.nigerianContext}`, pageWidth - 55);
          doc.text(splitContext, 27, yPos);
          yPos += splitContext.length * 4 + 2;
          doc.setTextColor(0, 0, 0);
        }

        if (rec.warning) {
          doc.setTextColor(220, 38, 38);
          const splitWarning = doc.splitTextToSize(`⚠️ ${rec.warning}`, pageWidth - 55);
          doc.text(splitWarning, 27, yPos);
          yPos += splitWarning.length * 4 + 2;
          doc.setTextColor(0, 0, 0);
        }

        if (rec.frequency) {
          doc.text(`Frequency: ${rec.frequency}`, 27, yPos);
          yPos += 5;
        }

        yPos += 3;
      });

      yPos += 5;
    });

    // Custom Recommendations
    if (customRecommendations.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(254, 249, 195);
      doc.roundedRect(15, yPos, pageWidth - 30, 10, 2, 2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(113, 63, 18);
      doc.text('ADDITIONAL RECOMMENDATIONS', 20, yPos + 7);
      yPos += 15;

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      customRecommendations.forEach(rec => {
        const splitRec = doc.splitTextToSize(`• ${rec}`, pageWidth - 50);
        doc.text(splitRec, 20, yPos);
        yPos += splitRec.length * 4 + 3;
      });
    }

    // Footer on all pages
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('For Patient Education - Follow your doctor\'s specific instructions', pageWidth / 2, 295, { align: 'center' });
    }

    doc.save(`Lifestyle-Modifications-${patientProfile.hospitalNumber}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <Leaf className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Lifestyle Modifications</h3>
            <p className="text-xs text-gray-500">
              {recommendations.length} personalized recommendations
            </p>
          </div>
        </div>
        <button
          onClick={generatePDF}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Download size={14} />
          PDF
        </button>
      </div>

      {/* Patient Conditions Summary */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <p className="text-sm font-medium text-gray-700">Based on your conditions:</p>
        <div className="flex flex-wrap gap-1">
          {patientProfile.comorbidities.map(c => (
            <span key={c} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {comorbidityLabels[c]}
            </span>
          ))}
          {patientProfile.surgeryType && (
            <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded-full">
              {patientProfile.surgeryName || patientProfile.surgeryType} surgery
            </span>
          )}
        </div>
      </div>

      {/* Priority Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full" /> High Priority
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-yellow-500 rounded-full" /> Medium
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full" /> Low
        </span>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {lifestyleCategories.map(category => {
          const categoryRecs = groupedRecommendations[category.id] || [];
          if (categoryRecs.length === 0) return null;

          const CategoryIcon = getCategoryIcon(category.id);
          const highPriorityCount = categoryRecs.filter(r => r.priority === 'high').length;

          return (
            <div key={category.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleCategory(category.id)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CategoryIcon className="w-5 h-5 text-green-600" />
                  <span className="font-medium">{category.name}</span>
                  <span className="px-2 py-0.5 text-xs bg-gray-200 rounded-full">
                    {categoryRecs.length}
                  </span>
                  {highPriorityCount > 0 && (
                    <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                      {highPriorityCount} high priority
                    </span>
                  )}
                </div>
                {expandedCategories.includes(category.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>

              <AnimatePresence>
                {expandedCategories.includes(category.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-3 bg-white">
                      {categoryRecs.map(rec => (
                        <div
                          key={rec.id}
                          className={`p-3 rounded-lg border-l-4 ${
                            rec.priority === 'high'
                              ? 'border-l-red-500 bg-red-50'
                              : rec.priority === 'medium'
                              ? 'border-l-yellow-500 bg-yellow-50'
                              : 'border-l-gray-400 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{rec.title}</p>
                              <p className="text-xs text-gray-600 mt-1">{rec.description}</p>
                              {rec.frequency && (
                                <p className="text-xs text-blue-600 mt-1">
                                  📅 {rec.frequency}
                                </p>
                              )}
                              {rec.nigerianContext && (
                                <p className="text-xs text-green-700 mt-1 italic">
                                  🇳🇬 {rec.nigerianContext}
                                </p>
                              )}
                              {rec.warning && (
                                <div className="flex items-start gap-1 mt-2 text-xs text-red-600">
                                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                                  <span>{rec.warning}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Custom Recommendations */}
      {!readOnly && (
        <div className="border rounded-lg p-3 space-y-2 bg-amber-50">
          <p className="text-sm font-medium text-amber-800">Additional Recommendations:</p>
          {customRecommendations.map((rec, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-amber-600" />
              <span className="flex-1">{rec}</span>
              <button
                onClick={() => setCustomRecommendations(prev => prev.filter((_, i) => i !== idx))}
                className="text-red-500 hover:text-red-700 text-xs"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newCustomRec}
              onChange={(e) => setNewCustomRec(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addCustomRecommendation()}
              placeholder="Add custom recommendation..."
              className="flex-1 px-3 py-1.5 text-sm border rounded-lg"
            />
            <button
              onClick={addCustomRecommendation}
              disabled={!newCustomRec.trim()}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
