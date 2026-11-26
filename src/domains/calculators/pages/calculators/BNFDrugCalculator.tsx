// BNF Drug Calculator
//
// The hub's BNF tab is a view over the app's real BNF database — the same
// records, warnings and renal/hepatic notes as the Bedside BNF tab and the
// prescribing module. It used to carry its own ten-drug table whose renal
// loop stopped at the first (highest) band, so a GFR below every threshold
// got the normal dose (gentamicin at GFR 5: "use normal dose"). One database
// now serves both surfaces.

import { Suspense, lazy, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Pill } from 'lucide-react';
import { PatientCalculatorInfo } from '../../types';
import { parseBnfInputs } from '../../engine/hub/bnf';
import { patientInfoToReportPatient } from '../../report/hubPatient';

// Several thousand drug records: loaded with the tab, not with the page.
const BnfDrugPanel = lazy(() => import('../../../clinician-assistant/components/panels/BnfDrugPanel'));

interface Props {
  patientInfo: PatientCalculatorInfo;
}

export default function BNFDrugCalculator({ patientInfo }: Props) {
  const [gfr, setGfr] = useState('');
  const [weight, setWeight] = useState(patientInfo.weight || '');

  const parsed = useMemo(() => parseBnfInputs({ gfr, weight }, patientInfo), [gfr, weight, patientInfo]);
  const patient = useMemo(
    () => patientInfoToReportPatient(patientInfo, { weightKg: parsed.weightKg, ageYears: parsed.ageYears }),
    [patientInfo, parsed.weightKg, parsed.ageYears]
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 md:p-8">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Pill className="w-5 h-5 sm:w-7 sm:h-7 text-blue-600" />
        <h2 className="text-lg sm:text-2xl font-bold text-gray-800">BNF Drug Calculator</h2>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 sm:p-4 mb-4 sm:mb-6 rounded-r-lg">
        <div className="flex items-start gap-2 sm:gap-3">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs sm:text-sm text-gray-700">
            <p className="font-semibold mb-1">Drug dosing with renal and hepatic adjustments</p>
            <p>From the app's BNF database. Always verify with the current formulary and clinical judgement.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">eGFR (mL/min/1.73m²)</label>
          <input
            type="number"
            value={gfr}
            onChange={(e) => setGfr(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
            placeholder="Blank = not known"
          />
          <p className="text-xs text-gray-500 mt-0.5">Use the GFR tab to calculate it. Blank means renal warnings cannot be checked.</p>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1">Weight (kg)</label>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 text-sm"
            placeholder="Blank = not known"
          />
        </div>
      </div>

      {parsed.errors.length > 0 && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {parsed.errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      <Suspense fallback={
        <div className="py-8 flex items-center justify-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading the drug database…
        </div>
      }>
        <BnfDrugPanel
          weightKg={parsed.weightKg ?? 0}
          ageYears={parsed.ageYears ?? 0}
          sex={parsed.sex}
          gfr={parsed.gfr}
          patient={patient}
        />
      </Suspense>
    </div>
  );
}
