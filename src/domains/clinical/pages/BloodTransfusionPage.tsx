/**
 * Blood Transfusion Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Comprehensive blood transfusion management interface
 */

import { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Thermometer,
  Heart,
  FileText,
  AlertCircle,
  Play,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Download,
  Upload,
  Camera,
  FileUp,
  ClipboardList,
  Eye,
  BarChart3,
  PlusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../../database';
import { syncRecord } from '../../../services/cloudSyncService';
import { useAuth } from '../../../contexts/AuthContext';
import { PatientSelector } from '../../../components/patient';
import {
  bloodTransfusionService,
  bloodProductInfo,
  reactionProtocols,
  type BloodType,
  type BloodProduct,
  type TransfusionRequest,
  type TransfusionRecord,
  type TransfusionVitals,
  type TransfusionUrgency,
  type ReactionType,
} from '../../../services/bloodTransfusionService';
import {
  downloadTransfusionOrderPDF,
  downloadMonitoringChartPDF,
  type TransfusionOrderData,
  type TransfusionMonitoringChartData,
} from '../../../utils/transfusionPdfGenerator';
import TransfusionMonitoringChartView from '../components/TransfusionMonitoringChartView';
import type { TransfusionOrder, TransfusionMonitoringChart, TransfusionMonitoringEntry, Patient } from '../../../types';

type TabType = 'requests' | 'active' | 'orders' | 'charts' | 'inventory' | 'reactions' | 'mtp';

const bloodTypeColors: Record<BloodType, string> = {
  'O-': 'bg-gray-100 text-gray-800',
  'O+': 'bg-gray-200 text-gray-900',
  'A-': 'bg-blue-100 text-blue-800',
  'A+': 'bg-blue-200 text-blue-900',
  'B-': 'bg-green-100 text-green-800',
  'B+': 'bg-green-200 text-green-900',
  'AB-': 'bg-purple-100 text-purple-800',
  'AB+': 'bg-purple-200 text-purple-900',
};

const urgencyColors: Record<TransfusionUrgency, string> = {
  routine: 'bg-gray-100 text-gray-700',
  urgent: 'bg-yellow-100 text-yellow-700',
  emergency: 'bg-orange-100 text-orange-700',
  massive_transfusion: 'bg-red-100 text-red-700',
};

export default function BloodTransfusionPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [showChartUploadModal, setShowChartUploadModal] = useState(false);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [selectedTransfusionForVitals, setSelectedTransfusionForVitals] = useState<TransfusionRecord | null>(null);
  const [selectedOrderForView, setSelectedOrderForView] = useState<TransfusionOrder | null>(null);
  const [selectedChartForView, setSelectedChartForView] = useState<TransfusionMonitoringChart | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [selectedRequest, setSelectedRequest] = useState<TransfusionRequest | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['checklist']);

  // Mock data states
  const [requests, setRequests] = useState<TransfusionRequest[]>([]);
  const [activeTransfusions, setActiveTransfusions] = useState<TransfusionRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  
  // Chart upload states
  const [chartUploadFile, setChartUploadFile] = useState<File | null>(null);
  const [chartUploadPreview, setChartUploadPreview] = useState<string>('');
  const [chartOcrText, setChartOcrText] = useState('');
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [selectedPatientForChart, setSelectedPatientForChart] = useState<Patient | null>(null);
  
  // Digital monitoring chart states
  const [showCreateDigitalChartModal, setShowCreateDigitalChartModal] = useState(false);
  const [showDigitalChartView, setShowDigitalChartView] = useState(false);
  const [selectedDigitalChart, setSelectedDigitalChart] = useState<TransfusionMonitoringChart | null>(null);
  const [digitalChartPatientId, setDigitalChartPatientId] = useState('');
  const [digitalChartProductType, setDigitalChartProductType] = useState('');
  const [digitalChartUnitNumber, setDigitalChartUnitNumber] = useState('');
  const [digitalChartWardBed, setDigitalChartWardBed] = useState('');

  // Form states
  const [patientBloodType, setPatientBloodType] = useState<BloodType>('O+');
  const [urgency, setUrgency] = useState<TransfusionUrgency>('routine');
  const [indication, setIndication] = useState('');
  const [hemoglobin, setHemoglobin] = useState<number | ''>('');
  const [platelets, setPlatelets] = useState<number | ''>('');
  const [inr, setInr] = useState<number | ''>('');
  const [selectedProducts, setSelectedProducts] = useState<{ type: BloodProduct; units: number }[]>([]);

  // Vital signs for starting transfusion
  const [preVitals, setPreVitals] = useState<Partial<TransfusionVitals>>({
    temperature: 36.5,
    pulse: 80,
    bloodPressure: { systolic: 120, diastolic: 80 },
    respiratoryRate: 16,
    oxygenSaturation: 98,
  });

  // Data queries
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  const hospitals = useLiveQuery(() => db.hospitals.toArray(), []);
  const transfusionOrders = useLiveQuery(() => db.transfusionOrders.orderBy('createdAt').reverse().toArray(), []);
  const transfusionCharts = useLiveQuery(() => db.transfusionMonitoringCharts.orderBy('createdAt').reverse().toArray(), []);
  
  // Get default hospital
  const defaultHospital = useMemo(() => {
    if (!hospitals || hospitals.length === 0) return null;
    return hospitals[0];
  }, [hospitals]);
  
  // Selected patient details
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId || !patients) return null;
    return patients.find(p => p.id === selectedPatientId) || null;
  }, [selectedPatientId, patients]);
  
  // Auto-populate blood type when patient is selected
  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    const patient = patients?.find(p => p.id === patientId);
    if (patient?.bloodGroup) {
      // Map blood group to BloodType
      const bloodTypeMap: Record<string, BloodType> = {
        'A+': 'A+', 'A-': 'A-',
        'B+': 'B+', 'B-': 'B-',
        'AB+': 'AB+', 'AB-': 'AB-',
        'O+': 'O+', 'O-': 'O-',
      };
      if (bloodTypeMap[patient.bloodGroup]) {
        setPatientBloodType(bloodTypeMap[patient.bloodGroup]);
      }
    }
  };

  // Verification staff
  const [verifyingNurse1, setVerifyingNurse1] = useState('');
  const [verifyingNurse2, setVerifyingNurse2] = useState('');

  // Get compatible blood types
  const compatibleTypes = useMemo(() => {
    return bloodTransfusionService.getCompatibleTypes(patientBloodType, 'rbc');
  }, [patientBloodType]);

  // Assess transfusion need
  const transfusionAssessment = useMemo(() => {
    if (!hemoglobin) return null;
    return bloodTransfusionService.assessTransfusionNeed(
      hemoglobin as number,
      platelets as number | undefined,
      inr as number | undefined,
      'stable'
    );
  }, [hemoglobin, platelets, inr]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    );
  };

  // Handle request creation
  const handleCreateRequest = () => {
    if (!selectedPatientId || !indication || selectedProducts.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newRequest = bloodTransfusionService.createRequest({
      patientId: selectedPatientId,
      requestedBy: user?.id || '',
      urgency,
      indication,
      hemoglobinLevel: hemoglobin as number,
      plateletCount: platelets as number,
      inr: inr as number,
      products: selectedProducts.map(p => ({
        id: Date.now().toString(),
        productType: p.type,
        units: p.units,
      })),
      consentObtained: true,
    });

    setRequests(prev => [...prev, newRequest]);
    toast.success('Transfusion request submitted');
    setShowRequestModal(false);
    resetRequestForm();
  };

  const resetRequestForm = () => {
    setSelectedPatientId('');
    setIndication('');
    setHemoglobin('');
    setPlatelets('');
    setInr('');
    setSelectedProducts([]);
    setUrgency('routine');
  };

  // Generate and download transfusion order PDF
  const handleGenerateOrderPDF = async (order: TransfusionOrder) => {
    const patient = patients?.find(p => p.id === order.patientId);
    if (!patient) {
      toast.error('Patient not found');
      return;
    }
    
    const orderData: TransfusionOrderData = {
      orderId: order.orderId,
      orderDate: new Date(order.orderDate),
      orderedBy: order.orderedBy,
      ordererDesignation: order.ordererDesignation,
      patientName: `${patient.firstName} ${patient.lastName}`,
      hospitalNumber: patient.hospitalNumber,
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : undefined,
      age: patient.dateOfBirth ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
      gender: patient.gender || 'Unknown',
      wardBed: order.wardBed,
      diagnosis: order.diagnosis,
      patientBloodGroup: order.patientBloodGroup,
      patientRhFactor: order.patientRhFactor,
      patientGenotype: order.patientGenotype,
      antibodyScreenResult: order.antibodyScreenResult,
      crossmatchResult: order.crossmatchResult,
      crossmatchDate: order.crossmatchDate ? new Date(order.crossmatchDate) : undefined,
      indication: order.indication,
      hemoglobinLevel: order.hemoglobinLevel,
      plateletCount: order.plateletCount,
      inr: order.inr,
      urgency: order.urgency,
      productType: order.productType,
      productCode: order.productCode,
      numberOfUnits: order.numberOfUnits,
      volumePerUnit: order.volumePerUnit,
      bloodGroupOfProduct: order.bloodGroupOfProduct,
      donorId: order.donorId,
      collectionDate: order.collectionDate ? new Date(order.collectionDate) : undefined,
      expiryDate: order.expiryDate ? new Date(order.expiryDate) : undefined,
      bloodBankName: order.bloodBankName,
      bloodBankAddress: order.bloodBankAddress,
      bloodBankPhone: order.bloodBankPhone,
      screeningTests: order.screeningTests,
      rateOfTransfusion: order.rateOfTransfusion,
      estimatedDuration: order.estimatedDuration,
      preTransfusionVitals: order.preTransfusionVitals,
      consentObtained: order.consentObtained,
      consentDate: order.consentDate ? new Date(order.consentDate) : undefined,
      consentWitness: order.consentWitness,
      verifyingNurse1: order.verifyingNurse1,
      verifyingNurse2: order.verifyingNurse2,
      hospitalName: defaultHospital?.name || 'AstroHEALTH Hospital',
      hospitalAddress: defaultHospital?.address,
      hospitalPhone: defaultHospital?.phone,
      hospitalEmail: defaultHospital?.email,
    };
    
    try {
      await downloadTransfusionOrderPDF(orderData);
      toast.success('Transfusion order PDF downloaded');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };
  
  // Generate monitoring chart template PDF
  const handleGenerateChartTemplate = async () => {
    const chartData: TransfusionMonitoringChartData = {
      chartId: `CHART-${Date.now()}`,
      patientName: '',
      hospitalNumber: '',
      wardBed: '',
      date: new Date(),
      productType: '',
      unitNumber: '',
      entries: [],
      hospitalName: defaultHospital?.name || 'AstroHEALTH Hospital',
      hospitalAddress: defaultHospital?.address,
      hospitalPhone: defaultHospital?.phone,
      hospitalEmail: defaultHospital?.email,
    };
    
    try {
      await downloadMonitoringChartPDF(chartData, true);
      toast.success('Monitoring chart template downloaded');
    } catch (error) {
      console.error('Error generating chart template:', error);
      toast.error('Failed to generate chart template');
    }
  };
  
  // Handle file upload for chart
  const handleChartFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setChartUploadFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setChartUploadPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  // Simple OCR using Canvas (basic text extraction simulation)
  const handleProcessOCR = async () => {
    if (!chartUploadFile) {
      toast.error('Please upload an image first');
      return;
    }
    
    setIsProcessingOcr(true);
    
    // Simulate OCR processing (in real implementation, use Tesseract.js or cloud OCR)
    // For now, we'll create a placeholder
    setTimeout(() => {
      const simulatedOcrText = `
BLOOD TRANSFUSION MONITORING CHART
===================================
Patient: ${selectedPatientForChart?.firstName || ''} ${selectedPatientForChart?.lastName || ''}
Hospital No: ${selectedPatientForChart?.hospitalNumber || ''}
Date: ${format(new Date(), 'dd/MM/yyyy')}

Time-based monitoring entries would be extracted here.
This is a placeholder for actual OCR text extraction.

To implement full OCR:
1. Install tesseract.js: npm install tesseract.js
2. Use Tesseract.recognize() on the uploaded image

Note: Uploaded chart stored successfully.
      `.trim();
      
      setChartOcrText(simulatedOcrText);
      setIsProcessingOcr(false);
      toast.success('Chart processed. For full OCR, integrate Tesseract.js');
    }, 2000);
  };
  
  // Save uploaded chart to database
  const handleSaveUploadedChart = async () => {
    if (!selectedPatientForChart) {
      toast.error('Please select a patient');
      return;
    }
    
    const newChart: TransfusionMonitoringChart = {
      id: uuidv4(),
      chartId: `CHART-${Date.now()}`,
      patientId: selectedPatientForChart.id,
      hospitalId: defaultHospital?.id,
      patientName: `${selectedPatientForChart.firstName} ${selectedPatientForChart.lastName}`,
      hospitalNumber: selectedPatientForChart.hospitalNumber,
      wardBed: '',
      chartDate: new Date(),
      productType: '',
      unitNumber: '',
      entries: [],
      uploadedChartBase64: chartUploadPreview,
      ocrText: chartOcrText,
      ocrProcessedAt: chartOcrText ? new Date() : undefined,
      status: 'uploaded',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    try {
      await db.transfusionMonitoringCharts.add(newChart);
      syncRecord('transfusionMonitoringCharts', newChart as unknown as Record<string, unknown>);
      toast.success('Chart uploaded successfully');
      setShowChartUploadModal(false);
      resetChartUploadForm();
    } catch (error) {
      console.error('Error saving chart:', error);
      toast.error('Failed to save chart');
    }
  };
  
  const resetChartUploadForm = () => {
    setChartUploadFile(null);
    setChartUploadPreview('');
    setChartOcrText('');
    setSelectedPatientForChart(null);
  };
  
  // Create a new digital monitoring chart
  const handleCreateDigitalChart = async () => {
    const patient = patients?.find(p => p.id === digitalChartPatientId);
    if (!patient) {
      toast.error('Please select a patient');
      return;
    }
    
    if (!digitalChartProductType) {
      toast.error('Please enter the blood product type');
      return;
    }
    
    const newChart: TransfusionMonitoringChart = {
      id: uuidv4(),
      chartId: `CHART-${Date.now()}`,
      patientId: patient.id,
      hospitalId: defaultHospital?.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      hospitalNumber: patient.hospitalNumber,
      wardBed: digitalChartWardBed || '',
      chartDate: new Date(),
      productType: digitalChartProductType,
      unitNumber: digitalChartUnitNumber,
      startTime: format(new Date(), 'HH:mm'),
      entries: [],
      status: 'in_progress',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    try {
      await db.transfusionMonitoringCharts.add(newChart);
      syncRecord('transfusionMonitoringCharts', newChart as unknown as Record<string, unknown>);
      toast.success('Digital monitoring chart created');
      setShowCreateDigitalChartModal(false);
      setDigitalChartPatientId('');
      setDigitalChartProductType('');
      setDigitalChartUnitNumber('');
      setDigitalChartWardBed('');
      
      // Open the chart for monitoring
      setSelectedDigitalChart(newChart);
      setShowDigitalChartView(true);
    } catch (error) {
      console.error('Error creating digital chart:', error);
      toast.error('Failed to create monitoring chart');
    }
  };
  
  // Add monitoring entry to digital chart
  const handleAddMonitoringEntry = async (entry: TransfusionMonitoringEntry) => {
    if (!selectedDigitalChart) return;
    
    const updatedEntries = [...(selectedDigitalChart.entries || []), entry];
    const totalVolume = updatedEntries.reduce((sum, e) => sum + (e.volumeInfused || 0), 0);
    
    try {
      await db.transfusionMonitoringCharts.update(selectedDigitalChart.id, {
        entries: updatedEntries,
        totalVolumeTransfused: totalVolume,
        updatedAt: new Date(),
      });
      
      // Refresh the chart
      const updatedChart = await db.transfusionMonitoringCharts.get(selectedDigitalChart.id);
      if (updatedChart) {
        setSelectedDigitalChart(updatedChart);
      }
      
      toast.success('Monitoring record added');
    } catch (error) {
      console.error('Error adding monitoring entry:', error);
      toast.error('Failed to add monitoring record');
    }
  };
  
  // Complete the monitoring chart
  const handleCompleteDigitalChart = async (
    outcome: 'completed_uneventful' | 'completed_with_reaction' | 'stopped_due_to_reaction',
    complications?: string
  ) => {
    if (!selectedDigitalChart) return;
    
    try {
      await db.transfusionMonitoringCharts.update(selectedDigitalChart.id, {
        status: 'completed',
        outcome,
        complications,
        endTime: format(new Date(), 'HH:mm'),
        updatedAt: new Date(),
      });
      
      const updatedChart = await db.transfusionMonitoringCharts.get(selectedDigitalChart.id);
      if (updatedChart) {
        setSelectedDigitalChart(updatedChart);
      }
      
      toast.success('Transfusion monitoring completed');
    } catch (error) {
      console.error('Error completing chart:', error);
      toast.error('Failed to complete monitoring chart');
    }
  };
  
  // Create transfusion order from request
  const handleCreateOrderFromRequest = async (request: TransfusionRequest) => {
    const patient = patients?.find(p => p.id === request.patientId);
    if (!patient) {
      toast.error('Patient not found');
      return;
    }
    
    const bloodType = patient.bloodGroup || 'O+';
    
    const newOrder: TransfusionOrder = {
      id: uuidv4(),
      orderId: `ORD-${Date.now().toString().slice(-8)}`,
      patientId: request.patientId,
      hospitalId: defaultHospital?.id || '',
      requestId: request.id,
      orderDate: new Date(),
      orderedBy: user?.email || 'Unknown',
      ordererDesignation: user?.role,
      urgency: request.urgency as TransfusionOrder['urgency'],
      patientBloodGroup: bloodType.replace(/[+-]/, ''),
      patientRhFactor: bloodType.includes('+') ? 'positive' : 'negative',
      patientGenotype: patient.genotype,
      indication: request.indication,
      hemoglobinLevel: request.hemoglobinLevel,
      plateletCount: request.plateletCount,
      inr: request.inr,
      productType: request.products[0]?.productType ? bloodProductInfo[request.products[0].productType].name : 'Packed Red Blood Cells',
      productCode: `PROD-${Date.now().toString().slice(-6)}`,
      numberOfUnits: request.products.reduce((sum, p) => sum + p.units, 0),
      volumePerUnit: 300,
      bloodGroupOfProduct: bloodType,
      screeningTests: {
        hiv: 'negative',
        hbsAg: 'negative',
        hcv: 'negative',
        vdrl: 'negative',
        malaria: 'negative',
      },
      rateOfTransfusion: 150,
      estimatedDuration: '2-4 hours',
      preTransfusionVitals: {
        temperature: preVitals.temperature || 36.5,
        pulse: preVitals.pulse || 80,
        bp: `${preVitals.bloodPressure?.systolic || 120}/${preVitals.bloodPressure?.diastolic || 80}`,
        respiratoryRate: preVitals.respiratoryRate || 16,
        spo2: preVitals.oxygenSaturation || 98,
      },
      consentObtained: true,
      consentDate: new Date(),
      verifyingNurse1: verifyingNurse1,
      verifyingNurse2: verifyingNurse2,
      wardBed: 'Ward A, Bed 1',
      diagnosis: request.indication,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    try {
      await db.transfusionOrders.add(newOrder);
      syncRecord('transfusionOrders', newOrder as unknown as Record<string, unknown>);
      toast.success('Transfusion order created');
      
      // Auto-generate PDF
      await handleGenerateOrderPDF(newOrder);
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    }
  };

  // Handle starting transfusion
  const handleStartTransfusion = () => {
    if (!selectedRequest || !verifyingNurse1 || !verifyingNurse2) {
      toast.error('Two staff members must verify');
      return;
    }

    const record = bloodTransfusionService.startTransfusion(
      selectedRequest.id,
      selectedRequest.patientId,
      'UNIT-' + Date.now(),
      selectedRequest.products[0]?.productType || 'packed_red_cells',
      {
        timestamp: new Date(),
        temperature: preVitals.temperature || 36.5,
        pulse: preVitals.pulse || 80,
        bloodPressure: preVitals.bloodPressure || { systolic: 120, diastolic: 80 },
        respiratoryRate: preVitals.respiratoryRate || 16,
        oxygenSaturation: preVitals.oxygenSaturation || 98,
      },
      { nurse1: verifyingNurse1, nurse2: verifyingNurse2 }
    );

    setActiveTransfusions(prev => [...prev, record]);
    setRequests(prev =>
      prev.map(r => r.id === selectedRequest.id ? { ...r, status: 'in_progress' } : r)
    );
    toast.success('Transfusion started');
    setShowStartModal(false);
    setSelectedRequest(null);
  };

  // Handle completing transfusion
  const handleCompleteTransfusion = (recordId: string) => {
    setActiveTransfusions(prev =>
      prev.map(t =>
        t.id === recordId
          ? { ...t, status: 'completed', endTime: new Date() }
          : t
      )
    );
    toast.success('Transfusion completed');
  };

  // Handle reporting reaction
  const handleReportReaction = (recordId: string, reactionType: ReactionType) => {
    setActiveTransfusions(prev =>
      prev.map(t =>
        t.id === recordId
          ? {
              ...t,
              status: 'stopped',
              reaction: {
                id: Date.now().toString(),
                transfusionId: recordId,
                detectedAt: new Date(),
                type: reactionType,
                severity: 'moderate',
                symptoms: [],
                vitalsAtReaction: t.preVitals,
                transfusionStopped: true,
                interventions: [],
                medicationsGiven: [],
                bloodBankNotified: false,
                samplesCollected: [],
                outcome: 'ongoing',
                reportedToHemovigilance: false,
              },
            }
          : t
      )
    );
    toast.error('Transfusion stopped - Reaction reported');
    setShowReactionModal(false);
  };

  // Add product to request
  const addProduct = (type: BloodProduct) => {
    const existing = selectedProducts.find(p => p.type === type);
    if (existing) {
      setSelectedProducts(prev =>
        prev.map(p => p.type === type ? { ...p, units: p.units + 1 } : p)
      );
    } else {
      setSelectedProducts(prev => [...prev, { type, units: 1 }]);
    }
  };

  // Remove product from request
  const removeProduct = (type: BloodProduct) => {
    setSelectedProducts(prev => prev.filter(p => p.type !== type));
  };

  // Render checklist
  const renderChecklist = () => {
    const checklist = bloodTransfusionService.getPreTransfusionChecklist();
    return (
      <div className="space-y-2">
        {checklist.map((item, idx) => (
          <label
            key={idx}
            className={`flex items-start gap-3 p-2 rounded-lg ${
              item.critical ? 'bg-red-50' : 'bg-gray-50'
            }`}
          >
            <input type="checkbox" className="mt-1" />
            <span className={`text-sm ${item.critical ? 'font-medium' : ''}`}>
              {item.item}
              {item.critical && <span className="text-red-600 ml-1">*</span>}
            </span>
          </label>
        ))}
      </div>
    );
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'requests':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Transfusion Requests</h3>
              <button
                onClick={() => setShowRequestModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                New Request
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <Droplets className="mx-auto mb-4 text-gray-300" size={48} />
                <p>No transfusion requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map(request => (
                  <div key={request.id} className="bg-white rounded-xl p-4 border shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Droplets className="text-red-600" size={18} />
                          <span className="font-medium">
                            {request.products.map(p => 
                              `${p.units} ${bloodProductInfo[p.productType].name}`
                            ).join(', ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{request.indication}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                          <span>Hb: {request.hemoglobinLevel} g/dL</span>
                          {request.plateletCount && <span>Plt: {request.plateletCount}/µL</span>}
                          {request.inr && <span>INR: {request.inr}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColors[request.urgency]}`}>
                          {request.urgency.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          request.status === 'completed' ? 'bg-green-100 text-green-700' :
                          request.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {request.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    {request.status === 'requested' && (
                      <div className="mt-3 pt-3 border-t flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowStartModal(true);
                          }}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1"
                        >
                          <Play size={14} />
                          Start Transfusion
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'active':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Active Transfusions</h3>

            {activeTransfusions.filter(t => t.status === 'in_progress').length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <Activity className="mx-auto mb-4 text-gray-300" size={48} />
                <p>No active transfusions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTransfusions.filter(t => t.status === 'in_progress').map(transfusion => (
                  <div key={transfusion.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <Droplets className="text-red-600" />
                            {bloodProductInfo[transfusion.productType].name}
                          </h4>
                          <p className="text-sm text-gray-600">Unit: {transfusion.unitId}</p>
                          <p className="text-sm text-gray-500">
                            Started: {format(new Date(transfusion.startTime), 'HH:mm')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm animate-pulse">
                            In Progress
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Vitals Monitoring */}
                    <div className="p-4 border-t">
                      <h5 className="font-medium mb-3">Pre-transfusion Vitals</h5>
                      <div className="grid grid-cols-3 gap-3 text-center sm:grid-cols-5">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <Thermometer className="mx-auto text-orange-500 mb-1" size={18} />
                          <p className="text-lg font-semibold">{transfusion.preVitals.temperature}°C</p>
                          <p className="text-xs text-gray-500">Temp</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <Heart className="mx-auto text-red-500 mb-1" size={18} />
                          <p className="text-lg font-semibold">{transfusion.preVitals.pulse}</p>
                          <p className="text-xs text-gray-500">Pulse</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <Activity className="mx-auto text-blue-500 mb-1" size={18} />
                          <p className="text-lg font-semibold">
                            {transfusion.preVitals.bloodPressure.systolic}/{transfusion.preVitals.bloodPressure.diastolic}
                          </p>
                          <p className="text-xs text-gray-500">BP</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-lg font-semibold">{transfusion.preVitals.respiratoryRate}</p>
                          <p className="text-xs text-gray-500">RR</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <p className="text-lg font-semibold">{transfusion.preVitals.oxygenSaturation}%</p>
                          <p className="text-xs text-gray-500">SpO2</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 border-t bg-gray-50 flex gap-2">
                      <button
                        onClick={() => handleCompleteTransfusion(transfusion.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"
                      >
                        <CheckCircle2 size={16} />
                        Complete
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(null);
                          setShowReactionModal(true);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg flex items-center gap-2"
                      >
                        <AlertTriangle size={16} />
                        Report Reaction
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTransfusionForVitals(transfusion);
                          setPreVitals({
                            temperature: 36.5,
                            pulse: 80,
                            bloodPressure: { systolic: 120, diastolic: 80 },
                            respiratoryRate: 16,
                            oxygenSaturation: 98,
                          });
                          setShowVitalsModal(true);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
                      >
                        <RefreshCw size={16} />
                        Record Vitals
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'inventory':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Blood Products Reference</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Object.entries(bloodProductInfo).map(([key, info]) => (
                <div key={key} className="bg-white rounded-xl p-4 border shadow-sm">
                  <h4 className="font-semibold text-red-600 mb-2">{info.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{info.description}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Dose:</span> {info.dose}
                    </div>
                    <div>
                      <span className="font-medium">Expected Response:</span> {info.expectedResponse}
                    </div>
                    <div>
                      <span className="font-medium">Storage:</span> {info.storage}
                    </div>
                    <div>
                      <span className="font-medium">Shelf Life:</span> {info.shelfLife}
                    </div>
                    <div>
                      <span className="font-medium">Infusion Time:</span> {info.infusionTime}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t">
                    <span className="font-medium text-sm">Indications:</span>
                    <ul className="text-xs text-gray-600 mt-1 list-disc list-inside">
                      {info.indications.map((ind, i) => (
                        <li key={i}>{ind}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'reactions':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transfusion Reaction Protocols</h3>

            <div className="space-y-4">
              {Object.entries(reactionProtocols).slice(0, 6).map(([key, protocol]) => (
                <div key={key} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleSection(key)}
                    className="w-full p-4 flex justify-between items-center text-left"
                  >
                    <div>
                      <h4 className="font-semibold">{protocol.name}</h4>
                      <p className="text-sm text-gray-500">
                        {protocol.symptoms.slice(0, 3).join(', ')}
                      </p>
                    </div>
                    {expandedSections.includes(key) ? <ChevronUp /> : <ChevronDown />}
                  </button>

                  {expandedSections.includes(key) && (
                    <div className="p-4 border-t bg-gray-50 space-y-4">
                      <div>
                        <h5 className="font-medium text-red-600 mb-2">Immediate Actions</h5>
                        <ol className="list-decimal list-inside text-sm space-y-1">
                          {protocol.immediateActions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ol>
                      </div>

                      <div>
                        <h5 className="font-medium text-blue-600 mb-2">Investigations</h5>
                        <ul className="list-disc list-inside text-sm">
                          {protocol.investigations.map((inv, i) => (
                            <li key={i}>{inv}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-green-600 mb-2">Treatment</h5>
                        <ul className="list-disc list-inside text-sm">
                          {protocol.treatment.map((tx, i) => (
                            <li key={i}>{tx}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-purple-600 mb-2">Prevention</h5>
                        <ul className="list-disc list-inside text-sm">
                          {protocol.preventionStrategies.map((prev, i) => (
                            <li key={i}>{prev}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'orders':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Transfusion Orders</h3>
              <p className="text-sm text-gray-500">Orders are created from approved requests</p>
            </div>
            
            {/* Pending Requests for Order Creation */}
            {requests.filter(r => r.status === 'requested').length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h4 className="font-medium text-yellow-800 mb-3">Pending Requests - Click to Generate Order</h4>
                <div className="space-y-2">
                  {requests.filter(r => r.status === 'requested').map(request => {
                    const patient = patients?.find(p => p.id === request.patientId);
                    return (
                      <button
                        key={request.id}
                        onClick={() => handleCreateOrderFromRequest(request)}
                        className="w-full p-3 bg-white rounded-lg border border-yellow-300 hover:border-yellow-500 hover:bg-yellow-50 text-left transition-colors flex justify-between items-center"
                      >
                        <div>
                          <span className="font-medium">{patient?.firstName} {patient?.lastName}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            {request.products.map(p => bloodProductInfo[p.productType]?.name).join(', ')}
                          </span>
                        </div>
                        <span className="text-sm text-yellow-600 flex items-center gap-1">
                          <Plus size={14} /> Generate Order
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!transfusionOrders || transfusionOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <FileText className="mx-auto mb-4 text-gray-300" size={48} />
                <p>No transfusion orders yet</p>
                <p className="text-sm mt-2">Create a request first, then generate an order</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transfusionOrders.map(order => {
                  const patient = patients?.find(p => p.id === order.patientId);
                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-xl p-4 border shadow-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="text-red-600" size={18} />
                            <span className="font-medium">
                              {order.orderId} - {order.productType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            Patient: {patient?.firstName} {patient?.lastName} ({patient?.hospitalNumber})
                          </p>
                          <p className="text-sm text-gray-500">
                            {order.numberOfUnits} unit(s) • {order.bloodGroupOfProduct} • Rate: {order.rateOfTransfusion} mL/hr
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                            <span>Ordered: {format(new Date(order.orderDate), 'dd/MM/yyyy HH:mm')}</span>
                            <span>By: {order.orderedBy}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${urgencyColors[order.urgency]}`}>
                            {order.urgency.replace('_', ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'approved' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Screening Tests */}
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium text-gray-600 mb-2">Screening Tests:</p>
                        <div className="flex gap-2 flex-wrap">
                          {Object.entries(order.screeningTests).map(([test, result]) => (
                            <span
                              key={test}
                              className={`px-2 py-0.5 rounded text-xs ${
                                result === 'negative' ? 'bg-green-100 text-green-700' :
                                result === 'positive' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {test.toUpperCase()}: {result}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="mt-3 pt-3 border-t flex gap-2">
                        <button
                          onClick={() => handleGenerateOrderPDF(order)}
                          className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-red-700"
                        >
                          <Download size={14} />
                          Download PDF
                        </button>
                        <button
                          onClick={() => setSelectedOrderForView(order)}
                          className="px-3 py-1 border border-gray-300 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50"
                        >
                          <Eye size={14} />
                          View Details
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'charts':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <h3 className="text-lg font-semibold">Monitoring Charts</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateChartTemplate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700"
                >
                  <Download size={18} />
                  Download Template
                </button>
                <button
                  onClick={() => setShowCreateDigitalChartModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center gap-2 hover:bg-purple-700"
                >
                  <PlusCircle size={18} />
                  New Digital Chart
                </button>
                <button
                  onClick={() => setShowChartUploadModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700"
                >
                  <Upload size={18} />
                  Upload Chart
                </button>
              </div>
            </div>

            {/* Two options info boxes */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <h4 className="font-semibold text-purple-700 mb-2 flex items-center gap-2">
                  <BarChart3 size={18} />
                  Digital Monitoring (Recommended)
                </h4>
                <ul className="text-sm space-y-1 list-disc list-inside text-purple-800">
                  <li>Record vitals directly in the app</li>
                  <li>View real-time vital signs graphs</li>
                  <li>Automatic trend analysis and alerts</li>
                  <li>Export completed chart with graphs as PDF</li>
                </ul>
                <button
                  onClick={() => setShowCreateDigitalChartModal(true)}
                  className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  Start Digital Monitoring
                </button>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                  <FileText size={18} />
                  Paper-Based Workflow
                </h4>
                <ol className="text-sm space-y-1 list-decimal list-inside text-blue-800">
                  <li>Download the blank monitoring chart template</li>
                  <li>Print and fill during transfusion</li>
                  <li>Scan or photograph the filled chart</li>
                  <li>Upload here for digital storage</li>
                </ol>
                <button
                  onClick={handleGenerateChartTemplate}
                  className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Download Template
                </button>
              </div>
            </div>

            {!transfusionCharts || transfusionCharts.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border">
                <ClipboardCheck className="mx-auto mb-4 text-gray-300" size={48} />
                <p>No uploaded charts yet</p>
                <p className="text-sm mt-2">Download a template, fill it during transfusion, then upload</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {transfusionCharts.map(chart => (
                  <motion.div
                    key={chart.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl border shadow-sm overflow-hidden"
                  >
                    {chart.uploadedChartBase64 && (
                      <div className="h-40 bg-gray-100 overflow-hidden">
                        <img
                          src={chart.uploadedChartBase64}
                          alt="Uploaded chart"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {/* Show monitoring entries count for digital charts */}
                    {!chart.uploadedChartBase64 && chart.entries && chart.entries.length > 0 && (
                      <div className="h-32 bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="mx-auto text-purple-500 mb-2" size={32} />
                          <p className="text-sm font-medium text-purple-700">{chart.entries.length} Records</p>
                          <p className="text-xs text-purple-500">Digital Chart</p>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{chart.chartId}</h4>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          chart.status === 'completed' ? 'bg-green-100 text-green-700' :
                          chart.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                          chart.status === 'uploaded' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {chart.status === 'in_progress' ? 'In Progress' : chart.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {chart.patientName} ({chart.hospitalNumber})
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {chart.productType && <span className="mr-2">Product: {chart.productType}</span>}
                        Date: {format(new Date(chart.chartDate), 'dd/MM/yyyy')}
                      </p>
                      
                      {chart.entries && chart.entries.length > 0 && (
                        <div className="mt-2 p-2 bg-purple-50 rounded text-xs">
                          <p className="font-medium text-purple-700">
                            {chart.entries.length} monitoring records
                            {chart.totalVolumeTransfused && ` • ${chart.totalVolumeTransfused} mL total`}
                          </p>
                        </div>
                      )}
                      
                      {chart.ocrText && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-h-20 overflow-y-auto">
                          <p className="font-medium text-gray-600 mb-1">Extracted Text:</p>
                          <p className="text-gray-500 whitespace-pre-wrap">{chart.ocrText.slice(0, 200)}...</p>
                        </div>
                      )}
                      
                      {chart.outcome && (
                        <div className={`mt-2 p-2 rounded text-xs ${
                          chart.outcome === 'completed_uneventful' ? 'bg-green-50 text-green-700' :
                          chart.outcome === 'completed_with_reaction' ? 'bg-yellow-50 text-yellow-700' :
                          'bg-red-50 text-red-700'
                        }`}>
                          <p className="font-medium">
                            {chart.outcome === 'completed_uneventful' ? '✓ Completed Uneventful' :
                             chart.outcome === 'completed_with_reaction' ? '⚠ Completed with Reaction' :
                             '✕ Stopped due to Reaction'}
                          </p>
                        </div>
                      )}
                      
                      <div className="mt-3 flex gap-2">
                        {(chart.entries && chart.entries.length > 0) || chart.status === 'in_progress' ? (
                          <button
                            onClick={() => {
                              setSelectedDigitalChart(chart);
                              setShowDigitalChartView(true);
                            }}
                            className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700"
                          >
                            <BarChart3 size={14} />
                            {chart.status === 'in_progress' ? 'Continue' : 'View Charts'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedChartForView(chart)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm flex items-center gap-1 hover:bg-gray-50"
                          >
                            <Eye size={14} />
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );

      case 'mtp':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Massive Transfusion Protocol</h3>
              <button className="btn btn-primary bg-red-600 hover:bg-red-700 flex items-center gap-2">
                <AlertCircle size={18} />
                Activate MTP
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="font-semibold text-red-700 mb-2">MTP Activation Criteria</h4>
              <ul className="text-sm space-y-1">
                <li>• Anticipated need for &gt;10 units PRBC in 24 hours</li>
                <li>• Transfusion of &gt;4 units PRBC in 1 hour with ongoing bleeding</li>
                <li>• Replacement of &gt;50% blood volume in 3 hours</li>
                <li>• ABC Score ≥2 (mechanism, SBP, HR, FAST)</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-4 border">
              <h4 className="font-semibold mb-3">Standard MTP Pack (Per Round)</h4>
              <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">6</p>
                  <p className="text-sm">PRBC</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-700">6</p>
                  <p className="text-sm">FFP</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">1</p>
                  <p className="text-sm">Platelets</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <p className="text-2xl font-bold text-purple-700">10</p>
                  <p className="text-sm">Cryo</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Ratio 1:1:1 (PRBC:FFP:Platelets)</p>
            </div>

            <div className="bg-white rounded-xl p-4 border">
              <h4 className="font-semibold mb-3">Lab Monitoring During MTP</h4>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <h5 className="font-medium text-sm mb-2">Every 30-60 minutes:</h5>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    <li>Hemoglobin</li>
                    <li>Platelet count</li>
                    <li>PT/INR, APTT</li>
                    <li>Fibrinogen</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-sm mb-2">Every 4-6 units:</h5>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    <li>Ionized Calcium</li>
                    <li>Potassium</li>
                    <li>Core temperature</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-sm mb-2">Targets:</h5>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    <li>Hb &gt; 8 g/dL</li>
                    <li>Platelets &gt; 50,000</li>
                    <li>INR &lt; 1.5</li>
                    <li>Fibrinogen &gt; 150</li>
                    <li>Ca²⁺ &gt; 1.0 mmol/L</li>
                    <li>Temp &gt; 35°C</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Droplets className="text-red-600" />
            Blood Transfusion
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage blood products, transfusions, and reactions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-yellow-600">{requests.filter(r => r.status === 'requested').length}</p>
          <p className="text-sm text-gray-500">Pending Requests</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-blue-600">{activeTransfusions.filter(t => t.status === 'in_progress').length}</p>
          <p className="text-sm text-gray-500">Active Transfusions</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-green-600">{activeTransfusions.filter(t => t.status === 'completed').length}</p>
          <p className="text-sm text-gray-500">Completed Today</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-red-600">{activeTransfusions.filter(t => t.reaction).length}</p>
          <p className="text-sm text-gray-500">Reactions</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-2xl font-bold text-purple-600">0</p>
          <p className="text-sm text-gray-500">Active MTP</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="border-b overflow-x-auto">
          <div className="flex min-w-max">
            {[
              { id: 'requests', label: 'Requests', icon: FileText },
              { id: 'active', label: 'Active', icon: Activity },
              { id: 'orders', label: 'Orders', icon: ClipboardList },
              { id: 'charts', label: 'Charts', icon: ClipboardCheck },
              { id: 'inventory', label: 'Products', icon: Droplets },
              { id: 'reactions', label: 'Reactions', icon: AlertTriangle },
              { id: 'mtp', label: 'MTP', icon: AlertCircle },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-5 py-4 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowRequestModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Droplets className="text-red-600" />
                  New Transfusion Request
                </h2>
                <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-6">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                  <PatientSelector
                    value={selectedPatientId}
                    onChange={(patientId) => handlePatientSelect(patientId || '')}
                    placeholder="Search patient by name or hospital number..."
                  />
                </div>
                
                {/* Selected Patient Details Card */}
                {selectedPatient && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                      <Activity size={18} />
                      Patient Information
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Name:</span>
                        <p className="font-medium">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Hospital No:</span>
                        <p className="font-medium">{selectedPatient.hospitalNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Gender:</span>
                        <p className="font-medium capitalize">{selectedPatient.gender}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Age:</span>
                        <p className="font-medium">
                          {selectedPatient.dateOfBirth 
                            ? Math.floor((new Date().getTime() - new Date(selectedPatient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) + ' years'
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Blood Group:</span>
                        <p className="font-medium">
                          {selectedPatient.bloodGroup ? (
                            <span className={`px-2 py-0.5 rounded ${bloodTypeColors[selectedPatient.bloodGroup as BloodType] || 'bg-gray-100'}`}>
                              {selectedPatient.bloodGroup}
                            </span>
                          ) : 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Genotype:</span>
                        <p className="font-medium">{selectedPatient.genotype || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Allergies:</span>
                        <p className="font-medium text-red-600">{selectedPatient.allergies || 'None known'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Phone:</span>
                        <p className="font-medium">{selectedPatient.phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Blood Type Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient Blood Type</label>
                    <select
                      value={patientBloodType}
                      onChange={(e) => setPatientBloodType(e.target.value as BloodType)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                      title="Patient blood type"
                    >
                      {(['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] as BloodType[]).map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {selectedPatient?.bloodGroup && selectedPatient.bloodGroup !== patientBloodType && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Different from patient record ({selectedPatient.bloodGroup})
                      </p>
                    )}
                  </div>
                  <div className="flex items-end">
                    {selectedPatient?.bloodGroup ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg w-full">
                        <p className="text-xs text-green-700">Blood type auto-populated from patient record</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg w-full">
                        <p className="text-xs text-yellow-700">⚠️ No blood type in patient record - verify before transfusion</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Compatible Types */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-700">Compatible RBC Types:</p>
                  <div className="flex gap-2 mt-1">
                    {compatibleTypes.map(type => (
                      <span key={type} className={`px-2 py-1 rounded text-sm ${bloodTypeColors[type]}`}>
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Urgency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['routine', 'urgent', 'emergency', 'massive_transfusion'] as TransfusionUrgency[]).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUrgency(u)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                          urgency === u ? urgencyColors[u] + ' border-current' : 'border-gray-200'
                        }`}
                      >
                        {u.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clinical Indication */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Indication *</label>
                  <textarea
                    value={indication}
                    onChange={(e) => setIndication(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    placeholder="Clinical indication for transfusion..."
                  />
                </div>

                {/* Lab Values */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hemoglobin (g/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={hemoglobin}
                      onChange={(e) => setHemoglobin(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                      placeholder="e.g., 7.5"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platelets (/µL)</label>
                    <input
                      type="number"
                      value={platelets}
                      onChange={(e) => setPlatelets(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                      placeholder="e.g., 50000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">INR</label>
                    <input
                      type="number"
                      step="0.1"
                      value={inr}
                      onChange={(e) => setInr(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                      placeholder="e.g., 1.2"
                    />
                  </div>
                </div>

                {/* Transfusion Assessment */}
                {transfusionAssessment && (
                  <div className={`p-3 rounded-lg border ${
                    transfusionAssessment.needsRBC || transfusionAssessment.needsPlatelets || transfusionAssessment.needsPlasma
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <h4 className="font-medium text-sm mb-2">Assessment:</h4>
                    <ul className="text-sm space-y-1">
                      {transfusionAssessment.recommendations.map((rec, i) => (
                        <li key={i}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Blood Products */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Blood Products *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(bloodProductInfo).slice(0, 6).map(([key, info]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => addProduct(key as BloodProduct)}
                        className="p-3 text-left border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50"
                      >
                        <div className="font-medium text-sm">{info.name}</div>
                        <div className="text-xs text-gray-500">{info.dose}</div>
                      </button>
                    ))}
                  </div>

                  {selectedProducts.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-sm mb-2">Selected Products:</h5>
                      <div className="space-y-2">
                        {selectedProducts.map(p => (
                          <div key={p.type} className="flex justify-between items-center">
                            <span className="text-sm">{bloodProductInfo[p.type].name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedProducts(prev =>
                                  prev.map(pr => pr.type === p.type ? { ...pr, units: Math.max(1, pr.units - 1) } : pr)
                                )}
                                className="w-6 h-6 rounded bg-gray-200"
                                title="Decrease units"
                              >
                                -
                              </button>
                              <span className="font-medium">{p.units}</span>
                              <button
                                onClick={() => setSelectedProducts(prev =>
                                  prev.map(pr => pr.type === p.type ? { ...pr, units: pr.units + 1 } : pr)
                                )}
                                className="w-6 h-6 rounded bg-gray-200"
                                title="Increase units"
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeProduct(p.type)}
                                className="ml-2 text-red-500"
                                title="Remove product"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRequest}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Submit Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Transfusion Modal */}
      <AnimatePresence>
        {showStartModal && selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowStartModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b bg-green-50">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Play className="text-green-600" />
                  Start Transfusion
                </h2>
                <button onClick={() => setShowStartModal(false)} className="p-2 hover:bg-green-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-6">
                {/* Pre-transfusion Checklist */}
                <div>
                  <button
                    onClick={() => toggleSection('checklist')}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <h3 className="font-semibold flex items-center gap-2">
                      <ClipboardCheck className="text-green-600" />
                      Pre-Transfusion Checklist
                    </h3>
                    {expandedSections.includes('checklist') ? <ChevronUp /> : <ChevronDown />}
                  </button>
                  {expandedSections.includes('checklist') && (
                    <div className="mt-3">
                      {renderChecklist()}
                    </div>
                  )}
                </div>

                {/* Verification */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium mb-3">Two-Person Verification Required</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Verifying Staff 1 *</label>
                      <input
                        type="text"
                        value={verifyingNurse1}
                        onChange={(e) => setVerifyingNurse1(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                        placeholder="Name and designation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Verifying Staff 2 *</label>
                      <input
                        type="text"
                        value={verifyingNurse2}
                        onChange={(e) => setVerifyingNurse2(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                        placeholder="Name and designation"
                      />
                    </div>
                  </div>
                </div>

                {/* Pre-transfusion Vitals */}
                <div>
                  <h4 className="font-medium mb-3">Baseline Vital Signs</h4>
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={preVitals.temperature}
                        onChange={(e) => setPreVitals(prev => ({ ...prev, temperature: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        title="Temperature"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Pulse</label>
                      <input
                        type="number"
                        value={preVitals.pulse}
                        onChange={(e) => setPreVitals(prev => ({ ...prev, pulse: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        title="Pulse"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">BP (sys/dia)</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={preVitals.bloodPressure?.systolic}
                          onChange={(e) => setPreVitals(prev => ({
                            ...prev,
                            bloodPressure: { ...prev.bloodPressure!, systolic: Number(e.target.value) }
                          }))}
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg"
                          title="Systolic Blood Pressure"
                        />
                        <input
                          type="number"
                          value={preVitals.bloodPressure?.diastolic}
                          onChange={(e) => setPreVitals(prev => ({
                            ...prev,
                            bloodPressure: { ...prev.bloodPressure!, diastolic: Number(e.target.value) }
                          }))}
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg"
                          title="Diastolic Blood Pressure"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">RR</label>
                      <input
                        type="number"
                        value={preVitals.respiratoryRate}
                        onChange={(e) => setPreVitals(prev => ({ ...prev, respiratoryRate: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        title="Respiratory Rate"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        value={preVitals.oxygenSaturation}
                        onChange={(e) => setPreVitals(prev => ({ ...prev, oxygenSaturation: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                        title="Oxygen Saturation"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartTransfusion}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Play size={16} />
                  Start Transfusion
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reaction Modal */}
      <AnimatePresence>
        {showReactionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowReactionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-4 border-b bg-red-50">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-red-700">
                  <AlertTriangle />
                  Report Transfusion Reaction
                </h2>
                <button onClick={() => setShowReactionModal(false)} className="p-2 hover:bg-red-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-sm text-red-700">
                  <strong>Stop the transfusion immediately!</strong>
                  <br />
                  Keep IV line open with saline.
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reaction Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['febrile', 'allergic', 'hemolytic_acute', 'taco', 'trali', 'anaphylactic'] as ReactionType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => {
                          // Find first in-progress transfusion
                          const activeTransfusion = activeTransfusions.find(t => t.status === 'in_progress');
                          if (activeTransfusion) {
                            handleReportReaction(activeTransfusion.id, type);
                          }
                        }}
                        className="p-2 text-left border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 text-sm"
                      >
                        {reactionProtocols[type]?.name || type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowReactionModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart Upload Modal */}
      <AnimatePresence>
        {showChartUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowChartUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b bg-green-50">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Upload className="text-green-600" />
                  Upload Monitoring Chart
                </h2>
                <button onClick={() => { setShowChartUploadModal(false); resetChartUploadForm(); }} className="p-2 hover:bg-green-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-6">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient *</label>
                  <PatientSelector
                    value={selectedPatientForChart?.id || ''}
                    onChange={(patientId, patient) => {
                      setSelectedPatientForChart(patient || null);
                    }}
                    placeholder="Search patient for monitoring chart..."
                  />
                </div>

                {/* Upload Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Upload Chart Image</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                    >
                      <FileUp className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-sm text-gray-600">Upload from device</p>
                    </button>
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex-1 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors"
                    >
                      <Camera className="mx-auto text-gray-400 mb-2" size={32} />
                      <p className="text-sm text-gray-600">Take a photo</p>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleChartFileUpload}
                    className="hidden"
                    title="Upload chart image from device"
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleChartFileUpload}
                    className="hidden"
                    title="Capture chart image with camera"
                  />
                </div>

                {/* Preview */}
                {chartUploadPreview && (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={chartUploadPreview}
                      alt="Chart preview"
                      className="w-full max-h-64 object-contain bg-gray-50"
                    />
                  </div>
                )}

                {/* OCR Section */}
                {chartUploadFile && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-gray-700">Text Extraction (OCR)</label>
                      <button
                        onClick={handleProcessOCR}
                        disabled={isProcessingOcr}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isProcessingOcr ? (
                          <>
                            <RefreshCw className="animate-spin" size={14} />
                            Processing...
                          </>
                        ) : (
                          <>
                            <FileText size={14} />
                            Extract Text
                          </>
                        )}
                      </button>
                    </div>
                    
                    {chartOcrText && (
                      <textarea
                        value={chartOcrText}
                        onChange={(e) => setChartOcrText(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm font-mono"
                        placeholder="Extracted text will appear here..."
                      />
                    )}
                    
                    <p className="text-xs text-gray-500">
                      Note: For full OCR functionality, integrate Tesseract.js. The extracted text can be edited before saving.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => { setShowChartUploadModal(false); resetChartUploadForm(); }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUploadedChart}
                  disabled={!selectedPatientForChart || !chartUploadFile}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Save Chart
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order View Modal */}
      <AnimatePresence>
        {selectedOrderForView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setSelectedOrderForView(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="text-red-600" />
                  Order Details - {selectedOrderForView.orderId}
                </h2>
                <button onClick={() => setSelectedOrderForView(null)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)] space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Patient Blood Group</p>
                    <p className="font-medium">{selectedOrderForView.patientBloodGroup} {selectedOrderForView.patientRhFactor}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Product</p>
                    <p className="font-medium">{selectedOrderForView.productType}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Units</p>
                    <p className="font-medium">{selectedOrderForView.numberOfUnits}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Transfusion Rate</p>
                    <p className="font-medium">{selectedOrderForView.rateOfTransfusion} mL/hr</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-xs text-gray-500">Indication</p>
                    <p className="font-medium">{selectedOrderForView.indication}</p>
                  </div>
                </div>
                
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium mb-2">Blood Bank Source</p>
                  <p className="text-sm">{selectedOrderForView.bloodBankName || 'Not specified'}</p>
                  <p className="text-xs text-gray-500">{selectedOrderForView.bloodBankAddress}</p>
                </div>
                
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 font-medium mb-2">Screening Tests</p>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(selectedOrderForView.screeningTests).map(([test, result]) => (
                      <div key={test} className="text-center">
                        <p className="text-xs text-gray-500 uppercase">{test}</p>
                        <p className={`text-sm font-medium ${result === 'negative' ? 'text-green-600' : result === 'positive' ? 'text-red-600' : 'text-gray-500'}`}>
                          {result}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => handleGenerateOrderPDF(selectedOrderForView)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Download size={16} />
                  Download PDF
                </button>
                <button
                  onClick={() => setSelectedOrderForView(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chart View Modal */}
      <AnimatePresence>
        {selectedChartForView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setSelectedChartForView(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <ClipboardCheck className="text-blue-600" />
                  Chart - {selectedChartForView.chartId}
                </h2>
                <button onClick={() => setSelectedChartForView(null)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Patient</p>
                    <p className="font-medium">{selectedChartForView.patientName}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Hospital No</p>
                    <p className="font-medium">{selectedChartForView.hospitalNumber}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date</p>
                    <p className="font-medium">{format(new Date(selectedChartForView.chartDate), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                
                {selectedChartForView.uploadedChartBase64 && (
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={selectedChartForView.uploadedChartBase64}
                      alt="Chart"
                      className="w-full"
                    />
                  </div>
                )}
                
                {selectedChartForView.ocrText && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Extracted Text</h4>
                    <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700">
                      {selectedChartForView.ocrText}
                    </pre>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setSelectedChartForView(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vitals Recording Modal */}
      <AnimatePresence>
        {showVitalsModal && selectedTransfusionForVitals && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowVitalsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Activity className="text-blue-600" />
                  Record Transfusion Vitals
                </h2>
                <button onClick={() => setShowVitalsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Patient: <strong>{selectedTransfusionForVitals.patientName}</strong>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Product: {selectedTransfusionForVitals.productName}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={preVitals.temperature || ''}
                      onChange={(e) => setPreVitals({ ...preVitals, temperature: parseFloat(e.target.value) || 36.5 })}
                      className="input"
                      title="Temperature in Celsius"
                    />
                  </div>
                  <div>
                    <label className="label">Pulse (bpm)</label>
                    <input
                      type="number"
                      value={preVitals.pulse || ''}
                      onChange={(e) => setPreVitals({ ...preVitals, pulse: parseInt(e.target.value) || 80 })}
                      className="input"
                      title="Pulse rate"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Systolic BP</label>
                    <input
                      type="number"
                      value={preVitals.bloodPressure?.systolic || ''}
                      onChange={(e) => setPreVitals({
                        ...preVitals,
                        bloodPressure: {
                          systolic: parseInt(e.target.value) || 120,
                          diastolic: preVitals.bloodPressure?.diastolic || 80,
                        },
                      })}
                      className="input"
                      title="Systolic blood pressure"
                    />
                  </div>
                  <div>
                    <label className="label">Diastolic BP</label>
                    <input
                      type="number"
                      value={preVitals.bloodPressure?.diastolic || ''}
                      onChange={(e) => setPreVitals({
                        ...preVitals,
                        bloodPressure: {
                          systolic: preVitals.bloodPressure?.systolic || 120,
                          diastolic: parseInt(e.target.value) || 80,
                        },
                      })}
                      className="input"
                      title="Diastolic blood pressure"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Respiratory Rate</label>
                    <input
                      type="number"
                      value={preVitals.respiratoryRate || ''}
                      onChange={(e) => setPreVitals({ ...preVitals, respiratoryRate: parseInt(e.target.value) || 16 })}
                      className="input"
                      title="Respiratory rate"
                    />
                  </div>
                  <div>
                    <label className="label">SpO2 (%)</label>
                    <input
                      type="number"
                      value={preVitals.oxygenSaturation || ''}
                      onChange={(e) => setPreVitals({ ...preVitals, oxygenSaturation: parseInt(e.target.value) || 98 })}
                      className="input"
                      title="Oxygen saturation"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowVitalsModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Update transfusion record with new vitals
                      await db.bloodTransfusions.update(selectedTransfusionForVitals.id, {
                        vitals: [
                          ...(selectedTransfusionForVitals.vitals || []),
                          {
                            recordedAt: new Date(),
                            ...preVitals,
                          } as TransfusionVitals,
                        ],
                        updatedAt: new Date(),
                      });
                      
                      toast.success('Vitals recorded successfully');
                      setShowVitalsModal(false);
                      setSelectedTransfusionForVitals(null);
                    } catch (error) {
                      console.error('Error recording vitals:', error);
                      toast.error('Failed to record vitals');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Vitals
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Digital Monitoring Chart Modal */}
      <AnimatePresence>
        {showCreateDigitalChartModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowCreateDigitalChartModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-4 border-b bg-purple-50">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BarChart3 className="text-purple-600" />
                  New Digital Monitoring Chart
                </h2>
                <button onClick={() => setShowCreateDigitalChartModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-sm text-purple-800">
                    Create a digital monitoring chart to record vital signs directly in the app with real-time graphs and PDF export.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Patient *</label>
                  <PatientSelector
                    value={digitalChartPatientId}
                    onChange={(patientId) => setDigitalChartPatientId(patientId || '')}
                    placeholder="Search patient for digital monitoring chart..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Blood Product Type *</label>
                  <select
                    value={digitalChartProductType}
                    onChange={(e) => setDigitalChartProductType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    title="Select blood product type"
                  >
                    <option value="">Select product type</option>
                    <option value="Packed Red Blood Cells (PRBC)">Packed Red Blood Cells (PRBC)</option>
                    <option value="Fresh Frozen Plasma (FFP)">Fresh Frozen Plasma (FFP)</option>
                    <option value="Platelets">Platelets</option>
                    <option value="Cryoprecipitate">Cryoprecipitate</option>
                    <option value="Whole Blood">Whole Blood</option>
                    <option value="Albumin">Albumin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Unit/Bag Number</label>
                  <input
                    type="text"
                    value={digitalChartUnitNumber}
                    onChange={(e) => setDigitalChartUnitNumber(e.target.value)}
                    placeholder="e.g., UNIT-12345"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Ward/Bed</label>
                  <input
                    type="text"
                    value={digitalChartWardBed}
                    onChange={(e) => setDigitalChartWardBed(e.target.value)}
                    placeholder="e.g., Ward A, Bed 5"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowCreateDigitalChartModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateDigitalChart}
                  disabled={!digitalChartPatientId || !digitalChartProductType}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  Create & Start Monitoring
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Digital Chart View with Graphs */}
      {showDigitalChartView && selectedDigitalChart && (
        <TransfusionMonitoringChartView
          chart={selectedDigitalChart}
          onAddEntry={handleAddMonitoringEntry}
          onCompleteChart={handleCompleteDigitalChart}
          onClose={() => {
            setShowDigitalChartView(false);
            setSelectedDigitalChart(null);
          }}
        />
      )}
    </div>
  );
}
