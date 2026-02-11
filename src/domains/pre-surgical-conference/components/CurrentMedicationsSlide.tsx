import { format } from 'date-fns';
import type { Prescription } from '../../../types';
import { Pill, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface CurrentMedicationsSlideProps {
  prescriptions: Prescription[];
  patientName: string;
}

const medicationCategories: Record<string, { label: string; color: string; icon: string }> = {
  antibiotic: { label: 'Antibiotics', color: 'bg-green-900/25 border-green-700/30 text-green-300', icon: '💊' },
  analgesic: { label: 'Analgesics', color: 'bg-blue-900/25 border-blue-700/30 text-blue-300', icon: '💉' },
  anticoagulant: { label: 'Anticoagulants', color: 'bg-red-900/25 border-red-700/30 text-red-300', icon: '🩸' },
  antihypertensive: { label: 'Antihypertensives', color: 'bg-purple-900/25 border-purple-700/30 text-purple-300', icon: '❤️' },
  antidiabetic: { label: 'Antidiabetics', color: 'bg-amber-900/25 border-amber-700/30 text-amber-300', icon: '🧬' },
  steroid: { label: 'Steroids', color: 'bg-orange-900/25 border-orange-700/30 text-orange-300', icon: '⚡' },
  supplement: { label: 'Supplements & Vitamins', color: 'bg-teal-900/25 border-teal-700/30 text-teal-300', icon: '🌿' },
  other: { label: 'Other Medications', color: 'bg-gray-800/50 border-gray-600/30 text-gray-300', icon: '📋' },
};

function categorizeMedication(name: string): string {
  const lower = name.toLowerCase();
  if (/amoxicillin|ceftriaxone|metronidazole|ciprofloxacin|azithromycin|augmentin|gentamicin|clindamycin|penicillin|doxycycline|levofloxacin|erythromycin|cefuroxime|ampicillin/.test(lower)) return 'antibiotic';
  if (/paracetamol|ibuprofen|diclofenac|tramadol|morphine|codeine|pentazocine|piroxicam|ketorolac|naproxen|acetaminophen|aspirin|celecoxib/.test(lower)) return 'analgesic';
  if (/heparin|warfarin|enoxaparin|rivaroxaban|clopidogrel|apixaban/.test(lower)) return 'anticoagulant';
  if (/amlodipine|lisinopril|losartan|atenolol|nifedipine|ramipril|valsartan|metoprolol|hydrochlorothiazide|furosemide/.test(lower)) return 'antihypertensive';
  if (/metformin|insulin|glibenclamide|glimepiride|gliclazide|sitagliptin/.test(lower)) return 'antidiabetic';
  if (/predniso|dexamethasone|hydrocortisone|methylpred|betamethasone/.test(lower)) return 'steroid';
  if (/vitamin|folic|iron|calcium|zinc|multivit|b12|ferrous/.test(lower)) return 'supplement';
  return 'other';
}

export default function CurrentMedicationsSlide({ prescriptions, patientName }: CurrentMedicationsSlideProps) {
  // Flatten all medications from active prescriptions
  const activePrescriptions = prescriptions.filter(p => p.status === 'pending' || p.status === 'dispensed' || p.status === 'partially_dispensed');

  const allMedications = activePrescriptions.flatMap(p =>
    p.medications.map(med => ({
      ...med,
      prescriptionId: p.id,
      prescribedBy: p.prescribedBy,
      prescribedAt: p.prescribedAt,
      prescriptionStatus: p.status,
    }))
  );

  if (allMedications.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
        <Pill size={80} className="text-gray-600 mb-6" />
        <h2 className="text-3xl font-bold text-gray-400 mb-2">No Current Medications</h2>
        <p className="text-gray-500 text-lg">No active prescriptions for {patientName}</p>
      </div>
    );
  }

  // Group by category
  const byCategory: Record<string, typeof allMedications> = {};
  allMedications.forEach(med => {
    const cat = categorizeMedication(med.name);
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(med);
  });

  const sortedCategories = Object.entries(byCategory).sort(([a], [b]) => {
    const order = ['anticoagulant', 'antibiotic', 'analgesic', 'antihypertensive', 'antidiabetic', 'steroid', 'supplement', 'other'];
    return order.indexOf(a) - order.indexOf(b);
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-900/40 to-purple-900/40 rounded-xl p-6 border border-violet-700/30">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Pill size={28} className="text-violet-400" />
          Current Medications — {patientName}
        </h2>
        <p className="text-violet-200/70 mt-1">
          {allMedications.length} medication{allMedications.length !== 1 ? 's' : ''} from {activePrescriptions.length} active prescription{activePrescriptions.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Medication Categories */}
      <div className="space-y-5">
        {sortedCategories.map(([category, meds]) => {
          const catInfo = medicationCategories[category] || medicationCategories.other;
          return (
            <div key={category} className={`rounded-xl p-5 border ${catInfo.color}`}>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <span className="text-xl">{catInfo.icon}</span>
                {catInfo.label} ({meds.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {meds.map((med, idx) => (
                  <div key={idx} className="bg-black/20 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-white text-lg">{med.name}</p>
                        <p className="text-gray-400 text-sm">
                          {med.dosage} • {med.frequency} • {med.route || 'Oral'}
                        </p>
                        {med.duration && (
                          <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                            <Clock size={10} /> Duration: {med.duration}
                          </p>
                        )}
                      </div>
                      <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                        med.prescriptionStatus === 'dispensed' ? 'bg-green-600/30 text-green-300' :
                        med.prescriptionStatus === 'pending' ? 'bg-yellow-600/30 text-yellow-300' :
                        'bg-gray-600/30 text-gray-300'
                      }`}>
                        {med.prescriptionStatus === 'dispensed' ? <CheckCircle2 size={10} /> : 
                         med.prescriptionStatus === 'cancelled' ? <XCircle size={10} /> : <Clock size={10} />}
                        {med.prescriptionStatus}
                      </span>
                    </div>
                    {med.prescribedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Prescribed: {format(new Date(med.prescribedAt), 'PP')} by {med.prescribedBy}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
