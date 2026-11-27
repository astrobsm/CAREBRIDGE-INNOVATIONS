/**
 * Investigations the knowledge base shares, in the investigation catalogue's
 * terms (services/investigationRequestService INVESTIGATION_CATALOG codes).
 * A condition lists these by reference, adding its own reason where needed.
 */
import type { KbInvestigation } from './types';

const t = (id: string, text: string, why: string, kind: KbInvestigation['kind'], catalogueCode?: string, urgency?: KbInvestigation['urgency']): KbInvestigation =>
  ({ id, text, why, kind, catalogueCode, urgency });

export const INV = {
  // Biopsy
  edgeBiopsyDif: t('edge_biopsy_dif', 'Biopsy of the active (inflamed) edge including adjacent skin for histology, PLUS a perilesional biopsy for direct immunofluorescence (DIF)', 'Vasculitis (immune deposits), pyoderma gangrenosum (neutrophilic infiltrate, excludes other causes)', 'biopsy', 'histo_dif', 'soon'),
  wedgeEdgeBiopsy: t('wedge_edge_biopsy', 'Wedge / incisional biopsy of the edge and the base (several sites in a large ulcer)', 'Excludes squamous cell carcinoma, basal cell carcinoma, melanoma and other malignancy in a chronic or atypical ulcer', 'biopsy', 'histo_wound_edge', 'soon'),
  deepIncisional: t('deep_incisional', 'Deep incisional (telescoping) biopsy reaching subcutaneous fat', 'Panniculitis, calciphylaxis (vessel calcification in fat), medium-vessel vasculitis, erythema induratum', 'biopsy', 'histo_deep_incisional', 'soon'),
  punch: t('punch', 'Punch biopsy (4 mm) for histology', 'Diagnosis of a skin lesion or rash', 'biopsy', 'histo_punch', 'soon'),
  excisionBiopsy: t('excision_biopsy', 'Excision biopsy with a 2 mm margin and a cuff of fat (not a shave)', 'Full-thickness specimen for Breslow thickness / diagnosis', 'biopsy', 'histo_excision', 'soon'),
  incisionBiopsy: t('incision_biopsy', 'Incisional or punch biopsy from the thickest / darkest area', 'Large or anatomically difficult lesion (sole, nail unit)', 'biopsy', 'histo_incision', 'soon'),
  specialStains: t('special_stains', 'Tissue for special stains (ZN / Fite for AFB, PAS / Grocott for fungi) and a piece in saline for culture', 'Mycobacterial and deep fungal infection mimic inflammatory ulcers', 'biopsy', 'histo_special_stains'),
  tissueCulture: t('tissue_culture', 'Deep tissue biopsy for bacterial, AFB (TB culture / GeneXpert) and fungal culture', 'Excludes infection before immunosuppression', 'microbiology', 'deep_tissue_culture', 'soon'),
  ihc: t('ihc', 'Immunohistochemistry on the biopsy (e.g. HHV-8 for Kaposi sarcoma, CD34 for DFSP)', 'Confirms the tumour type', 'biopsy', 'immunohistochemistry'),
  // Serology
  ana: t('ana', 'ANA (HEp-2 immunofluorescence) with titre', 'Entry criterion for SLE classification; screens connective tissue disease', 'serology', 'ana'),
  ena: t('ena', 'ENA panel (Ro, La, Sm, RNP, Scl-70, centromere)', 'Defines the connective tissue disease (anti-Scl-70 / anti-centromere in systemic sclerosis)', 'serology', 'ena'),
  dsdna: t('dsdna', 'Anti-dsDNA', 'SLE-specific antibody (6 points, EULAR/ACR 2019)', 'serology', 'dsdna'),
  complement: t('complement', 'Complement C3 and C4', 'Low in active SLE and cryoglobulinaemia (C4 very low)', 'serology', 'complement'),
  rf: t('rf', 'Rheumatoid factor', 'RA; strongly positive in mixed cryoglobulinaemia', 'serology', 'rf'),
  ccp: t('ccp', 'Anti-CCP', 'Specific for rheumatoid arthritis', 'serology', 'anti_ccp'),
  anca: t('anca', 'ANCA with anti-PR3 and anti-MPO', 'ANCA-associated vasculitis (GPA, MPA, EGPA)', 'serology', 'anca', 'soon'),
  cryo: t('cryo', 'Cryoglobulins (blood kept at 37 °C until separated)', 'Cryoglobulinaemic vasculitis; false negative if the sample cools', 'serology', 'cryoglobulins'),
  apl: t('apl', 'Antiphospholipid antibodies: lupus anticoagulant, anticardiolipin, anti-β2-glycoprotein I (repeat at 12 weeks if positive)', 'Antiphospholipid syndrome (livedo, ulcers, thrombosis)', 'serology', 'apl'),
  spep: t('spep', 'Serum protein electrophoresis with immunofixation / free light chains', 'Paraproteinaemia: pyoderma gangrenosum, cryoglobulinaemia, myeloma', 'serology', 'spep'),
  hbv: t('hbv', 'Hepatitis B surface antigen', 'Polyarteritis nodosa and cryoglobulinaemia; screen before immunosuppression', 'serology', 'hbsag'),
  hcv: t('hcv', 'Hepatitis C antibody', 'Commonest cause of mixed cryoglobulinaemia', 'serology', 'hcv'),
  hiv: t('hiv', 'HIV test (with consent and counselling)', 'Kaposi sarcoma, atypical infection, before immunosuppression', 'serology', 'hiv'),
  vdrl: t('vdrl', 'VDRL / RPR', 'Syphilis mimics ulcers and false-positive in antiphospholipid syndrome', 'serology', 'vdrl'),
  // Blood
  fbcFilm: t('fbc', 'Full blood count with differential and film', 'Cytopenias (SLE), eosinophilia (EGPA, drug reaction), leukaemia, sickle cells', 'blood', 'fbc'),
  esrCrp: t('esr_crp', 'ESR and CRP', 'Inflammatory activity', 'blood', 'esr'),
  renal: t('renal', 'Urea, creatinine, electrolytes and eGFR', 'Renal involvement in vasculitis / SLE; calciphylaxis; SCORTEN urea', 'blood', 'creatinine'),
  lft: t('lft', 'Liver function tests', 'Drug reaction, hepatitis, before systemic treatment', 'blood', 'alt'),
  caPhos: t('ca_phos', 'Calcium, phosphate (and PTH where available)', 'Calciphylaxis risk (raised calcium-phosphate product, hyperparathyroidism)', 'blood', 'calcium'),
  glucose: t('glucose', 'HbA1c / blood glucose', 'Diabetes (necrobiosis lipoidica, healing); SCORTEN glucose', 'blood', 'hba1c'),
  hbGenotype: t('hb_genotype', 'Haemoglobin genotype (electrophoresis)', 'Sickle cell disease', 'blood', 'hb_genotype'),
  bicarbonate: t('bicarbonate', 'Serum bicarbonate', 'SCORTEN', 'blood', 'electrolytes', 'urgent'),
  coag: t('coag', 'PT / INR, APTT', 'Warfarin skin necrosis, baseline before lupus anticoagulant testing', 'blood', 'inr'),
  // Bedside / urine
  urineDip: t('urine_dip', 'Urine dipstick for blood and protein, with microscopy for red-cell casts, and blood pressure — same day', 'Renal involvement changes urgency in vasculitis and SLE', 'bedside', 'urinalysis', 'soon'),
  uacr: t('uacr', 'Urine albumin (protein) : creatinine ratio', 'Lupus nephritis (proteinuria over 0.5 g/24 h = 4 points)', 'bedside', 'acr'),
  // Microbiology
  buruliPcr: t('buruli_pcr', 'Swab of the undermined edge (ulcer) or FNA (nodule) for IS2404 PCR and ZN smear', 'Confirms Mycobacterium ulcerans (WHO)', 'microbiology', 'buruli_pcr', 'soon'),
  slitSkin: t('slit_skin', 'Slit-skin smear for AFB (ear lobes and edge of a patch)', 'Grades bacillary load in leprosy (multibacillary if positive)', 'microbiology', 'slit_skin_smear'),
  afb: t('afb', 'AFB smear and GeneXpert MTB/RIF on tissue or pus', 'Cutaneous tuberculosis', 'microbiology', 'genexpert'),
  fungal: t('fungal', 'KOH microscopy and fungal culture of grains / tissue (and Gram stain for actinomycetes)', 'Eumycetoma (fungal) versus actinomycetoma (bacterial) decides treatment', 'microbiology', 'fungal_micro_culture', 'soon'),
  swab: t('swab', 'Wound swab for microscopy, culture and sensitivity (only if clinically infected)', 'Secondary infection', 'microbiology', 'wound_mcs'),
  // Imaging
  cxr: t('cxr', 'Chest X-ray', 'Lung nodules / cavities (GPA), TB, interstitial disease, sarcoid', 'imaging', 'cxr_pa'),
  xrayBone: t('xray_bone', 'X-ray of the underlying bone', 'Bone invasion (Marjolin, mycetoma), osteomyelitis', 'imaging', 'xr_tibfib'),
  doppler: t('doppler', 'ABPI and arterial / venous duplex', 'Excludes arterial disease before compression; venous component', 'imaging', 'abi'),
  usNodes: t('us_nodes', 'Ultrasound of regional lymph nodes ± FNA', 'Nodal spread of SCC / melanoma', 'imaging', 'fnac'),
  mriLocal: t('mri_local', 'MRI of the area', 'Depth and extent (mycetoma, DFSP, bone invasion) before surgery', 'imaging', 'mri_soft_tissue'),
  ctStaging: t('ct_staging', 'Staging CT chest / abdomen / pelvis', 'Nodal or systemic disease suspected', 'imaging', 'ct_iv_contrast'),
  echo: t('echo', 'Echocardiogram (and lung function where available)', 'Pulmonary hypertension / interstitial lung disease in systemic sclerosis', 'imaging', 'tte'),
} as const;
