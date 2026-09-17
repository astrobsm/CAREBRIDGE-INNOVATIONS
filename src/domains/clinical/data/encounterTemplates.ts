/**
 * Encounter templates, one per kind of problem this practice sees.
 *
 * EACH FOLLOWS A FRAMEWORK THAT ALREADY EXISTS
 * None of these structures is invented. The wound template follows TIME
 * (tissue, infection, moisture, edge), the diabetic foot template follows the
 * IWGDF domains (neuropathy, perfusion, ulcer, infection), trauma follows the
 * mechanism-and-timing questions that decide whether a wound can be closed, and
 * the aesthetic template follows the consultation elements that make a
 * cosmetic operation safe to offer. Clinicians already take these histories;
 * the template only stops them being lost in prose.
 *
 * SHORT ON PURPOSE
 * Every field costs a clinic minute. A template that asks forty questions gets
 * abandoned by the third patient of a busy list, and an abandoned template
 * produces worse records than free text. So each asks the smallest set that
 * changes management, and pushes anything deeper into the module that owns it —
 * the PAD module for perfusion, the scar module for keloid measurement, the
 * skin graft module for take.
 */

import type { EncounterTemplate } from './encounterModel';
import {
  DURATION_FIELD, PAIN_FIELDS, SYSTEMIC_FIELD, TETANUS_FIELD,
} from './encounterModel';

export const TEMPLATE_VERSION = '1.0.0';

// ── Chronic wound ───────────────────────────────────────────────────────────

const CHRONIC_WOUND: EncounterTemplate = {
  id: 'chronic_wound',
  name: 'Chronic wound / ulcer',
  summary: 'A wound that has failed to heal, assessed by wound bed, infection, moisture and edge.',
  basis: 'TIME wound bed preparation framework',
  complaints: [
    'chronic_leg_ulcer', 'pressure_ulcer', 'non_healing_surgical_wound',
    'wound_dehiscence', 'donor_site_problem', 'infected_wound',
  ],
  handoffs: [
    { label: 'Measure and photograph in Wound Monitor', route: '/wounds' },
    {
      label: 'Assess perfusion in PAD / Limb Ischaemia', route: '/vascular',
      when: 'Any lower limb ulcer, or absent pulses',
    },
  ],
  sections: [
    {
      id: 'history', title: 'History',
      intent: 'What it is, how long, and what has already been tried.',
      fields: [
        DURATION_FIELD,
        {
          id: 'site', label: 'Site', kind: 'select', important: true,
          options: [
            { value: 'forefoot', label: 'Forefoot' },
            { value: 'midfoot', label: 'Midfoot' },
            { value: 'heel', label: 'Heel', flag: 'amber',
              flagReason: 'The heel has little soft tissue cover and poor collateral perfusion. '
                + 'Heel ulcers heal slowly and carry a higher amputation risk — offload it now.' },
            { value: 'ankle', label: 'Ankle / gaiter area' },
            { value: 'shin', label: 'Shin' },
            { value: 'calf', label: 'Calf' },
            { value: 'sacrum', label: 'Sacrum' },
            { value: 'ischium', label: 'Ischium' },
            { value: 'trochanter', label: 'Greater trochanter' },
          ],
          allowOther: true,
        },
        {
          id: 'cause', label: 'Likely cause', kind: 'select',
          help: 'The single most common reason a wound fails to heal is that the cause was never addressed.',
          options: [
            { value: 'venous', label: 'Venous' },
            { value: 'arterial', label: 'Arterial', flag: 'amber',
              flagReason: 'An arterial ulcer will not heal without perfusion. Assess before dressing choice.' },
            { value: 'mixed', label: 'Mixed arterial and venous', flag: 'amber',
              flagReason: 'Establish the arterial component before applying compression — full '
                + 'compression on an ischaemic limb causes harm.' },
            { value: 'pressure', label: 'Pressure' },
            { value: 'diabetic_neuropathic', label: 'Diabetic / neuropathic' },
            { value: 'post_surgical', label: 'Post-surgical' },
            { value: 'traumatic', label: 'Traumatic' },
            { value: 'unknown', label: 'Not yet established', flag: 'amber',
              flagReason: 'Establish the cause before escalating dressings.' },
          ],
          allowOther: true,
        },
        {
          id: 'previous_treatment', label: 'Already tried', kind: 'multiselect',
          options: [
            { value: 'none', label: 'Nothing yet' },
            { value: 'dressings', label: 'Dressings' },
            { value: 'compression', label: 'Compression' },
            { value: 'offloading', label: 'Offloading' },
            { value: 'antibiotics', label: 'Antibiotics' },
            { value: 'debridement', label: 'Debridement' },
            { value: 'npwt', label: 'NPWT' },
            { value: 'graft', label: 'Skin graft' },
          ],
        },
        ...PAIN_FIELDS,
      ],
    },
    {
      id: 'bed', title: 'Wound bed',
      intent: 'Tissue, infection, moisture and edge — the four things that decide the dressing.',
      fields: [
        {
          id: 'tissue', label: 'Tissue in the bed', kind: 'multiselect', important: true,
          options: [
            { value: 'granulation', label: 'Granulation' },
            { value: 'epithelialising', label: 'Epithelialising' },
            { value: 'slough', label: 'Slough' },
            { value: 'necrotic', label: 'Necrotic / eschar', flag: 'amber',
              flagReason: 'Necrotic tissue holds the wound in inflammation. Consider debridement.' },
            { value: 'exposed_tendon', label: 'Exposed tendon', flag: 'amber',
              flagReason: 'Exposed tendon will not granulate if it dries out, and will not take a '
                + 'graft without paratenon. Keep it moist and plan cover.' },
            { value: 'exposed_bone', label: 'Exposed bone', flag: 'amber',
              flagReason: 'Exposed bone implies osteomyelitis until excluded.' },
          ],
        },
        {
          id: 'infection_signs', label: 'Signs of infection', kind: 'multiselect',
          options: [
            { value: 'none', label: 'None' },
            { value: 'erythema', label: 'Spreading erythema' },
            { value: 'warmth', label: 'Warmth' },
            { value: 'purulent', label: 'Purulent discharge' },
            { value: 'odour', label: 'Malodour' },
            { value: 'friable', label: 'Friable, bleeding granulation' },
            { value: 'probe_to_bone', label: 'Probes to bone', flag: 'red',
              flagReason: 'A positive probe-to-bone test makes osteomyelitis very likely.' },
          ],
        },
        {
          id: 'exudate', label: 'Exudate', kind: 'select',
          options: [
            { value: 'none', label: 'None' },
            { value: 'low', label: 'Low' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'heavy', label: 'Heavy' },
          ],
        },
        {
          id: 'edge', label: 'Wound edge', kind: 'select',
          options: [
            { value: 'advancing', label: 'Advancing — epithelium migrating' },
            { value: 'static', label: 'Static' },
            { value: 'rolled', label: 'Rolled / undermined', flag: 'amber',
              flagReason: 'A rolled edge suggests a stalled wound; consider edge debridement.' },
            { value: 'raised_everted', label: 'Raised and everted', flag: 'red',
              flagReason: 'An everted edge in a long-standing ulcer raises the question of '
                + 'malignant change. Consider biopsy.' },
          ],
        },
        {
          id: 'periwound', label: 'Surrounding skin', kind: 'multiselect',
          options: [
            { value: 'healthy', label: 'Healthy' },
            { value: 'macerated', label: 'Macerated' },
            { value: 'dry_scaly', label: 'Dry and scaly' },
            { value: 'hyperkeratotic', label: 'Callus / hyperkeratosis' },
            { value: 'eczema', label: 'Eczema' },
            { value: 'oedema', label: 'Oedema' },
          ],
        },
      ],
    },
  ],
};

// ── Diabetic foot ───────────────────────────────────────────────────────────

const DIABETIC_FOOT: EncounterTemplate = {
  id: 'diabetic_foot',
  name: 'Diabetic foot ulcer',
  summary: 'Neuropathy, perfusion, ulcer and infection — the four questions that decide the foot.',
  basis: 'IWGDF assessment domains',
  complaints: ['diabetic_foot_ulcer', 'osteomyelitis'],
  handoffs: [
    { label: 'Grade perfusion and limb threat in PAD / Limb Ischaemia', route: '/vascular' },
    { label: 'Measure and photograph in Wound Monitor', route: '/wounds' },
    { label: 'Full limb salvage scoring', route: '/limb-salvage', when: 'When amputation is being considered' },
  ],
  sections: [
    {
      id: 'context', title: 'Diabetes and risk',
      intent: 'The background that decides whether this foot heals.',
      fields: [
        DURATION_FIELD,
        {
          id: 'glycaemic_control', label: 'Glycaemic control', kind: 'select', important: true,
          options: [
            { value: 'good', label: 'Good — HbA1c under 7.5%' },
            { value: 'fair', label: 'Fair — 7.5 to 8.5%' },
            { value: 'poor', label: 'Poor — above 8.5%', flag: 'amber',
              flagReason: 'Hyperglycaemia impairs neutrophil function and collagen synthesis, and '
                + 'measurably slows healing.' },
            { value: 'unknown', label: 'Not known', flag: 'amber',
              flagReason: 'Check an HbA1c — it changes the healing outlook.' },
          ],
        },
        {
          id: 'previous_ulcer', label: 'Previous foot ulcer or amputation', kind: 'select',
          options: [
            { value: 'none', label: 'Neither' },
            { value: 'previous_ulcer', label: 'Previous ulcer', flag: 'amber',
              flagReason: 'A previous ulcer is the strongest predictor of another.' },
            { value: 'previous_amputation', label: 'Previous amputation', flag: 'amber',
              flagReason: 'Previous amputation places this foot in the highest risk category.' },
          ],
        },
      ],
    },
    {
      id: 'neuropathy', title: 'Neuropathy',
      intent: 'A foot that cannot feel injury will keep sustaining it.',
      fields: [
        {
          id: 'monofilament', label: '10 g monofilament', kind: 'select', important: true,
          help: 'Loss of protective sensation is the single most useful bedside test here.',
          options: [
            { value: 'felt_all', label: 'Felt at all sites' },
            { value: 'reduced', label: 'Reduced', flag: 'amber',
              flagReason: 'Reduced sensation still means this foot under-reports injury. Offload '
                + 'and educate as for established neuropathy.' },
            { value: 'absent', label: 'Not felt — protective sensation lost', flag: 'amber',
              flagReason: 'Loss of protective sensation. This foot needs offloading and education, '
                + 'and will not warn the patient of further injury.' },
            { value: 'not_done', label: 'Not tested' },
          ],
        },
        {
          id: 'neuropathic_symptoms', label: 'Symptoms', kind: 'multiselect',
          options: [
            { value: 'none', label: 'None' },
            { value: 'numbness', label: 'Numbness' },
            { value: 'burning', label: 'Burning' },
            { value: 'tingling', label: 'Tingling' },
            { value: 'night_worse', label: 'Worse at night' },
          ],
        },
        {
          id: 'deformity', label: 'Foot deformity', kind: 'multiselect',
          options: [
            { value: 'none', label: 'None' },
            { value: 'clawing', label: 'Clawed toes' },
            { value: 'prominent_heads', label: 'Prominent metatarsal heads' },
            { value: 'charcot', label: 'Charcot deformity', flag: 'red',
              flagReason: 'A hot, swollen, deformed neuropathic foot may be acute Charcot '
                + 'neuroarthropathy — it needs immediate offloading and imaging, not a dressing.' },
            { value: 'hallux_valgus', label: 'Hallux valgus' },
            { value: 'amputation_change', label: 'Altered by previous amputation' },
          ],
        },
      ],
    },
    {
      id: 'perfusion', title: 'Perfusion',
      intent: 'Ask it here, grade it in the PAD module.',
      fields: [
        {
          id: 'pulses', label: 'Foot pulses', kind: 'select', important: true,
          options: [
            { value: 'both_present', label: 'Both palpable' },
            { value: 'one_present', label: 'One palpable', flag: 'amber',
              flagReason: 'A single palpable pulse does not guarantee perfusion to the ulcer — it '
                + 'depends which angiosome the wound sits in. Measure rather than assume.' },
            { value: 'absent', label: 'Neither palpable', flag: 'red',
              flagReason: 'Absent pedal pulses with tissue loss is chronic limb-threatening '
                + 'ischaemia until proven otherwise. Assess perfusion formally.' },
            { value: 'not_assessed', label: 'Not assessed' },
          ],
        },
        {
          id: 'rest_pain', label: 'Ischaemic rest pain', kind: 'boolean',
          help: 'Forefoot pain at night, relieved by hanging the foot out of bed.',
        },
      ],
    },
    {
      id: 'ulcer', title: 'Ulcer and infection',
      intent: 'Depth and infection decide urgency more than size does.',
      fields: [
        {
          id: 'site', label: 'Site', kind: 'select', important: true,
          options: [
            { value: 'toe', label: 'Toe' },
            { value: 'plantar_forefoot', label: 'Plantar forefoot' },
            { value: 'metatarsal_head', label: 'Under a metatarsal head' },
            { value: 'midfoot', label: 'Midfoot' },
            { value: 'heel', label: 'Heel', flag: 'amber',
              flagReason: 'The heel has little soft tissue cover and poor collateral perfusion. '
                + 'Heel ulcers heal slowly and carry a higher amputation risk — offload it now.' },
            { value: 'dorsum', label: 'Dorsum' },
          ],
          allowOther: true,
        },
        {
          id: 'depth', label: 'Depth', kind: 'select', important: true,
          options: [
            { value: 'superficial', label: 'Superficial — skin only' },
            { value: 'deep_soft_tissue', label: 'Into subcutaneous tissue' },
            { value: 'tendon', label: 'Tendon visible', flag: 'amber',
              flagReason: 'An ulcer down to tendon is deep enough that osteomyelitis should be '
                + 'actively excluded rather than assumed absent.' },
            { value: 'bone_joint', label: 'Bone or joint involved', flag: 'red',
              flagReason: 'Bone or joint involvement means osteomyelitis is likely and the foot '
                + 'needs urgent multidisciplinary assessment.' },
          ],
        },
        {
          id: 'infection', label: 'Infection', kind: 'select', important: true,
          options: [
            { value: 'none', label: 'None' },
            { value: 'mild', label: 'Mild — skin and subcutaneous only' },
            { value: 'moderate', label: 'Deeper or extensive erythema', flag: 'amber',
              flagReason: 'Moderate infection in a diabetic foot usually needs admission, imaging '
                + 'and surgical review rather than oral antibiotics alone.' },
            { value: 'severe', label: 'With systemic upset', flag: 'red',
              flagReason: 'A diabetic foot infection with systemic features is a surgical '
                + 'emergency. Admit and escalate.' },
          ],
        },
        {
          id: 'gangrene', label: 'Gangrene', kind: 'select',
          options: [
            { value: 'none', label: 'None' },
            { value: 'dry_toe', label: 'Dry, confined to a toe', flag: 'amber',
              flagReason: 'Dry gangrene of a toe may be allowed to demarcate — but only once '
                + 'perfusion has been assessed and infection excluded.' },
            { value: 'wet', label: 'Wet gangrene', flag: 'red',
              flagReason: 'Wet gangrene needs urgent surgical assessment.' },
            { value: 'extensive', label: 'Beyond the toes', flag: 'red',
              flagReason: 'Gangrene beyond the toes threatens the foot. Urgent vascular and '
                + 'surgical assessment.' },
          ],
        },
        SYSTEMIC_FIELD,
      ],
    },
  ],
};

// ── Trauma ──────────────────────────────────────────────────────────────────

const TRAUMA: EncounterTemplate = {
  id: 'trauma',
  name: 'Acute traumatic wound',
  summary: 'Mechanism, timing and contamination — the three things that decide whether it can be closed.',
  basis: 'Standard acute wound assessment',
  complaints: [
    'traumatic_wound', 'hand_injury', 'facial_injury', 'degloving',
    'crush_injury', 'soft_tissue_loss', 'amputation', 'bite_wound',
  ],
  sections: [
    {
      id: 'mechanism', title: 'Mechanism and timing',
      intent: 'What did it, when, and how dirty.',
      fields: [
        {
          id: 'mechanism', label: 'Mechanism', kind: 'select', important: true,
          options: [
            { value: 'sharp', label: 'Sharp / incised' },
            { value: 'blunt', label: 'Blunt' },
            { value: 'crush', label: 'Crush', flag: 'amber',
              flagReason: 'Crush injury carries a risk of compartment syndrome and of delayed '
                + 'tissue death beyond what is visible.' },
            { value: 'degloving', label: 'Degloving', flag: 'amber',
              flagReason: 'Degloved skin often dies despite looking viable. Assess carefully.' },
            { value: 'avulsion', label: 'Avulsion' },
            { value: 'bite_human', label: 'Human bite', flag: 'amber',
              flagReason: 'Human bites are heavily contaminated and should not be closed primarily.' },
            { value: 'bite_animal', label: 'Animal bite', flag: 'amber',
              flagReason: 'Consider rabies risk and antibiotic prophylaxis.' },
            { value: 'burn', label: 'Burn' },
            { value: 'high_pressure', label: 'High-pressure injection', flag: 'red',
              flagReason: 'High-pressure injection injury looks trivial and is a surgical '
                + 'emergency. Refer immediately.' },
            { value: 'gunshot', label: 'Gunshot' },
            { value: 'road_traffic', label: 'Road traffic' },
          ],
          allowOther: true,
        },
        {
          id: 'time_since', label: 'Time since injury', kind: 'select', important: true,
          help: 'This is what decides primary closure.',
          options: [
            { value: 'under_6h', label: 'Under 6 hours' },
            { value: '6_12h', label: '6 to 12 hours' },
            { value: '12_24h', label: '12 to 24 hours', flag: 'amber',
              flagReason: 'Approaching the limit for primary closure. Debride thoroughly and '
                + 'consider delayed primary closure instead.' },
            { value: 'over_24h', label: 'Over 24 hours', flag: 'amber',
              flagReason: 'Beyond 24 hours primary closure is usually unwise. Consider delayed '
                + 'primary closure after debridement.' },
          ],
        },
        {
          id: 'contamination', label: 'Contamination', kind: 'select', important: true,
          options: [
            { value: 'clean', label: 'Clean' },
            { value: 'soil', label: 'Soil or organic matter', flag: 'amber',
              flagReason: 'Soil contamination raises clostridial and tetanus risk. Thorough '
                + 'debridement, and do not close primarily.' },
            { value: 'water', label: 'Fresh or sea water' },
            { value: 'sewage', label: 'Sewage or faecal', flag: 'red',
              flagReason: 'Grossly contaminated. Leave open, debride, and cover broadly.' },
            { value: 'foreign_body', label: 'Retained foreign body', flag: 'amber',
              flagReason: 'Image before closing if a radio-opaque foreign body is possible.' },
          ],
        },
        TETANUS_FIELD,
      ],
    },
    {
      id: 'assessment', title: 'The injury',
      intent: 'What is damaged beneath the skin.',
      fields: [
        {
          id: 'structures', label: 'Structures involved', kind: 'multiselect', important: true,
          options: [
            { value: 'skin_only', label: 'Skin only' },
            { value: 'fat', label: 'Subcutaneous fat' },
            { value: 'muscle', label: 'Muscle' },
            { value: 'tendon', label: 'Tendon', flag: 'amber',
              flagReason: 'Document which tendon and the resting posture before anaesthetic — a '
                + 'divided tendon is easily missed once the hand is numb.' },
            { value: 'nerve', label: 'Nerve', flag: 'amber',
              flagReason: 'Record the sensory deficit now. Repair outcomes depend on early '
                + 'recognition, and a deficit found later cannot be dated.' },
            { value: 'vessel', label: 'Vessel', flag: 'red',
              flagReason: 'Vascular injury — assess distal perfusion now.' },
            { value: 'bone', label: 'Bone / open fracture', flag: 'red',
              flagReason: 'An open fracture needs antibiotics, tetanus cover and urgent '
                + 'orthopaedic and plastic surgical assessment.' },
            { value: 'joint', label: 'Joint', flag: 'amber',
              flagReason: 'A wound communicating with a joint needs washout — a septic joint '
                + 'destroys cartilage within days.' },
          ],
        },
        {
          id: 'neurovascular', label: 'Distal neurovascular status', kind: 'select', important: true,
          options: [
            { value: 'intact', label: 'Intact' },
            { value: 'sensory_deficit', label: 'Sensory deficit', flag: 'amber',
              flagReason: 'Map and document the deficit before exploration, so a later change can '
                + 'be attributed.' },
            { value: 'motor_deficit', label: 'Motor deficit', flag: 'red',
              flagReason: 'A motor deficit implies nerve or tendon division, or an evolving '
                + 'compartment syndrome. Explore rather than observe.' },
            { value: 'vascular_compromise', label: 'Vascular compromise', flag: 'red',
              flagReason: 'Threatened distal perfusion. This is time-critical.' },
            { value: 'not_assessed', label: 'Not assessed', flag: 'amber',
              flagReason: 'Distal neurovascular status must be documented before any wound is closed.' },
          ],
        },
        {
          id: 'compartment', label: 'Compartment syndrome concern', kind: 'boolean',
          help: 'Pain on passive stretch, tense compartment, pain out of proportion.',
        },
        ...PAIN_FIELDS,
      ],
    },
  ],
};

// ── Soft tissue infection ───────────────────────────────────────────────────

const SOFT_TISSUE_INFECTION: EncounterTemplate = {
  id: 'soft_tissue_infection',
  name: 'Soft tissue infection',
  summary: 'Separating cellulitis and abscess from the infection that needs theatre tonight.',
  basis: 'Standard severity assessment, with necrotising features surfaced explicitly',
  complaints: ['abscess', 'cellulitis', 'necrotising_concern'],
  sections: [
    {
      id: 'history', title: 'History',
      fields: [
        DURATION_FIELD,
        {
          id: 'progression', label: 'Rate of progression', kind: 'select', important: true,
          options: [
            { value: 'slow', label: 'Slow, over days' },
            { value: 'steady', label: 'Steady' },
            { value: 'rapid', label: 'Rapid, over hours', flag: 'red',
              flagReason: 'Infection advancing over hours suggests a necrotising process. '
                + 'Surgical assessment now.' },
          ],
        },
        ...PAIN_FIELDS,
        SYSTEMIC_FIELD,
      ],
    },
    {
      id: 'examination', title: 'Examination',
      intent: 'The findings that separate cellulitis from something that needs theatre.',
      fields: [
        {
          id: 'local_signs', label: 'Local findings', kind: 'multiselect', important: true,
          options: [
            { value: 'erythema', label: 'Erythema' },
            { value: 'fluctuance', label: 'Fluctuance — collection' },
            { value: 'induration', label: 'Woody induration', flag: 'amber',
              flagReason: 'Induration extending beyond the visible erythema suggests the process '
                + 'is deeper than the skin.' },
            { value: 'crepitus', label: 'Crepitus', flag: 'red',
              flagReason: 'Crepitus indicates gas in the tissues. Surgical emergency.' },
            { value: 'bullae', label: 'Bullae', flag: 'red',
              flagReason: 'Haemorrhagic bullae are a late sign of necrotising infection.' },
            { value: 'skin_necrosis', label: 'Skin necrosis', flag: 'red',
              flagReason: 'Skin necrosis in a spreading infection is a late necrotising sign. '
                + 'Theatre, not another dose of antibiotics.' },
            { value: 'anaesthetic_skin', label: 'Anaesthetic overlying skin', flag: 'red',
              flagReason: 'Loss of sensation over the affected skin suggests the cutaneous nerves '
                + 'have been destroyed — a necrotising process.' },
            { value: 'lymphangitis', label: 'Lymphangitis' },
          ],
        },
        {
          id: 'demarcated', label: 'Is the edge marked and dated?', kind: 'boolean',
          help: 'Marking the edge is the only way to know tomorrow whether it is advancing.',
        },
      ],
    },
  ],
};

// ── Aesthetic consultation ──────────────────────────────────────────────────

const AESTHETIC: EncounterTemplate = {
  id: 'aesthetic',
  name: 'Aesthetic consultation',
  summary: 'Concern, motivation, expectation and fitness — what makes an operation safe to offer.',
  basis: 'Standard aesthetic consultation elements, including a psychological screen',
  complaints: [
    'breast_aesthetic', 'abdominoplasty', 'liposuction', 'rhinoplasty',
    'facial_rejuvenation', 'gynaecomastia', 'cosmetic_other', 'scar_revision',
  ],
  sections: [
    {
      id: 'concern', title: 'The concern',
      intent: 'In the patient’s own terms, and what they want changed.',
      fields: [
        {
          id: 'area', label: 'Area of concern', kind: 'select', important: true,
          options: [
            { value: 'breast', label: 'Breast' },
            { value: 'abdomen', label: 'Abdomen' },
            { value: 'flanks', label: 'Flanks / contour' },
            { value: 'nose', label: 'Nose' },
            { value: 'face', label: 'Face' },
            { value: 'eyelids', label: 'Eyelids' },
            { value: 'chest', label: 'Male chest' },
            { value: 'scar', label: 'A scar' },
          ],
          allowOther: true,
        },
        {
          id: 'patient_words', label: 'What the patient wants changed', kind: 'text',
          important: true,
          placeholder: 'In their own words',
          help: 'Record the patient’s description, not a translation of it into surgical terms.',
        },
        {
          id: 'duration_concern', label: 'How long has this concerned them?', kind: 'select',
          options: [
            { value: 'under_6m', label: 'Under 6 months', flag: 'amber',
              flagReason: 'A recent-onset concern warrants asking what changed. Consider whether '
                + 'a life event is driving the request.' },
            { value: '6m_2y', label: '6 months to 2 years' },
            { value: 'over_2y', label: 'Over 2 years' },
            { value: 'lifelong', label: 'As long as they remember' },
          ],
        },
      ],
    },
    {
      id: 'motivation', title: 'Motivation and expectation',
      intent: 'The part of the consultation that most often predicts a dissatisfied patient.',
      fields: [
        {
          id: 'motivation', label: 'Motivation', kind: 'select', important: true,
          options: [
            { value: 'self', label: 'For themselves' },
            { value: 'partner', label: 'At a partner’s suggestion', flag: 'amber',
              flagReason: 'Surgery sought for someone else’s benefit is associated with '
                + 'dissatisfaction. Explore before proceeding.' },
            { value: 'event', label: 'For a specific upcoming event', flag: 'amber',
              flagReason: 'Check the timeline is realistic and that the motivation survives the event.' },
            { value: 'career', label: 'Career-related' },
            { value: 'function', label: 'Functional symptoms as well' },
          ],
          allowOther: true,
        },
        {
          id: 'expectation', label: 'Expectation of the result', kind: 'select', important: true,
          options: [
            { value: 'realistic', label: 'Realistic and specific' },
            { value: 'vague', label: 'Vague', flag: 'amber',
              flagReason: 'A patient who cannot say what a good result looks like cannot recognise one.' },
            { value: 'unrealistic', label: 'Unrealistic', flag: 'red',
              flagReason: 'Unrealistic expectation is the strongest predictor of a dissatisfied '
                + 'patient. Do not proceed on the basis that surgery will change it.' },
            { value: 'life_change', label: 'Expects it to change their life circumstances', flag: 'red',
              flagReason: 'Expecting surgery to resolve relationship, career or social difficulty '
                + 'is a contraindication until addressed.' },
          ],
        },
        {
          id: 'preoccupation', label: 'Preoccupation with the perceived defect', kind: 'select',
          help: 'A brief screen. Marked preoccupation with a minimal defect warrants psychological '
            + 'assessment before surgery is offered.',
          options: [
            { value: 'proportionate', label: 'Proportionate to the finding' },
            { value: 'considerable', label: 'Considerable — thinks about it daily', flag: 'amber',
              flagReason: 'Daily preoccupation warrants exploring how much of the distress the '
                + 'operation can realistically relieve.' },
            {
              value: 'disproportionate', label: 'Disproportionate to a minimal finding',
              flag: 'red',
              flagReason: 'Marked preoccupation with a minimal or absent defect raises body '
                + 'dysmorphic disorder, in which surgery characteristically makes matters worse. '
                + 'Psychological assessment before any operation is offered.',
            },
          ],
        },
        {
          id: 'previous_aesthetic', label: 'Previous aesthetic surgery', kind: 'select',
          options: [
            { value: 'none', label: 'None' },
            { value: 'satisfied', label: 'Yes — satisfied' },
            { value: 'dissatisfied', label: 'Yes — dissatisfied', flag: 'amber',
              flagReason: 'Dissatisfaction with previous surgery predicts dissatisfaction with '
                + 'the next. Establish what went wrong before offering more.' },
            { value: 'multiple_revisions', label: 'Multiple revisions', flag: 'red',
              flagReason: 'A history of repeated revisions rarely ends with one more operation. '
                + 'Establish what is driving the dissatisfaction first.' },
          ],
        },
      ],
    },
    {
      id: 'fitness', title: 'Fitness for surgery',
      fields: [
        {
          id: 'smoking', label: 'Smoking', kind: 'select', important: true,
          options: [
            { value: 'never', label: 'Never' },
            { value: 'ex', label: 'Ex-smoker' },
            { value: 'current', label: 'Current smoker', flag: 'red',
              flagReason: 'Smoking markedly increases flap and wound complications. Most '
                + 'aesthetic procedures should be deferred until the patient has stopped.' },
          ],
        },
        {
          id: 'bmi_band', label: 'BMI', kind: 'select',
          options: [
            { value: 'under_18', label: 'Under 18.5', flag: 'amber',
              flagReason: 'Low BMI impairs wound healing and, in body contouring, gives a poor '
                + 'aesthetic result. Consider nutritional assessment.' },
            { value: '18_25', label: '18.5 to 25' },
            { value: '25_30', label: '25 to 30' },
            { value: '30_35', label: '30 to 35', flag: 'amber',
              flagReason: 'Wound and thromboembolic complication rates are already rising at this '
                + 'range. Discuss it explicitly as part of consent.' },
            { value: 'over_35', label: 'Over 35', flag: 'amber',
              flagReason: 'Complication rates rise materially. Discuss weight optimisation first.' },
          ],
        },
        {
          id: 'weight_stable', label: 'Weight stable for 6 months', kind: 'boolean',
          help: 'Body contouring on an unstable weight gives an unstable result.',
        },
      ],
    },
  ],
};

// ── Lump or lesion ──────────────────────────────────────────────────────────

const LUMP: EncounterTemplate = {
  id: 'lump',
  name: 'Lump or skin lesion',
  summary: 'The features that separate a lesion for reassurance from one for urgent biopsy.',
  complaints: ['skin_lesion', 'soft_tissue_lump', 'suspected_malignancy', 'lesion_excision'],
  handoffs: [
    { label: 'Stage and plan in Tumour Board', route: '/tumour-board', when: 'If malignancy is confirmed or strongly suspected' },
  ],
  sections: [
    {
      id: 'history', title: 'History',
      fields: [
        DURATION_FIELD,
        {
          id: 'growth', label: 'Change in size', kind: 'select', important: true,
          options: [
            { value: 'static', label: 'Unchanged' },
            { value: 'slow', label: 'Slowly growing' },
            { value: 'rapid', label: 'Rapidly growing', flag: 'red',
              flagReason: 'Rapid growth warrants urgent assessment and a tissue diagnosis.' },
            { value: 'fluctuating', label: 'Fluctuates in size' },
            { value: 'shrinking', label: 'Getting smaller' },
          ],
        },
        {
          id: 'symptoms', label: 'Associated features', kind: 'multiselect',
          options: [
            { value: 'none', label: 'None' },
            { value: 'pain', label: 'Painful' },
            { value: 'bleeding', label: 'Bleeds', flag: 'amber',
              flagReason: 'A lesion that bleeds spontaneously is a suspicious feature. Biopsy '
                + 'rather than observe.' },
            { value: 'ulcerated', label: 'Ulcerated', flag: 'amber',
              flagReason: 'Ulceration of a skin lesion is a suspicious feature and raises the '
                + 'stage if malignant.' },
            { value: 'itch', label: 'Itches' },
            { value: 'colour_change', label: 'Changed colour', flag: 'amber',
              flagReason: 'Change in colour is one of the classic features of melanoma. Assess '
                + 'against the full ABCDE criteria.' },
            { value: 'weight_loss', label: 'Weight loss', flag: 'red',
              flagReason: 'Constitutional symptoms with a soft tissue mass require urgent workup.' },
          ],
        },
        {
          id: 'risk_factors', label: 'Risk factors', kind: 'multiselect',
          options: [
            { value: 'none', label: 'None' },
            { value: 'sun_exposure', label: 'Chronic sun exposure' },
            { value: 'previous_skin_cancer', label: 'Previous skin cancer', flag: 'amber',
              flagReason: 'A previous skin cancer markedly raises the probability that this lesion '
                + 'is another. Examine the whole skin.' },
            { value: 'immunosuppression', label: 'Immunosuppressed', flag: 'amber',
              flagReason: 'Skin cancers in immunosuppressed patients are commoner, more aggressive '
                + 'and more likely to recur.' },
            { value: 'family_history', label: 'Family history' },
            { value: 'albinism', label: 'Albinism', flag: 'amber',
              flagReason: 'Very high lifetime risk of cutaneous malignancy. Examine the whole skin '
                + 'and reinforce sun protection.' },
            { value: 'chronic_wound', label: 'Arose in a chronic wound or scar', flag: 'red',
              flagReason: 'A lesion arising in a long-standing wound or scar raises Marjolin ulcer. Biopsy.' },
          ],
        },
      ],
    },
    {
      id: 'examination', title: 'Examination',
      fields: [
        {
          id: 'size', label: 'Largest diameter', kind: 'number', unit: 'cm',
          min: 0, max: 60, important: true,
        },
        {
          id: 'depth_relation', label: 'Relation to deep structures', kind: 'select',
          options: [
            { value: 'mobile', label: 'Freely mobile' },
            { value: 'tethered', label: 'Tethered to skin' },
            { value: 'fixed_deep', label: 'Fixed to deep structures', flag: 'red',
              flagReason: 'Fixity to deep structures suggests infiltration.' },
            { value: 'subfascial', label: 'Deep to fascia', flag: 'amber',
              flagReason: 'Any soft tissue mass deep to fascia should be imaged before biopsy.' },
          ],
        },
        {
          id: 'nodes', label: 'Regional lymph nodes', kind: 'select',
          options: [
            { value: 'not_palpable', label: 'Not palpable' },
            { value: 'palpable_soft', label: 'Palpable, soft' },
            { value: 'palpable_firm', label: 'Palpable, firm or fixed', flag: 'red',
              flagReason: 'Firm or fixed regional nodes suggest metastatic spread.' },
          ],
        },
      ],
    },
  ],
};

// ── Post-operative review ───────────────────────────────────────────────────

const POST_OP: EncounterTemplate = {
  id: 'post_op',
  name: 'Post-operative review',
  summary: 'How the reconstruction is doing, and what needs to change.',
  complaints: ['post_op_review', 'flap_review', 'graft_review'],
  handoffs: [
    { label: 'Measure graft take in Skin Graft Monitor', route: '/skin-graft' },
    { label: 'Follow the scar in Scar & Keloid Monitor', route: '/scar-monitor' },
  ],
  sections: [
    {
      id: 'status', title: 'Current status',
      fields: [
        {
          id: 'pod', label: 'Postoperative day', kind: 'number', unit: 'days',
          min: 0, max: 400, important: true,
        },
        {
          id: 'wound_status', label: 'Wound', kind: 'select', important: true,
          options: [
            { value: 'healing', label: 'Healing as expected' },
            { value: 'slow', label: 'Slow to heal', flag: 'amber',
              flagReason: 'Work through the reversible causes — perfusion, infection, nutrition, '
                + 'glycaemic control and tension — rather than waiting longer.' },
            { value: 'dehisced', label: 'Dehisced', flag: 'amber',
              flagReason: 'Establish whether this is superficial or a full-thickness failure '
                + 'before deciding between dressing and return to theatre.' },
            { value: 'infected', label: 'Infected', flag: 'amber',
              flagReason: 'Consider whether a collection needs drainage. Antibiotics alone rarely '
                + 'resolve an infected surgical wound with pus in it.' },
            { value: 'necrosis', label: 'Necrosis', flag: 'red',
              flagReason: 'Wound necrosis needs debridement and a reassessment of perfusion and '
                + 'tension at the closure.' },
          ],
        },
        {
          id: 'flap_graft', label: 'Flap or graft', kind: 'select',
          options: [
            { value: 'not_applicable', label: 'Not applicable' },
            { value: 'healthy', label: 'Healthy' },
            { value: 'partial_loss', label: 'Partial loss', flag: 'amber',
              flagReason: 'Record the proportion lost against the original area so the trend is '
                + 'measurable, and look for the cause — pressure, shear, infection or perfusion.' },
            { value: 'venous_congestion', label: 'Venous congestion', flag: 'red',
              flagReason: 'A congested flap is a surgical emergency in the first days. '
                + 'Re-explore rather than observe.' },
            { value: 'arterial_insufficiency', label: 'Pale, poor refill', flag: 'red',
              flagReason: 'Arterial insufficiency — return to theatre.' },
            { value: 'total_loss', label: 'Total loss', flag: 'red',
              flagReason: 'Establish why before reconstructing again — a second flap into an '
                + 'unrecognised cause fails the same way.' },
          ],
        },
        {
          id: 'complications', label: 'Complications', kind: 'multiselect',
          options: [
            { value: 'none', label: 'None' },
            { value: 'haematoma', label: 'Haematoma' },
            { value: 'seroma', label: 'Seroma' },
            { value: 'infection', label: 'Infection' },
            { value: 'donor_problem', label: 'Donor site problem' },
            { value: 'contracture', label: 'Contracture' },
          ],
        },
        ...PAIN_FIELDS,
      ],
    },
  ],
};

// ── Burn ────────────────────────────────────────────────────────────────────

const BURN: EncounterTemplate = {
  id: 'burn',
  name: 'Burn',
  summary: 'Mechanism, depth, extent and the airway — in that order of urgency.',
  complaints: ['burn'],
  handoffs: [{ label: 'Full burns assessment', route: '/burns' }],
  sections: [
    {
      id: 'injury', title: 'The burn',
      fields: [
        {
          id: 'mechanism', label: 'Mechanism', kind: 'select', important: true,
          options: [
            { value: 'scald', label: 'Scald' },
            { value: 'flame', label: 'Flame', flag: 'amber',
              flagReason: 'Flame burns in an enclosed space carry inhalation risk.' },
            { value: 'contact', label: 'Contact' },
            { value: 'chemical', label: 'Chemical', flag: 'amber',
              flagReason: 'Chemical burns need prolonged irrigation and the agent identified.' },
            { value: 'electrical', label: 'Electrical', flag: 'red',
              flagReason: 'Electrical injury can cause deep tissue and cardiac damage invisible '
                + 'at the surface. ECG and observation.' },
            { value: 'friction', label: 'Friction' },
          ],
        },
        {
          id: 'enclosed_space', label: 'Enclosed space or facial burn', kind: 'boolean',
          help: 'Soot in the nostrils, singed nasal hair, hoarseness.',
        },
        {
          id: 'time_since', label: 'Time since injury', kind: 'select', important: true,
          options: [
            { value: 'under_1h', label: 'Under an hour' },
            { value: '1_6h', label: '1 to 6 hours' },
            { value: '6_24h', label: '6 to 24 hours' },
            { value: 'over_24h', label: 'Over 24 hours' },
          ],
        },
        {
          id: 'tbsa', label: 'Estimated TBSA', kind: 'number', unit: '%',
          min: 0, max: 100, important: true,
          help: 'Exclude simple erythema from the estimate.',
        },
        {
          id: 'depth', label: 'Deepest area', kind: 'select', important: true,
          options: [
            { value: 'superficial', label: 'Superficial' },
            { value: 'superficial_partial', label: 'Superficial partial thickness' },
            { value: 'deep_partial', label: 'Deep partial thickness', flag: 'amber',
              flagReason: 'Deep partial thickness burns usually need excision and grafting, and '
                + 'scar badly if left to heal by secondary intention.' },
            { value: 'full', label: 'Full thickness', flag: 'amber',
              flagReason: 'Full thickness burn will not re-epithelialise. Plan excision and cover, '
                + 'and refer to a burns service.' },
          ],
        },
        {
          id: 'circumferential', label: 'Circumferential burn', kind: 'boolean',
          help: 'Of a limb, digit or the chest.',
        },
        TETANUS_FIELD,
      ],
    },
  ],
};

// ── Keloid and scar ─────────────────────────────────────────────────────────

const SCAR: EncounterTemplate = {
  id: 'scar',
  name: 'Scar or keloid',
  summary: 'Symptoms, growth and previous treatment. Measurement happens in the scar module.',
  complaints: ['keloid', 'hypertrophic_scar', 'contracture_release'],
  handoffs: [
    { label: 'Measure and follow in Scar & Keloid Monitor', route: '/scar-monitor' },
  ],
  sections: [
    {
      id: 'history', title: 'History',
      fields: [
        DURATION_FIELD,
        {
          id: 'cause', label: 'How it started', kind: 'select',
          options: [
            { value: 'surgery', label: 'Surgical incision' },
            { value: 'piercing', label: 'Piercing' },
            { value: 'burn', label: 'Burn' },
            { value: 'trauma', label: 'Trauma' },
            { value: 'acne', label: 'Acne' },
            { value: 'spontaneous', label: 'No recognised injury' },
          ],
          allowOther: true,
        },
        {
          id: 'growth', label: 'Is it still growing?', kind: 'select', important: true,
          options: [
            { value: 'static', label: 'Stable' },
            { value: 'growing', label: 'Still growing', flag: 'amber',
              flagReason: 'An actively growing keloid responds poorly to excision alone. Plan '
                + 'adjuvant therapy, and measure it so growth can be followed.' },
            { value: 'regressing', label: 'Getting smaller' },
          ],
        },
        {
          id: 'beyond_margin', label: 'Extends beyond the original wound?', kind: 'select',
          help: 'This is the distinction between keloid and hypertrophic scar.',
          options: [
            { value: 'yes', label: 'Yes — beyond the original margin' },
            { value: 'no', label: 'No — within the original margin' },
            { value: 'unknown', label: 'Original margin not known' },
          ],
        },
        {
          id: 'symptoms', label: 'Symptoms', kind: 'multiselect',
          options: [
            { value: 'none', label: 'None' },
            { value: 'itch', label: 'Itch' },
            { value: 'pain', label: 'Pain' },
            { value: 'tightness', label: 'Tightness' },
            { value: 'restricts_movement', label: 'Restricts movement', flag: 'amber',
              flagReason: 'A scar limiting movement is a functional problem, not a cosmetic one — '
                + 'record the range of motion and involve therapy early.' },
            { value: 'cosmetic', label: 'Appearance' },
          ],
        },
        {
          id: 'previous_treatment', label: 'Previous treatment', kind: 'multiselect',
          options: [
            { value: 'none', label: 'None' },
            { value: 'steroid', label: 'Intralesional steroid' },
            { value: 'excision', label: 'Excision' },
            { value: 'pressure', label: 'Pressure therapy' },
            { value: 'silicone', label: 'Silicone' },
            { value: 'radiotherapy', label: 'Radiotherapy' },
            { value: 'recurred', label: 'Recurred after treatment', flag: 'amber',
              flagReason: 'Recurrence after excision alone predicts recurrence again. Plan '
                + 'adjuvant therapy with any further surgery.' },
          ],
        },
      ],
    },
  ],
};

// ── Generic ─────────────────────────────────────────────────────────────────

const GENERIC: EncounterTemplate = {
  id: 'generic',
  name: 'General history',
  summary: 'For a presentation with no specific template. Structured where it can be, prose where it cannot.',
  complaints: [],
  sections: [
    {
      id: 'history', title: 'History',
      fields: [
        DURATION_FIELD,
        {
          id: 'onset', label: 'Onset', kind: 'select',
          options: [
            { value: 'sudden', label: 'Sudden' },
            { value: 'gradual', label: 'Gradual' },
            { value: 'intermittent', label: 'Intermittent' },
          ],
        },
        {
          id: 'course', label: 'Course since onset', kind: 'select',
          options: [
            { value: 'improving', label: 'Improving' },
            { value: 'static', label: 'Unchanged' },
            { value: 'worsening', label: 'Worsening', flag: 'amber',
              flagReason: 'A condition worsening despite current management needs the diagnosis '
                + 'revisited, not the same treatment continued.' },
            { value: 'fluctuating', label: 'Fluctuating' },
          ],
        },
        ...PAIN_FIELDS,
        SYSTEMIC_FIELD,
        {
          id: 'narrative', label: 'Anything else', kind: 'text',
          placeholder: 'What the structured fields above do not capture',
        },
      ],
    },
  ],
};

// ── Registry ────────────────────────────────────────────────────────────────

export const TEMPLATES: EncounterTemplate[] = [
  CHRONIC_WOUND, DIABETIC_FOOT, TRAUMA, SOFT_TISSUE_INFECTION,
  AESTHETIC, LUMP, POST_OP, BURN, SCAR, GENERIC,
];

export const getTemplate = (id: string): EncounterTemplate | undefined =>
  TEMPLATES.find(t => t.id === id);
