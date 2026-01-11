import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { syncRecord } from '../../../services/cloudSyncService';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Receipt,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  X,
  Save,
  DollarSign,
  CreditCard,
  FileText,
  TrendingUp,
  Printer,
  Eye,
  Percent,
  Tag,
  Scissors,
  Wind,
  Flame,
  Package,
  Award,
  Activity,
  Download,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { format } from 'date-fns';
import type { Invoice, InvoiceItem } from '../../../types';
import {
  nonTheaterServices,
  complexityLevels,
  calculateServiceFee,
  formatNaira,
  discountPresets,
} from '../../../data/nonTheaterServices';
import { surgicalProcedures, calculateSurgicalFeeEstimate } from '../../../data/surgicalFees';
import { PatientSelector } from '../../../components/patient';
import { usePatientMap } from '../../../services/patientHooks';
import { downloadInvoicePDF, shareInvoiceViaWhatsApp } from '../../../utils/billingPdfGenerator';
import type { InvoicePDFOptions, InvoiceItemPDF } from '../../../utils/billingPdfGenerator';

// Procedure pricing matrix (Nigerian Naira - NGN)
const procedurePricing = {
  consultation: [
    { code: 'CON001', name: 'General Consultation', price: 5000 },
    { code: 'CON002', name: 'Specialist Consultation', price: 15000 },
    { code: 'CON003', name: 'Emergency Consultation', price: 10000 },
    { code: 'CON004', name: 'Follow-up Visit', price: 3000 },
    { code: 'CON005', name: 'Telemedicine Consultation', price: 5000 },
  ],
  surgery: [
    { code: 'SUR001', name: 'Minor Surgery (Local)', price: 50000 },
    { code: 'SUR002', name: 'Intermediate Surgery', price: 150000 },
    { code: 'SUR003', name: 'Major Surgery', price: 500000 },
    { code: 'SUR004', name: 'Complex/Specialized Surgery', price: 1000000 },
    { code: 'SUR005', name: 'Emergency Surgery', price: 300000 },
    { code: 'SUR006', name: 'Laparoscopic Surgery', price: 400000 },
  ],
  laboratory: [
    { code: 'LAB001', name: 'Full Blood Count (FBC)', price: 5000 },
    { code: 'LAB002', name: 'Urinalysis', price: 2000 },
    { code: 'LAB003', name: 'Liver Function Test (LFT)', price: 8000 },
    { code: 'LAB004', name: 'Renal Function Test (RFT)', price: 8000 },
    { code: 'LAB005', name: 'Lipid Profile', price: 6000 },
    { code: 'LAB006', name: 'Blood Glucose (Fasting)', price: 2500 },
    { code: 'LAB007', name: 'HbA1c', price: 8000 },
    { code: 'LAB008', name: 'HIV Screening', price: 3000 },
    { code: 'LAB009', name: 'Malaria Parasite (MP)', price: 1500 },
    { code: 'LAB010', name: 'Widal Test', price: 2500 },
    { code: 'LAB011', name: 'Blood Culture', price: 15000 },
    { code: 'LAB012', name: 'Histopathology', price: 25000 },
  ],
  imaging: [
    { code: 'IMG001', name: 'Chest X-Ray', price: 8000 },
    { code: 'IMG002', name: 'Abdominal X-Ray', price: 10000 },
    { code: 'IMG003', name: 'Ultrasound Scan (Abdominal)', price: 15000 },
    { code: 'IMG004', name: 'Ultrasound Scan (Pelvic)', price: 15000 },
    { code: 'IMG005', name: 'CT Scan', price: 80000 },
    { code: 'IMG006', name: 'MRI Scan', price: 150000 },
    { code: 'IMG007', name: 'Echocardiography', price: 35000 },
    { code: 'IMG008', name: 'Mammography', price: 25000 },
  ],
  admission: [
    { code: 'ADM001', name: 'General Ward (per day)', price: 15000 },
    { code: 'ADM002', name: 'Private Ward (per day)', price: 30000 },
    { code: 'ADM003', name: 'ICU (per day)', price: 100000 },
    { code: 'ADM004', name: 'Recovery Room (per hour)', price: 5000 },
    { code: 'ADM005', name: 'Observation Ward (per day)', price: 10000 },
  ],
  procedures: [
    { code: 'PRO001', name: 'Wound Dressing (Minor)', price: 5000 },
    { code: 'PRO002', name: 'Wound Dressing (Major)', price: 15000 },
    { code: 'PRO003', name: 'IV Cannulation', price: 3000 },
    { code: 'PRO004', name: 'Catheterization', price: 10000 },
    { code: 'PRO005', name: 'NGT Insertion', price: 8000 },
    { code: 'PRO006', name: 'Suturing', price: 15000 },
    { code: 'PRO007', name: 'Incision & Drainage', price: 25000 },
    { code: 'PRO008', name: 'Debridement', price: 35000 },
    { code: 'PRO009', name: 'Skin Grafting', price: 200000 },
  ],
  consumables: [
    { code: 'CSM001', name: 'IV Fluids (Normal Saline)', price: 1500 },
    { code: 'CSM002', name: 'IV Fluids (Dextrose)', price: 1500 },
    { code: 'CSM003', name: 'Blood Transfusion (per unit)', price: 30000 },
    { code: 'CSM004', name: 'Surgical Gloves (pair)', price: 500 },
    { code: 'CSM005', name: 'Dressing Pack', price: 2000 },
    { code: 'CSM006', name: 'Suture Material', price: 3000 },
    { code: 'CSM007', name: 'Urinary Catheter', price: 5000 },
    { code: 'CSM008', name: 'IV Giving Set', price: 1000 },
  ],
};

const serviceCategories = [
  { value: 'consultation', label: 'Consultation', icon: 'Stethoscope' },
  { value: 'surgery', label: 'Surgery', icon: 'Scissors' },
  { value: 'laboratory', label: 'Laboratory', icon: 'Activity' },
  { value: 'imaging', label: 'Imaging', icon: 'Eye' },
  { value: 'admission', label: 'Admission', icon: 'User' },
  { value: 'procedures', label: 'Procedures', icon: 'Package' },
  { value: 'consumables', label: 'Consumables', icon: 'Package' },
  // Non-theater specialist services
  { value: 'nt-consultation', label: 'Specialist Consultation', icon: 'Award' },
  { value: 'nt-wound-review', label: 'Wound Care Reviews', icon: 'Eye' },
  { value: 'nt-debridement', label: 'Bedside Debridement', icon: 'Scissors' },
  { value: 'nt-npwt', label: 'NPWT Services', icon: 'Wind' },
  { value: 'nt-burn-dressing', label: 'Burn Dressings', icon: 'Flame' },
  { value: 'nt-package', label: 'Care Packages', icon: 'Package' },
  { value: 'nt-specialist-service', label: 'Specialist Services', icon: 'Award' },
  { value: 'surgical-procedures', label: 'Surgical Procedures', icon: 'Scissors' },
];

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'hmo', label: 'HMO' },
];

const invoiceSchema = z.object({
  patientId: z.string().min(1, 'Patient is required'),
  notes: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface SelectedItem {
  id: string;
  code: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  total: number;
  originalPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  feeLevel?: 'min' | 'mid' | 'max';
  complexity?: string;
}

// Helper to get category icon
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'nt-consultation':
    case 'nt-specialist-service':
      return <Award size={16} className="text-purple-500" />;
    case 'nt-wound-review':
      return <Eye size={16} className="text-blue-500" />;
    case 'nt-debridement':
    case 'surgical-procedures':
      return <Scissors size={16} className="text-red-500" />;
    case 'nt-npwt':
      return <Wind size={16} className="text-cyan-500" />;
    case 'nt-burn-dressing':
      return <Flame size={16} className="text-orange-500" />;
    case 'nt-package':
      return <Package size={16} className="text-green-500" />;
    default:
      return <Activity size={16} className="text-gray-500" />;
  }
};

export default function BillingPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('consultation');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [feeLevel, setFeeLevel] = useState<'min' | 'mid' | 'max'>('mid');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  const invoices = useLiveQuery(() => db.invoices.orderBy('createdAt').reverse().toArray(), []);
  
  // Use the new patient map hook for efficient lookups
  const patientMap = usePatientMap();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors: _errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
  });

  const availableServices = useMemo(() => {
    // Check if it's a non-theater category
    if (activeCategory.startsWith('nt-')) {
      const ntCategory = activeCategory.replace('nt-', '');
      const services = nonTheaterServices.filter(s => s.category === ntCategory);
      return services.map(s => {
        const { finalFee } = calculateServiceFee(s, feeLevel, globalDiscount);
        return {
          code: s.id,
          name: s.name,
          price: finalFee,
          originalPrice: s.minFee,
          maxPrice: s.maxFee,
          complexity: s.complexity,
          description: s.description,
          isNonTheater: true,
        };
      });
    }
    
    // Surgical procedures
    if (activeCategory === 'surgical-procedures') {
      let procedures = surgicalProcedures;
      if (serviceSearchQuery) {
        procedures = procedures.filter(p => 
          p.name.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(serviceSearchQuery.toLowerCase()) ||
          (p.icdCode && p.icdCode.toLowerCase().includes(serviceSearchQuery.toLowerCase()))
        );
      }
      return procedures.slice(0, 50).map(p => {
        const estimate = calculateSurgicalFeeEstimate(p);
        const discountedFee = estimate.surgeonFee * (1 - globalDiscount / 100);
        return {
          code: p.id,
          name: p.name,
          price: Math.round(discountedFee),
          originalPrice: estimate.surgeonFee,
          complexity: p.complexity,
          description: `${p.category}${p.icdCode ? ` - ${p.icdCode}` : ''}`,
          isSurgical: true,
        };
      });
    }
    
    // Standard categories
    const services = procedurePricing[activeCategory as keyof typeof procedurePricing] || [];
    return services.map(s => ({
      ...s,
      price: Math.round(s.price * (1 - globalDiscount / 100)),
      originalPrice: s.price,
      complexity: undefined as string | undefined,
    }));
  }, [activeCategory, feeLevel, globalDiscount, serviceSearchQuery]);

  const invoiceTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.total, 0);
  }, [selectedItems]);

  const invoiceSubtotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + (item.originalPrice || item.unitPrice) * item.quantity, 0);
  }, [selectedItems]);

  const totalDiscount = useMemo(() => {
    return invoiceSubtotal - invoiceTotal;
  }, [invoiceSubtotal, invoiceTotal]);

  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter((invoice) => {
      const patient = patientMap.get(invoice.patientId);
      const matchesSearch = searchQuery === '' ||
        invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient && `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter, patientMap]);

  // Statistics
  const stats = useMemo(() => {
    if (!invoices) return { total: 0, paid: 0, pending: 0, overdue: 0, revenue: 0 };
    
    const total = invoices.length;
    const paid = invoices.filter(i => i.status === 'paid').length;
    const pending = invoices.filter(i => i.status === 'pending' || i.status === 'partial').length;
    const overdue = invoices.filter(i => i.status === 'overdue').length;
    const revenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + (i.totalAmount || i.total || 0), 0);
    
    return { total, paid, pending, overdue, revenue };
  }, [invoices]);

  const addService = (service: typeof availableServices[0]) => {
    const existingItem = selectedItems.find(item => item.code === service.code);
    
    if (existingItem) {
      setSelectedItems(selectedItems.map(item =>
        item.code === service.code
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: uuidv4(),
          code: service.code,
          description: service.name,
          category: activeCategory,
          quantity: 1,
          unitPrice: service.price,
          originalPrice: service.originalPrice || service.price,
          total: service.price,
          discountPercent: globalDiscount,
          discountAmount: (service.originalPrice || service.price) - service.price,
          complexity: service.complexity,
          feeLevel: feeLevel,
        },
      ]);
    }
    toast.success(`Added ${service.name}`);
  };

  const applyItemDiscount = (id: string, discountPercent: number) => {
    setSelectedItems(selectedItems.map(item => {
      if (item.id !== id) return item;
      const originalPrice = item.originalPrice || item.unitPrice;
      const discountedPrice = Math.round(originalPrice * (1 - discountPercent / 100));
      return {
        ...item,
        unitPrice: discountedPrice,
        total: discountedPrice * item.quantity,
        discountPercent,
        discountAmount: (originalPrice - discountedPrice) * item.quantity,
      };
    }));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedItems(selectedItems.map(item =>
      item.id === id
        ? { ...item, quantity, total: quantity * item.unitPrice }
        : item
    ));
  };

  const removeItem = (id: string) => {
    setSelectedItems(selectedItems.filter(item => item.id !== id));
  };

  const generateInvoiceNumber = () => {
    const date = format(new Date(), 'yyyyMMdd');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${date}-${random}`;
  };

  const onSubmit = async (data: InvoiceFormData) => {
    if (!user || selectedItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      const items: InvoiceItem[] = selectedItems.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        category: item.category,
      }));

      const invoice: Invoice = {
        id: uuidv4(),
        patientId: data.patientId,
        hospitalId: user.hospitalId || 'hospital-1',
        invoiceNumber: generateInvoiceNumber(),
        items,
        totalAmount: invoiceTotal,
        paidAmount: 0,
        status: 'pending',
        createdBy: user.id,
        createdAt: new Date(),
        notes: data.notes,
      };

      await db.invoices.add(invoice);
      syncRecord('invoices', invoice as unknown as Record<string, unknown>);
      toast.success('Invoice created successfully!');
      setShowModal(false);
      setSelectedItems([]);
      reset();
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    }
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;

    try {
      const amount = parseFloat(paymentAmount);
      const currentPaid = selectedInvoice.paidAmount || selectedInvoice.amountPaid || 0;
      const totalDue = selectedInvoice.totalAmount || selectedInvoice.total || 0;
      const newPaidAmount = currentPaid + amount;
      const newStatus = newPaidAmount >= totalDue ? 'paid' : 'partial';

      await db.invoices.update(selectedInvoice.id, {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : undefined,
      });
      const updatedInvoice = await db.invoices.get(selectedInvoice.id);
      if (updatedInvoice) syncRecord('invoices', updatedInvoice as unknown as Record<string, unknown>);

      toast.success(`Payment of ₦${amount.toLocaleString()} recorded!`);
      setShowPaymentModal(false);
      setSelectedInvoice(null);
      setPaymentAmount('');
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    }
  };

  // Download invoice as PDF
  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const patient = patientMap.get(invoice.patientId);
      const hospital = await db.hospitals.get(invoice.hospitalId);
      
      if (!patient) {
        toast.error('Patient not found');
        return;
      }

      const pdfOptions: InvoicePDFOptions = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.createdAt),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
        patient: {
          name: `${patient.firstName} ${patient.lastName}`,
          hospitalNumber: patient.hospitalNumber || 'N/A',
          gender: patient.gender,
          age: patient.dateOfBirth ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
          phone: patient.phone,
        },
        hospitalName: hospital?.name || 'CareBridge Hospital',
        hospitalAddress: hospital?.address,
        hospitalPhone: hospital?.phone,
        items: invoice.items.map((item): InvoiceItemPDF => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.amount || item.total || item.quantity * item.unitPrice,
          category: item.category,
        })),
        subtotal: invoice.subtotal || invoice.items.reduce((sum, item) => sum + (item.amount || item.total || item.quantity * item.unitPrice), 0),
        discountAmount: invoice.discount,
        taxAmount: invoice.tax,
        totalAmount: invoice.totalAmount || invoice.total || 0,
        paidAmount: invoice.paidAmount || invoice.amountPaid || 0,
        status: invoice.status as 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled',
        notes: invoice.notes,
      };

      downloadInvoicePDF(pdfOptions);
      toast.success('Invoice PDF downloaded');
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice');
    }
  };

  // Share invoice via WhatsApp
  const handleShareWhatsApp = async (invoice: Invoice) => {
    try {
      const patient = patientMap.get(invoice.patientId);
      const hospital = await db.hospitals.get(invoice.hospitalId);
      
      if (!patient) {
        toast.error('Patient not found');
        return;
      }

      const pdfOptions: InvoicePDFOptions = {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.createdAt),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
        patient: {
          name: `${patient.firstName} ${patient.lastName}`,
          hospitalNumber: patient.hospitalNumber || 'N/A',
          gender: patient.gender,
          age: patient.dateOfBirth ? Math.floor((new Date().getTime() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : undefined,
          phone: patient.phone,
        },
        hospitalName: hospital?.name || 'CareBridge Hospital',
        hospitalAddress: hospital?.address,
        hospitalPhone: hospital?.phone,
        items: invoice.items.map((item): InvoiceItemPDF => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.amount || item.total || item.quantity * item.unitPrice,
          category: item.category,
        })),
        subtotal: invoice.subtotal || invoice.items.reduce((sum, item) => sum + (item.amount || item.total || item.quantity * item.unitPrice), 0),
        discountAmount: invoice.discount,
        taxAmount: invoice.tax,
        totalAmount: invoice.totalAmount || invoice.total || 0,
        paidAmount: invoice.paidAmount || invoice.amountPaid || 0,
        status: invoice.status as 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled',
        notes: invoice.notes,
      };

      const patientName = `${patient.firstName} ${patient.lastName}`;
      shareInvoiceViaWhatsApp(pdfOptions, patientName, patient.phone);
      toast.success('Opening WhatsApp...');
    } catch (error) {
      console.error('Error sharing invoice:', error);
      toast.error('Failed to share invoice');
    }
  };

  const getStatusBadge = (status: Invoice['status']) => {
    switch (status) {
      case 'pending':
        return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
      case 'paid':
        return <span className="badge badge-success"><CheckCircle size={12} /> Paid</span>;
      case 'partial':
        return <span className="badge badge-info"><AlertTriangle size={12} /> Partial</span>;
      case 'overdue':
        return <span className="badge badge-danger"><AlertTriangle size={12} /> Overdue</span>;
      case 'cancelled':
        return <span className="badge badge-secondary"><X size={12} /> Cancelled</span>;
      default:
        return null;
    }
  };

  const formatCurrency = (amount: number) => {
    return `₦${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Receipt className="w-6 h-6 sm:w-7 sm:h-7 text-emerald-500" />
            Billing & Invoices
          </h1>
          <p className="page-subtitle">
            Procedure-linked billing with payment tracking
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary w-full sm:w-auto">
          <Plus size={18} />
          New Invoice
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card card-compact p-3 sm:p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Invoices</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-xl font-bold text-green-600">{stats.paid}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-4 md:col-span-1 col-span-2"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-emerald-600">{formatCurrency(stats.revenue)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by invoice number or patient..."
              className="input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => {
                  const patient = patientMap.get(invoice.patientId);
                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {patient ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{patient.firstName} {patient.lastName}</span>
                          </div>
                        ) : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {formatCurrency(invoice.totalAmount || invoice.total || 0)}
                      </td>
                      <td className="px-6 py-4 text-green-600">
                        {formatCurrency(invoice.paidAmount || invoice.amountPaid || 0)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowPaymentModal(true);
                              }}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Record Payment"
                            >
                              <CreditCard size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadInvoice(invoice)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Download Invoice PDF"
                          >
                            <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <button
                            onClick={() => handleShareWhatsApp(invoice)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Share via WhatsApp"
                          >
                            <Share2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <button
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <button
                            onClick={() => handleDownloadInvoice(invoice)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Print Invoice"
                          >
                            <Printer size={16} className="sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No invoices found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Invoice Modal */}
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
              className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900">New Invoice</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[calc(90vh-80px)]">
                <div className="flex flex-1 overflow-hidden">
                  {/* Services Sidebar */}
                  <div className="w-96 border-r bg-gray-50 flex flex-col">
                    <div className="p-4 border-b space-y-3">
                      <h3 className="font-semibold text-gray-700">Add Services</h3>
                      
                      {/* Global Discount & Fee Level */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Global Discount</label>
                          <select
                            value={globalDiscount}
                            onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                            className="input text-sm py-1.5"
                          >
                            {discountPresets.map(d => (
                              <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Fee Level</label>
                          <select
                            value={feeLevel}
                            onChange={(e) => setFeeLevel(e.target.value as 'min' | 'mid' | 'max')}
                            className="input text-sm py-1.5"
                          >
                            <option value="min">Minimum</option>
                            <option value="mid">Standard</option>
                            <option value="max">Maximum</option>
                          </select>
                        </div>
                      </div>

                      {/* Category Tabs */}
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {serviceCategories.map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => setActiveCategory(cat.value)}
                            className={`px-2 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                              activeCategory === cat.value
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {cat.value.startsWith('nt-') && <Tag size={10} />}
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Search for surgical procedures */}
                      {activeCategory === 'surgical-procedures' && (
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={serviceSearchQuery}
                            onChange={(e) => setServiceSearchQuery(e.target.value)}
                            placeholder="Search procedures..."
                            className="input text-sm py-1.5 pl-8"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {availableServices.map((service: any) => (
                        <button
                          key={service.code}
                          type="button"
                          onClick={() => addService(service)}
                          className="w-full p-3 bg-white rounded-lg border hover:border-emerald-300 text-left transition-colors group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(activeCategory)}
                                <p className="font-medium text-gray-900 text-sm truncate">{service.name}</p>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{service.code}</p>
                              {service.description && (
                                <p className="text-xs text-gray-400 mt-0.5 truncate">{service.description}</p>
                              )}
                              {service.complexity && (
                                <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${complexityLevels[service.complexity as keyof typeof complexityLevels]?.color || 'bg-gray-100'}`}>
                                  {complexityLevels[service.complexity as keyof typeof complexityLevels]?.label || service.complexity}
                                </span>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-sm font-bold text-emerald-600">
                                {formatNaira(service.price)}
                              </span>
                              {service.originalPrice && service.originalPrice !== service.price && (
                                <p className="text-xs text-gray-400 line-through">
                                  {formatNaira(service.originalPrice)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="hidden group-hover:flex items-center justify-center mt-2 pt-2 border-t text-emerald-600 text-xs">
                            <Plus size={12} className="mr-1" /> Add to Invoice
                          </div>
                        </button>
                      ))}
                      {availableServices.length === 0 && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          No services found
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Invoice Details */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-6">
                    {/* Patient Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <PatientSelector
                          value={watch('patientId')}
                          onChange={(patientId) => setValue('patientId', patientId || '')}
                          label="Patient"
                          required
                        />
                      </div>
                      <div>
                        <label className="label">Notes</label>
                        <input {...register('notes')} className="input" placeholder="Additional notes..." />
                      </div>
                    </div>

                    {/* Selected Items */}
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Invoice Items ({selectedItems.length})</h3>
                      {selectedItems.length > 0 ? (
                        <div className="border rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Qty</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Discount</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                <th className="px-4 py-2"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {selectedItems.map((item) => (
                                <tr key={item.id}>
                                  <td className="px-4 py-3">
                                    <div className="flex items-start gap-2">
                                      {getCategoryIcon(item.category)}
                                      <div>
                                        <p className="font-medium text-gray-900 text-sm">{item.description}</p>
                                        <p className="text-xs text-gray-500">{item.code}</p>
                                        {item.complexity && (
                                          <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded ${complexityLevels[item.complexity as keyof typeof complexityLevels]?.color || 'bg-gray-100'}`}>
                                            {complexityLevels[item.complexity as keyof typeof complexityLevels]?.label || item.complexity}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                      min="1"
                                      className="w-16 text-center border rounded px-2 py-1"
                                    />
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <select
                                      value={item.discountPercent || 0}
                                      onChange={(e) => applyItemDiscount(item.id, Number(e.target.value))}
                                      className="w-20 text-xs border rounded px-1 py-1"
                                    >
                                      {discountPresets.map(d => (
                                        <option key={d.value} value={d.value}>{d.value}%</option>
                                      ))}
                                    </select>
                                    {item.discountAmount && item.discountAmount > 0 && (
                                      <p className="text-xs text-green-600 mt-0.5">-{formatNaira(item.discountAmount)}</p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <span className="text-gray-600">{formatNaira(item.unitPrice)}</span>
                                    {item.originalPrice && item.originalPrice !== item.unitPrice && (
                                      <p className="text-xs text-gray-400 line-through">{formatNaira(item.originalPrice)}</p>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                                    {formatNaira(item.total)}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => removeItem(item.id)}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                          <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No items added. Select services from the left.</p>
                        </div>
                      )}
                    </div>

                    {/* Invoice Total */}
                    {selectedItems.length > 0 && (
                      <div className="card bg-gradient-to-br from-emerald-50 to-teal-50 p-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Subtotal</span>
                          <span className="text-gray-900">{formatNaira(invoiceSubtotal)}</span>
                        </div>
                        {totalDiscount > 0 && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-green-600 flex items-center gap-1">
                              <Percent size={14} />
                              Total Discount
                            </span>
                            <span className="text-green-600 font-medium">-{formatNaira(totalDiscount)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                          <span className="text-lg font-medium text-gray-700">Invoice Total</span>
                          <span className="text-2xl font-bold text-emerald-600">
                            {formatNaira(invoiceTotal)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
                  <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={selectedItems.length === 0}>
                    <Save size={18} />
                    Create Invoice
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedInvoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-emerald-500" />
                  Record Payment
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="card bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Invoice</p>
                  <p className="font-mono font-medium">{selectedInvoice.invoiceNumber}</p>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Amount</p>
                      <p className="font-medium">{formatCurrency(selectedInvoice.totalAmount || selectedInvoice.total || 0)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Already Paid</p>
                      <p className="font-medium text-green-600">{formatCurrency(selectedInvoice.paidAmount || selectedInvoice.amountPaid || 0)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Balance Due</p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency((selectedInvoice.totalAmount || selectedInvoice.total || 0) - (selectedInvoice.paidAmount || selectedInvoice.amountPaid || 0))}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Payment Amount (₦)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="input"
                    max={(selectedInvoice.totalAmount || selectedInvoice.total || 0) - (selectedInvoice.paidAmount || selectedInvoice.amountPaid || 0)}
                  />
                </div>

                <div>
                  <label className="label">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>{method.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-4 p-6 border-t bg-gray-50">
                <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  className="btn btn-primary"
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                >
                  <DollarSign size={18} />
                  Record Payment
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
