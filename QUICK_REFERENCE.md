# Quick Reference Guide - New Features

## 🚀 QUICK START

### 1. Share Any PDF on WhatsApp
```typescript
import { downloadAndSharePDF } from './utils/whatsappShareUtils';

// In your component
await downloadAndSharePDF(
  async () => await yourPdfGenerator(),
  'Document.pdf'
);
```

### 2. Generate Drug Information Sheet
```typescript
import { downloadDrugInformationPDF } from './utils/drugInformationPdfGenerator';

await downloadDrugInformationPDF({
  patientName: 'John Doe',
  hospitalNumber: 'CB12345',
  prescribedBy: 'Dr. Smith',
  prescriptionDate: new Date(),
  medications: [{
    genericName: 'Ciprofloxacin',
    dosage: '500mg',
    route: 'Oral',
    frequency: 'Twice daily',
    indication: 'Infection',
    commonSideEffects: ['Nausea', 'Diarrhea'],
    seriousSideEffects: ['Tendon rupture'],
    warnings: ['Avoid sun exposure'],
    whatToAvoid: ['Dairy products within 2 hours'],
    whenToSeekHelp: ['Severe allergic reaction'],
    storage: 'Room temperature, away from moisture',
    refillGuidelines: [] // Auto-populated
  }],
  hospitalName: 'AstroHEALTH'
});
```

### 3. Create Referral Letter
```typescript
import { downloadReferralPDF } from './utils/referralPdfGenerator';

await downloadReferralPDF({
  referringDoctor: 'Dr. John Smith',
  referringHospital: 'General Hospital',
  referringDepartment: 'Surgery',
  referralDate: new Date(),
  subspecialty: 'Vascular Surgery',
  urgency: 'urgent', // 'routine' | 'urgent' | 'emergency'
  patient: patientObject,
  presentingComplaint: 'Chronic leg ulcer',
  historyOfPresentingComplaint: 'Patient presents with...',
  pastMedicalHistory: ['Diabetes', 'Hypertension'],
  medications: ['Metformin 1g BD', 'Amlodipine 5mg OD'],
  allergies: ['Penicillin'],
  reasonForReferral: 'For consideration of vascular reconstruction',
  // ... more fields
});
```

### 4. Generate Limb Salvage Request
```typescript
import { downloadLimbSalvageRequestPDF } from './utils/limbSalvageRequestPdfGenerator';

await downloadLimbSalvageRequestPDF({
  patient: patientObject,
  requestDate: new Date(),
  requestedBy: 'Dr. Smith',
  department: 'Vascular Surgery',
  affectedLimb: 'lower_right', // 'upper_right' | 'upper_left' | 'lower_right' | 'lower_left'
  presentingComplaint: 'Non-healing foot ulcer',
  durationOfSymptoms: '6 months',
  vascularParameters: {
    palpablePulses: 'Femoral +, Popliteal -, DP -, PT -',
    ankleBrachialIndex: 0.5,
    doppler: 'Monophasic signals',
    capillaryRefill: '>3 seconds'
  },
  metabolicParameters: {
    diabetesStatus: 'Type 2 DM, poorly controlled',
    hba1c: 9.2,
    fastingGlucose: 180,
    nutritionalStatus: 'Adequate'
  },
  imagingRequired: {
    xray: true,
    ctAngiography: true,
    mriAngiography: false,
    dopplerUltrasound: true
  },
  // ... more parameters
});
```

### 5. Record Blood Transfusion Vitals
Already integrated - just click "Record Vitals" button in active transfusions. Modal will appear with all vital signs fields.

### 6. Track NPWT Consumables
Already integrated in NPWT form. Fields include:
- NPWT Pack (₦5,000)
- Cling Film (₦1,000)
- Opsite (₦10,000)
- Dressing Pack (₦1,000)
- NG Tube (₦500)
- Crepe Bandage (₦1,200)
- Surgical Blade (₦100)
- Surgical Gloves (₦500)

Total cost calculated automatically and saved with session.

---

## 📍 WHERE TO ADD UI BUTTONS

### Pharmacy Page - Drug Information
```tsx
// In prescription actions
<button onClick={() => handleDownloadDrugInfo(prescription)}>
  <FileText size={16} />
  Drug Information
</button>
```

### Patient Details - Create Referral
```tsx
// In patient actions dropdown
<MenuItem onClick={() => setShowReferralModal(true)}>
  <FileText size={16} />
  Create Referral
</MenuItem>
```

### Limb Salvage Page - Request Form
```tsx
// In assessment section
<button onClick={() => handleDownloadRequest()}>
  <FileText size={16} />
  Download Request Form
</button>
```

### All PDF Downloads - Add WhatsApp
```tsx
// Replace existing download buttons
<button onClick={() => downloadAndSharePDF(generatePDF, 'File.pdf')}>
  <Download size={16} />
  Download & Share
</button>
```

---

## 🔧 TROUBLESHOOTING

### PDF Not Generating
- Check browser console for errors
- Verify all required fields are populated
- Ensure jsPDF is installed: `npm install jspdf`

### WhatsApp Share Not Working
- On desktop: Opens WhatsApp Web (expected behavior)
- On mobile: Uses native share sheet
- If blocked: Check browser permissions

### Consumables Not Saving
- Verify database schema includes `consumables` field
- Check browser DevTools > Application > IndexedDB
- Ensure form validation passes

### TypeScript Errors
- Run `npm run build` to check all types
- Import types from correct locations
- Check for missing properties in interfaces

---

## 📊 DATA STRUCTURES

### Drug Information
```typescript
interface DrugInformation {
  genericName: string;
  brandName?: string;
  dosage: string;
  route: string;
  frequency: string;
  indication: string;
  commonSideEffects: string[];
  seriousSideEffects: string[];
  warnings: string[];
  whatToAvoid: string[];
  whenToSeekHelp: string[];
  storage: string;
  refillGuidelines: string[]; // Auto-populated in PDF
}
```

### NPWT Consumables
```typescript
consumables: {
  npwtPack: { quantity: number; unitCost: 5000 };
  clingFilm: { quantity: number; unitCost: 1000 };
  opsite: { quantity: number; unitCost: 10000 };
  dressingPack: { quantity: number; unitCost: 1000 };
  ngTube: { quantity: number; unitCost: 500 };
  crepeBandage: { quantity: number; unitCost: 1200 };
  surgicalBlade: { quantity: number; unitCost: 100 };
  surgicalGloves: { quantity: number; unitCost: 500 };
  totalCost: number;
}
```

### Referral Data
```typescript
interface ReferralData {
  referringDoctor: string;
  referringHospital: string;
  subspecialty: string;
  urgency: 'routine' | 'urgent' | 'emergency';
  patient: Patient;
  presentingComplaint: string;
  historyOfPresentingComplaint: string;
  pastMedicalHistory: string[];
  medications: string[];
  allergies: string[];
  reasonForReferral: string;
  // ... more fields
}
```

---

## ⚠️ IMPORTANT NOTES

1. **All PDFs use white backgrounds** - No black backgrounds anywhere
2. **AstroHEALTH branding** - Every PDF has branded headers/footers
3. **WhatsApp sharing** - Works on all platforms with graceful fallbacks
4. **NPWT costs** - Fixed prices, change in code if needed
5. **Drug refill warnings** - Automatically included in drug information PDFs
6. **Role-based access** - Respect user roles when showing features

---

## 🆘 NEED HELP?

Check these files:
- `src/utils/pdfUtils.ts` - Core PDF functions
- `src/utils/pdfConfig.ts` - PDF standards
- `src/utils/whatsappShareUtils.ts` - Sharing logic
- `FINAL_IMPLEMENTATION_REPORT.md` - Full documentation

---

_Last Updated: January 12, 2026_
