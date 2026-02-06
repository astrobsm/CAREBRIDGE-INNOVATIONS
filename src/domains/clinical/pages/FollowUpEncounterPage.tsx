/**
 * Follow-Up Encounter Page
 * 
 * For patients who have been seen before. Focused on:
 * - Reporting new changes/symptoms
 * - Serial uploads of photographs of lesions
 * - Updates of tracked investigations and prescriptions
 * - Treatment plan modifications
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Save,
  Stethoscope,
  TrendingUp,
  TrendingDown,
  Camera,
  ImagePlus,
  Image as ImageIcon,
  FlaskConical,
  Pill,
  ClipboardList,
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  X,
  Eye,
  Calendar,
  Activity,
  RefreshCw,
  Upload,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { syncRecord } from '../../../services/cloudSyncService';
import { VoiceDictation } from '../../../components/common';
import type { 
  ClinicalEncounter, 
  Diagnosis, 
  PhysicalExamination, 
  Investigation, 
  Prescription, 
  ClinicalPhoto,
  Patient 
} from '../../../types';

const followUpSchema = z.object({
  intervalHistory: z.string().min(5, 'Please describe changes since last visit'),
  symptomsUpdate: z.string().optional(),
  medicationCompliance: z.enum(['good', 'partial', 'poor', 'unknown']).optional(),
  sideEffects: z.string().optional(),
  treatmentPlanUpdate: z.string().optional(),
  notes: z.string().optional(),
  nextAppointment: z.string().optional(),
});

type FollowUpFormData = z.infer<typeof followUpSchema>;

interface PhotoUpload {
  id: string;
  imageData: string;
  description: string;
  bodyLocation: string;
  capturedAt: Date;
  comparisonToId?: string; // ID of previous photo to compare
}

interface InvestigationUpdate {
  investigationId: string;
  resultValue?: string;
  resultNotes?: string;
  isAbnormal: boolean;
  uploadedAt?: Date;
}

export default function FollowUpEncounterPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'changes' | 'photos' | 'investigations' | 'medications' | 'plan'>('changes');
  
  // Photo upload state
  const [newPhotos, setNewPhotos] = useState<PhotoUpload[]>([]);
  const [photoDescription, setPhotoDescription] = useState('');
  const [photoBodyLocation, setPhotoBodyLocation] = useState('');
  const [showPhotoCompare, setShowPhotoCompare] = useState(false);
  const [selectedPhotoForCompare, setSelectedPhotoForCompare] = useState<ClinicalPhoto | null>(null);
  
  // Investigation updates state
  const [investigationUpdates, setInvestigationUpdates] = useState<InvestigationUpdate[]>([]);
  const [expandedInvestigation, setExpandedInvestigation] = useState<string | null>(null);
  
  // Medication changes
  const [medicationChanges, setMedicationChanges] = useState<{
    continued: string[];
    discontinued: string[];
    modified: { id: string; change: string }[];
    newMedications: { name: string; dose: string; frequency: string; duration: string }[];
  }>({
    continued: [],
    discontinued: [],
    modified: [],
    newMedications: [],
  });
  
  // Diagnosis updates
  const [diagnosisUpdates, setDiagnosisUpdates] = useState<{
    resolved: string[];
    ongoing: string[];
    newDiagnoses: Diagnosis[];
  }>({
    resolved: [],
    ongoing: [],
    newDiagnoses: [],
  });

  // Queries
  const patient = useLiveQuery(
    () => patientId ? db.patients.get(patientId) : undefined,
    [patientId]
  );

  const previousEncounters = useLiveQuery(
    async () => {
      if (!patientId) return [];
      const encounters = await db.clinicalEncounters
        .where('patientId')
        .equals(patientId)
        .toArray();
      encounters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return encounters;
    },
    [patientId]
  );

  const lastEncounter = useMemo(() => previousEncounters?.[0], [previousEncounters]);

  const allPhotos = useLiveQuery(
    async () => {
      if (!patientId) return [];
      const encounters = await db.clinicalEncounters
        .where('patientId')
        .equals(patientId)
        .toArray();
      
      const photos: (ClinicalPhoto & { encounterDate: Date })[] = [];
      encounters.forEach(enc => {
        enc.clinicalPhotos?.forEach(photo => {
          photos.push({ ...photo, encounterDate: new Date(enc.createdAt) });
        });
      });
      
      photos.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
      return photos;
    },
    [patientId]
  );

  const pendingInvestigations = useLiveQuery(
    async () => {
      if (!patientId) return [];
      return db.investigations
        .where('patientId')
        .equals(patientId)
        .filter(inv => inv.status !== 'completed')
        .toArray();
    },
    [patientId]
  );

  const allInvestigations = useLiveQuery(
    async () => {
      if (!patientId) return [];
      const investigations = await db.investigations
        .where('patientId')
        .equals(patientId)
        .toArray();
      investigations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return investigations;
    },
    [patientId]
  );

  const currentPrescriptions = useLiveQuery(
    async () => {
      if (!patientId) return [];
      const prescriptions = await db.prescriptions
        .where('patientId')
        .equals(patientId)
        .filter(rx => rx.status === 'active')
        .toArray();
      return prescriptions;
    },
    [patientId]
  );

  const latestVitals = useLiveQuery(
    async () => {
      if (!patientId) return undefined;
      const allVitals = await db.vitalSigns.where('patientId').equals(patientId).toArray();
      allVitals.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
      return allVitals[0];
    },
    [patientId]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FollowUpFormData>({
    resolver: zodResolver(followUpSchema),
    defaultValues: {
      medicationCompliance: 'unknown',
    },
  });

  const intervalHistory = watch('intervalHistory') || '';
  const symptomsUpdate = watch('symptomsUpdate') || '';
  const treatmentPlanUpdate = watch('treatmentPlanUpdate') || '';

  // Photo handling
  const handlePhotoCapture = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      const newPhoto: PhotoUpload = {
        id: uuidv4(),
        imageData,
        description: photoDescription,
        bodyLocation: photoBodyLocation,
        capturedAt: new Date(),
      };
      setNewPhotos(prev => [...prev, newPhoto]);
      setPhotoDescription('');
      setPhotoBodyLocation('');
      toast.success('Photo added');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }, [photoDescription, photoBodyLocation]);

  const removePhoto = useCallback((photoId: string) => {
    setNewPhotos(prev => prev.filter(p => p.id !== photoId));
  }, []);

  // Investigation result upload
  const handleInvestigationResultUpload = useCallback((investigationId: string, resultValue: string, isAbnormal: boolean) => {
    setInvestigationUpdates(prev => {
      const existing = prev.find(u => u.investigationId === investigationId);
      if (existing) {
        return prev.map(u => 
          u.investigationId === investigationId 
            ? { ...u, resultValue, isAbnormal, uploadedAt: new Date() }
            : u
        );
      }
      return [...prev, { investigationId, resultValue, isAbnormal, uploadedAt: new Date() }];
    });
  }, []);

  // Form submission
  const onSubmit = async (data: FollowUpFormData) => {
    if (!patientId || !user) {
      toast.error('Patient or user information missing');
      return;
    }

    setIsLoading(true);
    try {
      const hospitalId = user.hospitalId || 'default-hospital';
      const encounterId = uuidv4();
      const now = new Date();

      // Build the clinical photos array
      const clinicalPhotos: ClinicalPhoto[] = newPhotos.map(photo => ({
        id: photo.id,
        imageData: photo.imageData,
        description: photo.description,
        bodyLocation: photo.bodyLocation,
        capturedAt: photo.capturedAt,
      }));

      // Get existing diagnoses from last encounter and merge with updates
      const existingDiagnoses = lastEncounter?.diagnosis || [];
      const mergedDiagnoses: Diagnosis[] = [
        ...existingDiagnoses.filter(d => 
          diagnosisUpdates.ongoing.includes(d.id) || 
          !diagnosisUpdates.resolved.includes(d.id)
        ).map(d => ({
          ...d,
          status: diagnosisUpdates.resolved.includes(d.id) ? 'ruled_out' as const : d.status,
        })),
        ...diagnosisUpdates.newDiagnoses,
      ];

      // Create follow-up encounter
      const encounter: ClinicalEncounter = {
        id: encounterId,
        patientId,
        hospitalId,
        type: 'follow_up',
        status: 'completed',
        chiefComplaint: `Follow-up Visit: ${data.intervalHistory}`,
        historyOfPresentIllness: data.symptomsUpdate,
        treatmentPlan: data.treatmentPlanUpdate,
        notes: `Medication Compliance: ${data.medicationCompliance}\n${data.sideEffects ? `Side Effects: ${data.sideEffects}\n` : ''}${data.notes || ''}`,
        diagnosis: mergedDiagnoses,
        clinicalPhotos,
        attendingClinician: user.id,
        startedAt: now,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      // Save encounter
      await db.clinicalEncounters.add(encounter);
      await syncRecord('clinicalEncounters', encounter);

      // Update investigation statuses if results were uploaded
      for (const update of investigationUpdates) {
        if (update.resultValue) {
          await db.investigations.update(update.investigationId, {
            status: 'completed',
            results: update.resultValue,
            completedAt: update.uploadedAt || new Date(),
            updatedAt: new Date(),
          });
        }
      }

      toast.success('Follow-up encounter saved successfully');
      navigate(`/patients/${patientId}`);
    } catch (error) {
      console.error('Error saving follow-up encounter:', error);
      toast.error('Failed to save encounter');
    } finally {
      setIsLoading(false);
    }
  };

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading patient...</p>
      </div>
    );
  }

  const sectionTabs = [
    { id: 'changes', label: 'Changes', icon: RefreshCw },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'investigations', label: 'Investigations', icon: FlaskConical },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'plan', label: 'Plan', icon: ClipboardList },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(`/patients/${patientId}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft size={18} />
          Back to Patient
        </button>
        
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
              <RefreshCw className="w-7 h-7 text-emerald-500" />
              Follow-Up Encounter
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {patient.firstName} {patient.lastName} ({patient.hospitalNumber})
            </p>
            {lastEncounter && (
              <p className="text-xs text-gray-500 mt-1">
                Last visit: {format(new Date(lastEncounter.createdAt), 'PPP')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Latest Vitals Summary */}
      {latestVitals && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
            <Activity size={16} />
            Latest Vitals ({format(new Date(latestVitals.recordedAt), 'PP')})
          </h3>
          <div className="flex flex-wrap gap-4 text-sm">
            {latestVitals.bloodPressureSystolic && latestVitals.bloodPressureDiastolic && (
              <span className="bg-white px-3 py-1 rounded-full border">
                BP: {latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic} mmHg
              </span>
            )}
            {latestVitals.heartRate && (
              <span className="bg-white px-3 py-1 rounded-full border">HR: {latestVitals.heartRate} bpm</span>
            )}
            {latestVitals.temperature && (
              <span className="bg-white px-3 py-1 rounded-full border">Temp: {latestVitals.temperature}°C</span>
            )}
            {latestVitals.oxygenSaturation && (
              <span className="bg-white px-3 py-1 rounded-full border">SpO2: {latestVitals.oxygenSaturation}%</span>
            )}
          </div>
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {sectionTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === tab.id
                ? 'bg-emerald-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Changes Since Last Visit */}
        {activeSection === 'changes' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border p-6 space-y-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <RefreshCw className="text-emerald-500" size={20} />
              Interval History
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Changes Since Last Visit *
              </label>
              <div className="relative">
                <textarea
                  {...register('intervalHistory')}
                  rows={4}
                  className="input w-full"
                  placeholder="Describe any changes in symptoms, condition, or general health since the last visit..."
                />
                <VoiceDictation
                  currentValue={intervalHistory}
                  onResult={(text) => setValue('intervalHistory', text)}
                  className="absolute top-2 right-2"
                />
              </div>
              {errors.intervalHistory && (
                <p className="text-red-500 text-sm mt-1">{errors.intervalHistory.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Symptoms
              </label>
              <div className="relative">
                <textarea
                  {...register('symptomsUpdate')}
                  rows={3}
                  className="input w-full"
                  placeholder="Current symptoms and their severity..."
                />
                <VoiceDictation
                  currentValue={symptomsUpdate}
                  onResult={(text) => setValue('symptomsUpdate', text)}
                  className="absolute top-2 right-2"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Medication Compliance
                </label>
                <select {...register('medicationCompliance')} className="input w-full">
                  <option value="unknown">Select...</option>
                  <option value="good">Good - Taking as prescribed</option>
                  <option value="partial">Partial - Occasionally missing doses</option>
                  <option value="poor">Poor - Often non-compliant</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Side Effects
                </label>
                <input
                  {...register('sideEffects')}
                  className="input w-full"
                  placeholder="Any medication side effects..."
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Photo Documentation */}
        {activeSection === 'photos' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border p-6 space-y-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Camera className="text-emerald-500" size={20} />
              Serial Photo Documentation
            </h2>

            {/* Previous Photos for Comparison */}
            {allPhotos && allPhotos.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Previous Photos (for comparison)</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {allPhotos.slice(0, 8).map(photo => (
                    <div
                      key={photo.id}
                      className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 cursor-pointer hover:border-emerald-500 transition-colors"
                      onClick={() => {
                        setSelectedPhotoForCompare(photo);
                        setShowPhotoCompare(true);
                      }}
                    >
                      <img
                        src={photo.imageData}
                        alt={photo.description || 'Clinical photo'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1">
                        {format(new Date(photo.capturedAt), 'MMM d')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Photo Upload */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Body Location
                  </label>
                  <input
                    type="text"
                    value={photoBodyLocation}
                    onChange={(e) => setPhotoBodyLocation(e.target.value)}
                    className="input w-full"
                    placeholder="e.g., Left lower leg, anterior aspect"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value)}
                    className="input w-full"
                    placeholder="e.g., Wound healing progress"
                  />
                </div>
              </div>

              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Camera className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to capture or upload photo</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
              </label>
            </div>

            {/* New Photos Preview */}
            {newPhotos.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  New Photos This Visit ({newPhotos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {newPhotos.map(photo => (
                    <div key={photo.id} className="relative">
                      <div className="aspect-square rounded-lg overflow-hidden border">
                        <img
                          src={photo.imageData}
                          alt={photo.description}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {photo.bodyLocation || photo.description || 'No description'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Investigations Section */}
        {activeSection === 'investigations' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FlaskConical className="text-emerald-500" size={20} />
                Investigations Update
              </h2>
              <Link
                to={`/patients/${patientId}/investigations`}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                View All →
              </Link>
            </div>

            {/* Pending Investigations */}
            {pendingInvestigations && pendingInvestigations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-500" />
                  Pending Results ({pendingInvestigations.length})
                </h3>
                <div className="space-y-3">
                  {pendingInvestigations.map(inv => (
                    <div
                      key={inv.id}
                      className="bg-amber-50 border border-amber-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{inv.typeName || inv.type}</p>
                          <p className="text-sm text-gray-500">
                            Requested: {format(new Date(inv.createdAt), 'PP')}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                          {inv.status}
                        </span>
                      </div>
                      
                      {/* Result Upload */}
                      <div className="mt-3 pt-3 border-t border-amber-200">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Upload Result
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter result value..."
                            className="input flex-1 text-sm"
                            onChange={(e) => {
                              const update = investigationUpdates.find(u => u.investigationId === inv.id);
                              handleInvestigationResultUpload(inv.id, e.target.value, update?.isAbnormal || false);
                            }}
                          />
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              className="rounded"
                              onChange={(e) => {
                                const update = investigationUpdates.find(u => u.investigationId === inv.id);
                                handleInvestigationResultUpload(inv.id, update?.resultValue || '', e.target.checked);
                              }}
                            />
                            Abnormal
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Completed Investigations */}
            {allInvestigations && allInvestigations.filter(i => i.status === 'completed').length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  Recent Results
                </h3>
                <div className="space-y-2">
                  {allInvestigations
                    .filter(i => i.status === 'completed')
                    .slice(0, 5)
                    .map(inv => (
                      <div
                        key={inv.id}
                        className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{inv.typeName || inv.type}</p>
                          <p className="text-sm text-gray-500">{inv.results || 'No results recorded'}</p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {format(new Date(inv.completedAt || inv.createdAt), 'PP')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {(!pendingInvestigations || pendingInvestigations.length === 0) && 
             (!allInvestigations || allInvestigations.filter(i => i.status === 'completed').length === 0) && (
              <p className="text-gray-500 text-center py-8">No investigations recorded</p>
            )}
          </motion.div>
        )}

        {/* Medications Section */}
        {activeSection === 'medications' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border p-6 space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Pill className="text-emerald-500" size={20} />
                Medication Review
              </h2>
              <Link
                to={`/patients/${patientId}/prescriptions`}
                className="text-sm text-emerald-600 hover:text-emerald-700"
              >
                View All →
              </Link>
            </div>

            {/* Current Active Medications */}
            {currentPrescriptions && currentPrescriptions.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Current Medications
                </h3>
                <div className="space-y-2">
                  {currentPrescriptions.map(rx => (
                    <div key={rx.id} className="bg-gray-50 border rounded-lg p-3">
                      {rx.medications?.map((med, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{med.name}</p>
                            <p className="text-sm text-gray-500">
                              {med.dose} {med.unit} - {med.frequency} for {med.duration}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              onClick={() => {
                                if (!medicationChanges.continued.includes(rx.id)) {
                                  setMedicationChanges(prev => ({
                                    ...prev,
                                    continued: [...prev.continued, rx.id],
                                    discontinued: prev.discontinued.filter(id => id !== rx.id),
                                  }));
                                }
                              }}
                            >
                              Continue
                            </button>
                            <button
                              type="button"
                              className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              onClick={() => {
                                if (!medicationChanges.discontinued.includes(rx.id)) {
                                  setMedicationChanges(prev => ({
                                    ...prev,
                                    discontinued: [...prev.discontinued, rx.id],
                                    continued: prev.continued.filter(id => id !== rx.id),
                                  }));
                                }
                              }}
                            >
                              Discontinue
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No active medications</p>
            )}

            {/* Summary of Changes */}
            {(medicationChanges.continued.length > 0 || medicationChanges.discontinued.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Medication Changes Summary</h4>
                {medicationChanges.continued.length > 0 && (
                  <p className="text-sm text-blue-700">
                    ✓ {medicationChanges.continued.length} medication(s) continued
                  </p>
                )}
                {medicationChanges.discontinued.length > 0 && (
                  <p className="text-sm text-red-700">
                    ✗ {medicationChanges.discontinued.length} medication(s) discontinued
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Treatment Plan Update */}
        {activeSection === 'plan' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border p-6 space-y-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="text-emerald-500" size={20} />
              Updated Treatment Plan
            </h2>

            {/* Previous Treatment Plan */}
            {lastEncounter?.treatmentPlan && (
              <div className="bg-gray-50 border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <History size={14} />
                  Previous Plan ({format(new Date(lastEncounter.createdAt), 'PP')})
                </h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {lastEncounter.treatmentPlan}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Updated Treatment Plan
              </label>
              <div className="relative">
                <textarea
                  {...register('treatmentPlanUpdate')}
                  rows={5}
                  className="input w-full"
                  placeholder="Enter updated treatment plan, modifications, new orders..."
                />
                <VoiceDictation
                  currentValue={treatmentPlanUpdate}
                  onResult={(text) => setValue('treatmentPlanUpdate', text)}
                  className="absolute top-2 right-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Next Appointment
              </label>
              <input
                type="date"
                {...register('nextAppointment')}
                className="input w-full"
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="input w-full"
                placeholder="Any additional notes or observations..."
              />
            </div>
          </motion.div>
        )}

        {/* Submit Button - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">
          <div className="max-w-5xl mx-auto flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate(`/patients/${patientId}`)}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              Save Follow-Up
            </button>
          </div>
        </div>
      </form>

      {/* Photo Comparison Modal */}
      <AnimatePresence>
        {showPhotoCompare && selectedPhotoForCompare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPhotoCompare(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Photo Comparison</h3>
                <button
                  onClick={() => setShowPhotoCompare(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-4">
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={selectedPhotoForCompare.imageData}
                    alt={selectedPhotoForCompare.description || 'Clinical photo'}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    <strong>Date:</strong> {format(new Date(selectedPhotoForCompare.capturedAt), 'PPP')}
                  </p>
                  {selectedPhotoForCompare.bodyLocation && (
                    <p className="text-sm text-gray-600">
                      <strong>Location:</strong> {selectedPhotoForCompare.bodyLocation}
                    </p>
                  )}
                  {selectedPhotoForCompare.description && (
                    <p className="text-sm text-gray-600">
                      <strong>Description:</strong> {selectedPhotoForCompare.description}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
