/**
 * Raised flags, red first and never collapsed: red as full cards, amber as a
 * compact list. Shared by the guided history and the procedure reviews.
 */
import React from 'react';
import { AlertOctagon, AlertTriangle } from 'lucide-react';
import type { RaisedFlag } from '../services/templateEngine';

export const FlagBanner: React.FC<{ flags: RaisedFlag[] }> = ({ flags }) => {
  const red = flags.filter(f => f.level === 'red');
  const amber = flags.filter(f => f.level === 'amber');
  return (
    <>
      {red.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 space-y-2">
          {red.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">
                  {f.fieldLabel}: {f.answerLabel}
                </p>
                <p className="text-sm text-red-800">{f.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {amber.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
          {amber.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900">
                <span className="font-medium">{f.fieldLabel}: {f.answerLabel}.</span> {f.reason}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default FlagBanner;
