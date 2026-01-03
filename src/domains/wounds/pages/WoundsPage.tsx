import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  CircleDot,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  User,
  Calendar,
  X,
  Save,
  Info,
  ChevronRight,
  Ruler,
  Activity,
  FileText,
  Camera,
  Target,
  Download,
  Printer,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format, differenceInDays } from 'date-fns';
import type { Wound, WoundType, TissueType } from '../../../types';
import TreatmentPlanCard from '../../../components/clinical/TreatmentPlanCard';
import { generateWoundPDFFromEntity } from '../../../utils/clinicalPdfGenerators';
import { generateCalibrationRulerPDF } from '../../../utils/calibrationRulerPdf';
import { PatientSelector } from '../../../components/patient';
import { usePatientMap } from '../../../services/patientHooks';
import AIWoundPlanimetry from '../components/AIWoundPlanimetry';

const woundSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  location: z.string().min(1, 'Location is required'),
  type: z.string().min(1, 'Wound type is required'),
  etiology: z.string().min(1, 'Etiology is required'),
  length: z.number().min(0.1, 'Length is required'),
  width: z.number().min(0.1, 'Width is required'),
  depth: z.number().optional(),
  tissueTypes: z.array(z.string()).min(1, 'Select at least one tissue type'),
  exudateAmount: z.enum(['none', 'light', 'moderate', 'heavy']),
  exudateType: z.string().optional(),
  odor: z.boolean(),
  periWoundCondition: z.string().optional(),
  painLevel: z.number().min(0).max(10),
  dressingType: z.string().optional(),
  dressingFrequency: z.string().optional(),
});

type WoundFormData = z.infer<typeof woundSchema>;

// Wound phases and their protocols
const woundPhases = {
  extension: {
    name: 'Extension Phase',
    description: 'Necrotic and edematous with no evidence of granulation or healthy tissue',
    granulationPercent: '0%',
    dressingFrequency: 'Daily',
    protocol: [
      'Clean with Wound Clex Solution',
      'Pack with first layer: Hera Gel',
      'Second layer: Woundcare-Honey Gauze',
      'Capillary layer: Sterile Gauze',
      'Absorbent layer: Cotton Wool',
    ],
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  transition: {
    name: 'Transition Phase',
    description: 'Granulation up to 40% of wound surface, edema reduced, discharges minimal',
    granulationPercent: '1-40%',
    dressingFrequency: 'Alternate Day',
    protocol: [
      'Clean with Wound Clex Solution',
      'Pack with first layer: Hera Gel',
      'Second layer: Woundcare-Honey Gauze',
      'Capillary layer: Sterile Gauze',
      'Absorbent layer: Cotton Wool',
    ],
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  repair: {
    name: 'Repair/Indolent Phase',
    description: 'Active granulation and epithelialization, minimal to no exudate',
    granulationPercent: '>40%',
    dressingFrequency: 'Alternate Day',
    protocol: [
      'Clean with Wound Clex Solution',
      'Pack with first layer: Hera Gel',
      'Second layer: Woundcare-Honey Gauze',
      'Capillary layer: Sterile Gauze',
      'Absorbent layer: Cotton Wool',
    ],
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

const woundTypes: { value: WoundType; label: string }[] = [
  { value: 'surgical', label: 'Surgical Wound' },
  { value: 'traumatic', label: 'Traumatic Wound' },
  { value: 'pressure_ulcer', label: 'Pressure Ulcer' },
  { value: 'diabetic_ulcer', label: 'Diabetic Ulcer' },
  { value: 'venous_ulcer', label: 'Venous Ulcer' },
  { value: 'arterial_ulcer', label: 'Arterial Ulcer' },
  { value: 'burn', label: 'Burn Wound' },
  { value: 'other', label: 'Other' },
];

const tissueTypes: { value: TissueType; label: string; color: string }[] = [
  { value: 'epithelial', label: 'Epithelial', color: 'bg-pink-100 text-pink-700' },
  { value: 'granulation', label: 'Granulation', color: 'bg-red-100 text-red-700' },
  { value: 'slough', label: 'Slough', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'necrotic', label: 'Necrotic', color: 'bg-gray-800 text-white' },
  { value: 'eschar', label: 'Eschar', color: 'bg-stone-700 text-white' },
];

export default function WoundsPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<keyof typeof woundPhases | null>(null);
  const [selectedWound, setSelectedWound] = useState<Wound | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAIPlanimetry, setShowAIPlanimetry] = useState(false);
  const [woundImageData, setWoundImageData] = useState<string | null>(null);

  const wounds = useLiveQuery(() => db.wounds.orderBy('createdAt').reverse().toArray(), []);
  
  // Use the new patient map hook for efficient lookups
  const patientMap = usePatientMap();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<WoundFormData>({
    resolver: zodResolver(woundSchema),
    defaultValues: {
      exudateAmount: 'light',
      painLevel: 5,
      odor: false,
      tissueTypes: [],
    },
  });

  const selectedTissueTypes = watch('tissueTypes') || [];

  const toggleTissueType = (type: string) => {
    const current = selectedTissueTypes;
    if (current.includes(type)) {
      setValue('tissueTypes', current.filter((t: string) => t !== type));
    } else {
      setValue('tissueTypes', [...current, type]);
    }
  };

  const determineWoundPhase = (tissueTypes: string[], granulationPercent?: number): keyof typeof woundPhases => {
    const hasNecrotic = tissueTypes.includes('necrotic') || tissueTypes.includes('eschar');
    const hasSlough = tissueTypes.includes('slough');
    const hasGranulation = tissueTypes.includes('granulation');
    // Epithelial tissue check can be used for healing stage assessment

    if (hasNecrotic || (hasSlough && !hasGranulation)) {
      return 'extension';
    } else if (hasGranulation && (granulationPercent === undefined || granulationPercent <= 40)) {
      return 'transition';
    } else {
      return 'repair';
    }
  };

  const filteredWounds = useMemo(() => {
    if (!wounds) return [];
    return wounds.filter((wound) => {
      const patient = patientMap.get(wound.patientId);
      return searchQuery === '' ||
        wound.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wound.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient && `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  }, [wounds, searchQuery, patientMap]);

  const onSubmit = async (data: WoundFormData) => {
    if (!user) return;

    try {
      const phase = determineWoundPhase(data.tissueTypes);
      const area = data.length * data.width;

      const wound: Wound = {
        id: uuidv4(),
        patientId: data.patientId,
        location: data.location,
        type: data.type as WoundType,
        etiology: data.etiology,
        length: data.length,
        width: data.width,
        depth: data.depth,
        area,
        tissueType: data.tissueTypes as TissueType[],
        exudateAmount: data.exudateAmount,
        exudateType: data.exudateType as any,
        odor: data.odor,
        periWoundCondition: data.periWoundCondition,
        painLevel: data.painLevel,
        photos: [],
        healingProgress: phase === 'repair' ? 'improving' : phase === 'extension' ? 'deteriorating' : 'stable',
        dressingType: woundPhases[phase].protocol.join('; '),
        dressingFrequency: woundPhases[phase].dressingFrequency,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await db.wounds.add(wound);
      toast.success('Wound assessment saved successfully!');
      setShowModal(false);
      reset();
    } catch (error) {
      console.error('Error saving wound:', error);
      toast.error('Failed to save wound assessment');
    }
  };

  const getProgressIcon = (progress: string) => {
    switch (progress) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'deteriorating':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <CircleDot className="w-7 h-7 text-rose-500" />
            Wound Care Management
          </h1>
          <p className="page-subtitle">
            AI-powered wound assessment and treatment protocols
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => {
              generateCalibrationRulerPDF();
              toast.success('Calibration rulers PDF downloaded!');
            }} 
            className="btn btn-secondary flex items-center gap-2"
            title="Download printable calibration rulers for wound measurement"
          >
            <Printer size={18} />
            <span className="hidden sm:inline">Print Rulers</span>
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary w-full sm:w-auto">
            <Plus size={18} />
            New Assessment
          </button>
        </div>
      </div>

      {/* Wound Phase Guide */}
      <div className="form-grid">
        {Object.entries(woundPhases).map(([key, phase]) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card card-compact p-4 sm:p-4 border-2 cursor-pointer transition-all ${
              selectedPhase === key ? phase.color : 'border-transparent hover:border-gray-200'
            }`}
            onClick={() => setSelectedPhase(selectedPhase === key ? null : key as keyof typeof woundPhases)}
          >
            <h3 className="font-semibold text-gray-900">{phase.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">Granulation: {phase.granulationPercent}</span>
              <span className="font-medium text-sky-600">{phase.dressingFrequency}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Protocol Details */}
      <AnimatePresence>
        {selectedPhase && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card overflow-hidden"
          >
            <div className="card-header flex items-center gap-3">
              <Info className="w-5 h-5 text-sky-500" />
              <h2 className="font-semibold text-gray-900">
                {woundPhases[selectedPhase].name} - Dressing Protocol
              </h2>
            </div>
            <div className="card-body">
              <ol className="space-y-2">
                {woundPhases[selectedPhase].protocol.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  <strong>Note:</strong> All wounds on the limbs should be elevated on a pillow.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="card card-compact p-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient, location, or wound type..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Wounds List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredWounds.length > 0 ? (
          filteredWounds.map((wound, index) => {
            const patient = patientMap.get(wound.patientId);
            const phase = determineWoundPhase(wound.tissueType);
            return (
              <motion.div
                key={wound.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => {
                  setSelectedWound(wound);
                  setShowDetailModal(true);
                }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-rose-100 rounded-lg">
                        <CircleDot className="w-5 h-5 text-rose-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{wound.location}</h3>
                        <p className="text-sm text-gray-500">{wound.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getProgressIcon(wound.healingProgress)}
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </div>
                  </div>

                  {patient && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <User size={14} />
                      <span>{patient.firstName} {patient.lastName}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">{wound.length}</p>
                      <p className="text-xs text-gray-500">L (cm)</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">{wound.width}</p>
                      <p className="text-xs text-gray-500">W (cm)</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-lg font-bold text-gray-900">{wound.area?.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">Area (cm²)</p>
                    </div>
                  </div>

                  <div className={`p-2 rounded-lg text-center text-sm font-medium ${woundPhases[phase].color}`}>
                    {woundPhases[phase].name} - {woundPhases[phase].dressingFrequency}
                  </div>

                  <div className="flex flex-wrap gap-1 mt-3">
                    {wound.tissueType.map((tissue) => {
                      const tissueInfo = tissueTypes.find(t => t.value === tissue);
                      return (
                        <span key={tissue} className={`badge text-xs ${tissueInfo?.color || 'bg-gray-100'}`}>
                          {tissue}
                        </span>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      {format(new Date(wound.createdAt), 'MMM d, yyyy')}
                    </div>
                    <span className={`badge ${
                      wound.exudateAmount === 'heavy' ? 'badge-danger' :
                      wound.exudateAmount === 'moderate' ? 'badge-warning' :
                      wound.exudateAmount === 'light' ? 'badge-info' : 'badge-secondary'
                    }`}>
                      {wound.exudateAmount} exudate
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full card p-12 text-center">
            <CircleDot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No wound assessments found</p>
            <p className="text-sm text-gray-400 mt-1">Start by creating a new wound assessment</p>
          </div>
        )}
      </div>

      {/* New Wound Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">New Wound Assessment</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="space-y-6">
                  {/* Patient Selection */}
                  <div>
                    <PatientSelector
                      value={watch('patientId')}
                      onChange={(patientId) => setValue('patientId', patientId || '')}
                      label="Patient"
                      required
                      error={errors.patientId?.message}
                    />
                  </div>

                  <div className="form-grid-2">
                    <div>
                      <label className="label">Location *</label>
                      <input {...register('location')} className={`input ${errors.location ? 'input-error' : ''}`} placeholder="e.g., Left lower leg" />
                      {errors.location && <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>}
                    </div>
                    <div>
                      <label className="label">Wound Type *</label>
                      <select {...register('type')} className={`input ${errors.type ? 'input-error' : ''}`}>
                        <option value="">Select type</option>
                        {woundTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      {errors.type && <p className="text-sm text-red-500 mt-1">{errors.type.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="label">Etiology *</label>
                    <input {...register('etiology')} className={`input ${errors.etiology ? 'input-error' : ''}`} placeholder="Cause of wound" />
                    {errors.etiology && <p className="text-sm text-red-500 mt-1">{errors.etiology.message}</p>}
                  </div>

                  {/* Measurements */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label mb-0">Wound Dimensions</label>
                      <button
                        type="button"
                        onClick={() => setShowAIPlanimetry(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                      >
                        <Target size={16} />
                        AI Measurement
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="label text-xs">Length (cm) *</label>
                        <input type="number" step="0.1" {...register('length', { valueAsNumber: true })} className={`input ${errors.length ? 'input-error' : ''}`} />
                        {errors.length && <p className="text-sm text-red-500 mt-1">{errors.length.message}</p>}
                      </div>
                      <div>
                        <label className="label text-xs">Width (cm) *</label>
                        <input type="number" step="0.1" {...register('width', { valueAsNumber: true })} className={`input ${errors.width ? 'input-error' : ''}`} />
                        {errors.width && <p className="text-sm text-red-500 mt-1">{errors.width.message}</p>}
                      </div>
                      <div>
                        <label className="label text-xs">Depth (cm)</label>
                        <input type="number" step="0.1" {...register('depth', { valueAsNumber: true })} className="input" />
                      </div>
                    </div>
                    {woundImageData && (
                      <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg flex items-center gap-2">
                        <Camera size={16} className="text-purple-600" />
                        <span className="text-sm text-purple-700">Wound image captured from AI measurement</span>
                      </div>
                    )}
                  </div>

                  {/* Tissue Types */}
                  <div>
                    <label className="label">Tissue Types *</label>
                    <div className="flex flex-wrap gap-2">
                      {tissueTypes.map((tissue) => (
                        <button
                          key={tissue.value}
                          type="button"
                          onClick={() => toggleTissueType(tissue.value)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedTissueTypes.includes(tissue.value)
                              ? tissue.color + ' ring-2 ring-offset-2 ring-gray-400'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {tissue.label}
                        </button>
                      ))}
                    </div>
                    {errors.tissueTypes && <p className="text-sm text-red-500 mt-1">{errors.tissueTypes.message}</p>}
                  </div>

                  {/* Exudate */}
                  <div className="form-grid-2">
                    <div>
                      <label className="label">Exudate Amount *</label>
                      <select {...register('exudateAmount')} className="input">
                        <option value="none">None</option>
                        <option value="light">Light</option>
                        <option value="moderate">Moderate</option>
                        <option value="heavy">Heavy</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Exudate Type</label>
                      <select {...register('exudateType')} className="input">
                        <option value="">Select type</option>
                        <option value="serous">Serous</option>
                        <option value="sanguineous">Sanguineous</option>
                        <option value="serosanguineous">Serosanguineous</option>
                        <option value="purulent">Purulent</option>
                      </select>
                    </div>
                  </div>

                  {/* Pain and Odor */}
                  <div className="form-grid-2">
                    <div>
                      <label className="label">Pain Level (0-10) *</label>
                      <input type="range" min="0" max="10" {...register('painLevel', { valueAsNumber: true })} className="w-full" />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>No pain</span>
                        <span className="font-medium">{watch('painLevel')}/10</span>
                        <span>Worst pain</span>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" {...register('odor')} className="w-5 h-5 rounded text-sky-600" />
                        <div>
                          <span className="font-medium">Odor Present</span>
                          <p className="text-sm text-gray-500">Wound has noticeable odor</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="label">Peri-wound Condition</label>
                    <textarea {...register('periWoundCondition')} rows={2} className="input" placeholder="Describe surrounding skin condition..." />
                  </div>
                </div>

                <div className="flex justify-end gap-4 mt-6 pt-6 border-t">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <Save size={18} />
                    Save Assessment
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wound Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedWound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <CircleDot className="w-6 h-6 text-rose-500" />
                    Wound Details
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {patientMap.get(selectedWound.patientId)?.firstName} {patientMap.get(selectedWound.patientId)?.lastName} - {selectedWound.location}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const patient = patientMap.get(selectedWound.patientId);
                      generateWoundPDFFromEntity(selectedWound, patient);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-rose-100 text-rose-700 rounded-lg hover:bg-rose-200 transition-colors"
                    title="Export as PDF"
                  >
                    <FileText size={18} />
                    <span className="hidden sm:inline">Export PDF</span>
                  </button>
                  <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column - Wound Info */}
                  <div className="space-y-4">
                    {/* Phase Badge */}
                    <div className={`p-4 rounded-lg ${woundPhases[determineWoundPhase(selectedWound.tissueType)].color}`}>
                      <h3 className="font-bold">{woundPhases[determineWoundPhase(selectedWound.tissueType)].name}</h3>
                      <p className="text-sm opacity-80">{woundPhases[determineWoundPhase(selectedWound.tissueType)].description}</p>
                      <p className="mt-2 font-medium">Dressing: {woundPhases[determineWoundPhase(selectedWound.tissueType)].dressingFrequency}</p>
                    </div>

                    {/* Wound Info Card */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Info size={16} />
                        Wound Information
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <span className="ml-2 font-medium">{selectedWound.type.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Etiology:</span>
                          <span className="ml-2 font-medium">{selectedWound.etiology}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Location:</span>
                          <span className="ml-2 font-medium">{selectedWound.location}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <span className="ml-2 font-medium">{differenceInDays(new Date(), new Date(selectedWound.createdAt))} days</span>
                        </div>
                      </div>
                    </div>

                    {/* Measurements */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Ruler size={16} />
                        Current Measurements
                      </h4>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold text-gray-900">{selectedWound.length}</p>
                          <p className="text-xs text-gray-500">Length (cm)</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold text-gray-900">{selectedWound.width}</p>
                          <p className="text-xs text-gray-500">Width (cm)</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold text-gray-900">{selectedWound.depth || '-'}</p>
                          <p className="text-xs text-gray-500">Depth (cm)</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-lg">
                          <p className="text-2xl font-bold text-rose-600">{selectedWound.area?.toFixed(1)}</p>
                          <p className="text-xs text-gray-500">Area (cm²)</p>
                        </div>
                      </div>
                    </div>

                    {/* Clinical Status */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Activity size={16} />
                        Clinical Status
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Healing Progress:</span>
                          <span className="flex items-center gap-2 font-medium">
                            {getProgressIcon(selectedWound.healingProgress)}
                            {selectedWound.healingProgress}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Exudate:</span>
                          <span className={`badge ${
                            selectedWound.exudateAmount === 'heavy' ? 'badge-danger' :
                            selectedWound.exudateAmount === 'moderate' ? 'badge-warning' :
                            selectedWound.exudateAmount === 'light' ? 'badge-info' : 'badge-secondary'
                          }`}>
                            {selectedWound.exudateAmount} {selectedWound.exudateType && `- ${selectedWound.exudateType}`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Pain Level:</span>
                          <span className="font-medium">{selectedWound.painLevel}/10</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">Odor:</span>
                          <span className={`font-medium ${selectedWound.odor ? 'text-red-600' : 'text-green-600'}`}>
                            {selectedWound.odor ? 'Present' : 'None'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm text-gray-500">Tissue Types:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedWound.tissueType.map((tissue) => {
                            const tissueInfo = tissueTypes.find(t => t.value === tissue);
                            return (
                              <span key={tissue} className={`badge text-xs ${tissueInfo?.color || 'bg-gray-100'}`}>
                                {tissue}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Dressing Protocol */}
                    <div className="bg-sky-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Recommended Dressing Protocol</h4>
                      <ol className="space-y-2">
                        {woundPhases[determineWoundPhase(selectedWound.tissueType)].protocol.map((step, index) => (
                          <li key={index} className="flex items-start gap-3 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 bg-sky-200 text-sky-700 rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Right Column - Treatment Plans */}
                  <div>
                    <TreatmentPlanCard
                      patientId={selectedWound.patientId}
                      relatedEntityId={selectedWound.id}
                      relatedEntityType="wound"
                      clinicianId={user?.id || ''}
                      clinicianName={`${user?.firstName || ''} ${user?.lastName || ''}`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Wound Planimetry Modal */}
      <AnimatePresence>
        {showAIPlanimetry && (
          <AIWoundPlanimetry
            onMeasurementComplete={(measurement, imageData) => {
              // Auto-populate form fields with AI measurements
              setValue('length', measurement.length);
              setValue('width', measurement.width);
              if (measurement.depth) {
                setValue('depth', measurement.depth);
              }
              setWoundImageData(imageData);
              setShowAIPlanimetry(false);
              toast.success('Measurements applied to form');
            }}
            onCancel={() => setShowAIPlanimetry(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
