import { format } from 'date-fns';
import type { Investigation } from '../../../types';
import { TestTube2, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface LaboratoryResultsSlideProps {
  investigations: Investigation[];
  patientName: string;
}

const categoryColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  hematology: { bg: 'bg-red-900/25', border: 'border-red-700/30', text: 'text-red-300', icon: '🩸' },
  biochemistry: { bg: 'bg-blue-900/25', border: 'border-blue-700/30', text: 'text-blue-300', icon: '🧪' },
  microbiology: { bg: 'bg-green-900/25', border: 'border-green-700/30', text: 'text-green-300', icon: '🦠' },
  radiology: { bg: 'bg-purple-900/25', border: 'border-purple-700/30', text: 'text-purple-300', icon: '📡' },
  imaging: { bg: 'bg-indigo-900/25', border: 'border-indigo-700/30', text: 'text-indigo-300', icon: '🔬' },
  pathology: { bg: 'bg-amber-900/25', border: 'border-amber-700/30', text: 'text-amber-300', icon: '🔬' },
  histopathology: { bg: 'bg-pink-900/25', border: 'border-pink-700/30', text: 'text-pink-300', icon: '🧫' },
  cardiology: { bg: 'bg-rose-900/25', border: 'border-rose-700/30', text: 'text-rose-300', icon: '❤️' },
  laboratory: { bg: 'bg-cyan-900/25', border: 'border-cyan-700/30', text: 'text-cyan-300', icon: '🧬' },
  other: { bg: 'bg-gray-800/50', border: 'border-gray-600/30', text: 'text-gray-300', icon: '📋' },
};

const statusIcons: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 size={14} className="text-green-400" />,
  processing: <Loader2 size={14} className="text-blue-400 animate-spin" />,
  requested: <Clock size={14} className="text-yellow-400" />,
  sample_collected: <Clock size={14} className="text-orange-400" />,
  cancelled: <AlertCircle size={14} className="text-red-400" />,
};

export default function LaboratoryResultsSlide({ investigations, patientName }: LaboratoryResultsSlideProps) {
  if (!investigations || investigations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
        <TestTube2 size={80} className="text-gray-600 mb-6" />
        <h2 className="text-3xl font-bold text-gray-400 mb-2">No Laboratory Results</h2>
        <p className="text-gray-500 text-lg">No investigations recorded for {patientName}</p>
      </div>
    );
  }

  // Group by category
  const byCategory = investigations.reduce((acc, inv) => {
    const cat = inv.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(inv);
    return acc;
  }, {} as Record<string, Investigation[]>);

  // Sort each category by date (newest first)
  Object.values(byCategory).forEach(group => {
    group.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
  });

  // Sort categories: those with results first
  const sortedCategories = Object.entries(byCategory).sort(([, a], [, b]) => {
    const aCompleted = a.filter(i => i.status === 'completed').length;
    const bCompleted = b.filter(i => i.status === 'completed').length;
    return bCompleted - aCompleted;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 rounded-xl p-6 border border-emerald-700/30">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <TestTube2 size={28} className="text-emerald-400" />
          Laboratory Results — {patientName}
        </h2>
        <p className="text-emerald-200/70 mt-1">
          {investigations.length} investigation{investigations.length !== 1 ? 's' : ''} across {sortedCategories.length} categor{sortedCategories.length !== 1 ? 'ies' : 'y'}
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {sortedCategories.map(([category, items]) => {
          const colors = categoryColors[category] || categoryColors.other;
          return (
            <div key={category} className={`${colors.bg} rounded-xl p-6 border ${colors.border}`}>
              <h3 className={`text-xl font-bold ${colors.text} mb-4 capitalize flex items-center gap-2`}>
                <span className="text-2xl">{colors.icon}</span>
                {category} ({items.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700/50">
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Test</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Date</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Status</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Priority</th>
                      <th className="text-left py-2 px-3 text-gray-400 font-medium">Results</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(inv => (
                      <tr key={inv.id} className="border-b border-gray-700/20 hover:bg-white/5">
                        <td className="py-3 px-3 text-gray-200 font-medium">
                          {inv.typeName || inv.name || inv.type}
                        </td>
                        <td className="py-3 px-3 text-gray-400">
                          {format(new Date(inv.requestedAt), 'PP')}
                        </td>
                        <td className="py-3 px-3">
                          <span className="flex items-center gap-1.5 text-gray-300 capitalize">
                            {statusIcons[inv.status] || statusIcons.requested}
                            {inv.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            inv.priority === 'stat' ? 'bg-red-600/40 text-red-200' :
                            inv.priority === 'urgent' ? 'bg-orange-600/40 text-orange-200' :
                            'bg-gray-600/40 text-gray-300'
                          }`}>
                            {inv.priority}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-300 max-w-xs">
                          {inv.results && inv.results.length > 0 ? (
                            <div className="space-y-1">
                              {inv.results.slice(0, 3).map((result, idx) => (
                                <div key={idx} className="text-xs">
                                  <span className="text-gray-400">{result.parameter}: </span>
                                  <span className={result.isAbnormal ? 'text-red-400 font-semibold' : 'text-green-400'}>
                                    {result.value} {result.unit || ''}
                                  </span>
                                  {result.referenceRange && (
                                    <span className="text-gray-500 ml-1">({result.referenceRange})</span>
                                  )}
                                </div>
                              ))}
                              {inv.results.length > 3 && (
                                <span className="text-gray-500 text-xs">+{inv.results.length - 3} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
