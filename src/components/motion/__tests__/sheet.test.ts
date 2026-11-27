/**
 * The shared Sheet: presence (exit animation, then onClose), the dismiss policy
 * for Escape / backdrop / swipe, and a guard that keeps the batch-1 dialogs on
 * the Sheet. The suite runs in node with no DOM library, so the close sequence
 * and the dismiss policy are pure functions tested directly, and the wiring
 * inside Sheet.tsx is checked from source.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createCloseController, dismissDecision, SHEET_SIZES, EXIT_FALLBACK_MS, type DismissReason } from '../Sheet';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

describe('Sheet presence: close sequence', () => {
  const make = (reduce: boolean) => {
    const onClose = vi.fn();
    const changes: boolean[] = [];
    const c = createCloseController({ onClose, reduce: () => reduce, onChange: v => changes.push(v) });
    return { c, onClose, changes };
  };

  it('plays the exit first: onClose runs only when the exit animation completes', () => {
    const { c, onClose, changes } = make(false);
    c.request();
    expect(c.closing).toBe(true);
    expect(changes).toEqual([true]);   // content leaves the presence tree, the exit animation starts
    expect(onClose).not.toHaveBeenCalled();
    c.exitComplete();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(c.closing).toBe(false);
  });

  it('closes at once under reduced motion', () => {
    const { c, onClose, changes } = make(true);
    c.request();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(changes).toEqual([]);
    expect(c.closing).toBe(false);
  });

  it('a second request while closing does not call onClose twice', () => {
    const { c, onClose } = make(false);
    c.request(); c.request();
    c.exitComplete(); c.exitComplete();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('an exit the sheet did not start (the parent set open=false) does not call onClose', () => {
    const { c, onClose } = make(false);
    c.exitComplete();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reset() (parent closed it meanwhile) clears the closing state without calling onClose', () => {
    const { c, onClose } = make(false);
    c.request(); c.reset();
    expect(c.closing).toBe(false);
    c.exitComplete();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Sheet wires the controller to AnimatePresence, with a fallback if the exit never finishes', () => {
    const src = read('src/components/motion/Sheet.tsx');
    expect(src).toMatch(/<AnimatePresence onExitComplete=\{\(\) => controller\.exitComplete\(\)\}>/);
    expect(src).toMatch(/const shown = open && !closing;/);
    expect(src).toMatch(/\{shown && \(/);
    expect(src).toMatch(/setTimeout\(\(\) => controller\.exitComplete\(\), EXIT_FALLBACK_MS\)/);
    expect(EXIT_FALLBACK_MS).toBeGreaterThan(400);
    expect(EXIT_FALLBACK_MS).toBeLessThan(1500);
    // Render-prop children get the animated close; the context hook gives it to nested components.
    expect(src).toMatch(/typeof children === 'function' \? children\(close\) : children/);
  });
});

describe('Sheet dismiss policy (Escape, backdrop, swipe)', () => {
  const d = (reason: DismissReason, o: Partial<{ dismissible: boolean; closeOnBackdrop: boolean; dirty: boolean }> = {}) =>
    dismissDecision({ reason, dismissible: true, closeOnBackdrop: true, dirty: false, ...o });

  it('Escape closes a sheet with nothing typed', () => {
    expect(d('escape')).toBe('close');
  });

  it('Escape does nothing while the form holds unsaved input', () => {
    expect(d('escape', { dirty: true })).toBe('ignore');
  });

  it('a backdrop tap or swipe asks before discarding typed data, never silently', () => {
    expect(d('backdrop', { dirty: true })).toBe('confirm');
    expect(d('drag', { dirty: true })).toBe('confirm');
    expect(d('backdrop')).toBe('close');
  });

  it('keeps a dialog that never closed on backdrop that way', () => {
    expect(d('backdrop', { closeOnBackdrop: false })).toBe('ignore');
    expect(d('backdrop', { closeOnBackdrop: false, dirty: true })).toBe('ignore');
  });

  it('dismissible=false: only the dialog\'s own buttons close it', () => {
    for (const r of ['escape', 'backdrop', 'drag'] as const) expect(d(r, { dismissible: false })).toBe('ignore');
    expect(d('button', { dismissible: false, dirty: true })).toBe('close');
  });

  it('the dialog\'s own Cancel / Close button closes straight away, as it always did', () => {
    expect(d('button', { dirty: true })).toBe('close');
  });

  it('Sheet counts typing only inside its own panel, and asks with window.confirm', () => {
    const src = read('src/components/motion/Sheet.tsx');
    expect(src).toMatch(/onInput=\{e => \{ if \(panelRef\.current\?\.contains\(e\.target as Node\)\) typedRef\.current = true; \}\}/);
    expect(src).toMatch(/const dirty = s\.hasUnsavedInput \?\? typedRef\.current;/);
    expect(src).toMatch(/d === 'confirm' && !window\.confirm\(s\.discardMessage\)/);
    expect(src).toMatch(/onEscape: \(\) => requestDismiss\('escape'\)/);
    expect(src).toMatch(/onClick=\{\(\) => requestDismiss\('backdrop'\)\}/);
    expect(src).toMatch(/requestDismiss\('drag'\)/);
    // Swipe-down stays opt-in.
    expect(src).toMatch(/dragToDismiss = false/);
  });

  it('only the top sheet of a stack answers Escape and Tab', () => {
    const src = read('src/components/motion/useFocusTrap.ts');
    expect(src).toMatch(/trapStack\.push\(token\)/);
    expect(src).toMatch(/if \(!isTopTrap\(token\)\) return;/);
    expect(src).toMatch(/trapStack\.splice\(at, 1\)/);
  });

  it('focus returns to the opener even when a field inside autoFocuses', () => {
    // The opener is read while rendering the opening frame; the trap never returns focus into its own panel.
    const sheet = read('src/components/motion/Sheet.tsx');
    expect(sheet).toMatch(/if \(shown && !wasShownRef\.current && typeof document !== 'undefined'\)/);
    expect(sheet).toMatch(/returnFocusRef: openerRef/);
    const trap = read('src/components/motion/useFocusTrap.ts');
    expect(trap).toMatch(/const pickReturn = \(\) => \[recorded, focusedNow\]\.find\(usable\) \?\? null;/);
  });

  it('sizes are whole class names (so Tailwind generates them)', () => {
    for (const [k, v] of Object.entries(SHEET_SIZES)) expect(v).toBe(`max-w-${k}`);
  });
});

/**
 * Batch 1: the daily clinical flow. None of these may go back to a hand-written
 * `fixed inset-0` overlay; each renders its dialogs through the shared Sheet.
 * The number is how many raw overlays a file may still hold, with the reason.
 */
const BATCH_1: Record<string, { sheets: number; rawAllowed?: number; why?: string }> = {
  'src/domains/patients/pages/PatientDetailsPage.tsx': { sheets: 2 },
  'src/domains/clinical/components/clerking/InitialEncounterForm.tsx': { sheets: 1 },
  'src/domains/clinical/components/clerking/FollowUpEncounterForm.tsx': { sheets: 1 },
  'src/domains/clinical/pages/ClinicalEncounterPage.tsx': { sheets: 3 },
  'src/domains/clinical/pages/FollowUpEncounterPage.tsx': { sheets: 1 },
  'src/domains/appointments/components/AppointmentBookingForm.tsx': { sheets: 1 },
  'src/domains/appointments/components/AppointmentDetailModal.tsx': { sheets: 3 },
  'src/domains/appointments/pages/ClinicBookingsManagementPage.tsx': { sheets: 1 },
  'src/domains/surgery/pages/SurgeryListPage.tsx': { sheets: 4 },
  'src/domains/surgery/pages/SurgicalWorkflowPage.tsx': { sheets: 1 },
  'src/domains/surgery/components/DayCaseDischargeModal.tsx': { sheets: 1 },
  'src/domains/post-op-care/components/PostOpCarePlanModal.tsx': { sheets: 1 },
  'src/domains/post-op-care/components/PostOpMonitoringModal.tsx': { sheets: 1 },
  'src/domains/wounds/components/WoundCalibrationPicker.tsx': { sheets: 1 },
  'src/domains/wounds/pages/WoundProgressMonitorPage.tsx': { sheets: 1, rawAllowed: 1, why: 'the full-screen photo viewer (a dark lightbox, not a sheet)' },
  'src/domains/investigations/pages/InvestigationsPage.tsx': { sheets: 3 },
  'src/domains/investigations/pages/UnifiedLabPage.tsx': { sheets: 3 },
  'src/components/investigations/InvestigationApprovalPanel.tsx': { sheets: 1 },
  'src/domains/pharmacy/pages/PharmacyPage.tsx': { sheets: 1 },
  'src/domains/medication-chart/pages/MedicationChartPage.tsx': { sheets: 1 },
  'src/domains/discharge/components/AMADischargeForm.tsx': { sheets: 1 },
  'src/domains/discharge/components/DischargeChecklist.tsx': { sheets: 1 },
  'src/domains/discharge/components/DischargeFormModal.tsx': { sheets: 2 },
  'src/domains/discharge/components/DischargeReadinessAssessment.tsx': { sheets: 1 },
  'src/domains/discharge/components/DischargeSummaryView.tsx': { sheets: 1 },
  'src/domains/discharge/components/FollowUpTracker.tsx': { sheets: 1 },
  'src/domains/discharge/components/PatientEducationSheet.tsx': { sheets: 1 },
  'src/components/common/ExportOptionsModal.tsx': { sheets: 1 },
};

/** Batch 2: treatment plans and clinical cards, specialty monitors, transfusion, wards, nutrition, lab, scanning, calculators. */
const BATCH_2: Record<string, { sheets: number; rawAllowed?: number; why?: string }> = {
  'src/components/clinical/EnhancedTreatmentPlanCard.tsx': { sheets: 5 },
  'src/components/clinical/TreatmentPlanCard.tsx': { sheets: 4 },
  'src/components/clinical/StaffAssignmentModal.tsx': { sheets: 1 },
  'src/domains/burns/components/AIBurnExpert.tsx': { sheets: 1 },
  'src/domains/burns/components/BurnAlertsPanel.tsx': { sheets: 1 },
  'src/domains/burns/components/BurnWoundAssessment.tsx': { sheets: 1 },
  'src/domains/burns/components/VitalsMonitor.tsx': { sheets: 2 },
  'src/domains/burns/pages/BurnsAssessmentPage.tsx': { sheets: 2 },
  'src/domains/burns/pages/EnhancedBurnsAssessmentPage.tsx': { sheets: 2 },
  'src/domains/npwt/pages/NPWTPage.tsx': { sheets: 3 },
  'src/domains/limb-salvage/components/LimbSalvageForm.tsx': { sheets: 1 },
  'src/domains/limb-salvage/pages/LimbSalvagePage.tsx': { sheets: 1 },
  'src/domains/keloid/pages/KeloidCarePlanningPage.tsx': { sheets: 1 },
  'src/domains/scar/pages/ScarMonitorPage.tsx': { sheets: 1 },
  'src/domains/skin-graft/pages/SkinGraftMonitorPage.tsx': { sheets: 1 },
  'src/domains/vascular/pages/VascularAssessmentPage.tsx': { sheets: 1 },
  'src/domains/clinical/pages/BloodTransfusionPage.tsx': { sheets: 8 },
  'src/domains/clinical/components/TransfusionMonitoringChartView.tsx': { sheets: 3 },
  'src/domains/admissions/pages/AdmissionsPage.tsx': { sheets: 2 },
  'src/domains/adt/pages/ADTPage.tsx': { sheets: 1 },
  'src/domains/ward-rounds/components/ClinicSchedulingTab.tsx': { sheets: 1 },
  'src/domains/ward-rounds/pages/WardRoundReviewPage.tsx': { sheets: 1 },
  'src/domains/ward-rounds/pages/WardRoundsPage.tsx': { sheets: 1 },
  'src/domains/nutrition/pages/NutritionPage.tsx': { sheets: 2 },
  'src/domains/nutrition/pages/NutritionPlannerPage.tsx': { sheets: 2 },
  'src/domains/laboratory/pages/LaboratoryPage.tsx': { sheets: 3 },
  'src/components/common/BulkImportModal.tsx': { sheets: 1 },
  'src/components/common/ScanToText.tsx': { sheets: 1 },
  'src/domains/document-scanner/components/DocumentScanner.tsx': { sheets: 1 },
  'src/domains/document-scanner/components/ScannedDocumentsPanel.tsx': { sheets: 1 },
  'src/domains/calculators/pages/ClinicalCalculatorsPage.tsx': { sheets: 1 },
};

describe('batch-1 and batch-2 dialogs stay on the shared Sheet', () => {
  for (const [file, rule] of Object.entries({ ...BATCH_1, ...BATCH_2 })) {
    it(file.replace(/^src\//, ''), () => {
      const src = read(file);
      const raw = src.split('\n').filter(l => /fixed inset-0/.test(l)).length;
      expect(raw, `raw "fixed inset-0" overlays${rule.why ? ` (allowed: ${rule.why})` : ''}`).toBeLessThanOrEqual(rule.rawAllowed ?? 0);
      expect(src).toMatch(/import \{[^}]*\bSheet\b[^}]*\} from '[./]+(components\/)?motion(\/Sheet)?'/);
      expect((src.match(/<Sheet\b/g) || []).length).toBeGreaterThanOrEqual(rule.sheets);
    });
  }

  it('form dialogs in batch 1 never turn on swipe-to-dismiss', () => {
    // Files whose sheets hold fields: none may pass dragToDismiss.
    const forms = [
      'src/domains/clinical/components/clerking/InitialEncounterForm.tsx',
      'src/domains/clinical/components/clerking/FollowUpEncounterForm.tsx',
      'src/domains/appointments/components/AppointmentBookingForm.tsx',
      'src/domains/surgery/components/DayCaseDischargeModal.tsx',
      'src/domains/post-op-care/components/PostOpCarePlanModal.tsx',
      'src/domains/post-op-care/components/PostOpMonitoringModal.tsx',
      'src/domains/wounds/components/WoundCalibrationPicker.tsx',
      'src/domains/pharmacy/pages/PharmacyPage.tsx',
      'src/domains/medication-chart/pages/MedicationChartPage.tsx',
      'src/domains/discharge/components/AMADischargeForm.tsx',
      'src/domains/discharge/components/DischargeFormModal.tsx',
      'src/domains/discharge/components/FollowUpTracker.tsx',
      // batch 2
      'src/components/clinical/EnhancedTreatmentPlanCard.tsx',
      'src/components/clinical/TreatmentPlanCard.tsx',
      'src/domains/burns/components/BurnWoundAssessment.tsx',
      'src/domains/burns/components/VitalsMonitor.tsx',
      'src/domains/burns/pages/BurnsAssessmentPage.tsx',
      'src/domains/burns/pages/EnhancedBurnsAssessmentPage.tsx',
      'src/domains/limb-salvage/components/LimbSalvageForm.tsx',
      'src/domains/keloid/pages/KeloidCarePlanningPage.tsx',
      'src/domains/scar/pages/ScarMonitorPage.tsx',
      'src/domains/skin-graft/pages/SkinGraftMonitorPage.tsx',
      'src/domains/vascular/pages/VascularAssessmentPage.tsx',
      'src/domains/clinical/components/TransfusionMonitoringChartView.tsx',
      'src/domains/adt/pages/ADTPage.tsx',
      'src/domains/ward-rounds/components/ClinicSchedulingTab.tsx',
      'src/domains/ward-rounds/pages/WardRoundReviewPage.tsx',
      'src/domains/ward-rounds/pages/WardRoundsPage.tsx',
      'src/domains/nutrition/pages/NutritionPage.tsx',
      'src/domains/nutrition/pages/NutritionPlannerPage.tsx',
      'src/domains/laboratory/pages/LaboratoryPage.tsx',
      'src/domains/document-scanner/components/DocumentScanner.tsx',
      'src/domains/calculators/pages/ClinicalCalculatorsPage.tsx',
    ];
    for (const f of forms) expect(read(f), f).not.toMatch(/dragToDismiss/);
  });
});
