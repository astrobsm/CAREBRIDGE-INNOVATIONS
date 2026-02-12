/**
 * Soft Tissue Infection / NEC Protocol Page
 * Comprehensive tabbed protocol viewer for Plastic & Reconstructive Surgery
 * Covers: Classifications, LRINEC Score, qSOFA, Lab Panels, Treatment,
 *         Anatomical Locations, Nursing Protocols, Patient Education, CME
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Activity,
  BookOpen,
  Beaker,
  Stethoscope,
  Scissors,
  MapPin,
  Heart,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Info,
  Pill,
  Shield,
  Syringe,
  Thermometer,
  AlertCircle,
  XCircle,
  Clock,
  FileText,
  Users,
} from 'lucide-react';

// Data imports
import {
  STI_CLASSIFICATIONS_DETAIL,
  LRINEC_SCORE_PARAMS,
  LRINEC_INTERPRETATION_TABLE,
  QSOFA_CRITERIA_LIST,
  QSOFA_INTERPRETATION_TABLE,
  LAB_PANELS,
  TREATMENT_PROTOCOLS,
  LOCATION_CONSIDERATIONS,
  NURSING_PROTOCOLS,
  PATIENT_EDUCATION_MODULES,
  STI_CME_ARTICLE,
} from '../data/stiProtocolData';

// ============================================
// TAB DEFINITIONS
// ============================================
const TABS = [
  { id: 'classifications', label: 'Classifications', icon: <Stethoscope size={16} /> },
  { id: 'lrinec', label: 'LRINEC Score', icon: <Activity size={16} /> },
  { id: 'qsofa', label: 'qSOFA', icon: <Thermometer size={16} /> },
  { id: 'labs', label: 'Lab Panels', icon: <Beaker size={16} /> },
  { id: 'treatment', label: 'Treatment', icon: <Pill size={16} /> },
  { id: 'anatomy', label: 'Anatomy', icon: <MapPin size={16} /> },
  { id: 'nursing', label: 'Nursing', icon: <Heart size={16} /> },
  { id: 'education', label: 'Patient Ed', icon: <BookOpen size={16} /> },
  { id: 'cme', label: 'CME', icon: <GraduationCap size={16} /> },
] as const;

type TabId = typeof TABS[number]['id'];

// ============================================
// SEVERITY BADGE COMPONENT
// ============================================
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    mild: 'bg-green-100 text-green-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    severe: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[severity] || 'bg-gray-100 text-gray-800'}`}>
      {severity.toUpperCase()}
    </span>
  );
}

// ============================================
// COLLAPSIBLE SECTION COMPONENT
// ============================================
function CollapsibleSection({ title, children, defaultOpen = false, badge }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-sm">{title}</span>
          {badge}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 border-t border-gray-200">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// CLASSIFICATIONS TAB
// ============================================
function ClassificationsTab() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            Soft tissue infections are classified by depth, microbiology, and clinical severity (Eron Classification I-IV).
            Click a classification to view full details.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {STI_CLASSIFICATIONS_DETAIL.map((cls) => (
          <div
            key={cls.id}
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selected === cls.id ? 'ring-2 ring-primary border-primary' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelected(selected === cls.id ? null : cls.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm">{cls.name}</h3>
              <div className="flex gap-1">
                <SeverityBadge severity={cls.severity} />
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  Eron {cls.eronClass}
                </span>
              </div>
            </div>

            <span className={`inline-block px-2 py-0.5 rounded text-xs mb-2 ${
              cls.category === 'necrotizing' ? 'bg-red-50 text-red-700' :
              cls.category === 'deep' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
            }`}>
              {cls.category}
            </span>

            <AnimatePresence>
              {selected === cls.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Clinical Features</h4>
                      <ul className="space-y-1">
                        {cls.clinicalFeatures.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <CheckCircle2 size={12} className="text-green-500 mt-0.5 shrink-0" />
                            <span className="text-gray-700">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Risk Factors</h4>
                      <div className="flex flex-wrap gap-1">
                        {cls.riskFactors.map((r, i) => (
                          <span key={i} className="px-2 py-0.5 bg-yellow-50 text-yellow-800 rounded text-xs">{r}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Typical Organisms</h4>
                      <ul className="space-y-0.5">
                        {cls.typicalOrganisms.map((o, i) => (
                          <li key={i} className="text-gray-700 text-xs">• {o}</li>
                        ))}
                      </ul>
                    </div>

                    {cls.imaging.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Imaging</h4>
                        {cls.imaging.map((img, i) => (
                          <div key={i} className="bg-gray-50 rounded p-2 mb-1">
                            <p className="font-medium text-xs">{img.modality}</p>
                            <ul className="mt-1 space-y-0.5">
                              {img.findings.map((f, j) => (
                                <li key={j} className="text-gray-600 text-xs">– {f}</li>
                              ))}
                            </ul>
                            <p className="text-xs text-gray-500 mt-1 italic">{img.limitations}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Differential Diagnosis</h4>
                      <div className="flex flex-wrap gap-1">
                        {cls.differentialDiagnosis.map((d, i) => (
                          <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-800 rounded text-xs">{d}</span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-xs uppercase text-gray-500 mb-1">Management Principles</h4>
                      <ul className="space-y-1">
                        {cls.managementPrinciples.map((m, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Syringe size={12} className="text-primary mt-0.5 shrink-0" />
                            <span className="text-gray-700">{m}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// LRINEC SCORE TAB
// ============================================
function LRINECTab() {
  const [scores, setScores] = useState<Record<string, number>>({});

  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);

  const getRiskLevel = () => {
    if (totalScore >= 8) return { level: 'High', color: 'text-red-600 bg-red-50 border-red-200', desc: '> 75% probability of NSTI — EMERGENT SURGICAL EXPLORATION' };
    if (totalScore >= 6) return { level: 'Moderate', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', desc: '50-75% probability — Surgical consultation, consider imaging' };
    return { level: 'Low', color: 'text-green-600 bg-green-50 border-green-200', desc: '< 50% probability — Manage as cellulitis, close follow-up' };
  };

  const risk = getRiskLevel();

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Laboratory Risk Indicator for Necrotizing Fasciitis (Wong et al. 2004)</p>
            <p>Select the appropriate value for each parameter to calculate the LRINEC score.</p>
          </div>
        </div>
      </div>

      {/* Score Calculator */}
      <div className="space-y-3">
        {LRINEC_SCORE_PARAMS.map((param) => (
          <div key={param.parameter} className="border border-gray-200 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-2">{param.parameter}</h4>
            <p className="text-xs text-gray-500 mb-2">{param.rationale}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setScores(prev => ({ ...prev, [param.parameter]: param.lowValue.score }))}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  scores[param.parameter] === param.lowValue.score
                    ? 'bg-green-500 text-white' : 'bg-green-50 text-green-800 hover:bg-green-100'
                }`}
              >
                {param.lowValue.range} ({param.lowValue.score} pts)
              </button>
              {param.mediumValue && (
                <button
                  onClick={() => setScores(prev => ({ ...prev, [param.parameter]: param.mediumValue!.score }))}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    scores[param.parameter] === param.mediumValue.score
                      ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100'
                  }`}
                >
                  {param.mediumValue.range} ({param.mediumValue.score} pts)
                </button>
              )}
              <button
                onClick={() => setScores(prev => ({ ...prev, [param.parameter]: param.highValue.score }))}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  scores[param.parameter] === param.highValue.score
                    ? 'bg-red-500 text-white' : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                {param.highValue.range} ({param.highValue.score} pts)
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Score Result */}
      <div className={`border-2 rounded-lg p-4 ${risk.color}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold">LRINEC Score: {totalScore}/13</span>
          <span className="text-lg font-semibold">{risk.level} Risk</span>
        </div>
        <p className="text-sm">{risk.desc}</p>
      </div>

      {/* Interpretation Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Score</th>
              <th className="px-3 py-2 text-left font-medium">Risk</th>
              <th className="px-3 py-2 text-left font-medium">Probability</th>
              <th className="px-3 py-2 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {LRINEC_INTERPRETATION_TABLE.map((row, i) => (
              <tr key={i} className="border-t border-gray-200">
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 rounded text-xs font-semibold" style={{ backgroundColor: row.color + '20', color: row.color }}>
                    {row.scoreRange}
                  </span>
                </td>
                <td className="px-3 py-2 font-medium">{row.risk}</td>
                <td className="px-3 py-2">{row.probability}</td>
                <td className="px-3 py-2 text-xs">{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Hard Signs Warning */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-semibold mb-1">"Hard Signs" — Mandate Surgical Exploration Regardless of LRINEC</p>
            <ol className="list-decimal ml-4 space-y-0.5 text-xs">
              <li>Crepitus on palpation</li>
              <li>Skin necrosis / ecchymosis</li>
              <li>Gas on imaging</li>
              <li>Hemorrhagic bullae</li>
              <li>Dishwater-gray wound drainage</li>
              <li>Rapidly progressive despite IV antibiotics</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// QSOFA TAB
// ============================================
function QSOFATab() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const score = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold">Quick Sepsis-Related Organ Failure Assessment (qSOFA)</p>
            <p>Bedside screening tool. Score ≥ 2 indicates high risk of poor outcome.</p>
          </div>
        </div>
      </div>

      {/* qSOFA Criteria */}
      <div className="space-y-3">
        {QSOFA_CRITERIA_LIST.map((c) => (
          <label
            key={c.criteria}
            className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition-colors ${
              checked[c.criteria] ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={checked[c.criteria] || false}
              onChange={(e) => setChecked(prev => ({ ...prev, [c.criteria]: e.target.checked }))}
              className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <div className="flex-1">
              <p className="font-medium text-sm">{c.criteria}</p>
              <p className="text-xs text-gray-500">{c.parameter}: {c.threshold}</p>
            </div>
            <span className="text-xs text-gray-500">{c.interpretation}</span>
          </label>
        ))}
      </div>

      {/* Score Result */}
      <div className={`border-2 rounded-lg p-4 ${
        score >= 2 ? 'bg-red-50 border-red-300 text-red-800' : 'bg-green-50 border-green-300 text-green-800'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold">qSOFA Score: {score}/3</span>
          <span className={`text-lg font-semibold ${score >= 2 ? 'text-red-600' : 'text-green-600'}`}>
            {score >= 2 ? 'HIGH RISK' : 'Lower Risk'}
          </span>
        </div>
        {score >= 2 ? (
          <div>
            <p className="text-sm font-medium">Mortality: {QSOFA_INTERPRETATION_TABLE.highRisk.mortality}</p>
            <p className="text-sm">{QSOFA_INTERPRETATION_TABLE.highRisk.action}</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium">Mortality: {QSOFA_INTERPRETATION_TABLE.lowRisk.mortality}</p>
            <p className="text-sm">{QSOFA_INTERPRETATION_TABLE.lowRisk.action}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// LAB PANELS TAB
// ============================================
function LabPanelsTab() {
  return (
    <div className="space-y-4">
      {LAB_PANELS.map((panel) => (
        <CollapsibleSection
          key={panel.id}
          title={panel.name}
          defaultOpen={panel.id === 'initial-sti-workup'}
          badge={
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{panel.frequency}</span>
          }
        >
          <div className="space-y-1">
            <p className="text-xs text-gray-500 mb-2">
              Applicable to: {panel.applicableStages.join(', ')}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-xs">Test</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Rationale</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Expected Abnormality</th>
                    <th className="px-3 py-2 text-left font-medium text-xs">Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {panel.tests.map((test, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-xs">{test.testName}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{test.rationale}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{test.expectedAbnormality || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          test.urgency === 'stat' ? 'bg-red-100 text-red-800' :
                          test.urgency === 'urgent' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {test.urgency.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}

// ============================================
// TREATMENT PROTOCOLS TAB
// ============================================
function TreatmentTab() {
  return (
    <div className="space-y-4">
      {TREATMENT_PROTOCOLS.map((protocol) => (
        <CollapsibleSection
          key={protocol.id}
          title={protocol.stage}
          defaultOpen={protocol.id === 'cellulitis-outpatient'}
          badge={<SeverityBadge severity={protocol.severity} />}
        >
          <div className="space-y-4">
            {/* Antibiotics */}
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-2">
                <Pill size={14} className="text-blue-600" /> Antibiotic Regimens
              </h4>
              <div className="space-y-2">
                {protocol.antibiotics.map((abx, i) => (
                  <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-semibold text-sm text-blue-900">{abx.drug}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        abx.route === 'IV' ? 'bg-red-100 text-red-700' :
                        abx.route === 'IM' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {abx.route}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 mb-1">
                      <strong>Dose:</strong> {abx.dose} | <strong>Freq:</strong> {abx.frequency} | <strong>Duration:</strong> {abx.duration}
                    </p>
                    <p className="text-xs text-gray-600 mb-1">{abx.indication}</p>
                    {abx.alternatives.length > 0 && (
                      <p className="text-xs text-gray-500">
                        <strong>Alternatives:</strong> {abx.alternatives.join('; ')}
                      </p>
                    )}
                    {abx.renalAdjustment && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Renal:</strong> {abx.renalAdjustment}
                      </p>
                    )}
                    {abx.hepaticAdjustment && (
                      <p className="text-xs text-orange-600 mt-1">
                        <strong>Hepatic:</strong> {abx.hepaticAdjustment}
                      </p>
                    )}
                    {abx.contraindications.length > 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        <strong>Contraindications:</strong> {abx.contraindications.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Surgical Interventions */}
            {protocol.surgicalInterventions.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-2">
                  <Scissors size={14} className="text-red-600" /> Surgical Interventions
                </h4>
                <div className="space-y-2">
                  {protocol.surgicalInterventions.map((surg, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <h5 className="font-semibold text-sm text-red-900 mb-1">{surg.procedure}</h5>
                      <p className="text-xs text-gray-700 mb-1"><strong>Indication:</strong> {surg.indication}</p>
                      <p className="text-xs mb-1">
                        <Clock size={10} className="inline mr-1" />
                        <strong>Timing:</strong> {surg.timing}
                      </p>
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Technique:</p>
                        <ol className="list-decimal ml-4 space-y-0.5">
                          {surg.technique.map((t, j) => (
                            <li key={j} className="text-xs text-gray-700">{t}</li>
                          ))}
                        </ol>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Post-Op Care:</p>
                        <ul className="space-y-0.5">
                          {surg.postoperativeCare.map((c, j) => (
                            <li key={j} className="text-xs text-gray-700 flex items-start gap-1">
                              <CheckCircle2 size={10} className="text-green-500 mt-0.5 shrink-0" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 italic">{surg.expectedOutcome}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Supportive Care */}
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-2">
                <Heart size={14} className="text-pink-600" /> Supportive Care
              </h4>
              <ul className="space-y-1">
                {protocol.supportiveCare.map((c, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <CheckCircle2 size={10} className="text-green-500 mt-0.5 shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>

            {/* Monitoring */}
            <div>
              <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-2">
                <Activity size={14} className="text-blue-600" /> Monitoring
              </h4>
              <ul className="space-y-1">
                {protocol.monitoring.map((m, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <Activity size={10} className="text-blue-500 mt-0.5 shrink-0" />
                    {m}
                  </li>
                ))}
              </ul>
            </div>

            {/* Escalation Criteria */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-2 text-orange-800">
                <AlertTriangle size={14} /> Escalation Criteria
              </h4>
              <ul className="space-y-1">
                {protocol.escalationCriteria.map((e, i) => (
                  <li key={i} className="text-xs text-orange-800 flex items-start gap-1.5">
                    <AlertCircle size={10} className="mt-0.5 shrink-0" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>

            {/* Comorbidity Modifications */}
            {protocol.comorbidityModifications.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm flex items-center gap-1.5 mb-2">
                  <Shield size={14} className="text-purple-600" /> Comorbidity Modifications
                </h4>
                {protocol.comorbidityModifications.map((cm, i) => (
                  <CollapsibleSection key={i} title={cm.comorbidity}>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Modifications:</p>
                        <ul className="space-y-0.5">
                          {cm.modifications.map((m, j) => (
                            <li key={j} className="text-xs text-gray-700">• {m}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Additional Monitoring:</p>
                        <ul className="space-y-0.5">
                          {cm.additionalMonitoring.map((m, j) => (
                            <li key={j} className="text-xs text-gray-700">• {m}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Special Considerations:</p>
                        <ul className="space-y-0.5">
                          {cm.specialConsiderations.map((s, j) => (
                            <li key={j} className="text-xs text-orange-700">⚠ {s}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CollapsibleSection>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}

// ============================================
// ANATOMICAL LOCATIONS TAB
// ============================================
function AnatomyTab() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-800">
            Anatomical location significantly affects management and prognosis of soft tissue infections.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {LOCATION_CONSIDERATIONS.map((loc, i) => (
          <CollapsibleSection key={i} title={loc.location} defaultOpen={i === 0}>
            <div className="space-y-3 text-sm">
              <p className="text-xs text-gray-500">{loc.prevalence}</p>

              <div>
                <h5 className="font-semibold text-xs uppercase text-gray-500 mb-1">Risk Factors</h5>
                <div className="flex flex-wrap gap-1">
                  {loc.riskFactors.map((r, j) => (
                    <span key={j} className="px-2 py-0.5 bg-yellow-50 text-yellow-800 rounded text-xs">{r}</span>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-xs uppercase text-gray-500 mb-1">Special Considerations</h5>
                <ul className="space-y-1">
                  {loc.specialConsiderations.map((s, j) => (
                    <li key={j} className="text-xs text-gray-700 flex items-start gap-1.5">
                      <AlertCircle size={10} className="text-orange-500 mt-0.5 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
}

// ============================================
// NURSING PROTOCOLS TAB
// ============================================
function NursingTab() {
  return (
    <div className="space-y-4">
      {NURSING_PROTOCOLS.map((protocol) => (
        <CollapsibleSection
          key={protocol.id}
          title={protocol.topic}
          defaultOpen={protocol.id === 'wound-assessment-nsti'}
        >
          <div className="space-y-3">
            {/* Objectives */}
            <div>
              <h5 className="font-semibold text-xs uppercase text-gray-500 mb-1">Learning Objectives</h5>
              <ul className="space-y-1">
                {protocol.objectives.map((o, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <CheckCircle2 size={10} className="text-green-500 mt-0.5 shrink-0" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>

            {/* Key Points */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h5 className="font-semibold text-xs uppercase text-yellow-800 mb-1">Key Points</h5>
              <ul className="space-y-1">
                {protocol.keyPoints.map((k, i) => (
                  <li key={i} className="text-xs text-yellow-900 flex items-start gap-1.5">
                    <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                    {k}
                  </li>
                ))}
              </ul>
            </div>

            {/* Procedures */}
            {protocol.procedures.map((proc, i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-3">
                <h5 className="font-semibold text-sm mb-2">{proc.name}</h5>
                <p className="text-xs text-gray-500 mb-2">Frequency: {proc.frequency}</p>

                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Steps:</p>
                  <ol className="list-decimal ml-4 space-y-0.5">
                    {proc.steps.map((s, j) => (
                      <li key={j} className="text-xs text-gray-700">{s}</li>
                    ))}
                  </ol>
                </div>

                <div className="mb-2">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Equipment:</p>
                  <div className="flex flex-wrap gap-1">
                    {proc.equipment.map((e, j) => (
                      <span key={j} className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded text-xs">{e}</span>
                    ))}
                  </div>
                </div>

                {proc.precautions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-600 mb-1">Precautions:</p>
                    <ul className="space-y-0.5">
                      {proc.precautions.map((p, j) => (
                        <li key={j} className="text-xs text-red-700">⚠ {p}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}

            {/* Documentation */}
            <div>
              <h5 className="font-semibold text-xs uppercase text-gray-500 mb-1">Documentation Requirements</h5>
              <ul className="space-y-1">
                {protocol.documentation.map((d, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <FileText size={10} className="text-gray-400 mt-0.5 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>

            {/* Escalation Triggers */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h5 className="font-semibold text-xs uppercase text-red-700 mb-1">Escalation Triggers</h5>
              <ul className="space-y-1">
                {protocol.escalationTriggers.map((t, i) => (
                  <li key={i} className="text-xs text-red-800 flex items-start gap-1.5">
                    <XCircle size={10} className="mt-0.5 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}

// ============================================
// PATIENT EDUCATION TAB
// ============================================
function PatientEducationTab() {
  return (
    <div className="space-y-4">
      {PATIENT_EDUCATION_MODULES.map((module) => (
        <CollapsibleSection
          key={module.id}
          title={module.title}
          defaultOpen={module.id === 'cellulitis-patient-ed'}
          badge={
            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">{module.targetAudience}</span>
          }
        >
          <div className="space-y-3">
            {/* Content Sections */}
            {module.content.map((section, i) => (
              <div key={i} className="border-l-4 border-blue-300 pl-3">
                <h5 className="font-semibold text-sm mb-1">{section.heading}</h5>
                <p className="text-xs text-gray-700 leading-relaxed">{section.body}</p>
              </div>
            ))}

            {/* Warning Signs */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h5 className="font-semibold text-xs uppercase text-red-700 mb-1 flex items-center gap-1">
                <AlertTriangle size={12} /> Warning Signs to Report
              </h5>
              <ul className="space-y-1">
                {module.warningSignsToReport.map((w, i) => (
                  <li key={i} className="text-xs text-red-800 flex items-start gap-1.5">
                    <XCircle size={10} className="mt-0.5 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>

            {/* Self-Care */}
            <div>
              <h5 className="font-semibold text-xs uppercase text-gray-500 mb-1">Self-Care Instructions</h5>
              <ul className="space-y-1">
                {module.selfCareInstructions.map((s, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <CheckCircle2 size={10} className="text-green-500 mt-0.5 shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow-Up */}
            <div>
              <h5 className="font-semibold text-xs uppercase text-gray-500 mb-1">Follow-Up Guidance</h5>
              <ul className="space-y-1">
                {module.followUpGuidance.map((f, i) => (
                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                    <Clock size={10} className="text-blue-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}

// ============================================
// CME TAB
// ============================================
function CMETab() {
  const [showQuiz, setShowQuiz] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);

  const article = STI_CME_ARTICLE;
  const totalQuestions = article.mcqQuestions.length;
  const correctCount = article.mcqQuestions.filter(q => answers[q.id] === q.correctAnswer).length;

  return (
    <div className="space-y-4">
      {/* Article Header */}
      <div className="bg-gradient-to-r from-primary/10 to-blue-50 border border-primary/20 rounded-lg p-4">
        <h3 className="font-bold text-lg mb-1">{article.title}</h3>
        <p className="text-sm text-gray-600">{article.authors}</p>
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <GraduationCap size={12} /> {article.cmeCredits} CME Credits
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} /> Updated: {article.lastUpdated}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {article.targetAudience.map((a, i) => (
            <span key={i} className="px-2 py-0.5 bg-white rounded text-xs text-gray-700">{a}</span>
          ))}
        </div>
      </div>

      {/* Abstract */}
      <div className="border border-gray-200 rounded-lg p-3">
        <h4 className="font-semibold text-sm mb-1">Abstract</h4>
        <p className="text-xs text-gray-700 leading-relaxed">{article.abstract}</p>
      </div>

      {/* Learning Objectives */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">Learning Objectives</h4>
        <ol className="list-decimal ml-4 space-y-1">
          {article.learningObjectives.map((obj, i) => (
            <li key={i} className="text-xs text-blue-900">{obj}</li>
          ))}
        </ol>
      </div>

      {/* Article Sections */}
      {article.sections.map((section, i) => (
        <CollapsibleSection key={i} title={section.heading} defaultOpen={i === 0}>
          <div className="text-xs text-gray-700 leading-relaxed whitespace-pre-line">
            {section.content}
          </div>
          {section.references.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-400 font-semibold mb-1">References:</p>
              {section.references.map((ref, j) => (
                <p key={j} className="text-xs text-gray-400 italic">{ref}</p>
              ))}
            </div>
          )}
        </CollapsibleSection>
      ))}

      {/* Toggle Quiz */}
      <div className="flex justify-center">
        <button
          onClick={() => { setShowQuiz(!showQuiz); setShowResults(false); }}
          className="btn btn-primary"
        >
          <GraduationCap size={16} />
          {showQuiz ? 'Hide MCQ Quiz' : 'Take CME Quiz'}
        </button>
      </div>

      {/* MCQ Quiz */}
      <AnimatePresence>
        {showQuiz && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-4 overflow-hidden"
          >
            <h4 className="font-bold text-lg">CME Assessment ({totalQuestions} Questions)</h4>

            {article.mcqQuestions.map((q, qi) => (
              <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2 mb-3">
                  <span className="bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">
                    {qi + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{q.question}</p>
                    <span className={`inline-block text-xs mt-1 px-2 py-0.5 rounded ${
                      q.difficulty === 'basic' ? 'bg-green-100 text-green-700' :
                      q.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {q.difficulty}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 ml-8">
                  {q.options.map((opt, oi) => {
                    const isSelected = answers[q.id] === oi;
                    const isCorrect = oi === q.correctAnswer;
                    const showFeedback = showResults;

                    return (
                      <label
                        key={oi}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm transition-colors ${
                          showFeedback && isCorrect ? 'bg-green-100 border border-green-300' :
                          showFeedback && isSelected && !isCorrect ? 'bg-red-100 border border-red-300' :
                          isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          checked={isSelected}
                          onChange={() => !showResults && setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                          className="w-4 h-4"
                          disabled={showResults}
                        />
                        <span className="text-xs">{String.fromCharCode(65 + oi)}. {opt}</span>
                        {showFeedback && isCorrect && <CheckCircle2 size={14} className="text-green-600 ml-auto" />}
                        {showFeedback && isSelected && !isCorrect && <XCircle size={14} className="text-red-600 ml-auto" />}
                      </label>
                    );
                  })}
                </div>

                {showResults && (
                  <div className={`mt-3 ml-8 p-2 rounded text-xs ${
                    answers[q.id] === q.correctAnswer ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                  }`}>
                    <p className="font-semibold mb-1">
                      {answers[q.id] === q.correctAnswer ? '✓ Correct!' : '✗ Incorrect'}
                    </p>
                    <p>{q.explanation}</p>
                    <p className="mt-1 text-gray-500 italic">{q.reference}</p>
                  </div>
                )}
              </div>
            ))}

            {/* Submit / Results */}
            <div className="flex justify-center gap-3">
              {!showResults ? (
                <button
                  onClick={() => setShowResults(true)}
                  className="btn btn-primary"
                  disabled={Object.keys(answers).length < totalQuestions}
                >
                  Submit Answers ({Object.keys(answers).length}/{totalQuestions} answered)
                </button>
              ) : (
                <div className={`border-2 rounded-lg p-4 text-center w-full ${
                  correctCount >= totalQuestions * 0.7 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                }`}>
                  <p className="text-2xl font-bold">
                    {correctCount} / {totalQuestions} correct ({Math.round(correctCount / totalQuestions * 100)}%)
                  </p>
                  <p className="text-sm mt-1">
                    {correctCount >= totalQuestions * 0.7
                      ? `✓ PASSED — ${article.cmeCredits} CME Credits earned`
                      : '✗ Requires 70% to pass. Review and retry.'
                    }
                  </p>
                  <button
                    onClick={() => { setAnswers({}); setShowResults(false); }}
                    className="btn btn-secondary mt-2"
                  >
                    Retry Quiz
                  </button>
                </div>
              )}
            </div>

            {/* References */}
            <div className="border-t border-gray-200 pt-3">
              <h4 className="font-semibold text-sm mb-2">References</h4>
              <ol className="list-decimal ml-4 space-y-1">
                {article.references.map((ref, i) => (
                  <li key={i} className="text-xs text-gray-600">{ref}</li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function STIProtocolPage() {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as TabId | null;
  const validTabs: TabId[] = TABS.map(t => t.id);
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'classifications';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    if (tabFromUrl && validTabs.includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const renderTab = () => {
    switch (activeTab) {
      case 'classifications': return <ClassificationsTab />;
      case 'lrinec': return <LRINECTab />;
      case 'qsofa': return <QSOFATab />;
      case 'labs': return <LabPanelsTab />;
      case 'treatment': return <TreatmentTab />;
      case 'anatomy': return <AnatomyTab />;
      case 'nursing': return <NursingTab />;
      case 'education': return <PatientEducationTab />;
      case 'cme': return <CMETab />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-500 rounded-xl p-4 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 rounded-lg p-2">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Soft Tissue Infection / NEC Protocol</h1>
            <p className="text-sm text-white/80">
              Comprehensive Protocol for Plastic & Reconstructive Surgery — WHO-Adapted
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-1 min-w-max bg-gray-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        {renderTab()}
      </div>
    </div>
  );
}
