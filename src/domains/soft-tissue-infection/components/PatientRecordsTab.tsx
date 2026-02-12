/**
 * Patient Records Tab - View all STI assessments with treatment plans
 */

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  User, Calendar, AlertTriangle, ChevronDown, ChevronUp,
  Eye, FileText, Clock, MapPin,
} from 'lucide-react';
import { format } from 'date-fns';
import { db } from '../../../database/db';
import type { STIAssessment } from '../../../types';

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    mild: 'bg-green-100 text-green-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    severe: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[severity] || 'bg-gray-100'}`}>
      {severity.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    discharged: 'bg-purple-100 text-purple-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || 'bg-gray-100'}`}>
      {status.toUpperCase()}
    </span>
  );
}

export default function PatientRecordsTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const assessments = useLiveQuery(
    () => db.stiAssessments.orderBy('createdAt').reverse().toArray()
  );

  const filtered = React.useMemo(() => {
    if (!assessments) return [];
    return assessments.filter(a => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return a.patientName.toLowerCase().includes(q) || a.classificationName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [assessments, statusFilter, searchQuery]);

  const redFlagCount = (a: STIAssessment) =>
    Object.values(a.redFlags).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search patient or classification..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="discharged">Discharged</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{assessments?.length || 0}</p>
          <p className="text-xs text-blue-600">Total Assessments</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-orange-700">{assessments?.filter(a => a.status === 'active').length || 0}</p>
          <p className="text-xs text-orange-600">Active Cases</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{assessments?.filter(a => a.severity === 'critical' || a.severity === 'severe').length || 0}</p>
          <p className="text-xs text-red-600">Severe/Critical</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{assessments?.filter(a => a.status === 'completed').length || 0}</p>
          <p className="text-xs text-green-600">Completed</p>
        </div>
      </div>

      {/* Records List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <FileText size={40} className="mx-auto mb-2 opacity-40" />
          <p>No STI assessments found</p>
          <p className="text-sm">Use the "New Assessment" tab to create one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="border rounded-lg overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <User size={18} className="text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{a.patientName}</p>
                    <p className="text-xs text-gray-500">{a.classificationName} &bull; {a.location || 'No location'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {redFlagCount(a) > 0 && (
                    <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                      <AlertTriangle size={14} /> {redFlagCount(a)}
                    </span>
                  )}
                  <SeverityBadge severity={a.severity} />
                  <StatusBadge status={a.status} />
                  <span className="text-xs text-gray-400">
                    {format(new Date(a.createdAt), 'dd/MM/yyyy')}
                  </span>
                  {expandedId === a.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedId === a.id && (
                <div className="p-4 border-t space-y-4">
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Classification</p>
                      <p className="font-medium">{a.classificationName}</p>
                      <p className="text-xs text-gray-500">Eron Class {a.eronClass} &bull; {a.severity}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-medium">{a.location || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pain Score</p>
                      <p className="font-medium">{a.painScore !== undefined ? `${a.painScore}/10` : '—'}</p>
                    </div>
                  </div>

                  {/* Red Flags */}
                  {redFlagCount(a) > 0 && (
                    <div className="bg-red-50 rounded p-3">
                      <p className="text-xs font-semibold text-red-700 mb-1">🚨 Red Flags Present</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(a.redFlags).filter(([, v]) => v).map(([k]) => (
                          <span key={k} className="px-2 py-0.5 bg-red-200 text-red-800 rounded text-xs">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comorbidities */}
                  {Object.values(a.comorbidities).some(Boolean) && (
                    <div className="bg-purple-50 rounded p-3">
                      <p className="text-xs font-semibold text-purple-700 mb-1">Comorbidities</p>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(a.comorbidities).filter(([, v]) => v).map(([k]) => (
                          <span key={k} className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded text-xs">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                        ))}
                      </div>
                      {a.hba1c && <p className="text-xs mt-1">HbA1c: <strong>{a.hba1c}%</strong></p>}
                    </div>
                  )}

                  {/* Treatment Plan */}
                  {a.generatedTreatmentPlan && (
                    <div className="bg-green-50 rounded p-3">
                      <p className="text-xs font-semibold text-green-700 mb-2">Treatment Plan</p>
                      <div className="space-y-2 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-blue-700">Antibiotics:</p>
                          {a.generatedTreatmentPlan.antibiotics.map((abx, i) => (
                            <p key={i} className="text-xs">{abx.drug} {abx.dose} {abx.route} {abx.frequency}</p>
                          ))}
                        </div>
                        {a.generatedTreatmentPlan.surgicalPlan.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-red-700">Surgical:</p>
                            <ul className="list-disc list-inside text-xs">
                              {a.generatedTreatmentPlan.surgicalPlan.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {a.additionalNotes && (
                    <div className="text-sm">
                      <p className="text-xs text-gray-500">Notes</p>
                      <p>{a.additionalNotes}</p>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">Assessed by: {a.assessedByName} on {format(new Date(a.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
