/**
 * WHO Standard Pathology Request Form Component
 * Implements WHO guidelines for histopathology specimen requisition
 */

import { 
  Microscope, 
  FileText, 
  AlertCircle,
  Beaker,
  ClipboardList,
  Scissors,
  Clock,
} from 'lucide-react';

export interface PathologyFormData {
  // Clinical Information (WHO Required)
  clinicalHistory: string;
  clinicalDiagnosis: string;
  relevantInvestigations: string;
  previousBiopsies: string;
  familyHistory: string;
  riskFactors: string[];
  
  // Specimen Details (WHO Required)
  specimenType: 'biopsy' | 'excision' | 'resection' | 'amputation' | 'curettage' | 'aspiration' | 'fluid' | 'smear' | 'other';
  specimenSite: string;
  specimenLaterality: 'left' | 'right' | 'bilateral' | 'midline' | 'not_applicable';
  specimenSize: string;
  specimenWeight: string;
  numberOfSpecimens: number;
  specimenOrientation: string;
  
  // Collection Details
  collectionMethod: 'excision' | 'incision' | 'punch' | 'shave' | 'curettage' | 'aspiration' | 'other';
  collectionDate: string;
  collectionTime: string;
  collector: string;
  
  // Fixation (WHO Required)
  fixative: 'formalin_10' | 'formalin_buffered' | 'alcohol' | 'fresh' | 'other';
  fixationTime: string;
  
  // Special Requirements
  specialStains: string[];
  immunohistochemistry: string[];
  molecularStudies: string[];
  electronMicroscopy: boolean;
  frozenSection: boolean;
  
  // Operative Findings (if surgical)
  operativeFindings: string;
  surgicalMargins: string;
  lymphNodesSubmitted: number;
  
  // Additional WHO Fields
  tumorMarkers: string[];
  stagingInfo: string;
  treatmentHistory: string;
  radiationHistory: string;
  chemotherapyHistory: string;
}

// Common special stains
const SPECIAL_STAINS = [
  'PAS (Periodic Acid-Schiff)',
  'Masson Trichrome',
  'Reticulin',
  'Congo Red',
  'Oil Red O',
  'Gram Stain',
  'Ziehl-Neelsen (AFB)',
  'Mucicarmine',
  'Alcian Blue',
  'Iron (Prussian Blue)',
  'Giemsa',
  'Elastin Van Gieson',
];

// Common IHC markers
const IHC_MARKERS = [
  'ER (Estrogen Receptor)',
  'PR (Progesterone Receptor)',
  'HER2/neu',
  'Ki-67',
  'p53',
  'CK (Cytokeratin)',
  'CK7',
  'CK20',
  'CD3',
  'CD20',
  'CD45',
  'Vimentin',
  'S-100',
  'Desmin',
  'SMA (Smooth Muscle Actin)',
  'CD34',
  'CD117 (c-Kit)',
  'TTF-1',
  'PSA',
  'CA-125',
];

// Common molecular studies
const MOLECULAR_STUDIES = [
  'KRAS Mutation',
  'EGFR Mutation',
  'BRAF Mutation',
  'ALK Translocation',
  'MSI (Microsatellite Instability)',
  'HER2 FISH',
  'BCR-ABL',
  'HPV Testing',
  'BRCA1/BRCA2',
];

// Risk factors for pathology
const RISK_FACTORS = [
  'Smoking',
  'Alcohol use',
  'Occupational exposure',
  'Previous malignancy',
  'Immunosuppression',
  'Chronic infection',
  'Radiation exposure',
  'Genetic predisposition',
];

// Tumor markers
const TUMOR_MARKERS = [
  'AFP (Alpha-fetoprotein)',
  'CEA (Carcinoembryonic Antigen)',
  'CA 19-9',
  'CA 125',
  'CA 15-3',
  'PSA',
  'β-hCG',
  'LDH',
];

interface PathologyRequestFormProps {
  formData: PathologyFormData;
  onChange: (data: Partial<PathologyFormData>) => void;
  selectedTests: string[];
}

export default function PathologyRequestForm({
  formData,
  onChange,
  selectedTests,
}: PathologyRequestFormProps) {
  // Determine if it's histopathology based on selected tests
  const isHistopathology = selectedTests.some(t => 
    ['Tissue Biopsy', 'Histology', 'Frozen Section', 'Immunohistochemistry'].includes(t)
  );
  const needsFrozenSection = selectedTests.includes('Frozen Section');

  const handleMultiSelect = (field: keyof PathologyFormData, value: string, checked: boolean) => {
    const current = formData[field] as string[];
    if (checked) {
      onChange({ [field]: [...current, value] });
    } else {
      onChange({ [field]: current.filter(v => v !== value) });
    }
  };

  return (
    <div className="space-y-6 bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-amber-300">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Microscope className="w-6 h-6 text-amber-700" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-900">WHO Standard Pathology Request Form</h3>
          <p className="text-sm text-amber-700">Complete all required fields for specimen processing</p>
        </div>
      </div>

      {/* Alert for frozen section */}
      {needsFrozenSection && (
        <div className="flex items-start gap-2 p-3 bg-red-100 border border-red-300 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800">Frozen Section Requested</p>
            <p className="text-sm text-red-700">Specimen must be sent fresh (unfixed) immediately. Contact lab before sending.</p>
          </div>
        </div>
      )}

      {/* Section 1: Clinical Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-800 font-medium">
          <ClipboardList className="w-4 h-4" />
          <span>Clinical Information (Required)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinical History <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.clinicalHistory}
              onChange={(e) => onChange({ clinicalHistory: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Brief relevant clinical history including duration of illness, symptoms, signs..."
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinical/Provisional Diagnosis <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.clinicalDiagnosis}
              onChange={(e) => onChange({ clinicalDiagnosis: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Working diagnosis or differential diagnoses..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Relevant Investigations
            </label>
            <textarea
              value={formData.relevantInvestigations}
              onChange={(e) => onChange({ relevantInvestigations: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Imaging, lab results, tumor markers..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Previous Biopsies/Pathology
            </label>
            <textarea
              value={formData.previousBiopsies}
              onChange={(e) => onChange({ previousBiopsies: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Previous pathology reports, accession numbers..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Family History
            </label>
            <input
              type="text"
              value={formData.familyHistory}
              onChange={(e) => onChange({ familyHistory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Relevant family history of cancer/genetic conditions..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Risk Factors
            </label>
            <div className="flex flex-wrap gap-2">
              {RISK_FACTORS.map(factor => (
                <label key={factor} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.riskFactors.includes(factor)}
                    onChange={(e) => handleMultiSelect('riskFactors', factor, e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  {factor}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Specimen Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-800 font-medium">
          <Beaker className="w-4 h-4" />
          <span>Specimen Details (Required)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specimen Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.specimenType}
              onChange={(e) => onChange({ specimenType: e.target.value as PathologyFormData['specimenType'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">Select type</option>
              <option value="biopsy">Biopsy</option>
              <option value="excision">Excision</option>
              <option value="resection">Resection</option>
              <option value="amputation">Amputation</option>
              <option value="curettage">Curettage</option>
              <option value="aspiration">Aspiration</option>
              <option value="fluid">Fluid</option>
              <option value="smear">Smear</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specimen Site/Organ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.specimenSite}
              onChange={(e) => onChange({ specimenSite: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="e.g., Right breast, upper outer quadrant"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Laterality
            </label>
            <select
              value={formData.specimenLaterality}
              onChange={(e) => onChange({ specimenLaterality: e.target.value as PathologyFormData['specimenLaterality'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            >
              <option value="not_applicable">Not Applicable</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="bilateral">Bilateral</option>
              <option value="midline">Midline</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Specimens
            </label>
            <input
              type="number"
              value={formData.numberOfSpecimens}
              onChange={(e) => onChange({ numberOfSpecimens: parseInt(e.target.value) || 1 })}
              min={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specimen Size (cm)
            </label>
            <input
              type="text"
              value={formData.specimenSize}
              onChange={(e) => onChange({ specimenSize: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="e.g., 3.5 x 2.0 x 1.5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specimen Weight (g)
            </label>
            <input
              type="text"
              value={formData.specimenWeight}
              onChange={(e) => onChange({ specimenWeight: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="e.g., 45"
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specimen Orientation
            </label>
            <input
              type="text"
              value={formData.specimenOrientation}
              onChange={(e) => onChange({ specimenOrientation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="e.g., Short suture = superior, Long suture = lateral, Clip = deep margin"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Collection & Fixation */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-800 font-medium">
          <Scissors className="w-4 h-4" />
          <span>Collection & Fixation Details</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Method <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.collectionMethod}
              onChange={(e) => onChange({ collectionMethod: e.target.value as PathologyFormData['collectionMethod'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">Select method</option>
              <option value="excision">Excision Biopsy</option>
              <option value="incision">Incision Biopsy</option>
              <option value="punch">Punch Biopsy</option>
              <option value="shave">Shave Biopsy</option>
              <option value="curettage">Curettage</option>
              <option value="aspiration">Aspiration</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.collectionDate}
              onChange={(e) => onChange({ collectionDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={formData.collectionTime}
              onChange={(e) => onChange({ collectionTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collector/Surgeon <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.collector}
              onChange={(e) => onChange({ collector: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Name of surgeon/clinician"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fixative <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.fixative}
              onChange={(e) => onChange({ fixative: e.target.value as PathologyFormData['fixative'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">Select fixative</option>
              <option value="formalin_10">10% Neutral Buffered Formalin</option>
              <option value="formalin_buffered">Buffered Formalin</option>
              <option value="alcohol">Alcohol</option>
              <option value="fresh">Fresh (Unfixed)</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fixation Time
            </label>
            <input
              type="text"
              value={formData.fixationTime}
              onChange={(e) => onChange({ fixationTime: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Duration in fixative, e.g., 24 hours"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Operative Findings (for surgical specimens) */}
      {isHistopathology && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-800 font-medium">
            <FileText className="w-4 h-4" />
            <span>Operative Findings</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Intraoperative Findings
              </label>
              <textarea
                value={formData.operativeFindings}
                onChange={(e) => onChange({ operativeFindings: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="Gross appearance of tumor, involvement of adjacent structures..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Surgical Margins
              </label>
              <input
                type="text"
                value={formData.surgicalMargins}
                onChange={(e) => onChange({ surgicalMargins: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="Gross margin distances, if marked"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lymph Nodes Submitted
              </label>
              <input
                type="number"
                value={formData.lymphNodesSubmitted}
                onChange={(e) => onChange({ lymphNodesSubmitted: parseInt(e.target.value) || 0 })}
                min={0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Section 5: Special Studies */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-800 font-medium">
          <Microscope className="w-4 h-4" />
          <span>Special Studies Required</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.frozenSection}
                onChange={(e) => onChange({ frozenSection: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Frozen Section</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.electronMicroscopy}
                onChange={(e) => onChange({ electronMicroscopy: e.target.checked })}
                className="w-4 h-4 text-amber-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Electron Microscopy</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Special Stains
            </label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-white">
              {SPECIAL_STAINS.map(stain => (
                <label key={stain} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={formData.specialStains.includes(stain)}
                    onChange={(e) => handleMultiSelect('specialStains', stain, e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  {stain}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Immunohistochemistry (IHC)
            </label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-white">
              {IHC_MARKERS.map(marker => (
                <label key={marker} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={formData.immunohistochemistry.includes(marker)}
                    onChange={(e) => handleMultiSelect('immunohistochemistry', marker, e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  {marker}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Molecular Studies
            </label>
            <div className="max-h-32 overflow-y-auto border rounded-lg p-2 bg-white">
              {MOLECULAR_STUDIES.map(study => (
                <label key={study} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    checked={formData.molecularStudies.includes(study)}
                    onChange={(e) => handleMultiSelect('molecularStudies', study, e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  {study}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: Treatment History (for oncology cases) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-800 font-medium">
          <Clock className="w-4 h-4" />
          <span>Treatment History (for oncology specimens)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Previous Treatment
            </label>
            <textarea
              value={formData.treatmentHistory}
              onChange={(e) => onChange({ treatmentHistory: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Previous surgery, treatment protocols..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Radiation History
            </label>
            <input
              type="text"
              value={formData.radiationHistory}
              onChange={(e) => onChange({ radiationHistory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Site, dose, dates..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chemotherapy History
            </label>
            <input
              type="text"
              value={formData.chemotherapyHistory}
              onChange={(e) => onChange({ chemotherapyHistory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Regimen, dates, response..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staging Information
            </label>
            <input
              type="text"
              value={formData.stagingInfo}
              onChange={(e) => onChange({ stagingInfo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              placeholder="Clinical stage, TNM if known..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tumor Markers
            </label>
            <div className="flex flex-wrap gap-2">
              {TUMOR_MARKERS.map(marker => (
                <label key={marker} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.tumorMarkers.includes(marker)}
                    onChange={(e) => handleMultiSelect('tumorMarkers', marker, e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  {marker}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Default empty form data
export const defaultPathologyFormData: PathologyFormData = {
  clinicalHistory: '',
  clinicalDiagnosis: '',
  relevantInvestigations: '',
  previousBiopsies: '',
  familyHistory: '',
  riskFactors: [],
  specimenType: 'biopsy',
  specimenSite: '',
  specimenLaterality: 'not_applicable',
  specimenSize: '',
  specimenWeight: '',
  numberOfSpecimens: 1,
  specimenOrientation: '',
  collectionMethod: 'excision',
  collectionDate: '',
  collectionTime: '',
  collector: '',
  fixative: 'formalin_10',
  fixationTime: '',
  specialStains: [],
  immunohistochemistry: [],
  molecularStudies: [],
  electronMicroscopy: false,
  frozenSection: false,
  operativeFindings: '',
  surgicalMargins: '',
  lymphNodesSubmitted: 0,
  tumorMarkers: [],
  stagingInfo: '',
  treatmentHistory: '',
  radiationHistory: '',
  chemotherapyHistory: '',
};
