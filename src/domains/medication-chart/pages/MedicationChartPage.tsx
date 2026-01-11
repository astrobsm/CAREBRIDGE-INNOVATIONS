/**
 * Medication Chart (MAR) Page
 * CareBridge Innovations in Healthcare
 * 
 * Comprehensive medication administration record for nurses
 * to track and document medication administration.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import {
  Pill,
  Plus,
  Search,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Users,
  X,
  Minus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import type { Patient, Admission, Prescription } from '../../../types';
import type { 
  DailyMedicationChart,
  MedicationAdministration,
  ScheduledMedication,
  AdministrationStatus,
  AdministrationRoute,
} from '../types';
import { ADMINISTRATION_STATUSES } from '../types';

// Standard medication times
const MEDICATION_TIMES = [
  { label: '06:00', period: 'morning' },
  { label: '08:00', period: 'morning' },
  { label: '10:00', period: 'morning' },
  { label: '12:00', period: 'afternoon' },
  { label: '14:00', period: 'afternoon' },
  { label: '16:00', period: 'afternoon' },
  { label: '18:00', period: 'afternoon' },
  { label: '20:00', period: 'night' },
  { label: '22:00', period: 'night' },
];

export default function MedicationChartPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [admittedPatients, setAdmittedPatients] = useState<(Patient & { admission?: Admission })[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<(Patient & { admission?: Admission }) | null>(null);
  const [medicationCharts, setMedicationCharts] = useState<DailyMedicationChart[]>([]);
  const [currentChart, setCurrentChart] = useState<DailyMedicationChart | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<ScheduledMedication | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Administration form state
  const [adminStatus, setAdminStatus] = useState<AdministrationStatus>('given');
  const [actualTime, setActualTime] = useState(format(new Date(), 'HH:mm'));
  const [adminNotes, setAdminNotes] = useState('');
  const [reasonNotGiven, setReasonNotGiven] = useState('');

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get admitted patients
        const admissions = await db.admissions.filter(a => a.status === 'active').toArray();
        const patientIds = admissions.map(a => a.patientId);
        
        const patients = await db.patients.filter(p => patientIds.includes(p.id)).toArray();
        
        const patientsWithAdmissions = patients.map(p => ({
          ...p,
          admission: admissions.find(a => a.patientId === p.id),
        }));
        
        setAdmittedPatients(patientsWithAdmissions);

        // Fetch medication charts
        const charts = await db.table('medicationCharts').toArray();
        setMedicationCharts(charts as DailyMedicationChart[]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch prescriptions when patient is selected
  useEffect(() => {
    if (selectedPatient) {
      fetchPatientPrescriptions(selectedPatient.id);
    }
  }, [selectedPatient]);

  const fetchPatientPrescriptions = async (patientId: string) => {
    try {
      const patientPrescriptions = await db.prescriptions
        .filter(p => p.patientId === patientId && p.status !== 'cancelled')
        .toArray();

      // Check if chart exists for today
      const existingChart = medicationCharts.find(
        c => c.patientId === patientId && 
        format(new Date(c.chartDate), 'yyyy-MM-dd') === selectedDate
      );

      if (existingChart) {
        setCurrentChart(existingChart);
      } else {
        // Create new chart for today
        await createDailyChart(patientId, patientPrescriptions);
      }
    } catch (error) {
      console.error('Error fetching prescriptions:', error);
    }
  };

  // Create daily medication chart
  const createDailyChart = async (patientId: string, patientPrescriptions: Prescription[]) => {
    const scheduledMedications: ScheduledMedication[] = patientPrescriptions.flatMap(prescription =>
      prescription.medications.map((med: { name: string; genericName?: string; dosage: string; route: string; instructions?: string }) => ({
        id: uuidv4(),
        prescriptionId: prescription.id,
        medicationName: med.name,
        genericName: med.genericName,
        dosage: med.dosage,
        route: med.route as AdministrationRoute,
        frequency: 'thrice_daily', // Default, would be parsed from prescription
        scheduledTimes: ['08:00', '14:00', '20:00'], // Default times
        startDate: new Date(prescription.prescribedAt),
        specialInstructions: med.instructions,
        prescribedBy: prescription.prescribedBy,
        prescribedByName: '', // Would be looked up
      }))
    );

    const newChart: DailyMedicationChart = {
      id: uuidv4(),
      patientId,
      hospitalId: user?.hospitalId || 'hospital-1',
      admissionId: admittedPatients.find(p => p.id === patientId)?.admission?.id || '',
      chartDate: new Date(selectedDate),
      shiftType: 'morning',
      assignedNurseId: user?.id || '',
      assignedNurseName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
      scheduledMedications,
      administrations: [],
      totalScheduled: scheduledMedications.reduce((sum, m) => sum + m.scheduledTimes.length, 0),
      totalAdministered: 0,
      complianceRate: 0,
      isCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'pending',
    };

    try {
      await db.table('medicationCharts').add(newChart);
      syncRecord('medicationCharts', newChart as unknown as Record<string, unknown>);
      setCurrentChart(newChart);
      setMedicationCharts(prev => [...prev, newChart]);
    } catch (error) {
      console.error('Error creating chart:', error);
    }
  };

  // Record medication administration
  const recordAdministration = async () => {
    if (!selectedMedication || !currentChart) return;

    const administration: MedicationAdministration = {
      id: uuidv4(),
      chartId: currentChart.id,
      scheduledMedicationId: selectedMedication.id,
      medicationName: selectedMedication.medicationName,
      dosage: selectedMedication.dosage,
      route: selectedMedication.route,
      scheduledTime: selectedTime,
      actualTime,
      status: adminStatus,
      reasonNotGiven: adminStatus !== 'given' ? reasonNotGiven : undefined,
      administeredBy: user?.id || '',
      administeredByName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
      notes: adminNotes || undefined,
      createdAt: new Date(),
    };

    try {
      const updatedAdministrations = [...currentChart.administrations, administration];
      const totalAdministered = updatedAdministrations.filter(a => a.status === 'given').length;
      const complianceRate = currentChart.totalScheduled > 0 
        ? Math.round((totalAdministered / currentChart.totalScheduled) * 100) 
        : 0;

      const updatedChart: DailyMedicationChart = {
        ...currentChart,
        administrations: updatedAdministrations,
        totalAdministered,
        complianceRate,
        updatedAt: new Date(),
      };

      await db.table('medicationCharts').put(updatedChart);
      syncRecord('medicationCharts', updatedChart as unknown as Record<string, unknown>);
      setCurrentChart(updatedChart);
      setMedicationCharts(prev => prev.map(c => c.id === updatedChart.id ? updatedChart : c));

      toast.success('Medication administration recorded');
      closeAdminModal();
    } catch (error) {
      console.error('Error recording administration:', error);
      toast.error('Failed to record administration');
    }
  };

  // Open administration modal
  const openAdminModal = (medication: ScheduledMedication, time: string) => {
    setSelectedMedication(medication);
    setSelectedTime(time);
    setActualTime(format(new Date(), 'HH:mm'));
    setAdminStatus('given');
    setAdminNotes('');
    setReasonNotGiven('');
    setShowAdminModal(true);
  };

  // Close administration modal
  const closeAdminModal = () => {
    setShowAdminModal(false);
    setSelectedMedication(null);
    setSelectedTime('');
  };

  // Get administration status for a medication at a specific time
  const getAdministrationStatus = (medicationId: string, time: string): MedicationAdministration | undefined => {
    return currentChart?.administrations.find(
      a => a.scheduledMedicationId === medicationId && a.scheduledTime === time
    );
  };

  // Filter patients
  const filteredPatients = admittedPatients.filter(patient =>
    !searchTerm ||
    patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.hospitalNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get status icon
  const getStatusIcon = (status: AdministrationStatus) => {
    switch (status) {
      case 'given':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'withheld':
        return <Minus className="w-5 h-5 text-yellow-600" />;
      case 'refused':
        return <XCircle className="w-5 h-5 text-orange-600" />;
      case 'not_available':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Pill className="w-7 h-7 text-emerald-600" />
            Medication Chart
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Medication Administration Record (MAR) for admitted patients
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <User size={16} />
            <span>Nurse: {user?.firstName} {user?.lastName}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Users className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{admittedPatients.length}</p>
              <p className="text-xs text-gray-500">Admitted Patients</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Pill className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {medicationCharts.filter(c => format(new Date(c.chartDate), 'yyyy-MM-dd') === selectedDate).length}
              </p>
              <p className="text-xs text-gray-500">Charts Today</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {medicationCharts
                  .filter(c => format(new Date(c.chartDate), 'yyyy-MM-dd') === selectedDate)
                  .reduce((sum, c) => sum + c.totalAdministered, 0)}
              </p>
              <p className="text-xs text-gray-500">Doses Given</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {medicationCharts.length > 0 
                  ? Math.round(medicationCharts
                      .filter(c => format(new Date(c.chartDate), 'yyyy-MM-dd') === selectedDate)
                      .reduce((sum, c) => sum + c.complianceRate, 0) / 
                      Math.max(medicationCharts.filter(c => format(new Date(c.chartDate), 'yyyy-MM-dd') === selectedDate).length, 1))
                  : 0}%
              </p>
              <p className="text-xs text-gray-500">Compliance Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Date Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients by name or hospital number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="input w-48"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient List */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Admitted Patients</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {filteredPatients.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No admitted patients found</p>
                </div>
              ) : (
                filteredPatients.map(patient => {
                  const patientChart = medicationCharts.find(
                    c => c.patientId === patient.id && 
                    format(new Date(c.chartDate), 'yyyy-MM-dd') === selectedDate
                  );
                  
                  return (
                    <div
                      key={patient.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedPatient?.id === patient.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : ''
                      }`}
                      onClick={() => setSelectedPatient(patient)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>
                          {patient.admission && (
                            <p className="text-xs text-gray-400 mt-1">
                              Ward: {patient.admission.wardName || 'N/A'}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {patientChart ? (
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-medium ${
                                patientChart.complianceRate >= 80 ? 'text-green-600' :
                                patientChart.complianceRate >= 50 ? 'text-amber-600' :
                                'text-red-600'
                              }`}>
                                {patientChart.complianceRate}%
                              </span>
                              <Activity className="w-4 h-4 text-gray-400" />
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">No chart</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Medication Chart */}
        <div className="lg:col-span-2">
          {selectedPatient && currentChart ? (
            <div className="card">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">
                      {selectedPatient.firstName} {selectedPatient.lastName}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedPatient.hospitalNumber} • {format(new Date(selectedDate), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Compliance</p>
                      <p className={`text-lg font-bold ${
                        currentChart.complianceRate >= 80 ? 'text-green-600' :
                        currentChart.complianceRate >= 50 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {currentChart.complianceRate}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Medication Grid */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medication
                      </th>
                      {MEDICATION_TIMES.map(time => (
                        <th key={time.label} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {time.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {currentChart.scheduledMedications.map(medication => (
                      <tr key={medication.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{medication.medicationName}</p>
                            <p className="text-xs text-gray-500">{medication.dosage} - {medication.route.toUpperCase()}</p>
                          </div>
                        </td>
                        {MEDICATION_TIMES.map(time => {
                          const isScheduled = medication.scheduledTimes.includes(time.label);
                          const administration = getAdministrationStatus(medication.id, time.label);

                          if (!isScheduled) {
                            return (
                              <td key={time.label} className="px-2 py-3 text-center">
                                <span className="text-gray-300">—</span>
                              </td>
                            );
                          }

                          return (
                            <td key={time.label} className="px-2 py-3 text-center">
                              {administration ? (
                                <button
                                  onClick={() => openAdminModal(medication, time.label)}
                                  className="p-1 rounded hover:bg-gray-100"
                                  title={`${administration.status} at ${administration.actualTime}`}
                                >
                                  {getStatusIcon(administration.status)}
                                </button>
                              ) : (
                                <button
                                  onClick={() => openAdminModal(medication, time.label)}
                                  className="p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                                  title="Record administration"
                                >
                                  <Plus className="w-4 h-4 text-gray-400" />
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="p-4 border-t border-gray-100 bg-gray-50">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <span className="font-medium text-gray-500">Legend:</span>
                  {ADMINISTRATION_STATUSES.map(status => (
                    <div key={status.value} className="flex items-center gap-1">
                      {getStatusIcon(status.value)}
                      <span className="text-gray-600">{status.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart Notes */}
              {currentChart.generalNotes && (
                <div className="p-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Notes:</span> {currentChart.generalNotes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <Pill className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-600">Select a Patient</h3>
              <p className="text-gray-500 mt-1">
                Choose a patient from the list to view or record medication administration
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Administration Modal */}
      <AnimatePresence>
        {showAdminModal && selectedMedication && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={closeAdminModal}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-xl w-full max-w-md mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900">Record Administration</h2>
                  <button onClick={closeAdminModal} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Medication Info */}
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <p className="font-semibold text-emerald-800">{selectedMedication.medicationName}</p>
                  <p className="text-sm text-emerald-600">
                    {selectedMedication.dosage} - {selectedMedication.route.toUpperCase()}
                  </p>
                  <p className="text-xs text-emerald-500 mt-1">
                    Scheduled: {selectedTime}
                  </p>
                </div>

                {/* Status Selection */}
                <div>
                  <label className="label">Administration Status *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ADMINISTRATION_STATUSES.map(status => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setAdminStatus(status.value)}
                        className={`p-3 rounded-lg border-2 transition-colors flex items-center gap-2 ${
                          adminStatus === status.value
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {getStatusIcon(status.value)}
                        <span className="text-sm">{status.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actual Time */}
                <div>
                  <label className="label">Actual Time Given *</label>
                  <input
                    type="time"
                    value={actualTime}
                    onChange={(e) => setActualTime(e.target.value)}
                    className="input"
                  />
                </div>

                {/* Reason if not given */}
                {adminStatus !== 'given' && (
                  <div>
                    <label className="label">Reason *</label>
                    <textarea
                      value={reasonNotGiven}
                      onChange={(e) => setReasonNotGiven(e.target.value)}
                      rows={2}
                      className="input"
                      placeholder="Explain why medication was not given..."
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="label">Notes (Optional)</label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={2}
                    className="input"
                    placeholder="Any observations or patient response..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button onClick={closeAdminModal} className="btn btn-ghost">
                  Cancel
                </button>
                <button
                  onClick={recordAdministration}
                  className="btn btn-primary flex items-center gap-2"
                  disabled={adminStatus !== 'given' && !reasonNotGiven}
                >
                  <CheckCircle2 size={18} />
                  Record
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
