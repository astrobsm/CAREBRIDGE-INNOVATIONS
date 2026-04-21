/**
 * Radiology Reader — X-Ray, CT Scan & MRI Interpretation
 * AstroHEALTH Innovations in Healthcare
 *
 * Structured radiologist-level interpretation module.
 * Covers plain X-rays, CT scans (including contrast phases),
 * and MRI sequences across all surgical subspecialties.
 *
 * Reporting follows systematic ABCDE / organ-system approach
 * consistent with Royal College of Radiologists (RCR) standards
 * and ACR reporting templates.
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileImage,
  Upload,
  X,
  Printer,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  FileText,
  RefreshCw,
  ZoomIn,
  Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import type { Patient } from '../../../types';

interface RadiologyReaderProps {
  patient?: Patient | null;
}

type Modality = 'xray' | 'ct' | 'mri';

interface ModalityConfig {
  label: string;
  colour: string;
  bg: string;
  regions: { value: string; label: string }[];
  sequences?: string[];
  phases?: string[];
  systemicFindings: { id: string; label: string; options: string[] }[];
}

// ── Region lists ─────────────────────────────────────────────────────────────
const XRAY_REGIONS = [
  { value: 'chest_pa', label: 'Chest (PA)' },
  { value: 'chest_ap', label: 'Chest (AP / Portable)' },
  { value: 'abdomen', label: 'Abdomen (Erect + Supine)' },
  { value: 'pelvis', label: 'Pelvis' },
  { value: 'skull', label: 'Skull' },
  { value: 'c_spine', label: 'Cervical Spine (C-Spine)' },
  { value: 't_spine', label: 'Thoracic Spine (T-Spine)' },
  { value: 'l_spine', label: 'Lumbar Spine (L-Spine)' },
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'humerus', label: 'Humerus' },
  { value: 'elbow', label: 'Elbow' },
  { value: 'forearm', label: 'Forearm' },
  { value: 'wrist', label: 'Wrist' },
  { value: 'hand', label: 'Hand / Fingers' },
  { value: 'hip', label: 'Hip / Femoral Neck' },
  { value: 'femur', label: 'Femur' },
  { value: 'knee', label: 'Knee' },
  { value: 'tibia_fibula', label: 'Tibia / Fibula' },
  { value: 'ankle', label: 'Ankle' },
  { value: 'foot', label: 'Foot / Toes' },
];

const CT_REGIONS = [
  { value: 'ct_head', label: 'CT Head (Non-contrast)' },
  { value: 'ct_head_contrast', label: 'CT Head (With contrast)' },
  { value: 'ct_neck', label: 'CT Neck' },
  { value: 'ct_chest', label: 'CT Chest (HRCT / Standard)' },
  { value: 'ct_ctpa', label: 'CT Pulmonary Angiogram (CTPA)' },
  { value: 'ct_abdomen_pelvis', label: 'CT Abdomen & Pelvis' },
  { value: 'ct_kub', label: 'CT KUB (Urinary Tract)' },
  { value: 'ct_angiography', label: 'CT Angiography (Peripheral / Aorta)' },
  { value: 'ct_cta_brain', label: 'CTA Brain (Circle of Willis)' },
  { value: 'ct_spine', label: 'CT Spine' },
  { value: 'ct_trauma', label: 'CT Trauma (Whole Body / ATLS)' },
  { value: 'ct_colonoscopy', label: 'CT Colonography (Virtual Colonoscopy)' },
  { value: 'ct_enterography', label: 'CT Enterography' },
  { value: 'ct_bone', label: 'CT Bone / Skeletal Survey' },
];

const MRI_REGIONS = [
  { value: 'mri_brain', label: 'MRI Brain' },
  { value: 'mri_brain_spine', label: 'MRI Brain + Spine' },
  { value: 'mri_spine_c', label: 'MRI Cervical Spine' },
  { value: 'mri_spine_t', label: 'MRI Thoracic Spine' },
  { value: 'mri_spine_l', label: 'MRI Lumbar Spine' },
  { value: 'mri_spine_whole', label: 'MRI Whole Spine' },
  { value: 'mri_breast', label: 'MRI Breast (Bilateral)' },
  { value: 'mri_liver', label: 'MRI Liver (MRCP / Dynamic)' },
  { value: 'mri_prostate', label: 'MRI Prostate (mpMRI)' },
  { value: 'mri_pelvis', label: 'MRI Pelvis' },
  { value: 'mri_rectum', label: 'MRI Rectum (Rectal Cancer Staging)' },
  { value: 'mri_knee', label: 'MRI Knee' },
  { value: 'mri_shoulder', label: 'MRI Shoulder' },
  { value: 'mri_hip', label: 'MRI Hip / Pelvis' },
  { value: 'mri_ankle_foot', label: 'MRI Ankle / Foot' },
  { value: 'mri_wrist', label: 'MRI Wrist / Hand' },
  { value: 'mri_cardiac', label: 'MRI Cardiac (CMR)' },
];

// ── Modality configs ──────────────────────────────────────────────────────────
const modalityConfigs: Record<Modality, ModalityConfig> = {
  xray: {
    label: 'Plain X-Ray',
    colour: 'text-sky-600',
    bg: 'from-sky-600 to-blue-600',
    regions: XRAY_REGIONS,
    systemicFindings: [
      {
        id: 'bony_structures',
        label: 'Bones / Skeleton',
        options: ['No bony abnormality', 'Fracture — displaced', 'Fracture — undisplaced', 'Fracture — pathological', 'Periosteal reaction', 'Lytic lesion', 'Sclerotic lesion', 'Osteoporosis / osteopenia', 'Joint space narrowing', 'Dislocation / subluxation', 'Degenerative changes (osteophytes)', 'Soft tissue calcification'],
      },
      {
        id: 'soft_tissues',
        label: 'Soft Tissues',
        options: ['Normal', 'Soft tissue swelling', 'Subcutaneous emphysema', 'Foreign body visible', 'Gas in soft tissue', 'Haematoma / mass', 'Abscess / gas collection'],
      },
      {
        id: 'lung_fields',
        label: 'Lung Fields (Chest X-Ray)',
        options: ['Clear lung fields', 'Consolidation', 'Collapse / atelectasis', 'Pleural effusion (right)', 'Pleural effusion (left)', 'Bilateral pleural effusions', 'Pneumothorax', 'Tension pneumothorax features', 'Pulmonary oedema (bat-wing pattern)', 'Interstitial shadowing', 'Cavitating lesion', 'Nodule / mass', 'Hilar enlargement', 'Miliary pattern'],
      },
      {
        id: 'mediastinum_heart',
        label: 'Heart & Mediastinum (Chest)',
        options: ['Normal heart size', 'Cardiomegaly (CTR >0.5)', 'Widened mediastinum', 'Tracheal deviation', 'Aortic unfolding / calcification', 'Aortic knuckle prominent', 'Pneumomediastinum', 'Pericardial effusion pattern'],
      },
      {
        id: 'abdomen_bowel',
        label: 'Bowel / Abdomen (AXR)',
        options: ['Normal bowel gas pattern', 'Small bowel obstruction (ladder pattern)', 'Large bowel obstruction', 'Toxic megacolon', 'Free air under diaphragm (perforation)', 'Volvulus pattern', 'Caecal volvulus', 'Sigmoid volvulus (omega sign)', 'Ileus / paralytic pattern', 'Faecal loading / constipation', 'Calcified gallstones', 'Renal calculi', 'Calcified abdominal aortic aneurysm'],
      },
    ],
  },
  ct: {
    label: 'CT Scan',
    colour: 'text-emerald-600',
    bg: 'from-emerald-600 to-teal-600',
    regions: CT_REGIONS,
    phases: [
      'Non-contrast',
      'Arterial phase',
      'Portal venous phase',
      'Delayed / nephrographic phase',
      'Multiphase (arterial + portal venous)',
      'CTPA (pulmonary arterial)',
      'CT Angiography (peripheral)',
      'IV contrast (no specified phase)',
      'Oral + IV contrast',
    ],
    systemicFindings: [
      {
        id: 'brain_ct',
        label: 'Brain / Intracranial (CT Head)',
        options: ['No intracranial abnormality', 'Haemorrhage — extradural (biconvex)', 'Haemorrhage — subdural (crescent)', 'Intracerebral haemorrhage', 'Subarachnoid haemorrhage (SAH)', 'Infarct — acute (hypodense)', 'Infarct — haemorrhagic transformation', 'Contusion', 'Diffuse axonal injury (white matter hypodensity)', 'Cerebral oedema / herniation', 'Hydrocephalus', 'Midline shift', 'Mass / tumour — primary', 'Metastatic lesion(s)', 'Air in intracranial space (pneumocephalus)', 'Skull fracture'],
      },
      {
        id: 'chest_ct',
        label: 'Thorax / Chest (CT)',
        options: ['Clear', 'Pulmonary embolism (filling defect)', 'Saddle embolus', 'Segmental/subsegmental PE', 'Pneumonia / consolidation', 'Lung abscess', 'Pleural effusion', 'Haemothorax', 'Pneumothorax', 'Tension pneumothorax', 'Pulmonary nodule', 'Lung mass', 'Ground glass opacification', 'Fibrosis / honeycombing', 'Emphysema', 'Aortic dissection — Type A', 'Aortic dissection — Type B', 'Rib fractures', 'Sternal fracture', 'Thoracic spine fracture'],
      },
      {
        id: 'abdomen_ct',
        label: 'Abdomen & Pelvis (CT)',
        options: ['No acute pathology', 'Free fluid (haemoperitoneum)', 'Free air (visceral perforation)', 'Bowel obstruction', 'Appendicitis (peri-appendiceal fat stranding)', 'Diverticulitis', 'Pancreatitis (Balthazar grade)', 'Pancreatic necrosis', 'Cholecystitis', 'Choledocholithiasis / biliary obstruction', 'Hepatic lesion / abscess', 'Splenic laceration / haematoma', 'Renal laceration', 'Ureteric calculus', 'AAA / ruptured AAA', 'Mesenteric ischaemia', 'Ovarian / adnexal mass', 'Pelvic collection / abscess', 'Rectal / pelvic tumour', 'Retroperitoneal haematoma', 'Bladder injury'],
      },
      {
        id: 'vascular_ct',
        label: 'Vascular / CTA Findings',
        options: ['Patent vessels — no stenosis', 'Critical stenosis (>70%)', 'Occlusion', 'Aneurysm', 'Pseudo-aneurysm', 'Dissection', 'Thrombosis', 'Arteriovenous fistula', 'Endoleak post-EVAR', 'Graft occlusion'],
      },
      {
        id: 'musculoskeletal_ct',
        label: 'Musculoskeletal (CT)',
        options: ['No acute fracture', 'Fracture — displaced', 'Fracture — comminuted', 'Intra-articular fracture', 'Stress fracture', 'Tumour / bone lesion', 'Avascular necrosis', 'Sacroiliac joint pathology', 'Pelvic ring disruption'],
      },
    ],
  },
  mri: {
    label: 'MRI Scan',
    colour: 'text-violet-600',
    bg: 'from-violet-600 to-purple-600',
    regions: MRI_REGIONS,
    sequences: [
      'T1-weighted',
      'T2-weighted',
      'FLAIR (Fluid Attenuated Inversion Recovery)',
      'DWI / ADC (Diffusion Weighted)',
      'T1 + Gadolinium (post-contrast)',
      'T2* / GRE (haemosiderin-sensitive)',
      'STIR (Short Tau Inversion Recovery)',
      'PD-weighted (Proton Density)',
      'MR Spectroscopy',
      'MR Arthrography',
      'MRCP (biliary / pancreatic)',
      'MR Perfusion',
      'T2 FS (Fat Saturated)',
      'Sagittal + Axial + Coronal',
    ],
    systemicFindings: [
      {
        id: 'brain_mri',
        label: 'Brain / Intracranial (MRI)',
        options: ['No intracranial abnormality', 'Acute infarct (DWI restriction)', 'Subacute / chronic infarct', 'White matter hyperintensities (leukoaraiosis)', 'Demyelination (MS plaques)', 'Glioma', 'Meningioma', 'Acoustic neuroma / vestibular schwannoma', 'Metastases', 'Cerebral abscess', 'Empyema', 'Subdural collection', 'Pituitary adenoma', 'Hydrocephalus', 'Chiari malformation', 'Cavernoma', 'Arteriovenous malformation (AVM)', 'Carotid / MCA stenosis (MRA)'],
      },
      {
        id: 'spine_mri',
        label: 'Spine (MRI)',
        options: ['Normal MRI spine', 'Disc prolapse (herniation)', 'Disc bulge', 'Disc prolapse with cord compression', 'Disc prolapse with root compression', 'Spinal stenosis — cervical', 'Spinal stenosis — lumbar', 'Degenerative disc disease (Modic changes)', 'Spondylolisthesis', 'Fracture / wedge compression', 'Cord signal change (myelopathy)', 'Epidural abscess / collection', 'Tumour — intramedullary', 'Tumour — intradural extramedullary', 'Tumour — extradural', 'Vertebral metastasis', 'Cauda equina compression'],
      },
      {
        id: 'musculoskeletal_mri',
        label: 'Joints / Musculoskeletal (MRI)',
        options: ['No significant abnormality', 'ACL tear (complete)', 'ACL tear (partial)', 'PCL tear', 'Medial meniscus tear', 'Lateral meniscus tear', 'Cartilage defect / chondral lesion', 'Bone marrow oedema', 'Avascular necrosis', 'Osteochondral defect', 'Ligament sprain / tear', 'Tendon tear (partial)', 'Tendon tear (complete)', 'Rotator cuff tear (supraspinatus)', 'Labral tear (shoulder / hip)', 'SLAP lesion', 'Baker\'s cyst / joint effusion', 'Soft tissue tumour / mass', 'Bursitis', 'Nerve entrapment'],
      },
      {
        id: 'abdominal_mri',
        label: 'Abdomen / Pelvis (MRI)',
        options: ['No significant finding', 'Hepatocellular carcinoma (LI-RADS 5)', 'Hepatic haemangioma', 'Focal nodular hyperplasia (FNH)', 'Hepatic adenoma', 'Choledocholithiasis (MRCP)', 'Pancreatic adenocarcinoma', 'IPMN / cystic pancreatic lesion', 'Renal cell carcinoma', 'Adrenal adenoma', 'Adrenal phaeochromocytoma', 'Uterine fibroids', 'Endometriosis', 'Ovarian carcinoma / mass', 'Rectal cancer — T-staging', 'Perirectal fistula / abscess', 'Prostate cancer (PI-RADS)', 'Bladder tumour', 'Retroperitoneal lymphadenopathy'],
      },
    ],
  },
};

// ── Surgical Subspecialty Relevance ──────────────────────────────────────────
const subspecialtyChips = [
  { key: 'general', label: 'General Surgery', colour: 'bg-blue-100 text-blue-800' },
  { key: 'ortho', label: 'Orthopaedics', colour: 'bg-green-100 text-green-800' },
  { key: 'neuro', label: 'Neurosurgery', colour: 'bg-purple-100 text-purple-800' },
  { key: 'thoracic', label: 'Thoracic Surgery', colour: 'bg-sky-100 text-sky-800' },
  { key: 'vascular', label: 'Vascular Surgery', colour: 'bg-red-100 text-red-800' },
  { key: 'urology', label: 'Urology', colour: 'bg-yellow-100 text-yellow-800' },
  { key: 'plastic', label: 'Plastic Surgery', colour: 'bg-pink-100 text-pink-800' },
  { key: 'colorectal', label: 'Colorectal', colour: 'bg-orange-100 text-orange-800' },
  { key: 'hpb', label: 'HPB Surgery', colour: 'bg-teal-100 text-teal-800' },
  { key: 'gynae', label: 'Gynaecology', colour: 'bg-rose-100 text-rose-800' },
];

export default function RadiologyReader({ patient }: RadiologyReaderProps) {
  const [modality, setModality] = useState<Modality>('xray');
  const [image, setImage] = useState<string | null>(null);
  const [region, setRegion] = useState('');
  const [clinicalIndication, setClinicalIndication] = useState('');
  const [technique, setTechnique] = useState('');
  const [comparison, setComparison] = useState('');
  const [selectedFindings, setSelectedFindings] = useState<Record<string, string>>({});
  const [additionalFindings, setAdditionalFindings] = useState('');
  const [impression, setImpression] = useState('');
  const [urgency, setUrgency] = useState<'routine' | 'urgent' | 'critical'>('routine');
  const [selectedSubspecialties, setSelectedSubspecialties] = useState<string[]>([]);
  const [surgicalImplications, setSurgicalImplications] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['findings']);
  const fileRef = useRef<HTMLInputElement>(null);
  const reportDate = format(new Date(), 'PPP p');
  const config = modalityConfigs[modality];

  const toggleSection = (id: string) =>
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );

  const toggleSubspecialty = (key: string) =>
    setSelectedSubspecialties(prev =>
      prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]
    );

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      setImage(ev.target?.result as string);
      setReportGenerated(false);
      toast.success('Imaging loaded. Complete systematic reporting below.');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImage(ev.target?.result as string);
      setReportGenerated(false);
    };
    reader.readAsDataURL(file);
  }, []);

  const updateFinding = (id: string, value: string) =>
    setSelectedFindings(prev => ({ ...prev, [id]: value }));

  const urgencyConfig = {
    routine: { label: 'Routine', bg: 'bg-gray-100 text-gray-700', border: 'border-gray-200' },
    urgent: { label: 'Urgent — Action Required', bg: 'bg-amber-100 text-amber-800', border: 'border-amber-400' },
    critical: { label: 'CRITICAL — Immediate Action', bg: 'bg-red-100 text-red-800', border: 'border-red-500' },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`bg-gradient-to-r ${config.bg} text-white rounded-xl p-4 flex items-center gap-4`}>
        <FileImage className="w-8 h-8 flex-shrink-0" />
        <div>
          <h2 className="font-bold text-lg">Radiology Interpretation Module</h2>
          <p className="text-white/80 text-sm">
            Systematic radiologist reporting with surgical subspecialty context
          </p>
        </div>
      </div>

      {/* Modality Selector */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        {(['xray', 'ct', 'mri'] as Modality[]).map(m => (
          <button
            key={m}
            onClick={() => {
              setModality(m);
              setRegion('');
              setSelectedFindings({});
              setReportGenerated(false);
              setImage(null);
            }}
            className={`flex-1 py-2 px-2 rounded-lg font-medium text-sm transition-all ${
              modality === m
                ? 'bg-white shadow-sm ' + modalityConfigs[m].colour
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {modalityConfigs[m].label}
          </button>
        ))}
      </div>

      {/* Image Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className={`border-2 border-dashed rounded-xl transition-colors ${
          image ? 'border-gray-200' : 'border-indigo-300 hover:border-indigo-400'
        }`}
      >
        {image ? (
          <div className="relative">
            <img
              src={image}
              alt="Radiology"
              className="w-full rounded-xl object-contain max-h-80 bg-black"
            />
            <button
              onClick={() => { setImage(null); setReportGenerated(false); }}
              className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80"
              title="Remove image"
            >
              <X size={14} />
            </button>
            <div className={`absolute bottom-2 left-2 ${config.bg} bg-gradient-to-r text-white text-xs px-2 py-1 rounded`}>
              {config.label} Loaded
            </div>
          </div>
        ) : (
          <div
            className="p-10 text-center cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <FileImage className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
            <p className="text-gray-600 font-medium">Upload {config.label} Image</p>
            <p className="text-sm text-gray-400 mt-1">
              Drag & drop or click — JPG, PNG, DICOM screenshot accepted
            </p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Study Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Region / Study Type *</label>
          <select
            value={region}
            onChange={e => setRegion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            title="Region"
          >
            <option value="">— select region —</option>
            {config.regions.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {modality === 'ct' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contrast Phase</label>
            <select
              value={technique}
              onChange={e => setTechnique(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              title="Contrast Phase"
            >
              <option value="">— select phase —</option>
              {config.phases?.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}

        {modality === 'mri' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Sequences Available</label>
            <select
              value={technique}
              onChange={e => setTechnique(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              title="MRI Sequences"
            >
              <option value="">— select sequences —</option>
              {config.sequences?.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Clinical Indication</label>
          <input
            type="text"
            value={clinicalIndication}
            onChange={e => setClinicalIndication(e.target.value)}
            placeholder="e.g. RIF pain, ? appendicitis"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Comparison Study</label>
          <input
            type="text"
            value={comparison}
            onChange={e => setComparison(e.target.value)}
            placeholder="e.g. CXR 12/01/2025 — no previous"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Surgical Subspecialty Chips */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Surgical Subspecialty Context (select all relevant)
        </label>
        <div className="flex flex-wrap gap-2">
          {subspecialtyChips.map(chip => (
            <button
              key={chip.key}
              onClick={() => toggleSubspecialty(chip.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium border-2 transition-all ${
                selectedSubspecialties.includes(chip.key)
                  ? chip.colour + ' border-current'
                  : 'bg-gray-50 text-gray-500 border-transparent hover:border-gray-300'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Systematic Findings ────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('findings')}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
        >
          <span className="font-semibold text-gray-900 flex items-center gap-2">
            <FileImage size={18} className={config.colour} />
            Systematic Findings
          </span>
          {expandedSections.includes('findings') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {expandedSections.includes('findings') && (
          <div className="p-4 space-y-4">
            {config.systemicFindings.map(section => (
              <div key={section.id}>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {section.label}
                </label>
                <select
                  value={selectedFindings[section.id] || ''}
                  onChange={e => updateFinding(section.id, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  title={section.label}
                >
                  <option value="">— not assessed / not applicable —</option>
                  {section.options.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Additional / Free-Text Findings
              </label>
              <textarea
                value={additionalFindings}
                onChange={e => setAdditionalFindings(e.target.value)}
                rows={3}
                placeholder="Describe any additional findings not covered by the structured options above..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Impression & Surgical Implications ─────────────────────────── */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection('impression')}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
        >
          <span className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" />
            Impression & Surgical Implications
          </span>
          {expandedSections.includes('impression') ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {expandedSections.includes('impression') && (
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Report Urgency
              </label>
              <div className="flex gap-2">
                {(['routine', 'urgent', 'critical'] as const).map(u => (
                  <button
                    key={u}
                    onClick={() => setUrgency(u)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-all ${
                      urgency === u
                        ? urgencyConfig[u].bg + ' ' + urgencyConfig[u].border
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {urgencyConfig[u].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Radiologist Impression *</label>
              <textarea
                value={impression}
                onChange={e => setImpression(e.target.value)}
                rows={3}
                placeholder="Overall radiological impression — prioritise most significant findings first. Include differential diagnoses where appropriate..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Surgical Implications
              </label>
              <textarea
                value={surgicalImplications}
                onChange={e => setSurgicalImplications(e.target.value)}
                rows={2}
                placeholder="e.g. 'Perforated appendicitis with peritonitis — requires urgent laparoscopic appendicectomy. Consent for conversion to open.'"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Recommendations / Further Investigations
              </label>
              <textarea
                value={recommendations}
                onChange={e => setRecommendations(e.target.value)}
                rows={2}
                placeholder="e.g. 'Correlate with tumour markers. MRI staging recommended. Discuss at HPB MDT meeting.'"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Generate Report */}
      <button
        onClick={() => {
          if (!impression.trim()) {
            toast.error('Please enter a radiologist impression before generating the report.');
            return;
          }
          setReportGenerated(true);
          toast.success('Radiology report generated.');
        }}
        className={`w-full py-3 bg-gradient-to-r ${config.bg} text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
      >
        <FileText size={18} />
        Generate Formal Radiology Report
      </button>

      {/* ── Printable Report ──────────────────────────────────────────── */}
      <AnimatePresence>
        {reportGenerated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            id="radiology-report-print"
            className="border-2 border-gray-300 rounded-xl overflow-hidden"
          >
            {/* Report Header */}
            <div className={`bg-gradient-to-r ${config.bg} text-white p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <FileImage size={20} />
                    {config.label} Interpretation Report
                  </h3>
                  <p className="text-white/80 text-sm">AstroHEALTH Radiology Service</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border-2 ${urgencyConfig[urgency].bg} ${urgencyConfig[urgency].border}`}>
                    {urgencyConfig[urgency].label}
                  </span>
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 px-3 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30"
                  >
                    <Printer size={16} />
                    Print
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 bg-white">
              {/* Patient & Study Details */}
              <div className="grid grid-cols-2 gap-3 pb-4 border-b border-gray-200 text-sm">
                <div>
                  <span className="text-gray-500">Patient:</span>{' '}
                  <strong>{patient ? `${patient.firstName} ${patient.lastName}` : 'Not specified'}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Date/Time:</span> <strong>{reportDate}</strong>
                </div>
                {region && (
                  <div>
                    <span className="text-gray-500">Study:</span>{' '}
                    <strong>{config.regions.find(r => r.value === region)?.label || region}</strong>
                  </div>
                )}
                {technique && (
                  <div>
                    <span className="text-gray-500">Technique:</span> <strong>{technique}</strong>
                  </div>
                )}
                {clinicalIndication && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Indication:</span> {clinicalIndication}
                  </div>
                )}
                {comparison && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Comparison:</span> {comparison}
                  </div>
                )}
                {selectedSubspecialties.length > 0 && (
                  <div className="col-span-2 flex flex-wrap gap-1">
                    {selectedSubspecialties.map(key => {
                      const chip = subspecialtyChips.find(c => c.key === key)!;
                      return (
                        <span key={key} className={`px-2 py-0.5 rounded-full text-xs ${chip.colour}`}>
                          {chip.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Findings */}
              <div>
                <h4 className="font-bold text-gray-900 mb-2">FINDINGS</h4>
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {config.systemicFindings
                      .filter(s => selectedFindings[s.id])
                      .map(section => (
                        <tr key={section.id} className="border-b border-gray-100">
                          <td className="py-1.5 pr-4 text-gray-500 font-medium align-top w-40">
                            {section.label}
                          </td>
                          <td className="py-1.5 text-gray-900">{selectedFindings[section.id]}</td>
                        </tr>
                      ))}
                    {additionalFindings && (
                      <tr className="border-b border-gray-100">
                        <td className="py-1.5 pr-4 text-gray-500 font-medium align-top">
                          Additional
                        </td>
                        <td className="py-1.5 text-gray-900 whitespace-pre-wrap">{additionalFindings}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Impression */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-bold text-gray-900 mb-2">IMPRESSION</h4>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{impression}</p>
              </div>

              {/* Surgical Implications */}
              {surgicalImplications && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-bold text-amber-900 mb-2">SURGICAL IMPLICATIONS</h4>
                  <p className="text-sm text-amber-800 leading-relaxed">{surgicalImplications}</p>
                </div>
              )}

              {/* Recommendations */}
              {recommendations && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-bold text-blue-900 mb-2">RECOMMENDATIONS</h4>
                  <p className="text-sm text-blue-800 leading-relaxed">{recommendations}</p>
                </div>
              )}

              {/* Signature */}
              <div className="pt-4 border-t border-gray-200 flex justify-between items-end text-sm">
                <div>
                  <div className="border-b border-gray-900 w-48 mb-1" />
                  <p className="text-gray-500 text-xs">Radiologist / Reporting Clinician Signature</p>
                </div>
                <p className="text-gray-400 text-xs">Generated: {reportDate}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #radiology-report-print, #radiology-report-print * { visibility: visible !important; }
          #radiology-report-print { position: absolute; left: 0; top: 0; width: 100%; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
