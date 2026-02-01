# PDF Export Options Implementation Guide

## Overview

AstroHEALTH now supports three unified export options for all PDF documents:

1. **Share on WhatsApp** - A4 PDF shared via WhatsApp
2. **Export PDF** - A4 format for standard printers
3. **Thermal Print** - 80mm width for XP-T80Q thermal printers (Georgia 12pt font)

## Components Created

### 1. ExportOptionsModal (`src/components/common/ExportOptionsModal.tsx`)

The main modal component providing all three export options.

**Sub-components:**
- `ExportOptionsModal` - Full modal with all three options
- `QuickExportButtons` - Small inline button group
- `ExportButtonWithModal` - Single button that opens the modal

**Usage:**
```tsx
import { ExportOptionsModal, ExportButtonWithModal } from '@components/common/ExportOptionsModal';

// Option 1: Full modal with custom trigger
const [showExportModal, setShowExportModal] = useState(false);

<button onClick={() => setShowExportModal(true)}>Export / Print</button>

<ExportOptionsModal
  isOpen={showExportModal}
  onClose={() => setShowExportModal(false)}
  title="Export Document"
  generateA4PDF={() => myA4PDFGenerator()}
  generateThermalPDF={() => myThermalPDFGenerator()}
  fileNamePrefix="document"
  phoneNumber={patient?.phone}
/>

// Option 2: Self-contained button with modal
<ExportButtonWithModal
  generateA4PDF={() => myA4PDFGenerator()}
  generateThermalPDF={() => myThermalPDFGenerator()}
  fileNamePrefix="document"
  phoneNumber={patient?.phone}
  buttonText="Export / Print"
  modalTitle="Export Options"
/>
```

### 2. useExportOptions Hook (`src/hooks/useExportOptions.ts`)

A hook for more complex scenarios with state management.

**Usage:**
```tsx
import { useExportOptions } from '@hooks';

const {
  showExportModal,
  setShowExportModal,
  handleExportA4PDF,
  handleShareWhatsApp,
  handleThermalPrint,
  modalProps
} = useExportOptions({
  generateA4PDF: () => myA4PDFGenerator(),
  generateThermalPDF: () => myThermalPDFGenerator(),
  fileNamePrefix: 'report',
  phoneNumber: patient?.phone,
  title: 'Export Report'
});

// Then use modalProps with ExportOptionsModal
<ExportOptionsModal {...modalProps} />
```

### 3. Thermal PDF Generator (`src/utils/thermalPdfGenerator.ts`)

Utility for creating 80mm thermal printer PDFs.

**Usage:**
```tsx
import { createThermalPDF, createSimpleThermalPDF, createThermalInvoicePDF } from '@utils/thermalPdfGenerator';

// Simple document
const doc = createSimpleThermalPDF({
  title: 'RECEIPT',
  subtitle: 'Invoice #12345',
  patientName: 'John Doe',
  patientId: 'HN-001',
  items: [
    { label: 'Consultation', value: '₦5,000' },
    { label: 'Medication', value: '₦3,000' },
  ],
  totalLabel: 'Total',
  totalValue: '₦8,000',
  preparedBy: 'Dr. Smith'
});

// Complex document with sections
const doc = createThermalPDF({
  title: 'POST-OP NOTE',
  subtitle: 'Appendectomy',
  timestamp: new Date(),
  sections: [
    { type: 'keyValue', key: 'Patient', value: 'John Doe' },
    { type: 'divider' },
    { type: 'header', content: 'Procedure Details' },
    { type: 'text', content: 'Laparoscopic appendectomy performed...' },
    { type: 'checkbox', items: [
      { label: 'Specimen sent', checked: true },
      { label: 'Consent obtained', checked: true },
    ]},
  ],
  preparedBy: 'Dr. Smith',
  footer: 'Hospital Name'
});

// Invoice/Receipt
const doc = createThermalInvoicePDF({
  invoiceNumber: 'INV-001',
  date: new Date(),
  patientName: 'John Doe',
  items: [
    { description: 'Consultation', quantity: 1, unitPrice: 5000, total: 5000 },
  ],
  subtotal: 5000,
  total: 5000,
  paymentStatus: 'paid',
  hospitalName: 'Hospital Name'
});
```

## Thermal Printer Specifications

- **Printer Model:** XP-T80Q
- **Paper Width:** 80mm (226 points in PDF)
- **Font:** Georgia (Times in jsPDF as closest match)
- **Font Size:** 12pt bold for headers, 10pt for body
- **Margins:** 8pt on each side

## Implementation Steps for New Pages

### Step 1: Create A4 PDF Generator

Ensure your existing PDF generator returns a jsPDF instance or Blob:

```tsx
const generateA4PDF = useCallback((): jsPDF | Blob => {
  // Your existing PDF generation logic
  const doc = new jsPDF();
  // ... add content
  return doc; // Return doc, don't call .save()
}, [dependencies]);
```

### Step 2: Create Thermal PDF Generator

Use the thermal utility:

```tsx
const generateThermalPDF = useCallback((): jsPDF => {
  return createSimpleThermalPDF({
    title: 'DOCUMENT TITLE',
    patientName: patient?.firstName + ' ' + patient?.lastName,
    // ... other options
  });
}, [patient]);
```

### Step 3: Add Export Button/Modal

Replace existing export buttons with ExportButtonWithModal:

```tsx
<ExportButtonWithModal
  generateA4PDF={generateA4PDF}
  generateThermalPDF={generateThermalPDF}
  fileNamePrefix={`Document_${patient?.lastName}`}
  phoneNumber={patient?.phone}
  buttonText="Export / Print"
  modalTitle="Export Document"
/>
```

## Pages Already Updated

1. ✅ `ShoppingChecklistPage.tsx`
2. ✅ `PostOperativeNotePage.tsx`
3. ✅ `DischargeSummaryView.tsx`
4. ✅ `DVTRiskCalculator.tsx`

## Pages Pending Update

Priority 1 (High traffic):
- `BillingPage.tsx`
- `PharmacyPage.tsx`
- `LaboratoryPage.tsx`
- `PreoperativeAssessmentPage.tsx`

Priority 2 (Medium):
- `BloodTransfusionPage.tsx`
- `VideoConferencePage.tsx`
- `DischargeFormModal.tsx`
- `AMADischargeForm.tsx`
- `SodiumCalculator.tsx`
- `GFRCalculator.tsx`

Priority 3 (Low):
- Assessment components in admissions
- Wound/Burns assessment pages
- External review page
- Various utility generators

## File Structure

```
src/
├── components/
│   └── common/
│       └── ExportOptionsModal.tsx    # Main export component
├── hooks/
│   ├── index.ts                       # Exports useExportOptions
│   └── useExportOptions.ts            # Export hook
└── utils/
    ├── thermalPdfGenerator.ts         # Thermal PDF utility
    ├── whatsappShareUtils.ts          # WhatsApp sharing utility
    └── [existing PDF generators]
```

## Notes

- All thermal PDFs use Times font (closest to Georgia available in jsPDF)
- The modal handles loading states and error handling
- WhatsApp sharing works on both mobile and desktop
- A4 PDFs use existing branded PDF generators with watermarks
