// Patient Clinical Summary Page
// Displays all clinical encounters with progress analysis and PDF export

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  FileText,
  Stethoscope,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  ClipboardList,
  Download,
  Pill,
  Syringe,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { db } from '../../../database';

interface EncounterExpanded {
  [key: string]: boolean;
}

const encounterTypeColors: Record<string, string> = {
  outpatient: 'bg-blue-100 text-blue-800',
  inpatient: 'bg-purple-100 text-purple-800',
  emergency: 'bg-red-100 text-red-800',
  surgical: 'bg-orange-100 text-orange-800',
  follow_up: 'bg-green-100 text-green-800',
  home_visit: 'bg-teal-100 text-teal-800',
};

const encounterTypeLabels: Record<string, string> = {
  outpatient: 'Outpatient',
  inpatient: 'Inpatient',
  emergency: 'Emergency',
  surgical: 'Surgical',
  follow_up: 'Follow-up',
  home_visit: 'Home Visit',
};

export default function PatientClinicalSummaryPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [expandedEncounters, setExpandedEncounters] = useState<EncounterExpanded>({});
  const [selectedEncounterTypes, setSelectedEncounterTypes] = useState<string[]>([]);

  // Fetch patient data
  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  // Fetch all clinical encounters for this patient
  const encounters = useLiveQuery(
    () => patientId 
      ? db.clinicalEncounters
          .where('patientId')
          .equals(patientId)
          .reverse()
          .toArray()
      : [],
    [patientId]
  );

  // Fetch all vitals for this patient
  const vitals = useLiveQuery(
    () => patientId 
      ? db.vitalSigns
          .where('patientId')
          .equals(patientId)
          .reverse()
          .toArray()
      : [],
    [patientId]
  );

  // Fetch prescriptions
  const prescriptions = useLiveQuery(
    () => patientId 
      ? db.prescriptions
          .where('patientId')
          .equals(patientId)
          .toArray()
      : [],
    [patientId]
  );

  // Fetch users for clinician names
  const users = useLiveQuery(() => db.users.toArray(), []);

  // Filter encounters
  const filteredEncounters = useMemo(() => {
    if (!encounters) return [];
    if (selectedEncounterTypes.length === 0) return encounters;
    return encounters.filter(e => selectedEncounterTypes.includes(e.type));
  }, [encounters, selectedEncounterTypes]);

  // Clinical progress analysis
  const progressAnalysis = useMemo(() => {
    if (!encounters || encounters.length < 2 || !vitals || vitals.length < 2) {
      return null;
    }

    // Get earliest and latest vitals for trend analysis
    const sortedVitals = [...vitals].sort((a, b) => 
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
    const earliestVitals = sortedVitals[0];
    const latestVitals = sortedVitals[sortedVitals.length - 1];

    // Calculate trends
    const trends: {
      metric: string;
      initial: number;
      current: number;
      change: number;
      trend: 'improving' | 'worsening' | 'stable';
      unit: string;
    }[] = [];

    // Blood pressure systolic
    if (earliestVitals.bloodPressureSystolic && latestVitals.bloodPressureSystolic) {
      const change = latestVitals.bloodPressureSystolic - earliestVitals.bloodPressureSystolic;
      trends.push({
        metric: 'Systolic BP',
        initial: earliestVitals.bloodPressureSystolic,
        current: latestVitals.bloodPressureSystolic,
        change,
        trend: Math.abs(change) < 5 ? 'stable' : 
               (latestVitals.bloodPressureSystolic >= 90 && latestVitals.bloodPressureSystolic <= 140) ? 'improving' : 'worsening',
        unit: 'mmHg'
      });
    }

    // Temperature
    if (earliestVitals.temperature && latestVitals.temperature) {
      const change = latestVitals.temperature - earliestVitals.temperature;
      trends.push({
        metric: 'Temperature',
        initial: earliestVitals.temperature,
        current: latestVitals.temperature,
        change,
        trend: latestVitals.temperature >= 36.1 && latestVitals.temperature <= 37.5 ? 'improving' : 
               Math.abs(change) < 0.3 ? 'stable' : 'worsening',
        unit: '°C'
      });
    }

    // Pulse
    if (earliestVitals.pulse && latestVitals.pulse) {
      const change = latestVitals.pulse - earliestVitals.pulse;
      trends.push({
        metric: 'Pulse',
        initial: earliestVitals.pulse,
        current: latestVitals.pulse,
        change,
        trend: latestVitals.pulse >= 60 && latestVitals.pulse <= 100 ? 'improving' : 
               Math.abs(change) < 5 ? 'stable' : 'worsening',
        unit: 'bpm'
      });
    }

    // SpO2
    if (earliestVitals.oxygenSaturation && latestVitals.oxygenSaturation) {
      const change = latestVitals.oxygenSaturation - earliestVitals.oxygenSaturation;
      trends.push({
        metric: 'SpO2',
        initial: earliestVitals.oxygenSaturation,
        current: latestVitals.oxygenSaturation,
        change,
        trend: latestVitals.oxygenSaturation >= 95 ? 'improving' : 
               Math.abs(change) < 1 ? 'stable' : 'worsening',
        unit: '%'
      });
    }

    // Diagnosis trends
    const allDiagnoses = encounters.flatMap(e => e.diagnosis || []);
    const diagnosisCounts: Record<string, number> = {};
    allDiagnoses.forEach(d => {
      diagnosisCounts[d.description] = (diagnosisCounts[d.description] || 0) + 1;
    });

    // Calculate overall progress
    const improvingCount = trends.filter(t => t.trend === 'improving').length;
    const worseningCount = trends.filter(t => t.trend === 'worsening').length;
    const overallProgress: 'improving' | 'worsening' | 'stable' = 
      improvingCount > worseningCount ? 'improving' :
      worseningCount > improvingCount ? 'worsening' : 'stable';

    return {
      trends,
      diagnosisCounts,
      overallProgress,
      encounterCount: encounters.length,
      firstEncounterDate: new Date(encounters[encounters.length - 1].startedAt),
      lastEncounterDate: new Date(encounters[0].startedAt),
      daysSinceFirstEncounter: differenceInDays(new Date(), new Date(encounters[encounters.length - 1].startedAt)),
    };
  }, [encounters, vitals]);

  // Get clinician name
  const getClinicianName = (clinicianId: string) => {
    const clinician = users?.find(u => u.id === clinicianId);
    return clinician ? `Dr. ${clinician.firstName} ${clinician.lastName}` : 'Unknown Clinician';
  };

  // Toggle encounter expansion
  const toggleEncounter = (id: string) => {
    setExpandedEncounters(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Toggle encounter type filter
  const toggleEncounterType = (type: string) => {
    setSelectedEncounterTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Generate PDF
  const generatePDF = () => {
    if (!patient || !encounters) {
      toast.error('No data to export');
      return;
    }

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('CLINICAL SUMMARY REPORT', pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Patient info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Patient: ${patient.firstName} ${patient.lastName}`, margin, y);
      y += 6;
      doc.text(`Hospital Number: ${patient.hospitalNumber}`, margin, y);
      y += 6;
      doc.text(`Date of Birth: ${patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd MMM yyyy') : 'N/A'}`, margin, y);
      y += 6;
      doc.text(`Gender: ${patient.gender}`, margin, y);
      y += 6;
      doc.text(`Blood Group: ${patient.bloodGroup || 'Unknown'}`, margin, y);
      y += 10;

      // Progress Summary
      if (progressAnalysis) {
        doc.setFont('helvetica', 'bold');
        doc.text('PROGRESS SUMMARY', margin, y);
        y += 6;
        doc.setFont('helvetica', 'normal');
        doc.text(`Overall Progress: ${progressAnalysis.overallProgress.toUpperCase()}`, margin, y);
        y += 5;
        doc.text(`Total Encounters: ${progressAnalysis.encounterCount}`, margin, y);
        y += 5;
        doc.text(`Days in Care: ${progressAnalysis.daysSinceFirstEncounter}`, margin, y);
        y += 8;

        // Vital Trends
        if (progressAnalysis.trends.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.text('Vital Sign Trends:', margin, y);
          y += 5;
          doc.setFont('helvetica', 'normal');
          progressAnalysis.trends.forEach(trend => {
            const sign = trend.change > 0 ? '+' : '';
            doc.text(
              `  ${trend.metric}: ${trend.initial} → ${trend.current} ${trend.unit} (${sign}${trend.change.toFixed(1)}) - ${trend.trend}`,
              margin, y
            );
            y += 5;
          });
        }
        y += 5;
      }

      // Encounters
      doc.setFont('helvetica', 'bold');
      doc.text('CLINICAL ENCOUNTERS', margin, y);
      y += 8;

      filteredEncounters.forEach((encounter, index) => {
        // Check if we need a new page
        if (y > 260) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`${index + 1}. ${encounterTypeLabels[encounter.type] || encounter.type} - ${format(new Date(encounter.startedAt), 'dd MMM yyyy HH:mm')}`, margin, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`   Clinician: ${getClinicianName(encounter.attendingClinician)}`, margin, y);
        y += 5;

        doc.text(`   Chief Complaint: ${encounter.chiefComplaint}`, margin, y);
        y += 5;

        if (encounter.diagnosis && encounter.diagnosis.length > 0) {
          doc.text(`   Diagnoses: ${encounter.diagnosis.map(d => d.description).join(', ')}`, margin, y);
          y += 5;
        }

        if (encounter.treatmentPlan) {
          const planLines = doc.splitTextToSize(`   Treatment: ${encounter.treatmentPlan}`, pageWidth - 2 * margin);
          doc.text(planLines, margin, y);
          y += planLines.length * 4;
        }

        y += 5;
      });

      // Current Medications
      if (prescriptions && prescriptions.length > 0) {
        if (y > 240) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('CURRENT MEDICATIONS', margin, y);
        y += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        // Flatten all medications from all prescriptions
        const allMedications = prescriptions.flatMap(rx => 
          rx.medications.map(med => ({ ...med, prescribedAt: rx.prescribedAt, status: rx.status }))
        );
        allMedications.filter(m => !m.isDispensed).forEach(med => {
          doc.text(`• ${med.name} - ${med.dosage} - ${med.frequency}`, margin, y);
          y += 5;
        });
      }

      // Footer
      doc.setFontSize(8);
      doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')} | AstroHEALTH EMR`, margin, 290);

      // Save PDF
      doc.save(`Clinical_Summary_${patient.hospitalNumber}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading patient data...</p>
      </div>
    );
  }

  const getTrendIcon = (trend: 'improving' | 'worsening' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="text-green-500" size={18} />;
      case 'worsening':
        return <TrendingDown className="text-red-500" size={18} />;
      default:
        return <Minus className="text-gray-500" size={18} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft size={18} />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-sky-500" />
            Patient Clinical Summary
          </h1>
          <p className="text-gray-600 mt-1">
            {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
          </p>
        </div>
        <button
          onClick={generatePDF}
          className="btn btn-primary flex items-center gap-2"
        >
          <Download size={18} />
          Export PDF
        </button>
      </div>

      {/* Patient Details Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="card-header flex items-center gap-3">
          <User className="w-5 h-5 text-sky-500" />
          <h2 className="font-semibold text-gray-900">Patient Information</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Gender</span>
              <p className="font-medium capitalize">{patient.gender}</p>
            </div>
            <div>
              <span className="text-gray-500">Age</span>
              <p className="font-medium">
                {patient.dateOfBirth 
                  ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + ' years'
                  : 'N/A'}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Blood Group</span>
              <p className="font-medium">{patient.bloodGroup || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-500">Genotype</span>
              <p className="font-medium">{patient.genotype || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-500">Allergies</span>
              <p className="font-medium text-red-600">{patient.allergies || 'None known'}</p>
            </div>
            <div>
              <span className="text-gray-500">Phone</span>
              <p className="font-medium">{patient.phone}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progress Analysis */}
      {progressAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <Activity className="w-5 h-5 text-emerald-500" />
            <h2 className="font-semibold text-gray-900">Clinical Progress Analysis</h2>
          </div>
          <div className="card-body space-y-6">
            {/* Overall Status */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
              <div className={`p-3 rounded-full ${
                progressAnalysis.overallProgress === 'improving' ? 'bg-green-100' :
                progressAnalysis.overallProgress === 'worsening' ? 'bg-red-100' : 'bg-gray-200'
              }`}>
                {progressAnalysis.overallProgress === 'improving' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : progressAnalysis.overallProgress === 'worsening' ? (
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                ) : (
                  <Minus className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <div>
                <p className="text-lg font-bold capitalize">
                  Overall: {progressAnalysis.overallProgress}
                </p>
                <p className="text-sm text-gray-600">
                  {progressAnalysis.encounterCount} encounters over {progressAnalysis.daysSinceFirstEncounter} days
                </p>
              </div>
            </div>

            {/* Vital Trends */}
            {progressAnalysis.trends.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Vital Sign Trends</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {progressAnalysis.trends.map((trend, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">{trend.metric}</span>
                        {getTrendIcon(trend.trend)}
                      </div>
                      <p className="text-lg font-bold">
                        {trend.current} <span className="text-sm font-normal text-gray-500">{trend.unit}</span>
                      </p>
                      <p className={`text-xs ${
                        trend.change > 0 ? 'text-red-600' : trend.change < 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {trend.change > 0 ? '+' : ''}{trend.change.toFixed(1)} from initial
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common Diagnoses */}
            {Object.keys(progressAnalysis.diagnosisCounts).length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Diagnosis History</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(progressAnalysis.diagnosisCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([diagnosis, count]) => (
                      <span key={diagnosis} className="px-3 py-1 bg-sky-100 text-sky-800 rounded-full text-sm">
                        {diagnosis} ({count})
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Encounter Type Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-sm text-gray-600 py-1">Filter by type:</span>
        {Object.entries(encounterTypeLabels).map(([value, label]) => (
          <button
            key={value}
            onClick={() => toggleEncounterType(value)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              selectedEncounterTypes.includes(value)
                ? encounterTypeColors[value]
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
        {selectedEncounterTypes.length > 0 && (
          <button
            onClick={() => setSelectedEncounterTypes([])}
            className="px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Encounters List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-400" />
          Clinical Encounters ({filteredEncounters.length})
        </h2>

        {filteredEncounters.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Stethoscope className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No clinical encounters found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEncounters.map((encounter) => (
              <motion.div
                key={encounter.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="card overflow-hidden"
              >
                <button
                  onClick={() => toggleEncounter(encounter.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-sky-50 rounded-lg">
                      <Stethoscope className="w-5 h-5 text-sky-500" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${encounterTypeColors[encounter.type]}`}>
                          {encounterTypeLabels[encounter.type]}
                        </span>
                        <span className="text-sm text-gray-500">
                          {format(new Date(encounter.startedAt), 'dd MMM yyyy, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {encounter.chiefComplaint.substring(0, 100)}{encounter.chiefComplaint.length > 100 ? '...' : ''}
                      </p>
                    </div>
                  </div>
                  {expandedEncounters[encounter.id] ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>

                {expandedEncounters[encounter.id] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4 border-t bg-gray-50"
                  >
                    <div className="pt-4 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Attending Clinician:</span>
                          <p className="font-medium">{getClinicianName(encounter.attendingClinician)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <p className="font-medium capitalize">{encounter.status}</p>
                        </div>
                      </div>

                      {encounter.historyOfPresentIllness && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">History of Present Illness</h4>
                          <p className="text-sm text-gray-600 bg-white p-3 rounded">{encounter.historyOfPresentIllness}</p>
                        </div>
                      )}

                      {encounter.diagnosis && encounter.diagnosis.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Diagnoses</h4>
                          <div className="flex flex-wrap gap-2">
                            {encounter.diagnosis.map((d) => (
                              <span
                                key={d.id}
                                className={`px-2 py-1 rounded text-xs ${
                                  d.type === 'primary' ? 'bg-emerald-100 text-emerald-800' :
                                  d.type === 'secondary' ? 'bg-blue-100 text-blue-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {d.description} ({d.type})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {encounter.treatmentPlan && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Treatment Plan</h4>
                          <p className="text-sm text-gray-600 bg-white p-3 rounded">{encounter.treatmentPlan}</p>
                        </div>
                      )}

                      {encounter.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Clinical Notes</h4>
                          <p className="text-sm text-gray-600 bg-white p-3 rounded">{encounter.notes}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Current Medications */}
      {prescriptions && prescriptions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="card-header flex items-center gap-3">
            <Pill className="w-5 h-5 text-purple-500" />
            <h2 className="font-semibold text-gray-900">Current Medications</h2>
          </div>
          <div className="card-body">
            <div className="grid gap-3">
              {prescriptions.flatMap(rx => 
                rx.medications.map(med => (
                  <div key={med.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Syringe className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{med.name}</p>
                      <p className="text-sm text-gray-600">
                        {med.dosage} • {med.frequency} • {med.route}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      med.isDispensed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {med.isDispensed ? 'Dispensed' : 'Pending'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
