import { format } from 'date-fns';
import type { Surgery } from '../../../types';
import { Scissors, Calendar, User, Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface PlannedProceduresSlideProps {
  surgeries: Surgery[];
  patientName: string;
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-600/40 text-blue-200',
  ready_for_preanaesthetic_review: 'bg-yellow-600/40 text-yellow-200',
  incomplete_preparation: 'bg-red-600/40 text-red-200',
  'in-progress': 'bg-green-600/40 text-green-200',
  completed: 'bg-gray-600/40 text-gray-300',
  postponed: 'bg-orange-600/40 text-orange-200',
  cancelled: 'bg-red-600/40 text-red-300',
};

const categoryLabels: Record<string, { label: string; color: string }> = {
  minor: { label: 'Minor', color: 'bg-green-600/30 text-green-300' },
  intermediate: { label: 'Intermediate', color: 'bg-yellow-600/30 text-yellow-300' },
  major: { label: 'Major', color: 'bg-orange-600/30 text-orange-300' },
  super_major: { label: 'Super Major', color: 'bg-red-600/30 text-red-300' },
};

export default function PlannedProceduresSlide({ surgeries, patientName }: PlannedProceduresSlideProps) {
  // Show planned/scheduled first, then others
  const planned = surgeries.filter(s => ['scheduled', 'ready_for_preanaesthetic_review', 'incomplete_preparation'].includes(s.status));
  const past = surgeries.filter(s => !['scheduled', 'ready_for_preanaesthetic_review', 'incomplete_preparation'].includes(s.status));

  if (surgeries.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
        <Scissors size={80} className="text-gray-600 mb-6" />
        <h2 className="text-3xl font-bold text-gray-400 mb-2">No Planned Procedures</h2>
        <p className="text-gray-500 text-lg">No surgical procedures scheduled for {patientName}</p>
      </div>
    );
  }

  const renderSurgeryCard = (surgery: Surgery, isPlanned: boolean) => {
    const catInfo = categoryLabels[surgery.category] || categoryLabels.minor;
    return (
      <div key={surgery.id} className={`rounded-xl p-6 border ${
        isPlanned ? 'bg-indigo-900/20 border-indigo-700/30' : 'bg-gray-800/40 border-gray-700/30'
      }`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white">{surgery.procedureName}</h3>
            {surgery.procedureCode && (
              <p className="text-sm text-gray-400">Code: {surgery.procedureCode}</p>
            )}
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[surgery.status] || statusColors.scheduled}`}>
              {surgery.status.replace(/_/g, ' ')}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${catInfo.color}`}>
              {catInfo.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-400 flex items-center gap-1"><Calendar size={14} /> Scheduled</p>
            <p className="text-white font-medium">{format(new Date(surgery.scheduledDate), 'PPP')}</p>
          </div>
          <div>
            <p className="text-gray-400 flex items-center gap-1"><Clock size={14} /> Type</p>
            <p className={`font-medium ${surgery.type === 'emergency' ? 'text-red-400' : 'text-white'}`}>
              {surgery.type === 'emergency' ? '🚨 Emergency' : 'Elective'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 flex items-center gap-1"><User size={14} /> Surgeon</p>
            <p className="text-white font-medium">{surgery.surgeon || 'TBD'}</p>
          </div>
          {surgery.anaesthetist && (
            <div>
              <p className="text-gray-400 flex items-center gap-1"><User size={14} /> Anaesthetist</p>
              <p className="text-white font-medium">{surgery.anaesthetist}</p>
            </div>
          )}
        </div>

        {surgery.anaesthesiaType && (
          <div className="mt-3">
            <span className="bg-purple-600/30 text-purple-300 px-3 py-1 rounded text-sm">
              Anaesthesia: {surgery.anaesthesiaType}
            </span>
          </div>
        )}

        {/* Outstanding Items */}
        {surgery.outstandingItems && surgery.outstandingItems.length > 0 && (
          <div className="mt-4 bg-red-900/20 rounded-lg p-4 border border-red-700/20">
            <h4 className="text-sm font-semibold text-red-300 flex items-center gap-2 mb-2">
              <AlertTriangle size={14} /> Outstanding Preparation Items
            </h4>
            <div className="space-y-1">
              {surgery.outstandingItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {item.completed ? (
                    <CheckCircle2 size={14} className="text-green-400" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                  <span className={item.completed ? 'text-gray-400 line-through' : 'text-red-200'}>
                    {item.label || item.description || 'Unnamed item'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team */}
        <div className="mt-4 flex flex-wrap gap-2">
          {surgery.assistant && (
            <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs">
              Assistant: {surgery.assistant}
            </span>
          )}
          {surgery.scrubNurse && (
            <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs">
              Scrub: {surgery.scrubNurse}
            </span>
          )}
          {surgery.circulatingNurse && (
            <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded text-xs">
              Circulating: {surgery.circulatingNurse}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-900/40 to-blue-900/40 rounded-xl p-6 border border-indigo-700/30">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Scissors size={28} className="text-indigo-400" />
          Planned Procedures — {patientName}
        </h2>
        <p className="text-indigo-200/70 mt-1">
          {planned.length} planned • {past.length} past/completed
        </p>
      </div>

      {/* Planned Surgeries */}
      {planned.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-indigo-300">Upcoming / Planned</h3>
          {planned.map(s => renderSurgeryCard(s, true))}
        </div>
      )}

      {/* Past Surgeries */}
      {past.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-400">Previous Surgeries</h3>
          {past.map(s => renderSurgeryCard(s, false))}
        </div>
      )}
    </div>
  );
}
