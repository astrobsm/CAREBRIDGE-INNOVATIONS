/**
 * External Review Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Admin-only module for tracking external patient services and reviews.
 * Features:
 * - Record external services rendered to patients
 * - Export records as PDF over a date range
 * - Share directly on WhatsApp
 */

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import {
  FileText,
  Plus,
  Search,
  Download,
  Building2,
  User,
  DollarSign,
  ClipboardList,
  X,
  Edit2,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { PatientSelector } from '../../../components/patient';
import type { ExternalReview, Patient, Hospital } from '../../../types';
import { generateExternalReviewPDF } from '../utils/pdfGenerator';

// Predefined services catalog with fees
interface ServiceItem {
  id: string;
  category: string;
  name: string;
  fee: number;
}

const EXTERNAL_REVIEW_SERVICES: ServiceItem[] = [
  // Consultation
  { id: 'consultation_emergency', category: 'Consultation', name: 'Emergency Consultation', fee: 20000 },
  { id: 'consultation_first_visit', category: 'Consultation', name: 'Normal Clinic Review (First Visit)', fee: 15000 },
  { id: 'consultation_followup', category: 'Consultation', name: 'Normal Clinic Review (Follow-up)', fee: 10000 },
  
  // Surgery
  { id: 'surgery_minor', category: 'Surgery', name: 'Minor Surgery', fee: 200000 },
  { id: 'surgery_intermediate', category: 'Surgery', name: 'Intermediate Surgery', fee: 300000 },
  { id: 'surgery_major', category: 'Surgery', name: 'Major Surgery', fee: 400000 },
  
  // Wound Care
  { id: 'wound_care_review', category: 'Wound Care', name: 'Wound Care Review', fee: 20000 },
  { id: 'bedside_debridement', category: 'Wound Care', name: 'Bedside Debridement', fee: 30000 },
  
  // Negative Pressure Wound Therapy (NPWT/VAC)
  { id: 'npwt_small', category: 'Negative Pressure Wound Therapy', name: 'Small VAC', fee: 30000 },
  { id: 'npwt_medium', category: 'Negative Pressure Wound Therapy', name: 'Medium VAC', fee: 50000 },
  { id: 'npwt_large', category: 'Negative Pressure Wound Therapy', name: 'Large VAC', fee: 80000 },
  { id: 'npwt_bilateral', category: 'Negative Pressure Wound Therapy', name: 'Bilateral VAC', fee: 100000 },
  
  // Ward Round
  { id: 'ward_round_no_dressing', category: 'Ward Round', name: 'Normal Ward Round (Without Wound Dressing)', fee: 7500 },
  { id: 'ward_round_with_dressing', category: 'Ward Round', name: 'Normal Ward Round (With Wound Dressing)', fee: 10000 },
];

// Group services by category for dropdown display
const SERVICE_CATEGORIES = [...new Set(EXTERNAL_REVIEW_SERVICES.map(s => s.category))];

export default function ExternalReviewPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingReview, setEditingReview] = useState<ExternalReview | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterHospital, setFilterHospital] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    hospitalId: '',
    folderNumber: '',
    selectedServices: [] as string[], // Array of service IDs
    serviceDate: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

  // Calculate total fee from selected services
  const calculatedFee = useMemo(() => {
    return formData.selectedServices.reduce((total, serviceId) => {
      const service = EXTERNAL_REVIEW_SERVICES.find(s => s.id === serviceId);
      return total + (service?.fee || 0);
    }, 0);
  }, [formData.selectedServices]);

  // Get selected services names for display
  const selectedServicesText = useMemo(() => {
    return formData.selectedServices
      .map(serviceId => EXTERNAL_REVIEW_SERVICES.find(s => s.id === serviceId)?.name)
      .filter(Boolean)
      .join(', ');
  }, [formData.selectedServices]);

  // Live queries
  const patients = useLiveQuery(() => db.patients.filter(p => p.isActive === true).toArray(), []);
  const hospitals = useLiveQuery(() => db.hospitals.filter(h => h.isActive === true).toArray(), []);
  const externalReviews = useLiveQuery(() => db.externalReviews.orderBy('createdAt').reverse().toArray(), []);

  const isLoading = !patients || !hospitals || !externalReviews;

  // Patient and Hospital maps for quick lookup
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients?.forEach(p => map.set(p.id, p));
    return map;
  }, [patients]);

  const hospitalMap = useMemo(() => {
    const map = new Map<string, Hospital>();
    hospitals?.forEach(h => map.set(h.id, h));
    return map;
  }, [hospitals]);

  // Filter reviews
  const filteredReviews = useMemo(() => {
    if (!externalReviews) return [];
    
    return externalReviews.filter(review => {
      // Hospital filter
      if (filterHospital !== 'all' && review.hospitalId !== filterHospital) {
        return false;
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        const reviewDate = parseISO(review.serviceDate);
        if (dateFrom && reviewDate < startOfDay(parseISO(dateFrom))) return false;
        if (dateTo && reviewDate > endOfDay(parseISO(dateTo))) return false;
      }
      
      // Search filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          review.patientName.toLowerCase().includes(query) ||
          review.folderNumber.toLowerCase().includes(query) ||
          review.servicesRendered.toLowerCase().includes(query) ||
          review.hospitalName.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [externalReviews, filterHospital, dateFrom, dateTo, searchTerm]);

  // Calculate totals
  const totalFees = useMemo(() => {
    return filteredReviews.reduce((sum, r) => sum + r.fee, 0);
  }, [filteredReviews]);

  // Reset form
  const resetForm = () => {
    setFormData({
      patientId: '',
      hospitalId: '',
      folderNumber: '',
      selectedServices: [],
      serviceDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setEditingReview(null);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    if (!formData.patientId || !formData.hospitalId || formData.selectedServices.length === 0) {
      toast.error('Please fill in all required fields and select at least one service');
      return;
    }

    const patient = patientMap.get(formData.patientId);
    const hospital = hospitalMap.get(formData.hospitalId);

    if (!patient || !hospital) {
      toast.error('Invalid patient or hospital selection');
      return;
    }

    try {
      const now = new Date().toISOString();
      const reviewData: ExternalReview = {
        id: editingReview?.id || uuidv4(),
        patientId: formData.patientId,
        patientName: `${patient.firstName} ${patient.lastName}`,
        hospitalId: formData.hospitalId,
        hospitalName: hospital.name,
        folderNumber: formData.folderNumber || patient.hospitalNumber,
        servicesRendered: selectedServicesText,
        fee: calculatedFee,
        serviceDate: formData.serviceDate,
        notes: formData.notes || undefined,
        createdBy: user.id,
        createdByName: `${user.firstName} ${user.lastName}`,
        createdAt: editingReview?.createdAt || now,
        updatedAt: now,
        syncStatus: 'pending',
      };

      await db.externalReviews.put(reviewData);
      
      toast.success(editingReview ? 'Review updated successfully' : 'Review added successfully');
      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error('Error saving review:', error);
      toast.error('Failed to save review');
    }
  };

  // Handle edit
  const handleEdit = (review: ExternalReview) => {
    // Try to match existing services from the review text
    const matchedServiceIds = EXTERNAL_REVIEW_SERVICES
      .filter(s => review.servicesRendered.toLowerCase().includes(s.name.toLowerCase()))
      .map(s => s.id);
    
    setFormData({
      patientId: review.patientId,
      hospitalId: review.hospitalId,
      folderNumber: review.folderNumber,
      selectedServices: matchedServiceIds,
      serviceDate: review.serviceDate,
      notes: review.notes || '',
    });
    setEditingReview(review);
    setShowForm(true);
  };

  // Toggle service selection
  const toggleService = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId],
    }));
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    try {
      await db.externalReviews.delete(id);
      toast.success('Review deleted');
    } catch (error) {
      console.error('Error deleting review:', error);
      toast.error('Failed to delete review');
    }
  };

  // Export to PDF
  const handleExportPDF = async () => {
    if (filteredReviews.length === 0) {
      toast.error('No reviews to export');
      return;
    }

    try {
      const pdfBlob = await generateExternalReviewPDF(filteredReviews, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        hospitalName: filterHospital !== 'all' ? hospitalMap.get(filterHospital)?.name : undefined,
        generatedBy: user ? `${user.firstName} ${user.lastName}` : 'Admin',
      });
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `external-reviews-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('PDF exported successfully');
      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Share on WhatsApp
  const handleShareWhatsApp = async () => {
    if (filteredReviews.length === 0) {
      toast.error('No reviews to share');
      return;
    }

    try {
      // Generate summary text
      const summary = generateWhatsAppSummary(filteredReviews, dateFrom, dateTo);
      
      // Open WhatsApp with the message
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summary)}`;
      window.open(whatsappUrl, '_blank');
      
      toast.success('Opening WhatsApp...');
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
      toast.error('Failed to share on WhatsApp');
    }
  };

  // Generate WhatsApp summary
  const generateWhatsAppSummary = (reviews: ExternalReview[], from?: string, to?: string): string => {
    let summary = `*ASTROHEALTH - External Reviews Summary*\n\n`;
    
    if (from || to) {
      summary += `📅 Period: ${from ? format(parseISO(from), 'dd MMM yyyy') : 'Start'} - ${to ? format(parseISO(to), 'dd MMM yyyy') : 'End'}\n\n`;
    }
    
    summary += `📊 Total Records: ${reviews.length}\n`;
    summary += `💰 Total Fees: ₦${reviews.reduce((sum, r) => sum + r.fee, 0).toLocaleString()}\n\n`;
    
    summary += `-------------------\n\n`;
    
    reviews.slice(0, 10).forEach((review, index) => {
      summary += `${index + 1}. *${review.patientName}*\n`;
      summary += `   📁 Folder: ${review.folderNumber}\n`;
      summary += `   🏥 ${review.hospitalName}\n`;
      summary += `   📋 ${review.servicesRendered}\n`;
      summary += `   💵 ₦${review.fee.toLocaleString()}\n`;
      summary += `   📆 ${format(parseISO(review.serviceDate), 'dd MMM yyyy')}\n\n`;
    });
    
    if (reviews.length > 10) {
      summary += `... and ${reviews.length - 10} more records\n\n`;
    }
    
    summary += `-------------------\n`;
    summary += `Generated by AstroHEALTH`;
    
    return summary;
  };

  // Handle patient selection - auto-fill folder number
  const handlePatientChange = (patientId: string) => {
    const patient = patientMap.get(patientId);
    setFormData(prev => ({
      ...prev,
      patientId,
      folderNumber: patient?.hospitalNumber || prev.folderNumber,
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-7 h-7 text-indigo-600" />
            External Review
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Track and manage external patient services
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="btn-secondary flex items-center gap-2 !text-green-600 !border-green-600 hover:!bg-green-50"
          >
            <MessageCircle size={18} />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Add Review
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ClipboardList className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredReviews.length}</p>
              <p className="text-xs text-gray-500">Total Reviews</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">₦{totalFees.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total Fees</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{hospitals?.length || 0}</p>
              <p className="text-xs text-gray-500">Hospitals</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{patients?.length || 0}</p>
              <p className="text-xs text-gray-500">Patients</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient, folder, services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
              title="Search reviews"
            />
          </div>
          <div>
            <select
              value={filterHospital}
              onChange={(e) => setFilterHospital(e.target.value)}
              className="input"
              title="Filter by hospital"
            >
              <option value="all">All Hospitals</option>
              {hospitals?.map(hospital => (
                <option key={hospital.id} value={hospital.id}>{hospital.name}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="input"
              title="From date"
            />
          </div>
          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="input"
              title="To date"
            />
          </div>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hospital
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Folder No.
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Services
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No external reviews found
                  </td>
                </tr>
              ) : (
                filteredReviews.map(review => (
                  <motion.tr
                    key={review.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{review.patientName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {review.hospitalName}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {review.folderNumber}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {review.servicesRendered}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ₦{review.fee.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(review.serviceDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(review)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit review"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete review"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingReview ? 'Edit Review' : 'Add New Review'}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Patient Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient Name *
                  </label>
                  <PatientSelector
                    value={formData.patientId}
                    onChange={(patientId) => handlePatientChange(patientId || '')}
                    placeholder="Search patient by name or hospital number..."
                    required
                  />
                </div>

                {/* Hospital Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hospital *
                  </label>
                  <select
                    value={formData.hospitalId}
                    onChange={(e) => setFormData(prev => ({ ...prev, hospitalId: e.target.value }))}
                    className="input"
                    required
                    title="Select hospital"
                  >
                    <option value="">Select hospital...</option>
                    {hospitals?.map(hospital => (
                      <option key={hospital.id} value={hospital.id}>
                        {hospital.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Folder Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patient Folder Number
                  </label>
                  <input
                    type="text"
                    value={formData.folderNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, folderNumber: e.target.value }))}
                    className="input"
                    placeholder="Auto-filled from patient record"
                  />
                </div>

                {/* Services Rendered - Checkbox Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Services Rendered * <span className="text-xs text-gray-500">(Select one or more)</span>
                  </label>
                  <div className="border rounded-lg p-3 max-h-64 overflow-y-auto bg-gray-50 space-y-4">
                    {SERVICE_CATEGORIES.map(category => (
                      <div key={category}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">
                          {category}
                        </h4>
                        <div className="space-y-1">
                          {EXTERNAL_REVIEW_SERVICES
                            .filter(s => s.category === category)
                            .map(service => (
                              <label
                                key={service.id}
                                className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                                  formData.selectedServices.includes(service.id)
                                    ? 'bg-indigo-100 border border-indigo-300'
                                    : 'bg-white border border-gray-200 hover:bg-gray-100'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={formData.selectedServices.includes(service.id)}
                                    onChange={() => toggleService(service.id)}
                                    className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                  />
                                  <span className="text-sm text-gray-900">{service.name}</span>
                                </div>
                                <span className="text-sm font-medium text-green-600">
                                  ₦{service.fee.toLocaleString()}
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {formData.selectedServices.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Please select at least one service</p>
                  )}
                </div>

                {/* Selected Services Summary & Total Fee */}
                {formData.selectedServices.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-indigo-900 mb-2">Selected Services:</h4>
                    <ul className="text-sm text-indigo-700 space-y-1 mb-3">
                      {formData.selectedServices.map(serviceId => {
                        const service = EXTERNAL_REVIEW_SERVICES.find(s => s.id === serviceId);
                        return service && (
                          <li key={serviceId} className="flex justify-between">
                            <span>• {service.name}</span>
                            <span>₦{service.fee.toLocaleString()}</span>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="border-t border-indigo-300 pt-2 flex justify-between items-center">
                      <span className="font-semibold text-indigo-900">Total Fee:</span>
                      <span className="text-xl font-bold text-green-600">₦{calculatedFee.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Service Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Date *
                  </label>
                  <input
                    type="date"
                    value={formData.serviceDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceDate: e.target.value }))}
                    className="input"
                    required
                    title="Service date"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="input"
                    rows={2}
                    placeholder="Any additional notes..."
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    {editingReview ? 'Update Review' : 'Save Review'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowExportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Export Reviews</h2>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                    title="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-gray-600">
                  Export {filteredReviews.length} review(s) based on current filters.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Records:</span>
                    <span className="font-medium">{filteredReviews.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Fees:</span>
                    <span className="font-medium text-green-600">₦{totalFees.toLocaleString()}</span>
                  </div>
                  {dateFrom && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">From:</span>
                      <span className="font-medium">{format(parseISO(dateFrom), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                  {dateTo && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">To:</span>
                      <span className="font-medium">{format(parseISO(dateTo), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleExportPDF}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Download PDF
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <MessageCircle size={18} />
                    Share WhatsApp
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
