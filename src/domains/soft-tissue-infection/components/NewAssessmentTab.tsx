/**
 * New STI Assessment Form Tab
 * Allows clinicians to create a new soft tissue infection assessment
 * with classification, severity, red flags, comorbidities, and auto-generate treatment plan
 */

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import {
  Search, AlertTriangle, CheckCircle2, Save, Zap, User
} from 'lucide-react';
import { db } from '../../../database/db';
import { useAuth } from '../../../contexts/AuthContext';
import {
  STI_CLASSIFICATIONS_DETAIL,
  LOCATION_CONSIDERATIONS,
  TREATMENT_PROTOCOLS,
} from '../data/stiProtocolData';
import type { STIAssessment } from '../../../types';

const RED_FLAG_LABELS: { key: keyof STIAssessment['redFlags']; label: string }[] = [
  { key: 'painOutOfProportion', label: 'Pain out of proportion' },
  { key: 'crepitus', label: 'Crepitus' },
  { key: 'skinNecrosis', label: 'Skin necrosis' },
  { key: 'hemorrhagicBullae', label: 'Hemorrhagic bullae' },
  { key: 'dishwaterDrainage', label: 'Dishwater drainage' },
  { key: 'rapidProgression', label: 'Rapid progression' },
  { key: 'systemicToxicity', label: 'Systemic toxicity' },
  { key: 'failureToRespond', label: 'Failure to respond to IV antibiotics' },
];

const COMORBIDITY_LABELS: { key: keyof STIAssessment['comorbidities']; label: string }[] = [
  { key: 'diabetesMellitus', label: 'Diabetes Mellitus' },
  { key: 'renalImpairment', label: 'Renal Impairment' },
  { key: 'hepaticImpairment', label: 'Jaundice / Hepatic' },
  { key: 'immunosuppressed', label: 'Immunosuppressed' },
  { key: 'peripheralVascular', label: 'Peripheral Vascular Disease' },
  { key: 'obesity', label: 'Obesity' },
  { key: 'alcoholism', label: 'Alcoholism' },
  { key: 'hivPositive', label: 'HIV Positive' },
];

const emptyRedFlags = (): STIAssessment['redFlags'] => ({
  painOutOfProportion: false,
  crepitus: false,
  skinNecrosis: false,
  hemorrhagicBullae: false,
  dishwaterDrainage: false,
  rapidProgression: false,
  systemicToxicity: false,
  failureToRespond: false,
});

const emptyComorbidities = (): STIAssessment['comorbidities'] => ({
  diabetesMellitus: false,
  renalImpairment: false,
  hepaticImpairment: false,
  immunosuppressed: false,
  peripheralVascular: false,
  obesity: false,
  alcoholism: false,
  hivPositive: false,
});

export default function NewAssessmentTab() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [classification, setClassification] = useState('');
  const [location, setLocation] = useState('');
  const [onsetDate, setOnsetDate] = useState('');
  const [durationHours, setDurationHours] = useState('');
  const [painScore, setPainScore] = useState('');
  const [redFlags, setRedFlags] = useState<STIAssessment['redFlags']>(emptyRedFlags());
  const [comorbidities, setComorbidities] = useState<STIAssessment['comorbidities']>(emptyComorbidities());
  const [hba1c, setHba1c] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Patient search
  const patients = useLiveQuery(async () => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const all = await db.patients.toArray();
    return all.filter(p =>
      p.firstName?.toLowerCase().includes(q) ||
      p.lastName?.toLowerCase().includes(q) ||
      p.hospitalNumber?.toLowerCase().includes(q)
    ).slice(0, 10);
  }, [searchQuery]);

  const selectedPatient = useLiveQuery(
    () => selectedPatientId ? db.patients.get(selectedPatientId) : undefined,
    [selectedPatientId]
  );

  // Derive classification details
  const selectedClassification = useMemo(
    () => STI_CLASSIFICATIONS_DETAIL.find(c => c.id === classification),
    [classification]
  );

  const severity = selectedClassification?.severity || '';
  const eronClass = selectedClassification?.eronClass || '';

  // Count active red flags
  const activeRedFlags = Object.values(redFlags).filter(Boolean).length;

  // Generate treatment plan based on classification + comorbidities
  const generateTreatmentPlan = () => {
    if (!selectedClassification) return null;

    // Find matching treatment protocol by severity
    let protocol = TREATMENT_PROTOCOLS.find(p => p.severity === selectedClassification.severity);
    // Fallback to most severe if critical
    if (!protocol && selectedClassification.severity === 'critical') {
      protocol = TREATMENT_PROTOCOLS.find(p => p.severity === 'severe');
    }
    if (!protocol) return null;

    const antibiotics = protocol.antibiotics.map(abx => ({
      drug: abx.drug,
      dose: abx.dose,
      route: abx.route,
      frequency: abx.frequency,
      duration: abx.duration,
    }));

    const surgicalPlan = protocol.surgicalInterventions.map(si => `${si.procedure} — ${si.timing}`);
    const supportiveCare = [...protocol.supportiveCare];
    const monitoring = [...protocol.monitoring];
    const escalationCriteria = [...protocol.escalationCriteria];

    // Auto-generate lab orders based on severity
    const labOrders: string[] = [
      'CBC (FBC)', 'BMP (Na, K, Creatinine, Glucose)', 'CRP', 'Blood Lactate',
    ];
    if (selectedClassification.severity === 'severe' || selectedClassification.severity === 'critical') {
      labOrders.push('ABG', 'CK (Creatine Kinase)', 'Blood Culture x2', 'Coagulation (PT, aPTT, INR)', 'D-dimer', 'Blood Group & Crossmatch', 'Wound/Tissue Culture');
    }
    if (comorbidities.diabetesMellitus) {
      labOrders.push('HbA1c', '4-hourly Blood Sugar');
    }
    if (comorbidities.renalImpairment) {
      labOrders.push('Daily U&E', 'Urine Myoglobin');
    }
    if (comorbidities.hivPositive || comorbidities.immunosuppressed) {
      labOrders.push('HIV Screen', 'Hepatitis B & C');
    }

    return { antibiotics, surgicalPlan, supportiveCare, monitoring, labOrders, escalationCriteria };
  };

  const handleSave = async () => {
    if (!selectedPatientId || !selectedPatient || !classification || !selectedClassification) {
      toast.error('Please select a patient and classification');
      return;
    }

    setSaving(true);
    try {
      const treatmentPlan = generateTreatmentPlan();
      const now = new Date();
      const assessment: STIAssessment = {
        id: uuidv4(),
        patientId: selectedPatientId,
        patientName: `${selectedPatient.firstName} ${selectedPatient.lastName}`,
        hospitalId: user?.hospitalId || '',
        classification,
        classificationName: selectedClassification.name,
        severity: selectedClassification.severity,
        eronClass: selectedClassification.eronClass,
        location,
        onsetDate: onsetDate || undefined,
        durationHours: durationHours ? parseInt(durationHours) : undefined,
        painScore: painScore ? parseInt(painScore) : undefined,
        clinicalFeatures: selectedClassification.clinicalFeatures,
        redFlags,
        comorbidities,
        hba1c: hba1c ? parseFloat(hba1c) : undefined,
        generatedTreatmentPlan: treatmentPlan || undefined,
        status: 'active',
        additionalNotes: additionalNotes || undefined,
        assessedBy: user?.id || '',
        assessedByName: user?.name || '',
        createdAt: now,
        updatedAt: now,
      };

      await db.stiAssessments.add(assessment);
      toast.success('Assessment saved & treatment plan generated!');

      // Reset form
      setSelectedPatientId(null);
      setSearchQuery('');
      setClassification('');
      setLocation('');
      setOnsetDate('');
      setDurationHours('');
      setPainScore('');
      setRedFlags(emptyRedFlags());
      setComorbidities(emptyComorbidities());
      setHba1c('');
      setAdditionalNotes('');
    } catch (err) {
      console.error('Failed to save STI assessment:', err);
      toast.error('Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient Selection */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
          <User size={16} /> Select Patient
        </h3>
        {selectedPatient ? (
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
            <div>
              <p className="font-semibold text-blue-900">
                {selectedPatient.firstName} {selectedPatient.lastName}
              </p>
              <p className="text-sm text-blue-700">{selectedPatient.hospitalNumber}</p>
            </div>
            <button onClick={() => { setSelectedPatientId(null); setSearchQuery(''); }}
              className="text-sm text-blue-600 hover:underline">Change</button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name or hospital number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 w-full"
            />
            {patients && patients.length > 0 && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {patients.map(p => (
                  <button key={p.id}
                    onClick={() => { setSelectedPatientId(p.id); setSearchQuery(''); }}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm border-b last:border-b-0">
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    <span className="text-gray-500 ml-2">({p.hospitalNumber})</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Classification & Severity */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-sm text-gray-800 mb-3">Classification & Severity</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classification *</label>
            <select value={classification} onChange={(e) => setClassification(e.target.value)}
              className="input w-full">
              <option value="">Select classification...</option>
              {STI_CLASSIFICATIONS_DETAIL.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Class {c.eronClass})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
            <input type="text" readOnly value={severity ? severity.charAt(0).toUpperCase() + severity.slice(1) : ''}
              className="input w-full bg-gray-50" placeholder="Auto-filled from classification" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select value={location} onChange={(e) => setLocation(e.target.value)} className="input w-full">
              <option value="">Select location...</option>
              {LOCATION_CONSIDERATIONS.map(loc => (
                <option key={loc.location} value={loc.location}>{loc.location}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Onset Date</label>
            <input type="date" value={onsetDate} onChange={(e) => setOnsetDate(e.target.value)}
              className="input w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (hours)</label>
            <input type="number" value={durationHours} onChange={(e) => setDurationHours(e.target.value)}
              className="input w-full" placeholder="e.g. 48" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pain Score (0-10)</label>
            <input type="number" min="0" max="10" value={painScore}
              onChange={(e) => setPainScore(e.target.value)} className="input w-full" placeholder="0-10" />
          </div>
        </div>

        {/* Eron Class display */}
        {eronClass && (
          <div className={`mt-3 p-3 rounded-lg text-sm ${
            eronClass === 'IV' ? 'bg-red-50 text-red-800 border border-red-200' :
            eronClass === 'III' ? 'bg-orange-50 text-orange-800 border border-orange-200' :
            eronClass === 'II' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
            'bg-green-50 text-green-800 border border-green-200'
          }`}>
            <strong>Eron Class {eronClass}</strong> — {
              eronClass === 'IV' ? 'Sepsis / Life-threatening — ICU required' :
              eronClass === 'III' ? 'Significant systemic toxicity' :
              eronClass === 'II' ? 'Systemic illness or comorbidities' :
              'No systemic toxicity, no comorbidities'
            }
          </div>
        )}
      </div>

      {/* Clinical Features & Red Flags */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" /> Clinical Features & Red Flags
        </h3>
        {activeRedFlags > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3 mb-3 text-sm text-red-800">
            <strong>⚠️ {activeRedFlags} Red Flag{activeRedFlags > 1 ? 's' : ''} Present</strong>
            {(redFlags.crepitus || redFlags.skinNecrosis || redFlags.hemorrhagicBullae) && (
              <p className="mt-1 font-bold text-red-900">
                HARD SIGNS OF NSTI — Emergent surgical exploration warranted regardless of LRINEC score!
              </p>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {RED_FLAG_LABELS.map(({ key, label }) => (
            <label key={key} className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm ${
              redFlags[key] ? 'bg-red-50 border-red-300' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input type="checkbox" checked={redFlags[key]}
                onChange={(e) => setRedFlags({ ...redFlags, [key]: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Comorbidities */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-sm text-gray-800 mb-3">Comorbidities</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {COMORBIDITY_LABELS.map(({ key, label }) => (
            <label key={key} className={`flex items-center gap-2 p-2 rounded border cursor-pointer text-sm ${
              comorbidities[key] ? 'bg-purple-50 border-purple-300' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input type="checkbox" checked={comorbidities[key]}
                onChange={(e) => setComorbidities({ ...comorbidities, [key]: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
              {label}
            </label>
          ))}
        </div>
        {comorbidities.diabetesMellitus && (
          <div className="mt-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">HbA1c (%)</label>
            <input type="number" step="0.1" value={hba1c} onChange={(e) => setHba1c(e.target.value)}
              className="input w-48" placeholder="e.g. 8.5" />
          </div>
        )}
      </div>

      {/* Additional Notes */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-bold text-sm text-gray-800 mb-3">Additional Notes</h3>
        <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)}
          className="input w-full h-24" placeholder="Clinical notes, relevant history..." />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving || !selectedPatientId || !classification}
          className="btn btn-primary flex items-center gap-2">
          <Save size={16} />
          {saving ? 'Saving...' : 'Save Assessment & Generate Treatment Plan'}
        </button>
      </div>
    </div>
  );
}
