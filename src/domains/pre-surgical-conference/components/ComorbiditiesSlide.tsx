import type { Comorbidity } from '../../../types';
import { Heart, AlertCircle, Pill, Calendar, CheckCircle2, XCircle } from 'lucide-react';

interface ComorbiditiesSlideProps {
  comorbidities: Comorbidity[];
  patientName: string;
}

const severityColors = {
  mild: { bg: 'bg-yellow-900/30', border: 'border-yellow-600/40', text: 'text-yellow-300', badge: 'bg-yellow-600/40 text-yellow-200' },
  moderate: { bg: 'bg-orange-900/30', border: 'border-orange-600/40', text: 'text-orange-300', badge: 'bg-orange-600/40 text-orange-200' },
  severe: { bg: 'bg-red-900/30', border: 'border-red-600/40', text: 'text-red-300', badge: 'bg-red-600/40 text-red-200' },
};

export default function ComorbiditiesSlide({ comorbidities, patientName }: ComorbiditiesSlideProps) {
  if (!comorbidities || comorbidities.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
        <Heart size={80} className="text-gray-600 mb-6" />
        <h2 className="text-3xl font-bold text-gray-400 mb-2">No Comorbidities Documented</h2>
        <p className="text-gray-500 text-lg">{patientName} has no recorded comorbidities</p>
      </div>
    );
  }

  const bySeverity = {
    severe: comorbidities.filter(c => c.severity === 'severe'),
    moderate: comorbidities.filter(c => c.severity === 'moderate'),
    mild: comorbidities.filter(c => c.severity === 'mild'),
    unclassified: comorbidities.filter(c => !c.severity),
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-rose-900/40 to-orange-900/40 rounded-xl p-6 border border-rose-700/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Heart size={28} className="text-rose-400" />
              Comorbidities — {patientName}
            </h2>
            <p className="text-rose-200/70 mt-1">{comorbidities.length} condition{comorbidities.length !== 1 ? 's' : ''} documented</p>
          </div>
          <div className="flex gap-3">
            {bySeverity.severe.length > 0 && (
              <span className="bg-red-600/40 text-red-200 px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                <AlertCircle size={18} /> {bySeverity.severe.length} Severe
              </span>
            )}
            {bySeverity.moderate.length > 0 && (
              <span className="bg-orange-600/40 text-orange-200 px-4 py-2 rounded-lg font-semibold">
                {bySeverity.moderate.length} Moderate
              </span>
            )}
            {bySeverity.mild.length > 0 && (
              <span className="bg-yellow-600/40 text-yellow-200 px-4 py-2 rounded-lg font-semibold">
                {bySeverity.mild.length} Mild
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Comorbidity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {comorbidities.map((comorbidity, index) => {
          const colors = comorbidity.severity ? severityColors[comorbidity.severity] : {
            bg: 'bg-gray-800/50', border: 'border-gray-600/40', text: 'text-gray-300', badge: 'bg-gray-600/40 text-gray-200'
          };

          return (
            <div key={index} className={`${colors.bg} rounded-xl p-5 border ${colors.border}`}>
              <div className="flex items-start justify-between mb-3">
                <h3 className={`text-xl font-bold ${colors.text}`}>{comorbidity.condition}</h3>
                {comorbidity.severity && (
                  <span className={`${colors.badge} px-3 py-1 rounded-full text-xs font-semibold uppercase`}>
                    {comorbidity.severity}
                  </span>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                {comorbidity.diagnosedDate && (
                  <p className="text-gray-400 flex items-center gap-2">
                    <Calendar size={14} /> Diagnosed: {comorbidity.diagnosedDate}
                  </p>
                )}
                
                <p className="flex items-center gap-2 text-gray-300">
                  {comorbidity.currentlyManaged ? (
                    <><CheckCircle2 size={14} className="text-green-400" /> Currently Managed</>
                  ) : (
                    <><XCircle size={14} className="text-red-400" /> Not Currently Managed</>
                  )}
                </p>

                {comorbidity.medications && comorbidity.medications.length > 0 && (
                  <div className="mt-2">
                    <p className="text-gray-400 flex items-center gap-2 mb-1">
                      <Pill size={14} /> Medications:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {comorbidity.medications.map((med, i) => (
                        <span key={i} className="bg-gray-700/50 text-gray-300 px-2 py-0.5 rounded text-xs">
                          {med}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {comorbidity.notes && (
                  <p className="text-gray-400 italic mt-2">Note: {comorbidity.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
