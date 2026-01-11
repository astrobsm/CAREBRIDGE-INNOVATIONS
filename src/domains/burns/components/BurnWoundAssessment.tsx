// Burn Wound Assessment Component
// Comprehensive wound documentation per WHO/ISBI guidelines

import { useState } from 'react';
import { 
  Activity, // Using Activity instead of Bandage
  Plus, 
  Calendar,
  AlertTriangle,
  Check,
  Camera,
  Scissors,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import type { 
  BurnWoundAssessment, 
  EscharotomyRecord, 
  GraftingRecord,
  BurnDepthType 
} from '../types';

interface BurnWoundAssessmentProps {
  assessments: BurnWoundAssessment[];
  escharotomies: EscharotomyRecord[];
  graftings: GraftingRecord[];
  onAddAssessment: (assessment: Partial<BurnWoundAssessment>) => void;
  onAddEscharotomy: (record: Partial<EscharotomyRecord>) => void;
  onAddGrafting: (record: Partial<GraftingRecord>) => void;
}

const BODY_REGIONS = [
  'Head/Face', 'Neck', 'Anterior Chest', 'Posterior Chest',
  'Abdomen', 'Upper Back', 'Lower Back', 'Buttocks',
  'Right Upper Arm', 'Left Upper Arm', 'Right Lower Arm', 'Left Lower Arm',
  'Right Hand', 'Left Hand', 'Perineum/Genitalia',
  'Right Thigh', 'Left Thigh', 'Right Lower Leg', 'Left Lower Leg',
  'Right Foot', 'Left Foot',
];

const WOUND_APPEARANCE = [
  'Clean granulating',
  'Epithelializing',
  'Slough present',
  'Eschar present',
  'Infected - purulent',
  'Infected - cellulitis',
  'Necrotic tissue',
  'Exposed tendon/bone',
];

const EXUDATE_LEVELS = ['None', 'Minimal', 'Moderate', 'Heavy'];
const EXUDATE_TYPES = ['Serous', 'Serosanguinous', 'Sanguinous', 'Purulent'];
const DRESSING_TYPES = [
  'Silver sulfadiazine',
  'Silver-impregnated dressing',
  'Hydrocolloid',
  'Foam dressing',
  'Alginate',
  'Hydrogel',
  'Non-adherent gauze',
  'Biological dressing',
  'Negative pressure wound therapy',
  'Xenograft (porcine)',
  'Allograft',
  'Autograft coverage',
];

export default function BurnWoundAssessmentComponent({
  assessments,
  escharotomies,
  graftings,
  onAddAssessment,
  onAddEscharotomy,
  onAddGrafting,
}: BurnWoundAssessmentProps) {
  const [activeTab, setActiveTab] = useState<'assessments' | 'escharotomy' | 'grafting'>('assessments');
  const [showForm, setShowForm] = useState(false);
  
  // Assessment form state
  const [assessmentForm, setAssessmentForm] = useState({
    region: '',
    depth: 'superficial_partial' as BurnDepthType,
    appearance: [] as string[],
    exudateLevel: 'Minimal',
    exudateType: 'Serous',
    infectionSigns: false,
    cultureTaken: false,
    dressingType: '',
    debridementPerformed: false,
    notes: '',
  });

  // Escharotomy form state
  const [escharotomyForm, setEscharotomyForm] = useState({
    location: '',
    indication: '',
    performer: '',
    complications: '',
  });

  // Grafting form state  
  const [graftingForm, setGraftingForm] = useState({
    graftType: 'split_thickness' as const,
    donorSite: '',
    recipientSite: '',
    graftSize: '',
    meshing: '',
    takePercentage: '',
  });

  const handleAddAssessment = () => {
    onAddAssessment({
      date: new Date(),
      region: assessmentForm.region,
      depth: assessmentForm.depth,
      appearance: assessmentForm.appearance,
      exudateLevel: assessmentForm.exudateLevel as any,
      exudateType: assessmentForm.exudateType as any,
      infectionSigns: assessmentForm.infectionSigns ? ['Signs present'] : [],
      cultureTaken: assessmentForm.cultureTaken,
      dressingApplied: assessmentForm.dressingType,
      debridementPerformed: assessmentForm.debridementPerformed,
      notes: assessmentForm.notes,
    });
    setShowForm(false);
    resetForm();
  };

  const handleAddEscharotomy = () => {
    onAddEscharotomy({
      date: new Date(),
      location: escharotomyForm.location,
      indication: escharotomyForm.indication,
      performer: escharotomyForm.performer,
      complications: escharotomyForm.complications,
    });
    setShowForm(false);
    setEscharotomyForm({ location: '', indication: '', performer: '', complications: '' });
  };

  const handleAddGrafting = () => {
    onAddGrafting({
      date: new Date(),
      graftType: graftingForm.graftType,
      donorSite: graftingForm.donorSite,
      recipientSite: graftingForm.recipientSite,
      graftSizeCm2: parseFloat(graftingForm.graftSize) || 0,
      meshingRatio: graftingForm.meshing,
      takePercentage: parseFloat(graftingForm.takePercentage) || undefined,
    });
    setShowForm(false);
    setGraftingForm({
      graftType: 'split_thickness',
      donorSite: '',
      recipientSite: '',
      graftSize: '',
      meshing: '',
      takePercentage: '',
    });
  };

  const resetForm = () => {
    setAssessmentForm({
      region: '',
      depth: 'superficial_partial',
      appearance: [],
      exudateLevel: 'Minimal',
      exudateType: 'Serous',
      infectionSigns: false,
      cultureTaken: false,
      dressingType: '',
      debridementPerformed: false,
      notes: '',
    });
  };

  // Get depth color
  const getDepthColor = (depth: BurnDepthType) => {
    const colors = {
      superficial: 'bg-pink-100 text-pink-800',
      superficial_partial: 'bg-yellow-100 text-yellow-800',
      deep_partial: 'bg-orange-100 text-orange-800',
      full_thickness: 'bg-red-100 text-red-800',
      fourth_degree: 'bg-gray-800 text-white',
    };
    return colors[depth] || 'bg-gray-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-orange-600" />
          <div>
            <h3 className="font-semibold text-gray-900">Wound Management</h3>
            <p className="text-sm text-gray-500">Assessment, debridement, and grafting records</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('assessments')}
          className={`px-4 py-2 -mb-px ${activeTab === 'assessments' 
            ? 'border-b-2 border-orange-500 text-orange-600 font-medium' 
            : 'text-gray-500'}`}
        >
          Wound Assessments ({assessments.length})
        </button>
        <button
          onClick={() => setActiveTab('escharotomy')}
          className={`px-4 py-2 -mb-px ${activeTab === 'escharotomy' 
            ? 'border-b-2 border-orange-500 text-orange-600 font-medium' 
            : 'text-gray-500'}`}
        >
          Escharotomies ({escharotomies.length})
        </button>
        <button
          onClick={() => setActiveTab('grafting')}
          className={`px-4 py-2 -mb-px ${activeTab === 'grafting' 
            ? 'border-b-2 border-orange-500 text-orange-600 font-medium' 
            : 'text-gray-500'}`}
        >
          Grafting ({graftings.length})
        </button>
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
      >
        <Plus className="h-4 w-4" />
        Add {activeTab === 'assessments' ? 'Assessment' : activeTab === 'escharotomy' ? 'Escharotomy' : 'Grafting Record'}
      </button>

      {/* Content */}
      {activeTab === 'assessments' && (
        <div className="space-y-4">
          {assessments.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No wound assessments recorded</p>
            </div>
          ) : (
            assessments.map((assessment, idx) => (
              <div key={idx} className="p-4 border rounded-lg bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{assessment.region}</h4>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {assessment.date ? format(new Date(assessment.date), 'dd MMM yyyy HH:mm') : 'No date'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDepthColor((assessment.depth || 'superficial') as BurnDepthType)}`}>
                    {assessment.depth?.replace(/_/g, ' ') || 'Unknown'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Appearance:</span>
                    <p className="font-medium">{Array.isArray(assessment.appearance) ? assessment.appearance.join(', ') : assessment.appearance || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Exudate:</span>
                    <p className="font-medium">{assessment.exudateLevel} - {assessment.exudateType}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Dressing:</span>
                    <p className="font-medium">{assessment.dressingApplied || '-'}</p>
                  </div>
                  <div className="flex gap-3">
                    {assessment.infectionSigns && (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        Infection
                      </span>
                    )}
                    {assessment.debridementPerformed && (
                      <span className="flex items-center gap-1 text-green-600">
                        <Check className="h-4 w-4" />
                        Debrided
                      </span>
                    )}
                  </div>
                </div>
                
                {assessment.notes && (
                  <p className="text-sm text-gray-600 mt-2 italic">{assessment.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'escharotomy' && (
        <div className="space-y-4">
          {escharotomies.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Scissors className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No escharotomy procedures recorded</p>
            </div>
          ) : (
            escharotomies.map((record, idx) => (
              <div key={idx} className="p-4 border rounded-lg bg-white">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900">{record.location}</h4>
                    <p className="text-sm text-gray-500">
                      {record.date ? format(new Date(record.date), 'dd MMM yyyy HH:mm') : 'No date'}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                    Escharotomy
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                  <div>
                    <span className="text-gray-500">Indication:</span>
                    <p className="font-medium">{record.indication}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Performer:</span>
                    <p className="font-medium">{record.performer}</p>
                  </div>
                </div>
                {record.complications && (
                  <p className="text-sm text-red-600 mt-2">
                    Complications: {record.complications}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'grafting' && (
        <div className="space-y-4">
          {graftings.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Camera className="h-12 w-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No grafting procedures recorded</p>
            </div>
          ) : (
            graftings.map((record, idx) => (
              <div key={idx} className="p-4 border rounded-lg bg-white">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {record.graftType.replace(/_/g, ' ')} Graft
                    </h4>
                    <p className="text-sm text-gray-500">
                      {record.date ? format(new Date(record.date), 'dd MMM yyyy') : 'No date'}
                    </p>
                  </div>
                  {record.takePercentage !== undefined && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      record.takePercentage >= 90 ? 'bg-green-100 text-green-800' :
                      record.takePercentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {record.takePercentage}% take
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-2">
                  <div>
                    <span className="text-gray-500">Donor Site:</span>
                    <p className="font-medium">{record.donorSite}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Recipient:</span>
                    <p className="font-medium">{record.recipientSite}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Size:</span>
                    <p className="font-medium">{record.graftSizeCm2} cm²</p>
                  </div>
                  {record.meshingRatio && (
                    <div>
                      <span className="text-gray-500">Meshing:</span>
                      <p className="font-medium">{record.meshingRatio}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {activeTab === 'assessments' ? 'Wound Assessment' : 
                 activeTab === 'escharotomy' ? 'Escharotomy Record' : 'Grafting Record'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-2xl hover:text-gray-600">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              {activeTab === 'assessments' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Body Region</label>
                    <select
                      value={assessmentForm.region}
                      onChange={e => setAssessmentForm(prev => ({ ...prev, region: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select region...</option>
                      {BODY_REGIONS.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Burn Depth</label>
                    <select
                      value={assessmentForm.depth}
                      onChange={e => setAssessmentForm(prev => ({ ...prev, depth: e.target.value as BurnDepthType }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="superficial">Superficial (1st degree)</option>
                      <option value="superficial_partial">Superficial Partial (2nd degree)</option>
                      <option value="deep_partial">Deep Partial (2nd degree)</option>
                      <option value="full_thickness">Full Thickness (3rd degree)</option>
                      <option value="fourth_degree">Fourth Degree (subdermal)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Wound Appearance</label>
                    <div className="grid grid-cols-2 gap-2">
                      {WOUND_APPEARANCE.map(app => (
                        <label key={app} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={assessmentForm.appearance.includes(app)}
                            onChange={e => {
                              if (e.target.checked) {
                                setAssessmentForm(prev => ({ ...prev, appearance: [...prev.appearance, app] }));
                              } else {
                                setAssessmentForm(prev => ({ ...prev, appearance: prev.appearance.filter(a => a !== app) }));
                              }
                            }}
                          />
                          <span className="text-sm">{app}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exudate Level</label>
                      <select
                        value={assessmentForm.exudateLevel}
                        onChange={e => setAssessmentForm(prev => ({ ...prev, exudateLevel: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        {EXUDATE_LEVELS.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Exudate Type</label>
                      <select
                        value={assessmentForm.exudateType}
                        onChange={e => setAssessmentForm(prev => ({ ...prev, exudateType: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        {EXUDATE_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dressing Applied</label>
                    <select
                      value={assessmentForm.dressingType}
                      onChange={e => setAssessmentForm(prev => ({ ...prev, dressingType: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select dressing...</option>
                      {DRESSING_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={assessmentForm.infectionSigns}
                        onChange={e => setAssessmentForm(prev => ({ ...prev, infectionSigns: e.target.checked }))}
                      />
                      <span className="text-sm font-medium text-red-700">Signs of Infection</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={assessmentForm.cultureTaken}
                        onChange={e => setAssessmentForm(prev => ({ ...prev, cultureTaken: e.target.checked }))}
                      />
                      <span className="text-sm">Wound Culture Taken</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={assessmentForm.debridementPerformed}
                        onChange={e => setAssessmentForm(prev => ({ ...prev, debridementPerformed: e.target.checked }))}
                      />
                      <span className="text-sm">Debridement Performed</span>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={assessmentForm.notes}
                      onChange={e => setAssessmentForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <button
                    onClick={handleAddAssessment}
                    disabled={!assessmentForm.region}
                    className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                  >
                    Save Assessment
                  </button>
                </>
              )}

              {activeTab === 'escharotomy' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <select
                      value={escharotomyForm.location}
                      onChange={e => setEscharotomyForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select location...</option>
                      <option value="Bilateral chest (anterior axillary line)">Bilateral chest (anterior axillary line)</option>
                      <option value="Right arm (medial/lateral)">Right arm (medial/lateral)</option>
                      <option value="Left arm (medial/lateral)">Left arm (medial/lateral)</option>
                      <option value="Right forearm">Right forearm</option>
                      <option value="Left forearm">Left forearm</option>
                      <option value="Right hand">Right hand</option>
                      <option value="Left hand">Left hand</option>
                      <option value="Right leg (medial/lateral)">Right leg (medial/lateral)</option>
                      <option value="Left leg (medial/lateral)">Left leg (medial/lateral)</option>
                      <option value="Abdomen">Abdomen</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Indication</label>
                    <select
                      value={escharotomyForm.indication}
                      onChange={e => setEscharotomyForm(prev => ({ ...prev, indication: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Select indication...</option>
                      <option value="Circumferential burn with vascular compromise">Circumferential burn with vascular compromise</option>
                      <option value="Respiratory compromise (chest eschar)">Respiratory compromise (chest eschar)</option>
                      <option value="Elevated compartment pressures">Elevated compartment pressures</option>
                      <option value="Progressive limb ischemia">Progressive limb ischemia</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Performer</label>
                    <input
                      type="text"
                      value={escharotomyForm.performer}
                      onChange={e => setEscharotomyForm(prev => ({ ...prev, performer: e.target.value }))}
                      placeholder="Surgeon name"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complications</label>
                    <input
                      type="text"
                      value={escharotomyForm.complications}
                      onChange={e => setEscharotomyForm(prev => ({ ...prev, complications: e.target.value }))}
                      placeholder="None, or describe"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <button
                    onClick={handleAddEscharotomy}
                    disabled={!escharotomyForm.location || !escharotomyForm.indication}
                    className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    Save Escharotomy Record
                  </button>
                </>
              )}

              {activeTab === 'grafting' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Graft Type</label>
                    <select
                      value={graftingForm.graftType}
                      onChange={e => setGraftingForm(prev => ({ ...prev, graftType: e.target.value as any }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="split_thickness">Split Thickness Skin Graft (STSG)</option>
                      <option value="full_thickness">Full Thickness Skin Graft (FTSG)</option>
                      <option value="allograft">Allograft (Cadaveric)</option>
                      <option value="xenograft">Xenograft (Porcine)</option>
                      <option value="synthetic">Synthetic/Biosynthetic</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Donor Site</label>
                      <input
                        type="text"
                        value={graftingForm.donorSite}
                        onChange={e => setGraftingForm(prev => ({ ...prev, donorSite: e.target.value }))}
                        placeholder="e.g., Right thigh"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Site</label>
                      <input
                        type="text"
                        value={graftingForm.recipientSite}
                        onChange={e => setGraftingForm(prev => ({ ...prev, recipientSite: e.target.value }))}
                        placeholder="e.g., Left forearm"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Graft Size (cm²)</label>
                      <input
                        type="number"
                        value={graftingForm.graftSize}
                        onChange={e => setGraftingForm(prev => ({ ...prev, graftSize: e.target.value }))}
                        placeholder="Surface area"
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meshing Ratio</label>
                      <select
                        value={graftingForm.meshing}
                        onChange={e => setGraftingForm(prev => ({ ...prev, meshing: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">No meshing (sheet graft)</option>
                        <option value="1:1.5">1:1.5</option>
                        <option value="1:2">1:2</option>
                        <option value="1:3">1:3</option>
                        <option value="1:4">1:4</option>
                        <option value="1:6">1:6 (Meek technique)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Graft Take (%) - For follow-up assessment
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={graftingForm.takePercentage}
                      onChange={e => setGraftingForm(prev => ({ ...prev, takePercentage: e.target.value }))}
                      placeholder="Leave blank initially, update on follow-up"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <button
                    onClick={handleAddGrafting}
                    disabled={!graftingForm.recipientSite}
                    className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Save Grafting Record
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
