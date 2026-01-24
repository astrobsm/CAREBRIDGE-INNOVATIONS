/**
 * Transfusion Monitoring Chart View Component
 * AstroHEALTH Innovations in Healthcare
 * 
 * Displays transfusion monitoring records with vital signs graphs
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import {
  Plus,
  X,
  Thermometer,
  Heart,
  Activity,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Download,
  Clock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { TransfusionMonitoringChart, TransfusionMonitoringEntry } from '../../../types';

interface TransfusionMonitoringChartViewProps {
  chart: TransfusionMonitoringChart;
  onAddEntry: (entry: TransfusionMonitoringEntry) => Promise<void>;
  onCompleteChart: (outcome: 'completed_uneventful' | 'completed_with_reaction' | 'stopped_due_to_reaction', complications?: string) => Promise<void>;
  onClose: () => void;
}

// Time points for monitoring
const MONITORING_TIME_POINTS = [
  { label: 'Pre-transfusion', value: 'pre', description: 'Baseline vitals before starting' },
  { label: '15 min', value: '15min', description: 'Critical monitoring - first 15 minutes' },
  { label: '30 min', value: '30min', description: '30 minutes after start' },
  { label: '1 hr', value: '1hr', description: '1 hour after start' },
  { label: '1.5 hr', value: '1.5hr', description: '1.5 hours after start' },
  { label: '2 hr', value: '2hr', description: '2 hours after start' },
  { label: '2.5 hr', value: '2.5hr', description: '2.5 hours after start' },
  { label: '3 hr', value: '3hr', description: '3 hours after start' },
  { label: '3.5 hr', value: '3.5hr', description: '3.5 hours after start' },
  { label: 'End', value: 'end', description: 'End of transfusion' },
  { label: '1 hr post', value: '1hr_post', description: '1 hour after transfusion completed' },
];

// Vital sign status checks
const getVitalStatus = (type: string, value: number): 'normal' | 'warning' | 'critical' => {
  switch (type) {
    case 'temperature':
      if (value < 35 || value > 39) return 'critical';
      if (value < 36 || value > 38) return 'warning';
      return 'normal';
    case 'pulse':
      if (value < 40 || value > 150) return 'critical';
      if (value < 60 || value > 100) return 'warning';
      return 'normal';
    case 'systolic':
      if (value < 80 || value > 180) return 'critical';
      if (value < 90 || value > 140) return 'warning';
      return 'normal';
    case 'respiratoryRate':
      if (value < 8 || value > 30) return 'critical';
      if (value < 12 || value > 20) return 'warning';
      return 'normal';
    case 'spo2':
      if (value < 90) return 'critical';
      if (value < 95) return 'warning';
      return 'normal';
    default:
      return 'normal';
  }
};

const getStatusColor = (status: 'normal' | 'warning' | 'critical'): string => {
  switch (status) {
    case 'critical': return 'text-red-600 bg-red-50 border-red-200';
    case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    default: return 'text-green-600 bg-green-50 border-green-200';
  }
};

export default function TransfusionMonitoringChartView({
  chart,
  onAddEntry,
  onCompleteChart,
  onClose,
}: TransfusionMonitoringChartViewProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Entry form state
  const [entryTime, setEntryTime] = useState('');
  const [entryTemp, setEntryTemp] = useState<number | ''>('');
  const [entryPulse, setEntryPulse] = useState<number | ''>('');
  const [entrySystolic, setEntrySystolic] = useState<number | ''>('');
  const [entryDiastolic, setEntryDiastolic] = useState<number | ''>('');
  const [entryRR, setEntryRR] = useState<number | ''>('');
  const [entrySpo2, setEntrySpo2] = useState<number | ''>('');
  const [entryVolume, setEntryVolume] = useState<number | ''>('');
  const [entrySymptoms, setEntrySymptoms] = useState('');
  const [entryInitials, setEntryInitials] = useState('');
  
  // Complete form state
  const [outcome, setOutcome] = useState<'completed_uneventful' | 'completed_with_reaction' | 'stopped_due_to_reaction'>('completed_uneventful');
  const [complications, setComplications] = useState('');
  
  // Prepare chart data for Recharts
  const chartData = useMemo(() => {
    if (!chart.entries || chart.entries.length === 0) return [];
    
    return chart.entries.map((entry, index) => {
      const systolic = entry.bp ? parseInt(entry.bp.split('/')[0]) : undefined;
      const diastolic = entry.bp ? parseInt(entry.bp.split('/')[1]) : undefined;
      
      return {
        time: entry.time,
        index,
        temperature: entry.temperature,
        pulse: entry.pulse,
        systolic,
        diastolic,
        respiratoryRate: entry.respiratoryRate,
        spo2: entry.spo2,
        volumeInfused: entry.volumeInfused,
        symptoms: entry.symptoms,
      };
    });
  }, [chart.entries]);
  
  // Calculate trends
  const calculateTrend = (data: (number | undefined)[]): 'up' | 'down' | 'stable' => {
    const validData = data.filter((d): d is number => d !== undefined);
    if (validData.length < 2) return 'stable';
    const first = validData[0];
    const last = validData[validData.length - 1];
    if (last > first * 1.1) return 'up';
    if (last < first * 0.9) return 'down';
    return 'stable';
  };
  
  const temperatureTrend = calculateTrend(chart.entries?.map(e => e.temperature) || []);
  const pulseTrend = calculateTrend(chart.entries?.map(e => e.pulse) || []);
  
  // Handle adding a new entry
  const handleAddEntry = async () => {
    if (!entryTime) {
      return;
    }
    
    const bp = entrySystolic && entryDiastolic ? `${entrySystolic}/${entryDiastolic}` : undefined;
    
    const entry: TransfusionMonitoringEntry = {
      time: entryTime,
      temperature: entryTemp || undefined,
      pulse: entryPulse || undefined,
      bp,
      respiratoryRate: entryRR || undefined,
      spo2: entrySpo2 || undefined,
      volumeInfused: entryVolume || undefined,
      symptoms: entrySymptoms || undefined,
      nurseInitials: entryInitials || undefined,
    };
    
    await onAddEntry(entry);
    
    // Reset form
    setEntryTime('');
    setEntryTemp('');
    setEntryPulse('');
    setEntrySystolic('');
    setEntryDiastolic('');
    setEntryRR('');
    setEntrySpo2('');
    setEntryVolume('');
    setEntrySymptoms('');
    setEntryInitials('');
    setShowAddModal(false);
  };
  
  // Export chart with graphs as PDF
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('transfusion-chart-export');
      if (!element) {
        throw new Error('Export element not found');
      }
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate dimensions to fit the page
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add title
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text('BLOOD TRANSFUSION MONITORING CHART', pageWidth / 2, 10, { align: 'center' });
      
      // Add image
      let yPos = 15;
      if (imgHeight > pageHeight - 25) {
        // Need multiple pages
        let remainingHeight = canvas.height;
        let sourceY = 0;
        const pageImgHeight = ((pageHeight - 25) / imgWidth) * canvas.width;
        
        while (remainingHeight > 0) {
          const sliceHeight = Math.min(remainingHeight, pageImgHeight);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeight;
          const ctx = sliceCanvas.getContext('2d');
          ctx?.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          
          const sliceImgData = sliceCanvas.toDataURL('image/png');
          const sliceImgHeight = (sliceHeight * imgWidth) / canvas.width;
          
          pdf.addImage(sliceImgData, 'PNG', 10, yPos, imgWidth, sliceImgHeight);
          
          remainingHeight -= sliceHeight;
          sourceY += sliceHeight;
          
          if (remainingHeight > 0) {
            pdf.addPage();
            yPos = 10;
          }
        }
      } else {
        pdf.addImage(imgData, 'PNG', 10, yPos, imgWidth, imgHeight);
      }
      
      // Add footer to all pages
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          `AstroHEALTH EMR | Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }
      
      pdf.save(`Transfusion_Chart_${chart.chartId}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Get latest vitals for summary
  const latestEntry = chart.entries && chart.entries.length > 0 
    ? chart.entries[chart.entries.length - 1] 
    : null;
  
  // Calculate total volume
  const totalVolume = chart.entries?.reduce((sum, e) => sum + (e.volumeInfused || 0), 0) || 0;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-red-50 to-orange-50">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Droplets className="text-red-600" />
              Transfusion Monitoring - {chart.chartId}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {chart.patientName} | {chart.hospitalNumber} | {chart.productType}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isExporting || !chart.entries || chart.entries.length === 0}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={18} />
                  Export PDF
                </>
              )}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg" title="Close chart">
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" id="transfusion-chart-export">
          {/* Chart Info */}
          <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Patient</p>
              <p className="font-medium">{chart.patientName}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Hospital No</p>
              <p className="font-medium">{chart.hospitalNumber}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Product</p>
              <p className="font-medium">{chart.productType}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Unit No</p>
              <p className="font-medium">{chart.unitNumber}</p>
            </div>
          </div>
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6 sm:grid-cols-5">
            <div className={`p-3 rounded-lg border ${latestEntry?.temperature ? getStatusColor(getVitalStatus('temperature', latestEntry.temperature)) : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Thermometer size={16} />
                <span className="text-xs font-medium">Temperature</span>
                {temperatureTrend === 'up' && <TrendingUp size={14} className="text-red-500" />}
                {temperatureTrend === 'down' && <TrendingDown size={14} className="text-blue-500" />}
              </div>
              <p className="text-lg font-bold">{latestEntry?.temperature || '-'}°C</p>
            </div>
            <div className={`p-3 rounded-lg border ${latestEntry?.pulse ? getStatusColor(getVitalStatus('pulse', latestEntry.pulse)) : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Heart size={16} />
                <span className="text-xs font-medium">Pulse</span>
                {pulseTrend === 'up' && <TrendingUp size={14} className="text-red-500" />}
                {pulseTrend === 'down' && <TrendingDown size={14} className="text-blue-500" />}
              </div>
              <p className="text-lg font-bold">{latestEntry?.pulse || '-'}/min</p>
            </div>
            <div className={`p-3 rounded-lg border ${latestEntry?.bp ? getStatusColor(getVitalStatus('systolic', parseInt(latestEntry.bp.split('/')[0]))) : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Activity size={16} />
                <span className="text-xs font-medium">Blood Pressure</span>
              </div>
              <p className="text-lg font-bold">{latestEntry?.bp || '-'} mmHg</p>
            </div>
            <div className={`p-3 rounded-lg border ${latestEntry?.spo2 ? getStatusColor(getVitalStatus('spo2', latestEntry.spo2)) : 'bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-1">
                <Wind size={16} />
                <span className="text-xs font-medium">SpO2</span>
              </div>
              <p className="text-lg font-bold">{latestEntry?.spo2 || '-'}%</p>
            </div>
            <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Droplets size={16} className="text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Total Volume</span>
              </div>
              <p className="text-lg font-bold text-blue-700">{totalVolume} mL</p>
            </div>
          </div>
          
          {/* Vital Signs Graphs */}
          {chartData.length > 0 && (
            <div className="space-y-6 mb-6">
              {/* Temperature & Pulse */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Thermometer className="text-orange-500" size={18} />
                  Temperature & Pulse Trends
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis 
                      yAxisId="temp" 
                      orientation="left" 
                      domain={[35, 40]} 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="pulse" 
                      orientation="right" 
                      domain={[40, 150]} 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Pulse (/min)', angle: 90, position: 'insideRight', fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine yAxisId="temp" y={37} stroke="#ef4444" strokeDasharray="3 3" label="Normal" />
                    <Line 
                      yAxisId="temp"
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Temperature (°C)"
                    />
                    <Line 
                      yAxisId="pulse"
                      type="monotone" 
                      dataKey="pulse" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Pulse (/min)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              {/* Blood Pressure */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Activity className="text-blue-500" size={18} />
                  Blood Pressure Trends
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis domain={[40, 200]} tick={{ fontSize: 12 }} label={{ value: 'mmHg', angle: -90, position: 'insideLeft', fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={120} stroke="#22c55e" strokeDasharray="3 3" />
                    <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" />
                    <Area type="monotone" dataKey="systolic" fill="#3b82f6" fillOpacity={0.2} stroke="#3b82f6" name="Systolic" />
                    <Area type="monotone" dataKey="diastolic" fill="#06b6d4" fillOpacity={0.2} stroke="#06b6d4" name="Diastolic" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              {/* SpO2 & Respiratory Rate */}
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium mb-4 flex items-center gap-2">
                  <Wind className="text-cyan-500" size={18} />
                  Oxygenation Trends
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis 
                      yAxisId="spo2" 
                      orientation="left" 
                      domain={[85, 100]} 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'SpO2 (%)', angle: -90, position: 'insideLeft', fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="rr" 
                      orientation="right" 
                      domain={[8, 35]} 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'RR (/min)', angle: 90, position: 'insideRight', fontSize: 12 }}
                    />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine yAxisId="spo2" y={95} stroke="#22c55e" strokeDasharray="3 3" />
                    <Line 
                      yAxisId="spo2"
                      type="monotone" 
                      dataKey="spo2" 
                      stroke="#06b6d4" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="SpO2 (%)"
                    />
                    <Line 
                      yAxisId="rr"
                      type="monotone" 
                      dataKey="respiratoryRate" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Resp. Rate (/min)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          
          {/* Monitoring Records Table */}
          <div className="bg-white border rounded-lg overflow-hidden mb-6">
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
              <h4 className="font-medium">Monitoring Records</h4>
              {chart.status !== 'completed' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm flex items-center gap-1 hover:bg-green-700"
                >
                  <Plus size={16} />
                  Add Record
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Time</th>
                    <th className="px-3 py-2 text-center font-medium">Temp (°C)</th>
                    <th className="px-3 py-2 text-center font-medium">Pulse</th>
                    <th className="px-3 py-2 text-center font-medium">BP</th>
                    <th className="px-3 py-2 text-center font-medium">RR</th>
                    <th className="px-3 py-2 text-center font-medium">SpO2</th>
                    <th className="px-3 py-2 text-center font-medium">Vol (mL)</th>
                    <th className="px-3 py-2 text-left font-medium">Symptoms/Notes</th>
                    <th className="px-3 py-2 text-center font-medium">Initials</th>
                  </tr>
                </thead>
                <tbody>
                  {(!chart.entries || chart.entries.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-8 text-center text-gray-500">
                        <Clock className="mx-auto mb-2 text-gray-300" size={32} />
                        <p>No monitoring records yet</p>
                        <p className="text-xs mt-1">Click "Add Record" to start monitoring</p>
                      </td>
                    </tr>
                  ) : (
                    chart.entries.map((entry, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 font-medium">{entry.time}</td>
                        <td className={`px-3 py-2 text-center ${entry.temperature ? getStatusColor(getVitalStatus('temperature', entry.temperature)).split(' ')[0] : ''}`}>
                          {entry.temperature || '-'}
                        </td>
                        <td className={`px-3 py-2 text-center ${entry.pulse ? getStatusColor(getVitalStatus('pulse', entry.pulse)).split(' ')[0] : ''}`}>
                          {entry.pulse || '-'}
                        </td>
                        <td className="px-3 py-2 text-center">{entry.bp || '-'}</td>
                        <td className="px-3 py-2 text-center">{entry.respiratoryRate || '-'}</td>
                        <td className={`px-3 py-2 text-center ${entry.spo2 ? getStatusColor(getVitalStatus('spo2', entry.spo2)).split(' ')[0] : ''}`}>
                          {entry.spo2 || '-'}
                        </td>
                        <td className="px-3 py-2 text-center">{entry.volumeInfused || '-'}</td>
                        <td className="px-3 py-2">
                          {entry.symptoms ? (
                            <span className={entry.symptoms.toLowerCase().includes('none') || entry.symptoms.toLowerCase().includes('nil') 
                              ? 'text-green-600' 
                              : 'text-orange-600 font-medium'
                            }>
                              {entry.symptoms}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">{entry.nurseInitials || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Outcome Section */}
          {chart.status === 'completed' && chart.outcome && (
            <div className={`p-4 rounded-lg border ${
              chart.outcome === 'completed_uneventful' ? 'bg-green-50 border-green-200' :
              chart.outcome === 'completed_with_reaction' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <h4 className="font-medium flex items-center gap-2 mb-2">
                {chart.outcome === 'completed_uneventful' ? (
                  <CheckCircle2 className="text-green-600" size={20} />
                ) : (
                  <AlertTriangle className={chart.outcome === 'stopped_due_to_reaction' ? 'text-red-600' : 'text-yellow-600'} size={20} />
                )}
                Transfusion Outcome
              </h4>
              <p className="font-medium">
                {chart.outcome === 'completed_uneventful' ? 'Completed Uneventful' :
                 chart.outcome === 'completed_with_reaction' ? 'Completed with Reaction' :
                 'Stopped due to Reaction'}
              </p>
              {chart.complications && (
                <p className="text-sm mt-1">Complications: {chart.complications}</p>
              )}
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        {chart.status !== 'completed' && (
          <div className="flex justify-between gap-2 p-4 border-t bg-gray-50">
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={!chart.entries || chart.entries.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 size={18} />
              Complete Transfusion
            </button>
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              Close
            </button>
          </div>
        )}
      </motion.div>
      
      {/* Add Entry Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Plus className="text-green-600" />
                  Add Monitoring Record
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Time Selection */}
                <div>
                  <label className="block text-sm font-medium mb-1">Time Point *</label>
                  <select
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    title="Select time point"
                  >
                    <option value="">Select time point</option>
                    {MONITORING_TIME_POINTS.map(tp => (
                      <option key={tp.value} value={tp.label}>
                        {tp.label} - {tp.description}
                      </option>
                    ))}
                    <option value={format(new Date(), 'HH:mm')}>Current Time ({format(new Date(), 'HH:mm')})</option>
                  </select>
                </div>
                
                {/* Vital Signs Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={entryTemp}
                      onChange={(e) => setEntryTemp(e.target.value ? Number(e.target.value) : '')}
                      placeholder="36.5"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Pulse (/min)</label>
                    <input
                      type="number"
                      value={entryPulse}
                      onChange={(e) => setEntryPulse(e.target.value ? Number(e.target.value) : '')}
                      placeholder="80"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Systolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={entrySystolic}
                      onChange={(e) => setEntrySystolic(e.target.value ? Number(e.target.value) : '')}
                      placeholder="120"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Diastolic BP (mmHg)</label>
                    <input
                      type="number"
                      value={entryDiastolic}
                      onChange={(e) => setEntryDiastolic(e.target.value ? Number(e.target.value) : '')}
                      placeholder="80"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Resp. Rate (/min)</label>
                    <input
                      type="number"
                      value={entryRR}
                      onChange={(e) => setEntryRR(e.target.value ? Number(e.target.value) : '')}
                      placeholder="16"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">SpO2 (%)</label>
                    <input
                      type="number"
                      value={entrySpo2}
                      onChange={(e) => setEntrySpo2(e.target.value ? Number(e.target.value) : '')}
                      placeholder="98"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Volume Infused (mL)</label>
                  <input
                    type="number"
                    value={entryVolume}
                    onChange={(e) => setEntryVolume(e.target.value ? Number(e.target.value) : '')}
                    placeholder="100"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Symptoms/Notes</label>
                  <textarea
                    value={entrySymptoms}
                    onChange={(e) => setEntrySymptoms(e.target.value)}
                    placeholder="None / Describe any symptoms..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nurse Initials</label>
                  <input
                    type="text"
                    value={entryInitials}
                    onChange={(e) => setEntryInitials(e.target.value)}
                    placeholder="AB"
                    maxLength={5}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  disabled={!entryTime}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Add Record
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Complete Transfusion Modal */}
      <AnimatePresence>
        {showCompleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4"
            onClick={(e) => e.target === e.currentTarget && setShowCompleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="text-green-600" />
                  Complete Transfusion
                </h3>
                <button onClick={() => setShowCompleteModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" title="Close">
                  <X size={18} />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Outcome *</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="outcome"
                        value="completed_uneventful"
                        checked={outcome === 'completed_uneventful'}
                        onChange={(e) => setOutcome(e.target.value as typeof outcome)}
                      />
                      <CheckCircle2 className="text-green-600" size={20} />
                      <span>Completed Uneventful</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="outcome"
                        value="completed_with_reaction"
                        checked={outcome === 'completed_with_reaction'}
                        onChange={(e) => setOutcome(e.target.value as typeof outcome)}
                      />
                      <AlertTriangle className="text-yellow-600" size={20} />
                      <span>Completed with Reaction</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="outcome"
                        value="stopped_due_to_reaction"
                        checked={outcome === 'stopped_due_to_reaction'}
                        onChange={(e) => setOutcome(e.target.value as typeof outcome)}
                      />
                      <AlertTriangle className="text-red-600" size={20} />
                      <span>Stopped due to Reaction</span>
                    </label>
                  </div>
                </div>
                
                {outcome !== 'completed_uneventful' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Complications</label>
                    <textarea
                      value={complications}
                      onChange={(e) => setComplications(e.target.value)}
                      placeholder="Describe any complications or reactions..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    />
                  </div>
                )}
                
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Total Volume:</strong> {totalVolume} mL
                  </p>
                  <p className="text-sm text-blue-800">
                    <strong>Records:</strong> {chart.entries?.length || 0} monitoring entries
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await onCompleteChart(outcome, outcome !== 'completed_uneventful' ? complications : undefined);
                    setShowCompleteModal(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Complete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
