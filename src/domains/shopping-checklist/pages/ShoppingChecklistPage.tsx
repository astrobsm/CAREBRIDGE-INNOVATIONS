import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { 
  ShoppingCart, 
  Printer, 
  ArrowLeft, 
  Plus, 
  Minus,
  CheckSquare,
  Square,
  Package,
  Scissors,
  Syringe,
  Pill,
  Droplets,
  Activity,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Search,
  User,
  UserPlus,
  MessageCircle,
  FileText,
  Share2
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database';
import { Patient } from '../../../types';
import { consumableItems, getProcedurePresets } from '../data/consumables';
import { ConsumableItem, ConsumableCategory, SelectedItem, categoryLabels } from '../types';
import { sharePDFOnWhatsApp } from '../../../utils/whatsappShareUtils';

type ProcedurePurpose = 'surgery' | 'bedside_debridement' | 'wound_dressing' | 'intralesional_injection' | 'other';

const purposeLabels: Record<ProcedurePurpose, string> = {
  surgery: 'Surgery',
  bedside_debridement: 'Bedside Debridement',
  wound_dressing: 'Wound Dressing',
  intralesional_injection: 'Intralesional Triamcinolone Injection',
  other: 'Other Procedure'
};

const categoryIcons: Record<ConsumableCategory, React.ReactNode> = {
  drapes_covers: <Package className="w-5 h-5" />,
  gloves_protection: <Activity className="w-5 h-5" />,
  blades_sharps: <Scissors className="w-5 h-5" />,
  syringes_needles: <Syringe className="w-5 h-5" />,
  wound_care: <Droplets className="w-5 h-5" />,
  dressings_bandages: <Package className="w-5 h-5" />,
  iv_fluids: <Droplets className="w-5 h-5" />,
  iv_medications: <Pill className="w-5 h-5" />,
  sutures: <Activity className="w-5 h-5" />,
  catheters_tubes: <Activity className="w-5 h-5" />,
  antiseptics: <Droplets className="w-5 h-5" />,
  injections: <Syringe className="w-5 h-5" />,
  miscellaneous: <Package className="w-5 h-5" />,
};

export const ShoppingChecklistPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [purpose, setPurpose] = useState<ProcedurePurpose>('surgery');
  const [patientName, setPatientName] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [hospitalNumber, setHospitalNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    Object.keys(categoryLabels).reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});
  
  // Patient search state
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Search patients from database
  const searchedPatients = useLiveQuery(
    () => patientSearchTerm.trim().length >= 2
      ? db.patients
          .filter(p => 
            p.firstName.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
            p.lastName.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
            p.hospitalNumber?.toLowerCase().includes(patientSearchTerm.toLowerCase())
          )
          .limit(10)
          .toArray()
      : [],
    [patientSearchTerm]
  );

  // Select patient from database
  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientName(`${patient.firstName} ${patient.lastName}`);
    setHospitalNumber(patient.hospitalNumber || '');
    setPatientSearchTerm('');
    setShowPatientDropdown(false);
    setIsManualEntry(false);
    toast.success(`Selected: ${patient.firstName} ${patient.lastName}`);
  };

  // Clear patient selection
  const clearPatientSelection = () => {
    setSelectedPatient(null);
    setPatientName('');
    setHospitalNumber('');
    setPatientSearchTerm('');
    setIsManualEntry(false);
  };

  // Switch to manual entry mode
  const switchToManualEntry = () => {
    setSelectedPatient(null);
    setIsManualEntry(true);
    setShowPatientDropdown(false);
    setPatientSearchTerm('');
  };

  // Group items by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<ConsumableCategory, ConsumableItem[]> = {} as Record<ConsumableCategory, ConsumableItem[]>;
    consumableItems.forEach(item => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    return grouped;
  }, []);

  // Get selected items list
  const selectedItemsList = useMemo(() => {
    return Object.values(selectedItems).filter(item => item.quantity > 0);
  }, [selectedItems]);

  // Toggle item selection
  const toggleItem = (item: ConsumableItem) => {
    setSelectedItems(prev => {
      if (prev[item.id]) {
        const { [item.id]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [item.id]: {
          item,
          quantity: item.defaultQuantity,
          selectedVariant: item.variants ? variantSelections[item.id] || item.variants[0] : undefined
        }
      };
    });
  };

  // Update quantity
  const updateQuantity = (itemId: string, delta: number) => {
    setSelectedItems(prev => {
      if (!prev[itemId]) return prev;
      const newQty = Math.max(1, prev[itemId].quantity + delta);
      return {
        ...prev,
        [itemId]: { ...prev[itemId], quantity: newQty }
      };
    });
  };

  // Update variant
  const updateVariant = (itemId: string, variant: string) => {
    setVariantSelections(prev => ({ ...prev, [itemId]: variant }));
    if (selectedItems[itemId]) {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: { ...prev[itemId], selectedVariant: variant }
      }));
    }
  };

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  // Load preset for procedure
  const loadPreset = () => {
    const presetIds = getProcedurePresets(purpose);
    const newSelected: Record<string, SelectedItem> = {};
    
    presetIds.forEach(id => {
      const item = consumableItems.find(i => i.id === id);
      if (item) {
        newSelected[id] = {
          item,
          quantity: item.defaultQuantity,
          selectedVariant: item.variants ? item.variants[0] : undefined
        };
      }
    });
    
    setSelectedItems(newSelected);
    toast.success(`Loaded ${presetIds.length} items for ${purposeLabels[purpose]}`);
  };

  // Clear all selections
  const clearAll = () => {
    setSelectedItems({});
    toast.success('All selections cleared');
  };

  // Select all items
  const selectAll = () => {
    const newSelected: Record<string, SelectedItem> = {};
    consumableItems.forEach(item => {
      newSelected[item.id] = {
        item,
        quantity: item.defaultQuantity,
        selectedVariant: item.variants ? item.variants[0] : undefined
      };
    });
    setSelectedItems(newSelected);
    toast.success('All items selected');
  };

  // Generate A4 PDF for standard printing/sharing
  const generateA4PDF = (): jsPDF => {
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Header with title
    doc.setFont('times', 'bold');
    doc.setFontSize(20);
    doc.text('SHOPPING CHECKLIST', pageWidth / 2, y, { align: 'center' });
    y += 28;

    // Date and purpose
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pageWidth / 2, y, { align: 'center' });
    y += 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(purposeLabels[purpose].toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 24;

    // Patient details box
    if (patientName.trim() || hospitalNumber.trim() || procedureName.trim()) {
      doc.setDrawColor(0);
      doc.setLineWidth(1);
      doc.rect(margin, y, contentWidth, 60);
      y += 16;

      doc.setFontSize(11);
      if (patientName.trim()) {
        doc.setFont('times', 'bold');
        doc.text('Patient:', margin + 10, y);
        doc.setFont('times', 'normal');
        doc.text(patientName, margin + 70, y);
        y += 16;
      }
      
      if (hospitalNumber.trim()) {
        doc.setFont('times', 'bold');
        doc.text('Hosp No:', margin + 10, y);
        doc.setFont('times', 'normal');
        doc.text(hospitalNumber, margin + 70, y);
        y += 16;
      }
      
      if (procedureName.trim()) {
        doc.setFont('times', 'bold');
        doc.text('Procedure:', margin + 10, y);
        doc.setFont('times', 'normal');
        doc.text(procedureName, margin + 80, y);
      }
      y += 30;
    }

    // Divider
    y += 10;
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;

    // Items header
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('ITEM', margin + 20, y);
    doc.text('QTY', pageWidth - margin - 60, y);
    y += 16;
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    // Group selected items by category
    const groupedSelected: Record<string, SelectedItem[]> = {};
    selectedItemsList.forEach(sel => {
      const cat = sel.item.category;
      if (!groupedSelected[cat]) groupedSelected[cat] = [];
      groupedSelected[cat].push(sel);
    });

    doc.setFontSize(11);

    Object.entries(groupedSelected).forEach(([category, items]) => {
      // Check for page break
      if (y > pageHeight - 100) {
        doc.addPage();
        y = margin;
      }

      // Category header
      doc.setFont('times', 'bold');
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 12, contentWidth, 18, 'F');
      doc.text(`-- ${categoryLabels[category as ConsumableCategory]} --`, margin + 10, y);
      y += 18;

      doc.setFont('times', 'normal');

      items.forEach(sel => {
        if (y > pageHeight - 60) {
          doc.addPage();
          y = margin;
        }

        let itemName = sel.item.name;
        if (sel.selectedVariant) {
          itemName += ` (${sel.selectedVariant})`;
        }

        // Draw checkbox
        const checkboxSize = 10;
        doc.setLineWidth(0.8);
        doc.rect(margin, y - 8, checkboxSize, checkboxSize);
        
        // Item text
        doc.text(itemName, margin + 20, y);
        doc.text(`${sel.quantity} ${sel.item.unit}`, pageWidth - margin - 10, y, { align: 'right' });
        y += 18;
      });

      y += 8;
    });

    // Pre-procedure checklist
    y += 16;
    doc.setLineWidth(1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;
    
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('PRE-PROCEDURE CHECKLIST:', margin, y);
    y += 20;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    
    const verificationItems = [
      'All items verified & available',
      'Sterility checked',
      'Expiry dates confirmed',
      'Equipment functional'
    ];
    
    verificationItems.forEach(item => {
      const checkboxSize = 10;
      doc.setLineWidth(0.8);
      doc.rect(margin, y - 8, checkboxSize, checkboxSize);
      doc.text(item, margin + 18, y);
      y += 18;
    });

    // Total count
    y += 16;
    doc.line(margin, y, pageWidth - margin, y);
    y += 20;
    doc.setFont('times', 'bold');
    doc.setFontSize(13);
    doc.text(`TOTAL ITEMS: ${selectedItemsList.length}`, margin, y);

    // Notes if provided
    if (notes.trim()) {
      y += 24;
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.text('Notes:', margin, y);
      y += 14;
      const noteLines = doc.splitTextToSize(notes, contentWidth);
      noteLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 12;
      });
    }

    // Footer
    y += 24;
    doc.setFontSize(10);
    doc.text(`Prepared by: ${user?.firstName || 'Staff'} ${user?.lastName || ''}`, margin, y);
    doc.text('AstroHEALTH EMR System', pageWidth / 2, y, { align: 'center' });

    return doc;
  };

  // Generate Thermal PDF (80mm width, Georgia font 12pt)
  const generateThermalPDF = (): jsPDF => {
    // 80mm thermal printer = ~226 points width (80mm * 2.83)
    const pageWidth = 226;
    const doc = new jsPDF({
      unit: 'pt',
      format: [pageWidth, 800],
    });

    const margin = 8;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin + 5;

    // Use Times as closest to Georgia in jsPDF
    doc.setFont('times', 'bold');
    doc.setFontSize(14);

    // Title
    doc.text('SHOPPING CHECKLIST', pageWidth / 2, y, { align: 'center' });
    y += 18;

    // Date and purpose
    doc.setFontSize(12);
    doc.setFont('times', 'normal');
    doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pageWidth / 2, y, { align: 'center' });
    y += 16;

    doc.setFont('times', 'bold');
    doc.text(purposeLabels[purpose].toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 16;

    // Patient details
    doc.setFontSize(12);
    if (patientName.trim()) {
      doc.setFont('times', 'bold');
      doc.text('Patient:', margin, y);
      doc.setFont('times', 'normal');
      doc.text(patientName, margin + 50, y);
      y += 14;
    }
    
    if (hospitalNumber.trim()) {
      doc.setFont('times', 'bold');
      doc.text('Hosp No:', margin, y);
      doc.setFont('times', 'normal');
      doc.text(hospitalNumber, margin + 50, y);
      y += 14;
    }
    
    if (procedureName.trim()) {
      doc.setFont('times', 'bold');
      doc.text('Procedure:', margin, y);
      doc.setFont('times', 'normal');
      const procLines = doc.splitTextToSize(procedureName, contentWidth - 55);
      procLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + (idx === 0 ? 58 : 0), y);
        y += 12;
      });
    }

    // Divider
    y += 4;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    // Items header
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('ITEM', margin, y);
    doc.text('QTY', pageWidth - margin - 30, y);
    y += 14;
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Group items
    const groupedSelected: Record<string, SelectedItem[]> = {};
    selectedItemsList.forEach(sel => {
      const cat = sel.item.category;
      if (!groupedSelected[cat]) groupedSelected[cat] = [];
      groupedSelected[cat].push(sel);
    });

    doc.setFontSize(12);

    Object.entries(groupedSelected).forEach(([category, items]) => {
      // Category header
      doc.setFont('times', 'bold');
      doc.setFontSize(10);
      doc.text(`-- ${categoryLabels[category as ConsumableCategory]} --`, margin, y);
      y += 14;

      doc.setFont('times', 'normal');
      doc.setFontSize(12);

      items.forEach(sel => {
        if (y > 780) {
          doc.addPage([pageWidth, 800]);
          y = margin;
        }

        let itemName = sel.item.name;
        if (sel.selectedVariant) {
          itemName += ` (${sel.selectedVariant})`;
        }

        // Checkbox
        const checkboxSize = 8;
        doc.setLineWidth(0.8);
        doc.rect(margin, y - 7, checkboxSize, checkboxSize);
        
        // Item text
        const textStartX = margin + checkboxSize + 4;
        const maxTextWidth = contentWidth - checkboxSize - 44;
        const lines = doc.splitTextToSize(itemName, maxTextWidth);
        
        lines.forEach((line: string, idx: number) => {
          doc.text(line, textStartX, y);
          if (idx === 0) {
            doc.text(`${sel.quantity} ${sel.item.unit}`, pageWidth - margin, y, { align: 'right' });
          }
          y += 14;
        });
      });

      y += 4;
    });

    // Pre-procedure checklist
    y += 8;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
    
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('PRE-PROCEDURE CHECKLIST:', margin, y);
    y += 16;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    
    const verificationItems = [
      'All items verified & available',
      'Sterility checked',
      'Expiry dates confirmed',
      'Equipment functional'
    ];
    
    verificationItems.forEach(item => {
      const checkboxSize = 7;
      doc.setLineWidth(0.6);
      doc.rect(margin, y - 6, checkboxSize, checkboxSize);
      doc.text(item, margin + checkboxSize + 4, y);
      y += 14;
    });

    // Total
    y += 6;
    doc.line(margin, y, pageWidth - margin, y);
    y += 14;
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL ITEMS: ${selectedItemsList.length}`, margin, y);
    y += 18;

    // Notes
    if (notes.trim()) {
      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      doc.text('Notes:', margin, y);
      y += 12;
      const noteLines = doc.splitTextToSize(notes, contentWidth);
      noteLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 12;
      });
      y += 6;
    }

    // Footer
    doc.setFontSize(10);
    doc.text(`Prepared by: ${user?.firstName || 'Staff'}`, margin, y);
    y += 12;
    doc.text('AstroHEALTH EMR System', pageWidth / 2, y, { align: 'center' });

    return doc;
  };

  // Export A4 PDF
  const handleExportA4PDF = () => {
    if (selectedItemsList.length === 0) {
      toast.error('Please select at least one item');
      return;
    }
    const doc = generateA4PDF();
    const fileName = `shopping-checklist-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
    doc.save(fileName);
    toast.success('A4 PDF exported successfully!');
  };

  // Share A4 PDF on WhatsApp
  const handleShareWhatsApp = async () => {
    if (selectedItemsList.length === 0) {
      toast.error('Please select at least one item');
      return;
    }
    try {
      const doc = generateA4PDF();
      const pdfBlob = doc.output('blob');
      const fileName = `shopping-checklist-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
      await sharePDFOnWhatsApp(pdfBlob, fileName);
    } catch (error) {
      console.error('Error sharing on WhatsApp:', error);
      toast.error('Failed to share on WhatsApp');
    }
  };

  // Print with thermal printer (80mm)
  const handleThermalPrint = () => {
    if (selectedItemsList.length === 0) {
      toast.error('Please select at least one item');
      return;
    }
    const doc = generateThermalPDF();
    const fileName = `shopping-list-thermal-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
    doc.save(fileName);
    toast.success('Thermal print PDF (80mm) exported!');
  };

  // Show export options modal
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Export Options Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-emerald-600" />
                Export / Print Options
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Share on WhatsApp (A4) */}
              <button
                onClick={() => {
                  handleShareWhatsApp();
                  setShowExportModal(false);
                }}
                className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-xl border-2 border-green-200 transition-colors"
              >
                <div className="p-3 bg-green-500 rounded-full">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-green-800">Share on WhatsApp</div>
                  <div className="text-sm text-green-600">A4 PDF format</div>
                </div>
              </button>

              {/* Export A4 PDF */}
              <button
                onClick={() => {
                  handleExportA4PDF();
                  setShowExportModal(false);
                }}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border-2 border-blue-200 transition-colors"
              >
                <div className="p-3 bg-blue-500 rounded-full">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-blue-800">Export PDF</div>
                  <div className="text-sm text-blue-600">A4 format for standard printers</div>
                </div>
              </button>

              {/* Thermal Print (80mm) */}
              <button
                onClick={() => {
                  handleThermalPrint();
                  setShowExportModal(false);
                }}
                className="w-full flex items-center gap-4 p-4 bg-orange-50 hover:bg-orange-100 rounded-xl border-2 border-orange-200 transition-colors"
              >
                <div className="p-3 bg-orange-500 rounded-full">
                  <Printer className="w-6 h-6 text-white" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-semibold text-orange-800">Thermal Print</div>
                  <div className="text-sm text-orange-600">80mm width, Georgia 12pt</div>
                </div>
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Choose an export format for your shopping checklist
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-8 h-8" />
                <div>
                  <h1 className="text-xl font-bold">Shopping Checklist</h1>
                  <p className="text-sm opacity-80">Consumables for procedures</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                {selectedItemsList.length} items selected
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Selection */}
          <div className="lg:col-span-2 space-y-4">
            {/* Purpose Selection */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-800 mb-3">Procedure Type</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.entries(purposeLabels) as [ProcedurePurpose, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setPurpose(key)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      purpose === key
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-2 mt-4">
                <button
                  onClick={loadPreset}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  Load Preset
                </button>
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <CheckSquare className="w-4 h-4" />
                  Select All
                </button>
                <button
                  onClick={clearAll}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>

            {/* Patient Details & Procedure Name */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Patient Details & Procedure
              </h2>
              
              {/* Patient Selection Mode Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setIsManualEntry(false); clearPatientSelection(); }}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !isManualEntry
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  Search Database
                </button>
                <button
                  onClick={switchToManualEntry}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isManualEntry
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  Manual Entry
                </button>
              </div>

              {/* Database Search Mode */}
              {!isManualEntry && !selectedPatient && (
                <div className="relative mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Patient
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={patientSearchTerm}
                      onChange={(e) => {
                        setPatientSearchTerm(e.target.value);
                        setShowPatientDropdown(true);
                      }}
                      onFocus={() => setShowPatientDropdown(true)}
                      placeholder="Search by name or hospital number..."
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  
                  {/* Search Results Dropdown */}
                  {showPatientDropdown && patientSearchTerm.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {searchedPatients && searchedPatients.length > 0 ? (
                        searchedPatients.map((patient) => (
                          <button
                            key={patient.id}
                            onClick={() => handleSelectPatient(patient)}
                            className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="font-medium text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {patient.hospitalNumber && `Hosp#: ${patient.hospitalNumber}`}
                              {patient.phone && ` • ${patient.phone}`}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-sm">
                          No patients found. Try different search terms or use manual entry.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Selected Patient Display */}
              {selectedPatient && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-emerald-800">
                        {selectedPatient.firstName} {selectedPatient.lastName}
                      </div>
                      <div className="text-sm text-emerald-600">
                        {selectedPatient.hospitalNumber && `Hosp#: ${selectedPatient.hospitalNumber}`}
                        {selectedPatient.gender && ` • ${selectedPatient.gender}`}
                      </div>
                    </div>
                    <button
                      onClick={clearPatientSelection}
                      className="p-1 text-emerald-600 hover:bg-emerald-100 rounded"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Manual Entry Mode */}
              {isManualEntry && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patient Name
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Enter patient name..."
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hospital Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={hospitalNumber}
                      onChange={(e) => setHospitalNumber(e.target.value)}
                      placeholder="Enter hospital number..."
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Procedure Name - Always visible */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Procedure / Operation Name
                </label>
                <input
                  type="text"
                  value={procedureName}
                  onChange={(e) => setProcedureName(e.target.value)}
                  placeholder="e.g., Wound Debridement, Keloid Excision, etc."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Items by Category */}
            {(Object.entries(itemsByCategory) as [ConsumableCategory, ConsumableItem[]][]).map(([category, items]) => (
              <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-600">{categoryIcons[category]}</span>
                    <span className="font-semibold text-gray-800">{categoryLabels[category]}</span>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {items.filter(i => selectedItems[i.id]).length}/{items.length}
                    </span>
                  </div>
                  {expandedCategories[category] ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>
                
                {expandedCategories[category] && (
                  <div className="p-4 space-y-2">
                    {items.map(item => {
                      const isSelected = !!selectedItems[item.id];
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                            isSelected 
                              ? 'border-emerald-500 bg-emerald-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <button
                            onClick={() => toggleItem(item)}
                            className="flex-shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-6 h-6 text-emerald-600" />
                            ) : (
                              <Square className="w-6 h-6 text-gray-400" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{item.name}</div>
                            {item.variants && (
                              <select
                                value={variantSelections[item.id] || item.variants[0]}
                                onChange={(e) => updateVariant(item.id, e.target.value)}
                                className="mt-1 text-sm border rounded px-2 py-1 bg-white"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {item.variants.map(v => (
                                  <option key={v} value={v}>{v}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-12 text-center font-semibold">
                                {selectedItems[item.id]?.quantity} {item.unit}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="p-1 bg-gray-200 rounded hover:bg-gray-300"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Panel - Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-4 sticky top-24">
              <h2 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                Selected Items ({selectedItemsList.length})
              </h2>

              {selectedItemsList.length === 0 ? (
                <p className="text-gray-500 text-sm py-8 text-center">
                  No items selected yet.<br />Select items from the list.
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {selectedItemsList.map(sel => (
                    <div key={sel.item.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {sel.item.name}
                        </div>
                        {sel.selectedVariant && (
                          <div className="text-xs text-gray-500">{sel.selectedVariant}</div>
                        )}
                      </div>
                      <div className="text-sm font-semibold text-emerald-700">
                        {sel.quantity} {sel.item.unit}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special notes..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-2">
                {/* Main Export Button */}
                <button
                  onClick={() => setShowExportModal(true)}
                  disabled={selectedItemsList.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <Share2 className="w-5 h-5" />
                  Export / Print Options
                </button>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleShareWhatsApp}
                    disabled={selectedItemsList.length === 0}
                    className="flex flex-col items-center justify-center gap-1 px-2 py-3 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Share on WhatsApp (A4)"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs font-medium">WhatsApp</span>
                  </button>
                  <button
                    onClick={handleExportA4PDF}
                    disabled={selectedItemsList.length === 0}
                    className="flex flex-col items-center justify-center gap-1 px-2 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export A4 PDF"
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-xs font-medium">A4 PDF</span>
                  </button>
                  <button
                    onClick={handleThermalPrint}
                    disabled={selectedItemsList.length === 0}
                    className="flex flex-col items-center justify-center gap-1 px-2 py-3 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Thermal Print (80mm)"
                  >
                    <Printer className="w-5 h-5" />
                    <span className="text-xs font-medium">Thermal</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                WhatsApp &amp; A4 PDF: Standard format | Thermal: 80mm, Georgia 12pt
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingChecklistPage;
