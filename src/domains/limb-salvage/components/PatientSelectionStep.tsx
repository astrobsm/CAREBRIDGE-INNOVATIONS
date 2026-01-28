// Step 1: Patient Selection and Demographics
import { useLiveQuery } from 'dexie-react-hooks';
import { User, Search, Calendar } from 'lucide-react';
import { useState } from 'react';
import { db } from '../../../database';
import type { Patient } from '../../../types';

interface PatientSelectionStepProps {
  selectedPatientId: string;
  patientAge: number;
  patientGender: 'male' | 'female';
  affectedSide: 'left' | 'right' | 'bilateral';
  onUpdate: (data: {
    patientId?: string;
    patientAge?: number;
    patientGender?: 'male' | 'female';
    affectedSide?: 'left' | 'right' | 'bilateral';
  }) => void;
}

export default function PatientSelectionStep({
  selectedPatientId,
  patientAge,
  patientGender,
  affectedSide,
  onUpdate,
}: PatientSelectionStepProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch patients
  const patients = useLiveQuery(
    () => db.patients.filter(p => p.isActive === true).toArray(),
    []
  );

  // Filter patients by search
  const filteredPatients = patients?.filter(p => {
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
    const hospitalNumber = (p.hospitalNumber || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search) || hospitalNumber.includes(search);
  });

  // Calculate age from DOB
  const calculateAge = (dob: Date): number => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Handle patient selection
  const handlePatientSelect = (patient: Patient) => {
    const age = calculateAge(patient.dateOfBirth);
    onUpdate({
      patientId: patient.id,
      patientAge: age,
      patientGender: patient.gender as 'male' | 'female',
    });
  };

  const selectedPatient = patients?.find(p => p.id === selectedPatientId);

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Step 1: Patient Selection</h3>
        <p className="text-sm text-gray-600">Select a patient and confirm demographics</p>
      </div>

      {/* Patient Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or hospital number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Patient List */}
      {!selectedPatientId && (
        <div className="border rounded-lg max-h-60 overflow-y-auto">
          {filteredPatients?.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No patients found</div>
          ) : (
            filteredPatients?.slice(0, 10).map((patient) => (
              <button
                key={patient.id}
                onClick={() => handlePatientSelect(patient)}
                className="w-full p-3 flex items-center gap-3 hover:bg-blue-50 border-b last:border-b-0 text-left"
              >
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                  <p className="text-sm text-gray-500">
                    {patient.hospitalNumber} • {patient.gender} • {calculateAge(patient.dateOfBirth)} years
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected Patient Card */}
      {selectedPatient && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-200 flex items-center justify-center">
                <User className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </p>
                <p className="text-sm text-blue-700">
                  {selectedPatient.hospitalNumber}
                </p>
              </div>
            </div>
            <button
              onClick={() => onUpdate({ patientId: '' })}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* Demographics Confirmation */}
      {selectedPatientId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Age (years)
            </label>
            <input
              type="number"
              value={patientAge}
              onChange={(e) => onUpdate({ patientAge: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              min="0"
              max="120"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gender
            </label>
            <select
              value={patientGender}
              onChange={(e) => onUpdate({ patientGender: e.target.value as 'male' | 'female' })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>

          {/* Affected Side */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Affected Limb
            </label>
            <select
              value={affectedSide}
              onChange={(e) => onUpdate({ affectedSide: e.target.value as 'left' | 'right' | 'bilateral' })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="left">Left Foot</option>
              <option value="right">Right Foot</option>
              <option value="bilateral">Bilateral</option>
            </select>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
        <div className="flex items-start gap-2">
          <Calendar className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium">Assessment Information</p>
            <p>Age and gender are important scoring factors. Age ≥70 years and male gender are associated with higher risk.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
