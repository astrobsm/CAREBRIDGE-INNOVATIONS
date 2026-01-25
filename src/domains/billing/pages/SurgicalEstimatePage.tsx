/**
 * Surgical & Procedure Estimate Generation Module
 * AstroHEALTH Innovations in Healthcare
 * 
 * Generates professional surgical cost estimates for patients
 */

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuidv4 } from 'uuid';
import { format, differenceInYears } from 'date-fns';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import {
  Calculator,
  FileText,
  Download,
  Search,
  User,
  Plus,
  Trash2,
  DollarSign,
  AlertCircle,
  Stethoscope,
  Syringe,
  Package,
  Building2,
  X,
  History,
  Info,
} from 'lucide-react';
import { db } from '../../../database';
import { surgicalProcedures, complexityLevels } from '../../../data/surgicalFees';
import { surgicalConsumables } from '../../../data/surgicalConsumables';
import { numberToWords } from '../../../utils/pdfUtils';
import type { Patient } from '../../../types';

// Estimate Line Item Interface
interface EstimateLineItem {
  id: string;
  category: 'surgeon_fee' | 'assistant_fee' | 'anaesthesia_fee' | 'theatre_fee' | 'consumable' | 'other';
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
}

// Surgical Estimate Interface (for future save functionality)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface SurgicalEstimate {
  id: string;
  estimateNumber: string;
  patientId: string;
  patientName: string;
  hospitalNumber: string;
  hospitalId?: string;
  hospitalName: string;
  procedureName: string;
  procedureDescription?: string;
  estimateDate: Date;
  validUntil: Date;
  lineItems: EstimateLineItem[];
  subtotal: number;
  totalAmount: number;
  currency: string;
  preparedBy: string;
  preparedByDesignation?: string;
  status: 'draft' | 'issued' | 'accepted' | 'expired' | 'cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Default fee structure
const DEFAULT_FEES = {
  assistant_fee_percentage: 0.25, // 25% of surgeon fee
  anaesthesia_fee_percentage: 0.30, // 30% of surgeon fee
  theatre_fee_default: 150000, // ₦150,000
};

export default function SurgicalEstimatePage() {
  // State
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<typeof surgicalProcedures[0] | null>(null);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showProcedureSearch, setShowProcedureSearch] = useState(false);
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [showConsumableModal, setShowConsumableModal] = useState(false);
  const [consumableSearch, setConsumableSearch] = useState('');
  const [showEstimatePreview, setShowEstimatePreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [customItemDescription, setCustomItemDescription] = useState('');
  const [customItemAmount, setCustomItemAmount] = useState('');
  const [customItemCategory, setCustomItemCategory] = useState<EstimateLineItem['category']>('other');
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const [preparedBy, setPreparedBy] = useState('');
  const [preparedByDesignation, setPreparedByDesignation] = useState('');
  const [estimateNotes, setEstimateNotes] = useState('');
  const [customHospitalName, setCustomHospitalName] = useState('');
  const [hospitalAddress, setHospitalAddress] = useState('');
  const [hospitalPhone, setHospitalPhone] = useState('');
  
  const estimateRef = useRef<HTMLDivElement>(null);

  // Live queries
  const patients = useLiveQuery(() => db.patients.toArray(), []);
  const defaultHospital = useLiveQuery(() => db.hospitals.toCollection().first(), []);

  // Filter patients
  const filteredPatients = useMemo(() => {
    if (!patients || !patientSearch.trim()) return [];
    const search = patientSearch.toLowerCase();
    return patients.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(search) ||
      p.hospitalNumber?.toLowerCase().includes(search)
    ).slice(0, 10);
  }, [patients, patientSearch]);

  // Filter procedures
  const filteredProcedures = useMemo(() => {
    if (!procedureSearch.trim()) return surgicalProcedures.slice(0, 20);
    const search = procedureSearch.toLowerCase();
    return surgicalProcedures.filter(p => 
      p.name.toLowerCase().includes(search) ||
      p.category.toLowerCase().includes(search) ||
      p.description?.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [procedureSearch]);

  // Filter consumables
  const filteredConsumables = useMemo(() => {
    if (!consumableSearch.trim()) return surgicalConsumables.slice(0, 20);
    const search = consumableSearch.toLowerCase();
    return surgicalConsumables.filter(c => 
      c.name.toLowerCase().includes(search) ||
      c.category.toLowerCase().includes(search) ||
      c.description.toLowerCase().includes(search)
    ).slice(0, 20);
  }, [consumableSearch]);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    return {
      subtotal,
      total: subtotal,
      surgeonFee: lineItems.filter(i => i.category === 'surgeon_fee').reduce((sum, i) => sum + i.totalPrice, 0),
      assistantFee: lineItems.filter(i => i.category === 'assistant_fee').reduce((sum, i) => sum + i.totalPrice, 0),
      anaesthesiaFee: lineItems.filter(i => i.category === 'anaesthesia_fee').reduce((sum, i) => sum + i.totalPrice, 0),
      theatreFee: lineItems.filter(i => i.category === 'theatre_fee').reduce((sum, i) => sum + i.totalPrice, 0),
      consumables: lineItems.filter(i => i.category === 'consumable').reduce((sum, i) => sum + i.totalPrice, 0),
      other: lineItems.filter(i => i.category === 'other').reduce((sum, i) => sum + i.totalPrice, 0),
    };
  }, [lineItems]);

  // Auto-populate fees when procedure is selected
  const handleProcedureSelect = (procedure: typeof surgicalProcedures[0]) => {
    setSelectedProcedure(procedure);
    setShowProcedureSearch(false);
    setProcedureSearch('');

    // Clear existing line items and add new ones
    const surgeonFee = procedure.defaultFee;
    const assistantFee = Math.round(surgeonFee * DEFAULT_FEES.assistant_fee_percentage);
    const anaesthesiaFee = Math.round(surgeonFee * DEFAULT_FEES.anaesthesia_fee_percentage);
    const theatreFee = DEFAULT_FEES.theatre_fee_default;

    const newItems: EstimateLineItem[] = [
      {
        id: uuidv4(),
        category: 'surgeon_fee',
        description: `Surgeon's Professional Fee - ${procedure.name}`,
        quantity: 1,
        unitPrice: surgeonFee,
        totalPrice: surgeonFee,
        notes: 'Includes clinical services for the first one week post-procedure',
      },
      {
        id: uuidv4(),
        category: 'assistant_fee',
        description: 'Surgical Assistant Fee',
        quantity: 1,
        unitPrice: assistantFee,
        totalPrice: assistantFee,
      },
      {
        id: uuidv4(),
        category: 'anaesthesia_fee',
        description: 'Anaesthesia Fee',
        quantity: 1,
        unitPrice: anaesthesiaFee,
        totalPrice: anaesthesiaFee,
      },
      {
        id: uuidv4(),
        category: 'theatre_fee',
        description: 'Use of Theatre / Operating Room',
        quantity: 1,
        unitPrice: theatreFee,
        totalPrice: theatreFee,
      },
    ];

    setLineItems(newItems);
  };

  // Add consumable
  const handleAddConsumable = (consumable: typeof surgicalConsumables[0], quantity: number = 1) => {
    const newItem: EstimateLineItem = {
      id: uuidv4(),
      category: 'consumable',
      description: consumable.name,
      quantity,
      unitPrice: consumable.unitPrice,
      totalPrice: consumable.unitPrice * quantity,
      notes: consumable.description,
    };
    setLineItems([...lineItems, newItem]);
    toast.success(`Added ${consumable.name}`);
  };

  // Add custom item
  const handleAddCustomItem = () => {
    if (!customItemDescription.trim() || !customItemAmount) {
      toast.error('Please enter description and amount');
      return;
    }

    const amount = parseFloat(customItemAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const newItem: EstimateLineItem = {
      id: uuidv4(),
      category: customItemCategory,
      description: customItemDescription,
      quantity: 1,
      unitPrice: amount,
      totalPrice: amount,
    };
    setLineItems([...lineItems, newItem]);
    setCustomItemDescription('');
    setCustomItemAmount('');
    setShowCustomItemModal(false);
    toast.success('Custom item added');
  };

  // Update line item
  const updateLineItem = (id: string, field: keyof EstimateLineItem, value: number | string) => {
    setLineItems(items => items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.totalPrice = (updated.quantity || 0) * (updated.unitPrice || 0);
        }
        return updated;
      }
      return item;
    }));
  };

  // Remove line item
  const removeLineItem = (id: string) => {
    setLineItems(items => items.filter(item => item.id !== id));
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format currency for PDF (uses N prefix to avoid encoding issues)
  const formatCurrencyPDF = (amount: number) => {
    return 'N' + new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate PDF
  const generatePDF = async () => {
    if (!selectedPatient || !selectedProcedure || lineItems.length === 0) {
      toast.error('Please complete all required fields');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // White background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    let y = 15;

    // Header
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(2);
    doc.line(10, y + 18, pageWidth - 10, y + 18);

    doc.setTextColor(0, 51, 102);
    doc.setFontSize(16);
    doc.setFont('times', 'bold');
    doc.text('SURGICAL PROCEDURE ESTIMATE', pageWidth / 2, y + 8, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.setTextColor(60, 60, 60);
    const hospitalNameForPdf = customHospitalName || defaultHospital?.name || 'Hospital Name';
    doc.text(hospitalNameForPdf, pageWidth / 2, y + 14, { align: 'center' });
    
    // Hospital address and phone if provided
    if (hospitalAddress || hospitalPhone) {
      y += 5;
      doc.setFontSize(9);
      doc.setFont('times', 'normal');
      const contactInfo = [hospitalAddress, hospitalPhone].filter(Boolean).join(' | ');
      doc.text(contactInfo, pageWidth / 2, y + 14, { align: 'center' });
    }

    y += 28;

    // Estimate Details Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(10, y, pageWidth - 20, 35, 'FD');

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('times', 'bold');

    const col1 = 15;
    const col2 = 110;

    doc.text('Patient Name:', col1, y + 8);
    doc.text('Hospital Number:', col1, y + 16);
    doc.text('Procedure:', col1, y + 24);
    doc.text('Complexity:', col1, y + 32);

    doc.text('Estimate Date:', col2, y + 8);
    doc.text('Valid Until:', col2, y + 16);
    doc.text('Estimate No:', col2, y + 24);

    doc.setFont('times', 'normal');
    doc.text(`${selectedPatient.firstName} ${selectedPatient.lastName}`, col1 + 35, y + 8);
    doc.text(selectedPatient.hospitalNumber || 'N/A', col1 + 40, y + 16);
    doc.text(selectedProcedure.name, col1 + 25, y + 24);
    doc.text(`${complexityLevels[selectedProcedure.complexity].label}`, col1 + 25, y + 32);

    doc.text(format(new Date(), 'dd/MM/yyyy'), col2 + 32, y + 8);
    doc.text(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy'), col2 + 28, y + 16);
    doc.text(`EST-${Date.now().toString().slice(-8)}`, col2 + 28, y + 24);

    y += 42;

    // Line Items Table
    doc.setFillColor(0, 51, 102);
    doc.rect(10, y, pageWidth - 20, 8, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('Description', 15, y + 6);
    doc.text('Qty', 125, y + 6);
    doc.text('Unit Price', 140, y + 6);
    doc.text('Total', 178, y + 6);

    y += 10;

    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'normal');
    doc.setFontSize(9);

    const categoryOrder = ['surgeon_fee', 'assistant_fee', 'anaesthesia_fee', 'theatre_fee', 'consumable', 'other'];
    const categoryLabels: Record<string, string> = {
      surgeon_fee: 'Professional Fees',
      assistant_fee: 'Professional Fees',
      anaesthesia_fee: 'Professional Fees',
      theatre_fee: 'Theatre/Facility',
      consumable: 'Surgical Consumables',
      other: 'Other Items',
    };

    let currentCategory = '';
    const sortedItems = [...lineItems].sort((a, b) => 
      categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category)
    );

    sortedItems.forEach((item, idx) => {
      // Add category header if changed
      const catLabel = categoryLabels[item.category];
      if (catLabel !== currentCategory) {
        currentCategory = catLabel;
        doc.setFillColor(240, 245, 250);
        doc.rect(10, y, pageWidth - 20, 6, 'F');
        doc.setFont('times', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(0, 51, 102);
        doc.text(catLabel, 12, y + 4.5);
        y += 7;
        doc.setTextColor(0, 0, 0);
        doc.setFont('times', 'normal');
      }

      // Alternate row colors
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(250, 250, 250);
      }
      doc.rect(10, y, pageWidth - 20, 7, 'F');

      // Item details
      const descText = item.description.length > 45 ? item.description.substring(0, 42) + '...' : item.description;
      doc.setFontSize(9);
      doc.text(descText, 12, y + 5);
      doc.text(item.quantity.toString(), 127, y + 5);
      doc.text(formatCurrencyPDF(item.unitPrice), 140, y + 5);
      doc.text(formatCurrencyPDF(item.totalPrice), 178, y + 5);

      y += 8;

      // Page break if needed
      if (y > pageHeight - 80) {
        doc.addPage();
        y = 20;
      }
    });

    y += 5;

    // Totals
    doc.setDrawColor(0, 51, 102);
    doc.setLineWidth(1);
    doc.line(120, y, pageWidth - 10, y);

    y += 8;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('TOTAL ESTIMATE:', 120, y);
    doc.setTextColor(0, 102, 51);
    doc.text(formatCurrencyPDF(totals.total), 170, y);

    // Amount in words
    y += 10;
    doc.setFillColor(248, 250, 252);
    doc.rect(10, y, pageWidth - 20, 14, 'F');
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.setTextColor(0, 51, 102);
    doc.text('Amount in Words:', 15, y + 5);
    doc.setFont('times', 'italic');
    doc.setTextColor(0, 0, 0);
    const amountInWords = numberToWords(totals.total);
    const wordsWidth = pageWidth - 60;
    const wordsLines = doc.splitTextToSize(amountInWords, wordsWidth);
    doc.text(wordsLines[0], 55, y + 5);
    if (wordsLines.length > 1) {
      doc.text(wordsLines[1], 15, y + 11);
    }

    // Disclaimer Box
    y += 20;
    doc.setFillColor(255, 250, 240);
    doc.setDrawColor(255, 180, 100);
    doc.setLineWidth(0.5);
    doc.rect(10, y, pageWidth - 20, 48, 'FD');

    doc.setTextColor(180, 100, 0);
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('IMPORTANT NOTICE', 15, y + 7);

    doc.setTextColor(60, 40, 20);
    doc.setFont('times', 'normal');
    doc.setFontSize(9);

    const disclaimerLines = [
      'This estimate is purely for the surgical/procedure costs and INCLUDES:',
      '- Surgeon\'s professional fee and clinical services for the first one (1) week post-procedure',
      '- Surgical assistant fee, Anaesthesia fee, Surgical consumables, Use of theatre/operating room',
      '',
      'This estimate DOES NOT cover:',
      '- Post-operative medications, Hospital admission/bed charges (if required)',
      '- Laboratory assessment/histopathology of any specimen, Pre-operative investigations',
      '- Blood/blood products, Implants (if not listed), Complications requiring additional care',
    ];

    let disclaimerY = y + 14;
    disclaimerLines.forEach(line => {
      doc.text(line, 15, disclaimerY);
      disclaimerY += 5;
    });

    // Signature section
    y += 55;
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'normal');
    doc.setFontSize(10);

    doc.text('Prepared By:', 15, y);
    doc.line(45, y, 100, y);
    if (preparedBy) {
      doc.setFont('times', 'bold');
      doc.text(preparedBy, 47, y - 1);
      doc.setFont('times', 'normal');
    }

    doc.text('Designation:', 110, y);
    doc.line(140, y, pageWidth - 15, y);
    if (preparedByDesignation) {
      doc.setFont('times', 'bold');
      doc.text(preparedByDesignation, 142, y - 1);
      doc.setFont('times', 'normal');
    }

    y += 10;
    doc.text('Date:', 15, y);
    doc.setFont('times', 'bold');
    doc.text(format(new Date(), 'dd/MM/yyyy'), 30, y);

    // Footer
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generated by AstroHEALTH EMR | ${hospitalNameForPdf} | ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    // Save PDF
    // Generate patient name for filename (remove special characters)
    const patientNameForFile = `${selectedPatient.firstName}_${selectedPatient.lastName}`.replace(/[^a-zA-Z0-9_]/g, '');
    doc.save(`Surgical_Estimate_${patientNameForFile}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
    toast.success('Estimate PDF downloaded');
  };

  // Get category icon
  const getCategoryIcon = (category: EstimateLineItem['category']) => {
    switch (category) {
      case 'surgeon_fee':
      case 'assistant_fee':
        return <Stethoscope size={16} className="text-blue-600" />;
      case 'anaesthesia_fee':
        return <Syringe size={16} className="text-purple-600" />;
      case 'theatre_fee':
        return <Building2 size={16} className="text-amber-600" />;
      case 'consumable':
        return <Package size={16} className="text-green-600" />;
      default:
        return <DollarSign size={16} className="text-gray-600" />;
    }
  };

  // Get category label
  const getCategoryLabel = (category: EstimateLineItem['category']) => {
    switch (category) {
      case 'surgeon_fee': return 'Surgeon Fee';
      case 'assistant_fee': return 'Assistant Fee';
      case 'anaesthesia_fee': return 'Anaesthesia';
      case 'theatre_fee': return 'Theatre';
      case 'consumable': return 'Consumable';
      default: return 'Other';
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calculator className="text-primary" />
            Surgical Procedure Estimate
          </h1>
          <p className="text-gray-500 mt-1">Generate professional cost estimates for surgical procedures</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <History size={18} />
            History
          </button>
          <button
            onClick={generatePDF}
            disabled={!selectedPatient || !selectedProcedure || lineItems.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download size={18} />
            Download PDF
          </button>
        </div>
      </div>

      {/* Disclaimer Banner */}
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Important: Estimate Coverage</h3>
                <p className="text-sm text-amber-700 mt-1">
                  This estimate covers: <strong>Surgeon's professional fee</strong> (including clinical services for 1 week post-procedure), 
                  <strong> Assistant fee</strong>, <strong>Anaesthesia fee</strong>, <strong>Surgical consumables</strong>, and <strong>Use of theatre</strong>.
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  <strong>NOT covered:</strong> Post-operative medications, hospital admission (if needed), laboratory/histopathology assessment of specimens, 
                  pre-operative investigations, blood products, and implants (unless listed).
                </p>
              </div>
              <button onClick={() => setShowDisclaimer(false)} className="text-amber-600 hover:text-amber-800" title="Dismiss">
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Patient & Procedure Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <User className="text-primary" size={18} />
              Patient Information
            </h2>

            {selectedPatient ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div>
                  <p className="font-medium text-green-900">
                    {selectedPatient.firstName} {selectedPatient.lastName}
                  </p>
                  <p className="text-sm text-green-700">
                    Hospital No: {selectedPatient.hospitalNumber} | {selectedPatient.gender}, {differenceInYears(new Date(), new Date(selectedPatient.dateOfBirth))} years
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="p-2 hover:bg-green-100 rounded-lg text-green-700"
                  title="Change patient"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search patient by name or hospital number..."
                  value={patientSearch}
                  onChange={(e) => {
                    setPatientSearch(e.target.value);
                    setShowPatientSearch(true);
                  }}
                  onFocus={() => setShowPatientSearch(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                {showPatientSearch && filteredPatients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredPatients.map(patient => (
                      <button
                        key={patient.id}
                        onClick={() => {
                          setSelectedPatient(patient);
                          setShowPatientSearch(false);
                          setPatientSearch('');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                        <p className="text-sm text-gray-500">
                          {patient.hospitalNumber} | {patient.gender}, {differenceInYears(new Date(), new Date(patient.dateOfBirth))}y
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Procedure Selection */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Stethoscope className="text-primary" size={18} />
              Procedure Selection
            </h2>

            {selectedProcedure ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <p className="font-medium text-blue-900">{selectedProcedure.name}</p>
                  <p className="text-sm text-blue-700">
                    Complexity: {complexityLevels[selectedProcedure.complexity].label} | 
                    Default Fee: {formatCurrency(selectedProcedure.defaultFee)}
                  </p>
                  {selectedProcedure.description && (
                    <p className="text-sm text-blue-600 mt-1">{selectedProcedure.description}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedProcedure(null);
                    setLineItems([]);
                  }}
                  className="p-2 hover:bg-blue-100 rounded-lg text-blue-700"
                  title="Change procedure"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search procedures..."
                  value={procedureSearch}
                  onChange={(e) => {
                    setProcedureSearch(e.target.value);
                    setShowProcedureSearch(true);
                  }}
                  onFocus={() => setShowProcedureSearch(true)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                {showProcedureSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                    {filteredProcedures.map(procedure => (
                      <button
                        key={procedure.id}
                        onClick={() => handleProcedureSelect(procedure)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{procedure.name}</p>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${complexityLevels[procedure.complexity].color}`}>
                            {complexityLevels[procedure.complexity].label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {procedure.category} | {formatCurrency(procedure.defaultFee)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="text-primary" size={18} />
                Estimate Items
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowConsumableModal(true)}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1"
                >
                  <Package size={14} />
                  Add Consumable
                </button>
                <button
                  onClick={() => setShowCustomItemModal(true)}
                  className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-1"
                >
                  <Plus size={14} />
                  Custom Item
                </button>
              </div>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calculator size={40} className="mx-auto mb-2 opacity-50" />
                <p>Select a procedure to auto-populate estimate items</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100"
                  >
                    <div className="flex-shrink-0">
                      {getCategoryIcon(item.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.description}</p>
                      <p className="text-xs text-gray-500">{getCategoryLabel(item.category)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-sm border border-gray-200 rounded text-center"
                        min="1"
                        title="Quantity"
                      />
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-28 px-2 py-1 text-sm border border-gray-200 rounded text-right"
                        title="Unit Price"
                      />
                      <div className="w-28 text-right font-medium text-sm">
                        {formatCurrency(item.totalPrice)}
                      </div>
                      <button
                        onClick={() => removeLineItem(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hospital Information */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="text-primary" size={18} />
              Hospital Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hospital/Facility Name *</label>
                <input
                  type="text"
                  value={customHospitalName}
                  onChange={(e) => setCustomHospitalName(e.target.value)}
                  placeholder="Enter hospital or facility name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={hospitalAddress}
                    onChange={(e) => setHospitalAddress(e.target.value)}
                    placeholder="Hospital address"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={hospitalPhone}
                    onChange={(e) => setHospitalPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Prepared By */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-4">Prepared By</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  placeholder="Enter name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                <input
                  type="text"
                  value={preparedByDesignation}
                  onChange={(e) => setPreparedByDesignation(e.target.value)}
                  placeholder="e.g., Consultant Surgeon"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <textarea
                value={estimateNotes}
                onChange={(e) => setEstimateNotes(e.target.value)}
                placeholder="Any additional notes for the estimate..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          {/* Totals Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sticky top-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <DollarSign className="text-primary" size={18} />
              Estimate Summary
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Surgeon's Fee</span>
                <span className="font-medium">{formatCurrency(totals.surgeonFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Assistant Fee</span>
                <span className="font-medium">{formatCurrency(totals.assistantFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Anaesthesia Fee</span>
                <span className="font-medium">{formatCurrency(totals.anaesthesiaFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Theatre Fee</span>
                <span className="font-medium">{formatCurrency(totals.theatreFee)}</span>
              </div>
              {totals.consumables > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Consumables</span>
                  <span className="font-medium">{formatCurrency(totals.consumables)}</span>
                </div>
              )}
              {totals.other > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Other Items</span>
                  <span className="font-medium">{formatCurrency(totals.other)}</span>
                </div>
              )}

              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Estimate</span>
                  <span className="text-green-600">{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            {/* Disclaimer Summary */}
            <div className="mt-4 p-3 bg-amber-50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Covers surgeon's clinical services for 1 week post-op. Does not cover medications, admission, or lab assessment of specimens.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 space-y-2">
              <button
                onClick={generatePDF}
                disabled={!selectedPatient || !selectedProcedure || lineItems.length === 0}
                className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download PDF Estimate
              </button>
              <button
                onClick={() => setShowEstimatePreview(true)}
                disabled={!selectedPatient || !selectedProcedure}
                className="w-full py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileText size={18} />
                Preview Estimate
              </button>
            </div>
          </div>

          {/* Quick Add Common Consumables */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Quick Add Consumables</h3>
            <div className="space-y-2">
              {surgicalConsumables.slice(0, 5).map(consumable => (
                <button
                  key={consumable.id}
                  onClick={() => handleAddConsumable(consumable)}
                  className="w-full text-left p-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg flex items-center justify-between"
                >
                  <span className="truncate">{consumable.name}</span>
                  <span className="text-gray-500 flex-shrink-0 ml-2">
                    {formatCurrency(consumable.unitPrice)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Consumable Modal */}
      <AnimatePresence>
        {showConsumableModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowConsumableModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Add Surgical Consumables</h3>
                <button onClick={() => setShowConsumableModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search consumables..."
                    value={consumableSearch}
                    onChange={(e) => setConsumableSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
                  />
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {filteredConsumables.map(consumable => (
                    <div
                      key={consumable.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{consumable.name}</p>
                        <p className="text-xs text-gray-500">{consumable.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatCurrency(consumable.unitPrice)} / {consumable.unit}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          handleAddConsumable(consumable);
                          setShowConsumableModal(false);
                        }}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Item Modal */}
      <AnimatePresence>
        {showCustomItemModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCustomItemModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Add Custom Item</h3>
                <button onClick={() => setShowCustomItemModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={customItemCategory}
                    onChange={(e) => setCustomItemCategory(e.target.value as EstimateLineItem['category'])}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    title="Select category"
                  >
                    <option value="surgeon_fee">Surgeon Fee</option>
                    <option value="assistant_fee">Assistant Fee</option>
                    <option value="anaesthesia_fee">Anaesthesia Fee</option>
                    <option value="theatre_fee">Theatre Fee</option>
                    <option value="consumable">Consumable</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <input
                    type="text"
                    value={customItemDescription}
                    onChange={(e) => setCustomItemDescription(e.target.value)}
                    placeholder="Enter item description"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Amount (₦) *</label>
                  <input
                    type="number"
                    value={customItemAmount}
                    onChange={(e) => setCustomItemAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>

                <button
                  onClick={handleAddCustomItem}
                  className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Add Item
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Estimate Preview Modal */}
      <AnimatePresence>
        {showEstimatePreview && selectedPatient && selectedProcedure && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEstimatePreview(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">Estimate Preview</h3>
                <div className="flex gap-2">
                  <button
                    onClick={generatePDF}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download PDF
                  </button>
                  <button onClick={() => setShowEstimatePreview(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]" ref={estimateRef}>
                {/* Preview Header */}
                <div className="text-center border-b-2 border-primary pb-4 mb-4">
                  <h2 className="text-xl font-bold text-primary">SURGICAL PROCEDURE ESTIMATE</h2>
                  <p className="text-gray-600 font-medium">{customHospitalName || defaultHospital?.name || 'Hospital Name'}</p>
                  {(hospitalAddress || hospitalPhone) && (
                    <p className="text-gray-500 text-sm">{[hospitalAddress, hospitalPhone].filter(Boolean).join(' | ')}</p>
                  )}
                </div>

                {/* Patient & Procedure Info */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <p><strong>Patient:</strong> {selectedPatient.firstName} {selectedPatient.lastName}</p>
                    <p><strong>Hospital No:</strong> {selectedPatient.hospitalNumber}</p>
                    <p><strong>Procedure:</strong> {selectedProcedure.name}</p>
                  </div>
                  <div className="text-right">
                    <p><strong>Date:</strong> {format(new Date(), 'dd/MM/yyyy')}</p>
                    <p><strong>Valid Until:</strong> {format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'dd/MM/yyyy')}</p>
                    <p><strong>Complexity:</strong> {complexityLevels[selectedProcedure.complexity].label}</p>
                  </div>
                </div>

                {/* Line Items */}
                <table className="w-full text-sm mb-6">
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="text-left p-2">Description</th>
                      <th className="text-center p-2">Qty</th>
                      <th className="text-right p-2">Unit Price</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-primary">
                      <td colSpan={3} className="p-2 text-right font-bold">TOTAL ESTIMATE:</td>
                      <td className="p-2 text-right font-bold text-lg text-green-600">{formatCurrency(totals.total)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                  <h4 className="font-bold text-amber-800 mb-2">IMPORTANT NOTICE</h4>
                  <p className="text-amber-700 mb-2">
                    <strong>This estimate covers:</strong> Surgeon's professional fee (including clinical services for the first one week post-procedure), 
                    surgical assistant fee, anaesthesia fee, surgical consumables, and use of theatre/operating room.
                  </p>
                  <p className="text-amber-700">
                    <strong>This estimate DOES NOT cover:</strong> Post-operative medications, hospital admission/bed charges (if required), 
                    laboratory assessment/histopathology of any specimen, pre-operative investigations, blood/blood products, 
                    implants (if not listed), or complications requiring additional care.
                  </p>
                </div>

                {/* Signature */}
                <div className="mt-6 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <div>
                      <p><strong>Prepared By:</strong> {preparedBy || '_____________________'}</p>
                      <p><strong>Designation:</strong> {preparedByDesignation || '_____________________'}</p>
                    </div>
                    <div className="text-right">
                      <p><strong>Date:</strong> {format(new Date(), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
