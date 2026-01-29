/**
 * Unified Laboratory & Investigations Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Combines laboratory requests and investigations into a single professional workflow
 */

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  X,
  Save,
  Upload,
  TrendingUp,
  Clock,
  CheckCircle2,
  Beaker,
  Activity,
  FileImage,
  Calendar,
  User,
  Eye,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  AlertTriangle,
  Printer,
  Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { HospitalSelector } from '../../../components/hospital';
import { 
  investigationLabService, 
  testDefinitions, 
  referenceRanges,
  type UnifiedCategory 
} from '../../../services/investigationLabService';
import PathologyRequestForm, { 
  PathologyFormData, 
  defaultPathologyFormData 
} from '../components/PathologyRequestForm';
import { generatePathologyRequestPDF } from '../../../utils/clinicalPdfGenerators';
import type { Investigation } from '../../../types';

// Form schemas
const requestSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  hospitalId: z.string().min(1, 'Hospital is required'),
  priority: z.enum(['routine', 'urgent', 'stat']),
  clinicalDetails: z.string().optional(),
  fasting: z.boolean().optional(),
});

type RequestFormData = z.infer<typeof requestSchema>;

// Tab types
type TabType = 'pending' | 'processing' | 'completed' | 'trends';

export default function UnifiedLabPage() {
  const { user } = useAuth();
  
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInvestigation, setSelectedInvestigation] = useState<Investigation | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Test selection
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['hematology', 'biochemistry']));
  
  // Result entry
  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [interpretation, setInterpretation] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  // Trend analysis
  const [trendPatientId, setTrendPatientId] = useState<string>('');
  const [trendParameter, setTrendParameter] = useState<string>('Hemoglobin');

  // Data queries
  const hospitals = useLiveQuery(() => db.hospitals.where('isActive').equals(1).toArray(), []);
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  const investigations = useLiveQuery(() => db.investigations.orderBy('createdAt').reverse().toArray(), []);

  // Form
  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      priority: 'routine',
      fasting: false,
      hospitalId: user?.hospitalId || '',
    },
  });

  // Categories for display
  const categories = investigationLabService.getCategories();

  // Statistics
  const stats = useMemo(() => {
    if (!investigations) return { pending: 0, processing: 0, completed: 0, stat: 0, urgent: 0 };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      pending: investigations.filter(i => i.status === 'requested').length,
      processing: investigations.filter(i => ['sample_collected', 'processing'].includes(i.status)).length,
      completed: investigations.filter(i => i.status === 'completed' && new Date(i.completedAt!) >= today).length,
      stat: investigations.filter(i => i.priority === 'stat' && !['completed', 'cancelled'].includes(i.status)).length,
      urgent: investigations.filter(i => i.priority === 'urgent' && !['completed', 'cancelled'].includes(i.status)).length,
    };
  }, [investigations]);

  // Filtered investigations
  const filteredInvestigations = useMemo(() => {
    if (!investigations) return [];
    
    return investigations.filter(inv => {
      // Tab filter
      let matchesTab = false;
      switch (activeTab) {
        case 'pending':
          matchesTab = inv.status === 'requested';
          break;
        case 'processing':
          matchesTab = ['sample_collected', 'processing'].includes(inv.status);
          break;
        case 'completed':
          matchesTab = inv.status === 'completed';
          break;
        default:
          matchesTab = true;
      }
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || inv.category === selectedCategory;
      
      // Priority filter
      const matchesPriority = priorityFilter === 'all' || inv.priority === priorityFilter;
      
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        inv.patientName?.toLowerCase().includes(searchLower) ||
        inv.hospitalNumber?.toLowerCase().includes(searchLower) ||
        inv.typeName?.toLowerCase().includes(searchLower);
      
      return matchesTab && matchesCategory && matchesPriority && matchesSearch;
    });
  }, [investigations, activeTab, selectedCategory, priorityFilter, searchQuery]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Toggle test selection
  const toggleTest = (testName: string) => {
    setSelectedTests(prev => 
      prev.includes(testName) 
        ? prev.filter(t => t !== testName)
        : [...prev, testName]
    );
  };

  // Select all tests in category
  const selectAllInCategory = (category: UnifiedCategory) => {
    const categoryTests = testDefinitions[category] || [];
    const testNames = categoryTests.map(t => t.name);
    const allSelected = testNames.every(t => selectedTests.includes(t));
    
    if (allSelected) {
      setSelectedTests(prev => prev.filter(t => !testNames.includes(t)));
    } else {
      setSelectedTests(prev => [...new Set([...prev, ...testNames])]);
    }
  };

  // Handle request submission
  const handleSubmitRequest = async (data: RequestFormData) => {
    if (selectedTests.length === 0) {
      toast.error('Please select at least one test');
      return;
    }

    try {
      const patient = patients?.find(p => p.id === data.patientId);
      if (!patient) {
        toast.error('Patient not found');
        return;
      }

      await investigationLabService.createRequest({
        patientId: data.patientId,
        hospitalId: data.hospitalId,
        tests: selectedTests,
        priority: data.priority,
        clinicalDetails: data.clinicalDetails,
        fasting: data.fasting,
        requestedBy: user?.id || '',
        requestedByName: user ? `${user.firstName} ${user.lastName}` : undefined,
      }, patient);

      toast.success('Investigation request submitted successfully');
      setShowRequestModal(false);
      setSelectedTests([]);
      requestForm.reset();
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    }
  };

  // Handle status update
  const handleStatusUpdate = async (investigation: Investigation, newStatus: Investigation['status']) => {
    try {
      await investigationLabService.updateStatus(
        investigation.id,
        newStatus as any,
        user?.id || '',
        user ? `${user.firstName} ${user.lastName}` : undefined
      );
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  // Handle result submission
  const handleSubmitResults = async () => {
    if (!selectedInvestigation) return;

    try {
      const results = Object.entries(resultValues)
        .filter(([_, value]) => value.trim() !== '')
        .map(([parameter, value]) => ({
          parameter,
          value: isNaN(Number(value)) ? value : Number(value),
          unit: referenceRanges[parameter]?.unit,
          referenceRange: referenceRanges[parameter] 
            ? `${referenceRanges[parameter].min} - ${referenceRanges[parameter].max}` 
            : undefined,
        }));

      if (results.length === 0) {
        toast.error('Please enter at least one result');
        return;
      }

      await investigationLabService.addResults(
        selectedInvestigation.id,
        results,
        interpretation,
        uploadedFiles.length > 0 ? uploadedFiles : undefined,
        user?.id,
        user ? `${user.firstName} ${user.lastName}` : undefined
      );

      toast.success('Results uploaded successfully');
      setShowResultModal(false);
      setSelectedInvestigation(null);
      setResultValues({});
      setInterpretation('');
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error uploading results:', error);
      toast.error('Failed to upload results');
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'stat':
        return <span className="px-2 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-full animate-pulse">STAT</span>;
      case 'urgent':
        return <span className="px-2 py-1 text-xs font-bold bg-orange-100 text-orange-800 rounded-full">URGENT</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">Routine</span>;
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full"><Clock size={12} /> Requested</span>;
      case 'sample_collected':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"><Beaker size={12} /> Collected</span>;
      case 'processing':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full"><Activity size={12} /> Processing</span>;
      case 'completed':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full"><CheckCircle2 size={12} /> Completed</span>;
      case 'cancelled':
        return <span className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full"><X size={12} /> Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="text-primary-600" />
            Laboratory & Investigations
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Manage investigation requests, results, and trends</p>
        </div>
        
        <button
          onClick={() => setShowRequestModal(true)}
          className="btn btn-primary flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus size={18} />
          New Request
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-5">
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-yellow-100 rounded-lg">
              <Clock className="text-yellow-600" size={18} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
              <Activity className="text-purple-600" size={18} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.processing}</p>
              <p className="text-xs text-gray-500">Processing</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="text-green-600" size={18} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-xs text-gray-500">Today</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={18} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.stat}</p>
              <p className="text-xs text-gray-500">STAT</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-1.5 sm:p-2 bg-orange-100 rounded-lg">
              <Clock className="text-orange-600" size={18} />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.urgent}</p>
              <p className="text-xs text-gray-500">Urgent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex overflow-x-auto">
            {[
              { id: 'pending', label: 'Pending', icon: Clock, count: stats.pending },
              { id: 'processing', label: 'Processing', icon: Activity, count: stats.processing },
              { id: 'completed', label: 'Completed', icon: CheckCircle2 },
              { id: 'trends', label: 'Trends', icon: TrendingUp },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        {activeTab !== 'trends' && (
          <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search by patient name, hospital number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            {/* Category filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              title="Filter by category"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat.category} value={cat.category}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
            
            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              title="Filter by priority"
            >
              <option value="all">All Priorities</option>
              <option value="stat">STAT</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>
          </div>
        )}

        {/* Content */}
        <div className="p-3 sm:p-4">
          {activeTab === 'trends' ? (
            <TrendAnalysisView
              patients={patients || []}
              trendPatientId={trendPatientId}
              setTrendPatientId={setTrendPatientId}
              trendParameter={trendParameter}
              setTrendParameter={setTrendParameter}
              investigations={investigations || []}
            />
          ) : (
            <InvestigationsList
              investigations={filteredInvestigations}
              onStatusUpdate={handleStatusUpdate}
              onAddResults={(inv) => {
                setSelectedInvestigation(inv);
                setShowResultModal(true);
              }}
              onViewDetails={(inv) => {
                setSelectedInvestigation(inv);
                setShowDetailsModal(true);
              }}
              getPriorityBadge={getPriorityBadge}
              getStatusBadge={getStatusBadge}
            />
          )}
        </div>
      </div>

      {/* Request Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <RequestModal
            form={requestForm}
            onSubmit={handleSubmitRequest}
            onClose={() => {
              setShowRequestModal(false);
              setSelectedTests([]);
              requestForm.reset();
            }}
            patients={patients || []}
            hospitals={hospitals || []}
            categories={categories}
            testDefinitions={testDefinitions}
            selectedTests={selectedTests}
            expandedCategories={expandedCategories}
            toggleCategory={toggleCategory}
            toggleTest={toggleTest}
            selectAllInCategory={selectAllInCategory}
            user={user}
          />
        )}
      </AnimatePresence>

      {/* Result Entry Modal */}
      <AnimatePresence>
        {showResultModal && selectedInvestigation && (
          <ResultModal
            investigation={selectedInvestigation}
            onClose={() => {
              setShowResultModal(false);
              setSelectedInvestigation(null);
              setResultValues({});
              setInterpretation('');
              setUploadedFiles([]);
            }}
            resultValues={resultValues}
            setResultValues={setResultValues}
            interpretation={interpretation}
            setInterpretation={setInterpretation}
            uploadedFiles={uploadedFiles}
            setUploadedFiles={setUploadedFiles}
            onSubmit={handleSubmitResults}
          />
        )}
      </AnimatePresence>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedInvestigation && (
          <DetailsModal
            investigation={selectedInvestigation}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedInvestigation(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Sub-components will be in separate chunks for clarity
// Investigations List Component
function InvestigationsList({
  investigations,
  onStatusUpdate,
  onAddResults,
  onViewDetails,
  getPriorityBadge,
  getStatusBadge,
}: {
  investigations: Investigation[];
  onStatusUpdate: (inv: Investigation, status: Investigation['status']) => void;
  onAddResults: (inv: Investigation) => void;
  onViewDetails: (inv: Investigation) => void;
  getPriorityBadge: (priority: string) => JSX.Element;
  getStatusBadge: (status: string) => JSX.Element | null;
}) {
  if (investigations.length === 0) {
    return (
      <div className="text-center py-12">
        <FlaskConical className="mx-auto text-gray-300" size={48} />
        <p className="mt-4 text-gray-500">No investigations found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {investigations.map((inv) => (
        <motion.div
          key={inv.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${
            inv.priority === 'stat' ? 'border-red-200 bg-red-50' :
            inv.priority === 'urgent' ? 'border-orange-200 bg-orange-50' :
            'border-gray-200 bg-white'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{inv.patientName}</h3>
                <span className="text-sm text-gray-500">({inv.hospitalNumber})</span>
                {getPriorityBadge(inv.priority)}
                {getStatusBadge(inv.status)}
              </div>
              
              <p className="text-sm text-gray-600 mt-1">{inv.typeName || inv.type}</p>
              
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {format(new Date(inv.requestedAt), 'MMM d, yyyy HH:mm')}
                </span>
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {inv.requestedByName || 'Unknown'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {inv.status === 'requested' && (
                <button
                  onClick={() => onStatusUpdate(inv, 'sample_collected')}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  <Beaker size={14} className="inline mr-1" />
                  Collect Sample
                </button>
              )}
              
              {inv.status === 'sample_collected' && (
                <button
                  onClick={() => onStatusUpdate(inv, 'processing')}
                  className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                >
                  <Activity size={14} className="inline mr-1" />
                  Start Processing
                </button>
              )}
              
              {inv.status === 'processing' && (
                <button
                  onClick={() => onAddResults(inv)}
                  className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                >
                  <Upload size={14} className="inline mr-1" />
                  Enter Results
                </button>
              )}
              
              {inv.status === 'completed' && (
                <button
                  onClick={() => onViewDetails(inv)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Eye size={14} className="inline mr-1" />
                  View Results
                </button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Trend Analysis Component
function TrendAnalysisView({
  patients,
  trendPatientId,
  setTrendPatientId,
  trendParameter,
  setTrendParameter,
  investigations,
}: {
  patients: any[];
  trendPatientId: string;
  setTrendPatientId: (id: string) => void;
  trendParameter: string;
  setTrendParameter: (param: string) => void;
  investigations: Investigation[];
}) {
  const trendData = useMemo(() => {
    if (!trendPatientId || !trendParameter) return [];
    
    const patientInvestigations = investigations.filter(
      inv => inv.patientId === trendPatientId && inv.status === 'completed' && inv.results
    );

    const data: { date: string; value: number; fullDate: Date }[] = [];
    
    patientInvestigations.forEach(inv => {
      inv.results?.forEach(result => {
        if (result.parameter === trendParameter && result.value !== undefined) {
          const numValue = typeof result.value === 'string' ? parseFloat(result.value) : result.value;
          if (!isNaN(numValue)) {
            data.push({
              date: format(new Date(result.resultDate || inv.completedAt || inv.createdAt), 'MMM d'),
              value: numValue,
              fullDate: new Date(result.resultDate || inv.completedAt || inv.createdAt),
            });
          }
        }
      });
    });

    return data.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
  }, [investigations, trendPatientId, trendParameter]);

  const refRange = referenceRanges[trendParameter];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Patient</label>
          <select
            value={trendPatientId}
            onChange={(e) => setTrendPatientId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            title="Select patient for trend analysis"
          >
            <option value="">Choose a patient</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.firstName} {p.lastName} ({p.hospitalNumber})
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Parameter</label>
          <select
            value={trendParameter}
            onChange={(e) => setTrendParameter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
            title="Select parameter for trend analysis"
          >
            {Object.keys(referenceRanges).map(param => (
              <option key={param} value={param}>{param}</option>
            ))}
          </select>
        </div>
      </div>

      {trendPatientId && trendData.length > 0 ? (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">{trendParameter} Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              {refRange && (
                <>
                  <ReferenceLine y={refRange.min} stroke="#22c55e" strokeDasharray="5 5" label="Min" />
                  <ReferenceLine y={refRange.max} stroke="#22c55e" strokeDasharray="5 5" label="Max" />
                </>
              )}
              <Area type="monotone" dataKey="value" stroke="#6366f1" fill="url(#colorValue)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : trendPatientId ? (
        <div className="text-center py-12 text-gray-500">
          <TrendingUp className="mx-auto mb-4" size={48} />
          <p>No trend data available for this parameter</p>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <TrendingUp className="mx-auto mb-4" size={48} />
          <p>Select a patient to view trends</p>
        </div>
      )}
    </div>
  );
}

// Request Modal Component  
function RequestModal({
  form,
  onSubmit,
  onClose,
  patients,
  hospitals,
  categories,
  testDefinitions,
  selectedTests,
  expandedCategories,
  toggleCategory,
  toggleTest,
  selectAllInCategory,
  user,
}: {
  form: any;
  onSubmit: (data: RequestFormData, pathologyData?: PathologyFormData) => void;
  onClose: () => void;
  patients: any[];
  hospitals: any[];
  categories: any[];
  testDefinitions: any;
  selectedTests: string[];
  expandedCategories: Set<string>;
  toggleCategory: (cat: string) => void;
  toggleTest: (test: string) => void;
  selectAllInCategory: (cat: UnifiedCategory) => void;
  user: any;
}) {
  // Pathology form state
  const [pathologyFormData, setPathologyFormData] = React.useState<PathologyFormData>({
    ...defaultPathologyFormData,
    collectionDate: format(new Date(), 'yyyy-MM-dd'),
    collectionTime: format(new Date(), 'HH:mm'),
    collector: user ? `${user.firstName} ${user.lastName}` : '',
  });

  // Check if pathology tests are selected
  const pathologyTests = [
    'Tissue Biopsy', 'Fine Needle Aspiration Cytology (FNAC)', 'Frozen Section',
    'Pap Smear', 'Fluid Cytology', 'Immunohistochemistry',
    'Histology', 'Cytology', 'Autopsy'
  ];
  const hasPathologySelected = selectedTests.some(t => pathologyTests.includes(t));
  
  // Watch for patient selection changes
  const selectedPatientId = form.watch('patientId');
  const selectedPatient = useMemo(() => {
    return patients.find(p => p.id === selectedPatientId);
  }, [patients, selectedPatientId]);

  // Calculate patient age
  const calculateAge = (dateOfBirth: Date | string): number => {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  // Auto-select hospital when patient is selected
  React.useEffect(() => {
    if (selectedPatient?.registeredHospitalId) {
      form.setValue('hospitalId', selectedPatient.registeredHospitalId);
    }
  }, [selectedPatient, form]);

  // Get hospital name for the patient
  const patientHospital = useMemo(() => {
    if (!selectedPatient?.registeredHospitalId) return null;
    return hospitals.find(h => h.id === selectedPatient.registeredHospitalId);
  }, [hospitals, selectedPatient]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FlaskConical className="text-primary-600" />
            New Investigation Request
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="overflow-y-auto max-h-[calc(90vh-8rem)]">
          <div className="p-4 space-y-4">
            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
              <select
                {...form.register('patientId')}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.hospitalNumber})
                  </option>
                ))}
              </select>
              {form.formState.errors.patientId && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.patientId.message}</p>
              )}
            </div>

            {/* Patient Details Card - Shows when patient is selected */}
            {selectedPatient && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Patient Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-primary-600" />
                    </div>
                  </div>
                  
                  {/* Patient Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedPatient.firstName} {selectedPatient.middleName || ''} {selectedPatient.lastName}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        selectedPatient.gender === 'male' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-pink-100 text-pink-700'
                      }`}>
                        {selectedPatient.gender === 'male' ? 'Male' : 'Female'}
                      </span>
                    </div>
                    
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Hospital No:</span>
                        <p className="font-medium text-gray-900">{selectedPatient.hospitalNumber}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Age:</span>
                        <p className="font-medium text-gray-900">
                          {selectedPatient.dateOfBirth 
                            ? `${calculateAge(selectedPatient.dateOfBirth)} years` 
                            : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Blood Group:</span>
                        <p className="font-medium text-gray-900">
                          {selectedPatient.bloodGroup || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Genotype:</span>
                        <p className="font-medium text-gray-900">
                          {selectedPatient.genotype || 'Not specified'}
                        </p>
                      </div>
                    </div>

                    {/* Allergies Warning */}
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                      <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-medium text-red-700">Known Allergies:</span>
                          <p className="text-sm text-red-600">{selectedPatient.allergies.join(', ')}</p>
                        </div>
                      </div>
                    )}

                    {/* Chronic Conditions */}
                    {selectedPatient.chronicConditions && selectedPatient.chronicConditions.length > 0 && (
                      <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                        <Activity className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-medium text-amber-700">Chronic Conditions:</span>
                          <p className="text-sm text-amber-600">{selectedPatient.chronicConditions.join(', ')}</p>
                        </div>
                      </div>
                    )}

                    {/* Hospital Info */}
                    {patientHospital && (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="text-gray-500">Registered Hospital:</span>{' '}
                        <span className="font-medium">{patientHospital.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Hospital Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hospital *</label>
              <Controller
                name="hospitalId"
                control={form.control}
                render={({ field }) => (
                  <HospitalSelector
                    value={field.value}
                    onChange={field.onChange}
                    error={form.formState.errors.hospitalId?.message}
                  />
                )}
              />
            </div>

            {/* Priority and Fasting */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  {...form.register('priority')}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>

              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  {...form.register('fasting')}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <label className="ml-2 text-sm text-gray-700">Patient is fasting</label>
              </div>
            </div>

            {/* Clinical Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Clinical Details</label>
              <textarea
                {...form.register('clinicalDetails')}
                rows={2}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="Relevant clinical information..."
              />
            </div>

            {/* Test Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tests ({selectedTests.length} selected)
              </label>
              <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {categories.map(cat => (
                  <div key={cat.category} className="border-b last:border-b-0">
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.category)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        <span>{cat.icon}</span>
                        {cat.label}
                        {(cat.category === 'histopathology' || cat.category === 'pathology') && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">WHO Form</span>
                        )}
                      </span>
                      {expandedCategories.has(cat.category) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    
                    {expandedCategories.has(cat.category) && (
                      <div className="px-3 pb-3 bg-gray-50">
                        <button
                          type="button"
                          onClick={() => selectAllInCategory(cat.category)}
                          className="text-xs text-primary-600 hover:underline mb-2"
                        >
                          Select/Deselect All
                        </button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(testDefinitions[cat.category] || []).map((test: any) => (
                            <label
                              key={test.id}
                              className="flex items-center gap-2 p-2 bg-white rounded border cursor-pointer hover:border-primary-300"
                            >
                              <input
                                type="checkbox"
                                checked={selectedTests.includes(test.name)}
                                onChange={() => toggleTest(test.name)}
                                className="w-4 h-4 text-primary-600 rounded"
                              />
                              <span className="text-sm">{test.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* WHO Pathology Request Form - Shows when pathology tests selected */}
            {hasPathologySelected && (
              <PathologyRequestForm
                formData={pathologyFormData}
                onChange={(updates) => setPathologyFormData(prev => ({ ...prev, ...updates }))}
                selectedTests={selectedTests}
              />
            )}
          </div>

          <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            {hasPathologySelected && (
              <button
                type="button"
                onClick={() => {
                  const patient = patients.find(p => p.id === form.getValues('patientId'));
                  const hospital = hospitals.find(h => h.id === form.getValues('hospitalId'));
                  if (!patient) {
                    toast.error('Please select a patient first');
                    return;
                  }
                  if (!pathologyFormData.clinicalHistory || !pathologyFormData.clinicalDiagnosis) {
                    toast.error('Please fill in required pathology fields (Clinical History and Diagnosis)');
                    return;
                  }
                  if (!pathologyFormData.specimenSite) {
                    toast.error('Please specify the specimen site');
                    return;
                  }
                  generatePathologyRequestPDF({
                    requestDate: new Date(),
                    patient: {
                      name: `${patient.firstName} ${patient.lastName}`,
                      hospitalNumber: patient.hospitalNumber || patient.id.slice(0, 8).toUpperCase(),
                      age: patient.dateOfBirth ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
                      gender: patient.gender,
                      phone: patient.phone,
                    },
                    hospitalName: hospital?.name || 'AstroHEALTH Facility',
                    hospitalPhone: hospital?.phone,
                    hospitalEmail: hospital?.email,
                    requestedBy: user ? `${user.firstName} ${user.lastName}` : 'Requesting Clinician',
                    requestingDepartment: user?.specialization || 'Surgery',
                    priority: form.getValues('priority') === 'stat' ? 'frozen_section' : form.getValues('priority'),
                    ...pathologyFormData,
                  });
                  toast.success('Pathology request PDF downloaded');
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2"
              >
                <Download size={16} />
                Download PDF
              </button>
            )}
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <Save size={16} />
              Submit Request
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// Result Modal Component
function ResultModal({
  investigation,
  onClose,
  resultValues,
  setResultValues,
  interpretation,
  setInterpretation,
  uploadedFiles,
  setUploadedFiles,
  onSubmit,
}: {
  investigation: Investigation;
  onClose: () => void;
  resultValues: Record<string, string>;
  setResultValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  interpretation: string;
  setInterpretation: (val: string) => void;
  uploadedFiles: File[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<File[]>>;
  onSubmit: () => void;
}) {
  // Get parameters for the tests
  const testTypes = investigation.type?.split(',') || [];
  const allTests = Object.values(testDefinitions).flat();
  const parameters: string[] = [];
  
  testTypes.forEach(type => {
    const test = allTests.find((t: any) => t.id === type || t.name === type);
    if (test?.parameters) {
      parameters.push(...test.parameters);
    } else if (test) {
      parameters.push(test.name);
    }
  });

  const uniqueParams = [...new Set(parameters)];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Enter Results</h2>
            <p className="text-sm text-gray-500">{investigation.patientName} - {investigation.typeName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-10rem)] space-y-4">
          {/* Parameter inputs */}
          <div className="space-y-3">
            {uniqueParams.map(param => {
              const ref = referenceRanges[param];
              return (
                <div key={param} className="flex items-center gap-4">
                  <label className="w-40 text-sm font-medium text-gray-700">{param}</label>
                  <input
                    type="text"
                    value={resultValues[param] || ''}
                    onChange={(e) => setResultValues(prev => ({ ...prev, [param]: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder={ref ? `Ref: ${ref.min} - ${ref.max} ${ref.unit}` : 'Enter value'}
                  />
                  {ref && <span className="text-xs text-gray-500 w-24">{ref.unit}</span>}
                </div>
              );
            })}
          </div>

          {/* Interpretation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interpretation</label>
            <textarea
              value={interpretation}
              onChange={(e) => setInterpretation(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              placeholder="Clinical interpretation of results..."
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachments</label>
            <input
              type="file"
              multiple
              onChange={(e) => setUploadedFiles(Array.from(e.target.files || []))}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              title="Upload attachment files"
            />
            {uploadedFiles.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{uploadedFiles.length} file(s) selected</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button onClick={onSubmit} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Save Results
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Details Modal Component
function DetailsModal({
  investigation,
  onClose,
}: {
  investigation: Investigation;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold">Investigation Results</h2>
            <p className="text-sm text-gray-500">{investigation.patientName} - {investigation.typeName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {/* Results Table */}
          {investigation.results && investigation.results.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Parameter</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Result</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Unit</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Reference</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Flag</th>
                </tr>
              </thead>
              <tbody>
                {investigation.results.map((result, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 px-3 text-sm">{result.parameter}</td>
                    <td className="py-2 px-3 text-sm font-medium">{result.value}</td>
                    <td className="py-2 px-3 text-sm text-gray-500">{result.unit || '-'}</td>
                    <td className="py-2 px-3 text-sm text-gray-500">{result.referenceRange || '-'}</td>
                    <td className="py-2 px-3">
                      {result.flag && result.flag !== 'normal' && (
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          result.flag === 'H' || result.flag === 'HH' || result.flag === 'high' ? 'bg-red-100 text-red-700' :
                          result.flag === 'L' || result.flag === 'LL' || result.flag === 'low' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {result.flag}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-8">No results available</p>
          )}

          {/* Interpretation */}
          {investigation.interpretation && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Interpretation</h4>
              <p className="text-sm text-gray-600">{investigation.interpretation}</p>
            </div>
          )}

          {/* Attachments */}
          {investigation.attachments && investigation.attachments.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-700 mb-2">Attachments</h4>
              <div className="grid grid-cols-2 gap-2">
                {investigation.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    download={att.fileName}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <FileImage size={16} className="text-gray-400" />
                    <span className="text-sm truncate">{att.fileName}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Requested:</span>
              <span className="ml-2">{format(new Date(investigation.requestedAt), 'MMM d, yyyy HH:mm')}</span>
            </div>
            {investigation.completedAt && (
              <div>
                <span className="text-gray-500">Completed:</span>
                <span className="ml-2">{format(new Date(investigation.completedAt), 'MMM d, yyyy HH:mm')}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Requested by:</span>
              <span className="ml-2">{investigation.requestedByName}</span>
            </div>
            {investigation.completedByName && (
              <div>
                <span className="text-gray-500">Completed by:</span>
                <span className="ml-2">{investigation.completedByName}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg flex items-center gap-2">
            <Printer size={16} />
            Print
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
