// Burn Vital Signs Monitor Component
// Real-time monitoring with alerts per WHO/ISBI guidelines

import { useState, useMemo } from 'react';
import { 
  Activity, 
  Heart, 
  Thermometer, 
  Wind,
  Droplets,
  AlertTriangle,
  Plus,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
import type { BurnVitalSigns, UrineOutput, BurnAlert } from '../types';
import { calculateMAP, calculateGCS, checkVitalsForAlerts } from '../services/burnScoringService';

interface VitalsMonitorProps {
  burnAssessmentId: string;
  patientWeight: number;
  vitalsHistory: BurnVitalSigns[];
  urineOutputs: UrineOutput[];
  onAddVitals: (vitals: Partial<BurnVitalSigns>) => void;
  onAddUrineOutput: (uo: Partial<UrineOutput>) => void;
  onAlertGenerated: (alerts: BurnAlert[]) => void;
}

export default function VitalsMonitor({
  burnAssessmentId,
  patientWeight,
  vitalsHistory,
  urineOutputs,
  onAddVitals,
  onAddUrineOutput,
  onAlertGenerated,
}: VitalsMonitorProps) {
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showUOForm, setShowUOForm] = useState(false);
  
  // Form states
  const [vitalsForm, setVitalsForm] = useState({
    heartRate: '',
    systolicBP: '',
    diastolicBP: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    temperature: '',
    painScore: '',
    gcsEye: '4',
    gcsVerbal: '5',
    gcsMotor: '6',
    notes: '',
  });
  
  const [uoForm, setUOForm] = useState({
    volumeML: '',
    color: 'yellow' as const,
  });

  // Get latest vitals
  const latestVitals = vitalsHistory[vitalsHistory.length - 1];
  const previousVitals = vitalsHistory[vitalsHistory.length - 2];

  // Get latest UO
  const latestUO = urineOutputs[urineOutputs.length - 1];

  // Calculate trends
  const getTrend = (current?: number, previous?: number) => {
    if (!current || !previous) return 'stable';
    const diff = ((current - previous) / previous) * 100;
    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
  };

  // Average UO for last 2 hours
  const avgUOPerKg = useMemo(() => {
    const recent = urineOutputs.slice(-2);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, uo) => sum + uo.ratePerKg, 0) / recent.length;
  }, [urineOutputs]);

  // Handle vitals submission
  const handleVitalsSubmit = () => {
    const map = calculateMAP(
      parseInt(vitalsForm.systolicBP) || 0,
      parseInt(vitalsForm.diastolicBP) || 0
    );
    const gcs = calculateGCS(
      parseInt(vitalsForm.gcsEye),
      parseInt(vitalsForm.gcsVerbal),
      parseInt(vitalsForm.gcsMotor)
    );

    const newVitals: Partial<BurnVitalSigns> = {
      burnAssessmentId,
      timestamp: new Date(),
      heartRate: parseInt(vitalsForm.heartRate) || 0,
      systolicBP: parseInt(vitalsForm.systolicBP) || 0,
      diastolicBP: parseInt(vitalsForm.diastolicBP) || 0,
      meanArterialPressure: map,
      respiratoryRate: parseInt(vitalsForm.respiratoryRate) || 0,
      oxygenSaturation: parseInt(vitalsForm.oxygenSaturation) || 0,
      temperature: parseFloat(vitalsForm.temperature) || 0,
      painScore: parseInt(vitalsForm.painScore) || 0,
      gcsEye: parseInt(vitalsForm.gcsEye),
      gcsVerbal: parseInt(vitalsForm.gcsVerbal),
      gcsMotor: parseInt(vitalsForm.gcsMotor),
      gcsTotal: gcs,
      notes: vitalsForm.notes,
    };

    // Check for alerts
    const alerts = checkVitalsForAlerts(
      newVitals as BurnVitalSigns,
      patientWeight,
      urineOutputs
    );
    if (alerts.length > 0) {
      onAlertGenerated(alerts);
    }

    onAddVitals(newVitals);
    setShowVitalsForm(false);
    setVitalsForm({
      heartRate: '',
      systolicBP: '',
      diastolicBP: '',
      respiratoryRate: '',
      oxygenSaturation: '',
      temperature: '',
      painScore: '',
      gcsEye: '4',
      gcsVerbal: '5',
      gcsMotor: '6',
      notes: '',
    });
  };

  // Handle UO submission
  const handleUOSubmit = () => {
    const volumeML = parseInt(uoForm.volumeML) || 0;
    const ratePerKg = volumeML / patientWeight;

    const newUO: Partial<UrineOutput> = {
      burnAssessmentId,
      timestamp: new Date(),
      volumeML,
      hourlyRate: volumeML, // Assuming 1 hour measurement
      ratePerKg: Math.round(ratePerKg * 100) / 100,
      color: uoForm.color,
    };

    onAddUrineOutput(newUO);
    setShowUOForm(false);
    setUOForm({ volumeML: '', color: 'yellow' });
  };

  // Vital card component
  const VitalCard = ({
    icon: Icon,
    label,
    value,
    unit,
    trend,
    status,
    alert,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    unit: string;
    trend?: 'up' | 'down' | 'stable';
    status?: 'normal' | 'warning' | 'critical';
    alert?: string;
  }) => {
    const statusColors = {
      normal: 'bg-green-50 border-green-200',
      warning: 'bg-yellow-50 border-yellow-200',
      critical: 'bg-red-50 border-red-200',
    };
    
    return (
      <div className={`p-4 rounded-lg border ${statusColors[status || 'normal']}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${
              status === 'critical' ? 'text-red-600' :
              status === 'warning' ? 'text-yellow-600' : 'text-gray-500'
            }`} />
            <span className="text-sm text-gray-600">{label}</span>
          </div>
          {trend && trend !== 'stable' && (
            trend === 'up' 
              ? <TrendingUp className="h-4 w-4 text-orange-500" />
              : <TrendingDown className="h-4 w-4 text-blue-500" />
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-2xl font-bold ${
            status === 'critical' ? 'text-red-700' :
            status === 'warning' ? 'text-yellow-700' : 'text-gray-900'
          }`}>
            {value || '--'}
          </span>
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
        {alert && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {alert}
          </p>
        )}
      </div>
    );
  };

  // Get vital status
  const getVitalStatus = (type: string, value?: number): 'normal' | 'warning' | 'critical' => {
    if (!value) return 'normal';
    
    switch (type) {
      case 'hr':
        if (value > 130 || value < 50) return 'critical';
        if (value > 120 || value < 60) return 'warning';
        return 'normal';
      case 'map':
        if (value < 60) return 'critical';
        if (value < 65) return 'warning';
        return 'normal';
      case 'spo2':
        if (value < 88) return 'critical';
        if (value < 92) return 'warning';
        return 'normal';
      case 'temp':
        if (value > 39 || value < 35) return 'critical';
        if (value > 38 || value < 36) return 'warning';
        return 'normal';
      case 'rr':
        if (value > 30 || value < 8) return 'critical';
        if (value > 25 || value < 12) return 'warning';
        return 'normal';
      case 'uo':
        if (value < 0.3) return 'critical';
        if (value < 0.5) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-red-500" />
          <div>
            <h3 className="font-semibold text-gray-900">Vital Signs Monitor</h3>
            <p className="text-sm text-gray-500">
              {latestVitals 
                ? `Last updated: ${format(new Date(latestVitals.timestamp), 'HH:mm')}`
                : 'No vitals recorded'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowUOForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
          >
            <Droplets className="h-4 w-4" />
            Record UO
          </button>
          <button
            onClick={() => setShowVitalsForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <Plus className="h-4 w-4" />
            Record Vitals
          </button>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <VitalCard
          icon={Heart}
          label="Heart Rate"
          value={latestVitals?.heartRate || '--'}
          unit="bpm"
          trend={getTrend(latestVitals?.heartRate, previousVitals?.heartRate)}
          status={getVitalStatus('hr', latestVitals?.heartRate)}
          alert={latestVitals?.heartRate && latestVitals.heartRate > 120 ? 'Tachycardia' : undefined}
        />
        
        <VitalCard
          icon={Activity}
          label="BP / MAP"
          value={latestVitals 
            ? `${latestVitals.systolicBP}/${latestVitals.diastolicBP}` 
            : '--'}
          unit={`MAP ${latestVitals?.meanArterialPressure || '--'}`}
          status={getVitalStatus('map', latestVitals?.meanArterialPressure)}
          alert={latestVitals?.meanArterialPressure && latestVitals.meanArterialPressure < 65 
            ? 'Hypotension' : undefined}
        />
        
        <VitalCard
          icon={Wind}
          label="SpO₂"
          value={latestVitals?.oxygenSaturation || '--'}
          unit="%"
          status={getVitalStatus('spo2', latestVitals?.oxygenSaturation)}
          alert={latestVitals?.oxygenSaturation && latestVitals.oxygenSaturation < 90 
            ? 'Hypoxia!' : undefined}
        />
        
        <VitalCard
          icon={Wind}
          label="Resp Rate"
          value={latestVitals?.respiratoryRate || '--'}
          unit="/min"
          status={getVitalStatus('rr', latestVitals?.respiratoryRate)}
        />
        
        <VitalCard
          icon={Thermometer}
          label="Temperature"
          value={latestVitals?.temperature?.toFixed(1) || '--'}
          unit="°C"
          status={getVitalStatus('temp', latestVitals?.temperature)}
          alert={
            latestVitals?.temperature && latestVitals.temperature > 38 
              ? 'Fever - check for infection' 
              : latestVitals?.temperature && latestVitals.temperature < 36 
                ? 'Hypothermia' 
                : undefined
          }
        />
        
        <VitalCard
          icon={Droplets}
          label="UO (avg 2hr)"
          value={avgUOPerKg.toFixed(2)}
          unit="mL/kg/hr"
          status={getVitalStatus('uo', avgUOPerKg)}
          alert={avgUOPerKg > 0 && avgUOPerKg < 0.5 
            ? 'Low output - increase fluids' : undefined}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">GCS</span>
          <p className="text-xl font-bold text-gray-900">
            {latestVitals?.gcsTotal || '--'}/15
          </p>
          <p className="text-xs text-gray-500">
            E{latestVitals?.gcsEye || '-'} V{latestVitals?.gcsVerbal || '-'} M{latestVitals?.gcsMotor || '-'}
          </p>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Pain Score</span>
          <p className="text-xl font-bold text-gray-900">
            {latestVitals?.painScore || '--'}/10
          </p>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Last UO</span>
          <p className="text-xl font-bold text-gray-900">
            {latestUO?.volumeML || '--'} mL
          </p>
          <p className="text-xs text-gray-500">
            {latestUO ? format(new Date(latestUO.timestamp), 'HH:mm') : '--'}
          </p>
        </div>
        
        <div className="p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">Total UO (24h)</span>
          <p className="text-xl font-bold text-gray-900">
            {urineOutputs.reduce((sum, uo) => sum + uo.volumeML, 0)} mL
          </p>
        </div>
      </div>

      {/* Vitals Form Modal */}
      {showVitalsForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Record Vital Signs</h3>
              <button onClick={() => setShowVitalsForm(false)} className="text-2xl hover:text-gray-600" title="Close vital signs form">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heart Rate</label>
                  <input
                    type="number"
                    value={vitalsForm.heartRate}
                    onChange={e => setVitalsForm(prev => ({ ...prev, heartRate: e.target.value }))}
                    placeholder="bpm"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Systolic BP</label>
                  <input
                    type="number"
                    value={vitalsForm.systolicBP}
                    onChange={e => setVitalsForm(prev => ({ ...prev, systolicBP: e.target.value }))}
                    placeholder="mmHg"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diastolic BP</label>
                  <input
                    type="number"
                    value={vitalsForm.diastolicBP}
                    onChange={e => setVitalsForm(prev => ({ ...prev, diastolicBP: e.target.value }))}
                    placeholder="mmHg"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resp Rate</label>
                  <input
                    type="number"
                    value={vitalsForm.respiratoryRate}
                    onChange={e => setVitalsForm(prev => ({ ...prev, respiratoryRate: e.target.value }))}
                    placeholder="/min"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SpO₂</label>
                  <input
                    type="number"
                    value={vitalsForm.oxygenSaturation}
                    onChange={e => setVitalsForm(prev => ({ ...prev, oxygenSaturation: e.target.value }))}
                    placeholder="%"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    value={vitalsForm.temperature}
                    onChange={e => setVitalsForm(prev => ({ ...prev, temperature: e.target.value }))}
                    placeholder="°C"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pain (0-10)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={vitalsForm.painScore}
                    onChange={e => setVitalsForm(prev => ({ ...prev, painScore: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0-10"
                    title="Pain score"
                  />
                </div>
              </div>
              
              {/* GCS */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Glasgow Coma Scale</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Eye (1-4)</label>
                    <select
                      value={vitalsForm.gcsEye}
                      onChange={e => setVitalsForm(prev => ({ ...prev, gcsEye: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      title="GCS Eye response"
                    >
                      <option value="4">4 - Spontaneous</option>
                      <option value="3">3 - To voice</option>
                      <option value="2">2 - To pain</option>
                      <option value="1">1 - None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Verbal (1-5)</label>
                    <select
                      value={vitalsForm.gcsVerbal}
                      onChange={e => setVitalsForm(prev => ({ ...prev, gcsVerbal: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      title="GCS Verbal response"
                    >
                      <option value="5">5 - Oriented</option>
                      <option value="4">4 - Confused</option>
                      <option value="3">3 - Inappropriate</option>
                      <option value="2">2 - Incomprehensible</option>
                      <option value="1">1 - None</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Motor (1-6)</label>
                    <select
                      value={vitalsForm.gcsMotor}
                      onChange={e => setVitalsForm(prev => ({ ...prev, gcsMotor: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      title="GCS Motor response"
                    >
                      <option value="6">6 - Obeys commands</option>
                      <option value="5">5 - Localizes pain</option>
                      <option value="4">4 - Withdraws</option>
                      <option value="3">3 - Flexion</option>
                      <option value="2">2 - Extension</option>
                      <option value="1">1 - None</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={vitalsForm.notes}
                  onChange={e => setVitalsForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Enter additional notes..."
                />
              </div>
              
              <button
                onClick={handleVitalsSubmit}
                className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save Vitals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UO Form Modal */}
      {showUOForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Record Urine Output</h3>
              <button onClick={() => setShowUOForm(false)} className="text-2xl hover:text-gray-600" title="Close urine output form">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volume (mL)</label>
                <input
                  type="number"
                  value={uoForm.volumeML}
                  onChange={e => setUOForm(prev => ({ ...prev, volumeML: e.target.value }))}
                  placeholder="Hourly output in mL"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {uoForm.volumeML && (
                  <p className="text-sm text-gray-500 mt-1">
                    = {(parseInt(uoForm.volumeML) / patientWeight).toFixed(2)} mL/kg/hr
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <select
                  value={uoForm.color}
                  onChange={e => setUOForm(prev => ({ ...prev, color: e.target.value as any }))}
                  className="w-full px-3 py-2 border rounded-lg"
                  title="Urine color"
                >
                  <option value="clear">Clear</option>
                  <option value="yellow">Yellow (Normal)</option>
                  <option value="dark_yellow">Dark Yellow</option>
                  <option value="amber">Amber</option>
                  <option value="cola">Cola/Dark (Myoglobinuria?)</option>
                  <option value="bloody">Bloody</option>
                </select>
              </div>
              <button
                onClick={handleUOSubmit}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save UO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
