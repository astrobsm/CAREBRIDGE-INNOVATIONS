/**
 * Chief complaints, as a chosen value rather than typed prose.
 *
 * WHY THIS LIST AND NOT A GENERAL ONE
 * A general medical complaint list is useless in a plastic and reconstructive
 * clinic: it offers chest pain and headache and has nothing for a degloving
 * injury or a non-healing donor site. This list is built around what actually
 * walks through the door of a reconstructive and wound-care practice, which is
 * what makes it short enough to scan and specific enough to drive a template.
 *
 * WHY THE COMPLAINT IS A VALUE
 * It is what the encounter is *about*, so it decides which history is worth
 * taking. Typed as prose it can only be read; chosen from a list it can select
 * a template, group a caseload, and drive an audit.
 *
 * 'Other' is always available and always free text. A taxonomy that cannot
 * express the case in front of the clinician gets worked around, and a
 * worked-around taxonomy produces worse data than none.
 */

export interface ComplaintGroup {
  id: string;
  label: string;
  complaints: { id: string; label: string; hint?: string }[];
}

export const COMPLAINT_GROUPS: ComplaintGroup[] = [
  {
    id: 'wounds',
    label: 'Wounds and ulcers',
    complaints: [
      { id: 'diabetic_foot_ulcer', label: 'Diabetic foot ulcer' },
      { id: 'chronic_leg_ulcer', label: 'Chronic leg ulcer', hint: 'Venous, arterial or mixed' },
      { id: 'pressure_ulcer', label: 'Pressure ulcer' },
      { id: 'non_healing_surgical_wound', label: 'Non-healing surgical wound' },
      { id: 'wound_dehiscence', label: 'Wound dehiscence' },
      { id: 'donor_site_problem', label: 'Donor site problem' },
      { id: 'traumatic_wound', label: 'Traumatic wound' },
      { id: 'bite_wound', label: 'Bite wound' },
      { id: 'burn', label: 'Burn' },
    ],
  },
  {
    id: 'infection',
    label: 'Infection',
    complaints: [
      { id: 'abscess', label: 'Abscess' },
      { id: 'cellulitis', label: 'Cellulitis' },
      { id: 'necrotising_concern', label: 'Rapidly spreading infection', hint: 'Query necrotising' },
      { id: 'infected_wound', label: 'Infected wound' },
      { id: 'osteomyelitis', label: 'Suspected osteomyelitis' },
    ],
  },
  {
    id: 'trauma',
    label: 'Trauma',
    complaints: [
      { id: 'hand_injury', label: 'Hand injury' },
      { id: 'facial_injury', label: 'Facial injury' },
      { id: 'degloving', label: 'Degloving injury' },
      { id: 'amputation', label: 'Traumatic amputation' },
      { id: 'soft_tissue_loss', label: 'Soft tissue loss over fracture' },
      { id: 'crush_injury', label: 'Crush injury' },
    ],
  },
  {
    id: 'reconstruction',
    label: 'Reconstruction and review',
    complaints: [
      { id: 'post_op_review', label: 'Post-operative review' },
      { id: 'flap_review', label: 'Flap review' },
      { id: 'graft_review', label: 'Skin graft review' },
      { id: 'reconstruction_planning', label: 'Reconstruction planning' },
      { id: 'contracture_release', label: 'Contracture — for release' },
    ],
  },
  {
    id: 'scar',
    label: 'Scar and keloid',
    complaints: [
      { id: 'keloid', label: 'Keloid' },
      { id: 'hypertrophic_scar', label: 'Hypertrophic scar' },
      { id: 'scar_revision', label: 'For scar revision' },
    ],
  },
  {
    id: 'lumps',
    label: 'Lumps and lesions',
    complaints: [
      { id: 'skin_lesion', label: 'Skin lesion' },
      { id: 'soft_tissue_lump', label: 'Soft tissue lump' },
      { id: 'suspected_malignancy', label: 'Suspected malignancy' },
      { id: 'lesion_excision', label: 'For excision of lesion' },
    ],
  },
  {
    id: 'cosmetic',
    label: 'Aesthetic',
    complaints: [
      { id: 'breast_aesthetic', label: 'Breast — aesthetic', hint: 'Augmentation, reduction, lift' },
      { id: 'abdominoplasty', label: 'Abdominoplasty' },
      { id: 'liposuction', label: 'Liposuction / body contouring' },
      { id: 'rhinoplasty', label: 'Rhinoplasty' },
      { id: 'facial_rejuvenation', label: 'Facial rejuvenation' },
      { id: 'gynaecomastia', label: 'Gynaecomastia' },
      { id: 'cosmetic_other', label: 'Other aesthetic concern' },
    ],
  },
  {
    id: 'vascular',
    label: 'Vascular and lymphatic',
    complaints: [
      { id: 'limb_ischaemia', label: 'Limb ischaemia' },
      { id: 'claudication', label: 'Claudication' },
      { id: 'lymphoedema', label: 'Lymphoedema' },
      { id: 'vascular_malformation', label: 'Vascular malformation' },
    ],
  },
  {
    id: 'congenital',
    label: 'Congenital',
    complaints: [
      { id: 'cleft', label: 'Cleft lip or palate' },
      { id: 'hand_anomaly', label: 'Congenital hand anomaly' },
      { id: 'congenital_other', label: 'Other congenital difference' },
    ],
  },
];

export const OTHER_COMPLAINT = 'other';

/** Flat lookup, for resolving an id back to its label. */
export const COMPLAINT_LABELS: Record<string, string> = (() => {
  const map: Record<string, string> = { [OTHER_COMPLAINT]: 'Other' };
  for (const g of COMPLAINT_GROUPS) {
    for (const c of g.complaints) map[c.id] = c.label;
  }
  return map;
})();

export const complaintLabel = (id: string): string => COMPLAINT_LABELS[id] ?? id;

/** The group a complaint belongs to, for grouping a caseload. */
export function groupOf(complaintId: string): ComplaintGroup | undefined {
  return COMPLAINT_GROUPS.find(g => g.complaints.some(c => c.id === complaintId));
}

/** Free-text search across the taxonomy, for a clinician who types first. */
export function searchComplaints(term: string): { id: string; label: string; group: string }[] {
  const q = term.trim().toLowerCase();
  const out: { id: string; label: string; group: string }[] = [];
  for (const g of COMPLAINT_GROUPS) {
    for (const c of g.complaints) {
      if (!q || c.label.toLowerCase().includes(q) || (c.hint ?? '').toLowerCase().includes(q)) {
        out.push({ id: c.id, label: c.label, group: g.label });
      }
    }
  }
  return out;
}
