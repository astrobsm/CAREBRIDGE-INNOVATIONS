import { differenceInYears, format } from 'date-fns';
import type { Patient, Surgery, Admission } from '../../../types';
import { FileText, User, Droplets, AlertTriangle, Heart, Calendar, MapPin, Phone, BedDouble } from 'lucide-react';

interface ClinicalSummarySlideProps {
  patient: Patient;
  surgeries: Surgery[];
  admissions: Admission[];
}

export default function ClinicalSummarySlide({ patient, surgeries, admissions }: ClinicalSummarySlideProps) {
  const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));
  const currentAdmission = admissions.find(a => a.status === 'active');
  const plannedSurgeries = surgeries.filter(s => s.status === 'scheduled' || s.status === 'ready_for_preanaesthetic_review');

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Patient Identity Banner */}
      <div className="bg-gradient-to-r from-blue-900/50 to-indigo-900/50 rounded-2xl p-8 border border-blue-700/30">
        <div className="flex items-start gap-8">
          {patient.photo ? (
            <img src={patient.photo} alt="Patient" className="w-32 h-32 rounded-xl object-cover border-2 border-blue-400/50" />
          ) : (
            <div className="w-32 h-32 rounded-xl bg-blue-800/50 flex items-center justify-center border-2 border-blue-400/30">
              <User size={48} className="text-blue-300" />
            </div>
          )}
          <div className="flex-1 space-y-3">
            <h2 className="text-4xl font-bold text-white">
              {patient.firstName} {patient.middleName ? `${patient.middleName} ` : ''}{patient.lastName}
            </h2>
            <div className="flex flex-wrap gap-4 text-lg">
              <span className="bg-blue-600/30 px-4 py-1 rounded-full text-blue-200 flex items-center gap-2">
                <FileText size={16} /> {patient.hospitalNumber}
              </span>
              <span className="bg-purple-600/30 px-4 py-1 rounded-full text-purple-200">
                {age} yrs • {patient.gender === 'male' ? 'Male' : 'Female'}
              </span>
              {patient.bloodGroup && (
                <span className="bg-red-600/30 px-4 py-1 rounded-full text-red-200 flex items-center gap-2">
                  <Droplets size={16} /> {patient.bloodGroup} {patient.genotype && `(${patient.genotype})`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-gray-300 text-sm mt-2">
              <span className="flex items-center gap-1"><Calendar size={14} /> DOB: {format(new Date(patient.dateOfBirth), 'PPP')}</span>
              <span className="flex items-center gap-1"><Phone size={14} /> {patient.phone}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {patient.city}, {patient.state}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allergies */}
        <div className="bg-red-900/20 rounded-xl p-6 border border-red-700/30">
          <h3 className="text-xl font-semibold text-red-300 flex items-center gap-2 mb-4">
            <AlertTriangle size={22} /> Allergies
          </h3>
          {patient.allergies && patient.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.allergies.map((allergy, i) => (
                <span key={i} className="bg-red-800/40 text-red-200 px-3 py-1.5 rounded-lg text-sm font-medium">
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-red-300/60 italic">No known allergies (NKA)</p>
          )}
        </div>

        {/* Chronic Conditions */}
        <div className="bg-amber-900/20 rounded-xl p-6 border border-amber-700/30">
          <h3 className="text-xl font-semibold text-amber-300 flex items-center gap-2 mb-4">
            <Heart size={22} /> Chronic Conditions
          </h3>
          {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {patient.chronicConditions.map((condition, i) => (
                <span key={i} className="bg-amber-800/40 text-amber-200 px-3 py-1.5 rounded-lg text-sm font-medium">
                  {condition}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-amber-300/60 italic">None documented</p>
          )}
        </div>

        {/* Current Admission */}
        <div className="bg-green-900/20 rounded-xl p-6 border border-green-700/30">
          <h3 className="text-xl font-semibold text-green-300 flex items-center gap-2 mb-4">
            <BedDouble size={22} /> Current Admission
          </h3>
          {currentAdmission ? (
            <div className="space-y-2 text-green-200">
              <p><span className="font-medium">Ward:</span> {currentAdmission.wardName || 'N/A'}</p>
              <p><span className="font-medium">Bed:</span> {currentAdmission.bedNumber || 'N/A'}</p>
              <p><span className="font-medium">Admitted:</span> {format(new Date(currentAdmission.admissionDate), 'PPP')}</p>
              <p><span className="font-medium">Diagnosis:</span> {currentAdmission.admissionDiagnosis || 'N/A'}</p>
            </div>
          ) : (
            <p className="text-green-300/60 italic">Not currently admitted</p>
          )}
        </div>

        {/* Planned Surgeries */}
        <div className="bg-indigo-900/20 rounded-xl p-6 border border-indigo-700/30">
          <h3 className="text-xl font-semibold text-indigo-300 flex items-center gap-2 mb-4">
            <Calendar size={22} /> Planned Surgeries
          </h3>
          {plannedSurgeries.length > 0 ? (
            <div className="space-y-3">
              {plannedSurgeries.map(surgery => (
                <div key={surgery.id} className="bg-indigo-800/30 p-3 rounded-lg">
                  <p className="font-semibold text-indigo-200">{surgery.procedureName}</p>
                  <p className="text-sm text-indigo-300/80">
                    {format(new Date(surgery.scheduledDate), 'PPP')} • {surgery.type} • {surgery.category}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-indigo-300/60 italic">No planned surgeries</p>
          )}
        </div>
      </div>
    </div>
  );
}
