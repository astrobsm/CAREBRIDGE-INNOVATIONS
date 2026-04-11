// ============================================================
// LYMPHEDEMA MONITORING COMPONENT
// Tracks measurements, compliance, and alerts over time
// ============================================================

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Bell,
  Activity,
  Ruler,
  CheckCircle2,
} from 'lucide-react';
import type { LymphedemaMonitoringRecord, LymphedemaAlert, LimbMeasurement } from '../types';

interface MonitoringDashboardProps {
  records: LymphedemaMonitoringRecord[];
  alerts: LymphedemaAlert[];
  baselineVolumeMl?: number;
}

const alertSeverityColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700', icon: 'text-red-500' },
  urgent: { bg: 'bg-orange-50', border: 'border-orange-300', text: 'text-orange-700', icon: 'text-orange-500' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-300', text: 'text-yellow-700', icon: 'text-yellow-500' },
  info: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', icon: 'text-blue-500' },
};

export default function MonitoringDashboard({ records, alerts, baselineVolumeMl }: MonitoringDashboardProps) {
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  const latestRecord = records[0];
  const previousRecord = records[1];

  const volumeChange = latestRecord && previousRecord
    ? ((latestRecord.calculatedVolumeMl - previousRecord.calculatedVolumeMl) / previousRecord.calculatedVolumeMl * 100)
    : 0;

  const totalChange = latestRecord && baselineVolumeMl
    ? ((latestRecord.calculatedVolumeMl - baselineVolumeMl) / baselineVolumeMl * 100)
    : 0;

  const visibleAlerts = showAllAlerts ? alerts : alerts.slice(0, 3);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'urgent');

  return (
    <div className="space-y-6">
      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-red-600 animate-bounce" />
            <h4 className="font-bold text-red-700">{criticalAlerts.length} Critical Alert(s)</h4>
          </div>
          {criticalAlerts.map((alert, i) => (
            <div key={i} className="mb-2 last:mb-0">
              <p className="text-sm text-red-700 font-medium">{alert.message}</p>
              <p className="text-xs text-red-600">{alert.actionRequired}</p>
            </div>
          ))}
        </div>
      )}

      {/* Volume Summary Cards */}
      {latestRecord && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <span className="text-xs font-semibold text-gray-500">Current Volume</span>
            <p className="text-2xl font-bold text-gray-800">{latestRecord.calculatedVolumeMl.toLocaleString()} mL</p>
          </div>
          <div className={`p-4 rounded-lg border ${volumeChange < 0 ? 'bg-green-50 border-green-200' : volumeChange > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xs font-semibold text-gray-500">Since Last Visit</span>
            <div className="flex items-center gap-2">
              {volumeChange < 0 ? (
                <TrendingDown className="w-5 h-5 text-green-600" />
              ) : volumeChange > 0 ? (
                <TrendingUp className="w-5 h-5 text-red-600" />
              ) : (
                <Activity className="w-5 h-5 text-gray-600" />
              )}
              <p className={`text-2xl font-bold ${volumeChange < 0 ? 'text-green-600' : volumeChange > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                {volumeChange > 0 ? '+' : ''}{volumeChange.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className={`p-4 rounded-lg border ${totalChange < 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <span className="text-xs font-semibold text-gray-500">From Baseline</span>
            <div className="flex items-center gap-2">
              {totalChange < 0 ? (
                <TrendingDown className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingUp className="w-5 h-5 text-amber-600" />
              )}
              <p className={`text-2xl font-bold ${totalChange < 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Monitoring Alerts ({alerts.length})
          </h4>
          <div className="space-y-2">
            {visibleAlerts.map((alert, i) => {
              const colors = alertSeverityColors[alert.severity] || alertSeverityColors.info;
              return (
                <div key={i} className={`p-3 rounded-lg border ${colors.border} ${colors.bg}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {alert.severity === 'critical' || alert.severity === 'urgent' ? (
                      <AlertTriangle className={`w-4 h-4 ${colors.icon}`} />
                    ) : (
                      <Info className={`w-4 h-4 ${colors.icon}`} />
                    )}
                    <span className={`text-sm font-medium ${colors.text}`}>{alert.message}</span>
                    <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 ml-6">{alert.actionRequired}</p>
                </div>
              );
            })}
            {alerts.length > 3 && (
              <button
                onClick={() => setShowAllAlerts(!showAllAlerts)}
                className="text-sm text-primary hover:underline"
              >
                {showAllAlerts ? 'Show fewer' : `Show all ${alerts.length} alerts`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Measurement Trend */}
      {records.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-primary" />
            Measurement History
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 text-xs font-semibold text-gray-500">Date</th>
                  <th className="text-right p-2 text-xs font-semibold text-gray-500">Volume (mL)</th>
                  <th className="text-right p-2 text-xs font-semibold text-gray-500">Change</th>
                  <th className="text-center p-2 text-xs font-semibold text-gray-500">Pain</th>
                  <th className="text-center p-2 text-xs font-semibold text-gray-500">Pitting</th>
                  <th className="text-center p-2 text-xs font-semibold text-gray-500">Compliance</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 10).map((record, i) => {
                  const prevVol = records[i + 1]?.calculatedVolumeMl;
                  const change = prevVol ? ((record.calculatedVolumeMl - prevVol) / prevVol * 100) : 0;
                  return (
                    <tr key={record.id} className="border-b border-gray-100">
                      <td className="p-2 text-gray-700">{new Date(record.recordDate).toLocaleDateString()}</td>
                      <td className="p-2 text-right text-gray-800 font-medium">{record.calculatedVolumeMl.toLocaleString()}</td>
                      <td className={`p-2 text-right font-medium ${change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {prevVol ? `${change > 0 ? '+' : ''}${change.toFixed(1)}%` : '—'}
                      </td>
                      <td className="p-2 text-center text-gray-600">{record.painScore}/10</td>
                      <td className="p-2 text-center text-gray-600">{record.pittingGrade}</td>
                      <td className="p-2 text-center">
                        {record.compressionCompliance === 'good' || record.compressionCompliance === 'excellent' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 inline" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance Summary */}
      {latestRecord && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-500 mb-2">Compression Compliance</h5>
            <p className="text-sm font-medium text-gray-800 capitalize">{latestRecord.compressionCompliance.replace(/_/g, ' ')}</p>
          </div>
          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h5 className="text-xs font-semibold text-gray-500 mb-2">Exercise Compliance</h5>
            <p className="text-sm font-medium text-gray-800 capitalize">{latestRecord.exerciseCompliance.replace(/_/g, ' ')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
