import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Check, 
  Printer, 
  FileDown, 
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
  X
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { consumableItems, getProcedurePresets } from '../data/consumables';
import { ConsumableItem, ConsumableCategory, SelectedItem, categoryLabels } from '../types';

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
  const printRef = useRef<HTMLDivElement>(null);
  
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

  // Generate PDF for thermal printer (80mm width)
  const generatePDF = () => {
    if (selectedItemsList.length === 0) {
      toast.error('Please select at least one item');
      return;
    }

    // 80mm thermal printer = ~226 points width (80mm * 2.83)
    // Using slightly smaller for margins
    const pageWidth = 226;
    const doc = new jsPDF({
      unit: 'pt',
      format: [pageWidth, 800], // Long receipt format
    });

    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // Set font
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);

    // Title
    doc.text('SHOPPING CHECKLIST', pageWidth / 2, y, { align: 'center' });
    y += 18;

    // Date and purpose
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pageWidth / 2, y, { align: 'center' });
    y += 14;

    doc.setFont('helvetica', 'bold');
    doc.text(purposeLabels[purpose].toUpperCase(), pageWidth / 2, y, { align: 'center' });
    y += 14;

    // Patient details if provided
    if (patientName.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.text('Patient:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(patientName, margin + 45, y);
      y += 12;
    }
    
    if (hospitalNumber.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.text('Hosp No:', margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(hospitalNumber, margin + 45, y);
      y += 12;
    }
    
    if (procedureName.trim()) {
      doc.setFont('helvetica', 'bold');
      doc.text('Procedure:', margin, y);
      doc.setFont('helvetica', 'normal');
      const procLines = doc.splitTextToSize(procedureName, contentWidth - 50);
      procLines.forEach((line: string) => {
        doc.text(line, margin + 55, y);
        y += 10;
      });
      y += 2;
    }

    // Divider
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Items header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ITEM', margin, y);
    doc.text('QTY', pageWidth - margin - 30, y);
    y += 12;

    // Divider
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Items list
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Group selected items by category for organized printing
    const groupedSelected: Record<string, SelectedItem[]> = {};
    selectedItemsList.forEach(sel => {
      const cat = sel.item.category;
      if (!groupedSelected[cat]) groupedSelected[cat] = [];
      groupedSelected[cat].push(sel);
    });

    Object.entries(groupedSelected).forEach(([category, items]) => {
      // Category header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`-- ${categoryLabels[category as ConsumableCategory]} --`, margin, y);
      y += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      items.forEach(sel => {
        // Check if we need a new page
        if (y > 780) {
          doc.addPage([pageWidth, 800]);
          y = margin;
        }

        let itemName = sel.item.name;
        if (sel.selectedVariant) {
          itemName += ` (${sel.selectedVariant})`;
        }

        // Draw checkbox (empty square)
        const checkboxSize = 8;
        const checkboxX = margin;
        const checkboxY = y - 7;
        doc.setLineWidth(0.8);
        doc.rect(checkboxX, checkboxY, checkboxSize, checkboxSize);
        
        // Item text after checkbox
        const textStartX = margin + checkboxSize + 4;
        const maxTextWidth = contentWidth - checkboxSize - 44;
        const lines = doc.splitTextToSize(itemName, maxTextWidth);
        
        lines.forEach((line: string, idx: number) => {
          doc.text(line, textStartX, y);
          if (idx === 0) {
            doc.text(`${sel.quantity} ${sel.item.unit}`, pageWidth - margin, y, { align: 'right' });
          }
          y += 12;
        });
      });

      y += 4;
    });

    // Pre-procedure verification section
    y += 8;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PRE-PROCEDURE CHECKLIST:', margin, y);
    y += 14;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const verificationItems = [
      'All items verified & available',
      'Sterility checked',
      'Expiry dates confirmed',
      'Equipment functional'
    ];
    
    verificationItems.forEach(item => {
      // Draw checkbox
      const checkboxSize = 7;
      doc.setLineWidth(0.6);
      doc.rect(margin, y - 6, checkboxSize, checkboxSize);
      doc.text(item, margin + checkboxSize + 4, y);
      y += 12;
    });
    
    y += 4;

    // Divider
    y += 4;
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    // Total count
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL ITEMS: ${selectedItemsList.length}`, margin, y);
    y += 16;

    // Notes if provided
    if (notes.trim()) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Notes:', margin, y);
      y += 10;
      const noteLines = doc.splitTextToSize(notes, contentWidth);
      noteLines.forEach((line: string) => {
        doc.text(line, margin, y);
        y += 10;
      });
      y += 6;
    }

    // Footer
    doc.setFontSize(8);
    doc.text(`Prepared by: ${user?.name || 'Staff'}`, margin, y);
    y += 10;
    doc.text('AstroHEALTH EMR System', pageWidth / 2, y, { align: 'center' });

    // Save PDF
    const fileName = `shopping-list-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
    doc.save(fileName);
    toast.success('Shopping list PDF exported successfully!');
  };

  // Print directly
  const handlePrint = () => {
    generatePDF();
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
                <Activity className="w-5 h-5 text-emerald-600" />
                Patient Details & Procedure
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    Hospital Number
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
                <button
                  onClick={generatePDF}
                  disabled={selectedItemsList.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <FileDown className="w-5 h-5" />
                  Export PDF (80mm Thermal)
                </button>
                <button
                  onClick={handlePrint}
                  disabled={selectedItemsList.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <Printer className="w-5 h-5" />
                  Print List
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                PDF optimized for 80mm thermal printer
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingChecklistPage;
