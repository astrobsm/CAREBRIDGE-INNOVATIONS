import { useMemo } from 'react';
import { differenceInYears } from 'date-fns';
import { Calculator, AlertCircle } from 'lucide-react';
import type { Patient } from '../../../types';
import {
  calculateBMI,
  bmiCategory,
  calculateIdealBodyWeight,
  calculateAdjustedBodyWeight,
  calculateNutrition,
  toSex,
} from '../engine/calculationEngine';

interface Props {
  patient: Patient | undefined | null;
  className?: string;
}

/**
 * Read-only clinical calculation summary powered by the shared calculation
 * engine. Auto-populates from the patient's recorded weight, height, age and
 * sex. Used inside Treatment Planning (and reusable elsewhere) so clinicians
 * see energy/protein/fluid targets without leaving the workflow.
 */
export default function ClinicalCalcCard({ patient, className = '' }: Props) {
  const derived = useMemo(() => {
    if (!patient) return null;
    const weightKg = patient.weight ?? null;
    const heightCm = patient.height ?? null;
    const sex = toSex(patient.gender);
    const ageYears = patient.dateOfBirth
      ? differenceInYears(new Date(), new Date(patient.dateOfBirth))
      : null;

    const bmi = weightKg && heightCm ? calculateBMI(weightKg, heightCm) : null;
    const ibw = heightCm ? calculateIdealBodyWeight(heightCm, sex) : null;
    const adjBw =
      weightKg && heightCm ? calculateAdjustedBodyWeight(weightKg, heightCm, sex) : null;

    const nutrition =
      weightKg && heightCm && ageYears !== null
        ? calculateNutrition({ weightKg, heightCm, ageYears, sex })
        : null;

    return { weightKg, heightCm, ageYears, sex, bmi, ibw, adjBw, nutrition };
  }, [patient]);

  if (!patient) return null;

  const missing = !derived?.weightKg || !derived?.heightCm;

  return (
    <div className={`rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <Calculator size={16} className="text-indigo-600" />
        <h3 className="text-sm font-semibold text-indigo-900">
          Auto-calculated clinical metrics
        </h3>
        <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700">
          shared engine
        </span>
      </div>

      {missing ? (
        <div className="flex items-start gap-2 text-xs text-amber-700">
          <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
          <span>
            Record the patient&apos;s weight and height to auto-calculate BMI, ideal body
            weight and energy / protein / fluid targets.
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {derived?.bmi != null && (
            <Metric
              label="BMI"
              value={`${derived.bmi}`}
              unit="kg/m²"
              hint={bmiCategory(derived.bmi)}
            />
          )}
          {derived?.ibw != null && (
            <Metric label="Ideal body wt" value={`${derived.ibw}`} unit="kg" hint="Devine" />
          )}
          {derived?.adjBw != null && (
            <Metric label="Adjusted body wt" value={`${derived.adjBw}`} unit="kg" />
          )}
          {derived?.nutrition && (
            <>
              <Metric
                label="Energy need"
                value={`${derived.nutrition.tdee}`}
                unit="kcal/day"
                hint="Harris-Benedict"
              />
              <Metric
                label="Protein need"
                value={`${derived.nutrition.proteinGramsPerDay}`}
                unit="g/day"
              />
              <Metric
                label="Fluid need"
                value={`${derived.nutrition.fluidMlPerDay}`}
                unit="mL/day"
                hint="30 mL/kg"
              />
              <Metric label="BMR" value={`${derived.nutrition.bmr}`} unit="kcal/day" />
            </>
          )}
        </div>
      )}

      <p className="mt-3 text-[10px] leading-tight text-gray-500">
        Estimates for clinician review. Adjust for stress/activity in the full Calculators
        module. Nutrition uses standard factors (activity 1.2, protein 1.0 g/kg).
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-gray-100">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="text-lg font-bold leading-tight text-gray-900">
        {value}
        {unit && <span className="ml-1 text-[10px] font-normal text-gray-400">{unit}</span>}
      </p>
      {hint && <p className="text-[10px] text-indigo-600">{hint}</p>}
    </div>
  );
}
