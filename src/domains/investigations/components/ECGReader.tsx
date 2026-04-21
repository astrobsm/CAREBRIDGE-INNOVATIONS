/**
 * ECG Reader & Cardiologist Interpretation Module
 * AstroHEALTH Innovations in Healthcare
 *
 * Accepts upload of 12-lead or rhythm-strip ECG images.
 * Provides a structured cardiologist-style interpretation template
 * with surgical fitness / pre-operative risk assessment.
 *
 * Clinical logic follows ACC/AHA Perioperative Cardiovascular Evaluation
 * guidelines (2014, updated 2024) and NICE CG3 / ESC 2022 guidelines.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Upload,
  X,
  Printer,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Heart,
  Zap,
  Clock,
  FileText,
  RefreshCw,
  Info,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { Patient } from '../../../types';

interface ECGReaderProps {
  patient?: Patient | null;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface ECGFindings {
  // Rate & Rhythm
  ventricular_rate: string;
  atrial_rate: string;
  rhythm: string;
  regularity: string;

  // Axis
  p_axis: string;
  qrs_axis: string;
  t_axis: string;

  // Intervals (ms)
  pr_interval: string;
  qrs_duration: string;
  qt_interval: string;
  qtc: string;

  // P-Wave
  p_wave: string;

  // QRS Complex
  q_waves: string;
  r_progression: string;
  voltage: string;

  // ST-T Changes
  st_segment: string;
  t_waves: string;

  // Bundle Branch / Pre-Excitation
  conduction: string;

  // Specific Findings
  ischaemia: string;
  hypertrophy: string;
  arrhythmia_details: string;
  other_findings: string;
}

interface SurgicalFitnessAssessment {
  rcri_score: string;
  mets: string;
  cardiac_risk_category: 'low' | 'intermediate' | 'high' | '';
  fitness_verdict: 'clear' | 'conditional' | 'defer' | '';
  verdict_rationale: string;
  recommendations: string[];
  further_investigations: string[];
  anaesthesia_considerations: string;
}

const defaultFindings: ECGFindings = {
  ventricular_rate: '',
  atrial_rate: '',
  rhythm: '',
  regularity: '',
  p_axis: '',
  qrs_axis: '',
  t_axis: '',
  pr_interval: '',
  qrs_duration: '',
  qt_interval: '',
  qtc: '',
  p_wave: '',
  q_waves: '',
  r_progression: '',
  voltage: '',
  st_segment: '',
  t_waves: '',
  conduction: '',
  ischaemia: '',
  hypertrophy: '',
  arrhythmia_details: '',
  other_findings: '',
};

const defaultFitness: SurgicalFitnessAssessment = {
  rcri_score: '',
  mets: '',
  cardiac_risk_category: '',
  fitness_verdict: '',
  verdict_rationale: '',
  recommendations: [],
  further_investigations: [],
  anaesthesia_considerations: '',
};

const rhythmOptions = [
  'Normal Sinus Rhythm',
  'Sinus Tachycardia',
  'Sinus Bradycardia',
  'Sinus Arrhythmia',
  'Atrial Fibrillation',
  'Atrial Flutter',
  'Supraventricular Tachycardia (SVT)',
  'Atrial Tachycardia',
  'Junctional Rhythm',
  'Ventricular Tachycardia',
  'Accelerated Idioventricular Rhythm',
  '1st Degree AV Block',
  '2nd Degree AV Block (Mobitz I – Wenckebach)',
  '2nd Degree AV Block (Mobitz II)',
  '3rd Degree (Complete) Heart Block',
  'Right Bundle Branch Block (RBBB)',
  'Left Bundle Branch Block (LBBB)',
  'Left Anterior Fascicular Block (LAFB)',
  'Left Posterior Fascicular Block (LPFB)',
  'WPW Pattern / Pre-excitation',
  'Paced Rhythm',
  'Ectopic Atrial Rhythm',
  'Ventricular Fibrillation',
  'Asystole',
];

const stOptions = [
  'No ST changes',
  'ST elevation — inferior leads (II, III, aVF)',
  'ST elevation — anterior leads (V1–V4)',
  'ST elevation — lateral leads (I, aVL, V5–V6)',
  'ST elevation — diffuse (pericarditis pattern)',
  'ST depression — anterior',
  'ST depression — inferior',
  'ST depression — diffuse (subendocardial ischaemia)',
  'J-point elevation (normal variant / early repolarisation)',
  'ST flattening',
  'Saddle-shaped ST elevation',
];

export default function ECGReader({ patient }: ECGReaderProps) {
  const [ecgImage, setEcgImage] = useState<string | null>(null);
  const [findings, setFindings] = useState<ECGFindings>(defaultFindings);
  const [fitness, setFitness] = useState<SurgicalFitnessAssessment>(defaultFitness);
  const [impression, setImpression] = useState('');
  const [clinicalContext, setClinicalContext] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['rate-rhythm', 'st-changes']);
  const [showGuide, setShowGuide] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reportDate = format(new Date(), 'PPP p');

  const toggleSection = (id: string) =>
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, etc.)');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setEcgImage(ev.target?.result as string);
      setReportGenerated(false);
      toast.success('ECG image loaded. Complete the interpretation fields below.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please drop an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setEcgImage(ev.target?.result as string);
      setReportGenerated(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const updateFinding = (key: keyof ECGFindings, value: string) =>
    setFindings(prev => ({ ...prev, [key]: value }));

  const updateFitness = (key: keyof SurgicalFitnessAssessment, value: string | string[]) =>
    setFitness(prev => ({ ...prev, [key]: value }));

  const autoDeriveFitness = () => {
    // Simple rule-based derivation from findings
    let verdict: SurgicalFitnessAssessment['fitness_verdict'] = 'clear';
    let category: SurgicalFitnessAssessment['cardiac_risk_category'] = 'low';
    const recs: string[] = [];
    const fi: string[] = [];

    const f = findings;

    // High-risk patterns → Defer
    const highRiskPatterns = [
      f.rhythm.includes('Ventricular Tachycardia'),
      f.rhythm.includes('Ventricular Fibrillation'),
      f.rhythm.includes('Complete Heart Block'),
      f.rhythm.includes('LBBB') && f.ischaemia.toLowerCase().includes('acute'),
      f.st_segment.includes('elevation') && !f.st_segment.includes('J-point') && !f.st_segment.includes('pericarditis'),
      f.ischaemia.toLowerCase().includes('acute') || f.ischaemia.toLowerCase().includes('stemi'),
    ];

    // Intermediate-risk patterns → Conditional
    const intermediatePatterns = [
      f.rhythm.includes('Atrial Fibrillation'),
      f.rhythm.includes('Atrial Flutter'),
      f.rhythm.includes('2nd Degree'),
      f.rhythm.includes('LBBB'),
      f.rhythm.includes('RBBB'),
      f.st_segment.includes('depression'),
      f.t_waves.toLowerCase().includes('inversion'),
      f.q_waves.toLowerCase().includes('significant') || f.q_waves.toLowerCase().includes('pathological'),
      f.hypertrophy.toLowerCase().includes('lv') || f.hypertrophy.toLowerCase().includes('left ventricular'),
    ];

    if (highRiskPatterns.some(Boolean)) {
      verdict = 'defer';
      category = 'high';
      recs.push('Urgent cardiology review required before any elective surgery.');
      recs.push('Stabilise cardiac condition prior to surgical intervention.');
      fi.push('Urgent echocardiogram (2D Echo)');
      fi.push('Cardiology consult / same-day review');
      fi.push('Troponin I/T (serial — 0h, 3h, 6h)');
      fi.push('Electrolyte panel (K+, Mg2+, Ca2+)');
    } else if (intermediatePatterns.some(Boolean)) {
      verdict = 'conditional';
      category = 'intermediate';
      recs.push('Cardiology review recommended before intermediate or major surgery.');
      recs.push('Optimise rate control if atrial fibrillation is identified.');
      recs.push('Consider pharmacological stress test or functional assessment if METs < 4.');
      recs.push('Inform anaesthetist of ECG findings at pre-assessment.');
      fi.push('Echocardiogram (2D Echo) — within 4 weeks');
      fi.push('Electrolytes, FBC, renal function');
      fi.push('Holter monitor if paroxysmal arrhythmia suspected');
    } else if (
      f.rhythm.includes('Sinus Bradycardia') ||
      f.rhythm.includes('1st Degree AV Block')
    ) {
      verdict = 'conditional';
      category = 'low';
      recs.push('Inform anaesthetist of sinus bradycardia / 1st degree block.');
      recs.push('Usually acceptable for elective surgery — anaesthetic team to make final determination.');
    } else if (findings.rhythm && !highRiskPatterns.some(Boolean) && !intermediatePatterns.some(Boolean)) {
      verdict = 'clear';
      category = 'low';
      recs.push('ECG within normal limits for surgical purposes.');
      recs.push('Standard peri-operative monitoring as per anaesthesia assessment.');
    }

    setFitness(prev => ({
      ...prev,
      cardiac_risk_category: category,
      fitness_verdict: verdict,
      verdict_rationale: verdict === 'clear'
        ? 'ECG findings are within acceptable limits for the proposed surgical procedure. No acute cardiac contraindication identified.'
        : verdict === 'conditional'
        ? 'ECG findings warrant further evaluation or specialist review prior to surgical clearance.'
        : 'Significant ECG abnormality identified. Surgery should be deferred pending urgent cardiology assessment and stabilisation.',
      recommendations: recs,
      further_investigations: fi,
      anaesthesia_considerations: verdict === 'defer'
        ? 'NOT cleared for anaesthesia until cardiological review and stabilisation.'
        : verdict === 'conditional'
        ? 'Pre-operative cardiology review recommended. Anaesthetist to be informed of all findings. Consider enhanced monitoring (5-lead ECG, arterial line) intra-operatively for high-risk cases.'
        : 'Standard pre-operative assessment. Routine intra-operative ECG monitoring sufficient for low-risk cases.',
    }));

    toast.success('Surgical fitness assessment derived from findings.');
  };

  const verdictConfig = {
    clear: {
      label: 'CLEARED FOR SURGERY',
      bg: 'bg-green-50 border-green-400',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-800',
      icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
    },
    conditional: {
      label: 'CONDITIONAL — FURTHER REVIEW REQUIRED',
      bg: 'bg-amber-50 border-amber-400',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-800',
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    },
    defer: {
      label: 'DEFER SURGERY — URGENT CARDIOLOGY REVIEW',
      bg: 'bg-red-50 border-red-500',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-900',
      icon: <AlertCircle className="w-6 h-6 text-red-600" />,
    },
  };

  const Field = ({
    label,
    fieldKey,
    type = 'text',
    options,
    placeholder = '',
  }: {
    label: string;
    fieldKey: keyof ECGFindings;
    type?: 'text' | 'select' | 'textarea';
    options?: string[];
    placeholder?: string;
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {type === 'select' && options ? (
        <select
          value={findings[fieldKey]}
          onChange={e => updateFinding(fieldKey, e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          title={label}
        >
          <option value="">— select —</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          value={findings[fieldKey]}
          onChange={e => updateFinding(fieldKey, e.target.value)}
          rows={2}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
        />
      ) : (
        <input
          type="text"
          value={findings[fieldKey]}
          onChange={e => updateFinding(fieldKey, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      )}
    </div>
  );

  const SectionHeader = ({ id, title, icon }: { id: string; title: string; icon: React.ReactNode }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left"
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-semibold text-gray-900">{title}</span>
      </div>
      {expandedSections.includes(id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl p-4 flex items-center gap-4">
        <Activity className="w-8 h-8 flex-shrink-0" />
        <div>
          <h2 className="font-bold text-lg">ECG Interpretation Module</h2>
          <p className="text-rose-100 text-sm">
            Cardiologist-level analysis with pre-operative surgical fitness assessment
          </p>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="ml-auto p-2 bg-white/20 rounded-lg hover:bg-white/30 flex-shrink-0"
          title="Show interpretation guide"
        >
          <Info size={18} />
        </button>
      </div>

      {/* Quick Guide */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <h4 className="font-bold mb-2">Systematic ECG Interpretation (AHA Approach)</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li><strong>Rate</strong> — Count R-R intervals: 300÷large squares (or 1500÷small squares)</li>
                <li><strong>Rhythm</strong> — Regular/irregular? P before every QRS?</li>
                <li><strong>Axis</strong> — Lead I + aVF: both positive = normal axis (0° to +90°)</li>
                <li><strong>P-Wave</strong> — Width &lt;120ms, height &lt;2.5mm, biphasic in V1 = abnormal</li>
                <li><strong>PR Interval</strong> — Normal 120–200ms; prolonged = 1st degree block</li>
                <li><strong>QRS Duration</strong> — Normal &lt;120ms; &gt;120ms = bundle branch block or aberrancy</li>
                <li><strong>QT/QTc</strong> — QTc &gt;450ms (M) / &gt;470ms (F) = prolonged; risk of Torsades</li>
                <li><strong>ST Segment</strong> — &gt;1mm elevation or depression in ≥2 contiguous leads = significant</li>
                <li><strong>T-Waves</strong> — Should be upright in I, II, V3–V6; inverted T = ischaemia/PE/strain</li>
                <li><strong>Q-Waves</strong> — &gt;25% of R, &gt;40ms width = pathological (old MI)</li>
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ECG Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={`border-2 border-dashed rounded-xl transition-colors ${
          ecgImage ? 'border-gray-200' : 'border-rose-300 hover:border-rose-400'
        }`}
      >
        {ecgImage ? (
          <div className="relative">
            <img
              src={ecgImage}
              alt="ECG"
              className="w-full rounded-xl object-contain max-h-72 bg-black"
            />
            <button
              onClick={() => { setEcgImage(null); setReportGenerated(false); }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
              title="Remove image"
            >
              <X size={14} />
            </button>
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
              ECG Image Loaded
            </div>
          </div>
        ) : (
          <div
            className="p-10 text-center cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <Activity className="w-12 h-12 mx-auto text-rose-300 mb-3" />
            <p className="text-gray-600 font-medium">Upload ECG Image</p>
            <p className="text-sm text-gray-400 mt-1">
              Drag & drop or click to select — JPG, PNG, HEIC accepted
            </p>
            <p className="text-xs text-gray-400 mt-1">
              12-lead ECG printout, rhythm strip, or photograph
            </p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Clinical Context */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Clinical Context / Indication
        </label>
        <textarea
          value={clinicalContext}
          onChange={e => setClinicalContext(e.target.value)}
          rows={2}
          placeholder="e.g. Pre-operative assessment for elective laparotomy. Patient is a 58-year-old hypertensive with DM2..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>

      {/* ── Rate & Rhythm ─────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader id="rate-rhythm" title="Rate, Rhythm & Regularity" icon={<Heart size={18} className="text-rose-500" />} />
        {expandedSections.includes('rate-rhythm') && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Ventricular Rate (bpm)" fieldKey="ventricular_rate" placeholder="e.g. 72" />
            <Field label="Atrial Rate (bpm)" fieldKey="atrial_rate" placeholder="e.g. 72 (if different)" />
            <Field label="Rhythm" fieldKey="rhythm" type="select" options={rhythmOptions} />
            <Field label="Regularity" fieldKey="regularity" type="select" options={['Regular', 'Regularly irregular', 'Irregularly irregular', 'Irregular']} />
          </div>
        )}
      </div>

      {/* ── Axis ──────────────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader id="axis" title="Cardiac Axis" icon={<Zap size={18} className="text-yellow-500" />} />
        {expandedSections.includes('axis') && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="P-Wave Axis" fieldKey="p_axis" type="select" options={['Normal', 'Left axis deviation', 'Right axis deviation', 'Indeterminate']} />
            <Field label="QRS Axis" fieldKey="qrs_axis" type="select" options={['Normal (0° to +90°)', 'Left axis deviation (<0°)', 'Right axis deviation (>+90°)', 'Extreme axis deviation']} />
            <Field label="T-Wave Axis" fieldKey="t_axis" placeholder="e.g. Normal / concordant" />
          </div>
        )}
      </div>

      {/* ── Intervals ─────────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader id="intervals" title="Intervals & Durations" icon={<Clock size={18} className="text-blue-500" />} />
        {expandedSections.includes('intervals') && (
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="PR Interval (ms)" fieldKey="pr_interval" placeholder="120–200" />
            <Field label="QRS Duration (ms)" fieldKey="qrs_duration" placeholder="<120" />
            <Field label="QT Interval (ms)" fieldKey="qt_interval" placeholder="" />
            <Field label="QTc (Bazett) (ms)" fieldKey="qtc" placeholder="<450M / <470F" />
          </div>
        )}
      </div>

      {/* ── Waveform morphology ────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader id="morphology" title="Waveform Morphology" icon={<Activity size={18} className="text-purple-500" />} />
        {expandedSections.includes('morphology') && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="P-Waves" fieldKey="p_wave" type="select" options={['Normal', 'Absent', 'Biphasic in V1 (P mitrale)', 'Peaked/tall (P pulmonale)', 'Notched', 'Retrograde P waves', 'Sawtooth pattern (flutter)']} />
            <Field label="Q Waves" fieldKey="q_waves" type="select" options={['None', 'Small septal q waves (normal)', 'Pathological Q waves — inferior (II, III, aVF)', 'Pathological Q waves — anterior (V1–V4)', 'Pathological Q waves — lateral (I, aVL, V5–V6)', 'Diffuse Q waves']} />
            <Field label="R-Wave Progression" fieldKey="r_progression" type="select" options={['Normal', 'Poor R-wave progression', 'Reversed R-wave progression', 'Dominant R in V1 (RBBB / RVH / posterior MI / WPW)']} />
            <Field label="Voltage" fieldKey="voltage" type="select" options={['Normal voltage', 'Low voltage (all leads)', 'High voltage / LVH criteria met', 'High voltage / RVH criteria met', 'Low voltage limb leads (? effusion, COPD)']} />
          </div>
        )}
      </div>

      {/* ── ST-T Changes ──────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader id="st-changes" title="ST-T Changes & Ischaemia" icon={<AlertTriangle size={18} className="text-orange-500" />} />
        {expandedSections.includes('st-changes') && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="ST Segment" fieldKey="st_segment" type="select" options={stOptions} />
            <Field label="T-Wave Changes" fieldKey="t_waves" type="select" options={['Normal', 'Flattened T waves', 'T-wave inversion — anterior', 'T-wave inversion — inferior', 'T-wave inversion — lateral', 'T-wave inversion — diffuse', 'Hyperacute T waves', 'Biphasic T waves (Wellens pattern)']} />
            <Field label="Ischaemia Assessment" fieldKey="ischaemia" type="select" options={['No evidence of ischaemia', 'Possible old ischaemia (Q waves only)', 'Subendocardial ischaemia (ST depression)', 'Acute STEMI pattern', 'NSTEMI / unstable angina pattern', 'Posterior MI pattern', 'Right ventricular MI pattern', 'Wellens syndrome (critical LAD stenosis)']} />
            <Field label="Conduction Abnormalities" fieldKey="conduction" type="select" options={['None', 'RBBB (complete)', 'LBBB (complete)', 'LBBB (incomplete)', 'RBBB (incomplete)', 'Left anterior fascicular block', 'Left posterior fascicular block', 'Bifascicular block', 'Trifascicular block', 'WPW — type A (delta wave, short PR)', 'WPW — type B']} />
            <Field label="Hypertrophy Pattern" fieldKey="hypertrophy" type="select" options={['None', 'Left ventricular hypertrophy (LVH)', 'Right ventricular hypertrophy (RVH)', 'Biatrial enlargement', 'Left atrial enlargement', 'Right atrial enlargement']} />
            <Field label="Arrhythmia Details" fieldKey="arrhythmia_details" type="textarea" placeholder="Describe if applicable..." />
            <div className="sm:col-span-2">
              <Field label="Other / Additional Findings" fieldKey="other_findings" type="textarea" placeholder="Pacemaker spikes, dextrocardia, artefact, lead placement error, etc." />
            </div>
          </div>
        )}
      </div>

      {/* ── Impression ────────────────────────────────────────────────── */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cardiologist Impression
        </label>
        <textarea
          value={impression}
          onChange={e => setImpression(e.target.value)}
          rows={3}
          placeholder="Overall ECG impression — describe primary findings, their clinical significance, and comparison to previous if available..."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
      </div>

      {/* ── Surgical Fitness ──────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <SectionHeader id="fitness" title="Pre-Operative Cardiac Risk & Surgical Fitness" icon={<CheckCircle2 size={18} className="text-green-600" />} />
        {expandedSections.includes('fitness') && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  RCRI Score (0–6)
                </label>
                <select
                  value={fitness.rcri_score}
                  onChange={e => updateFitness('rcri_score', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  title="RCRI Score"
                >
                  <option value="">— select —</option>
                  <option value="0 (risk <1%)">0 (risk &lt;1% — very low)</option>
                  <option value="1 (risk ~1%)">1 (risk ~1% — low)</option>
                  <option value="2 (risk ~2.4%)">2 (risk ~2.4% — intermediate)</option>
                  <option value="3+ (risk >5%)">3+ (risk &gt;5% — high)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Revised Cardiac Risk Index (Lee Criteria)
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Functional Capacity (METs)
                </label>
                <select
                  value={fitness.mets}
                  onChange={e => updateFitness('mets', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  title="Functional Capacity"
                >
                  <option value="">— select —</option>
                  <option value="≥10 METs (excellent — climbing stairs rapidly, sports)">≥10 METs — excellent</option>
                  <option value="7–9 METs (good — running short distances, cycling)">7–9 METs — good</option>
                  <option value="4–6 METs (moderate — climbing 1 flight, walking briskly)">4–6 METs — moderate</option>
                  <option value="1–3 METs (poor — light housework, slow walking on flat)">1–3 METs — poor</option>
                  <option value="Unknown / unable to assess">Unknown / unable to assess</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cardiac Risk Category
                </label>
                <select
                  value={fitness.cardiac_risk_category}
                  onChange={e => updateFitness('cardiac_risk_category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  title="Cardiac Risk Category"
                >
                  <option value="">— select —</option>
                  <option value="low">Low (&lt;1% MACE)</option>
                  <option value="intermediate">Intermediate (1–5% MACE)</option>
                  <option value="high">High (&gt;5% MACE)</option>
                </select>
              </div>
            </div>

            <button
              onClick={autoDeriveFitness}
              disabled={!findings.rhythm}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Auto-Derive Fitness Assessment from Findings
            </button>

            {/* Fitness Verdict */}
            {fitness.fitness_verdict && (
              <div className={`border-2 rounded-xl p-4 ${verdictConfig[fitness.fitness_verdict].bg}`}>
                <div className="flex items-center gap-3 mb-2">
                  {verdictConfig[fitness.fitness_verdict].icon}
                  <span className={`font-bold text-lg ${verdictConfig[fitness.fitness_verdict].text}`}>
                    {verdictConfig[fitness.fitness_verdict].label}
                  </span>
                </div>
                <p className={`text-sm ${verdictConfig[fitness.fitness_verdict].text}`}>
                  {fitness.verdict_rationale}
                </p>
              </div>
            )}

            {/* Verdict can also be set manually */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Override Surgical Fitness Verdict
              </label>
              <select
                value={fitness.fitness_verdict}
                onChange={e => updateFitness('fitness_verdict', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                title="Surgical Fitness Verdict"
              >
                <option value="">— select —</option>
                <option value="clear">Cleared for Surgery</option>
                <option value="conditional">Conditional — Further Review Required</option>
                <option value="defer">Defer Surgery — Urgent Cardiology Review</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rationale</label>
              <textarea
                value={fitness.verdict_rationale}
                onChange={e => updateFitness('verdict_rationale', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Clinical rationale for fitness decision..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Cardiologist Recommendations
              </label>
              <textarea
                value={fitness.recommendations.join('\n')}
                onChange={e => updateFitness('recommendations', e.target.value.split('\n').filter(Boolean))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="One recommendation per line..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Further Investigations Required
              </label>
              <textarea
                value={fitness.further_investigations.join('\n')}
                onChange={e => updateFitness('further_investigations', e.target.value.split('\n').filter(Boolean))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="One investigation per line..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Anaesthesia Considerations
              </label>
              <textarea
                value={fitness.anaesthesia_considerations}
                onChange={e => updateFitness('anaesthesia_considerations', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                placeholder="Notes for the anaesthetic team..."
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Generate Report Button ────────────────────────────────────── */}
      <button
        onClick={() => {
          if (!findings.rhythm) {
            toast.error('Please complete at least the rhythm field before generating a report.');
            return;
          }
          setReportGenerated(true);
          toast.success('ECG report generated. Use Print to save as PDF.');
        }}
        className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        <FileText size={18} />
        Generate Formal ECG Report
      </button>

      {/* ── Printable Report ──────────────────────────────────────────── */}
      <AnimatePresence>
        {reportGenerated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            id="ecg-report-print"
            className="border-2 border-gray-300 rounded-xl overflow-hidden"
          >
            {/* Report Header */}
            <div className="bg-gray-900 text-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Activity size={20} />
                    Electrocardiogram Interpretation Report
                  </h3>
                  <p className="text-gray-300 text-sm">AstroHEALTH Cardiology Service</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30"
                >
                  <Printer size={16} />
                  Print Report
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 bg-white">
              {/* Patient & Date */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200 text-sm">
                <div>
                  <span className="text-gray-500">Patient:</span>{' '}
                  <strong>{patient ? `${patient.firstName} ${patient.lastName}` : 'Not specified'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Date / Time:</span> <strong>{reportDate}</strong>
                </div>
                {clinicalContext && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Indication:</span> {clinicalContext}
                  </div>
                )}
              </div>

              {/* Findings Summary */}
              <div>
                <h4 className="font-bold text-gray-900 mb-2">ECG FINDINGS</h4>
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {[
                      ['Rate', findings.ventricular_rate ? `Ventricular: ${findings.ventricular_rate} bpm` : '—'],
                      ['Rhythm', findings.rhythm || '—'],
                      ['Regularity', findings.regularity || '—'],
                      ['Axis', [findings.qrs_axis].filter(Boolean).join(' | ') || '—'],
                      ['PR Interval', findings.pr_interval ? `${findings.pr_interval} ms` : '—'],
                      ['QRS Duration', findings.qrs_duration ? `${findings.qrs_duration} ms` : '—'],
                      ['QTc', findings.qtc ? `${findings.qtc} ms` : '—'],
                      ['ST Segment', findings.st_segment || '—'],
                      ['T-Waves', findings.t_waves || '—'],
                      ['Q-Waves', findings.q_waves || '—'],
                      ['Conduction', findings.conduction || '—'],
                      ['Hypertrophy', findings.hypertrophy || '—'],
                      ['Ischaemia', findings.ischaemia || '—'],
                      ['Other', findings.other_findings || '—'],
                    ].map(([label, value]) => (
                      <tr key={label} className="border-b border-gray-100">
                        <td className="py-1.5 pr-4 text-gray-500 font-medium w-36">{label}</td>
                        <td className="py-1.5 text-gray-900">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Impression */}
              {impression && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-bold text-gray-900 mb-2">IMPRESSION</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{impression}</p>
                </div>
              )}

              {/* Surgical Fitness */}
              {fitness.fitness_verdict && (
                <div className={`border-2 rounded-xl p-4 ${verdictConfig[fitness.fitness_verdict].bg}`}>
                  <h4 className="font-bold text-gray-900 mb-2">SURGICAL FITNESS ASSESSMENT</h4>
                  <div className={`flex items-center gap-2 font-bold text-base mb-2 ${verdictConfig[fitness.fitness_verdict].text}`}>
                    {verdictConfig[fitness.fitness_verdict].icon}
                    {verdictConfig[fitness.fitness_verdict].label}
                  </div>
                  <p className="text-sm text-gray-700 mb-3">{fitness.verdict_rationale}</p>
                  {fitness.recommendations.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Recommendations:</p>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                        {fitness.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {fitness.further_investigations.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Further Investigations:</p>
                      <ul className="list-disc list-inside text-xs text-gray-600 space-y-0.5">
                        {fitness.further_investigations.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                  {fitness.anaesthesia_considerations && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-1">Anaesthesia Note:</p>
                      <p className="text-xs text-gray-600">{fitness.anaesthesia_considerations}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Signature */}
              <div className="pt-4 border-t border-gray-200 flex justify-between items-end text-sm">
                <div>
                  <div className="border-b border-gray-900 w-48 mb-1" />
                  <p className="text-gray-500 text-xs">Cardiologist / Reporting Clinician Signature</p>
                </div>
                <p className="text-gray-400 text-xs">
                  Generated: {reportDate}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #ecg-report-print, #ecg-report-print * { visibility: visible !important; }
          #ecg-report-print { position: absolute; left: 0; top: 0; width: 100%; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
