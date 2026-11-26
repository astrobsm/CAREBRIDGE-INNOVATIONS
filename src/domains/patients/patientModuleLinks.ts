/**
 * Specialty modules that open with a patient already selected.
 *
 * Each module reads `?patientId=` on its own route and preselects that patient
 * in its picker (or filters its list to them), so the patient hub can send the
 * clinician straight into, say, the wound monitor without choosing the patient
 * a second time.
 */

export interface PatientModuleLink {
  id: string;
  label: string;
  href: string;
}

const MODULES: { id: string; label: string; path: string }[] = [
  { id: 'wound-monitor', label: 'Wound monitor', path: '/wound-monitor' },
  { id: 'burns', label: 'Burns', path: '/burns' },
  { id: 'npwt', label: 'NPWT', path: '/npwt' },
  { id: 'skin-graft', label: 'Skin graft', path: '/skin-graft' },
  { id: 'scar', label: 'Scar', path: '/scar-monitor' },
  { id: 'keloid', label: 'Keloid care', path: '/keloid-care' },
  { id: 'nutrition', label: 'Nutrition', path: '/nutrition' },
  { id: 'limb-salvage', label: 'Limb salvage', path: '/limb-salvage' },
  { id: 'vascular', label: 'PAD / vascular', path: '/vascular' },
  { id: 'lymphoedema', label: 'Lymphoedema', path: '/lymphedema' },
  { id: 'medication-chart', label: 'Medication chart', path: '/medication-chart' },
  { id: 'treatment-plans', label: 'Treatment plans', path: '/treatment-planning' },
];

export function patientModuleLinks(patientId: string): PatientModuleLink[] {
  const q = `?patientId=${encodeURIComponent(patientId)}`;
  return MODULES.map(m => ({ id: m.id, label: m.label, href: `${m.path}${q}` }));
}
