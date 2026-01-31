import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Save, User, Phone, MapPin, Heart, AlertCircle, Building2, Home,
  Activity, ShieldAlert, Stethoscope, ChevronDown, ChevronUp, Info, Baby, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { HospitalSelector } from '../../../components/hospital';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { 
  categorizePatient, 
  categorizePregnancy,
  type PatientCategory,
  type PregnancyStatus
} from '../../../services/patientCategoryService';
import { PatientCategoryBadge } from '../../../components/common/DynamicFormComponents';
import { differenceInYears } from 'date-fns';
import type { Patient, BloodGroup, Genotype, Hospital, DVTRiskAssessment, PressureSoreRiskAssessment, Comorbidity } from '../../../types';

// Hospital options will be fetched from database

// DVT Risk Factors (Caprini Score)
const dvtRiskFactors = [
  { id: 'age_41_60', label: 'Age 41-60 years', points: 1 },
  { id: 'age_61_74', label: 'Age 61-74 years', points: 2 },
  { id: 'age_75_plus', label: 'Age ≥75 years', points: 3 },
  { id: 'minor_surgery', label: 'Minor surgery planned', points: 1 },
  { id: 'major_surgery', label: 'Major surgery (>45 min)', points: 2 },
  { id: 'laparoscopic_surgery', label: 'Laparoscopic surgery (>45 min)', points: 2 },
  { id: 'malignancy', label: 'Malignancy (present or previous)', points: 2 },
  { id: 'bed_rest', label: 'Confined to bed (>72 hours)', points: 2 },
  { id: 'immobilizing_cast', label: 'Immobilizing plaster cast', points: 2 },
  { id: 'central_venous_access', label: 'Central venous access', points: 2 },
  { id: 'obesity', label: 'Obesity (BMI >25)', points: 1 },
  { id: 'varicose_veins', label: 'Varicose veins', points: 1 },
  { id: 'pregnancy', label: 'Pregnancy or postpartum', points: 1 },
  { id: 'oral_contraceptives', label: 'Oral contraceptives/HRT', points: 1 },
  { id: 'sepsis', label: 'Sepsis (within 1 month)', points: 1 },
  { id: 'pneumonia', label: 'Serious lung disease/Pneumonia', points: 1 },
  { id: 'copd', label: 'COPD', points: 1 },
  { id: 'mi', label: 'Acute MI', points: 1 },
  { id: 'chf', label: 'Congestive heart failure', points: 1 },
  { id: 'inflammatory_bowel', label: 'Inflammatory bowel disease', points: 1 },
  { id: 'swollen_legs', label: 'Swollen legs (current)', points: 1 },
  { id: 'previous_dvt', label: 'History of DVT/PE', points: 3 },
  { id: 'family_dvt', label: 'Family history of DVT/PE', points: 3 },
  { id: 'factor_v_leiden', label: 'Factor V Leiden', points: 3 },
  { id: 'prothrombin_mutation', label: 'Prothrombin 20210A', points: 3 },
  { id: 'lupus_anticoagulant', label: 'Lupus anticoagulant', points: 3 },
  { id: 'anticardiolipin', label: 'Anticardiolipin antibodies', points: 3 },
  { id: 'homocysteine', label: 'Elevated serum homocysteine', points: 3 },
  { id: 'heparin_thrombocytopenia', label: 'Heparin-induced thrombocytopenia', points: 3 },
  { id: 'stroke', label: 'Stroke (<1 month)', points: 5 },
  { id: 'multiple_trauma', label: 'Multiple trauma (<1 month)', points: 5 },
  { id: 'hip_knee_replacement', label: 'Hip/knee arthroplasty', points: 5 },
  { id: 'hip_pelvis_fracture', label: 'Hip, pelvis, or leg fracture', points: 5 },
  { id: 'spinal_cord_injury', label: 'Spinal cord injury (<1 month)', points: 5 },
];

// Common comorbidities
const commonComorbidities = [
  'Hypertension',
  'Diabetes Mellitus Type 1',
  'Diabetes Mellitus Type 2',
  'Coronary Artery Disease',
  'Heart Failure',
  'Atrial Fibrillation',
  'Chronic Kidney Disease',
  'COPD',
  'Asthma',
  'Stroke/CVA',
  'Peripheral Vascular Disease',
  'Hypothyroidism',
  'Hyperthyroidism',
  'Epilepsy',
  'Depression',
  'Anxiety',
  'Rheumatoid Arthritis',
  'Osteoarthritis',
  'Osteoporosis',
  'Cancer (specify)',
  'HIV/AIDS',
  'Hepatitis B',
  'Hepatitis C',
  'Sickle Cell Disease',
  'Peptic Ulcer Disease',
  'GERD',
  'Liver Cirrhosis',
  'Chronic Liver Disease',
  'Dementia',
  'Parkinson\'s Disease',
];

const patientSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  middleName: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female']),
  bloodGroup: z.string().optional(),
  genotype: z.string().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(), // Made optional
  city: z.string().optional(), // Made optional
  state: z.string().optional(), // Made optional
  occupation: z.string().optional(),
  religion: z.string().optional(),
  tribe: z.string().optional(),
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  nextOfKinName: z.string().optional(), // Made optional
  nextOfKinRelationship: z.string().optional(), // Made optional
  nextOfKinPhone: z.string().optional(), // Made optional
  nextOfKinAddress: z.string().optional(), // Made optional
  // Care type and hospital fields
  careType: z.enum(['home_care', 'hospital']),
  hospitalId: z.string().optional(),
  otherHospitalName: z.string().optional(),
  ward: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientSchema>;

const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const genotypes: Genotype[] = ['AA', 'AS', 'SS', 'AC', 'SC'];
const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default function NewPatientPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_loadingHospitals, setLoadingHospitals] = useState(true);
  
  // DVT Risk Assessment State
  const [selectedDvtFactors, setSelectedDvtFactors] = useState<string[]>([]);
  const [dvtExpanded, setDvtExpanded] = useState(true);
  
  // Pressure Sore Risk Assessment State (Braden Scale)
  const [bradenScores, setBradenScores] = useState({
    sensoryPerception: 0,
    moisture: 0,
    activity: 0,
    mobility: 0,
    nutrition: 0,
    frictionShear: 0,
  });
  const [pressureSoreExpanded, setPressureSoreExpanded] = useState(true);
  
  // Comorbidities State
  const [selectedComorbidities, setSelectedComorbidities] = useState<string[]>([]);
  const [customComorbidity, setCustomComorbidity] = useState('');
  const [comorbiditiesExpanded, setComorbiditiesExpanded] = useState(true);

  // Pregnancy State (for females of childbearing age)
  const [isPregnant, setIsPregnant] = useState(false);
  const [trimester, setTrimester] = useState<1 | 2 | 3>(1);
  const [gestationalWeeks, setGestationalWeeks] = useState<number>(0);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
  const [gravida, setGravida] = useState<number>(1);
  const [para, setPara] = useState<number>(0);

  // Fetch hospitals from database
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const hospitalList = await db.hospitals.filter(h => h.isActive === true).toArray();
        setHospitals(hospitalList);
      } catch (error) {
        console.error('Error fetching hospitals:', error);
        toast.error('Failed to load hospitals');
      } finally {
        setLoadingHospitals(false);
      }
    };
    fetchHospitals();
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      maritalStatus: 'single',
      gender: 'male',
      careType: 'hospital',
    },
  });

  const careType = watch('careType');
  const hospitalId = watch('hospitalId');
  const dateOfBirth = watch('dateOfBirth');
  const gender = watch('gender');

  // Calculate patient category based on date of birth
  const patientCategory = useMemo((): PatientCategory | null => {
    if (!dateOfBirth) return null;
    return categorizePatient(dateOfBirth);
  }, [dateOfBirth]);

  // Calculate pregnancy status for eligible females
  const pregnancyStatus = useMemo((): PregnancyStatus | null => {
    if (!isPregnant || gender !== 'female') return null;
    // Pass expected delivery date to calculate gestational age, or use gestational weeks directly
    return categorizePregnancy(isPregnant, expectedDeliveryDate || undefined, gestationalWeeks || undefined);
  }, [isPregnant, gender, gestationalWeeks, expectedDeliveryDate]);

  // Check if patient is a female of childbearing age
  const isChildbearingAge = useMemo(() => {
    if (gender !== 'female' || !dateOfBirth) return false;
    const age = differenceInYears(new Date(), new Date(dateOfBirth));
    return age >= 12 && age <= 50;
  }, [gender, dateOfBirth]);

  // Dynamic field visibility based on patient category
  const showPediatricFields = patientCategory?.isPediatric || false;
  const showGeriatricFields = patientCategory?.isGeriatric || false;
  const showPregnancyFields = isChildbearingAge;
  
  // DVT Risk assessment should be hidden for pediatric patients under 14
  const showDvtAssessment = !patientCategory?.isPediatric || 
    (patientCategory?.ageInYears && patientCategory.ageInYears >= 14);

  const generateHospitalNumber = (): string => {
    const prefix = 'CB';
    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${prefix}${year}${random}`;
  };

  // Calculate DVT Risk Score (Caprini)
  const calculateDvtRisk = (): DVTRiskAssessment => {
    let score = 0;
    const riskFactorLabels: string[] = [];
    
    selectedDvtFactors.forEach(factorId => {
      const factor = dvtRiskFactors.find(f => f.id === factorId);
      if (factor) {
        score += factor.points;
        riskFactorLabels.push(factor.label);
      }
    });

    let riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
    let prophylaxisRecommended: string;

    if (score === 0) {
      riskLevel = 'low';
      prophylaxisRecommended = 'Early ambulation only';
    } else if (score <= 2) {
      riskLevel = 'low';
      prophylaxisRecommended = 'Early ambulation, consider compression stockings';
    } else if (score <= 4) {
      riskLevel = 'moderate';
      prophylaxisRecommended = 'Pharmacological prophylaxis (LMWH/UFH) + mechanical prophylaxis';
    } else if (score <= 8) {
      riskLevel = 'high';
      prophylaxisRecommended = 'Pharmacological prophylaxis (LMWH/UFH) + mechanical prophylaxis + extended prophylaxis';
    } else {
      riskLevel = 'very_high';
      prophylaxisRecommended = 'Aggressive pharmacological + mechanical prophylaxis, consider IVC filter if anticoagulation contraindicated';
    }

    return {
      score,
      riskLevel,
      riskFactors: riskFactorLabels,
      prophylaxisRecommended,
      assessedBy: user?.id || 'system',
      assessedAt: new Date(),
    };
  };

  // Calculate Pressure Sore Risk Score (Braden Scale)
  const calculatePressureSoreRisk = (): PressureSoreRiskAssessment => {
    const total = Object.values(bradenScores).reduce((sum, score) => sum + score, 0);
    
    let riskLevel: 'no_risk' | 'mild_risk' | 'moderate_risk' | 'high_risk' | 'very_high_risk';
    let interventionsRequired: string[] = [];

    if (total >= 19) {
      riskLevel = 'no_risk';
      interventionsRequired = ['Standard care', 'Regular repositioning'];
    } else if (total >= 15) {
      riskLevel = 'mild_risk';
      interventionsRequired = ['Regular skin assessment', 'Pressure-relieving mattress', 'Repositioning every 4 hours'];
    } else if (total >= 13) {
      riskLevel = 'moderate_risk';
      interventionsRequired = ['Pressure-relieving mattress', 'Repositioning every 2-3 hours', 'Heel protection', 'Nutritional support'];
    } else if (total >= 10) {
      riskLevel = 'high_risk';
      interventionsRequired = ['Specialty pressure-relieving surface', 'Repositioning every 2 hours', 'Heel protection', 'Nutritional consultation', 'Moisture management'];
    } else {
      riskLevel = 'very_high_risk';
      interventionsRequired = ['Air-fluidized or low-air-loss bed', 'Repositioning every 1-2 hours', 'Full nutritional assessment', 'Wound care nurse consultation', 'Consider specialty dressings'];
    }

    return {
      score: total,
      riskLevel,
      sensoryPerception: bradenScores.sensoryPerception,
      moisture: bradenScores.moisture,
      activity: bradenScores.activity,
      mobility: bradenScores.mobility,
      nutrition: bradenScores.nutrition,
      frictionShear: bradenScores.frictionShear,
      interventionsRequired,
      assessedBy: user?.id || 'system',
      assessedAt: new Date(),
    };
  };

  // Validate risk assessments before submit - now optional
  const validateRiskAssessments = (): boolean => {
    // Risk assessments are now optional, no validation required
    return true;
  };

  const onSubmit = async (data: PatientFormData) => {
    // Validate risk assessments
    if (!validateRiskAssessments()) {
      return;
    }

    setIsLoading(true);
    try {
      // Determine the hospital name
      let hospitalName: string | undefined;
      if (data.careType === 'hospital') {
        if (data.hospitalId === 'others') {
          hospitalName = data.otherHospitalName;
        } else {
          const selectedHospital = hospitals.find((h: Hospital) => h.id === data.hospitalId);
          hospitalName = selectedHospital?.name;
        }
      }

      // Calculate risk assessments
      const dvtRiskAssessment = calculateDvtRisk();
      const pressureSoreRiskAssessment = calculatePressureSoreRisk();

      // Build comorbidities array
      const comorbidities: Comorbidity[] = selectedComorbidities.map(condition => ({
        condition,
        currentlyManaged: true,
      }));

      const patient: Patient = {
        id: uuidv4(),
        hospitalNumber: generateHospitalNumber(),
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
        bloodGroup: data.bloodGroup as BloodGroup | undefined,
        genotype: data.genotype as Genotype | undefined,
        maritalStatus: data.maritalStatus,
        phone: data.phone,
        alternatePhone: data.alternatePhone,
        email: data.email || undefined,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        occupation: data.occupation,
        religion: data.religion,
        tribe: data.tribe,
        allergies: data.allergies ? data.allergies.split(',').map(a => a.trim()) : [],
        chronicConditions: data.chronicConditions ? data.chronicConditions.split(',').map(c => c.trim()) : [],
        nextOfKin: {
          name: data.nextOfKinName || '',
          relationship: data.nextOfKinRelationship || '',
          phone: data.nextOfKinPhone || '',
          address: data.nextOfKinAddress || '',
        },
        // Risk Assessments
        dvtRiskAssessment,
        pressureSoreRiskAssessment,
        comorbidities,
        // Care Setting fields
        careType: data.careType as 'hospital' | 'homecare',
        hospitalId: data.careType === 'hospital' ? data.hospitalId : undefined,
        hospitalName: hospitalName,
        ward: data.careType === 'hospital' ? data.ward : undefined,
        registeredHospitalId: user?.hospitalId || 'hospital-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to local database first
      try {
        await db.patients.add(patient);
        console.log('[Patient Registration] Patient saved to local database:', patient.id);
      } catch (dbError) {
        console.error('[Patient Registration] Database error:', dbError);
        throw new Error('Failed to save patient to local database');
      }
      
      // Try to sync to cloud (non-blocking - will sync later if offline)
      try {
        if (navigator.onLine) {
          await syncRecord('patients', patient as unknown as Record<string, unknown>);
          console.log('[Patient Registration] Patient synced to cloud');
        } else {
          console.log('[Patient Registration] Offline - will sync when online');
        }
      } catch (syncError) {
        // Don't fail registration if cloud sync fails - it will sync later
        console.warn('[Patient Registration] Cloud sync failed (will retry later):', syncError);
      }
      
      const syncMessage = navigator.onLine ? 'registered and synced' : 'registered (will sync when online)';
      toast.success(`Patient ${syncMessage} successfully!`);
      navigate(`/patients/${patient.id}`);
    } catch (error) {
      console.error('[Patient Registration] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register patient';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 min-h-touch"
        >
          <ArrowLeft size={18} />
          Back to Patients
        </button>
        <h1 className="page-title">Register New Patient</h1>
        <p className="page-subtitle">
          Enter the patient's information to create a new medical record
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card card-compact"
        >
          <div className="card-header flex items-center gap-3">
            <User className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Personal Information</h2>
          </div>
          <div className="card-body form-grid-2">
            <div>
              <label className="label">First Name *</label>
              <input {...register('firstName')} className={`input ${errors.firstName ? 'input-error' : ''}`} />
              {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input {...register('lastName')} className={`input ${errors.lastName ? 'input-error' : ''}`} />
              {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="label">Middle Name</label>
              <input {...register('middleName')} className="input" />
            </div>
            <div>
              <label className="label">Date of Birth *</label>
              <input type="date" {...register('dateOfBirth')} className={`input ${errors.dateOfBirth ? 'input-error' : ''}`} />
              {errors.dateOfBirth && <p className="text-sm text-red-500 mt-1">{errors.dateOfBirth.message}</p>}
              {/* Show patient category badge when DOB is entered */}
              {patientCategory && (
                <div className="mt-2">
                  <PatientCategoryBadge 
                    category={patientCategory} 
                    pregnancy={pregnancyStatus}
                    showDetails 
                  />
                </div>
              )}
            </div>
            <div>
              <label className="label">Gender *</label>
              <select {...register('gender')} className="input" title="Select gender">
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="label">Marital Status *</label>
              <select {...register('maritalStatus')} className="input" title="Select marital status">
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div>
              <label className="label">Blood Group</label>
              <select {...register('bloodGroup')} className="input" title="Select blood group">
                <option value="">Select blood group</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Genotype</label>
              <select {...register('genotype')} className="input" title="Select genotype">
                <option value="">Select genotype</option>
                {genotypes.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Occupation</label>
              <input {...register('occupation')} className="input" />
            </div>
            <div>
              <label className="label">Religion</label>
              <input {...register('religion')} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Tribe/Ethnicity</label>
              <input {...register('tribe')} className="input" />
            </div>
          </div>
        </motion.div>

        {/* Care Setting */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card card-compact"
        >
          <div className="card-header flex items-center gap-3">
            <Building2 className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Care Setting</h2>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="label">Care Type *</label>
              <div className="flex flex-col xs:flex-row gap-4 xs:gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer min-h-touch">
                  <input
                    type="radio"
                    {...register('careType')}
                    value="hospital"
                    className="w-5 h-5 text-sky-600 border-gray-300 focus:ring-sky-500"
                  />
                  <Building2 className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">Hospital Care</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer min-h-touch">
                  <input
                    type="radio"
                    {...register('careType')}
                    value="homecare"
                    className="w-5 h-5 text-sky-600 border-gray-300 focus:ring-sky-500"
                  />
                  <Home className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">Home Care</span>
                </label>
              </div>
            </div>

            {careType === 'hospital' && (
              <div className="form-grid-2">
                <div>
                  <Controller
                    name="hospitalId"
                    control={control}
                    render={({ field }) => (
                      <HospitalSelector
                        label="Hospital *"
                        value={field.value}
                        onChange={(id) => field.onChange(id)}
                        placeholder="Search or select hospital"
                        required
                        showAddNew
                        error={errors.hospitalId?.message}
                      />
                    )}
                  />
                </div>

                {hospitalId === 'others' && (
                  <div>
                    <label className="label">Specify Hospital Name *</label>
                    <input
                      {...register('otherHospitalName')}
                      className={`input ${errors.otherHospitalName ? 'input-error' : ''}`}
                      placeholder="Enter hospital name"
                    />
                    {errors.otherHospitalName && <p className="text-sm text-red-500 mt-1">{errors.otherHospitalName.message}</p>}
                  </div>
                )}

                <div>
                  <label className="label">Ward/Unit</label>
                  <input
                    {...register('ward')}
                    className="input"
                    placeholder="e.g., Surgical Ward, ICU, Private Ward"
                  />
                </div>
              </div>
            )}

            {careType === 'home_care' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <Home className="w-5 h-5" />
                  <p className="font-medium">Home Care Selected</p>
                </div>
                <p className="text-sm text-green-600 mt-1">
                  Patient will receive care at their registered address. A home care team will be assigned.
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Contact Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card card-compact"
        >
          <div className="card-header flex items-center gap-3">
            <Phone className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Contact Information</h2>
          </div>
          <div className="card-body form-grid-2">
            <div>
              <label className="label">Phone Number *</label>
              <input {...register('phone')} type="tel" className={`input ${errors.phone ? 'input-error' : ''}`} placeholder="+234 800 123 4567" />
              {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
            <div>
              <label className="label">Alternate Phone</label>
              <input {...register('alternatePhone')} type="tel" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email Address</label>
              <input {...register('email')} type="email" className="input" placeholder="patient@example.com" />
            </div>
          </div>
        </motion.div>

        {/* Address */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card card-compact"
        >
          <div className="card-header flex items-center gap-3">
            <MapPin className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Address</h2>
            <span className="text-xs text-gray-500">(Optional)</span>
          </div>
          <div className="card-body form-grid-2">
            <div className="sm:col-span-2">
              <label className="label">Street Address</label>
              <input {...register('address')} className="input" />
            </div>
            <div>
              <label className="label">City</label>
              <input {...register('city')} className="input" />
            </div>
            <div>
              <label className="label">State</label>
              <select {...register('state')} className="input">
                <option value="">Select state</option>
                {nigerianStates.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Medical Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card card-compact"
        >
          <div className="card-header flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Medical Information</h2>
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="label">Known Allergies</label>
              <input {...register('allergies')} className="input" placeholder="Separate multiple allergies with commas" />
              <p className="text-xs text-gray-500 mt-1">e.g., Penicillin, Peanuts, Latex</p>
            </div>
            <div>
              <label className="label">Chronic Conditions</label>
              <input {...register('chronicConditions')} className="input" placeholder="Separate multiple conditions with commas" />
              <p className="text-xs text-gray-500 mt-1">e.g., Diabetes, Hypertension, Asthma</p>
            </div>
          </div>
        </motion.div>

        {/* Pregnancy Information - For females of childbearing age */}
        {showPregnancyFields && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="card card-compact border-l-4 border-l-pink-500"
          >
            <div className="card-header flex items-center gap-3">
              <Heart className="w-5 h-5 text-pink-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Pregnancy Information</h2>
                <p className="text-xs text-gray-500">For females of childbearing age - important for medication safety</p>
              </div>
            </div>
            <div className="card-body space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isPregnant"
                  checked={isPregnant}
                  onChange={(e) => setIsPregnant(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                />
                <label htmlFor="isPregnant" className="text-sm font-medium text-gray-900">
                  Patient is currently pregnant
                </label>
              </div>
              
              {isPregnant && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 p-4 bg-pink-50 rounded-lg">
                  <div>
                    <label className="label" htmlFor="trimester">Trimester *</label>
                    <select 
                      id="trimester"
                      value={trimester}
                      onChange={(e) => setTrimester(Number(e.target.value) as 1 | 2 | 3)}
                      className="input"
                      title="Select pregnancy trimester"
                    >
                      <option value={1}>First Trimester (1-12 weeks)</option>
                      <option value={2}>Second Trimester (13-26 weeks)</option>
                      <option value={3}>Third Trimester (27-40 weeks)</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Gestational Age (weeks)</label>
                    <input
                      type="number"
                      value={gestationalWeeks || ''}
                      onChange={(e) => setGestationalWeeks(Number(e.target.value))}
                      min={0}
                      max={42}
                      className="input"
                      placeholder="Weeks of pregnancy"
                    />
                  </div>
                  <div>
                    <label className="label">Expected Delivery Date</label>
                    <input
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Gravida (G)</label>
                      <input
                        type="number"
                        value={gravida}
                        onChange={(e) => setGravida(Number(e.target.value))}
                        min={1}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Para (P)</label>
                      <input
                        type="number"
                        value={para}
                        onChange={(e) => setPara(Number(e.target.value))}
                        min={0}
                        className="input"
                      />
                    </div>
                  </div>
                  
                  {/* Pregnancy-specific alerts */}
                  <div className="sm:col-span-2">
                    <div className="flex items-start gap-2 p-3 bg-amber-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <p className="font-medium">Pregnancy Considerations:</p>
                        <ul className="list-disc ml-4 mt-1 space-y-1">
                          <li>Medication dosing will be adjusted for pregnancy safety (FDA categories)</li>
                          <li>Certain investigations may be contraindicated or require modifications</li>
                          <li>Vital signs interpretation uses pregnancy-specific reference ranges</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Pediatric-Specific Information */}
        {showPediatricFields && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.33 }}
            className="card card-compact border-l-4 border-l-blue-500"
          >
            <div className="card-header flex items-center gap-3">
              <Baby className="w-5 h-5 text-blue-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Pediatric Information</h2>
                <p className="text-xs text-gray-500">Additional fields for patients under 18 years</p>
              </div>
            </div>
            <div className="card-body">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Pediatric Patient Considerations:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>Medication dosing will be weight-based (mg/kg)</li>
                      <li>Vital signs interpretation uses age-appropriate reference ranges</li>
                      <li>DVT risk assessment not applicable for patients under 14 years</li>
                      <li>Guardian/parent consent required for procedures</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Geriatric-Specific Information */}
        {showGeriatricFields && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            className="card card-compact border-l-4 border-l-purple-500"
          >
            <div className="card-header flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Geriatric Considerations</h2>
                <p className="text-xs text-gray-500">Additional considerations for patients 65+ years</p>
              </div>
            </div>
            <div className="card-body">
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-purple-800">
                    <p className="font-medium">Geriatric Patient Considerations:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-1">
                      <li>Medications adjusted for renal function (GFR-based dosing)</li>
                      <li>Fall risk assessment recommended</li>
                      <li>Cognitive assessment may be required (MMSE/MoCA)</li>
                      <li>Polypharmacy review recommended</li>
                      <li>Enhanced pressure sore risk monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* DVT Risk Assessment (Caprini Score) - OPTIONAL - Hidden for pediatric patients */}
        {showDvtAssessment && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card card-compact border border-orange-200"
        >
          <div 
            className="card-header flex items-center justify-between cursor-pointer"
            onClick={() => setDvtExpanded(!dvtExpanded)}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-orange-500" />
              <div>
                <h2 className="font-semibold text-gray-900">DVT Risk Assessment (Caprini Score)</h2>
                <p className="text-xs text-gray-500">Optional - Recommended for surgical patients</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedDvtFactors.length > 0 && (
                <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                  Score: {dvtRiskFactors.filter(f => selectedDvtFactors.includes(f.id)).reduce((sum, f) => sum + f.points, 0)}
                </span>
              )}
              {dvtExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </div>
          
          {dvtExpanded && (
            <div className="card-body space-y-4">
              <div className="p-3 bg-orange-50 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-orange-700">
                  Select all risk factors that apply to this patient. The Caprini VTE Risk Score helps determine DVT prophylaxis requirements.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dvtRiskFactors.map((factor) => (
                  <label
                    key={factor.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedDvtFactors.includes(factor.id)
                        ? 'bg-orange-50 border-orange-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDvtFactors.includes(factor.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDvtFactors([...selectedDvtFactors, factor.id]);
                        } else {
                          setSelectedDvtFactors(selectedDvtFactors.filter(f => f !== factor.id));
                        }
                      }}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700">{factor.label}</span>
                      <span className="ml-2 text-xs text-orange-600 font-medium">+{factor.points} pts</span>
                    </div>
                  </label>
                ))}
              </div>
              
              {/* DVT Risk Summary */}
              {selectedDvtFactors.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Risk Assessment Summary</h4>
                  {(() => {
                    const score = dvtRiskFactors.filter(f => selectedDvtFactors.includes(f.id)).reduce((sum, f) => sum + f.points, 0);
                    let riskLevel = '';
                    let riskColor = '';
                    let recommendation = '';
                    
                    if (score <= 2) {
                      riskLevel = 'Low Risk';
                      riskColor = 'text-green-600 bg-green-100';
                      recommendation = 'Early ambulation, consider compression stockings';
                    } else if (score <= 4) {
                      riskLevel = 'Moderate Risk';
                      riskColor = 'text-yellow-600 bg-yellow-100';
                      recommendation = 'Pharmacological + mechanical prophylaxis recommended';
                    } else if (score <= 8) {
                      riskLevel = 'High Risk';
                      riskColor = 'text-orange-600 bg-orange-100';
                      recommendation = 'Aggressive pharmacological + mechanical prophylaxis + extended prophylaxis';
                    } else {
                      riskLevel = 'Very High Risk';
                      riskColor = 'text-red-600 bg-red-100';
                      recommendation = 'Aggressive prophylaxis, consider IVC filter if anticoagulation contraindicated';
                    }
                    
                    return (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-gray-900">{score}</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskColor}`}>{riskLevel}</span>
                        </div>
                        <p className="text-sm text-gray-600"><strong>Recommendation:</strong> {recommendation}</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </motion.div>
        )}

        {/* Pressure Sore Risk Assessment (Braden Scale) - OPTIONAL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card card-compact border border-purple-200"
        >
          <div 
            className="card-header flex items-center justify-between cursor-pointer"
            onClick={() => setPressureSoreExpanded(!pressureSoreExpanded)}
          >
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-purple-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Pressure Sore Risk (Braden Scale)</h2>
                <p className="text-xs text-gray-500">Optional - Recommended for bedridden patients</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {Object.values(bradenScores).some(s => s > 0) && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                  Score: {Object.values(bradenScores).reduce((sum, s) => sum + s, 0)}/23
                </span>
              )}
              {pressureSoreExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </div>
          
          {pressureSoreExpanded && (
            <div className="card-body space-y-4">
              <div className="p-3 bg-purple-50 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-purple-700">
                  Rate each category from 1 (worst) to 4 (best). Lower total scores indicate higher risk for pressure sores.
                </p>
              </div>
              
              {/* Sensory Perception */}
              <div>
                <label className="label">Sensory Perception *</label>
                <select
                  value={bradenScores.sensoryPerception}
                  onChange={(e) => setBradenScores({ ...bradenScores, sensoryPerception: parseInt(e.target.value) })}
                  className={`input ${bradenScores.sensoryPerception === 0 ? 'border-red-300' : ''}`}
                  title="Select sensory perception level"
                >
                  <option value={0}>Select...</option>
                  <option value={1}>1 - Completely Limited: Unresponsive to painful stimuli</option>
                  <option value={2}>2 - Very Limited: Responds only to painful stimuli</option>
                  <option value={3}>3 - Slightly Limited: Responds to verbal commands but cannot always communicate discomfort</option>
                  <option value={4}>4 - No Impairment: Responds to verbal commands, has no sensory deficit</option>
                </select>
              </div>
              
              {/* Moisture */}
              <div>
                <label className="label">Moisture *</label>
                <select
                  value={bradenScores.moisture}
                  onChange={(e) => setBradenScores({ ...bradenScores, moisture: parseInt(e.target.value) })}
                  className={`input ${bradenScores.moisture === 0 ? 'border-red-300' : ''}`}
                  title="Select moisture level"
                >
                  <option value={0}>Select...</option>
                  <option value={1}>1 - Constantly Moist: Skin is kept moist almost constantly</option>
                  <option value={2}>2 - Very Moist: Skin is often but not always moist</option>
                  <option value={3}>3 - Occasionally Moist: Skin is occasionally moist</option>
                  <option value={4}>4 - Rarely Moist: Skin is usually dry</option>
                </select>
              </div>
              
              {/* Activity */}
              <div>
                <label className="label">Activity *</label>
                <select
                  value={bradenScores.activity}
                  onChange={(e) => setBradenScores({ ...bradenScores, activity: parseInt(e.target.value) })}
                  className={`input ${bradenScores.activity === 0 ? 'border-red-300' : ''}`}
                  title="Select activity level"
                >
                  <option value={0}>Select...</option>
                  <option value={1}>1 - Bedfast: Confined to bed</option>
                  <option value={2}>2 - Chairfast: Ability to walk severely limited</option>
                  <option value={3}>3 - Walks Occasionally: Walks occasionally during day</option>
                  <option value={4}>4 - Walks Frequently: Walks outside room at least twice daily</option>
                </select>
              </div>
              
              {/* Mobility */}
              <div>
                <label className="label">Mobility *</label>
                <select
                  value={bradenScores.mobility}
                  onChange={(e) => setBradenScores({ ...bradenScores, mobility: parseInt(e.target.value) })}
                  className={`input ${bradenScores.mobility === 0 ? 'border-red-300' : ''}`}
                  title="Select mobility level"
                >
                  <option value={0}>Select...</option>
                  <option value={1}>1 - Completely Immobile: Does not make even slight changes in body position</option>
                  <option value={2}>2 - Very Limited: Makes occasional slight changes in body position</option>
                  <option value={3}>3 - Slightly Limited: Makes frequent though slight changes in position</option>
                  <option value={4}>4 - No Limitations: Makes major and frequent changes in position</option>
                </select>
              </div>
              
              {/* Nutrition */}
              <div>
                <label className="label">Nutrition *</label>
                <select
                  value={bradenScores.nutrition}
                  onChange={(e) => setBradenScores({ ...bradenScores, nutrition: parseInt(e.target.value) })}
                  className={`input ${bradenScores.nutrition === 0 ? 'border-red-300' : ''}`}
                  title="Select nutrition level"
                >
                  <option value={0}>Select...</option>
                  <option value={1}>1 - Very Poor: Never eats a complete meal, rarely eats more than 1/3 of any food</option>
                  <option value={2}>2 - Probably Inadequate: Rarely eats a complete meal, generally eats only about 1/2 of food</option>
                  <option value={3}>3 - Adequate: Eats over half of most meals, occasionally refuses a meal</option>
                  <option value={4}>4 - Excellent: Eats most of every meal, never refuses a meal</option>
                </select>
              </div>
              
              {/* Friction & Shear */}
              <div>
                <label className="label">Friction & Shear *</label>
                <select
                  value={bradenScores.frictionShear}
                  onChange={(e) => setBradenScores({ ...bradenScores, frictionShear: parseInt(e.target.value) })}
                  className={`input ${bradenScores.frictionShear === 0 ? 'border-red-300' : ''}`}
                  title="Select friction and shear level"
                >
                  <option value={0}>Select...</option>
                  <option value={1}>1 - Problem: Requires moderate to maximum assistance in moving, spastic/contractures</option>
                  <option value={2}>2 - Potential Problem: Moves feebly or requires minimum assistance</option>
                  <option value={3}>3 - No Apparent Problem: Moves in bed and chair independently</option>
                </select>
              </div>
              
              {/* Braden Score Summary */}
              {Object.values(bradenScores).every(s => s > 0) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Risk Assessment Summary</h4>
                  {(() => {
                    const total = Object.values(bradenScores).reduce((sum, s) => sum + s, 0);
                    let riskLevel = '';
                    let riskColor = '';
                    let interventions = '';
                    
                    if (total >= 19) {
                      riskLevel = 'No Risk';
                      riskColor = 'text-green-600 bg-green-100';
                      interventions = 'Standard care, regular repositioning';
                    } else if (total >= 15) {
                      riskLevel = 'Mild Risk';
                      riskColor = 'text-blue-600 bg-blue-100';
                      interventions = 'Pressure-relieving mattress, repositioning every 4 hours';
                    } else if (total >= 13) {
                      riskLevel = 'Moderate Risk';
                      riskColor = 'text-yellow-600 bg-yellow-100';
                      interventions = 'Pressure-relieving mattress, repositioning every 2-3 hours, heel protection';
                    } else if (total >= 10) {
                      riskLevel = 'High Risk';
                      riskColor = 'text-orange-600 bg-orange-100';
                      interventions = 'Specialty surface, repositioning every 2 hours, nutritional consultation';
                    } else {
                      riskLevel = 'Very High Risk';
                      riskColor = 'text-red-600 bg-red-100';
                      interventions = 'Air-fluidized bed, repositioning every 1-2 hours, wound care consultation';
                    }
                    
                    return (
                      <>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl font-bold text-gray-900">{total}/23</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${riskColor}`}>{riskLevel}</span>
                        </div>
                        <p className="text-sm text-gray-600"><strong>Interventions:</strong> {interventions}</p>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Comorbidities - OPTIONAL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card card-compact border border-blue-200"
        >
          <div 
            className="card-header flex items-center justify-between cursor-pointer"
            onClick={() => setComorbiditiesExpanded(!comorbiditiesExpanded)}
          >
            <div className="flex items-center gap-3">
              <Stethoscope className="w-5 h-5 text-blue-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Comorbidities</h2>
                <p className="text-xs text-gray-500">Optional - Select pre-existing medical conditions</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectedComorbidities.length > 0 && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                  {selectedComorbidities.length} selected
                </span>
              )}
              {comorbiditiesExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </div>
          
          {comorbiditiesExpanded && (
            <div className="card-body space-y-4">
              <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  Select all pre-existing medical conditions. This information is critical for surgical planning and risk assessment.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {commonComorbidities.map((condition) => (
                  <label
                    key={condition}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedComorbidities.includes(condition)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedComorbidities.includes(condition)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedComorbidities([...selectedComorbidities, condition]);
                        } else {
                          setSelectedComorbidities(selectedComorbidities.filter(c => c !== condition));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{condition}</span>
                  </label>
                ))}
              </div>
              
              {/* Custom Comorbidity Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customComorbidity}
                  onChange={(e) => setCustomComorbidity(e.target.value)}
                  placeholder="Add other condition not listed..."
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customComorbidity.trim() && !selectedComorbidities.includes(customComorbidity.trim())) {
                      setSelectedComorbidities([...selectedComorbidities, customComorbidity.trim()]);
                      setCustomComorbidity('');
                    }
                  }}
                  className="btn btn-secondary"
                >
                  Add
                </button>
              </div>
              
              {/* Selected Comorbidities Summary */}
              {selectedComorbidities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedComorbidities.map((condition) => (
                    <span
                      key={condition}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {condition}
                      <button
                        type="button"
                        onClick={() => setSelectedComorbidities(selectedComorbidities.filter(c => c !== condition))}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Next of Kin - OPTIONAL */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card card-compact"
        >
          <div className="card-header flex items-center gap-3">
            <Heart className="w-5 h-5 text-sky-500" />
            <h2 className="font-semibold text-gray-900">Next of Kin</h2>
            <span className="text-xs text-gray-500">(Optional)</span>
          </div>
          <div className="card-body form-grid-2">
            <div>
              <label className="label">Full Name</label>
              <input {...register('nextOfKinName')} className="input" />
            </div>
            <div>
              <label className="label">Relationship</label>
              <input {...register('nextOfKinRelationship')} className="input" placeholder="e.g., Spouse, Parent, Sibling" />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input {...register('nextOfKinPhone')} type="tel" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input {...register('nextOfKinAddress')} className="input" />
            </div>
          </div>
        </motion.div>

        {/* Actions - Sticky on mobile */}
        <div className="sticky bottom-0 bg-gray-50 -mx-4 px-4 py-4 sm:relative sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent border-t sm:border-0 border-gray-200">
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => navigate('/patients')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <>
                  <Save size={18} />
                  Register Patient
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
