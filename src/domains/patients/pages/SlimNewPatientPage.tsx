import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Save, User, ChevronDown, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { AsyncButton, useActionStatus } from '../../../components/motion';
import { db } from '../../../database/db';
import { syncRecord } from '../../../services/cloudSyncService';
import { HospitalSelector } from '../../../components/hospital';
import type { Patient } from '../../../types';
import { HospitalNumberField, numberCheckBlocks, type NumberCheck } from '../components/HospitalNumberField';
import { registerPatient, isDuplicateHospitalNumberError } from '../services/patientDedupeService';
import { registrationScopeProblem } from '../services/registrationScope';
import {
  resolveOptionalDateOfBirth,
  maskDdMmYyyy,
  formatDdMmYyyy,
  ageFromDob,
  registrationHospital,
} from '../registration';

/**
 * Quick Patient Registration
 * ──────────────────────────
 * Required: the patient's name (first and last). Everything else is optional
 * and can be filled in later: sex, phone, and the date of birth OR the age in
 * years (an age-only registration stores an estimated date of birth, 1 July
 * of that year, flagged `dobEstimated`). Clinical data (allergies,
 * comorbidities, risk scores) is captured at the first encounter.
 *
 * The hospital defaults to the practice's only active hospital, and the
 * picker is shown only when there is more than one (or none yet). With no
 * hospital the patient is still saved, with no registered hospital.
 *
 * Hospital Number: auto-generated if blank; refused if another patient at the
 * same hospital already holds it.
 */

const slimSchema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    middleName: z.string().optional(),
    dobMode: z.enum(['dob', 'age']),
    dateOfBirth: z.string().optional(),
    ageYears: z.string().optional(),
    gender: z.enum(['', 'male', 'female']).optional(),
    phone: z.string().trim().optional(),
    email: z.string().email('Invalid email').optional().or(z.literal('')),
    address: z.string().optional(),
    folderNumber: z.string().optional(),
    nextOfKinName: z.string().optional(),
    nextOfKinPhone: z.string().optional(),
    maritalStatus: z.enum(['', 'single', 'married', 'divorced', 'widowed']).optional(),
    occupation: z.string().optional(),
    // Optional. Never the string 'global' (it belongs to no hospital and
    // matched no filter): no hospital is stored as no hospital.
    hospitalId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const dob = resolveOptionalDateOfBirth({ mode: data.dobMode, dobText: data.dateOfBirth, ageText: data.ageYears });
    if (!dob.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: dob.error,
        path: [data.dobMode === 'age' ? 'ageYears' : 'dateOfBirth'],
      });
    }
  });

type SlimFormData = z.infer<typeof slimSchema>;

export default function SlimNewPatientPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const saveFx = useActionStatus();
  const [numberCheck, setNumberCheck] = useState<NumberCheck>({ state: 'empty' });

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = useForm<SlimFormData>({
    resolver: zodResolver(slimSchema),
    defaultValues: { dobMode: 'dob', maritalStatus: '', hospitalId: user?.hospitalId ?? '' },
  });

  const hospitals = useLiveQuery(() => db.hospitals.toArray(), []);
  const hospitalChoice = hospitals ? registrationHospital(hospitals, user?.hospitalId) : null;
  const showHospitalPicker = hospitalChoice?.showPicker ?? false;

  // A one-hospital practice registers there without asking.
  useEffect(() => {
    if (!hospitalChoice) return;
    if (!hospitalChoice.showPicker || !getValues('hospitalId')) {
      setValue('hospitalId', hospitalChoice.defaultId, { shouldValidate: false });
    }
  }, [hospitalChoice?.defaultId, hospitalChoice?.showPicker, getValues, setValue]);

  const registeringAt = watch('hospitalId');
  const registeringName = hospitals?.find(h => h.id === registeringAt)?.name;
  const dobMode = watch('dobMode');
  const dobPreview = resolveOptionalDateOfBirth({ mode: dobMode, dobText: watch('dateOfBirth'), ageText: watch('ageYears') });

  const onSubmit = async (data: SlimFormData) => {
    if (numberCheckBlocks(numberCheck)) {
      toast.error(numberCheck.state === 'checking'
        ? 'Still checking the hospital number - try again in a moment.'
        : 'This hospital number is already registered. Open the existing record instead.');
      saveFx.error();
      return;
    }
    const scopeProblem = await registrationScopeProblem(data.hospitalId, user);
    if (scopeProblem) {
      toast.error(scopeProblem, { duration: 8000 });
      saveFx.error();
      return;
    }
    const dob = resolveOptionalDateOfBirth({ mode: data.dobMode, dobText: data.dateOfBirth, ageText: data.ageYears });
    if (!dob.ok) {
      toast.error(dob.error);
      saveFx.error();
      return;
    }
    const hospitalId = data.hospitalId?.trim() || undefined;
    setIsLoading(true);
    try {
      const draft: Patient = {
        id: uuidv4(),
        // Blank: registerPatient issues an auto-number (CB + YY + 5 digits).
        hospitalNumber: data.folderNumber?.trim() || '',
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        middleName: data.middleName?.trim() || undefined,
        dateOfBirth: dob.dateOfBirth,
        dobEstimated: dob.dateOfBirth ? dob.dobEstimated : undefined,
        gender: data.gender || undefined,
        // Optional now: left unset rather than guessed.
        maritalStatus: data.maritalStatus || undefined,
        phone: data.phone?.trim() || '',
        email: data.email?.trim() || undefined,
        address: data.address?.trim() || '',
        city: '',
        state: '',
        occupation: data.occupation?.trim() || undefined,
        allergies: [],
        chronicConditions: [],
        nextOfKin: {
          name: data.nextOfKinName?.trim() || '',
          relationship: '',
          phone: data.nextOfKinPhone?.trim() || '',
          address: '',
        },
        careType: 'hospital',
        // Null in the cloud when there is no hospital (one older schema
        // types registered_hospital_id as a UUID, which '' would fail).
        hospitalId,
        hospitalName: hospitalId ? (await db.hospitals.get(hospitalId))?.name : undefined,
        registeredHospitalId: hospitalId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Patient;

      let patient: Patient;
      try {
        patient = await registerPatient(draft);
      } catch (dbError) {
        if (isDuplicateHospitalNumberError(dbError)) throw dbError;
        console.error('[SlimPatientRegistration] DB error:', dbError);
        throw new Error('Failed to save patient locally');
      }
      const hospitalNumber = patient.hospitalNumber;

      try {
        if (navigator.onLine) {
          await syncRecord('patients', patient as unknown as Record<string, unknown>);
        }
      } catch (syncError) {
        console.warn('[SlimPatientRegistration] Cloud sync deferred:', syncError);
      }

      toast.success(
        navigator.onLine
          ? `Patient registered — ${hospitalNumber}`
          : `Patient registered (offline) — will sync when online`
      );
      saveFx.done();
      navigate(`/patients/${patient.id}`);
    } catch (error) {
      console.error('[SlimPatientRegistration] Error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to register patient');
      saveFx.error();
    } finally {
      setIsLoading(false);
    }
  };

  const modeButton = (mode: 'dob' | 'age', label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={dobMode === mode}
      onClick={() => setValue('dobMode', mode)}
      className={`flex-1 px-3 py-2 text-sm font-medium rounded-md min-h-touch ${
        dobMode === mode ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 min-h-touch"
        >
          <ArrowLeft size={18} />
          Back to Patients
        </button>
        <h1 className="page-title">New Patient</h1>
        <p className="page-subtitle">
          Only the name is needed. Add sex, phone, age and the rest now or later.
        </p>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit(onSubmit, () => saveFx.error())}
        className="space-y-5"
        noValidate
      >
        {/* Essentials */}
        <div className="card">
          <div className="card-header flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-900">Patient</h2>
          </div>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="reg-first">First Name *</label>
              <input id="reg-first" {...register('firstName')} className="form-input" autoComplete="off" />
              {errors.firstName && <p className="form-error">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="reg-last">Last Name *</label>
              <input id="reg-last" {...register('lastName')} className="form-input" autoComplete="off" />
              {errors.lastName && <p className="form-error">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="reg-sex">Sex</label>
              <select id="reg-sex" {...register('gender')} className="form-input">
                <option value="">Not recorded</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              {errors.gender && <p className="form-error">{errors.gender.message}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="reg-phone">Phone</label>
              <input id="reg-phone" type="tel" inputMode="tel" {...register('phone')} className="form-input" placeholder="08012345678" />
              {errors.phone && <p className="form-error">{errors.phone.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <span className="form-label" id="reg-dob-mode">Date of birth or age</span>
              <div role="radiogroup" aria-labelledby="reg-dob-mode" className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-2">
                {modeButton('dob', 'Date of birth')}
                {modeButton('age', 'Age only')}
              </div>
              {dobMode === 'dob' ? (
                <Controller
                  control={control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <input
                      aria-label="Date of birth (dd/mm/yyyy)"
                      inputMode="numeric"
                      placeholder="dd/mm/yyyy"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(maskDdMmYyyy(e.target.value))}
                      onBlur={field.onBlur}
                      className="form-input"
                      autoComplete="off"
                    />
                  )}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Age in years"
                    inputMode="numeric"
                    {...register('ageYears')}
                    className="form-input w-28"
                    placeholder="e.g. 45"
                    autoComplete="off"
                  />
                  <span className="text-sm text-gray-600">years</span>
                </div>
              )}
              {dobMode === 'dob' && errors.dateOfBirth && <p className="form-error">{errors.dateOfBirth.message}</p>}
              {dobMode === 'age' && errors.ageYears && <p className="form-error">{errors.ageYears.message}</p>}
              {dobPreview.ok && dobPreview.dateOfBirth && (
                <p className="text-xs text-gray-600 mt-1" data-testid="dob-preview">
                  {dobPreview.dobEstimated
                    ? <>Date of birth {formatDdMmYyyy(dobPreview.dateOfBirth)} <span className="font-semibold text-amber-700">(estimated)</span></>
                    : <>Age {ageFromDob(dobPreview.dateOfBirth)} years</>}
                </p>
              )}
            </div>

            <Controller
              control={control}
              name="folderNumber"
              render={({ field }) => (
                <HospitalNumberField
                  value={field.value || ''}
                  onChange={field.onChange}
                  hospitalId={registeringAt}
                  onCheck={setNumberCheck}
                  hint="Leave blank to auto-generate (CB + YY + 5 digits)"
                />
              )}
            />

            {showHospitalPicker ? (
              <div className="sm:col-span-2">
                <Controller
                  name="hospitalId"
                  control={control}
                  render={({ field }) => (
                    <HospitalSelector
                      label="Hospital"
                      value={field.value}
                      onChange={(id) => field.onChange(id ?? '')}
                      placeholder="Search or select hospital (optional)"
                      showAddNew
                    />
                  )}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Where this patient is registered. Visits elsewhere are recorded on the encounter.
                </p>
              </div>
            ) : (
              registeringName && (
                <p className="text-xs text-gray-500 sm:col-span-2">Registering at {registeringName}.</p>
              )
            )}
          </div>
        </div>

        {/* Optional details */}
        <details className="card group">
          <summary className="card-header flex items-center gap-2 cursor-pointer list-none min-h-touch">
            <Info className="w-5 h-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900 flex-1">More details (optional)</h2>
            <ChevronDown className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" />
          </summary>
          <div className="card-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label" htmlFor="reg-middle">Other Names</label>
              <input id="reg-middle" {...register('middleName')} className="form-input" placeholder="Other / middle names" />
            </div>
            <div>
              <label className="form-label" htmlFor="reg-email">Email</label>
              <input id="reg-email" type="email" {...register('email')} className="form-input" placeholder="patient@example.com" />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>
            <div>
              <label className="form-label" htmlFor="reg-marital">Marital Status</label>
              <select id="reg-marital" {...register('maritalStatus')} className="form-input">
                <option value="">Not recorded</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="reg-occupation">Occupation</label>
              <input id="reg-occupation" {...register('occupation')} className="form-input" placeholder="Teacher, Farmer, Trader…" />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label" htmlFor="reg-address">Address</label>
              <textarea id="reg-address" {...register('address')} rows={2} className="form-input" placeholder="Street, area, town, state" />
            </div>
            <div>
              <label className="form-label" htmlFor="reg-nok-name">Next of kin name</label>
              <input id="reg-nok-name" {...register('nextOfKinName')} className="form-input" placeholder="Full name" />
            </div>
            <div>
              <label className="form-label" htmlFor="reg-nok-phone">Next of kin phone</label>
              <input id="reg-nok-phone" type="tel" inputMode="tel" {...register('nextOfKinPhone')} className="form-input" placeholder="08012345678" />
            </div>
            <p className="text-xs text-gray-500 sm:col-span-2">
              Need allergies, comorbidities and risk scores at registration?{' '}
              <button
                type="button"
                onClick={() => navigate('/patients/new-comprehensive')}
                className="underline font-semibold text-blue-700"
              >
                Use the comprehensive form
              </button>
            </p>
          </div>
        </details>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <AsyncButton
            type="submit"
            busy={isLoading}
            status={saveFx.status}
            workingLabel="Registering…"
            doneLabel="Registered"
            errorLabel="Patient not registered"
            className={`px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
              isLoading
                ? 'bg-blue-500 text-white cursor-wait'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow'
            }`}
          >
            <Save size={18} />
            Register Patient
          </AsyncButton>
        </div>
      </motion.form>
    </div>
  );
}
