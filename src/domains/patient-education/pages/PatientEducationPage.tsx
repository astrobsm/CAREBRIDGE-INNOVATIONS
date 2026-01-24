/**
 * Patient Education Page
 * AstroHEALTH Innovations in Healthcare
 * 
 * Main page for accessing and downloading patient education materials
 * organized by surgical categories with WHO-aligned guidelines
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  ChevronRight,
  ChevronDown,
  Download,
  Search,
  FileText,
  AlertCircle,
  Clock,
  Target,
  Stethoscope,
  Activity,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Heart,
  Users,
  Flame,
  Droplets,
  Scissors,
  GraduationCap
} from 'lucide-react';
import { EDUCATION_CATEGORIES } from '../types';
import type { EducationCondition, EducationCategory } from '../types';
import { allBurnsConditions, allWoundsConditions, allPressureInjuriesConditions, allReconstructiveSurgeryConditions, allHerniaConditions, allPediatricSurgeryConditions, allVascularConditions, allBreastConditions, allCosmeticConditions, allGenitalReconstructionConditions, allReconstructiveTechniquesConditions, allSystemicConditions, allDrNnadiBurnsEducation } from '../data';
import { downloadPatientEducationPDF, downloadCategorySummaryPDF } from '../../../utils/educationPdfGenerator';

// Get icon for category
const getCategoryIcon = (code: string) => {
  const icons: Record<string, React.ReactNode> = {
    'A': <Flame className="h-5 w-5" />,
    'B': <Droplets className="h-5 w-5" />,
    'C': <Activity className="h-5 w-5" />,
    'D': <Scissors className="h-5 w-5" />,
    'E': <Target className="h-5 w-5" />,
    'F': <Users className="h-5 w-5" />,
    'G': <Heart className="h-5 w-5" />,
    'H': <ShieldCheck className="h-5 w-5" />,
    'I': <Stethoscope className="h-5 w-5" />,
    'J': <FileText className="h-5 w-5" />,
    'K': <BookOpen className="h-5 w-5" />,
    'L': <AlertCircle className="h-5 w-5" />,
    'M': <GraduationCap className="h-5 w-5" />
  };
  return icons[code] || <BookOpen className="h-5 w-5" />;
};

const PatientEducationPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<EducationCategory | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<EducationCondition | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState<string>('overview');

  // Build categories with their conditions
  const categoriesWithConditions = useMemo(() => {
    return EDUCATION_CATEGORIES.map(cat => {
      let conditions: EducationCondition[] = [];
      
      // Map conditions to their categories
      switch (cat.code) {
        case 'A':
          conditions = allBurnsConditions;
          break;
        case 'B':
          conditions = allWoundsConditions;
          break;
        case 'C':
          conditions = allPressureInjuriesConditions;
          break;
        case 'D':
          conditions = allReconstructiveSurgeryConditions;
          break;
        case 'E':
          conditions = allHerniaConditions;
          break;
        case 'F':
          conditions = allPediatricSurgeryConditions;
          break;
        case 'G':
          conditions = allVascularConditions;
          break;
        case 'H':
          conditions = allBreastConditions;
          break;
        case 'I':
          conditions = allCosmeticConditions;
          break;
        case 'J':
          conditions = allGenitalReconstructionConditions;
          break;
        case 'K':
          conditions = allReconstructiveTechniquesConditions;
          break;
        case 'L':
          conditions = allSystemicConditions;
          break;
        case 'M':
          conditions = allDrNnadiBurnsEducation;
          break;
        default:
          conditions = [];
      }
      
      return { ...cat, conditions };
    });
  }, []);

  // Filter conditions by search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categoriesWithConditions;
    
    const term = searchTerm.toLowerCase();
    return categoriesWithConditions.map(cat => ({
      ...cat,
      conditions: cat.conditions.filter(condition => 
        condition.name.toLowerCase().includes(term) ||
        condition.alternateNames?.some(name => name.toLowerCase().includes(term)) ||
        (condition.icdCode && condition.icdCode.toLowerCase().includes(term))
      )
    })).filter(cat => cat.conditions.length > 0);
  }, [categoriesWithConditions, searchTerm]);

  const handleDownloadConditionPDF = () => {
    if (selectedCondition && selectedCategory) {
      downloadPatientEducationPDF(selectedCondition, selectedCategory);
    }
  };

  const handleDownloadCategoryPDF = (category: EducationCategory) => {
    downloadCategorySummaryPDF(category);
  };

  // Render section toggle
  const SectionToggle = ({ id, title, icon }: { id: string; title: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setExpandedSection(expandedSection === id ? '' : id)}
      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
        expandedSection === id 
          ? 'bg-blue-50 text-blue-700' 
          : 'bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      {expandedSection === id ? (
        <ChevronDown className="h-5 w-5" />
      ) : (
        <ChevronRight className="h-5 w-5" />
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Patient Education</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Comprehensive educational materials aligned with WHO guidelines
                </p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 sm:mt-6 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conditions, procedures, or ICD codes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Categories List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
              <h2 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Categories</h2>
              <div className="space-y-2">
                {filteredCategories.map((category) => (
                  <motion.button
                    key={category.code}
                    onClick={() => {
                      setSelectedCategory(category);
                      setSelectedCondition(null);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                      selectedCategory?.code === category.code
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <span style={{ color: category.color }}>
                          {getCategoryIcon(category.code)}
                        </span>
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-sm">
                          {category.code}. {category.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {category.conditions.length} conditions
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* Conditions List */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedCategory ? (
                <motion.div
                  key={selectedCategory.code}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-xl shadow-sm p-3 sm:p-4"
                >
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h2 className="font-semibold text-base sm:text-lg">{selectedCategory.name}</h2>
                    <button
                      onClick={() => handleDownloadCategoryPDF(selectedCategory)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Download category summary"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {selectedCategory.conditions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCategory.conditions.map((condition) => (
                        <motion.button
                          key={condition.id}
                          onClick={() => setSelectedCondition(condition)}
                          className={`w-full text-left p-3 rounded-lg transition-all ${
                            selectedCondition?.id === condition.id
                              ? 'bg-green-50 border-2 border-green-500'
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="font-medium text-sm">{condition.name}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            ICD: {condition.icdCode}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm sm:text-base">Content coming soon</p>
                      <p className="text-xs mt-1">Educational materials for this category are being developed</p>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center text-gray-500"
                >
                  <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm sm:text-base">Select a category to view conditions</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Condition Details */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedCondition ? (
                <motion.div
                  key={selectedCondition.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Condition Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 sm:p-4 text-white">
                    <h2 className="font-bold text-base sm:text-lg">{selectedCondition.name}</h2>
                    <div className="flex items-center gap-2 sm:gap-4 mt-2 text-blue-100 text-xs sm:text-sm">
                      <span>ICD: {selectedCondition.icdCode}</span>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    {/* Download Button */}
                    <button
                      onClick={handleDownloadConditionPDF}
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base"
                    >
                      <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                      Download Patient Education PDF
                    </button>

                    {/* Sections */}
                    <div className="space-y-2 mt-3 sm:mt-4">
                      {/* Overview */}
                      <SectionToggle 
                        id="overview" 
                        title="Overview" 
                        icon={<BookOpen className="h-5 w-5" />} 
                      />
                      {expandedSection === 'overview' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-gray-50 rounded-lg p-4 text-sm"
                        >
                          <p className="text-gray-700 leading-relaxed">
                            {selectedCondition.overview.definition}
                          </p>
                          <div className="mt-4">
                            <h4 className="font-medium text-gray-900 mb-2">Common Causes:</h4>
                            <ul className="list-disc list-inside space-y-1 text-gray-600">
                              {selectedCondition.overview.causes.slice(0, 4).map((cause, idx) => (
                                <li key={idx}>{cause}</li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}

                      {/* Treatment Phases */}
                      <SectionToggle 
                        id="treatment" 
                        title="Treatment Phases" 
                        icon={<Clock className="h-5 w-5" />} 
                      />
                      {expandedSection === 'treatment' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-3"
                        >
                          {selectedCondition.treatmentPhases.map((phase) => (
                            <div key={phase.phase} className="bg-gray-50 rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                                  {phase.phase}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">{phase.name}</div>
                                  <div className="text-xs text-gray-500">{phase.duration}</div>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600">{phase.description}</p>
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {/* Preoperative */}
                      <SectionToggle 
                        id="preop" 
                        title="Before Surgery" 
                        icon={<Target className="h-5 w-5" />} 
                      />
                      {expandedSection === 'preop' && selectedCondition.preoperativeInstructions && (() => {
                        const preop = selectedCondition.preoperativeInstructions;
                        return (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-gray-50 rounded-lg p-4 text-sm"
                        >
                          <h4 className="font-medium text-gray-900 mb-2">Required Consultations:</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-600 mb-3">
                            {preop.consultations.map((c, idx) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                          <h4 className="font-medium text-gray-900 mb-2">Day Before Surgery:</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            {preop.dayBeforeSurgery.map((i, idx) => (
                              <li key={idx}>{i}</li>
                            ))}
                          </ul>
                        </motion.div>
                        );
                      })()}

                      {/* Postoperative */}
                      <SectionToggle 
                        id="postop" 
                        title="After Surgery" 
                        icon={<Activity className="h-5 w-5" />} 
                      />
                      {expandedSection === 'postop' && selectedCondition.postoperativeInstructions && (() => {
                        const postop = selectedCondition.postoperativeInstructions;
                        return (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-gray-50 rounded-lg p-4 text-sm"
                        >
                          <p className="text-gray-600 mb-3">
                            <strong>Positioning:</strong> {postop.immediatePostop.positioning}
                          </p>
                          <h4 className="font-medium text-gray-900 mb-2">Dietary Guidelines:</h4>
                          <ul className="list-disc list-inside space-y-1 text-gray-600">
                            {postop.dietaryGuidelines.slice(0, 4).map((g, idx) => (
                              <li key={idx}>{g}</li>
                            ))}
                          </ul>
                        </motion.div>
                        );
                      })()}

                      {/* Expected Outcomes */}
                      <SectionToggle 
                        id="outcomes" 
                        title="Expected Outcomes" 
                        icon={<Stethoscope className="h-5 w-5" />} 
                      />
                      {expandedSection === 'outcomes' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-gray-50 rounded-lg p-4 text-sm"
                        >
                          <p className="text-gray-600 mb-3">
                            <strong>Functional Recovery:</strong> {selectedCondition.expectedOutcomes.functionalRecovery}
                          </p>
                          {selectedCondition.expectedOutcomes.successRate && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <strong className="text-green-800">Success Rate:</strong>
                              <p className="text-green-700 mt-1">{selectedCondition.expectedOutcomes.successRate}</p>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* Follow-up */}
                      <SectionToggle 
                        id="followup" 
                        title="Follow-up Care" 
                        icon={<Calendar className="h-5 w-5" />} 
                      />
                      {expandedSection === 'followup' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="bg-gray-50 rounded-lg p-4 text-sm space-y-2"
                        >
                          {selectedCondition.followUpCare.schedule.slice(0, 4).map((apt, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className="w-20 font-medium text-blue-600">{apt.timing}</div>
                              <div className="text-gray-600">{apt.purpose}</div>
                            </div>
                          ))}
                        </motion.div>
                      )}

                      {/* Warning Signs */}
                      <SectionToggle 
                        id="warnings" 
                        title="Warning Signs" 
                        icon={<AlertTriangle className="h-5 w-5 text-amber-500" />} 
                      />
                      {expandedSection === 'warnings' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="space-y-3"
                        >
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                            <h4 className="font-medium text-amber-800 mb-2">Contact Your Doctor If:</h4>
                            <ul className="list-disc list-inside space-y-1 text-amber-700 text-sm">
                              {selectedCondition.warningSigns.map((sign, idx) => (
                                <li key={idx}>{sign}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <h4 className="font-medium text-red-800 mb-2">Seek Emergency Care If:</h4>
                            <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                              {selectedCondition.emergencySigns.map((sign, idx) => (
                                <li key={idx}>{sign}</li>
                              ))}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-xl shadow-sm p-6 sm:p-8 text-center text-gray-500"
                >
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm sm:text-base">Select a condition to view details</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientEducationPage;
