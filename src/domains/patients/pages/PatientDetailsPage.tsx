import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Edit,
  Stethoscope,
  Activity,
  Scissors,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Heart,
  AlertTriangle,
  Droplet,
  BedDouble,
} from 'lucide-react';
import { db } from '../../../database';
import { format, differenceInYears } from 'date-fns';
import AdmissionDurationClock, { AdmissionDurationBadge } from '../../admissions/components/AdmissionDurationClock';
import { generateEncounterPDFFromEntity } from '../../../utils/clinicalPdfGenerators';

export default function PatientDetailsPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  const vitals = useLiveQuery(
    () => patientId
      ? db.vitalSigns.where('patientId').equals(patientId).reverse().limit(5).toArray()
      : [],
    [patientId]
  );

  const encounters = useLiveQuery(
    () => patientId
      ? db.clinicalEncounters.where('patientId').equals(patientId).reverse().limit(5).toArray()
      : [],
    [patientId]
  );

  // Check if patient is currently admitted
  const activeAdmission = useLiveQuery(
    () => patientId
      ? db.admissions.where('patientId').equals(patientId).filter(a => a.status === 'active').first()
      : undefined,
    [patientId]
  );

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading patient details...</p>
      </div>
    );
  }

  const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button
            onClick={() => navigate('/patients')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={18} />
            Back to Patients
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/patients/${patientId}/vitals`} className="btn btn-secondary">
            <Activity size={18} />
            Record Vitals
          </Link>
          <Link to={`/patients/${patientId}/encounter`} className="btn btn-primary">
            <Stethoscope size={18} />
            Start Encounter
          </Link>
        </div>
      </div>

      {/* Patient Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-sky-400 to-indigo-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
              {(patient.firstName || '?')[0]}{(patient.lastName || '?')[0]}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.firstName} {patient.middleName || ''} {patient.lastName}
                </h1>
                <span className={`badge ${patient.gender === 'male' ? 'badge-info' : 'badge-primary'}`}>
                  {patient.gender}
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <FileText size={16} className="text-gray-400" />
                  <span className="font-mono">{patient.hospitalNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{age} years ({format(new Date(patient.dateOfBirth), 'MMM d, yyyy')})</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone size={16} className="text-gray-400" />
                  <span>{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={16} className="text-gray-400" />
                    <span>{patient.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-col gap-4">
              {/* Admission Status Badge */}
              {activeAdmission && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BedDouble className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-700">Currently Admitted</span>
                  </div>
                  <p className="text-xs text-emerald-600 mb-2">
                    {activeAdmission.wardName} • Bed {activeAdmission.bedNumber}
                  </p>
                  <AdmissionDurationBadge admissionDate={activeAdmission.admissionDate} />
                </div>
              )}
              
              <div className="flex gap-4">
                {patient.bloodGroup && (
                  <div className="text-center p-3 bg-red-50 rounded-xl">
                    <Droplet className="w-6 h-6 text-red-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-700">{patient.bloodGroup}</p>
                    <p className="text-xs text-red-500">Blood</p>
                  </div>
                )}
                {patient.genotype && (
                  <div className="text-center p-3 bg-purple-50 rounded-xl">
                    <Heart className="w-6 h-6 text-purple-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-purple-700">{patient.genotype}</p>
                    <p className="text-xs text-purple-500">Genotype</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Active Admission Section with Full Duration Clock */}
      {activeAdmission && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
        >
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <BedDouble className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Currently Admitted</h2>
                    <p className="text-sm text-gray-600">Admission #{activeAdmission.admissionNumber}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Ward:</span>
                    <p className="font-medium">{activeAdmission.wardName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Bed:</span>
                    <p className="font-medium">{activeAdmission.bedNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Diagnosis:</span>
                    <p className="font-medium truncate">{activeAdmission.admissionDiagnosis}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Severity:</span>
                    <p className={`font-medium capitalize ${
                      activeAdmission.severity === 'critical' ? 'text-red-600' :
                      activeAdmission.severity === 'severe' ? 'text-orange-600' :
                      activeAdmission.severity === 'moderate' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>{activeAdmission.severity}</p>
                  </div>
                </div>
              </div>
              
              <div className="md:w-72">
                <AdmissionDurationClock
                  admissionDate={activeAdmission.admissionDate}
                  estimatedStayDays={activeAdmission.estimatedStayDays}
                  size="md"
                />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-emerald-200 flex flex-wrap gap-3">
              <Link
                to={`/admissions`}
                className="btn btn-secondary text-sm"
              >
                View Admission Details
              </Link>
              {activeAdmission.treatmentPlanId && (
                <Link
                  to={`/treatment-plans/${activeAdmission.treatmentPlanId}`}
                  className="btn btn-primary text-sm"
                >
                  View Treatment Plan
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Allergies & Conditions */}
          {(patient.allergies.length > 0 || patient.chronicConditions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <div className="card-header flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="font-semibold text-gray-900">Medical Alerts</h2>
              </div>
              <div className="card-body space-y-4">
                {patient.allergies.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Allergies</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((allergy, index) => (
                        <span key={index} className="badge badge-danger">
                          {allergy}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {patient.chronicConditions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Chronic Conditions</p>
                    <div className="flex flex-wrap gap-2">
                      {patient.chronicConditions.map((condition, index) => (
                        <span key={index} className="badge badge-warning">
                          {condition}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Recent Vitals */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-emerald-500" />
                <h2 className="font-semibold text-gray-900">Recent Vital Signs</h2>
              </div>
              <Link to={`/patients/${patientId}/vitals`} className="text-sm text-sky-600 hover:text-sky-700">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              {vitals && vitals.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 border-y border-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Temp</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">BP</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pulse</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">SpO2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {vitals.map((vital) => (
                      <tr key={vital.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {format(new Date(vital.recordedAt), 'MMM d, h:mm a')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vital.temperature}°C</td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vital.pulse} bpm</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{vital.oxygenSaturation}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No vital signs recorded yet</p>
                  <Link to={`/patients/${patientId}/vitals`} className="text-sky-600 text-sm hover:underline mt-1 inline-block">
                    Record first vitals
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Recent Encounters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-sky-500" />
                <h2 className="font-semibold text-gray-900">Recent Encounters</h2>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {encounters && encounters.length > 0 ? (
                encounters.map((encounter) => (
                  <div key={encounter.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 capitalize">
                          {encounter.type.replace('_', ' ')} Visit
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {encounter.chiefComplaint}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {format(new Date(encounter.createdAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => generateEncounterPDFFromEntity(encounter, patient)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Export as PDF"
                        >
                          <FileText size={16} />
                        </button>
                        <span className={`badge ${
                          encounter.status === 'completed' ? 'badge-success' :
                          encounter.status === 'in-progress' ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {encounter.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No encounters recorded yet</p>
                  <Link to={`/patients/${patientId}/encounter`} className="text-sky-600 text-sm hover:underline mt-1 inline-block">
                    Start first encounter
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-header flex items-center gap-3">
              <User className="w-5 h-5 text-sky-500" />
              <h2 className="font-semibold text-gray-900">Personal Details</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Address</p>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin size={16} className="text-gray-400 mt-0.5" />
                  <p className="text-sm text-gray-900">
                    {patient.address}, {patient.city}, {patient.state}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Marital Status</p>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{patient.maritalStatus}</p>
                </div>
                {patient.occupation && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Occupation</p>
                    <p className="text-sm text-gray-900 mt-1">{patient.occupation}</p>
                  </div>
                )}
                {patient.religion && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Religion</p>
                    <p className="text-sm text-gray-900 mt-1">{patient.religion}</p>
                  </div>
                )}
                {patient.tribe && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Tribe</p>
                    <p className="text-sm text-gray-900 mt-1">{patient.tribe}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Next of Kin */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="card-header flex items-center gap-3">
              <Heart className="w-5 h-5 text-red-500" />
              <h2 className="font-semibold text-gray-900">Next of Kin</h2>
            </div>
            <div className="card-body space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Name</p>
                <p className="text-sm text-gray-900 mt-1">{patient.nextOfKin.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Relationship</p>
                <p className="text-sm text-gray-900 mt-1">{patient.nextOfKin.relationship}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                <p className="text-sm text-gray-900 mt-1">{patient.nextOfKin.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Address</p>
                <p className="text-sm text-gray-900 mt-1">{patient.nextOfKin.address}</p>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-4"
          >
            <h2 className="font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to={`/surgery/planning/${patientId}`}
                className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Scissors className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Schedule Surgery</span>
              </Link>
              <button
                className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Edit className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Edit Patient</span>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
