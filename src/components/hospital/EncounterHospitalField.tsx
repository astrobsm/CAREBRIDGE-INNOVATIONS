/**
 * Where this particular encounter happened.
 *
 * A patient is registered at one hospital, and that is what
 * patient.registeredHospitalId records. It is not the same question as where
 * they were seen today: a patient registered at UNTH who is reviewed at a
 * private clinic, or at an outreach site, has one registration and two places
 * of care. Every assessment page in the app used to stamp the registered
 * hospital onto the record, so the second visit was filed under a hospital the
 * patient was never at — which misattributes the activity, the billing and the
 * audit trail.
 *
 * So: registration stays on the patient, and each encounter carries its own
 * hospital, defaulting to the registered one because that is usually right.
 *
 * This reuses the existing HospitalSelector rather than introducing a second
 * hospital picker — it only adds the default, the reset-on-patient-change, and
 * the notice when the two differ.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Building2, MapPin } from 'lucide-react';
import { db } from '../../database/db';
import { useAuth } from '../../contexts/AuthContext';
import { HospitalSelector } from './HospitalSelector';
import type { Hospital, Patient } from '../../types';

export interface EncounterHospital {
  /** The hospital to stamp on the record being created. */
  hospitalId: string | undefined;
  /** Set explicitly by the user; suppresses the default until the patient changes. */
  setHospitalId: (id: string | undefined) => void;
  hospital: Hospital | undefined;
  /** Where the patient is registered, which may not be where they are seen. */
  registeredHospital: Hospital | undefined;
  /** True when this encounter is somewhere other than the registered hospital. */
  isElsewhere: boolean;
}

/**
 * Track the hospital for an encounter, defaulting to the patient's own and
 * falling back to the logged-in user's when the patient has none recorded.
 */
export function useEncounterHospital(patient?: Patient | null): EncounterHospital {
  const { user } = useAuth();
  const hospitals = useLiveQuery(() => db.hospitals.toArray(), []);

  const [hospitalId, setInternal] = useState<string | undefined>(undefined);
  const overridden = useRef(false);
  const lastPatientId = useRef<string | undefined>(undefined);

  const registeredId = patient?.registeredHospitalId || undefined;
  const patientId = patient?.id;

  useEffect(() => {
    // A different patient is a different question — drop any override.
    if (patientId !== lastPatientId.current) {
      lastPatientId.current = patientId;
      overridden.current = false;
    }
    if (overridden.current) return;
    setInternal(registeredId || user?.hospitalId || undefined);
  }, [patientId, registeredId, user?.hospitalId]);

  const setHospitalId = useCallback((id: string | undefined) => {
    overridden.current = true;
    setInternal(id);
  }, []);

  const hospital = useMemo(
    () => (hospitalId ? hospitals?.find(h => h.id === hospitalId) : undefined),
    [hospitals, hospitalId],
  );

  const registeredHospital = useMemo(
    () => (registeredId ? hospitals?.find(h => h.id === registeredId) : undefined),
    [hospitals, registeredId],
  );

  return {
    hospitalId,
    setHospitalId,
    hospital,
    registeredHospital,
    // Only a genuine difference counts — an unset registration is not one.
    isElsewhere: Boolean(registeredId && hospitalId && registeredId !== hospitalId),
  };
}

interface Props {
  patient?: Patient | null;
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  registeredHospital?: Hospital;
  isElsewhere?: boolean;
  label?: string;
  className?: string;
}

export function EncounterHospitalField({
  patient,
  value,
  onChange,
  registeredHospital,
  isElsewhere = false,
  label = 'Seen at',
  className = '',
}: Props) {
  if (!patient) return null;

  return (
    <div className={className}>
      <HospitalSelector
        label={label}
        value={value}
        onChange={id => onChange(id)}
        placeholder="Search or select the hospital for this visit"
        size="sm"
        showAddNew
      />

      {isElsewhere ? (
        // Not an error — seeing a patient elsewhere is normal. It is recorded
        // plainly so that whoever reads the note later knows which it was.
        <p className="mt-1 text-xs text-amber-700 flex items-start gap-1">
          <MapPin size={13} className="mt-px shrink-0" />
          <span>
            Recorded as seen away from where this patient is registered
            {registeredHospital ? ` (${registeredHospital.name})` : ''}. The
            registration is unchanged.
          </span>
        </p>
      ) : registeredHospital ? (
        <p className="mt-1 text-xs text-gray-500 flex items-start gap-1">
          <Building2 size={13} className="mt-px shrink-0" />
          <span>Where this patient is registered. Change it if seen elsewhere.</span>
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-500 flex items-start gap-1">
          <Building2 size={13} className="mt-px shrink-0" />
          <span>This patient has no registered hospital recorded.</span>
        </p>
      )}
    </div>
  );
}

export default EncounterHospitalField;
