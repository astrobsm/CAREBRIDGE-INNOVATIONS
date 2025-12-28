/**
 * Drug Allergy & Adverse Reaction Assessment Component
 * CareBridge Innovations in Healthcare
 * 
 * Comprehensive documentation of drug allergies, sensitivities, and adverse reactions
 * For use in patient admission workflow
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Plus,
  Trash2,
  Pill,
  Shield,
  Search,
  X,
  Info,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

// ============================================
// COMMON DRUG ALLERGENS DATABASE
// ============================================

export interface DrugCategory {
  id: string;
  name: string;
  drugs: string[];
  crossReactivity?: string[];
}

export const commonDrugAllergens: DrugCategory[] = [
  {
    id: 'penicillins',
    name: 'Penicillins',
    drugs: ['Amoxicillin', 'Ampicillin', 'Penicillin V', 'Penicillin G', 'Flucloxacillin', 'Piperacillin', 'Co-amoxiclav (Augmentin)'],
    crossReactivity: ['Cephalosporins (2-3% cross-reactivity)', 'Carbapenems (1% cross-reactivity)'],
  },
  {
    id: 'cephalosporins',
    name: 'Cephalosporins',
    drugs: ['Ceftriaxone', 'Cefuroxime', 'Cephalexin', 'Cefixime', 'Ceftazidime', 'Cefotaxime'],
    crossReactivity: ['Penicillins (2-3% cross-reactivity)'],
  },
  {
    id: 'sulfonamides',
    name: 'Sulfonamides',
    drugs: ['Sulfamethoxazole/Trimethoprim (Septrin)', 'Sulfasalazine', 'Sulfadiazine'],
    crossReactivity: ['Thiazide diuretics', 'Sulfonylureas', 'Loop diuretics (rare)'],
  },
  {
    id: 'nsaids',
    name: 'NSAIDs',
    drugs: ['Ibuprofen', 'Diclofenac', 'Naproxen', 'Aspirin', 'Piroxicam', 'Indomethacin', 'Ketorolac', 'Meloxicam'],
    crossReactivity: ['Cross-reactivity common within class'],
  },
  {
    id: 'opioids',
    name: 'Opioids',
    drugs: ['Morphine', 'Codeine', 'Tramadol', 'Pethidine', 'Fentanyl', 'Oxycodone'],
  },
  {
    id: 'fluoroquinolones',
    name: 'Fluoroquinolones',
    drugs: ['Ciprofloxacin', 'Levofloxacin', 'Ofloxacin', 'Moxifloxacin', 'Norfloxacin'],
  },
  {
    id: 'macrolides',
    name: 'Macrolides',
    drugs: ['Erythromycin', 'Azithromycin', 'Clarithromycin'],
  },
  {
    id: 'aminoglycosides',
    name: 'Aminoglycosides',
    drugs: ['Gentamicin', 'Amikacin', 'Streptomycin', 'Tobramycin'],
  },
  {
    id: 'local-anaesthetics',
    name: 'Local Anaesthetics',
    drugs: ['Lidocaine', 'Bupivacaine', 'Ropivacaine', 'Prilocaine'],
  },
  {
    id: 'general-anaesthetics',
    name: 'General Anaesthetics',
    drugs: ['Propofol', 'Thiopental', 'Ketamine', 'Sevoflurane', 'Isoflurane'],
  },
  {
    id: 'muscle-relaxants',
    name: 'Neuromuscular Blockers',
    drugs: ['Suxamethonium', 'Rocuronium', 'Atracurium', 'Vecuronium', 'Pancuronium'],
  },
  {
    id: 'contrast-agents',
    name: 'Contrast Agents',
    drugs: ['Iodinated contrast (IV)', 'Gadolinium (MRI)', 'Barium'],
  },
  {
    id: 'anticonvulsants',
    name: 'Anticonvulsants',
    drugs: ['Phenytoin', 'Carbamazepine', 'Phenobarbital', 'Lamotrigine', 'Valproate'],
    crossReactivity: ['Aromatic anticonvulsants may cross-react'],
  },
  {
    id: 'ace-inhibitors',
    name: 'ACE Inhibitors',
    drugs: ['Lisinopril', 'Enalapril', 'Ramipril', 'Captopril', 'Perindopril'],
  },
  {
    id: 'biologics',
    name: 'Biologics/Monoclonals',
    drugs: ['Rituximab', 'Infliximab', 'Adalimumab', 'Trastuzumab'],
  },
  {
    id: 'latex',
    name: 'Latex',
    drugs: ['Latex gloves', 'Latex catheters', 'Latex equipment'],
    crossReactivity: ['Banana', 'Avocado', 'Kiwi', 'Chestnut (latex-fruit syndrome)'],
  },
  {
    id: 'other',
    name: 'Other',
    drugs: ['Metronidazole', 'Vancomycin', 'Tetracyclines', 'Chloramphenicol', 'Antituberculosis drugs'],
  },
];

// Reaction types
export type ReactionType = 'allergy' | 'intolerance' | 'adverse_reaction' | 'sensitivity';
export type ReactionSeverity = 'mild' | 'moderate' | 'severe' | 'life_threatening';

export interface DrugAllergy {
  id: string;
  drugName: string;
  drugCategory?: string;
  reactionType: ReactionType;
  severity: ReactionSeverity;
  reaction: string;
  symptoms: string[];
  onsetDate?: string;
  verificationStatus: 'confirmed' | 'suspected' | 'refuted' | 'unconfirmed';
  notes?: string;
}

export interface AllergyAssessmentResult {
  hasKnownAllergies: boolean;
  allergies: DrugAllergy[];
  nkda: boolean; // No Known Drug Allergies
  highRiskPatient: boolean;
  crossReactivityWarnings: string[];
  preoperativeAlerts: string[];
}

interface Props {
  onAssessmentComplete?: (result: AllergyAssessmentResult) => void;
  initialAllergies?: DrugAllergy[];
  readOnly?: boolean;
  patientInfo?: {
    name: string;
    hospitalNumber: string;
    gender: string;
  };
}

// ============================================
// COMPONENT
// ============================================

export default function DrugAllergyAssessment({
  onAssessmentComplete,
  initialAllergies = [],
  readOnly = false,
  patientInfo,
}: Props) {
  const [allergies, setAllergies] = useState<DrugAllergy[]>(initialAllergies);
  const [nkda, setNkda] = useState(initialAllergies.length === 0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedAllergies, setExpandedAllergies] = useState<string[]>([]);

  // New allergy form state
  const [newAllergy, setNewAllergy] = useState<Partial<DrugAllergy>>({
    reactionType: 'allergy',
    severity: 'moderate',
    verificationStatus: 'confirmed',
    symptoms: [],
  });

  // Common symptoms
  const commonSymptoms = [
    'Rash/Urticaria',
    'Itching/Pruritus',
    'Swelling/Angioedema',
    'Difficulty breathing',
    'Anaphylaxis',
    'Nausea/Vomiting',
    'Diarrhea',
    'Hypotension',
    'Bronchospasm',
    'Stevens-Johnson Syndrome',
    'Toxic Epidermal Necrolysis',
    'Drug Fever',
    'Serum Sickness',
    'Hemolytic Anemia',
    'Thrombocytopenia',
  ];

  // Filter drugs based on search
  const filteredDrugs = useMemo(() => {
    if (!searchTerm && !selectedCategory) return [];
    
    let drugs: { drug: string; category: string }[] = [];
    
    commonDrugAllergens.forEach(cat => {
      if (selectedCategory && cat.id !== selectedCategory) return;
      
      cat.drugs.forEach(drug => {
        if (!searchTerm || drug.toLowerCase().includes(searchTerm.toLowerCase())) {
          drugs.push({ drug, category: cat.name });
        }
      });
    });
    
    return drugs.slice(0, 10); // Limit results
  }, [searchTerm, selectedCategory]);

  // Calculate assessment result
  const assessment = useMemo((): AllergyAssessmentResult => {
    const crossReactivityWarnings: string[] = [];
    const preoperativeAlerts: string[] = [];
    let highRiskPatient = false;

    allergies.forEach(allergy => {
      // Check for high-risk allergies
      if (allergy.severity === 'severe' || allergy.severity === 'life_threatening') {
        highRiskPatient = true;
      }

      // Check for cross-reactivity warnings
      const category = commonDrugAllergens.find(c => 
        c.drugs.some(d => d.toLowerCase() === allergy.drugName.toLowerCase())
      );
      
      if (category?.crossReactivity) {
        category.crossReactivity.forEach(warning => {
          if (!crossReactivityWarnings.includes(warning)) {
            crossReactivityWarnings.push(`${allergy.drugName}: ${warning}`);
          }
        });
      }

      // Pre-operative alerts
      if (['local-anaesthetics', 'general-anaesthetics', 'muscle-relaxants', 'latex', 'opioids'].includes(category?.id || '')) {
        preoperativeAlerts.push(`${allergy.drugName} allergy - ALERT ANAESTHESIA TEAM`);
      }

      if (allergy.drugName.toLowerCase().includes('contrast')) {
        preoperativeAlerts.push('Contrast allergy - PRE-MEDICATE before any contrast studies');
      }

      if (allergy.symptoms.includes('Anaphylaxis')) {
        preoperativeAlerts.push(`History of anaphylaxis to ${allergy.drugName} - ENSURE RESUSCITATION EQUIPMENT AVAILABLE`);
      }
    });

    return {
      hasKnownAllergies: allergies.length > 0,
      allergies,
      nkda: nkda && allergies.length === 0,
      highRiskPatient,
      crossReactivityWarnings,
      preoperativeAlerts,
    };
  }, [allergies, nkda]);

  // Notify parent
  useMemo(() => {
    if (onAssessmentComplete) {
      onAssessmentComplete(assessment);
    }
  }, [assessment, onAssessmentComplete]);

  const addAllergy = () => {
    if (!newAllergy.drugName || !newAllergy.reaction) return;

    const allergy: DrugAllergy = {
      id: `allergy-${Date.now()}`,
      drugName: newAllergy.drugName,
      drugCategory: newAllergy.drugCategory,
      reactionType: newAllergy.reactionType || 'allergy',
      severity: newAllergy.severity || 'moderate',
      reaction: newAllergy.reaction,
      symptoms: newAllergy.symptoms || [],
      onsetDate: newAllergy.onsetDate,
      verificationStatus: newAllergy.verificationStatus || 'confirmed',
      notes: newAllergy.notes,
    };

    setAllergies(prev => [...prev, allergy]);
    setNkda(false);
    setNewAllergy({
      reactionType: 'allergy',
      severity: 'moderate',
      verificationStatus: 'confirmed',
      symptoms: [],
    });
    setShowAddForm(false);
    setSearchTerm('');
    setSelectedCategory(null);
  };

  const removeAllergy = (id: string) => {
    setAllergies(prev => prev.filter(a => a.id !== id));
  };

  const toggleSymptom = (symptom: string) => {
    setNewAllergy(prev => ({
      ...prev,
      symptoms: prev.symptoms?.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...(prev.symptoms || []), symptom],
    }));
  };

  const toggleAllergyExpand = (id: string) => {
    setExpandedAllergies(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const getSeverityColor = (severity: ReactionSeverity) => {
    switch (severity) {
      case 'life_threatening': return 'bg-red-600 text-white';
      case 'severe': return 'bg-red-100 text-red-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'mild': return 'bg-blue-100 text-blue-800';
    }
  };

  const getSeverityLabel = (severity: ReactionSeverity) => {
    switch (severity) {
      case 'life_threatening': return 'Life-Threatening';
      case 'severe': return 'Severe';
      case 'moderate': return 'Moderate';
      case 'mild': return 'Mild';
    }
  };

  // PDF Generation
  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    doc.setFillColor(239, 68, 68); // Red for allergies
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Drug Allergy Assessment', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('CareBridge Innovations in Healthcare', pageWidth / 2, 30, { align: 'center' });

    yPos = 50;

    // Patient Info
    if (patientInfo) {
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(15, yPos, pageWidth - 30, 25, 3, 3, 'F');
      doc.setFontSize(10);
      doc.text(`Patient: ${patientInfo.name}`, 20, yPos + 10);
      doc.text(`Hospital No: ${patientInfo.hospitalNumber}`, 20, yPos + 18);
      doc.text(`Date: ${format(new Date(), 'PPpp')}`, pageWidth - 60, yPos + 10);
      yPos += 35;
    }

    // Status Badge
    if (assessment.nkda) {
      doc.setFillColor(34, 197, 94);
      doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('NKDA - No Known Drug Allergies', pageWidth / 2, yPos + 13, { align: 'center' });
      yPos += 30;
    } else if (assessment.highRiskPatient) {
      doc.setFillColor(220, 38, 38);
      doc.roundedRect(15, yPos, pageWidth - 30, 20, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('⚠️ HIGH-RISK ALLERGY PATIENT', pageWidth / 2, yPos + 13, { align: 'center' });
      yPos += 30;
    }

    // Allergies List
    if (allergies.length > 0) {
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Documented Allergies:', 15, yPos);
      yPos += 10;

      allergies.forEach((allergy, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        // Allergy box
        const boxHeight = 30 + (allergy.symptoms.length > 0 ? 8 : 0);
        const bgColor = allergy.severity === 'life_threatening' || allergy.severity === 'severe'
          ? [254, 226, 226] : [254, 249, 195];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.roundedRect(15, yPos, pageWidth - 30, boxHeight, 2, 2, 'F');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`${index + 1}. ${allergy.drugName}`, 20, yPos + 8);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Severity: ${getSeverityLabel(allergy.severity)} | Type: ${allergy.reactionType}`, 20, yPos + 16);
        doc.text(`Reaction: ${allergy.reaction}`, 20, yPos + 23);
        
        if (allergy.symptoms.length > 0) {
          doc.text(`Symptoms: ${allergy.symptoms.join(', ')}`, 20, yPos + 30);
        }

        yPos += boxHeight + 5;
      });
    }

    // Pre-operative Alerts
    if (assessment.preoperativeAlerts.length > 0) {
      yPos += 5;
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(15, yPos, pageWidth - 30, 10 + assessment.preoperativeAlerts.length * 6, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(146, 64, 14);
      doc.text('PRE-OPERATIVE ALERTS:', 20, yPos + 7);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      assessment.preoperativeAlerts.forEach((alert, i) => {
        doc.text(`• ${alert}`, 20, yPos + 14 + (i * 6));
      });
      yPos += 15 + assessment.preoperativeAlerts.length * 6;
    }

    // Cross-reactivity Warnings
    if (assessment.crossReactivityWarnings.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFillColor(224, 231, 255);
      doc.roundedRect(15, yPos, pageWidth - 30, 10 + assessment.crossReactivityWarnings.length * 6, 3, 3, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(67, 56, 202);
      doc.text('CROSS-REACTIVITY WARNINGS:', 20, yPos + 7);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      assessment.crossReactivityWarnings.forEach((warning, i) => {
        doc.text(`• ${warning}`, 20, yPos + 14 + (i * 5));
      });
    }

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 290, { align: 'center' });
      doc.text('This document should be attached to patient chart and theatre booking form', pageWidth / 2, 295, { align: 'center' });
    }

    doc.save(`Drug-Allergy-Assessment-${patientInfo?.hospitalNumber || 'patient'}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-red-100 rounded-lg">
            <Pill className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Drug Allergy Assessment</h3>
            <p className="text-xs text-gray-500">Document allergies, sensitivities & adverse reactions</p>
          </div>
        </div>
        <button
          onClick={generatePDF}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Download size={14} />
          PDF
        </button>
      </div>

      {/* NKDA Toggle */}
      <div className={`p-4 rounded-lg border-2 transition-colors ${
        assessment.nkda ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
      }`}>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={nkda && allergies.length === 0}
            onChange={(e) => {
              setNkda(e.target.checked);
              if (e.target.checked) {
                setAllergies([]);
              }
            }}
            disabled={readOnly || allergies.length > 0}
            className="w-5 h-5 text-green-600 rounded"
          />
          <div className="flex items-center gap-2">
            {assessment.nkda ? (
              <Shield className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <p className={`font-medium ${assessment.nkda ? 'text-green-800' : 'text-gray-700'}`}>
                NKDA - No Known Drug Allergies
              </p>
              <p className="text-xs text-gray-500">
                Check this box if patient has no known drug allergies
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* High Risk Alert */}
      {assessment.highRiskPatient && (
        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-bold text-red-800">HIGH-RISK ALLERGY PATIENT</p>
              <p className="text-sm text-red-700">
                Patient has severe/life-threatening allergies. Ensure all clinical staff are aware.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Documented Allergies */}
      {allergies.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium text-gray-700">Documented Allergies ({allergies.length}):</p>
          
          {allergies.map(allergy => (
            <div key={allergy.id} className="border rounded-lg overflow-hidden">
              <div
                className={`flex items-center justify-between p-3 cursor-pointer ${
                  allergy.severity === 'life_threatening' ? 'bg-red-100' :
                  allergy.severity === 'severe' ? 'bg-orange-50' : 'bg-yellow-50'
                }`}
                onClick={() => toggleAllergyExpand(allergy.id)}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`w-5 h-5 ${
                    allergy.severity === 'life_threatening' || allergy.severity === 'severe'
                      ? 'text-red-600' : 'text-yellow-600'
                  }`} />
                  <div>
                    <p className="font-medium">{allergy.drugName}</p>
                    <p className="text-xs text-gray-600">{allergy.reaction}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getSeverityColor(allergy.severity)}`}>
                    {getSeverityLabel(allergy.severity)}
                  </span>
                  {!readOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAllergy(allergy.id);
                      }}
                      className="p-1 hover:bg-red-200 rounded"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>
                  )}
                  {expandedAllergies.includes(allergy.id) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              <AnimatePresence>
                {expandedAllergies.includes(allergy.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-white space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-gray-500">Type:</span>
                          <span className="ml-2 capitalize">{allergy.reactionType.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className="ml-2 capitalize">{allergy.verificationStatus}</span>
                        </div>
                      </div>
                      {allergy.symptoms.length > 0 && (
                        <div>
                          <span className="text-gray-500">Symptoms:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {allergy.symptoms.map(symptom => (
                              <span key={symptom} className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                                {symptom}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {allergy.notes && (
                        <div>
                          <span className="text-gray-500">Notes:</span>
                          <p className="text-gray-700">{allergy.notes}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Pre-operative Alerts */}
      {assessment.preoperativeAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="font-medium text-amber-800 mb-2">Pre-operative Alerts:</p>
          <div className="space-y-1">
            {assessment.preoperativeAlerts.map((alert, idx) => (
              <p key={idx} className="text-sm text-amber-700">• {alert}</p>
            ))}
          </div>
        </div>
      )}

      {/* Cross-reactivity Warnings */}
      {assessment.crossReactivityWarnings.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <p className="font-medium text-indigo-800 mb-2">Cross-Reactivity Warnings:</p>
          <div className="space-y-1">
            {assessment.crossReactivityWarnings.map((warning, idx) => (
              <p key={idx} className="text-xs text-indigo-700">• {warning}</p>
            ))}
          </div>
        </div>
      )}

      {/* Add Allergy Button */}
      {!readOnly && !showAddForm && (
        <button
          onClick={() => {
            setShowAddForm(true);
            setNkda(false);
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 hover:border-red-400 rounded-lg text-gray-600 hover:text-red-600 transition-colors"
        >
          <Plus size={18} />
          Add Drug Allergy
        </button>
      )}

      {/* Add Allergy Form */}
      <AnimatePresence>
        {showAddForm && !readOnly && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border rounded-lg p-4 space-y-4 bg-white">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Add Drug Allergy</h4>
                <button onClick={() => setShowAddForm(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X size={18} />
                </button>
              </div>

              {/* Drug Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Drug Name *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={newAllergy.drugName || searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setNewAllergy(prev => ({ ...prev, drugName: e.target.value }));
                    }}
                    placeholder="Search or type drug name..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {commonDrugAllergens.slice(0, 6).map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                      className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Drug Suggestions */}
                {filteredDrugs.length > 0 && (
                  <div className="mt-2 border rounded-lg max-h-32 overflow-y-auto">
                    {filteredDrugs.map(({ drug, category }) => (
                      <button
                        key={drug}
                        onClick={() => {
                          setNewAllergy(prev => ({ ...prev, drugName: drug, drugCategory: category }));
                          setSearchTerm('');
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex justify-between"
                      >
                        <span>{drug}</span>
                        <span className="text-xs text-gray-400">{category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reaction Type & Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reaction Type</label>
                  <select
                    value={newAllergy.reactionType}
                    onChange={(e) => setNewAllergy(prev => ({ ...prev, reactionType: e.target.value as ReactionType }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="allergy">True Allergy (Immune-mediated)</option>
                    <option value="intolerance">Intolerance</option>
                    <option value="adverse_reaction">Adverse Reaction</option>
                    <option value="sensitivity">Sensitivity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
                  <select
                    value={newAllergy.severity}
                    onChange={(e) => setNewAllergy(prev => ({ ...prev, severity: e.target.value as ReactionSeverity }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                    <option value="life_threatening">Life-Threatening</option>
                  </select>
                </div>
              </div>

              {/* Reaction Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reaction Description *</label>
                <input
                  type="text"
                  value={newAllergy.reaction || ''}
                  onChange={(e) => setNewAllergy(prev => ({ ...prev, reaction: e.target.value }))}
                  placeholder="e.g., Developed generalized rash and swelling"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Symptoms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Symptoms (select all that apply)</label>
                <div className="flex flex-wrap gap-2">
                  {commonSymptoms.map(symptom => (
                    <button
                      key={symptom}
                      onClick={() => toggleSymptom(symptom)}
                      className={`px-2 py-1 text-xs rounded-full transition-colors ${
                        newAllergy.symptoms?.includes(symptom)
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {symptom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Verification Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Status</label>
                <select
                  value={newAllergy.verificationStatus}
                  onChange={(e) => setNewAllergy(prev => ({ ...prev, verificationStatus: e.target.value as DrugAllergy['verificationStatus'] }))}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="confirmed">Confirmed (documented reaction)</option>
                  <option value="suspected">Suspected (patient reported)</option>
                  <option value="unconfirmed">Unconfirmed (needs verification)</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                <textarea
                  value={newAllergy.notes || ''}
                  onChange={(e) => setNewAllergy(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional information about the reaction..."
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={addAllergy}
                  disabled={!newAllergy.drugName || !newAllergy.reaction}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  Add Allergy
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info */}
      {allergies.length === 0 && !assessment.nkda && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Document All Known Allergies</p>
              <p className="text-xs mt-1">
                Include drug allergies, sensitivities, and adverse reactions. If patient has no 
                known drug allergies, check the NKDA box above.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
