/**
 * PatientOrdersReview Component
 * 
 * Displays chronological history of all clinical orders (prescriptions, investigations,
 * lab requests, treatment plans) for a patient. Allows users to:
 * - Review existing orders before creating new ones
 * - Continue / Modify / Remove / Archive existing orders
 * - Generate a harmonized summary
 * - Print summary as A4 PDF or 80mm thermal receipt
 * 
 * This component is designed to be embedded inside prescription, investigation,
 * and treatment plan creation flows.
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Pill,
  FlaskConical,
  Beaker,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Clock,
  XCircle,
  Archive,
  Edit3,
  Trash2,
  Play,
  Filter,
  AlertCircle,
  Printer,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { db } from '../../database';
import { syncRecord } from '../../services/cloudSyncService';
import {
  usePatientOrdersHistory,
  getOrderStatusColor,
  getOrderTypeLabel,
  getOrderTypeColor,
  type OrderType,
  type OrderStatus,
  type UnifiedOrderItem,
} from '../../hooks/usePatientOrdersHistory';
import { ExportButtonWithModal } from '../common/ExportOptionsModal';
import { generateOrdersSummaryA4PDF, generateOrdersSummaryThermalPDF } from '../../utils/ordersSummaryPdfGenerator';
import type { Prescription, Investigation, LabRequest } from '../../types';

// Icons for order types
const orderTypeIcons: Record<OrderType, React.ReactNode> = {
  prescription: <Pill size={16} />,
  investigation: <FlaskConical size={16} />,
  lab_request: <Beaker size={16} />,
  treatment_plan: <ClipboardList size={16} />,
};

// Status icons
const statusIcons: Record<OrderStatus, React.ReactNode> = {
  active: <Play size={14} className="text-blue-600" />,
  pending: <Clock size={14} className="text-amber-600" />,
  completed: <CheckCircle size={14} className="text-green-600" />,
  cancelled: <XCircle size={14} className="text-red-600" />,
  archived: <Archive size={14} className="text-gray-600" />,
};

export interface PatientOrdersReviewProps {
  patientId: string | null | undefined;
  patientName?: string;
  hospitalNumber?: string;
  hospitalId?: string;
  hospitalName?: string;
  /** Which order types to show. Default: all */
  orderTypes?: OrderType[];
  /** Focus on this type (highlights that category). E.g., 'prescription' when in pharmacy */
  focusType?: OrderType;
  /** Called when user wants to continue/carry forward items from an existing order */
  onContinueOrder?: (order: UnifiedOrderItem) => void;
  /** Called when user clicks "Modify" on an existing order */
  onModifyOrder?: (order: UnifiedOrderItem) => void;
  /** Whether the panel starts collapsed */
  defaultCollapsed?: boolean;
  /** Maximum height for the scrollable area */
  maxHeight?: string;
}

export default function PatientOrdersReview({
  patientId,
  patientName,
  hospitalNumber,
  hospitalId,
  hospitalName,
  orderTypes = ['prescription', 'investigation', 'lab_request', 'treatment_plan'],
  focusType,
  onContinueOrder,
  onModifyOrder,
  defaultCollapsed = false,
  maxHeight = '400px',
}: PatientOrdersReviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [filterType, setFilterType] = useState<OrderType | 'all'>(focusType || 'all');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const {
    allOrders,
    activeMedications,
    activeInvestigations,
    isLoading,
  } = usePatientOrdersHistory(patientId, orderTypes);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return allOrders.filter(order => {
      const matchesType = filterType === 'all' || order.orderType === filterType;
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      return matchesType && matchesStatus;
    });
  }, [allOrders, filterType, filterStatus]);

  // Count by type
  const countByType = useMemo(() => {
    const counts: Record<string, number> = { all: allOrders.length };
    allOrders.forEach(o => {
      counts[o.orderType] = (counts[o.orderType] || 0) + 1;
    });
    return counts;
  }, [allOrders]);

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // Handle archive
  const handleArchiveOrder = async (order: UnifiedOrderItem) => {
    try {
      if (order.orderType === 'prescription') {
        await db.prescriptions.update(order.id, { status: 'cancelled' });
        await syncRecord('prescriptions', { id: order.id, status: 'cancelled' } as Record<string, unknown>);
      } else if (order.orderType === 'investigation') {
        await db.investigations.update(order.id, { status: 'cancelled', updatedAt: new Date() });
        await syncRecord('investigations', { id: order.id, status: 'cancelled' } as Record<string, unknown>);
      } else if (order.orderType === 'lab_request') {
        await db.labRequests.update(order.id, { status: 'cancelled' });
        await syncRecord('labRequests', { id: order.id, status: 'cancelled' } as Record<string, unknown>);
      } else if (order.orderType === 'treatment_plan') {
        await db.treatmentPlans.update(order.id, { status: 'discontinued', updatedAt: new Date() });
        await syncRecord('treatmentPlans', { id: order.id, status: 'discontinued' } as Record<string, unknown>);
      }
      toast.success(`${getOrderTypeLabel(order.orderType)} archived`);
    } catch (error) {
      console.error('Error archiving order:', error);
      toast.error('Failed to archive order');
    }
  };

  // Handle remove (cancel)
  const handleRemoveOrder = async (order: UnifiedOrderItem) => {
    if (!confirm(`Cancel this ${getOrderTypeLabel(order.orderType).toLowerCase()}? This cannot be undone.`)) return;
    try {
      if (order.orderType === 'prescription') {
        await db.prescriptions.update(order.id, { status: 'cancelled' });
        await syncRecord('prescriptions', { id: order.id, status: 'cancelled' } as Record<string, unknown>);
      } else if (order.orderType === 'investigation') {
        await db.investigations.update(order.id, { status: 'cancelled', updatedAt: new Date() });
        await syncRecord('investigations', { id: order.id, status: 'cancelled' } as Record<string, unknown>);
      } else if (order.orderType === 'lab_request') {
        await db.labRequests.update(order.id, { status: 'cancelled' });
        await syncRecord('labRequests', { id: order.id, status: 'cancelled' } as Record<string, unknown>);
      } else if (order.orderType === 'treatment_plan') {
        await db.treatmentPlans.update(order.id, { status: 'cancelled', updatedAt: new Date() });
        await syncRecord('treatmentPlans', { id: order.id, status: 'cancelled' } as Record<string, unknown>);
      }
      toast.success(`${getOrderTypeLabel(order.orderType)} cancelled`);
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  if (!patientId) {
    return null;
  }

  const hasActiveOrders = activeMedications.length > 0 || activeInvestigations.length > 0;

  return (
    <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Header - Always visible */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
          hasActiveOrders ? 'bg-amber-50 hover:bg-amber-100' : 'bg-gray-50 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${hasActiveOrders ? 'bg-amber-100' : 'bg-gray-200'}`}>
            <History size={20} className={hasActiveOrders ? 'text-amber-700' : 'text-gray-600'} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
              Patient Orders History
              {allOrders.length > 0 && (
                <span className="ml-2 text-xs font-normal bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                  {allOrders.length} order{allOrders.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
            {hasActiveOrders && (
              <p className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
                <AlertCircle size={12} />
                {activeMedications.length > 0 && `${activeMedications.length} active medication(s)`}
                {activeMedications.length > 0 && activeInvestigations.length > 0 && ' • '}
                {activeInvestigations.length > 0 && `${activeInvestigations.length} pending investigation(s)`}
              </p>
            )}
            {!hasActiveOrders && allOrders.length > 0 && (
              <p className="text-xs text-gray-500 mt-0.5">
                Review previous orders before creating new ones
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isCollapsed && allOrders.length > 0 && (
            <ExportButtonWithModal
              generateA4PDF={() => generateOrdersSummaryA4PDF({
                patientName: patientName || 'Unknown Patient',
                hospitalNumber: hospitalNumber || '',
                hospitalName: hospitalName || '',
                orders: filteredOrders,
                generatedAt: new Date(),
              })}
              generateThermalPDF={() => generateOrdersSummaryThermalPDF({
                patientName: patientName || 'Unknown Patient',
                hospitalNumber: hospitalNumber || '',
                orders: filteredOrders,
                generatedAt: new Date(),
              })}
              fileNamePrefix={`Orders_Summary_${patientName || 'Patient'}`}
              buttonText=""
              buttonClassName="p-1.5 text-gray-600 hover:bg-white rounded-lg transition-colors"
              modalTitle="Export Orders Summary"
            />
          )}
          {isCollapsed ? <ChevronDown size={20} className="text-gray-400" /> : <ChevronUp size={20} className="text-gray-400" />}
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {isLoading ? (
              <div className="p-6 text-center text-gray-500">
                <Clock className="w-6 h-6 mx-auto mb-2 animate-spin" />
                <p className="text-sm">Loading patient orders...</p>
              </div>
            ) : allOrders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm font-medium">No previous orders found</p>
                <p className="text-xs mt-1">This patient has no prior prescriptions, investigations, or treatment plans on record.</p>
              </div>
            ) : (
              <>
                {/* Filter Bar */}
                <div className="px-4 py-2 bg-white border-b flex flex-wrap items-center gap-2">
                  <Filter size={14} className="text-gray-400" />
                  {/* Type filter pills */}
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filterType === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    All ({countByType.all || 0})
                  </button>
                  {orderTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                        filterType === type
                          ? 'bg-gray-800 text-white'
                          : `${getOrderTypeColor(type)} hover:opacity-80`
                      }`}
                    >
                      {orderTypeIcons[type]}
                      {getOrderTypeLabel(type)} ({countByType[type] || 0})
                    </button>
                  ))}
                  {/* Status filter */}
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as OrderStatus | 'all')}
                    className="ml-auto text-xs border rounded-lg px-2 py-1 bg-white"
                    title="Filter by status"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Orders List */}
                <div className="overflow-y-auto" style={{ maxHeight }}>
                  {filteredOrders.length === 0 ? (
                    <div className="p-6 text-center text-gray-400 text-sm">
                      No orders match the current filters
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredOrders.map((order) => (
                        <div
                          key={`${order.orderType}-${order.id}`}
                          className={`transition-colors ${
                            selectedOrders.has(order.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          {/* Order Row */}
                          <div className="flex items-start gap-3 p-3">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={selectedOrders.has(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                              title={`Select ${getOrderTypeLabel(order.orderType)}`}
                            />

                            {/* Type Icon */}
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${getOrderTypeColor(order.orderType)}`}>
                              {orderTypeIcons[order.orderType]}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-gray-900 truncate">
                                  {order.summary}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded-full text-xs border flex items-center gap-1 ${getOrderStatusColor(order.status)}`}>
                                  {statusIcons[order.status]}
                                  {order.status}
                                </span>
                                {order.priority === 'urgent' && (
                                  <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-700 border border-red-200">
                                    URGENT
                                  </span>
                                )}
                                {order.priority === 'stat' && (
                                  <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-200 text-red-800 border border-red-300 font-bold">
                                    STAT
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {format(order.date, 'MMM d, yyyy h:mm a')}
                                {order.requestedBy && ` • By: ${order.requestedBy}`}
                              </div>

                              {/* Details preview */}
                              {order.details.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {order.details.slice(0, expandedOrderId === order.id ? undefined : 3).map((detail, idx) => (
                                    <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                      {detail}
                                    </span>
                                  ))}
                                  {order.details.length > 3 && expandedOrderId !== order.id && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedOrderId(order.id)}
                                      className="text-xs text-blue-600 hover:text-blue-800 px-1"
                                    >
                                      +{order.details.length - 3} more
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {(order.status === 'active' || order.status === 'pending') && onContinueOrder && (
                                <button
                                  type="button"
                                  onClick={() => onContinueOrder(order)}
                                  className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                  title="Continue / Carry Forward"
                                >
                                  <Play size={14} />
                                </button>
                              )}
                              {(order.status === 'active' || order.status === 'pending') && onModifyOrder && (
                                <button
                                  type="button"
                                  onClick={() => onModifyOrder(order)}
                                  className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Modify"
                                >
                                  <Edit3 size={14} />
                                </button>
                              )}
                              {order.status !== 'cancelled' && order.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => handleArchiveOrder(order)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
                                  title="Archive"
                                >
                                  <Archive size={14} />
                                </button>
                              )}
                              {order.status !== 'cancelled' && order.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOrder(order)}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  title="Cancel / Remove"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                                title="Expand details"
                              >
                                {expandedOrderId === order.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          <AnimatePresence>
                            {expandedOrderId === order.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-12 pb-3">
                                  <OrderDetailView order={order} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Summary footer */}
                {filteredOrders.length > 0 && (
                  <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Showing {filteredOrders.length} of {allOrders.length} orders
                      {selectedOrders.size > 0 && ` • ${selectedOrders.size} selected`}
                    </span>
                    <div className="flex items-center gap-2">
                      <ExportButtonWithModal
                        generateA4PDF={() => generateOrdersSummaryA4PDF({
                          patientName: patientName || 'Unknown Patient',
                          hospitalNumber: hospitalNumber || '',
                          hospitalName: hospitalName || '',
                          orders: filteredOrders,
                          generatedAt: new Date(),
                        })}
                        generateThermalPDF={() => generateOrdersSummaryThermalPDF({
                          patientName: patientName || 'Unknown Patient',
                          hospitalNumber: hospitalNumber || '',
                          orders: filteredOrders,
                          generatedAt: new Date(),
                        })}
                        fileNamePrefix={`Orders_Summary_${patientName || 'Patient'}`}
                        buttonText="Print Summary"
                        buttonClassName="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border hover:bg-gray-50 transition-colors"
                        modalTitle="Export Orders Summary"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * OrderDetailView - expanded view with full details per order type
 */
function OrderDetailView({ order }: { order: UnifiedOrderItem }) {
  if (order.orderType === 'prescription') {
    const rx = order.source as Prescription;
    return (
      <div className="bg-violet-50/50 rounded-lg p-3 space-y-2">
        <h4 className="text-xs font-semibold text-violet-800 uppercase tracking-wide">Prescription Details</h4>
        <div className="space-y-1.5">
          {rx.medications?.map((med, idx) => (
            <div key={med.id || idx} className="flex items-center justify-between bg-white p-2 rounded border text-xs">
              <div>
                <span className="font-medium text-gray-900">{med.name}</span>
                {med.genericName && <span className="text-gray-500 ml-1">({med.genericName})</span>}
                <div className="text-gray-600 mt-0.5">
                  {med.dosage} • {med.route} • {med.frequency} • {med.duration}
                  {med.quantity > 0 && ` • Qty: ${med.quantity}`}
                </div>
                {med.instructions && (
                  <div className="text-gray-500 italic mt-0.5">{med.instructions}</div>
                )}
              </div>
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                med.isDispensed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {med.isDispensed ? 'Dispensed' : 'Pending'}
              </span>
            </div>
          ))}
        </div>
        {rx.notes && (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
            <strong>Notes:</strong> {rx.notes}
          </div>
        )}
      </div>
    );
  }

  if (order.orderType === 'investigation') {
    const inv = order.source as Investigation;
    return (
      <div className="bg-blue-50/50 rounded-lg p-3 space-y-2">
        <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Investigation Details</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2 rounded border">
            <span className="text-gray-500">Type:</span>{' '}
            <span className="font-medium">{inv.typeName || inv.type}</span>
          </div>
          <div className="bg-white p-2 rounded border">
            <span className="text-gray-500">Category:</span>{' '}
            <span className="font-medium">{inv.category}</span>
          </div>
          <div className="bg-white p-2 rounded border">
            <span className="text-gray-500">Priority:</span>{' '}
            <span className={`font-medium ${inv.priority === 'urgent' || inv.priority === 'stat' ? 'text-red-600' : ''}`}>
              {inv.priority.toUpperCase()}
            </span>
          </div>
          <div className="bg-white p-2 rounded border">
            <span className="text-gray-500">Fasting:</span>{' '}
            <span className="font-medium">{inv.fasting ? 'Yes' : 'No'}</span>
          </div>
        </div>
        {inv.clinicalDetails && (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
            <strong>Clinical Details:</strong> {inv.clinicalDetails}
          </div>
        )}
        {inv.results && inv.results.length > 0 && (
          <div className="space-y-1">
            <h5 className="text-xs font-medium text-blue-700">Results:</h5>
            {inv.results.map((result, idx) => (
              <div key={result.id || idx} className="flex items-center justify-between bg-white p-1.5 rounded border text-xs">
                <span className="text-gray-700">{result.parameter}</span>
                <span className={`font-medium ${
                  result.flag === 'H' || result.flag === 'HH' || result.flag === 'high' || result.flag === 'critical'
                    ? 'text-red-600'
                    : result.flag === 'L' || result.flag === 'LL' || result.flag === 'low'
                    ? 'text-blue-600'
                    : 'text-green-600'
                }`}>
                  {result.value} {result.unit || ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (order.orderType === 'lab_request') {
    const lab = order.source as LabRequest;
    return (
      <div className="bg-emerald-50/50 rounded-lg p-3 space-y-2">
        <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Lab Request Details</h4>
        <div className="space-y-1">
          {lab.tests?.map((test, idx) => (
            <div key={test.id || idx} className="flex items-center justify-between bg-white p-2 rounded border text-xs">
              <div>
                <span className="font-medium text-gray-900">{test.name}</span>
                <span className="text-gray-500 ml-2">({test.category})</span>
              </div>
              {test.result && (
                <span className={`font-medium ${test.isAbnormal ? 'text-red-600' : 'text-green-600'}`}>
                  {test.result} {test.unit || ''}
                </span>
              )}
            </div>
          ))}
        </div>
        {lab.clinicalInfo && (
          <div className="text-xs text-gray-600 bg-white p-2 rounded border">
            <strong>Clinical Info:</strong> {lab.clinicalInfo}
          </div>
        )}
      </div>
    );
  }

  // Treatment plan
  return (
    <div className="bg-amber-50/50 rounded-lg p-3 space-y-2">
      <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Treatment Plan Details</h4>
      <div className="space-y-1 text-xs">
        {order.details.map((detail, idx) => (
          <div key={idx} className="bg-white p-2 rounded border text-gray-700">{detail}</div>
        ))}
      </div>
    </div>
  );
}
