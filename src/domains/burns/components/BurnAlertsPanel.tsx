// Burn Alerts Panel Component
// Clinical alerts and escalation per WHO/ISBI guidelines

import { useState } from 'react';
import { 
  AlertTriangle, 
  Bell, 
  AlertCircle,
  CheckCircle,
  Clock,
  Phone,
  ArrowUp,
  XCircle,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import type { BurnAlert, AlertPriority } from '../types';

interface AlertsPanelProps {
  alerts: BurnAlert[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string, resolution: string) => void;
  onEscalate: (alertId: string, escalatedTo: string) => void;
}

const PRIORITY_CONFIG: Record<AlertPriority, {
  icon: React.ElementType;
  bg: string;
  border: string;
  text: string;
  badge: string;
}> = {
  critical: {
    icon: AlertCircle,
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    badge: 'bg-red-600 text-white',
  },
  high: {
    icon: AlertTriangle,
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-800',
    badge: 'bg-orange-500 text-white',
  },
  medium: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-800',
    badge: 'bg-yellow-500 text-white',
  },
  low: {
    icon: Bell,
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-800',
    badge: 'bg-blue-500 text-white',
  },
};

// Suggested actions per alert type
const SUGGESTED_ACTIONS: Record<string, string[]> = {
  low_urine_output: [
    'Increase crystalloid infusion by 25%',
    'Check Foley catheter patency',
    'Reassess in 1 hour',
    'Consider fluid challenge if MAP adequate',
    'Monitor for myoglobinuria (dark urine)',
  ],
  hypotension: [
    'Fluid bolus 500-1000mL crystalloid',
    'Elevate legs',
    'Exclude hemorrhage or sepsis',
    'Consider vasopressor if fluid-refractory',
    'Check lactate level',
  ],
  hypoxia: [
    'Increase FiO2 / oxygen flow',
    'Check airway patency',
    'Assess for inhalation injury',
    'Consider early intubation if airway at risk',
    'Obtain ABG',
    'CXR to exclude pneumothorax/ARDS',
  ],
  tachycardia: [
    'Assess volume status',
    'Check pain control',
    'Evaluate for infection/sepsis',
    'ECG if persistent or irregular',
    'Review medications',
  ],
  fever: [
    'Obtain blood, urine, wound cultures',
    'Review wound for signs of infection',
    'Consider empiric antibiotics if septic',
    'Active cooling measures',
    'CBC, CRP, Procalcitonin',
  ],
  hypothermia: [
    'Active warming: warm blankets, heated IV fluids',
    'Increase ambient temperature',
    'Cover exposed burn areas',
    'Monitor core temperature',
  ],
  hyperkalemia: [
    'Stop all potassium infusions',
    'ECG for cardiac effects',
    'Calcium gluconate if ECG changes',
    'Insulin/glucose, salbutamol nebulizer',
    'Consider dialysis if refractory',
  ],
  elevated_lactate: [
    'Assess tissue perfusion',
    'Optimize fluid resuscitation',
    'Check hemoglobin',
    'Evaluate for occult bleeding',
    'Serial lactate monitoring',
  ],
  elevated_creatinine: [
    'Review fluid balance',
    'Check urine output trend',
    'Avoid nephrotoxic medications',
    'Consider myoglobinuria workup',
    'Nephrology consultation if worsening',
  ],
  low_platelet: [
    'Review for sepsis/DIC',
    'Hold anticoagulants',
    'PT/PTT, fibrinogen, D-dimer',
    'Transfuse if <50k with bleeding',
  ],
  inhalation_injury: [
    'Early intubation if airway compromise',
    'Serial bronchoscopy',
    'Aggressive pulmonary toilet',
    'Elevate head of bed',
    'Monitor for ARDS development',
  ],
};

export default function BurnAlertsPanel({
  alerts,
  onAcknowledge,
  onResolve,
  onEscalate,
}: AlertsPanelProps) {
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [escalationTarget, setEscalationTarget] = useState('');
  const [showEscalateModal, setShowEscalateModal] = useState(false);

  // Group alerts by status
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const acknowledgedAlerts = alerts.filter(a => a.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved').slice(0, 10);

  // Sort by priority
  const sortedActive = [...activeAlerts].sort((a, b) => {
    const order: Record<AlertPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  const handleResolve = (alertId: string) => {
    onResolve(alertId, resolutionNote);
    setResolutionNote('');
    setSelectedAlert(null);
  };

  const handleEscalate = () => {
    if (selectedAlert && escalationTarget) {
      onEscalate(selectedAlert, escalationTarget);
      setShowEscalateModal(false);
      setEscalationTarget('');
      setSelectedAlert(null);
    }
  };

  const AlertCard = ({ alert }: { alert: BurnAlert }) => {
    const config = PRIORITY_CONFIG[alert.priority];
    const Icon = config.icon;
    const isSelected = selectedAlert === alert.id;
    const suggestedActions = SUGGESTED_ACTIONS[alert.type] || alert.suggestedActions || [];

    return (
      <div 
        className={`p-4 rounded-lg border-2 ${config.bg} ${config.border} ${
          isSelected ? 'ring-2 ring-offset-2 ring-blue-500' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-full ${config.badge}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${config.text}`}>{alert.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${config.badge}`}>
                  {alert.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(alert.timestamp), 'HH:mm')}
                </span>
                {alert.acknowledgedAt && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-3 w-3" />
                    Ack: {format(new Date(alert.acknowledgedAt), 'HH:mm')}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          {alert.status === 'active' && (
            <div className="flex gap-2">
              <button
                onClick={() => onAcknowledge(alert.id!)}
                className="p-2 bg-white rounded-lg hover:bg-gray-100 border"
                title="Acknowledge"
              >
                <CheckCircle className="h-4 w-4 text-green-600" />
              </button>
              <button
                onClick={() => {
                  setSelectedAlert(alert.id!);
                  setShowEscalateModal(true);
                }}
                className="p-2 bg-white rounded-lg hover:bg-gray-100 border"
                title="Escalate"
              >
                <ArrowUp className="h-4 w-4 text-orange-600" />
              </button>
            </div>
          )}
        </div>

        {/* Suggested Actions */}
        {alert.status !== 'resolved' && suggestedActions.length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Suggested Actions:</p>
            <ul className="space-y-1">
              {suggestedActions.map((action, idx) => (
                <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                  <span className="text-gray-400">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Resolve form */}
        {alert.status === 'acknowledged' && (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={selectedAlert === alert.id ? resolutionNote : ''}
                onChange={e => {
                  setSelectedAlert(alert.id!);
                  setResolutionNote(e.target.value);
                }}
                placeholder="Resolution note..."
                className="flex-1 px-3 py-1.5 border rounded text-sm"
              />
              <button
                onClick={() => handleResolve(alert.id!)}
                className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                Resolve
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with counts */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <Bell className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Clinical Alerts</h3>
            <p className="text-sm text-gray-500">Real-time monitoring alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-red-600 text-white rounded-full text-xs font-bold">
              {sortedActive.filter(a => a.priority === 'critical').length}
            </span>
            <span className="text-xs text-gray-600">Critical</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-orange-500 text-white rounded-full text-xs font-bold">
              {sortedActive.filter(a => a.priority === 'high').length}
            </span>
            <span className="text-xs text-gray-600">High</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-xs font-bold">
              {acknowledgedAlerts.length}
            </span>
            <span className="text-xs text-gray-600">Acknowledged</span>
          </div>
        </div>
      </div>

      {/* Active Alerts */}
      {sortedActive.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-500" />
            Active Alerts ({sortedActive.length})
          </h4>
          {sortedActive.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
          <p className="text-green-700 font-medium">No Active Alerts</p>
          <p className="text-sm text-green-600">All parameters within normal limits</p>
        </div>
      )}

      {/* Acknowledged Alerts */}
      {acknowledgedAlerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-yellow-500" />
            Acknowledged ({acknowledgedAlerts.length})
          </h4>
          {acknowledgedAlerts.map(alert => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      )}

      {/* Recently Resolved */}
      {resolvedAlerts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <XCircle className="h-4 w-4 text-gray-400" />
            Recently Resolved
          </h4>
          <div className="space-y-2">
            {resolvedAlerts.map(alert => (
              <div key={alert.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{alert.title}</span>
                  <span className="text-xs text-gray-400">
                    {format(new Date(alert.resolvedAt!), 'HH:mm')}
                  </span>
                </div>
                {alert.resolution && (
                  <p className="text-xs text-gray-500 mt-1">
                    Resolution: {alert.resolution}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Escalation Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="border-b px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold">Escalate Alert</h3>
              </div>
              <button onClick={() => setShowEscalateModal(false)} className="text-2xl hover:text-gray-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Select who to escalate this alert to:
              </p>
              <div className="space-y-2">
                {[
                  'Burn Surgeon On-Call',
                  'ICU Team',
                  'Anaesthesia',
                  'Nephrology',
                  'Respiratory',
                  'Senior House Officer',
                  'Consultant',
                ].map(target => (
                  <button
                    key={target}
                    onClick={() => setEscalationTarget(target)}
                    className={`w-full p-3 border rounded-lg text-left ${
                      escalationTarget === target 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {target}
                  </button>
                ))}
              </div>
              <button
                onClick={handleEscalate}
                disabled={!escalationTarget}
                className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Escalate to {escalationTarget || '...'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
