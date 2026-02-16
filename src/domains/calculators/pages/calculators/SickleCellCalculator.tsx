// Sickle Cell Crisis Calculator
// Crisis Management, Hydroxyurea Dosing, Wound Healing, and Exchange Transfusion Guidelines

import { useState } from 'react';
import { Calculator, AlertTriangle, Droplets, Activity, Thermometer, FileText, Scissors } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { PatientCalculatorInfo, SickleCellResult } from '../../types';

interface WoundHealingAssessment {
  hasWound: boolean;
  woundType: string;
  woundLocation: string;
  woundDuration: string;
  woundSize: string;
  currentTreatment: string;
  zincLevel: string;
  albuminLevel: string;
  nutritionStatus: string;
}

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function SickleCellCalculator({ patientInfo }: Props) {
  const [weight, setWeight] = useState(patientInfo.weight || '');
  const [age, setAge] = useState(patientInfo.age || '');
  const [hbLevel, setHbLevel] = useState('');
  const [hbS, setHbS] = useState(''); // HbS percentage
  const [reticulocyteCount, setReticulocyteCount] = useState('');
  
  // Crisis type
  const [crisisType, setCrisisType] = useState<string>('vaso-occlusive');
  
  // Severity indicators
  const [painScore, setPainScore] = useState<number>(5);
  const [hasFever, setHasFever] = useState(false);
  const [hasACS, setHasACS] = useState(false);
  const [hasStroke, setHasStroke] = useState(false);
  const [hasPriapism, setHasPriapism] = useState(false);
  const [hasSplenic, setHasSplenic] = useState(false);
  const [hasAplastic, setHasAplastic] = useState(false);
  
  // Current treatment
  const [onHydroxyurea, setOnHydroxyurea] = useState(false);
  const [currentHUDose, setCurrentHUDose] = useState('');
  const [transfusionHistory, setTransfusionHistory] = useState<string>('none');
  
  // Wound healing assessment
  const [woundAssessment, setWoundAssessment] = useState<WoundHealingAssessment>({
    hasWound: false,
    woundType: 'leg_ulcer',
    woundLocation: 'medial_malleolus',
    woundDuration: '',
    woundSize: '',
    currentTreatment: '',
    zincLevel: '',
    albuminLevel: '',
    nutritionStatus: 'adequate',
  });
  
  const [result, setResult] = useState<SickleCellResult | null>(null);

  const crisisTypes = [
    { value: 'vaso-occlusive', label: 'Vaso-Occlusive Crisis (VOC)', description: 'Pain crisis - most common' },
    { value: 'acs', label: 'Acute Chest Syndrome', description: 'Pulmonary complication - emergency' },
    { value: 'aplastic', label: 'Aplastic Crisis', description: 'Parvovirus B19 - severe anemia' },
    { value: 'sequestration', label: 'Splenic Sequestration', description: 'Splenic pooling - children' },
    { value: 'hemolytic', label: 'Hemolytic Crisis', description: 'Acute hemolysis' },
    { value: 'stroke', label: 'Stroke/TIA', description: 'Cerebrovascular event - emergency' },
    { value: 'priapism', label: 'Priapism', description: 'Urological emergency' },
  ];

  const calculate = () => {
    const weightKg = parseFloat(weight);
    const ageYears = parseInt(age);
    const hb = parseFloat(hbLevel) || 8;
    const hbsPercent = parseFloat(hbS) || 0;
    
    // Determine severity
    let severity: 'Mild' | 'Moderate' | 'Severe' | 'Critical' = 'Moderate';
    const severityFactors: string[] = [];
    
    if (hasStroke || hasACS || hasSplenic) {
      severity = 'Critical';
      severityFactors.push('Life-threatening complication present');
    }
    if (hb < 5) {
      severity = 'Critical';
      severityFactors.push('Severe anemia (Hb < 5 g/dL)');
    } else if (hb < 6) {
      if (severity !== 'Critical') severity = 'Severe';
      severityFactors.push('Significant anemia (Hb < 6 g/dL)');
    }
    if (painScore >= 8) {
      if (severity !== 'Critical') severity = 'Severe';
      severityFactors.push('Severe pain (score ≥ 8)');
    } else if (painScore <= 4) {
      severity = 'Mild';
    }
    if (hasFever) {
      severityFactors.push('Fever present - rule out infection/ACS');
    }

    // Fluid management
    const maintenanceFluid = Math.round(((weightKg * 30) + 70));
    const hydrationRecommendation = [
      `Maintenance IV fluids: ${maintenanceFluid} mL/day (Normal Saline or D5NS)`,
      'Bolus: 10-20 mL/kg NS if dehydrated',
      'Oral hydration: 2-3L/day if tolerated',
      'Avoid over-hydration (risk of ACS)',
      'Target euvolemia - monitor fluid balance',
    ];

    // Pain management (WHO ladder adapted)
    const painManagement: string[] = [];
    if (painScore <= 3) {
      painManagement.push('Step 1: Paracetamol 1g PO q6h');
      painManagement.push('± NSAIDs (Ibuprofen 400mg TDS) if not contraindicated');
    } else if (painScore <= 6) {
      painManagement.push('Step 2: Tramadol 50-100mg PO/IV q6h');
      painManagement.push('+ Paracetamol 1g PO q6h');
      painManagement.push('Consider weak opioids');
    } else {
      painManagement.push('Step 3: Strong opioids indicated');
      painManagement.push('Morphine 0.1-0.15 mg/kg IV/SC q3-4h PRN');
      painManagement.push('OR PCA morphine if available');
      painManagement.push('+ Paracetamol 1g q6h');
      painManagement.push('+ Consider adjuvants (gabapentin, amitriptyline)');
      painManagement.push('Laxatives prophylactically with opioids');
    }

    // Transfusion guidelines
    const transfusionGuidelines: string[] = [];
    let transfusionIndicated = false;
    let exchangeTransfusion = false;
    
    if (hasStroke) {
      exchangeTransfusion = true;
      transfusionIndicated = true;
      transfusionGuidelines.push('🚨 EMERGENCY EXCHANGE TRANSFUSION INDICATED');
      transfusionGuidelines.push('Target HbS < 30%');
      transfusionGuidelines.push('Maintain Hb 10-11 g/dL');
    }
    if (hasACS && (hb < 9 || hbsPercent > 30)) {
      exchangeTransfusion = true;
      transfusionIndicated = true;
      transfusionGuidelines.push('⚠️ Exchange transfusion for severe ACS');
      transfusionGuidelines.push('Target HbS < 30%');
    } else if (hasACS) {
      transfusionIndicated = true;
      transfusionGuidelines.push('Simple transfusion to Hb 10-11 g/dL');
    }
    if (hasSplenic && hb < 6) {
      transfusionIndicated = true;
      transfusionGuidelines.push('Urgent transfusion for splenic sequestration');
      transfusionGuidelines.push('Transfuse cautiously - splenic autotransfusion may occur');
    }
    if (hasAplastic && hb < 6) {
      transfusionIndicated = true;
      transfusionGuidelines.push('Transfusion for aplastic crisis');
      transfusionGuidelines.push('Check reticulocyte count - expect recovery in 7-10 days');
    }
    if (hb < 5 && !transfusionIndicated) {
      transfusionIndicated = true;
      transfusionGuidelines.push('Severe symptomatic anemia - transfusion needed');
    }
    
    if (!transfusionIndicated) {
      transfusionGuidelines.push('Transfusion not routinely indicated');
      transfusionGuidelines.push('Simple VOC: Avoid transfusion unless Hb drops significantly');
      transfusionGuidelines.push('Target Hb should not exceed 10-11 g/dL (hyperviscosity risk)');
    }

    // Exchange transfusion calculation
    let exchangeVolume = 0;
    if (exchangeTransfusion) {
      // Blood volume estimation: 70mL/kg for adults, 80mL/kg for children
      const bloodVolume = ageYears < 18 ? 80 * weightKg : 70 * weightKg;
      exchangeVolume = Math.round(1.5 * bloodVolume); // 1.5 blood volumes
    }

    // Hydroxyurea dosing
    const hydroxyureaDosing: string[] = [];
    const initialHUDose = Math.round(15 * weightKg);
    const maxHUDose = Math.round(35 * weightKg);
    
    if (onHydroxyurea) {
      hydroxyureaDosing.push(`Current dose: ${currentHUDose || 'Unknown'} mg/day`);
      hydroxyureaDosing.push('Continue during crisis unless myelosuppression');
      hydroxyureaDosing.push('May need dose adjustment based on FBC');
    } else {
      hydroxyureaDosing.push('⚡ Hydroxyurea is disease-modifying therapy');
      hydroxyureaDosing.push(`Starting dose: ${initialHUDose} mg/day (15 mg/kg)`);
      hydroxyureaDosing.push(`Maximum dose: ${maxHUDose} mg/day (35 mg/kg)`);
      hydroxyureaDosing.push('Titrate every 8 weeks based on FBC');
      hydroxyureaDosing.push('Target: MCV >100fL, neutrophils >2.0, platelets >80');
      hydroxyureaDosing.push('Monitor FBC every 2 weeks initially, then monthly');
    }

    // Infection management
    const infectionManagement: string[] = [];
    if (hasFever) {
      infectionManagement.push('🌡️ FEVER IS AN EMERGENCY in SCD');
      infectionManagement.push('Blood cultures before antibiotics');
      infectionManagement.push('Empirical antibiotics within 1 hour:');
      infectionManagement.push('  - Ceftriaxone 2g IV (covers encapsulated organisms)');
      infectionManagement.push('  - Add Vancomycin if severely ill');
      infectionManagement.push('Malaria film if in endemic area');
      infectionManagement.push('Urinalysis and chest X-ray');
    } else {
      infectionManagement.push('No fever - low threshold to investigate if unwell');
      infectionManagement.push('Functional asplenia increases infection risk');
      infectionManagement.push('Ensure vaccinations up to date');
    }

    // ACS-specific
    const acsManagement: string[] = [];
    if (hasACS) {
      acsManagement.push('🫁 ACUTE CHEST SYNDROME PROTOCOL:');
      acsManagement.push('1. Oxygen to maintain SpO2 > 94%');
      acsManagement.push('2. Antibiotics: Ceftriaxone + Azithromycin (atypicals)');
      acsManagement.push('3. Incentive spirometry every 2 hours');
      acsManagement.push('4. Pain control (avoid over-sedation)');
      acsManagement.push('5. Bronchodilators if wheeze');
      acsManagement.push('6. Transfusion as above');
      acsManagement.push('7. ICU admission if SpO2 <90% on O2 or deteriorating');
    }

    // Monitoring
    const monitoring = [
      'Vital signs every 4 hours (every 1-2h if severe)',
      'Pain scores regularly (every 4 hours)',
      'Oxygen saturation continuous if ACS',
      'Daily FBC, reticulocytes, LDH, bilirubin',
      'U&E if dehydrated or on IV fluids',
      'Blood group and crossmatch if transfusion likely',
      'Chest X-ray if respiratory symptoms or fever',
    ];

    // Discharge criteria
    const dischargeCriteria = [
      'Pain controlled on oral analgesia',
      'Afebrile for 24 hours',
      'Adequate oral intake',
      'Stable hemoglobin',
      'No respiratory distress',
      'Social circumstances appropriate',
      'Follow-up arranged within 1-2 weeks',
    ];

    // Long-term recommendations
    const longTermRecommendations = [
      'Hydroxyurea for recurrent crises (≥3/year)',
      'Pneumococcal, meningococcal, Haemophilus vaccines',
      'Daily penicillin prophylaxis (or erythromycin if allergic)',
      'Folic acid 5mg daily',
      'Annual transcranial Doppler in children',
      'Regular ophthalmology screening',
      'Avoid dehydration, cold, hypoxia',
      'Consider chronic transfusion program if indicated',
    ];

    // Wound Healing Assessment & Recommendations (SCD-specific)
    const woundHealingRecommendations: string[] = [];
    if (woundAssessment.hasWound) {
      woundHealingRecommendations.push('SICKLE CELL WOUND HEALING PROTOCOL');
      woundHealingRecommendations.push('');
      woundHealingRecommendations.push('-- Pathophysiology --');
      woundHealingRecommendations.push('SCD wounds result from chronic microvascular occlusion, endothelial dysfunction, and tissue hypoxia.');
      woundHealingRecommendations.push('Impaired nitric oxide bioavailability reduces blood flow to wound margins.');
      woundHealingRecommendations.push('');
      woundHealingRecommendations.push('-- Wound Care --');
      woundHealingRecommendations.push('Moist wound healing: Hydrocolloid or foam dressings (change every 2-3 days)');
      woundHealingRecommendations.push('Gentle debridement of necrotic tissue if present');
      woundHealingRecommendations.push('Avoid compression bandaging if arterial insufficiency suspected');
      woundHealingRecommendations.push('Consider topical zinc oxide preparations');
      woundHealingRecommendations.push('Biofilm management: Apply antimicrobial dressings (silver or PHMB-based)');
      
      // Duration-specific
      const durationWeeks = parseInt(woundAssessment.woundDuration) || 0;
      if (durationWeeks > 12) {
        woundHealingRecommendations.push('');
        woundHealingRecommendations.push('-- Chronic Wound (>12 weeks) --');
        woundHealingRecommendations.push('Consider biopsy to rule out malignant transformation (Marjolin ulcer)');
        woundHealingRecommendations.push('Referral to wound care specialist / plastic surgeon');
        woundHealingRecommendations.push('Consider skin grafting if wound bed prepared');
        woundHealingRecommendations.push('Negative Pressure Wound Therapy (NPWT) if appropriate');
      }

      woundHealingRecommendations.push('');
      woundHealingRecommendations.push('-- Nutrition for Wound Healing --');
      woundHealingRecommendations.push('High-protein diet: 1.5-2g protein/kg/day');
      woundHealingRecommendations.push('Zinc supplementation: 220mg zinc sulfate daily (contains 50mg elemental zinc)');
      woundHealingRecommendations.push('Vitamin C: 500mg twice daily (collagen synthesis)');
      woundHealingRecommendations.push('Vitamin A: 10,000 IU daily for 10 days (epithelial cell growth)');
      woundHealingRecommendations.push('Iron supplementation if ferritin low and not on chronic transfusions');
      woundHealingRecommendations.push('Folic acid: 5mg daily (cell proliferation)');
      woundHealingRecommendations.push('Ensure adequate caloric intake: 30-35 kcal/kg/day');

      // Albumin-specific
      const albumin = parseFloat(woundAssessment.albuminLevel) || 0;
      if (albumin > 0 && albumin < 3.5) {
        woundHealingRecommendations.push('');
        woundHealingRecommendations.push('-- Hypoalbuminemia Detected --');
        woundHealingRecommendations.push(`Serum albumin: ${albumin} g/dL (low - impairs wound healing)`);
        woundHealingRecommendations.push('Increase oral protein supplements (Ensure Plus, Complan)');
        woundHealingRecommendations.push('Consider parenteral nutrition if oral intake inadequate');
      }

      woundHealingRecommendations.push('');
      woundHealingRecommendations.push('-- SCD-Specific Wound Management --');
      woundHealingRecommendations.push('Optimize hemoglobin: Target Hb 9-10 g/dL (chronic transfusion if needed)');
      woundHealingRecommendations.push('Hydroxyurea: Increases HbF, improves microvascular flow to wound');
      woundHealingRecommendations.push('Avoid tourniquets and tight dressings on affected limb');
      woundHealingRecommendations.push('Leg elevation when resting to reduce edema');
      woundHealingRecommendations.push('Ankle-brachial pressure index (ABPI) if lower limb wound');
      woundHealingRecommendations.push('Pain management: Adequate analgesia improves wound healing');
      woundHealingRecommendations.push('Smoking cessation counseling (further impairs microcirculation)');

      woundHealingRecommendations.push('');
      woundHealingRecommendations.push('-- Monitoring --');
      woundHealingRecommendations.push('Weekly wound measurement (length x width x depth)');
      woundHealingRecommendations.push('Wound photography for progress documentation');
      woundHealingRecommendations.push('Wound swab if signs of infection (increasing pain, erythema, exudate)');
      woundHealingRecommendations.push('Monthly: FBC, reticulocytes, CRP, albumin, zinc levels');
      woundHealingRecommendations.push('Review at 4 weeks - reassess if <30% reduction in wound area');
    }

    const calculationResult: SickleCellResult = {
      severity,
      severityFactors,
      crisisType: crisisTypes.find(c => c.value === crisisType)?.label || crisisType,
      hydrationRecommendation,
      hydrationRequirement: maintenanceFluid, // Required: maintenance fluid calculation
      painManagement,
      transfusionNeeded: transfusionIndicated,
      exchangeTransfusion,
      exchangeVolume,
      transfusionGuidelines,
      antibioticProphylaxis: infectionManagement, // Use infection management as antibiotic prophylaxis
      hydroxyureaIndicated: !onHydroxyurea && severity !== 'Mild', // Indicated if not already on it and crisis is not mild
      hydroxyureaDose: onHydroxyurea ? currentHUDose : `${initialHUDose} mg/day`,
      hydroxyureaDosing,
      infectionManagement,
      acsManagement,
      monitoring,
      emergencyReferral: severity === 'Critical' || hasStroke || hasACS, // Emergency referral for critical cases
      referralReasons: severity === 'Critical' ? ['Critical severity crisis', hasStroke ? 'Stroke' : '', hasACS ? 'Acute Chest Syndrome' : ''].filter(Boolean) : undefined,
      dischargeCriteria,
      longTermRecommendations,
      woundHealingRecommendations,
    };
    
    setResult(calculationResult);
  };

  // B&W PDF Export: Georgia font, size 12, 0.75 line spacing, bold headers/footers
  const generatePDF = (res: SickleCellResult) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    const fontSize = 12;
    const lineHeight = fontSize * 0.3528 * 0.75; // pt to mm * 0.75 spacing
    let y = margin;

    // White background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // All black text
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    const addNewPage = () => {
      doc.addPage();
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      y = margin;
      addFooter();
    };

    const checkPageBreak = (needed: number = lineHeight + 5) => {
      if (y + needed > pageHeight - 25) {
        addNewPage();
      }
    };

    const addFooter = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('AstroHEALTH Innovations - Sickle Cell Crisis Management Report', margin, pageHeight - 10);
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
      doc.setFontSize(fontSize);
    };

    const addHeader = (text: string) => {
      checkPageBreak(lineHeight * 3);
      y += lineHeight * 0.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.text(text.toUpperCase(), margin, y);
      y += lineHeight * 0.3;
      doc.line(margin, y, margin + contentWidth, y);
      y += lineHeight;
      doc.setFont('helvetica', 'normal');
    };

    const addLine = (text: string, bold = false) => {
      checkPageBreak();
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      // Word wrap
      const lines = doc.splitTextToSize(text, contentWidth);
      for (const line of lines) {
        checkPageBreak();
        doc.text(line, margin, y);
        y += lineHeight;
      }
    };

    const addBullet = (text: string) => {
      checkPageBreak();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, contentWidth - 8);
      doc.text('\u2022', margin + 2, y);
      for (let i = 0; i < lines.length; i++) {
        checkPageBreak();
        doc.text(lines[i], margin + 8, y);
        y += lineHeight;
      }
    };

    // === TITLE ===
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('SICKLE CELL CRISIS MANAGEMENT REPORT', pageWidth / 2, y, { align: 'center' });
    y += lineHeight * 1.5;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${format(new Date(), 'dd MMMM yyyy')}`, margin, y);
    y += lineHeight;

    // Patient info
    if (patientInfo.name) {
      addLine(`Patient: ${patientInfo.name}`, true);
      if (patientInfo.hospitalNumber) addLine(`Hospital Number: ${patientInfo.hospitalNumber}`);
      if (patientInfo.age) addLine(`Age: ${patientInfo.age} years    Gender: ${patientInfo.gender}`);
      if (patientInfo.hospital) addLine(`Hospital: ${patientInfo.hospital}`);
      if (patientInfo.diagnosis) addLine(`Diagnosis: ${patientInfo.diagnosis}`);
      y += lineHeight * 0.5;
    }

    // === SEVERITY ===
    addHeader('Crisis Assessment');
    addLine(`Severity: ${res.severity}`, true);
    addLine(`Crisis Type: ${res.crisisType}`);
    if (res.severityFactors?.length) {
      for (const f of res.severityFactors) addBullet(f);
    }

    // === PAIN MANAGEMENT ===
    addHeader('Pain Management');
    for (const item of res.painManagement) addBullet(item);

    // === FLUID MANAGEMENT ===
    addHeader('Fluid Management');
    if (res.hydrationRecommendation?.length) {
      for (const item of res.hydrationRecommendation) addBullet(item);
    }

    // === ACS ===
    if (res.acsManagement?.length) {
      addHeader('Acute Chest Syndrome Protocol');
      for (const item of res.acsManagement) addBullet(item);
    }

    // === TRANSFUSION ===
    addHeader('Transfusion Guidelines');
    if (res.exchangeTransfusion) {
      addLine(`EMERGENCY EXCHANGE TRANSFUSION - Volume: ${res.exchangeVolume?.toLocaleString()} mL`, true);
    }
    if (res.transfusionGuidelines?.length) {
      for (const item of res.transfusionGuidelines) addBullet(item.replace(/[🚨⚠️]/g, '').trim());
    }

    // === INFECTION ===
    if (res.infectionManagement?.length) {
      addHeader('Infection Management');
      for (const item of res.infectionManagement) addBullet(item.replace(/[🌡️]/g, '').trim());
    }

    // === HYDROXYUREA ===
    addHeader('Hydroxyurea Therapy');
    if (res.hydroxyureaDosing?.length) {
      for (const item of res.hydroxyureaDosing) addBullet(item.replace(/[⚡]/g, '').trim());
    }

    // === WOUND HEALING ===
    if (res.woundHealingRecommendations?.length) {
      addHeader('Wound Healing Protocol');
      for (const item of res.woundHealingRecommendations) {
        if (item === '' || item === 'SICKLE CELL WOUND HEALING PROTOCOL') continue;
        if (item.startsWith('--')) {
          y += lineHeight * 0.3;
          addLine(item.replace(/--/g, '').trim(), true);
        } else {
          addBullet(item);
        }
      }
    }

    // === MONITORING ===
    addHeader('Monitoring Parameters');
    for (const item of res.monitoring) addBullet(item);

    // === DISCHARGE ===
    if (res.dischargeCriteria?.length) {
      addHeader('Discharge Criteria');
      for (const item of res.dischargeCriteria) addBullet(item);
    }

    // === LONG-TERM ===
    if (res.longTermRecommendations?.length) {
      addHeader('Long-Term Recommendations');
      for (const item of res.longTermRecommendations) addBullet(item);
    }

    // Footer on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    const filename = patientInfo.name
      ? `SCD_Crisis_${patientInfo.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`
      : `SCD_Crisis_Report_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Droplets className="w-7 h-7 text-red-600" />
        <h2 className="text-2xl font-bold text-gray-800">Sickle Cell Crisis Calculator</h2>
      </div>

      <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Sickle Cell Disease Crisis Management</p>
            <p>Comprehensive crisis assessment, pain management, transfusion guidelines, and hydroxyurea dosing for sickle cell disease.</p>
          </div>
        </div>
      </div>

      {/* Basic Parameters */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Weight (kg) *</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 70"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Age (years) *</label>
          <input
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 25"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Hb (g/dL)</label>
          <input
            type="number"
            step="0.1"
            value={hbLevel}
            onChange={(e) => setHbLevel(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 7.5"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">HbS (%)</label>
          <input
            type="number"
            value={hbS}
            onChange={(e) => setHbS(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 85"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Reticulocytes (%)</label>
          <input
            type="number"
            step="0.1"
            value={reticulocyteCount}
            onChange={(e) => setReticulocyteCount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900"
            placeholder="e.g., 12"
          />
        </div>
      </div>

      {/* Crisis Type */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Crisis Type</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-2">
          {crisisTypes.map((crisis) => (
            <label
              key={crisis.value}
              className={`flex flex-col p-3 rounded-lg cursor-pointer border-2 transition-all ${
                crisisType === crisis.value
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="crisisType"
                checked={crisisType === crisis.value}
                onChange={() => setCrisisType(crisis.value)}
                className="sr-only"
              />
              <span className="font-medium text-sm">{crisis.label}</span>
              <span className="text-xs text-gray-500">{crisis.description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Pain Score */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">
          Pain Score (0-10): <span className="text-red-600 text-xl">{painScore}</span>
        </h4>
        <input
          type="range"
          min="0"
          max="10"
          value={painScore}
          onChange={(e) => setPainScore(parseInt(e.target.value))}
          className="w-full accent-red-600"
          title="Pain score from 0 (no pain) to 10 (worst pain)"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>No pain</span>
          <span>Mild</span>
          <span>Moderate</span>
          <span>Severe</span>
          <span>Worst</span>
        </div>
      </div>

      {/* Complications */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h4 className="font-semibold text-gray-800 mb-3">Complications Present</h4>
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-2">
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasFever}
              onChange={(e) => setHasFever(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm flex items-center gap-1">
              <Thermometer className="w-4 h-4" /> Fever
            </span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer bg-red-100 border-red-300 border">
            <input
              type="checkbox"
              checked={hasACS}
              onChange={(e) => setHasACS(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm font-medium">⚠️ Acute Chest Syndrome</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer bg-red-100 border-red-300 border">
            <input
              type="checkbox"
              checked={hasStroke}
              onChange={(e) => setHasStroke(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm font-medium">🚨 Stroke/TIA</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasPriapism}
              onChange={(e) => setHasPriapism(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">Priapism</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasSplenic}
              onChange={(e) => setHasSplenic(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">Splenic Sequestration</span>
          </label>
          <label className="flex items-center gap-2 p-2 hover:bg-red-50 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={hasAplastic}
              onChange={(e) => setHasAplastic(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">Aplastic Crisis</span>
          </label>
        </div>
      </div>

      {/* Current Treatment */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3">Current Treatment</h4>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onHydroxyurea}
              onChange={(e) => setOnHydroxyurea(e.target.checked)}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm">Currently on Hydroxyurea</span>
            {onHydroxyurea && (
              <input
                type="text"
                value={currentHUDose}
                onChange={(e) => setCurrentHUDose(e.target.value)}
                className="ml-2 px-2 py-1 border border-gray-300 rounded text-sm w-24 text-gray-900"
                placeholder="mg/day"
              />
            )}
          </label>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transfusion History</label>
            <select
              value={transfusionHistory}
              onChange={(e) => setTransfusionHistory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
              title="Select transfusion history"
            >
              <option value="none">No regular transfusions</option>
              <option value="occasional">Occasional transfusions</option>
              <option value="chronic">Chronic transfusion program</option>
              <option value="exchange">On exchange transfusion program</option>
            </select>
          </div>
        </div>
      </div>

      {/* Wound Healing Assessment */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Scissors className="w-4 h-4" />
          Wound Healing Assessment
        </h4>
        <label className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={woundAssessment.hasWound}
            onChange={(e) => setWoundAssessment({ ...woundAssessment, hasWound: e.target.checked })}
            className="w-4 h-4 text-red-600 rounded"
          />
          <span className="text-sm font-medium">Patient has wound/ulcer</span>
        </label>
        {woundAssessment.hasWound && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Wound Type</label>
              <select
                value={woundAssessment.woundType}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, woundType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                title="Wound type"
              >
                <option value="leg_ulcer">Leg Ulcer (SCD-related)</option>
                <option value="surgical_wound">Surgical Wound</option>
                <option value="pressure_sore">Pressure Sore</option>
                <option value="traumatic">Traumatic Wound</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <select
                value={woundAssessment.woundLocation}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, woundLocation: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                title="Wound location"
              >
                <option value="medial_malleolus">Medial Malleolus</option>
                <option value="lateral_malleolus">Lateral Malleolus</option>
                <option value="anterior_shin">Anterior Shin</option>
                <option value="dorsum_foot">Dorsum of Foot</option>
                <option value="other_lower_limb">Other Lower Limb</option>
                <option value="upper_limb">Upper Limb</option>
                <option value="trunk">Trunk</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration (weeks)</label>
              <input
                type="number"
                value={woundAssessment.woundDuration}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, woundDuration: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                placeholder="e.g., 8"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Size (cm², approx)</label>
              <input
                type="number"
                value={woundAssessment.woundSize}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, woundSize: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                placeholder="e.g., 12"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Serum Albumin (g/dL)</label>
              <input
                type="number"
                step="0.1"
                value={woundAssessment.albuminLevel}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, albuminLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                placeholder="e.g., 3.2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nutrition Status</label>
              <select
                value={woundAssessment.nutritionStatus}
                onChange={(e) => setWoundAssessment({ ...woundAssessment, nutritionStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                title="Nutrition status"
              >
                <option value="adequate">Adequate</option>
                <option value="at_risk">At Risk of Malnutrition</option>
                <option value="malnourished">Malnourished</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={calculate}
        disabled={!weight || !age}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
      >
        <Calculator className="w-5 h-5" />
        Generate Crisis Management Plan
      </button>

      {/* Results */}
      {result && (
        <div className="mt-8 space-y-4">
          <div className="border-t-2 border-gray-200 pt-6">
            {/* Severity */}
            <div className={`rounded-lg p-6 mb-4 text-center ${
              result.severity === 'Critical' ? 'bg-red-100' :
              result.severity === 'Severe' ? 'bg-orange-100' :
              result.severity === 'Moderate' ? 'bg-yellow-100' : 'bg-green-100'
            }`}>
              <p className={`text-4xl font-bold mb-2 ${
                result.severity === 'Critical' ? 'text-red-600' :
                result.severity === 'Severe' ? 'text-orange-600' :
                result.severity === 'Moderate' ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {result.severity} Crisis
              </p>
              <p className="font-semibold">{result.crisisType}</p>
              {result.severityFactors?.map((factor, i) => (
                <p key={i} className="text-sm text-gray-600">{factor}</p>
              ))}
            </div>

            {/* Emergency - Exchange Transfusion */}
            {result.exchangeTransfusion && (
              <div className="bg-red-100 border-2 border-red-500 p-4 mb-4 rounded-lg">
                <h4 className="font-bold text-red-800 mb-2 text-lg">🚨 EMERGENCY EXCHANGE TRANSFUSION</h4>
                <p className="text-red-700 font-medium">
                  Estimated exchange volume: {result.exchangeVolume?.toLocaleString()} mL (1.5 blood volumes)
                </p>
                <ul className="list-disc ml-6 mt-2 text-sm text-red-700">
                  {result.transfusionGuidelines?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ACS Management */}
            {(result.acsManagement?.length ?? 0) > 0 && (
              <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-purple-800 mb-2">Acute Chest Syndrome Protocol</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-purple-700">
                  {result.acsManagement?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pain Management */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-blue-800 mb-2">Pain Management</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-blue-700">
                {result.painManagement.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Hydration */}
            <div className="bg-cyan-50 border-l-4 border-cyan-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-cyan-800 mb-2 flex items-center gap-2">
                <Droplets className="w-5 h-5" />
                Fluid Management
              </h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-cyan-700">
                {result.hydrationRecommendation?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Infection */}
            {(result.infectionManagement?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-600 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-amber-800 mb-2">Infection Management</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-amber-700">
                  {result.infectionManagement?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Transfusion */}
            {!result.exchangeTransfusion && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-lg">
                <h4 className="font-bold text-red-800 mb-2">Transfusion Guidelines</h4>
                <ul className="list-disc ml-6 space-y-1 text-sm text-red-700">
                  {result.transfusionGuidelines?.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Hydroxyurea */}
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-indigo-800 mb-2">Hydroxyurea (Disease-Modifying Therapy)</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-indigo-700">
                {result.hydroxyureaDosing?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Monitoring */}
            <div className="bg-gray-50 border-l-4 border-gray-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Monitoring Parameters
              </h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-gray-700">
                {result.monitoring.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Discharge Criteria */}
            <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-4 rounded-r-lg">
              <h4 className="font-bold text-green-800 mb-2">Discharge Criteria</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-green-700">
                {result.dischargeCriteria?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Long-term */}
            <div className="bg-pink-50 border-l-4 border-pink-600 p-4 rounded-r-lg">
              <h4 className="font-bold text-pink-800 mb-2">Long-Term Recommendations</h4>
              <ul className="list-disc ml-6 space-y-1 text-sm text-pink-700">
                {result.longTermRecommendations?.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Wound Healing */}
            {(result.woundHealingRecommendations?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-700 p-4 mt-4 rounded-r-lg">
                <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                  <Scissors className="w-5 h-5" />
                  Wound Healing Protocol (SCD-Specific)
                </h4>
                <div className="space-y-1 text-sm text-amber-800">
                  {result.woundHealingRecommendations?.map((item, index) => {
                    if (item === '') return <div key={index} className="h-2" />;
                    if (item.startsWith('--')) return <p key={index} className="font-bold mt-2">{item.replace(/--/g, '').trim()}</p>;
                    if (item === 'SICKLE CELL WOUND HEALING PROTOCOL') return <p key={index} className="font-bold text-lg">{item}</p>;
                    return <p key={index} className="ml-4">• {item}</p>;
                  })}
                </div>
              </div>
            )}

            {/* PDF Export Button */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => generatePDF(result)}
                className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg transition-colors"
              >
                <FileText className="w-5 h-5" />
                Download PDF Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
