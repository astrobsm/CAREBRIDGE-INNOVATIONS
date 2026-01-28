// Discharge Summary View Component
// Displays completed discharge summary with print/export options

import { motion } from 'framer-motion';
import {
  X,
  FileText,
  User,
  Calendar,
  Pill,
  Stethoscope,
  Activity,
  ClipboardList,
  Phone,
  Download,
  Printer,
  CheckCircle,
  AlertTriangle,
  Clock,
  MapPin,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import type { DischargeSummary, Patient } from '../../../types';
import { generateDischargeSummaryPDF } from '../../../utils/dischargePdfGenerator';
import {
  printThermalDocument,
  createClinicalDocument,
  type PrintableDocument,
  type PrintSection,
} from '../../../services/thermalPrintService';

interface Props {
  summary: DischargeSummary;
  patient?: Patient;
  onClose: () => void;
}

const conditionColors = {
  improved: 'bg-green-100 text-green-700',
  stable: 'bg-blue-100 text-blue-700',
  unchanged: 'bg-yellow-100 text-yellow-700',
  deteriorated: 'bg-red-100 text-red-700',
};

const dispositionLabels: Record<string, string> = {
  home: 'Discharged Home',
  facility: 'To Skilled Facility',
  hospice: 'To Hospice',
  transfer: 'Transfer to Another Hospital',
  'against-advice': 'Against Medical Advice',
  deceased: 'Deceased',
};

export default function DischargeSummaryView({ summary, patient, onClose }: Props) {
  const losDays = differenceInDays(new Date(summary.dischargeDate), new Date(summary.admissionDate)) + 1;

  // Thermal print (XP-T80Q, 80mm, Georgia 12pt)
  const handlePrint = () => {
    if (!patient) {
      toast.error('Patient information not available');
      return;
    }

    const content: PrintSection[] = [
      { type: 'header', data: 'Admission Details' },
      { type: 'text', data: { key: 'Admitted', value: format(new Date(summary.admissionDate), 'dd/MM/yyyy') } },
      { type: 'text', data: { key: 'Discharged', value: format(new Date(summary.dischargeDate), 'dd/MM/yyyy') } },
      { type: 'text', data: { key: 'LOS', value: `${losDays} day${losDays > 1 ? 's' : ''}` } },
      { type: 'divider', data: 'dashed' },
      { type: 'header', data: 'Diagnosis' },
      { type: 'text', data: summary.primaryDiagnosis },
    ];

    if (summary.secondaryDiagnoses?.length) {
      content.push({ type: 'text', data: `Secondary: ${summary.secondaryDiagnoses.join(', ')}` });
    }

    content.push({ type: 'divider', data: 'dashed' });
    content.push({ type: 'header', data: 'Condition at Discharge' });
    content.push({ type: 'text', data: summary.conditionOnDischarge || 'Not specified' });

    if (summary.medications?.length) {
      content.push({ type: 'divider', data: 'dashed' });
      content.push({ type: 'header', data: 'Medications' });
      summary.medications.forEach(med => {
        content.push({ type: 'text', data: `• ${med.name} - ${med.dosage}` });
      });
    }

    if (summary.followUpInstructions) {
      content.push({ type: 'divider', data: 'dashed' });
      content.push({ type: 'header', data: 'Follow-up' });
      content.push({ type: 'text', data: summary.followUpInstructions });
    }

    const thermalDoc: PrintableDocument = {
      title: 'DISCHARGE SUMMARY',
      content,
      footer: 'For queries, contact the hospital',
      printDate: true,
    };

    printThermalDocument(thermalDoc);
    toast.success('Print dialog opened');
  };

  const handleDownloadPDF = async () => {
    if (!patient) {
      toast.error('Patient information not available');
      return;
    }
    
    try {
      await generateDischargeSummaryPDF(summary, patient);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
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
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-500 to-emerald-500 text-white">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-lg font-semibold">Discharge Summary</h2>
              <p className="text-sm text-white/80">
                {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 hover:bg-white/20 rounded"
              title="Print"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={handleDownloadPDF}
              className="p-2 hover:bg-white/20 rounded"
              title="Download PDF"
            >
              <Download size={18} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
          {/* Patient & Admission Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <User className="w-5 h-5 text-indigo-500" />
                Patient Information
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Name:</span>
                  <span className="font-medium">{patient ? `${patient.firstName} ${patient.lastName}` : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Hospital Number:</span>
                  <span className="font-medium">{patient?.hospitalNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date of Birth:</span>
                  <span className="font-medium">
                    {patient?.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd MMM yyyy') : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gender:</span>
                  <span className="font-medium capitalize">{patient?.gender || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Admission Details
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Admission Date:</span>
                  <span className="font-medium">{format(new Date(summary.admissionDate), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Discharge Date:</span>
                  <span className="font-medium">{format(new Date(summary.dischargeDate), 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Length of Stay:</span>
                  <span className="font-medium text-indigo-600">{losDays} day(s)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Condition:</span>
                  <span className={`px-2 py-0.5 rounded text-sm font-medium ${conditionColors[summary.conditionAtDischarge]}`}>
                    {summary.conditionAtDischarge.charAt(0).toUpperCase() + summary.conditionAtDischarge.slice(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Disposition:</span>
                  <span className="font-medium">{dispositionLabels[summary.dischargeDisposition]}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Stethoscope className="w-5 h-5 text-indigo-500" />
              Diagnosis
            </div>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <span className="text-sm text-gray-500">Admitting Diagnosis:</span>
                <p className="font-medium">{summary.admittingDiagnosis}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Final Diagnosis:</span>
                <ul className="list-disc list-inside">
                  {summary.finalDiagnosis.map((dx, i) => (
                    <li key={i} className="font-medium">{dx}</li>
                  ))}
                </ul>
              </div>
              {summary.comorbidities.length > 0 && (
                <div>
                  <span className="text-sm text-gray-500">Comorbidities:</span>
                  <p className="font-medium">{summary.comorbidities.join(', ')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Hospital Course */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Activity className="w-5 h-5 text-indigo-500" />
              Hospital Course
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="whitespace-pre-wrap">{summary.hospitalCourse}</p>
            </div>
            {summary.proceduresPerformed.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <span className="text-sm font-medium text-blue-700">Procedures Performed:</span>
                <ul className="list-disc list-inside mt-2">
                  {summary.proceduresPerformed.map((proc, i) => (
                    <li key={i}>
                      {proc.name} - {format(new Date(proc.date), 'dd MMM yyyy')} ({proc.outcome})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {summary.consultations.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-4">
                <span className="text-sm font-medium text-purple-700">Consultations:</span>
                <p className="mt-1">{summary.consultations.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Medications */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Pill className="w-5 h-5 text-indigo-500" />
              Discharge Medications
            </div>
            {summary.dischargeMedications.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dose</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {summary.dischargeMedications.map((med, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-sm">
                          {med.name}
                          {med.isNew && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">NEW</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">{med.dose}</td>
                        <td className="px-4 py-2 text-sm">{med.route}</td>
                        <td className="px-4 py-2 text-sm">{med.frequency}</td>
                        <td className="px-4 py-2 text-sm">{med.duration}</td>
                        <td className="px-4 py-2 text-sm">{med.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">No discharge medications prescribed</p>
            )}
            {summary.medicationsDiscontinued.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4">
                <span className="text-sm font-medium text-red-700">Medications Discontinued:</span>
                <p className="mt-1">{summary.medicationsDiscontinued.join(', ')}</p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <ClipboardList className="w-5 h-5 text-indigo-500" />
              Discharge Instructions
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm font-medium text-gray-700">Dietary Instructions:</span>
                <p className="mt-1">{summary.dietaryInstructions}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm font-medium text-gray-700">Activity Restrictions:</span>
                <p className="mt-1">{summary.activityRestrictions}</p>
              </div>
            </div>
            {summary.woundCareInstructions && (
              <div className="bg-blue-50 rounded-lg p-4">
                <span className="text-sm font-medium text-blue-700">Wound Care Instructions:</span>
                <p className="mt-1">{summary.woundCareInstructions}</p>
              </div>
            )}
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">Warning Signs to Watch For:</span>
              </div>
              <ul className="list-disc list-inside">
                {summary.warningSignsToWatch.map((sign, i) => (
                  <li key={i} className="text-yellow-800">{sign}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Follow-up */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Calendar className="w-5 h-5 text-indigo-500" />
              Follow-up Appointments
            </div>
            {summary.followUpAppointments.length > 0 ? (
              <div className="space-y-2">
                {summary.followUpAppointments.map((appt, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{appt.type}</p>
                      <p className="text-sm text-gray-500">{appt.department}</p>
                      {appt.instructions && (
                        <p className="text-sm text-gray-600 mt-1">{appt.instructions}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-indigo-600">
                        {format(new Date(appt.scheduledDate), 'dd MMM yyyy')}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        appt.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        appt.status === 'completed' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No follow-up appointments scheduled</p>
            )}
            {(summary.pendingTests.length > 0 || summary.pendingReferrals.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                {summary.pendingTests.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <span className="text-sm font-medium text-orange-700">Pending Tests:</span>
                    <ul className="list-disc list-inside mt-1">
                      {summary.pendingTests.map((test, i) => (
                        <li key={i}>{test}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {summary.pendingReferrals.length > 0 && (
                  <div className="bg-purple-50 rounded-lg p-4">
                    <span className="text-sm font-medium text-purple-700">Pending Referrals:</span>
                    <ul className="list-disc list-inside mt-1">
                      {summary.pendingReferrals.map((ref, i) => (
                        <li key={i}>{ref}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Phone className="w-5 h-5 text-indigo-500" />
              Contact Information
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-red-50 rounded-lg p-4">
                <span className="text-sm font-medium text-red-700">Emergency Contact:</span>
                <p className="mt-1 font-medium text-lg">{summary.emergencyContact}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <span className="text-sm font-medium text-blue-700">Clinic Contact:</span>
                <p className="mt-1 font-medium text-lg">{summary.clinicContact}</p>
              </div>
            </div>
          </div>

          {/* Prepared By */}
          <div className="border-t pt-4 mt-6">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div>
                <p>Prepared by: <span className="font-medium text-gray-700">{summary.preparedByName}</span></p>
                <p>Attending Physician: <span className="font-medium text-gray-700">{summary.attendingPhysicianName}</span></p>
              </div>
              <div className="text-right">
                <p>Date: {format(new Date(summary.createdAt), 'dd MMM yyyy, HH:mm')}</p>
                <p className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                  summary.status === 'completed' ? 'bg-green-100 text-green-700' :
                  summary.status === 'exported' ? 'bg-blue-100 text-blue-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  <CheckCircle size={12} />
                  {summary.status.charAt(0).toUpperCase() + summary.status.slice(1)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
