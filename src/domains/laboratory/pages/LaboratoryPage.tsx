import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  FlaskConical,
  Search,
  Clock,
  CheckCircle,
  User,
  X,
  Save,
  Beaker,
  Activity,
  TestTube,
  FileText,
  Syringe,
  Upload,
  AlertTriangle,
  Phone,
  Calendar,
  Droplets,
  Download,
  Scan,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';
import { generateLabResultPDF, generateLabRequestFormPDF } from '../../../utils/clinicalPdfGenerators';
import { OCRScanner } from '../../../components/common';
import type { LabRequest, LabTest, LabCategory } from '../../../types';
import { PatientSelector } from '../../../components/patient';

const labRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  priority: z.enum(['routine', 'urgent', 'stat']),
  clinicalInfo: z.string().optional(),
});

type LabRequestFormData = z.infer<typeof labRequestSchema>;

// Common laboratory tests organized by category
const labTests: { category: LabCategory; name: string; tests: { name: string; specimen: string; unit?: string; refRange?: string }[] }[] = [
  {
    category: 'haematology',
    name: 'Haematology',
    tests: [
      { name: 'Full Blood Count (FBC)', specimen: 'EDTA Blood', unit: '', refRange: '' },
      { name: 'Haemoglobin', specimen: 'EDTA Blood', unit: 'g/dL', refRange: 'M: 13-17, F: 12-16' },
      { name: 'PCV/Haematocrit', specimen: 'EDTA Blood', unit: '%', refRange: 'M: 40-54, F: 36-48' },
      { name: 'White Blood Cell Count', specimen: 'EDTA Blood', unit: 'x10⁹/L', refRange: '4.0-11.0' },
      { name: 'Platelet Count', specimen: 'EDTA Blood', unit: 'x10⁹/L', refRange: '150-400' },
      { name: 'ESR', specimen: 'EDTA Blood', unit: 'mm/hr', refRange: 'M: 0-15, F: 0-20' },
      { name: 'Blood Group & Rhesus', specimen: 'EDTA Blood', unit: '', refRange: '' },
      { name: 'Coagulation Profile (PT/INR/APTT)', specimen: 'Citrated Blood', unit: '', refRange: '' },
      { name: 'Sickling Test', specimen: 'EDTA Blood', unit: '', refRange: 'Negative' },
      { name: 'Haemoglobin Electrophoresis', specimen: 'EDTA Blood', unit: '', refRange: 'AA' },
      { name: 'G6PD Assay', specimen: 'EDTA Blood', unit: 'U/g Hb', refRange: '4.6-13.5' },
      { name: 'Peripheral Blood Film', specimen: 'EDTA Blood', unit: '', refRange: '' },
    ],
  },
  {
    category: 'biochemistry',
    name: 'Biochemistry',
    tests: [
      { name: 'Fasting Blood Glucose', specimen: 'Fluoride Blood', unit: 'mmol/L', refRange: '3.9-5.6' },
      { name: 'Random Blood Glucose', specimen: 'Fluoride Blood', unit: 'mmol/L', refRange: '<7.8' },
      { name: 'HbA1c', specimen: 'EDTA Blood', unit: '%', refRange: '<5.7' },
      { name: 'Renal Function Tests', specimen: 'Serum', unit: '', refRange: '' },
      { name: 'Urea', specimen: 'Serum', unit: 'mmol/L', refRange: '2.5-6.7' },
      { name: 'Creatinine', specimen: 'Serum', unit: 'µmol/L', refRange: 'M: 62-106, F: 44-80' },
      { name: 'Electrolytes (Na, K, Cl, HCO3)', specimen: 'Serum', unit: 'mmol/L', refRange: '' },
      { name: 'Sodium', specimen: 'Serum', unit: 'mmol/L', refRange: '135-145' },
      { name: 'Potassium', specimen: 'Serum', unit: 'mmol/L', refRange: '3.5-5.0' },
      { name: 'Liver Function Tests', specimen: 'Serum', unit: '', refRange: '' },
      { name: 'Total Protein', specimen: 'Serum', unit: 'g/L', refRange: '60-80' },
      { name: 'Albumin', specimen: 'Serum', unit: 'g/L', refRange: '35-50' },
      { name: 'Total Bilirubin', specimen: 'Serum', unit: 'µmol/L', refRange: '5-21' },
      { name: 'ALT/SGPT', specimen: 'Serum', unit: 'U/L', refRange: '7-56' },
      { name: 'AST/SGOT', specimen: 'Serum', unit: 'U/L', refRange: '10-40' },
      { name: 'ALP', specimen: 'Serum', unit: 'U/L', refRange: '44-147' },
      { name: 'Lipid Profile', specimen: 'Fasting Serum', unit: '', refRange: '' },
      { name: 'Calcium', specimen: 'Serum', unit: 'mmol/L', refRange: '2.2-2.6' },
      { name: 'Phosphate', specimen: 'Serum', unit: 'mmol/L', refRange: '0.8-1.5' },
      { name: 'Magnesium', specimen: 'Serum', unit: 'mmol/L', refRange: '0.7-1.0' },
      { name: 'Uric Acid', specimen: 'Serum', unit: 'µmol/L', refRange: 'M: 200-430, F: 140-360' },
      { name: 'Amylase', specimen: 'Serum', unit: 'U/L', refRange: '28-100' },
      { name: 'Lipase', specimen: 'Serum', unit: 'U/L', refRange: '0-160' },
      { name: 'CRP', specimen: 'Serum', unit: 'mg/L', refRange: '<5' },
      { name: 'Procalcitonin', specimen: 'Serum', unit: 'ng/mL', refRange: '<0.5' },
      { name: 'Lactate', specimen: 'Arterial Blood', unit: 'mmol/L', refRange: '0.5-2.0' },
      { name: 'Troponin I/T', specimen: 'Serum', unit: 'ng/mL', refRange: '<0.04' },
      { name: 'D-Dimer', specimen: 'Citrated Blood', unit: 'ng/mL', refRange: '<500' },
    ],
  },
  {
    category: 'microbiology',
    name: 'Microbiology',
    tests: [
      { name: 'Wound Swab M/C/S', specimen: 'Wound Swab', unit: '', refRange: '' },
      { name: 'Blood Culture', specimen: 'Blood', unit: '', refRange: '' },
      { name: 'Urine M/C/S', specimen: 'Mid-stream Urine', unit: '', refRange: '' },
      { name: 'Stool M/C/S', specimen: 'Stool', unit: '', refRange: '' },
      { name: 'Sputum M/C/S', specimen: 'Sputum', unit: '', refRange: '' },
      { name: 'CSF M/C/S', specimen: 'CSF', unit: '', refRange: '' },
      { name: 'High Vaginal Swab', specimen: 'HVS', unit: '', refRange: '' },
      { name: 'Throat Swab', specimen: 'Throat Swab', unit: '', refRange: '' },
      { name: 'AFB (ZN Stain)', specimen: 'Sputum', unit: '', refRange: 'Negative' },
      { name: 'GeneXpert MTB/RIF', specimen: 'Sputum', unit: '', refRange: 'Not Detected' },
    ],
  },
  {
    category: 'serology',
    name: 'Serology/Immunology',
    tests: [
      { name: 'HIV 1&2 Antibodies', specimen: 'Serum', unit: '', refRange: 'Non-reactive' },
      { name: 'HBsAg', specimen: 'Serum', unit: '', refRange: 'Negative' },
      { name: 'Anti-HCV', specimen: 'Serum', unit: '', refRange: 'Negative' },
      { name: 'VDRL/RPR', specimen: 'Serum', unit: '', refRange: 'Non-reactive' },
      { name: 'Widal Test', specimen: 'Serum', unit: '', refRange: '<1:80' },
      { name: 'Malaria Parasite (RDT/Film)', specimen: 'EDTA Blood', unit: '', refRange: 'Not Seen' },
      { name: 'Rheumatoid Factor', specimen: 'Serum', unit: 'IU/mL', refRange: '<14' },
      { name: 'ANA', specimen: 'Serum', unit: '', refRange: 'Negative' },
      { name: 'PSA', specimen: 'Serum', unit: 'ng/mL', refRange: '<4.0' },
      { name: 'CEA', specimen: 'Serum', unit: 'ng/mL', refRange: '<3.0' },
      { name: 'AFP', specimen: 'Serum', unit: 'ng/mL', refRange: '<10' },
      { name: 'CA 125', specimen: 'Serum', unit: 'U/mL', refRange: '<35' },
      { name: 'CA 19-9', specimen: 'Serum', unit: 'U/mL', refRange: '<37' },
      { name: 'Thyroid Function Tests', specimen: 'Serum', unit: '', refRange: '' },
    ],
  },
  {
    category: 'urinalysis',
    name: 'Urinalysis',
    tests: [
      { name: 'Urinalysis (Dipstick)', specimen: 'Urine', unit: '', refRange: '' },
      { name: '24-hour Urine Protein', specimen: '24hr Urine', unit: 'g/24hr', refRange: '<0.15' },
      { name: 'Urine Creatinine', specimen: 'Urine', unit: 'mmol/L', refRange: '' },
      { name: 'Urine Electrolytes', specimen: 'Urine', unit: '', refRange: '' },
      { name: 'Pregnancy Test (Urine)', specimen: 'Urine', unit: '', refRange: '' },
    ],
  },
  {
    category: 'histopathology',
    name: 'Histopathology',
    tests: [
      { name: 'Tissue Biopsy', specimen: 'Tissue in Formalin', unit: '', refRange: '' },
      { name: 'FNAC', specimen: 'Aspirate', unit: '', refRange: '' },
      { name: 'Frozen Section', specimen: 'Fresh Tissue', unit: '', refRange: '' },
      { name: 'Pap Smear', specimen: 'Cervical Smear', unit: '', refRange: '' },
      { name: 'Fluid Cytology', specimen: 'Fluid', unit: '', refRange: '' },
    ],
  },
];

// GFR Calculator - Reserved for future clinical use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const calculateGFR = (creatinine: number, age: number, gender: 'male' | 'female', race: 'african' | 'other'): number => {
  // CKD-EPI equation
  let gfr: number;
  const kappa = gender === 'female' ? 0.7 : 0.9;
  const alpha = gender === 'female' ? -0.329 : -0.411;
  const creatMgDl = creatinine / 88.4; // Convert µmol/L to mg/dL
  
  const minCr = Math.min(creatMgDl / kappa, 1);
  const maxCr = Math.max(creatMgDl / kappa, 1);
  
  gfr = 141 * Math.pow(minCr, alpha) * Math.pow(maxCr, -1.209) * Math.pow(0.993, age);
  if (gender === 'female') gfr *= 1.018;
  if (race === 'african') gfr *= 1.159;
  
  return Math.round(gfr);
};
void calculateGFR; // Export reserved for future use

export default function LaboratoryPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['haematology', 'biochemistry']);
  
  // New state for enhanced workflow
  const [activeTab, setActiveTab] = useState<'requests' | 'collection' | 'results'>('requests');
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { result: string; isAbnormal: boolean; notes?: string }>>({});
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [showOCRScanner, setShowOCRScanner] = useState(false);
  const [ocrExtractedText, setOcrExtractedText] = useState<string>('');

  const labRequests = useLiveQuery(() => db.labRequests.orderBy('requestedAt').reverse().toArray(), []);
  const patients = useLiveQuery(() => db.patients.toArray(), []);

  const patientMap = useMemo(() => {
    const map = new Map();
    patients?.forEach(p => map.set(p.id, p));
    return map;
  }, [patients]);

  // Selected patient details
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return null;
    return patientMap.get(selectedPatientId) || null;
  }, [selectedPatientId, patientMap]);

  // Handle patient selection
  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<LabRequestFormData>({
    resolver: zodResolver(labRequestSchema),
    defaultValues: {
      priority: 'routine',
    },
  });

  // Handle sample collection
  const handleCollectSample = async () => {
    if (!selectedRequest || !user) return;

    try {
      await db.labRequests.update(selectedRequest.id, {
        status: 'collected',
        collectedAt: new Date(),
      });
      const updatedRequest = await db.labRequests.get(selectedRequest.id);
      if (updatedRequest) syncRecord('labRequests', updatedRequest as unknown as Record<string, unknown>);
      toast.success('Sample collection recorded successfully!');
      setShowCollectionModal(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error recording collection:', error);
      toast.error('Failed to record sample collection');
    }
  };

  // Handle result upload
  const handleUploadResults = async () => {
    if (!selectedRequest || !user) return;

    try {
      const updatedTests = selectedRequest.tests.map(test => ({
        ...test,
        result: testResults[test.id]?.result || test.result,
        isAbnormal: testResults[test.id]?.isAbnormal || test.isAbnormal,
        notes: testResults[test.id]?.notes || test.notes,
      }));

      const allTestsHaveResults = updatedTests.every(test => test.result);

      await db.labRequests.update(selectedRequest.id, {
        tests: updatedTests,
        status: allTestsHaveResults ? 'completed' : 'processing',
        completedAt: allTestsHaveResults ? new Date() : undefined,
      });
      const updatedRequest = await db.labRequests.get(selectedRequest.id);
      if (updatedRequest) syncRecord('labRequests', updatedRequest as unknown as Record<string, unknown>);

      toast.success(allTestsHaveResults ? 'All results uploaded - Request completed!' : 'Results saved successfully!');
      setShowResultModal(false);
      setSelectedRequest(null);
      setTestResults({});
    } catch (error) {
      console.error('Error uploading results:', error);
      toast.error('Failed to upload results');
    }
  };

  // Open collection modal
  const openCollectionModal = (request: LabRequest) => {
    setSelectedRequest(request);
    setShowCollectionModal(true);
  };

  // Open result modal
  const openResultModal = (request: LabRequest) => {
    setSelectedRequest(request);
    // Pre-populate existing results
    const existingResults: Record<string, { result: string; isAbnormal: boolean; notes?: string }> = {};
    request.tests.forEach(test => {
      existingResults[test.id] = {
        result: test.result || '',
        isAbnormal: test.isAbnormal || false,
        notes: test.notes || '',
      };
    });
    setTestResults(existingResults);
    setShowResultModal(true);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleTest = (testName: string) => {
    setSelectedTests(prev =>
      prev.includes(testName)
        ? prev.filter(t => t !== testName)
        : [...prev, testName]
    );
  };

  const selectAllInCategory = (category: LabCategory) => {
    const categoryTests = labTests.find(c => c.category === category);
    if (categoryTests) {
      const testNames = categoryTests.tests.map(t => t.name);
      const allSelected = testNames.every(t => selectedTests.includes(t));
      if (allSelected) {
        setSelectedTests(prev => prev.filter(t => !testNames.includes(t)));
      } else {
        setSelectedTests(prev => [...new Set([...prev, ...testNames])]);
      }
    }
  };

  const filteredRequests = useMemo(() => {
    if (!labRequests) return [];
    return labRequests.filter((req) => {
      const patient = patientMap.get(req.patientId);
      const matchesSearch = searchQuery === '' ||
        (patient && `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [labRequests, searchQuery, statusFilter, patientMap]);

  const onSubmit = async (data: LabRequestFormData) => {
    if (!user || selectedTests.length === 0) {
      toast.error('Please select at least one test');
      return;
    }

    try {
      const tests: LabTest[] = selectedTests.map(testName => {
        const testInfo = labTests.flatMap(c => c.tests).find(t => t.name === testName);
        const category = labTests.find(c => c.tests.some(t => t.name === testName))?.category || 'biochemistry';
        return {
          id: uuidv4(),
          name: testName,
          category,
          specimen: testInfo?.specimen || 'Blood',
          referenceRange: testInfo?.refRange,
          unit: testInfo?.unit,
        };
      });

      const labRequest: LabRequest = {
        id: uuidv4(),
        patientId: data.patientId,
        hospitalId: user.hospitalId || 'hospital-1',
        tests,
        priority: data.priority,
        clinicalInfo: data.clinicalInfo,
        status: 'pending',
        requestedBy: user.id,
        requestedAt: new Date(),
      };

      await db.labRequests.add(labRequest);
      syncRecord('labRequests', labRequest as unknown as Record<string, unknown>);
      toast.success('Lab request submitted successfully!');
      setShowModal(false);
      setSelectedTests([]);
      reset();
    } catch (error) {
      console.error('Error submitting lab request:', error);
      toast.error('Failed to submit lab request');
    }
  };

  const getStatusBadge = (status: LabRequest['status']) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
      case 'collected':
        return <span className="badge badge-info"><Beaker size={12} /> Collected</span>;
      case 'processing':
        return <span className="badge badge-primary"><Activity size={12} /> Processing</span>;
      case 'completed':
        return <span className="badge badge-success"><CheckCircle size={12} /> Completed</span>;
      case 'cancelled':
        return <span className="badge badge-danger"><X size={12} /> Cancelled</span>;
      default:
        return null;
    }
  };

  const handleExportLabReport = async (request: LabRequest) => {
    const patient = patientMap.get(request.patientId);
    if (!patient) {
      toast.error('Patient information not found');
      return;
    }

    try {
      const requester = await db.users.get(request.requestedBy);
      const category = request.tests[0]?.category || 'General';

      generateLabResultPDF({
        requestId: request.id,
        requestedDate: new Date(request.requestedAt),
        completedDate: request.completedAt ? new Date(request.completedAt) : undefined,
        patient: {
          name: `${patient.firstName} ${patient.lastName}`,
          hospitalNumber: patient.hospitalNumber,
          age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
          gender: patient.gender,
          phone: patient.phone,
        },
        hospitalName: 'AstroHEALTH Innovations in Healthcare',
        hospitalPhone: '+234 902 872 4839',
        hospitalEmail: 'info.astrohealth@gmail.com',
        requestedBy: requester ? `${requester.firstName} ${requester.lastName}` : 'Unknown',
        priority: request.priority,
        category: category.charAt(0).toUpperCase() + category.slice(1),
        tests: request.tests.map(test => ({
          name: test.name,
          result: test.result,
          unit: test.unit,
          referenceRange: test.referenceRange,
          status: test.result ? (test.isAbnormal ? 'high' : 'normal') : undefined,
          specimen: test.specimen,
        })),
        clinicalInfo: request.clinicalInfo,
        // Map LabRequest status to PDF status format
        status: request.status === 'collected' || request.status === 'processing' 
          ? 'in_progress' 
          : request.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
      });

      toast.success('Lab report PDF downloaded');
    } catch (error) {
      console.error('Error generating lab report PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleDownloadRequestForm = async (request: LabRequest) => {
    const patient = patientMap.get(request.patientId);
    if (!patient) {
      toast.error('Patient information not found');
      return;
    }

    try {
      const requester = await db.users.get(request.requestedBy);

      generateLabRequestFormPDF({
        requestId: request.id,
        requestedDate: new Date(request.requestedAt),
        patient: {
          name: `${patient.firstName} ${patient.lastName}`,
          hospitalNumber: patient.hospitalNumber,
          age: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
          gender: patient.gender,
          phone: patient.phone,
        },
        hospitalName: 'AstroHEALTH Innovations in Healthcare',
        hospitalPhone: '+234 902 872 4839',
        hospitalEmail: 'info.astrohealth@gmail.com',
        requestedBy: requester ? `${requester.firstName} ${requester.lastName}` : 'Unknown',
        priority: request.priority,
        tests: request.tests.map(test => ({
          name: test.name,
          specimen: test.specimen,
          category: test.category,
        })),
        clinicalInfo: request.clinicalInfo,
      });

      toast.success('Lab request form downloaded');
    } catch (error) {
      console.error('Error generating lab request form PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };
  const stats = useMemo(() => {
    if (!labRequests) return { pending: 0, processing: 0, completed: 0, today: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      pending: labRequests.filter(r => r.status === 'pending').length,
      processing: labRequests.filter(r => r.status === 'processing' || r.status === 'collected').length,
      completed: labRequests.filter(r => r.status === 'completed').length,
      today: labRequests.filter(r => new Date(r.requestedAt) >= today).length,
    };
  }, [labRequests]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FlaskConical className="w-6 h-6 sm:w-7 sm:h-7 text-teal-500" />
            Laboratory & Investigations
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Request investigations, collect samples, and upload results
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} />
          New Lab Request
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="card p-1">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'requests'
                ? 'bg-teal-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText size={18} />
            <span>Investigation Requests</span>
            {stats.pending > 0 && (
              <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {stats.pending}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('collection')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'collection'
                ? 'bg-teal-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Syringe size={18} />
            <span>Sample Collection</span>
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'results'
                ? 'bg-teal-500 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Upload size={18} />
            <span>Result Upload</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <Beaker className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.processing}</p>
              <p className="text-sm text-gray-500">Processing</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-sm text-gray-500">Completed</p>
            </div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TestTube className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
              <p className="text-sm text-gray-500">Today</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name..."
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
            title="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="collected">Collected</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Lab Requests Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card overflow-hidden">
        <div className="overflow-x-auto -mx-px">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tests</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request) => {
                  const patient = patientMap.get(request.patientId);
                  return (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {patient ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                              <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>
                            </div>
                          </div>
                        ) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {request.tests.slice(0, 3).map((test) => (
                            <span key={test.id} className="badge badge-secondary text-xs">
                              {test.name}
                            </span>
                          ))}
                          {request.tests.length > 3 && (
                            <span className="badge badge-info text-xs">
                              +{request.tests.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`badge ${
                          request.priority === 'stat' ? 'badge-danger' :
                          request.priority === 'urgent' ? 'badge-warning' : 'badge-secondary'
                        }`}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(request.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(request.requestedAt), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          {/* Download Request Form - always available */}
                          <button
                            onClick={() => handleDownloadRequestForm(request)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download Lab Request Form"
                          >
                            <Download size={18} />
                          </button>
                          {/* Collect Sample - only for pending requests */}
                          {request.status === 'pending' && (
                            <button
                              onClick={() => openCollectionModal(request)}
                              className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                              title="Collect Sample"
                            >
                              <Syringe size={18} />
                            </button>
                          )}
                          {/* Upload Results - for collected or processing requests */}
                          {(request.status === 'collected' || request.status === 'processing') && (
                            <button
                              onClick={() => openResultModal(request)}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Upload Results"
                            >
                              <Upload size={18} />
                            </button>
                          )}
                          {/* Download Lab Report PDF - when results are available */}
                          <button
                            onClick={() => handleExportLabReport(request)}
                            className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            title="Download Lab Report PDF"
                          >
                            <FileText size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No lab requests found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Lab Request Modal */}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">New Lab Request</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[calc(90vh-80px)]">
                <div className="p-6 overflow-y-auto flex-1">
                  {/* Patient Selection */}
                  <div className="mb-6">
                    <label className="label">Patient *</label>
                    <PatientSelector
                      value={selectedPatientId}
                      onChange={(patientId) => {
                        handlePatientSelect(patientId || '');
                        setValue('patientId', patientId || '');
                      }}
                      error={errors.patientId?.message}
                    />
                  </div>

                  {/* Selected Patient Details */}
                  {selectedPatient && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-white rounded-full shadow-sm">
                          <User className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {selectedPatient.firstName} {selectedPatient.lastName}
                          </h3>
                          <p className="text-sm text-gray-500">{selectedPatient.hospitalNumber}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={14} />
                          <span>
                            {selectedPatient.dateOfBirth 
                              ? `${Math.floor((Date.now() - new Date(selectedPatient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} yrs`
                              : 'Age N/A'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <User size={14} />
                          <span className="capitalize">{selectedPatient.gender}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone size={14} />
                          <span>{selectedPatient.phone || 'N/A'}</span>
                        </div>
                        {selectedPatient.bloodGroup && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Droplets size={14} />
                            <span>{selectedPatient.bloodGroup}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="label">Priority *</label>
                      <select {...register('priority')} className="input">
                        <option value="routine">Routine</option>
                        <option value="urgent">Urgent</option>
                        <option value="stat">STAT</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Clinical Information</label>
                      <input {...register('clinicalInfo')} className="input" placeholder="e.g., Pre-operative workup" />
                    </div>
                  </div>

                  {/* Selected Tests Summary */}
                  {selectedTests.length > 0 && (
                    <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg">
                      <p className="text-sm font-medium text-teal-700 mb-2">
                        Selected Tests ({selectedTests.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {selectedTests.map((test) => (
                          <span key={test} className="badge badge-info text-xs">
                            {test}
                            <button
                              type="button"
                              onClick={() => toggleTest(test)}
                              className="ml-1 hover:text-red-500"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Test Categories */}
                  <div className="space-y-3">
                    {labTests.map((category) => (
                      <div key={category.category} className="border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleCategory(category.category)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-medium text-gray-900">{category.name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAllInCategory(category.category);
                              }}
                              className="text-xs text-teal-600 hover:text-teal-700"
                            >
                              Toggle All
                            </button>
                            <span className={`transform transition-transform ${expandedCategories.includes(category.category) ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          </div>
                        </button>
                        {expandedCategories.includes(category.category) && (
                          <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                            {category.tests.map((test) => (
                              <label
                                key={test.name}
                                className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                                  selectedTests.includes(test.name)
                                    ? 'bg-teal-100 border border-teal-300'
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedTests.includes(test.name)}
                                  onChange={() => toggleTest(test.name)}
                                  className="mt-1 w-4 h-4 rounded text-teal-600"
                                />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{test.name}</p>
                                  <p className="text-xs text-gray-500">{test.specimen}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center gap-4 p-6 border-t bg-gray-50">
                  <p className="text-sm text-gray-500">
                    {selectedTests.length} test(s) selected
                  </p>
                  <div className="flex gap-4">
                    <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={selectedTests.length === 0}>
                      <Save size={18} />
                      Submit Request
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sample Collection Modal */}
      <AnimatePresence>
        {showCollectionModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={() => setShowCollectionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b bg-sky-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-sky-100 rounded-lg">
                    <Syringe className="w-5 h-5 text-sky-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Sample Collection</h2>
                </div>
                <button onClick={() => setShowCollectionModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Patient Info */}
                {(() => {
                  const patient = patientMap.get(selectedRequest.patientId);
                  return patient && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <p className="font-semibold">{patient.firstName} {patient.lastName}</p>
                      </div>
                      <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>
                    </div>
                  );
                })()}

                {/* Specimens to Collect */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-sky-500" />
                    Specimens to Collect
                  </h3>
                  <div className="space-y-2">
                    {[...new Set(selectedRequest.tests.map(t => t.specimen))].map((specimen) => (
                      <div key={specimen} className="p-3 bg-sky-50 rounded-lg border border-sky-200">
                        <p className="font-medium text-sky-800">{specimen}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedRequest.tests
                            .filter(t => t.specimen === specimen)
                            .map(test => (
                              <span key={test.id} className="badge badge-secondary text-xs">
                                {test.name}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collection Details */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 text-emerald-700 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Collection Time</span>
                  </div>
                  <p className="text-sm text-emerald-600">{format(new Date(), 'EEEE, MMMM d, yyyy h:mm a')}</p>
                  <p className="text-sm text-emerald-600 mt-1">Collected by: {user?.firstName} {user?.lastName}</p>
                </div>
              </div>

              <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
                <button type="button" onClick={() => setShowCollectionModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={handleCollectSample} className="btn btn-primary">
                  <CheckCircle size={18} />
                  Confirm Collection
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Upload Modal */}
      <AnimatePresence>
        {showResultModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={() => setShowResultModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b bg-purple-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Upload className="w-5 h-5 text-purple-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Upload Test Results</h2>
                </div>
                <button onClick={() => setShowResultModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Patient Info */}
                {(() => {
                  const patient = patientMap.get(selectedRequest.patientId);
                  return patient && (
                    <div className="p-4 bg-gray-50 rounded-lg mb-4">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-semibold">{patient.firstName} {patient.lastName}</p>
                          <p className="text-sm text-gray-500">{patient.hospitalNumber}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Test Results Form */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <TestTube className="w-4 h-4 text-purple-500" />
                      Enter Results for Each Test
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowOCRScanner(!showOCRScanner)}
                      className="btn btn-sm btn-secondary flex items-center gap-2"
                    >
                      <Scan size={16} />
                      {showOCRScanner ? 'Hide Scanner' : 'Scan Lab Report'}
                    </button>
                  </div>
                  
                  {/* OCR Scanner for Lab Reports */}
                  {showOCRScanner && (
                    <div className="mb-4">
                      <OCRScanner
                        onTextExtracted={(text) => {
                          setOcrExtractedText(text);
                          toast.success('Lab report scanned! Review the extracted text below.');
                        }}
                        documentType="lab_report"
                      />
                      {ocrExtractedText && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">Extracted Lab Results</h4>
                            <button
                              type="button"
                              onClick={() => {
                                setOcrExtractedText('');
                                setShowOCRScanner(false);
                              }}
                              className="text-sm text-gray-500 hover:text-gray-700"
                            >
                              Clear
                            </button>
                          </div>
                          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border max-h-40 overflow-y-auto">
                            {ocrExtractedText}
                          </pre>
                          <p className="text-xs text-gray-500 mt-2">
                            Copy values from the extracted text above to fill in the test results below.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedRequest.tests.map((test) => (
                    <div key={test.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{test.name}</p>
                          <p className="text-sm text-gray-500">{test.specimen}</p>
                        </div>
                        <span className="badge badge-secondary text-xs">{test.category}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="label">Result {test.unit && `(${test.unit})`}</label>
                          <input
                            type="text"
                            value={testResults[test.id]?.result || ''}
                            onChange={(e) => setTestResults(prev => ({
                              ...prev,
                              [test.id]: { ...prev[test.id], result: e.target.value }
                            }))}
                            placeholder={test.referenceRange ? `Ref: ${test.referenceRange}` : 'Enter result'}
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="label">Notes</label>
                          <input
                            type="text"
                            value={testResults[test.id]?.notes || ''}
                            onChange={(e) => setTestResults(prev => ({
                              ...prev,
                              [test.id]: { ...prev[test.id], notes: e.target.value }
                            }))}
                            placeholder="Optional notes"
                            className="input"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={testResults[test.id]?.isAbnormal || false}
                            onChange={(e) => setTestResults(prev => ({
                              ...prev,
                              [test.id]: { ...prev[test.id], isAbnormal: e.target.checked }
                            }))}
                            className="w-4 h-4 rounded text-red-600"
                          />
                          <span className="text-sm text-red-600 flex items-center gap-1">
                            <AlertTriangle size={14} />
                            Flag as Abnormal
                          </span>
                        </label>
                        {test.referenceRange && (
                          <span className="text-xs text-gray-500 ml-auto">
                            Reference: {test.referenceRange}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center gap-4 p-6 border-t bg-gray-50">
                <p className="text-sm text-gray-500">
                  {Object.values(testResults).filter(r => r.result).length} of {selectedRequest.tests.length} results entered
                </p>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setShowResultModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button onClick={handleUploadResults} className="btn btn-primary">
                    <Save size={18} />
                    Save Results
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
