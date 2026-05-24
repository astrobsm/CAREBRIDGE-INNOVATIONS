/**
 * Investigation Request Form
 * Dynamic checkbox-driven form for ordering investigations.
 * Supports 9 categories from INVESTIGATION_CATALOG.
 * Prints to A4 or 80mm thermal via browser print stylesheet.
 *
 * Routes:
 *   /patients/:patientId/investigations/request/new
 *   /investigation-requests/:bundleId
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';
import {
  ClipboardList,
  Printer,
  Save,
  Send,
  AlertCircle,
  Activity,
  Calculator,
} from 'lucide-react';
import { db } from '../../../database';
import { PatientOps } from '../../../database/operations';
import { useAuth } from '../../../contexts/AuthContext';
import {
  INVESTIGATION_CATALOG,
  InvestigationRequestOps,
  calculateEGFR,
  ckdStageFromEGFR,
} from '../../../services/investigationRequestService';
import type {
  InvestigationRequestBundle,
  InvestigationRequestItem,
} from '../../../types';
import ThermalReceipt80mm from './ThermalReceipt80mm';
import A4InvestigationRequestPrint from './A4InvestigationRequestPrint';

type PrintMode = 'none' | 'thermal' | 'a4';

const InvestigationRequestForm = () => {
  const { patientId, bundleId } = useParams<{ patientId?: string; bundleId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceModule = (searchParams.get('source') as InvestigationRequestBundle['sourceModule']) || 'general';
  const sourceAssessmentId = searchParams.get('assessmentId') || undefined;
  const { user } = useAuth();

  // --- Load existing bundle (view/edit) ----------------------------------
  const existingBundle = useLiveQuery(
    () => (bundleId ? db.table<InvestigationRequestBundle>('investigationRequestBundles').get(bundleId) : undefined),
    [bundleId]
  );

  const effectivePatientId = patientId || existingBundle?.patientId;
  const patient = useLiveQuery(
    () => (effectivePatientId ? PatientOps.getById(effectivePatientId) : undefined),
    [effectivePatientId]
  );

  // --- Form state ---------------------------------------------------------
  const [items, setItems] = useState<Record<string, InvestigationRequestItem>>({});
  const [diagnosis, setDiagnosis] = useState('');
  const [affectedSide, setAffectedSide] = useState<'left' | 'right' | 'bilateral' | 'na'>('na');
  const [priority, setPriority] = useState<'routine' | 'urgent' | 'STAT'>('routine');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [clinicianDesignation, setClinicianDesignation] = useState('');
  const [clinicianBleep, setClinicianBleep] = useState('');
  const [crossmatchUnits, setCrossmatchUnits] = useState<number>(2);
  const [printMode, setPrintMode] = useState<PrintMode>('none');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Hydrate state from existing bundle
  useEffect(() => {
    if (!existingBundle) return;
    const map: Record<string, InvestigationRequestItem> = {};
    existingBundle.items.forEach((it) => {
      map[it.code] = it;
    });
    setItems(map);
    setDiagnosis(existingBundle.diagnosis || '');
    setAffectedSide(existingBundle.affectedSide || 'na');
    setPriority(existingBundle.priority);
    setClinicalNotes(existingBundle.clinicalNotes || '');
    setClinicianDesignation(existingBundle.clinicianDesignation || '');
    setClinicianBleep(existingBundle.clinicianBleep || '');
    setSubmitted(existingBundle.status !== 'draft');
  }, [existingBundle]);

  // --- Patient age (for eGFR) --------------------------------------------
  const patientAge = useMemo(() => {
    if (!patient?.dateOfBirth) return 0;
    const dob = new Date(patient.dateOfBirth);
    const diff = Date.now() - dob.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  }, [patient]);

  const patientGender: 'male' | 'female' = patient?.gender === 'female' ? 'female' : 'male';

  // --- Item toggling ------------------------------------------------------
  const toggleItem = (
    category: InvestigationRequestItem['category'],
    group: string,
    code: string,
    name: string
  ) => {
    if (submitted) return;
    setItems((prev) => {
      const next = { ...prev };
      const current = next[code];
      if (current?.ticked) {
        next[code] = { ...current, ticked: false };
      } else {
        next[code] = current
          ? { ...current, ticked: true }
          : {
              id: uuidv4(),
              category,
              group,
              code,
              name,
              ticked: true,
            };
      }
      return next;
    });
  };

  const setItemModifier = (code: string, key: string, value: string | number) => {
    setItems((prev) => {
      const it = prev[code];
      if (!it) return prev;
      return {
        ...prev,
        [code]: {
          ...it,
          modifiers: { ...(it.modifiers || {}), [key]: value },
        },
      };
    });
  };

  // --- eGFR autocalc (if creatinine + age + gender) ----------------------
  // (Live preview when user ticks renal creatinine; result is informational here;
  // the autocalc is wired in ComorbiditiesStep elsewhere.)
  const renalCreatinineCode = 'creatinine';
  const creatinineTicked = items[renalCreatinineCode]?.ticked;
  const sampleCreatinine = 1.0;
  const previewEgfr = useMemo(() => {
    if (!creatinineTicked || !patientAge) return null;
    return calculateEGFR(sampleCreatinine, patientAge, patientGender);
  }, [creatinineTicked, patientAge, patientGender]);

  // --- Save / Submit ------------------------------------------------------
  const buildBundle = (status: 'draft' | 'requested'): Omit<InvestigationRequestBundle, 'createdAt' | 'updatedAt'> & { id: string } => {
    const tickedItems = Object.values(items).filter((it) => it.ticked);
    // Persist crossmatch units onto the crossmatch item, if ticked
    const finalItems = tickedItems.map((it) =>
      it.code === 'crossmatch'
        ? { ...it, modifiers: { ...(it.modifiers || {}), units: crossmatchUnits } }
        : it
    );

    return {
      id: existingBundle?.id || uuidv4(),
      patientId: effectivePatientId!,
      hospitalId: patient?.hospitalId || patient?.registeredHospitalId || 'global',
      sourceModule,
      sourceAssessmentId,
      requestDate: existingBundle?.requestDate || new Date(),
      requestedBy: user?.id || 'unknown',
      requestedByName: user ? `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || (user as any).name || (user as any).email : undefined,
      clinicianDesignation,
      clinicianBleep,
      diagnosis,
      affectedSide,
      priority,
      clinicalNotes,
      items: finalItems,
      status,
    };
  };

  const handleSaveDraft = async () => {
    if (!effectivePatientId) return;
    setSaving(true);
    try {
      const bundle = buildBundle('draft');
      const now = new Date();
      const full: InvestigationRequestBundle = {
        ...bundle,
        createdAt: existingBundle?.createdAt || now,
        updatedAt: now,
      };
      await db.table('investigationRequestBundles').put(full);
      toast.success('Draft saved');
      if (!existingBundle) navigate(`/investigation-requests/${full.id}`, { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (then: PrintMode = 'none') => {
    if (!effectivePatientId) return;
    const tickedCount = Object.values(items).filter((it) => it.ticked).length;
    if (tickedCount === 0) {
      toast.error('Select at least one investigation');
      return;
    }
    setSaving(true);
    try {
      const bundle = buildBundle('requested');
      await InvestigationRequestOps.submitBundle(bundle as InvestigationRequestBundle);
      setSubmitted(true);
      toast.success(`Submitted ${tickedCount} investigation${tickedCount === 1 ? '' : 's'}`);
      if (then !== 'none') {
        setPrintMode(then);
        setTimeout(() => window.print(), 200);
      }
      if (!existingBundle) navigate(`/investigation-requests/${bundle.id}`, { replace: true });
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (mode: PrintMode) => {
    setPrintMode(mode);
    setTimeout(() => window.print(), 200);
  };

  if (!effectivePatientId) {
    return (
      <div className="p-6 text-center text-gray-500">
        <AlertCircle className="w-12 h-12 mx-auto mb-2" />
        No patient selected.
      </div>
    );
  }

  if (!patient) {
    return <div className="p-6 text-center text-gray-500">Loading patient…</div>;
  }

  const tickedItemsArr = Object.values(items).filter((it) => it.ticked);
  const tickedCount = tickedItemsArr.length;

  // For print components
  const bundleForPrint: InvestigationRequestBundle = {
    ...(buildBundle(submitted ? 'requested' : 'draft') as InvestigationRequestBundle),
    createdAt: existingBundle?.createdAt || new Date(),
    updatedAt: new Date(),
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* ------- PRINTABLE AREA ------- */}
      <div className="print-area-thermal" style={{ display: printMode === 'thermal' ? 'block' : 'none' }}>
        <ThermalReceipt80mm bundle={bundleForPrint} patient={patient} />
      </div>
      <div className="print-area-a4" style={{ display: printMode === 'a4' ? 'block' : 'none' }}>
        <A4InvestigationRequestPrint bundle={bundleForPrint} patient={patient} />
      </div>

      {/* ------- SCREEN UI ------- */}
      <div className="screen-only">
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-primary-600" />
            <div>
              <h1 className="text-xl font-bold">Investigation Request</h1>
              <p className="text-sm text-gray-500">
                {patient.firstName} {patient.lastName} · {patient.hospitalNumber} · {patientAge}y {patientGender}
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{tickedCount} selected</div>
            <div className="text-gray-500">
              Status:{' '}
              <span className={submitted ? 'text-green-600 font-medium' : 'text-yellow-600 font-medium'}>
                {existingBundle?.status || 'draft'}
              </span>
            </div>
          </div>
        </div>

        {/* Clinical Header */}
        <div className="bg-white rounded-lg shadow p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Working Diagnosis</span>
            <input
              type="text"
              className="mt-1 w-full border rounded px-2 py-1"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              disabled={submitted}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Affected Side</span>
            <select
              className="mt-1 w-full border rounded px-2 py-1"
              value={affectedSide}
              onChange={(e) => setAffectedSide(e.target.value as any)}
              disabled={submitted}
            >
              <option value="na">N/A</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="bilateral">Bilateral</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Priority</span>
            <select
              className="mt-1 w-full border rounded px-2 py-1"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              disabled={submitted}
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="STAT">STAT</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Clinician Designation</span>
            <input
              type="text"
              className="mt-1 w-full border rounded px-2 py-1"
              value={clinicianDesignation}
              onChange={(e) => setClinicianDesignation(e.target.value)}
              disabled={submitted}
              placeholder="e.g. Surgeon, House Officer"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-gray-700">Clinical Notes</span>
            <textarea
              className="mt-1 w-full border rounded px-2 py-1"
              rows={2}
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              disabled={submitted}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Bleep / Contact</span>
            <input
              type="text"
              className="mt-1 w-full border rounded px-2 py-1"
              value={clinicianBleep}
              onChange={(e) => setClinicianBleep(e.target.value)}
              disabled={submitted}
            />
          </label>
        </div>

        {/* eGFR preview */}
        {creatinineTicked && previewEgfr !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 flex items-center gap-2 text-sm">
            <Calculator className="w-4 h-4 text-blue-600" />
            <span>
              eGFR will auto-calculate from result (CKD-EPI 2021). Sample @ Scr 1.0 mg/dL ⇒{' '}
              <strong>{previewEgfr} mL/min/1.73m²</strong> (CKD stage {ckdStageFromEGFR(previewEgfr!)}).
            </span>
          </div>
        )}

        {/* Catalog categories */}
        {INVESTIGATION_CATALOG.map((cat) => (
          <div key={cat.id} className="bg-white rounded-lg shadow p-4 mb-4">
            <h2 className="text-lg font-bold text-primary-700 flex items-center gap-2 mb-3">
              <Activity className="w-5 h-5" />
              {cat.title}
            </h2>
            {cat.groups.map((grp) => (
              <div key={grp.title} className="mb-4 last:mb-0">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">{grp.title}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {grp.items.map((it) => {
                    const sel = items[it.code]?.ticked || false;
                    return (
                      <div
                        key={it.code}
                        className={`border rounded p-2 transition ${
                          sel ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sel}
                            onChange={() => toggleItem(cat.id as any, grp.title, it.code, it.name)}
                            disabled={submitted}
                            className="mt-0.5"
                          />
                          <span className="text-sm">{it.name}</span>
                        </label>

                        {sel && it.modifierKind === 'side' && (
                          <select
                            title="Anatomical side"
                            aria-label="Anatomical side"
                            className="mt-1 w-full border rounded text-xs px-1 py-0.5"
                            value={(items[it.code]?.modifiers?.side as string) || ''}
                            onChange={(e) => setItemModifier(it.code, 'side', e.target.value)}
                            disabled={submitted}
                          >
                            <option value="">Side…</option>
                            <option value="left">Left</option>
                            <option value="right">Right</option>
                            <option value="bilateral">Bilateral</option>
                          </select>
                        )}
                        {sel && it.modifierKind === 'site' && (
                          <input
                            type="text"
                            placeholder="Site / specimen"
                            className="mt-1 w-full border rounded text-xs px-1 py-0.5"
                            value={(items[it.code]?.modifiers?.site as string) || ''}
                            onChange={(e) => setItemModifier(it.code, 'site', e.target.value)}
                            disabled={submitted}
                          />
                        )}
                        {sel && it.modifierKind === 'units' && it.code === 'crossmatch' && (
                          <input
                            type="number"
                            min={1}
                            max={10}
                            placeholder="Units"
                            className="mt-1 w-full border rounded text-xs px-1 py-0.5"
                            value={crossmatchUnits}
                            onChange={(e) => setCrossmatchUnits(parseInt(e.target.value) || 1)}
                            disabled={submitted}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Action bar */}
        <div className="sticky bottom-0 bg-white border-t shadow-lg p-3 flex flex-wrap gap-2 justify-end">
          {!submitted && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button
                onClick={() => handleSubmit('a4')}
                disabled={saving || tickedCount === 0}
                className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded text-sm"
              >
                <Send className="w-4 h-4" /> Submit & Print A4
              </button>
              <button
                onClick={() => handleSubmit('thermal')}
                disabled={saving || tickedCount === 0}
                className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded text-sm"
              >
                <Printer className="w-4 h-4" /> Submit & Print 80mm
              </button>
            </>
          )}
          {submitted && (
            <>
              <button
                onClick={() => handlePrint('a4')}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm"
              >
                <Printer className="w-4 h-4" /> Print A4
              </button>
              <button
                onClick={() => handlePrint('thermal')}
                className="flex items-center gap-1 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm"
              >
                <Printer className="w-4 h-4" /> Print 80mm Thermal
              </button>
            </>
          )}
        </div>
      </div>

      {/* Print stylesheet */}
      <style>{`
        @media print {
          .screen-only { display: none !important; }
          .print-area-thermal, .print-area-a4 { display: block !important; }
        }
        @media print {
          .print-area-thermal {
            page: thermal80;
          }
        }
        @page thermal80 { size: 80mm auto; margin: 3mm; }
      `}</style>
    </div>
  );
};

export default InvestigationRequestForm;
