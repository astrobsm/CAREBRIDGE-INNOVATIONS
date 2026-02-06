/**
 * Tracked Investigations Component
 * 
 * Displays all requested investigations with:
 * - Uploaded results flagging abnormal results
 * - Recommendations on next steps
 * - Chronological order display
 * - Graphs of investigation parameters over time
 */

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { format, parseISO, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Activity,
  FileText,
  Calendar,
  AlertCircle,
  Info,
  Lightbulb,
  Filter,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import { db } from '../../../database';
import type { Investigation } from '../../../types';

interface TrackedInvestigationsProps {
  patientId: string;
  onClose?: () => void;
}

interface NormalRange {
  min: number;
  max: number;
  unit: string;
}

// Common investigation reference ranges
const REFERENCE_RANGES: Record<string, NormalRange> = {
  // Haematology
  'hemoglobin': { min: 12, max: 17.5, unit: 'g/dL' },
  'haemoglobin': { min: 12, max: 17.5, unit: 'g/dL' },
  'hb': { min: 12, max: 17.5, unit: 'g/dL' },
  'pcv': { min: 36, max: 52, unit: '%' },
  'hematocrit': { min: 36, max: 52, unit: '%' },
  'wbc': { min: 4, max: 11, unit: '×10⁹/L' },
  'white blood cell': { min: 4, max: 11, unit: '×10⁹/L' },
  'platelet': { min: 150, max: 400, unit: '×10⁹/L' },
  
  // Renal Function
  'creatinine': { min: 0.6, max: 1.2, unit: 'mg/dL' },
  'urea': { min: 7, max: 20, unit: 'mg/dL' },
  'bun': { min: 7, max: 20, unit: 'mg/dL' },
  'egfr': { min: 90, max: 120, unit: 'mL/min/1.73m²' },
  'sodium': { min: 136, max: 145, unit: 'mmol/L' },
  'potassium': { min: 3.5, max: 5.0, unit: 'mmol/L' },
  'chloride': { min: 98, max: 106, unit: 'mmol/L' },
  
  // Liver Function
  'alt': { min: 7, max: 56, unit: 'U/L' },
  'ast': { min: 10, max: 40, unit: 'U/L' },
  'alp': { min: 44, max: 147, unit: 'U/L' },
  'bilirubin': { min: 0.1, max: 1.2, unit: 'mg/dL' },
  'albumin': { min: 3.5, max: 5.0, unit: 'g/dL' },
  'total protein': { min: 6.0, max: 8.3, unit: 'g/dL' },
  
  // Glucose
  'glucose': { min: 70, max: 100, unit: 'mg/dL' },
  'fbs': { min: 70, max: 100, unit: 'mg/dL' },
  'fasting blood sugar': { min: 70, max: 100, unit: 'mg/dL' },
  'rbs': { min: 70, max: 140, unit: 'mg/dL' },
  'hba1c': { min: 4.0, max: 5.6, unit: '%' },
  
  // Lipids
  'total cholesterol': { min: 0, max: 200, unit: 'mg/dL' },
  'ldl': { min: 0, max: 100, unit: 'mg/dL' },
  'hdl': { min: 40, max: 60, unit: 'mg/dL' },
  'triglycerides': { min: 0, max: 150, unit: 'mg/dL' },
  
  // Thyroid
  'tsh': { min: 0.4, max: 4.0, unit: 'mIU/L' },
  't3': { min: 80, max: 200, unit: 'ng/dL' },
  't4': { min: 5.0, max: 12.0, unit: 'μg/dL' },
  
  // Cardiac
  'troponin': { min: 0, max: 0.04, unit: 'ng/mL' },
  'bnp': { min: 0, max: 100, unit: 'pg/mL' },
  
  // Inflammatory
  'crp': { min: 0, max: 3, unit: 'mg/L' },
  'esr': { min: 0, max: 20, unit: 'mm/hr' },
};

// Get recommendations based on abnormal results
function getRecommendation(investigationType: string, value: number, range: NormalRange): string {
  const typeLower = investigationType.toLowerCase();
  const isHigh = value > range.max;
  const isLow = value < range.min;
  
  if (!isHigh && !isLow) return 'Value within normal range. Continue monitoring as clinically indicated.';
  
  // Specific recommendations based on investigation type
  if (typeLower.includes('hemoglobin') || typeLower.includes('hb') || typeLower.includes('haemoglobin')) {
    if (isLow) return 'Low hemoglobin detected. Consider iron studies, B12/folate levels. Evaluate for bleeding sources. Consider hematology referral if persistent.';
    return 'Elevated hemoglobin. Rule out polycythemia vera, chronic hypoxia, or dehydration. Consider JAK2 mutation testing.';
  }
  
  if (typeLower.includes('creatinine')) {
    if (isHigh) return 'Elevated creatinine suggests reduced kidney function. Check hydration status, review nephrotoxic medications. Consider renal ultrasound and nephrology referral.';
    return 'Low creatinine may indicate reduced muscle mass. Usually not clinically significant.';
  }
  
  if (typeLower.includes('glucose') || typeLower.includes('fbs') || typeLower.includes('rbs')) {
    if (isHigh) return 'Elevated glucose. If fasting, consider HbA1c testing for diabetes diagnosis. Lifestyle modification and dietary counseling recommended.';
    if (isLow) return 'Low glucose detected. Evaluate for hypoglycemia symptoms. Review medications, especially insulin or sulfonylureas.';
  }
  
  if (typeLower.includes('potassium')) {
    if (isHigh) return 'Hyperkalemia detected. ECG recommended. Review medications (ACE inhibitors, K-sparing diuretics). Consider Kayexalate if severe.';
    if (isLow) return 'Hypokalemia detected. ECG recommended. Evaluate for GI losses, diuretic use. Oral or IV potassium replacement may be needed.';
  }
  
  if (typeLower.includes('wbc') || typeLower.includes('white')) {
    if (isHigh) return 'Leukocytosis detected. Evaluate for infection, inflammation, or hematological malignancy. Consider peripheral smear.';
    if (isLow) return 'Leukopenia detected. Review medications, consider viral causes. Evaluate for bone marrow suppression if persistent.';
  }
  
  if (typeLower.includes('platelet')) {
    if (isHigh) return 'Thrombocytosis detected. Evaluate for reactive causes (infection, inflammation, iron deficiency) vs primary (myeloproliferative).';
    if (isLow) return 'Thrombocytopenia detected. Evaluate for immune causes, medications, liver disease. Monitor for bleeding risk.';
  }
  
  if (typeLower.includes('alt') || typeLower.includes('ast')) {
    if (isHigh) return 'Elevated liver enzymes. Review hepatotoxic medications, alcohol history. Consider hepatitis serology and liver ultrasound.';
  }
  
  if (typeLower.includes('tsh')) {
    if (isHigh) return 'Elevated TSH suggests hypothyroidism. Start levothyroxine if confirmed. Recheck in 6-8 weeks.';
    if (isLow) return 'Low TSH suggests hyperthyroidism. Check free T4/T3. Evaluate for Graves disease, toxic nodule.';
  }
  
  // Generic recommendation
  return isHigh 
    ? `Value elevated above reference range (${range.max} ${range.unit}). Clinical correlation and follow-up testing recommended.`
    : `Value below reference range (${range.min} ${range.unit}). Clinical correlation and follow-up testing recommended.`;
}

// Parse numeric value from result string
function parseNumericResult(result: string | undefined): number | null {
  if (!result) return null;
  const match = result.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : null;
}

// Find matching reference range
function findReferenceRange(investigationType: string): NormalRange | null {
  const typeLower = investigationType.toLowerCase();
  for (const [key, range] of Object.entries(REFERENCE_RANGES)) {
    if (typeLower.includes(key)) return range;
  }
  return null;
}

export default function TrackedInvestigations({ patientId, onClose }: TrackedInvestigationsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedInvestigation, setExpandedInvestigation] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '1y' | 'all'>('all');

  // Get all investigations for the patient
  const investigations = useLiveQuery(
    async () => {
      const all = await db.investigations
        .where('patientId')
        .equals(patientId)
        .toArray();
      
      // Sort chronologically (newest first)
      all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return all;
    },
    [patientId]
  );

  // Get unique investigation types for filtering
  const categories = useMemo(() => {
    if (!investigations) return ['all'];
    const types = new Set(investigations.map(i => i.category || 'Other'));
    return ['all', ...Array.from(types)];
  }, [investigations]);

  // Filter and process investigations
  const processedInvestigations = useMemo(() => {
    if (!investigations) return [];
    
    let filtered = investigations;
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(i => (i.category || 'Other') === selectedCategory);
    }
    
    // Time range filter
    const now = new Date();
    if (timeRange !== 'all') {
      const months = timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : 12;
      const cutoff = subMonths(now, months);
      filtered = filtered.filter(i => new Date(i.createdAt) >= cutoff);
    }
    
    return filtered.map(inv => {
      const numericResult = parseNumericResult(inv.results);
      const referenceRange = findReferenceRange(inv.typeName || inv.type || '');
      
      let isAbnormal = false;
      let trend: 'up' | 'down' | 'stable' | null = null;
      let recommendation = '';
      
      if (numericResult !== null && referenceRange) {
        isAbnormal = numericResult < referenceRange.min || numericResult > referenceRange.max;
        recommendation = getRecommendation(inv.typeName || inv.type || '', numericResult, referenceRange);
      }
      
      return {
        ...inv,
        numericResult,
        referenceRange,
        isAbnormal,
        trend,
        recommendation,
      };
    });
  }, [investigations, selectedCategory, timeRange]);

  // Group investigations by type for trending
  const trendData = useMemo(() => {
    if (!investigations) return {};
    
    const grouped: Record<string, { date: string; value: number; status: string }[]> = {};
    
    investigations.forEach(inv => {
      const typeName = inv.typeName || inv.type || 'Unknown';
      const numericResult = parseNumericResult(inv.results);
      
      if (numericResult !== null) {
        if (!grouped[typeName]) grouped[typeName] = [];
        grouped[typeName].push({
          date: format(new Date(inv.completedAt || inv.createdAt), 'MMM dd'),
          value: numericResult,
          status: inv.status || 'pending',
        });
      }
    });
    
    // Sort each group by date (oldest first for charting)
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    });
    
    return grouped;
  }, [investigations]);

  // Statistics
  const stats = useMemo(() => {
    if (!processedInvestigations.length) return null;
    
    const total = processedInvestigations.length;
    const completed = processedInvestigations.filter(i => i.status === 'completed').length;
    const pending = processedInvestigations.filter(i => i.status !== 'completed').length;
    const abnormal = processedInvestigations.filter(i => i.isAbnormal).length;
    
    return { total, completed, pending, abnormal };
  }, [processedInvestigations]);

  if (!investigations) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-gray-500">Loading investigations...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlaskConical size={28} />
            <div>
              <h2 className="text-xl font-bold">Tracked Investigations</h2>
              <p className="text-indigo-100 text-sm">Results, trends, and recommendations</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ChevronDown size={20} />
            </button>
          )}
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-indigo-100">Total</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-300">{stats.completed}</p>
              <p className="text-xs text-indigo-100">Completed</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-amber-300">{stats.pending}</p>
              <p className="text-xs text-indigo-100">Pending</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-red-300">{stats.abnormal}</p>
              <p className="text-xs text-indigo-100">Abnormal</p>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 border-b bg-gray-50 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
          >
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Investigation List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {processedInvestigations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FlaskConical size={48} className="mx-auto mb-4 opacity-30" />
            <p>No investigations found</p>
          </div>
        ) : (
          processedInvestigations.map(inv => (
            <motion.div
              key={inv.id}
              layout
              className={`border rounded-xl overflow-hidden transition-all ${
                inv.isAbnormal 
                  ? 'border-red-300 bg-red-50' 
                  : inv.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 bg-white'
              }`}
            >
              {/* Investigation Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50/50"
                onClick={() => setExpandedInvestigation(
                  expandedInvestigation === inv.id ? null : inv.id
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {inv.isAbnormal ? (
                        <AlertTriangle className="text-red-500" size={18} />
                      ) : inv.status === 'completed' ? (
                        <CheckCircle className="text-green-500" size={18} />
                      ) : (
                        <Clock className="text-amber-500" size={18} />
                      )}
                      <h3 className="font-semibold text-gray-900">
                        {inv.typeName || inv.type}
                      </h3>
                      {inv.category && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                          {inv.category}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {format(new Date(inv.createdAt), 'PP')}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        inv.status === 'completed' 
                          ? 'bg-green-100 text-green-700'
                          : inv.status === 'pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {inv.status || 'pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Result Value */}
                    {inv.numericResult !== null && (
                      <div className={`text-right ${inv.isAbnormal ? 'text-red-600' : 'text-gray-900'}`}>
                        <p className="text-lg font-bold">{inv.numericResult}</p>
                        {inv.referenceRange && (
                          <p className="text-xs text-gray-500">
                            Ref: {inv.referenceRange.min}-{inv.referenceRange.max} {inv.referenceRange.unit}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Trend Graph Button */}
                    {trendData[inv.typeName || inv.type || '']?.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowGraph(showGraph === inv.id ? null : inv.id);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-indigo-600"
                        title="View trend"
                      >
                        <Activity size={18} />
                      </button>
                    )}

                    <ChevronDown
                      size={18}
                      className={`text-gray-400 transition-transform ${
                        expandedInvestigation === inv.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedInvestigation === inv.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t"
                  >
                    <div className="p-4 space-y-4">
                      {/* Results */}
                      {inv.results && (
                        <div className="bg-white rounded-lg p-3 border">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                            <FileText size={14} />
                            Results
                          </h4>
                          <p className="text-gray-900 whitespace-pre-wrap">{inv.results}</p>
                        </div>
                      )}

                      {/* Recommendations */}
                      {inv.recommendation && (
                        <div className={`rounded-lg p-3 border ${
                          inv.isAbnormal 
                            ? 'bg-red-50 border-red-200' 
                            : 'bg-blue-50 border-blue-200'
                        }`}>
                          <h4 className={`text-sm font-medium flex items-center gap-2 mb-2 ${
                            inv.isAbnormal ? 'text-red-700' : 'text-blue-700'
                          }`}>
                            <Lightbulb size={14} />
                            Clinical Recommendation
                          </h4>
                          <p className={`text-sm ${inv.isAbnormal ? 'text-red-800' : 'text-blue-800'}`}>
                            {inv.recommendation}
                          </p>
                        </div>
                      )}

                      {/* Notes */}
                      {inv.notes && (
                        <div className="bg-gray-50 rounded-lg p-3 border">
                          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-2">
                            <Info size={14} />
                            Notes
                          </h4>
                          <p className="text-gray-600 text-sm">{inv.notes}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Trend Graph */}
              <AnimatePresence>
                {showGraph === inv.id && trendData[inv.typeName || inv.type || ''] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t bg-white p-4"
                  >
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <Activity size={14} />
                      Trend Over Time
                    </h4>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData[inv.typeName || inv.type || '']}>
                          <defs>
                            <linearGradient id={`gradient-${inv.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11 }}
                            stroke="#9ca3af"
                          />
                          <YAxis 
                            tick={{ fontSize: 11 }}
                            stroke="#9ca3af"
                            domain={inv.referenceRange 
                              ? [(dataMin: number) => Math.min(dataMin, inv.referenceRange!.min) * 0.9, 
                                 (dataMax: number) => Math.max(dataMax, inv.referenceRange!.max) * 1.1]
                              : ['auto', 'auto']
                            }
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '8px', 
                              border: '1px solid #e5e7eb',
                              fontSize: '12px',
                            }}
                          />
                          
                          {/* Reference range lines */}
                          {inv.referenceRange && (
                            <>
                              <ReferenceLine 
                                y={inv.referenceRange.max} 
                                stroke="#ef4444" 
                                strokeDasharray="5 5"
                                label={{ 
                                  value: 'High', 
                                  position: 'right',
                                  fontSize: 10,
                                  fill: '#ef4444',
                                }}
                              />
                              <ReferenceLine 
                                y={inv.referenceRange.min} 
                                stroke="#ef4444" 
                                strokeDasharray="5 5"
                                label={{ 
                                  value: 'Low', 
                                  position: 'right',
                                  fontSize: 10,
                                  fill: '#ef4444',
                                }}
                              />
                            </>
                          )}
                          
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fill={`url(#gradient-${inv.id})`}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 6, fill: '#4f46e5' }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    {inv.referenceRange && (
                      <p className="text-xs text-gray-500 text-center mt-2">
                        Reference range: {inv.referenceRange.min} - {inv.referenceRange.max} {inv.referenceRange.unit}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
