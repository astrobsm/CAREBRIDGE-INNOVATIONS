import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  AlertTriangle,
  User,
  Stethoscope,
  Download,
  Plus,
  X,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { PatientSelector } from '../../../components/patient';
import { downloadReferralPDF } from '../../../utils/referralPdfGenerator';
import type { Patient } from '../../../types';

const referralSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  subspecialty: z.string().min(1, 'Subspecialty is required'),
  specialistName: z.string().optional(),
  specialistHospital: z.string().optional(),
  urgency: z.enum(['routine', 'urgent', 'emergency']),
  presentingComplaint: z.string().min(10, 'Presenting complaint is required'),
  historyOfPresentingComplaint: z.string().min(10, 'History is required'),
  reasonForReferral: z.string().min(10, 'Reason for referral is required'),
  generalExamination: z.string().optional(),
  systemicExamination: z.string().optional(),
  additionalNotes: z.string().optional(),
});

type ReferralFormData = z.infer<typeof referralSchema>;

const subspecialties = [
  'Vascular Surgery',
  'Cardiothoracic Surgery',
  'Neurosurgery',
  'Orthopedic Surgery',
  'Plastic & Reconstructive Surgery',
  'Urology',
  'ENT Surgery',
  'Oncology',
  'Cardiology',
  'Endocrinology',
  'Nephrology',
  'Gastroenterology',
  'Pulmonology',
  'Infectious Diseases',
  'Rheumatology',
  'Other',
];

export default function ReferralPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [pastMedicalHistory, setPastMedicalHistory] = useState<string[]>([]);
  const [pastSurgicalHistory, setPastSurgicalHistory] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [investigations, setInvestigations] = useState<Array<{ name: string; date: Date; result: string }>>([]);
  const [specificQuestions, setSpecificQuestions] = useState<string[]>([]);
  const [differentialDiagnoses, setDifferentialDiagnoses] = useState<string[]>([]);
  const [treatmentGiven, setTreatmentGiven] = useState<string[]>([]);
  
  const [currentItem, setCurrentItem] = useState('');
  const [currentInvestigation, setCurrentInvestigation] = useState({ name: '', date: '', result: '' });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<ReferralFormData>({
    resolver: zodResolver(referralSchema),
    defaultValues: {
      urgency: 'routine',
    },
  });

  const patientId = watch('patientId');

  // Load patient data when selected
  const loadPatientData = async (id: string) => {
    const patient = await db.patients.get(id);
    if (patient) {
      setSelectedPatient(patient);
      
      // Load patient clinical data
      const surgeries = await db.surgeries.where('patientId').equals(id).toArray();
      const prescriptions = await db.prescriptions.where('patientId').equals(id).toArray();
      
      // Extract medications from prescriptions
      const meds = prescriptions.flatMap(p => p.medications.map(m => `${m.name} ${m.dosage} ${m.frequency}`));
      setMedications([...new Set(meds)]);
      
      // Extract past surgical history
      const surgicalHistory = surgeries.map(s => s.procedureName);
      setPastSurgicalHistory([...new Set(surgicalHistory)]);
    }
  };

  // Watch for patient changes
  useState(() => {
    if (patientId) {
      loadPatientData(patientId);
    }
  });

  const addItem = (type: 'medical' | 'surgical' | 'medication' | 'allergy' | 'question' | 'differential' | 'treatment') => {
    if (!currentItem.trim()) return;
    
    switch (type) {
      case 'medical':
        setPastMedicalHistory([...pastMedicalHistory, currentItem]);
        break;
      case 'surgical':
        setPastSurgicalHistory([...pastSurgicalHistory, currentItem]);
        break;
      case 'medication':
        setMedications([...medications, currentItem]);
        break;
      case 'allergy':
        setAllergies([...allergies, currentItem]);
        break;
      case 'question':
        setSpecificQuestions([...specificQuestions, currentItem]);
        break;
      case 'differential':
        setDifferentialDiagnoses([...differentialDiagnoses, currentItem]);
        break;
      case 'treatment':
        setTreatmentGiven([...treatmentGiven, currentItem]);
        break;
    }
    setCurrentItem('');
  };

  const removeItem = (type: string, index: number) => {
    switch (type) {
      case 'medical':
        setPastMedicalHistory(pastMedicalHistory.filter((_, i) => i !== index));
        break;
      case 'surgical':
        setPastSurgicalHistory(pastSurgicalHistory.filter((_, i) => i !== index));
        break;
      case 'medication':
        setMedications(medications.filter((_, i) => i !== index));
        break;
      case 'allergy':
        setAllergies(allergies.filter((_, i) => i !== index));
        break;
      case 'question':
        setSpecificQuestions(specificQuestions.filter((_, i) => i !== index));
        break;
      case 'differential':
        setDifferentialDiagnoses(differentialDiagnoses.filter((_, i) => i !== index));
        break;
      case 'treatment':
        setTreatmentGiven(treatmentGiven.filter((_, i) => i !== index));
        break;
    }
  };

  const addInvestigation = () => {
    if (!currentInvestigation.name || !currentInvestigation.date || !currentInvestigation.result) {
      toast.error('Please fill all investigation fields');
      return;
    }
    
    setInvestigations([
      ...investigations,
      {
        name: currentInvestigation.name,
        date: new Date(currentInvestigation.date),
        result: currentInvestigation.result,
      },
    ]);
    setCurrentInvestigation({ name: '', date: '', result: '' });
  };

  const onSubmit = async (data: ReferralFormData) => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    try {
      await downloadReferralPDF({
        referringDoctor: `${user.firstName} ${user.lastName}`,
        referringDoctorLicense: user.licenseNumber,
        referringHospital: user.hospitalId || 'AstroHEALTH Innovations',
        referringDepartment: user.role || 'Surgery',
        referralDate: new Date(),
        subspecialty: data.subspecialty,
        specialistName: data.specialistName,
        specialistHospital: data.specialistHospital,
        urgency: data.urgency,
        patient: selectedPatient,
        presentingComplaint: data.presentingComplaint,
        historyOfPresentingComplaint: data.historyOfPresentingComplaint,
        pastMedicalHistory,
        pastSurgicalHistory,
        medications,
        allergies,
        generalExamination: data.generalExamination,
        systemicExamination: data.systemicExamination,
        investigations,
        workingDiagnosis: data.reasonForReferral.split('\n')[0], // First line as diagnosis
        differentialDiagnoses,
        reasonForReferral: data.reasonForReferral,
        specificQuestions,
        treatmentGiven,
        additionalNotes: data.additionalNotes,
        referringDoctorPhone: user.phone,
        referringDoctorEmail: user.email,
      });

      toast.success('Referral letter generated successfully');
      
      // Reset form
      setPastMedicalHistory([]);
      setPastSurgicalHistory([]);
      setMedications([]);
      setAllergies([]);
      setInvestigations([]);
      setSpecificQuestions([]);
      setDifferentialDiagnoses([]);
      setTreatmentGiven([]);
      setSelectedPatient(null);
    } catch (error) {
      console.error('Error generating referral:', error);
      toast.error('Failed to generate referral letter');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Send className="w-7 h-7 text-blue-500" />
            Subspecialty Referral
          </h1>
          <p className="page-subtitle">
            Generate professional referral letters to specialists
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Patient & Referral Details
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label">Select Patient *</label>
                <button
                  type="button"
                  onClick={() => navigate('/patients/new', { state: { returnTo: '/referrals' } })}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <UserPlus size={16} />
                  New Patient
                </button>
              </div>
              <PatientSelector
                value={patientId}
                onChange={(id) => {
                  setValue('patientId', id || '');
                  if (id) loadPatientData(id);
                }}
                label=""
                required
                error={errors.patientId?.message}
              />
            </div>

            <div>
              <label className="label">Subspecialty *</label>
              <select {...register('subspecialty')} className="input">
                <option value="">Select subspecialty...</option>
                {subspecialties.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
              {errors.subspecialty && <p className="error-message">{errors.subspecialty.message}</p>}
            </div>

            <div>
              <label className="label">Specialist Name (Optional)</label>
              <input {...register('specialistName')} className="input" placeholder="Dr. Jane Smith" />
            </div>

            <div>
              <label className="label">Specialist Hospital (Optional)</label>
              <input {...register('specialistHospital')} className="input" placeholder="National Hospital" />
            </div>

            <div>
              <label className="label">Urgency *</label>
              <select {...register('urgency')} className="input">
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Clinical Presentation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-green-500" />
            Clinical Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">Presenting Complaint *</label>
              <textarea
                {...register('presentingComplaint')}
                className="input min-h-[80px]"
                placeholder="Chronic leg ulcer, not healing despite conservative management..."
              />
              {errors.presentingComplaint && <p className="error-message">{errors.presentingComplaint.message}</p>}
            </div>

            <div>
              <label className="label">History of Presenting Complaint *</label>
              <textarea
                {...register('historyOfPresentingComplaint')}
                className="input min-h-[120px]"
                placeholder="Patient presents with 6-month history of non-healing ulcer on right leg..."
              />
              {errors.historyOfPresentingComplaint && <p className="error-message">{errors.historyOfPresentingComplaint.message}</p>}
            </div>

            {/* Past Medical History */}
            <div>
              <label className="label">Past Medical History</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={currentItem}
                  onChange={(e) => setCurrentItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('medical'))}
                  className="input flex-1"
                  placeholder="e.g., Diabetes mellitus, Hypertension..."
                />
                <button type="button" onClick={() => addItem('medical')} className="btn btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pastMedicalHistory.map((item, idx) => (
                  <span key={idx} className="badge badge-primary flex items-center gap-2">
                    {item}
                    <X size={14} className="cursor-pointer" onClick={() => removeItem('medical', idx)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Past Surgical History */}
            <div>
              <label className="label">Past Surgical History</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={currentItem}
                  onChange={(e) => setCurrentItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('surgical'))}
                  className="input flex-1"
                  placeholder="e.g., Appendectomy 2020..."
                />
                <button type="button" onClick={() => addItem('surgical')} className="btn btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {pastSurgicalHistory.map((item, idx) => (
                  <span key={idx} className="badge badge-info flex items-center gap-2">
                    {item}
                    <X size={14} className="cursor-pointer" onClick={() => removeItem('surgical', idx)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Current Medications */}
            <div>
              <label className="label">Current Medications</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={currentItem}
                  onChange={(e) => setCurrentItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('medication'))}
                  className="input flex-1"
                  placeholder="e.g., Metformin 1g BD, Amlodipine 5mg OD..."
                />
                <button type="button" onClick={() => addItem('medication')} className="btn btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {medications.map((item, idx) => (
                  <span key={idx} className="badge badge-secondary flex items-center gap-2">
                    {item}
                    <X size={14} className="cursor-pointer" onClick={() => removeItem('medication', idx)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="label">Allergies</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={currentItem}
                  onChange={(e) => setCurrentItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('allergy'))}
                  className="input flex-1"
                  placeholder="e.g., Penicillin, Sulfa drugs..."
                />
                <button type="button" onClick={() => addItem('allergy')} className="btn btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allergies.map((item, idx) => (
                  <span key={idx} className="badge badge-danger flex items-center gap-2">
                    {item}
                    <X size={14} className="cursor-pointer" onClick={() => removeItem('allergy', idx)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Examination Findings */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label">General Examination</label>
                <textarea
                  {...register('generalExamination')}
                  className="input min-h-[100px]"
                  placeholder="Patient alert, oriented, vitals stable..."
                />
              </div>

              <div>
                <label className="label">Systemic Examination</label>
                <textarea
                  {...register('systemicExamination')}
                  className="input min-h-[100px]"
                  placeholder="CVS: Normal heart sounds, no murmurs. RS: Clear breath sounds..."
                />
              </div>
            </div>

            {/* Investigations */}
            <div>
              <label className="label">Investigations</label>
              <div className="grid md:grid-cols-12 gap-2 mb-2">
                <input
                  value={currentInvestigation.name}
                  onChange={(e) => setCurrentInvestigation({ ...currentInvestigation, name: e.target.value })}
                  className="input col-span-4"
                  placeholder="Investigation name"
                />
                <input
                  type="date"
                  value={currentInvestigation.date}
                  onChange={(e) => setCurrentInvestigation({ ...currentInvestigation, date: e.target.value })}
                  className="input col-span-3"
                />
                <input
                  value={currentInvestigation.result}
                  onChange={(e) => setCurrentInvestigation({ ...currentInvestigation, result: e.target.value })}
                  className="input col-span-4"
                  placeholder="Result"
                />
                <button type="button" onClick={addInvestigation} className="btn btn-secondary col-span-1">
                  <Plus size={18} />
                </button>
              </div>
              <div className="space-y-2">
                {investigations.map((inv, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span><strong>{inv.name}</strong> ({format(inv.date, 'dd/MM/yyyy')}): {inv.result}</span>
                    <X size={16} className="cursor-pointer text-red-500" onClick={() => setInvestigations(investigations.filter((_, i) => i !== idx))} />
                  </div>
                ))}
              </div>
            </div>

            {/* Differential Diagnoses */}
            <div>
              <label className="label">Differential Diagnoses</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={currentItem}
                  onChange={(e) => setCurrentItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('differential'))}
                  className="input flex-1"
                  placeholder="Possible diagnoses..."
                />
                <button type="button" onClick={() => addItem('differential')} className="btn btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {differentialDiagnoses.map((item, idx) => (
                  <span key={idx} className="badge badge-warning flex items-center gap-2">
                    {item}
                    <X size={14} className="cursor-pointer" onClick={() => removeItem('differential', idx)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Treatment Given */}
            <div>
              <label className="label">Management So Far</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={currentItem}
                  onChange={(e) => setCurrentItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('treatment'))}
                  className="input flex-1"
                  placeholder="Treatments provided..."
                />
                <button type="button" onClick={() => addItem('treatment')} className="btn btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {treatmentGiven.map((item, idx) => (
                  <span key={idx} className="badge badge-success flex items-center gap-2">
                    {item}
                    <X size={14} className="cursor-pointer" onClick={() => removeItem('treatment', idx)} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Referral Reason */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Reason for Referral
          </h2>

          <div className="space-y-4">
            <div>
              <label className="label">Reason for Referral *</label>
              <textarea
                {...register('reasonForReferral')}
                className="input min-h-[120px]"
                placeholder="For consideration of vascular reconstruction and limb salvage assessment..."
              />
              {errors.reasonForReferral && <p className="error-message">{errors.reasonForReferral.message}</p>}
            </div>

            {/* Specific Questions */}
            <div>
              <label className="label">Specific Questions for Specialist</label>
              <div className="flex gap-2 mb-2">
                <input
                  value={currentItem}
                  onChange={(e) => setCurrentItem(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('question'))}
                  className="input flex-1"
                  placeholder="Questions for the specialist..."
                />
                <button type="button" onClick={() => addItem('question')} className="btn btn-secondary">
                  <Plus size={18} />
                </button>
              </div>
              <div className="space-y-2">
                {specificQuestions.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span>{idx + 1}. {item}</span>
                    <X size={16} className="cursor-pointer text-red-500" onClick={() => removeItem('question', idx)} />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Additional Notes</label>
              <textarea
                {...register('additionalNotes')}
                className="input min-h-[80px]"
                placeholder="Any additional information..."
              />
            </div>
          </div>
        </motion.div>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button type="submit" className="btn btn-primary">
            <Download size={18} />
            Generate Referral Letter
          </button>
        </div>
      </form>
    </div>
  );
}
