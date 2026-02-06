/**
 * AI Encounter Summary Modal Component
 * 
 * Displays AI-generated comprehensive summary of all patient encounters
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Sparkles,
  X,
  RefreshCw,
  Copy,
  Check,
  Download,
  FileText,
  Activity,
  Pill,
  FlaskConical,
  AlertTriangle,
  Lightbulb,
  ClipboardList,
  Stethoscope,
} from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import { generateEncounterSummary, formatSummaryAsText, type EncounterSummaryResult } from '../services/encounterSummaryService';

interface AISummaryButtonProps {
  patientId: string;
  patientName: string;
  className?: string;
}

export function AISummaryButton({ patientId, patientName, className = '' }: AISummaryButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<EncounterSummaryResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerateSummary = async () => {
    setIsLoading(true);
    try {
      const result = await generateEncounterSummary(patientId);
      setSummary(result);
      setIsOpen(true);
    } catch (error) {
      console.error('Error generating summary:', error);
      toast.error('Failed to generate summary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(formatSummaryAsText(summary));
      setCopied(true);
      toast.success('Summary copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleDownloadPDF = () => {
    if (!summary) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14; // 0.5 inches ≈ 14 points
    const contentWidth = pageWidth - 2 * margin;
    let yPos = margin;

    // Set font
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    
    // Title
    doc.text('CLINICAL ENCOUNTER SUMMARY', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`Patient: ${patientName}`, margin, yPos);
    yPos += 5;
    doc.text(`Generated: ${format(summary.generatedAt, 'PPPp')}`, margin, yPos);
    yPos += 10;

    // Helper function to add section
    const addSection = (title: string, content: string | string[]) => {
      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(title, margin, yPos);
      yPos += 6;

      doc.setFont('times', 'normal');
      doc.setFontSize(10);
      
      if (Array.isArray(content)) {
        content.forEach(item => {
          const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 4);
          lines.forEach((line: string) => {
            if (yPos > 280) {
              doc.addPage();
              yPos = margin;
            }
            doc.text(line, margin + 4, yPos);
            yPos += 4.5;
          });
        });
      } else {
        const lines = doc.splitTextToSize(content, contentWidth);
        lines.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin, yPos);
          yPos += 4.5;
        });
      }
      yPos += 6;
    };

    // Add sections
    addSection('SUMMARY', summary.summary);
    
    if (summary.keyFindings.length > 0) {
      addSection('KEY FINDINGS', summary.keyFindings);
    }
    
    if (summary.activeDiagnoses.length > 0) {
      addSection('ACTIVE DIAGNOSES', summary.activeDiagnoses);
    }
    
    if (summary.currentMedications.length > 0) {
      addSection('CURRENT MEDICATIONS', summary.currentMedications);
    }
    
    if (summary.pendingInvestigations.length > 0) {
      addSection('PENDING INVESTIGATIONS', summary.pendingInvestigations);
    }
    
    if (summary.abnormalResults.length > 0) {
      addSection('ABNORMAL RESULTS', summary.abnormalResults);
    }
    
    if (summary.treatmentProgress) {
      addSection('TREATMENT PROGRESS', summary.treatmentProgress);
    }
    
    if (summary.recommendations.length > 0) {
      addSection('RECOMMENDATIONS', summary.recommendations);
    }

    doc.save(`Clinical_Summary_${patientName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast.success('PDF downloaded');
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleGenerateSummary}
        disabled={isLoading}
        className={`flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 ${className}`}
      >
        {isLoading ? (
          <RefreshCw className="animate-spin" size={18} />
        ) : (
          <Sparkles size={18} />
        )}
        <span className="hidden sm:inline">AI Summary</span>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && summary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles size={28} />
                    <div>
                      <h2 className="text-xl font-bold">AI Clinical Summary</h2>
                      <p className="text-violet-200 text-sm">{patientName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      title="Copy to clipboard"
                    >
                      {copied ? <Check size={20} /> : <Copy size={20} />}
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <Download size={20} />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-violet-200 mt-2">
                  Generated: {format(summary.generatedAt, 'PPPp')}
                </p>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-160px)] p-6 space-y-6">
                {/* Summary */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200">
                  <h3 className="font-semibold text-violet-900 flex items-center gap-2 mb-3">
                    <FileText size={18} />
                    Summary
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {summary.summary}
                  </p>
                </div>

                {/* Key Findings */}
                {summary.keyFindings.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
                      <Stethoscope size={18} />
                      Key Findings
                    </h3>
                    <ul className="space-y-2">
                      {summary.keyFindings.map((finding, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700">
                          <span className="text-blue-500 mt-1">•</span>
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Two-column layout for lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Active Diagnoses */}
                  {summary.activeDiagnoses.length > 0 && (
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                      <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-3">
                        <Activity size={18} />
                        Active Diagnoses
                      </h3>
                      <ul className="space-y-1.5">
                        {summary.activeDiagnoses.map((diag, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-amber-500">•</span>
                            {diag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Current Medications */}
                  {summary.currentMedications.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                      <h3 className="font-semibold text-green-900 flex items-center gap-2 mb-3">
                        <Pill size={18} />
                        Current Medications
                      </h3>
                      <ul className="space-y-1.5">
                        {summary.currentMedications.map((med, i) => (
                          <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-green-500">•</span>
                            {med}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Pending Investigations */}
                {summary.pendingInvestigations.length > 0 && (
                  <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                    <h3 className="font-semibold text-indigo-900 flex items-center gap-2 mb-3">
                      <FlaskConical size={18} />
                      Pending Investigations
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {summary.pendingInvestigations.map((inv, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                        >
                          {inv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Abnormal Results */}
                {summary.abnormalResults.length > 0 && (
                  <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <h3 className="font-semibold text-red-900 flex items-center gap-2 mb-3">
                      <AlertTriangle size={18} />
                      Abnormal Results
                    </h3>
                    <ul className="space-y-2">
                      {summary.abnormalResults.map((result, i) => (
                        <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                          <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                          {result}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Treatment Progress */}
                {summary.treatmentProgress && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                      <ClipboardList size={18} />
                      Treatment Progress
                    </h3>
                    <p className="text-gray-700 text-sm whitespace-pre-wrap">
                      {summary.treatmentProgress}
                    </p>
                  </div>
                )}

                {/* Recommendations */}
                {summary.recommendations.length > 0 && (
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <h3 className="font-semibold text-emerald-900 flex items-center gap-2 mb-3">
                      <Lightbulb size={18} />
                      Recommendations
                    </h3>
                    <ul className="space-y-2">
                      {summary.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700">
                          <span className="text-emerald-500 font-bold">{i + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  This summary is AI-generated and should be reviewed by a clinician.
                </p>
                <button
                  onClick={() => handleGenerateSummary()}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-violet-100 text-violet-700 rounded-lg hover:bg-violet-200 transition-colors"
                >
                  <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  Regenerate
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AISummaryButton;
