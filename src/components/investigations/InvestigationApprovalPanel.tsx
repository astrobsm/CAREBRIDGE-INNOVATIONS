/**
 * Investigation Approval Panel Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * UI component for doctors to approve/reject investigations
 * with batch operations and real-time status tracking
 */

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FlaskConical,
  User,
  Calendar,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  X,
  Send,
  RefreshCw,
  Beaker,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { db } from '../../database';
import { useAuth } from '../../contexts/AuthContext';
import { investigationApprovalService } from '../../services/investigationApprovalService';
import type { UserRole } from '../../types';

// ==================== TYPES ====================

interface InvestigationApprovalPanelProps {
  hospitalId?: string;
  patientId?: string;
  compact?: boolean;
  onApprovalComplete?: () => void;
}

// ==================== COMPONENT ====================

export default function InvestigationApprovalPanel({
  hospitalId,
  patientId,
  compact = false,
  onApprovalComplete,
}: InvestigationApprovalPanelProps) {
  const { user } = useAuth();
  
  // UI State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'stat' | 'urgent' | 'routine'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [autoRequestEnabled, setAutoRequestEnabled] = useState(true);
  
  // Fetch pending investigations
  const pendingInvestigations = useLiveQuery(async () => {
    let investigations = await db.investigations.toArray();
    
    // Filter by hospital if specified
    if (hospitalId) {
      investigations = investigations.filter(inv => inv.hospitalId === hospitalId);
    }
    
    // Filter by patient if specified
    if (patientId) {
      investigations = investigations.filter(inv => inv.patientId === patientId);
    }
    
    // Only pending approvals
    return investigations.filter(inv => 
      inv.approvalStatus === 'pending' || !inv.approvalStatus
    ).sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { stat: 0, urgent: 1, routine: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
  }, [hospitalId, patientId]);
  
  // Get patient info map
  const patientMap = useLiveQuery(async () => {
    const patients = await db.patients.toArray();
    const map = new Map<string, { name: string; hospitalNumber: string }>();
    patients.forEach(p => {
      map.set(p.id, { 
        name: `${p.firstName} ${p.lastName}`, 
        hospitalNumber: p.hospitalNumber 
      });
    });
    return map;
  }, []);
  
  // Filtered investigations
  const filteredInvestigations = useMemo(() => {
    if (!pendingInvestigations) return [];
    
    return pendingInvestigations.filter(inv => {
      // Priority filter
      if (priorityFilter !== 'all' && inv.priority !== priorityFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const patientInfo = patientMap?.get(inv.patientId);
        const matchesPatient = patientInfo?.name.toLowerCase().includes(query) ||
          patientInfo?.hospitalNumber.toLowerCase().includes(query);
        const matchesType = inv.typeName?.toLowerCase().includes(query) ||
          (typeof inv.type === 'string' && inv.type.toLowerCase().includes(query));
        const matchesCategory = inv.category?.toLowerCase().includes(query);
        
        if (!matchesPatient && !matchesType && !matchesCategory) return false;
      }
      
      return true;
    });
  }, [pendingInvestigations, priorityFilter, searchQuery, patientMap]);
  
  // Statistics
  const stats = useMemo(() => {
    if (!pendingInvestigations) return { total: 0, stat: 0, urgent: 0, routine: 0 };
    return {
      total: pendingInvestigations.length,
      stat: pendingInvestigations.filter(i => i.priority === 'stat').length,
      urgent: pendingInvestigations.filter(i => i.priority === 'urgent').length,
      routine: pendingInvestigations.filter(i => i.priority === 'routine').length,
    };
  }, [pendingInvestigations]);
  
  // ==================== HANDLERS ====================
  
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };
  
  const selectAll = () => {
    if (selectedIds.size === filteredInvestigations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvestigations.map(i => i.id)));
    }
  };
  
  const handleApprove = async (investigationId: string) => {
    if (!user) {
      toast.error('Please log in to approve investigations');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await investigationApprovalService.approveInvestigation(
        investigationId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.role as UserRole,
        autoRequestEnabled
      );
      
      if (result.success) {
        toast.success(result.message + (result.labRequestId ? ' Lab request created.' : ''));
        onApprovalComplete?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to approve investigation');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleReject = async () => {
    if (!user || !rejectingId) {
      toast.error('Please provide rejection details');
      return;
    }
    
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await investigationApprovalService.rejectInvestigation(
        rejectingId,
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.role as UserRole,
        rejectionReason
      );
      
      if (result.success) {
        toast.success('Investigation rejected');
        setShowRejectionModal(false);
        setRejectingId(null);
        setRejectionReason('');
        onApprovalComplete?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to reject investigation');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleBatchApprove = async () => {
    if (!user || selectedIds.size === 0) {
      toast.error('Please select investigations to approve');
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await investigationApprovalService.batchApprove(
        Array.from(selectedIds),
        user.id,
        `${user.firstName} ${user.lastName}`,
        user.role as UserRole,
        autoRequestEnabled
      );
      
      if (result.successful.length > 0) {
        toast.success(
          `Approved ${result.successful.length} investigation(s)` +
          (result.labRequestsCreated > 0 ? `. ${result.labRequestsCreated} lab request(s) created.` : '')
        );
        setSelectedIds(new Set());
        onApprovalComplete?.();
      }
      
      if (result.failed.length > 0) {
        toast.error(`Failed to approve ${result.failed.length} investigation(s)`);
      }
    } catch (error) {
      toast.error('Failed to batch approve');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const openRejectModal = (id: string) => {
    setRejectingId(id);
    setShowRejectionModal(true);
  };
  
  // ==================== BADGE HELPERS ====================
  
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'stat':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full animate-pulse">
            <AlertTriangle size={12} />
            STAT
          </span>
        );
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full">
            <Clock size={12} />
            URGENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
            <Clock size={12} />
            Routine
          </span>
        );
    }
  };
  
  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      hematology: 'bg-red-50 text-red-700',
      biochemistry: 'bg-blue-50 text-blue-700',
      microbiology: 'bg-green-50 text-green-700',
      imaging: 'bg-purple-50 text-purple-700',
      radiology: 'bg-purple-50 text-purple-700',
      pathology: 'bg-amber-50 text-amber-700',
      cardiology: 'bg-pink-50 text-pink-700',
      histopathology: 'bg-orange-50 text-orange-700',
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${colors[category] || 'bg-gray-50 text-gray-600'}`}>
        <Beaker size={12} />
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  };
  
  // ==================== RENDER ====================
  
  if (!pendingInvestigations) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
      </div>
    );
  }
  
  if (compact) {
    // Compact view for embedding in other pages
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="text-amber-600" size={20} />
              <h3 className="font-semibold text-gray-900">Pending Approvals</h3>
              {stats.total > 0 && (
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-sm font-medium">
                  {stats.total}
                </span>
              )}
            </div>
            {stats.stat > 0 && (
              <span className="text-xs text-red-600 font-medium animate-pulse">
                {stats.stat} STAT pending!
              </span>
            )}
          </div>
        </div>
        
        {filteredInvestigations.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <CheckCircle2 className="mx-auto mb-2 text-green-400" size={32} />
            <p>No pending approvals</p>
          </div>
        ) : (
          <div className="divide-y max-h-64 overflow-y-auto">
            {filteredInvestigations.slice(0, 5).map(inv => (
              <div key={inv.id} className="p-3 hover:bg-gray-50 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getPriorityBadge(inv.priority)}
                    <span className="font-medium text-sm truncate">
                      {inv.typeName || inv.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {patientMap?.get(inv.patientId)?.name || 'Unknown Patient'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleApprove(inv.id)}
                    disabled={isProcessing}
                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                    title="Approve"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => openRejectModal(inv.id)}
                    disabled={isProcessing}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Reject"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
            {filteredInvestigations.length > 5 && (
              <div className="p-3 text-center text-sm text-primary-600 hover:bg-gray-50 cursor-pointer">
                View all {filteredInvestigations.length} pending approvals
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
  
  // Full view
  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FlaskConical className="text-primary-600" />
              Investigation Approvals
            </h2>
            <p className="text-sm text-gray-500">Review and approve pending investigation requests</p>
          </div>
          
          {/* Auto-request toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRequestEnabled}
              onChange={(e) => setAutoRequestEnabled(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700">Auto-send to lab on approval</span>
            <Send size={14} className="text-gray-400" />
          </label>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setPriorityFilter('all')}
            className={`p-3 rounded-lg border text-left transition-all ${
              priorityFilter === 'all' 
                ? 'bg-primary-50 border-primary-200' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">Total Pending</p>
          </button>
          <button
            onClick={() => setPriorityFilter('stat')}
            className={`p-3 rounded-lg border text-left transition-all ${
              priorityFilter === 'stat' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <p className="text-2xl font-bold text-red-600">{stats.stat}</p>
            <p className="text-xs text-gray-500">STAT Priority</p>
          </button>
          <button
            onClick={() => setPriorityFilter('urgent')}
            className={`p-3 rounded-lg border text-left transition-all ${
              priorityFilter === 'urgent' 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <p className="text-2xl font-bold text-orange-600">{stats.urgent}</p>
            <p className="text-xs text-gray-500">Urgent</p>
          </button>
          <button
            onClick={() => setPriorityFilter('routine')}
            className={`p-3 rounded-lg border text-left transition-all ${
              priorityFilter === 'routine' 
                ? 'bg-gray-100 border-gray-300' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <p className="text-2xl font-bold text-gray-600">{stats.routine}</p>
            <p className="text-xs text-gray-500">Routine</p>
          </button>
        </div>
      </div>
      
      {/* Filters & Batch Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, test type..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          {/* Batch Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {selectedIds.size === filteredInvestigations.length ? 'Deselect All' : 'Select All'}
            </button>
            
            {selectedIds.size > 0 && (
              <>
                <button
                  onClick={handleBatchApprove}
                  disabled={isProcessing}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 size={16} />
                  Approve {selectedIds.size}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Investigation List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filteredInvestigations.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto mb-4 text-green-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Pending Approvals</h3>
            <p className="text-gray-500">All investigation requests have been reviewed</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredInvestigations.map(inv => {
              const patientInfo = patientMap?.get(inv.patientId);
              const isExpanded = expandedId === inv.id;
              const isSelected = selectedIds.has(inv.id);
              
              return (
                <div key={inv.id} className={`transition-colors ${isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                  {/* Main Row */}
                  <div className="p-4 flex items-center gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(inv.id)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      title="Select investigation"
                    />
                    
                    {/* Priority indicator */}
                    <div className={`w-1.5 h-12 rounded-full ${
                      inv.priority === 'stat' ? 'bg-red-500 animate-pulse' :
                      inv.priority === 'urgent' ? 'bg-orange-500' : 'bg-gray-300'
                    }`} />
                    
                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getPriorityBadge(inv.priority)}
                        {getCategoryBadge(inv.category)}
                        <span className="font-semibold text-gray-900">
                          {inv.typeName || inv.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {patientInfo?.name || 'Unknown Patient'}
                          {patientInfo?.hospitalNumber && (
                            <span className="text-gray-400">({patientInfo.hospitalNumber})</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {format(new Date(inv.requestedAt), 'dd MMM yyyy, HH:mm')}
                        </span>
                        <span>By: {inv.requestedByName || 'Unknown'}</span>
                      </div>
                    </div>
                    
                    {/* Expand button */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(inv.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50 flex items-center gap-1"
                      >
                        <Check size={14} />
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectModal(inv.id)}
                        disabled={isProcessing}
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 flex items-center gap-1"
                      >
                        <X size={14} />
                        Reject
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t bg-gray-50 px-4 py-3 overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">Clinical Details</h4>
                            <p className="text-gray-600">
                              {inv.clinicalDetails || inv.clinicalInfo || 'No clinical details provided'}
                            </p>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-700 mb-1">Test Information</h4>
                            <ul className="text-gray-600 space-y-1">
                              <li>Category: {inv.category}</li>
                              <li>Type: {inv.typeName || inv.type}</li>
                              <li>Fasting Required: {inv.fasting ? 'Yes' : 'No'}</li>
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Rejection Modal */}
      <AnimatePresence>
        {showRejectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowRejectionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <XCircle className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Reject Investigation</h3>
              </div>
              
              <p className="text-gray-600 mb-4">
                Please provide a reason for rejecting this investigation request. This will be visible to the requesting clinician.
              </p>
              
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              />
              
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectingId(null);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <RefreshCw className="animate-spin" size={16} />
                  ) : (
                    <XCircle size={16} />
                  )}
                  Reject Investigation
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
