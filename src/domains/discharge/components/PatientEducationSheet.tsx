// Patient Education Sheet Component
// Generates printable patient education materials for discharge

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  FileText,
  Pill,
  AlertTriangle,
  Calendar,
  Phone,
  Activity,
  Utensils,
  Badge,
  Printer,
  Download,
  Check,
  ChevronDown,
  ChevronUp,
  Heart,
  Thermometer,
  Wind,
  Droplet,
  Moon,
  Sun,
  Coffee,
} from 'lucide-react';
import { format } from 'date-fns';
import type { DischargeSummary, Patient, DischargeMedication } from '../../../types';

interface Props {
  summary: DischargeSummary;
  patient: Patient;
  onClose: () => void;
}

interface EducationSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
  included: boolean;
}

export default function PatientEducationSheet({ summary, patient, onClose }: Props) {
  const [expandedSection, setExpandedSection] = useState<string | null>('medications');
  const [includedSections, setIncludedSections] = useState<string[]>([
    'medications',
    'activity',
    'diet',
    'warnings',
    'followup',
    'contacts',
  ]);

  const toggleSection = (id: string) => {
    setIncludedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // Medication schedule helper
  const getMedicationSchedule = (med: DischargeMedication) => {
    const scheduleIcons: Record<string, React.ReactNode> = {
      'Once daily': <Sun size={14} className="text-yellow-500" />,
      'Twice daily': (
        <div className="flex gap-1">
          <Sun size={14} className="text-yellow-500" />
          <Moon size={14} className="text-indigo-500" />
        </div>
      ),
      'Three times daily': (
        <div className="flex gap-1">
          <Sun size={14} className="text-yellow-500" />
          <Coffee size={14} className="text-amber-600" />
          <Moon size={14} className="text-indigo-500" />
        </div>
      ),
      'At bedtime': <Moon size={14} className="text-indigo-500" />,
      'As needed': <AlertTriangle size={14} className="text-orange-500" />,
    };
    return scheduleIcons[med.frequency] || null;
  };

  const sections: EducationSection[] = [
    {
      id: 'medications',
      title: 'Your Medications',
      icon: Pill,
      included: includedSections.includes('medications'),
      content: (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Take all medications exactly as prescribed. Do not stop taking any medication without talking to your doctor.
          </p>
          {summary.dischargeMedications.length > 0 ? (
            <div className="space-y-3">
              {summary.dischargeMedications.map((med, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    med.isNew ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{med.name}</h4>
                        {med.isNew && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {med.dose} • {med.route} • {med.frequency}
                      </p>
                      <p className="text-sm text-gray-500">Duration: {med.duration}</p>
                      <p className="text-sm text-indigo-600 mt-1">
                        <strong>For:</strong> {med.purpose}
                      </p>
                      {med.specialInstructions && (
                        <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          {med.specialInstructions}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      {getMedicationSchedule(med)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No discharge medications prescribed</p>
          )}

          {summary.medicationsDiscontinued.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-700 flex items-center gap-2">
                <X size={16} />
                Stopped Medications
              </h4>
              <p className="text-sm text-red-600 mt-1">
                Do NOT take these medications: {summary.medicationsDiscontinued.join(', ')}
              </p>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-700">Medication Tips</h4>
            <ul className="text-sm text-blue-600 mt-2 space-y-1">
              <li>✓ Take medications at the same time each day</li>
              <li>✓ Use a pill organizer to stay organized</li>
              <li>✓ Keep a list of all your medications with you</li>
              <li>✓ Tell all your doctors about all medications you take</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'activity',
      title: 'Activity & Exercise',
      icon: Activity,
      included: includedSections.includes('activity'),
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Activity Guidelines</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {summary.activityRestrictions}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-700 flex items-center gap-2">
                <Check size={16} />
                You CAN Do
              </h4>
              <ul className="text-sm text-green-600 mt-2 space-y-1">
                <li>• Light walking as tolerated</li>
                <li>• Normal daily activities at home</li>
                <li>• Deep breathing exercises</li>
                <li>• Gentle stretching</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-700 flex items-center gap-2">
                <X size={16} />
                AVOID For Now
              </h4>
              <ul className="text-sm text-red-600 mt-2 space-y-1">
                <li>• Heavy lifting (&gt;5kg)</li>
                <li>• Strenuous exercise</li>
                <li>• Driving (if on sedatives)</li>
                <li>• Operating machinery</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <h4 className="font-medium text-purple-700">Gradual Return to Activity</h4>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 text-center p-2 bg-purple-100 rounded text-xs text-purple-700">
                Week 1-2<br/>
                <span className="font-medium">Rest</span>
              </div>
              <ChevronDown className="text-purple-400 rotate-[-90deg]" size={16} />
              <div className="flex-1 text-center p-2 bg-purple-100 rounded text-xs text-purple-700">
                Week 2-4<br/>
                <span className="font-medium">Light Activity</span>
              </div>
              <ChevronDown className="text-purple-400 rotate-[-90deg]" size={16} />
              <div className="flex-1 text-center p-2 bg-purple-100 rounded text-xs text-purple-700">
                Week 4+<br/>
                <span className="font-medium">Normal</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'diet',
      title: 'Diet & Nutrition',
      icon: Utensils,
      included: includedSections.includes('diet'),
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Dietary Instructions</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {summary.dietaryInstructions}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-700 flex items-center gap-2">
                <Check size={16} />
                Recommended Foods
              </h4>
              <ul className="text-sm text-green-600 mt-2 space-y-1">
                <li>• Fresh fruits and vegetables</li>
                <li>• Lean proteins (fish, chicken)</li>
                <li>• Whole grains</li>
                <li>• Plenty of water (8 glasses/day)</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-700 flex items-center gap-2">
                <X size={16} />
                Limit or Avoid
              </h4>
              <ul className="text-sm text-red-600 mt-2 space-y-1">
                <li>• Processed foods</li>
                <li>• Excessive salt</li>
                <li>• Alcohol</li>
                <li>• Sugary drinks</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-700 flex items-center gap-2">
              <Droplet size={16} />
              Hydration Tips
            </h4>
            <p className="text-sm text-blue-600 mt-1">
              Drink at least 8 glasses of water daily unless told otherwise by your doctor.
              Proper hydration helps healing and prevents constipation from pain medications.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'wound',
      title: 'Wound Care',
      icon: Badge,
      included: includedSections.includes('wound'),
      content: summary.woundCareInstructions ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {summary.woundCareInstructions}
            </p>
          </div>

          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-700">General Wound Care Tips</h4>
            <ul className="text-sm text-yellow-600 mt-2 space-y-1">
              <li>• Keep the wound clean and dry</li>
              <li>• Change dressings as instructed</li>
              <li>• Wash hands before touching the wound</li>
              <li>• Do not pick at stitches or staples</li>
              <li>• Protect from direct sunlight</li>
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-700">Normal Healing Signs</h4>
              <ul className="text-sm text-green-600 mt-2 space-y-1">
                <li>✓ Mild redness around edges</li>
                <li>✓ Slight swelling</li>
                <li>✓ Minimal clear drainage</li>
                <li>✓ Itching (healing sign)</li>
              </ul>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-700">Warning Signs</h4>
              <ul className="text-sm text-red-600 mt-2 space-y-1">
                <li>⚠ Increasing redness/warmth</li>
                <li>⚠ Pus or foul-smelling drainage</li>
                <li>⚠ Fever &gt;38°C</li>
                <li>⚠ Opening of wound</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 italic">No specific wound care instructions</p>
      ),
    },
    {
      id: 'warnings',
      title: 'Warning Signs - When to Seek Help',
      icon: AlertTriangle,
      included: includedSections.includes('warnings'),
      content: (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
            <h4 className="font-bold text-red-700 text-lg flex items-center gap-2">
              <AlertTriangle size={20} />
              SEEK IMMEDIATE MEDICAL ATTENTION IF YOU EXPERIENCE:
            </h4>
            <ul className="text-red-600 mt-3 space-y-2">
              {summary.warningSignsToWatch.map((sign, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">⚠</span>
                  <span className="font-medium">{sign}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-center">
              <Thermometer className="w-8 h-8 mx-auto text-orange-500 mb-2" />
              <h4 className="font-medium text-orange-700">Fever</h4>
              <p className="text-sm text-orange-600">Temperature &gt;38°C</p>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <Heart className="w-8 h-8 mx-auto text-red-500 mb-2" />
              <h4 className="font-medium text-red-700">Chest Pain</h4>
              <p className="text-sm text-red-600">Or difficulty breathing</p>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
              <Wind className="w-8 h-8 mx-auto text-purple-500 mb-2" />
              <h4 className="font-medium text-purple-700">Breathing</h4>
              <p className="text-sm text-purple-600">Shortness of breath</p>
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700 text-center font-medium">
              If unsure whether your symptoms are serious, it's better to seek help.
              <br />
              Trust your instincts - you know your body best.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'followup',
      title: 'Follow-up Appointments',
      icon: Calendar,
      included: includedSections.includes('followup'),
      content: (
        <div className="space-y-4">
          {summary.followUpAppointments.length > 0 ? (
            <div className="space-y-3">
              {summary.followUpAppointments.map((appt, i) => (
                <div key={i} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-indigo-900">{appt.type}</h4>
                      <p className="text-sm text-indigo-700">{appt.department}</p>
                      {appt.instructions && (
                        <p className="text-sm text-indigo-600 mt-1">{appt.instructions}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-indigo-600">
                        {format(new Date(appt.scheduledDate), 'dd MMM yyyy')}
                      </p>
                      <p className="text-xs text-indigo-500">
                        {format(new Date(appt.scheduledDate), 'EEEE')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No follow-up appointments scheduled</p>
          )}

          {summary.pendingTests.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium text-orange-700">Pending Test Results</h4>
              <p className="text-sm text-orange-600 mt-1">
                Results awaited for: {summary.pendingTests.join(', ')}
              </p>
            </div>
          )}

          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-700">Appointment Reminder</h4>
            <ul className="text-sm text-green-600 mt-2 space-y-1">
              <li>✓ Bring this education sheet to your appointment</li>
              <li>✓ Bring all your medications</li>
              <li>✓ Write down any questions beforehand</li>
              <li>✓ Arrive 15 minutes early</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'contacts',
      title: 'Contact Information',
      icon: Phone,
      included: includedSections.includes('contacts'),
      content: (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg text-center">
              <h4 className="font-bold text-red-700">EMERGENCY</h4>
              <p className="text-2xl font-bold text-red-600 mt-2">{summary.emergencyContact}</p>
              <p className="text-sm text-red-500 mt-1">Available 24/7</p>
            </div>
            <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg text-center">
              <h4 className="font-bold text-blue-700">CLINIC</h4>
              <p className="text-2xl font-bold text-blue-600 mt-2">{summary.clinicContact}</p>
              <p className="text-sm text-blue-500 mt-1">Office Hours</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-medium text-gray-700">Other Useful Contacts</h4>
            <div className="grid md:grid-cols-2 gap-2 mt-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Pharmacy:</span>
                <span className="text-gray-700">Contact your local pharmacy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Ambulance:</span>
                <span className="text-gray-700 font-medium">112 / 199</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-cyan-500 text-white print:bg-blue-500">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Patient Education Sheet</h2>
              <p className="text-sm text-white/80">
                {patient.firstName} {patient.lastName} • {format(new Date(), 'dd MMM yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-white/20 rounded"
              title="Print"
            >
              <Printer size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Section Toggles */}
        <div className="p-4 border-b bg-gray-50 print:hidden">
          <p className="text-sm text-gray-500 mb-2">Select sections to include:</p>
          <div className="flex flex-wrap gap-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => toggleSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  includedSections.includes(section.id)
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                <section.icon size={14} />
                {section.title.split(' - ')[0]}
                {includedSections.includes(section.id) && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6 print:max-h-none">
          <div className="space-y-6">
            {sections
              .filter(s => includedSections.includes(s.id))
              .map((section) => (
                <div key={section.id} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors print:hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <section.icon className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{section.title}</h3>
                    </div>
                    <div className="print:hidden">
                      {expandedSection === section.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      )}
                    </div>
                  </button>
                  <div
                    className={`p-4 ${
                      expandedSection === section.id ? 'block' : 'hidden print:block'
                    }`}
                  >
                    {section.content}
                  </div>
                </div>
              ))}
          </div>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500 print:border-t-2">
            <p className="font-medium text-gray-700">Keep this sheet in a safe place</p>
            <p className="mt-1">
              Prepared by: {summary.preparedByName} • {format(new Date(), 'dd MMMM yyyy')}
            </p>
            <p className="text-xs mt-2 text-gray-400">
              This educational material is provided as general guidance. Always follow your doctor's specific instructions.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
