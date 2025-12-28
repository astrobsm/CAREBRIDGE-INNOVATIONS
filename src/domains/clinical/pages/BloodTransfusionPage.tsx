/**
 * Blood Transfusion Page
 * CareBridge Innovations in Healthcare
 * 
 * Comprehensive blood transfusion management interface
 */

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
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

type TabType = 'requests' | 'active' | 'inventory' | 'reactions' | 'mtp';

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
  const [selectedRequest, setSelectedRequest] = useState<TransfusionRequest | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['checklist']);

  // Mock data states
  const [requests, setRequests] = useState<TransfusionRequest[]>([]);
  const [activeTransfusions, setActiveTransfusions] = useState<TransfusionRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');

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
                      <div className="grid grid-cols-5 gap-3 text-center">
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
                      <button className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2">
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

            <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-4 gap-4 text-center">
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
              <div className="grid grid-cols-3 gap-4">
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Droplets className="text-red-600" />
            Blood Transfusion
          </h1>
          <p className="text-gray-500 mt-1">Manage blood products, transfusions, and reactions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
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
        <div className="border-b">
          <div className="flex">
            {[
              { id: 'requests', label: 'Requests', icon: FileText },
              { id: 'active', label: 'Active', icon: Activity },
              { id: 'inventory', label: 'Products', icon: Droplets },
              { id: 'reactions', label: 'Reactions', icon: AlertTriangle },
              { id: 'mtp', label: 'MTP', icon: AlertCircle },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ${
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
                <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)] space-y-6">
                {/* Patient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => handlePatientSelect(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="">Select patient...</option>
                    {patients?.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.hospitalNumber})
                      </option>
                    ))}
                  </select>
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
                              >
                                -
                              </button>
                              <span className="font-medium">{p.units}</span>
                              <button
                                onClick={() => setSelectedProducts(prev =>
                                  prev.map(pr => pr.type === p.type ? { ...pr, units: pr.units + 1 } : pr)
                                )}
                                className="w-6 h-6 rounded bg-gray-200"
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeProduct(p.type)}
                                className="ml-2 text-red-500"
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
                <button onClick={() => setShowStartModal(false)} className="p-2 hover:bg-green-100 rounded-lg">
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
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Pulse</label>
                      <input
                        type="number"
                        value={preVitals.pulse}
                        onChange={(e) => setPreVitals(prev => ({ ...prev, pulse: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
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
                        />
                        <input
                          type="number"
                          value={preVitals.bloodPressure?.diastolic}
                          onChange={(e) => setPreVitals(prev => ({
                            ...prev,
                            bloodPressure: { ...prev.bloodPressure!, diastolic: Number(e.target.value) }
                          }))}
                          className="w-full px-2 py-2 border border-gray-200 rounded-lg"
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
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        value={preVitals.oxygenSaturation}
                        onChange={(e) => setPreVitals(prev => ({ ...prev, oxygenSaturation: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
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
                <button onClick={() => setShowReactionModal(false)} className="p-2 hover:bg-red-100 rounded-lg">
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
    </div>
  );
}
