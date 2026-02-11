import { useState, useEffect, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../database/db';
import { PatientOps, SurgeryOps, EncounterOps, InvestigationOps, PrescriptionOps, WoundOps, AdmissionOps, ConsumableBOMOps } from '../../../database/operations';
import { CONFERENCE_SLIDES } from '../types';
import type { Patient, Surgery, ClinicalEncounter, Investigation, Prescription, Wound, Admission, PreoperativeAssessment, ConsumableBOM } from '../../../types';
import SlideWrapper from '../components/SlideWrapper';
import ClinicalSummarySlide from '../components/ClinicalSummarySlide';
import ComorbiditiesSlide from '../components/ComorbiditiesSlide';
import ClinicalPhotographsSlide from '../components/ClinicalPhotographsSlide';
import LaboratoryResultsSlide from '../components/LaboratoryResultsSlide';
import CurrentMedicationsSlide from '../components/CurrentMedicationsSlide';
import AnaesthetistCommentsSlide from '../components/AnaesthetistCommentsSlide';
import PlannedProceduresSlide from '../components/PlannedProceduresSlide';
import ShoppingListSlide from '../components/ShoppingListSlide';
import {
  Presentation,
  Search,
  Play,
  FileText,
  Heart,
  Camera,
  TestTube2,
  Pill,
  Stethoscope,
  Scissors,
  ShoppingCart,
  User,
  X,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const slideIcons: Record<string, React.ReactNode> = {
  FileText: <FileText size={18} />,
  Heart: <Heart size={18} />,
  Camera: <Camera size={18} />,
  TestTube2: <TestTube2 size={18} />,
  Pill: <Pill size={18} />,
  Stethoscope: <Stethoscope size={18} />,
  Scissors: <Scissors size={18} />,
  ShoppingCart: <ShoppingCart size={18} />,
};

export default function PreSurgicalConferencePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [, setSelectedPatientId] = useState<string | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Patient data states
  const [patient, setPatient] = useState<Patient | null>(null);
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [encounters, setEncounters] = useState<ClinicalEncounter[]>([]);
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [wounds, setWounds] = useState<Wound[]>([]);
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [assessments, setAssessments] = useState<PreoperativeAssessment[]>([]);
  const [consumableBOMs, setConsumableBOMs] = useState<ConsumableBOM[]>([]);

  // Search patients
  const patients = useLiveQuery(
    () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      const term = searchTerm.toLowerCase();
      return db.patients
        .filter(p =>
          p.firstName.toLowerCase().includes(term) ||
          p.lastName.toLowerCase().includes(term) ||
          p.hospitalNumber.toLowerCase().includes(term)
        )
        .limit(10)
        .toArray();
    },
    [searchTerm]
  );

  // Load all patient data
  const loadPatientData = useCallback(async (patientId: string) => {
    setIsLoadingData(true);
    try {
      const [
        patientData,
        surgeriesData,
        encountersData,
        investigationsData,
        prescriptionsData,
        woundsData,
        admissionsData,
        assessmentsData,
        bomsData,
      ] = await Promise.all([
        PatientOps.getById(patientId),
        SurgeryOps.getByPatient(patientId),
        EncounterOps.getByPatient(patientId),
        InvestigationOps.getByPatient(patientId),
        PrescriptionOps.getByPatient(patientId),
        WoundOps.getByPatient(patientId),
        AdmissionOps.getByPatient(patientId),
        db.preoperativeAssessments.where('patientId').equals(patientId).toArray(),
        ConsumableBOMOps.getByPatient(patientId),
      ]);

      if (!patientData) {
        toast.error('Patient not found');
        return;
      }

      setPatient(patientData);
      setSurgeries(surgeriesData);
      setEncounters(encountersData);
      setInvestigations(investigationsData);
      setPrescriptions(prescriptionsData);
      setWounds(woundsData);
      setAdmissions(admissionsData);
      setAssessments(assessmentsData);
      setConsumableBOMs(bomsData);
      toast.success(`Loaded data for ${patientData.firstName} ${patientData.lastName}`);
    } catch (error) {
      console.error('Failed to load patient data:', error);
      toast.error('Failed to load patient data');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId);
    setSearchTerm('');
    loadPatientData(patientId);
  };

  const startPresentation = (slideIndex = 0) => {
    if (!patient) {
      toast.error('Please select a patient first');
      return;
    }
    setCurrentSlideIndex(slideIndex);
    setIsPresentationMode(true);
  };

  const exitPresentation = () => {
    setIsPresentationMode(false);
  };

  const nextSlide = () => {
    if (currentSlideIndex < CONFERENCE_SLIDES.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  // Keyboard navigation in presentation
  useEffect(() => {
    if (!isPresentationMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          prevSlide();
          break;
        case 'Escape':
          exitPresentation();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode, currentSlideIndex]);

  const patientFullName = patient ? `${patient.firstName} ${patient.lastName}` : '';

  // Render slide content
  const renderSlideContent = () => {
    const slide = CONFERENCE_SLIDES[currentSlideIndex];
    if (!patient) return null;

    switch (slide.type) {
      case 'clinical-summary':
        return <ClinicalSummarySlide patient={patient} surgeries={surgeries} admissions={admissions} />;
      case 'comorbidities':
        return <ComorbiditiesSlide comorbidities={patient.comorbidities || []} patientName={patientFullName} />;
      case 'clinical-photographs':
        return <ClinicalPhotographsSlide encounters={encounters} wounds={wounds} patientName={patientFullName} />;
      case 'laboratory-results':
        return <LaboratoryResultsSlide investigations={investigations} patientName={patientFullName} />;
      case 'current-medications':
        return <CurrentMedicationsSlide prescriptions={prescriptions} patientName={patientFullName} />;
      case 'anaesthetist-comments':
        return <AnaesthetistCommentsSlide assessments={assessments} patientName={patientFullName} />;
      case 'planned-procedures':
        return <PlannedProceduresSlide surgeries={surgeries} patientName={patientFullName} />;
      case 'shopping-list':
        return <ShoppingListSlide consumableBOMs={consumableBOMs} patientName={patientFullName} />;
      default:
        return null;
    }
  };

  // Fullscreen presentation mode
  if (isPresentationMode && patient) {
    const slide = CONFERENCE_SLIDES[currentSlideIndex];
    return (
      <SlideWrapper
        title={slide.title}
        subtitle={`${patient.firstName} ${patient.lastName} — ${patient.hospitalNumber}`}
        onExit={exitPresentation}
        slideNumber={currentSlideIndex + 1}
        totalSlides={CONFERENCE_SLIDES.length}
        onNext={nextSlide}
        onPrev={prevSlide}
      >
        {renderSlideContent()}
      </SlideWrapper>
    );
  }

  // Normal page view - patient selection and slide menu
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Presentation size={28} className="text-primary" />
            Pre-Surgical Conference
          </h1>
          <p className="text-gray-500 mt-1">
            Select a patient to begin case presentation
          </p>
        </div>
        {patient && (
          <button
            onClick={() => startPresentation(0)}
            disabled={isLoadingData}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            <Play size={20} />
            Start Presentation
          </button>
        )}
      </div>

      {/* Patient Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Search Patient
        </label>
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by name or hospital number..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" title="Clear search">
              <X size={18} />
            </button>
          )}
        </div>

        {/* Search Results */}
        {patients && patients.length > 0 && (
          <div className="mt-2 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden divide-y divide-gray-100 dark:divide-gray-700 max-h-60 overflow-y-auto">
            {patients.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPatient(p.id)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {p.firstName} {p.middleName ? `${p.middleName} ` : ''}{p.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{p.hospitalNumber} • {p.gender} • {p.phone}</p>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}

        {searchTerm && searchTerm.length >= 2 && patients && patients.length === 0 && (
          <p className="mt-2 text-sm text-gray-500 italic">No patients found matching &ldquo;{searchTerm}&rdquo;</p>
        )}
      </div>

      {/* Selected Patient Info */}
      {patient && (
        <div className="bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/20 dark:to-blue-900/20 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center gap-4">
            {patient.photo ? (
              <img src={patient.photo} alt="Patient" className="w-16 h-16 rounded-full object-cover border-2 border-primary/30" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User size={28} className="text-primary" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {patient.firstName} {patient.middleName ? `${patient.middleName} ` : ''}{patient.lastName}
              </h2>
              <p className="text-gray-500">
                {patient.hospitalNumber} • {patient.gender} • {patient.phone}
              </p>
            </div>
            {isLoadingData && (
              <div className="flex items-center gap-2 text-primary">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide Selection Grid */}
      {patient && !isLoadingData && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Presentation Slides</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CONFERENCE_SLIDES.map((slide, index) => {
              const dataCount = getSlideDataCount(slide.type, {
                patient,
                surgeries,
                encounters,
                investigations,
                prescriptions,
                wounds,
                admissions,
                assessments,
                consumableBOMs,
              });

              return (
                <button
                  key={slide.type}
                  onClick={() => startPresentation(index)}
                  className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      {slideIcons[slide.icon]}
                    </div>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full">
                      {index + 1}/{CONFERENCE_SLIDES.length}
                    </span>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{slide.title}</h4>
                  <p className="text-sm text-gray-500">{dataCount}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!patient && !searchTerm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Presentation size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">
            No Patient Selected
          </h3>
          <p className="text-gray-400 dark:text-gray-500 max-w-md mx-auto">
            Search for a patient above to load their clinical data and begin the pre-surgical conference presentation.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper to get human-readable data count for each slide
function getSlideDataCount(
  slideType: string,
  data: {
    patient: Patient;
    surgeries: Surgery[];
    encounters: ClinicalEncounter[];
    investigations: Investigation[];
    prescriptions: Prescription[];
    wounds: Wound[];
    admissions: Admission[];
    assessments: PreoperativeAssessment[];
    consumableBOMs: ConsumableBOM[];
  }
): string {
  switch (slideType) {
    case 'clinical-summary':
      return `${data.admissions.filter(a => a.status === 'active').length} active admission(s)`;
    case 'comorbidities': {
      const count = data.patient.comorbidities?.length || 0;
      return `${count} condition${count !== 1 ? 's' : ''}`;
    }
    case 'clinical-photographs': {
      let count = 0;
      data.encounters.forEach(e => { count += e.clinicalPhotos?.length || 0; });
      data.wounds.forEach(w => { count += w.photos?.length || 0; });
      return `${count} photograph${count !== 1 ? 's' : ''}`;
    }
    case 'laboratory-results':
      return `${data.investigations.length} investigation${data.investigations.length !== 1 ? 's' : ''}`;
    case 'current-medications': {
      const active = data.prescriptions.filter(p => p.status === 'pending' || p.status === 'dispensed' || p.status === 'partially_dispensed');
      const medCount = active.reduce((sum, p) => sum + p.medications.length, 0);
      return `${medCount} medication${medCount !== 1 ? 's' : ''}`;
    }
    case 'anaesthetist-comments':
      return `${data.assessments.length} assessment${data.assessments.length !== 1 ? 's' : ''}`;
    case 'planned-procedures': {
      const planned = data.surgeries.filter(s => ['scheduled', 'ready_for_preanaesthetic_review', 'incomplete_preparation'].includes(s.status));
      return `${planned.length} planned, ${data.surgeries.length} total`;
    }
    case 'shopping-list':
      return `${data.consumableBOMs.length} BOM${data.consumableBOMs.length !== 1 ? 's' : ''}`;
    default:
      return '';
  }
}
