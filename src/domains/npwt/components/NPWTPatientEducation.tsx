/**
 * NPWT Patient Education & Consent Component
 * AstroHEALTH Innovations in Healthcare
 *
 * Comprehensive patient education on Negative Pressure Wound Therapy
 * and a formal consent-to-start document.
 * Written from the perspective of a consultant plastic surgeon
 * and wound care specialist.
 *
 * Print-optimised: click "Print / Save PDF" to generate a PDF
 * via the browser's native print dialogue.
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Wind,
  AlertTriangle,
  CheckCircle2,
  Printer,
  ChevronDown,
  ChevronUp,
  Info,
  Heart,
  Home,
  Phone,
  Shield,
  HelpCircle,
  FileText,
  PenLine,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import type { Patient } from '../../../types';

interface NPWTPatientEducationProps {
  patient?: Patient | null;
  sessionDate?: Date;
  performedBy?: string;
  onClose?: () => void;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

export default function NPWTPatientEducation({
  patient,
  sessionDate,
  performedBy,
  onClose,
}: NPWTPatientEducationProps) {
  const [activeView, setActiveView] = useState<'education' | 'consent'>('education');
  const [expandedSections, setExpandedSections] = useState<string[]>(['what-is-npwt']);
  const [consentChecked, setConsentChecked] = useState<Record<string, boolean>>({});
  const [patientName, setPatientName] = useState(
    patient ? `${patient.firstName} ${patient.lastName}` : ''
  );
  const [guardianName, setGuardianName] = useState('');
  const [consentDate, setConsentDate] = useState(format(sessionDate || new Date(), 'yyyy-MM-dd'));
  const [witnessName, setWitnessName] = useState('');
  const [consentSigned, setConsentSigned] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const toggleSection = (id: string) => {
    setExpandedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const consentItems = [
    { id: 'c1', text: 'I understand what Negative Pressure Wound Therapy (NPWT) is and how it works.' },
    { id: 'c2', text: 'The purpose and expected benefits of NPWT for my wound have been explained to me.' },
    { id: 'c3', text: 'The possible risks and complications of NPWT have been explained to me.' },
    { id: 'c4', text: 'Alternative treatment options have been discussed and I understand why NPWT has been recommended.' },
    { id: 'c5', text: 'I have been given the opportunity to ask questions and all my questions have been answered satisfactorily.' },
    { id: 'c6', text: 'I understand that I may withdraw my consent at any time without this affecting the quality of my care.' },
    { id: 'c7', text: 'I understand the home care instructions and warning signs requiring urgent medical attention.' },
    { id: 'c8', text: 'I agree to attend all scheduled dressing change appointments.' },
    { id: 'c9', text: 'I consent to clinical photographs of my wound being taken for medical record and treatment monitoring purposes.' },
    { id: 'c10', text: 'I give my free and informed consent to proceed with Negative Pressure Wound Therapy as recommended by my surgeon.' },
  ];

  const allConsentChecked =
    consentItems.length > 0 &&
    consentItems.every(item => consentChecked[item.id]);

  const educationSections: Section[] = [
    {
      id: 'what-is-npwt',
      title: 'What is Negative Pressure Wound Therapy (NPWT)?',
      icon: <Wind className="w-5 h-5 text-purple-600" />,
      content: (
        <div className="space-y-3 text-gray-700 leading-relaxed">
          <p>
            Negative Pressure Wound Therapy — sometimes called <strong>vacuum-assisted closure (VAC)</strong> 
            — is a highly specialised wound-management technique used by plastic surgeons and wound care 
            specialists worldwide. As your treating surgeon, I have recommended this therapy because it 
            represents the most advanced, evidence-based approach available for accelerating your wound healing.
          </p>
          <p>
            The treatment works by applying a <strong>sealed foam dressing</strong> to your wound, connected 
            to a small machine that continuously or intermittently draws out wound fluid (exudate), bacteria, 
            and debris through gentle suction. This controlled negative pressure (typically 
            <strong> 80–125 mmHg</strong>) creates an ideal environment for tissue regeneration.
          </p>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" /> What the machine does
            </h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
              <li>Removes excess wound fluid that slows healing</li>
              <li>Reduces swelling (oedema) around the wound</li>
              <li>Draws wound edges together, reducing wound size</li>
              <li>Increases blood flow to the wound bed (angiogenesis)</li>
              <li>Stimulates the growth of healthy pink granulation tissue</li>
              <li>Creates a moist, protected environment that speeds epithelialisation</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 'who-needs-npwt',
      title: 'Why Has My Surgeon Recommended NPWT for Me?',
      icon: <Heart className="w-5 h-5 text-red-500" />,
      content: (
        <div className="space-y-3 text-gray-700 leading-relaxed">
          <p>
            NPWT is recommended when conventional dressings alone are insufficient. Common clinical 
            situations where I recommend this therapy include:
          </p>
          <ul className="space-y-2">
            {[
              'Complex wounds that are too large or deep to heal quickly with simple dressings',
              'Surgical wounds that have opened (dehiscence) following an operation',
              'Diabetic foot ulcers — particularly when bone, tendon, or deep structures are exposed',
              'Pressure injuries (Grade III–IV) that involve deep tissue loss',
              'Traumatic injuries with significant tissue loss',
              'Wounds with heavy exudate (fluid) production that overwhelm standard dressings',
              'Post-operative wounds requiring preparation for skin grafting or flap reconstruction',
              'Wounds in patients whose conditions (such as diabetes or peripheral vascular disease) impair normal healing',
              'Burns requiring wound bed preparation before definitive reconstruction',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm italic text-gray-500">
            Your specific indication has been documented in your clinical notes.
          </p>
        </div>
      ),
    },
    {
      id: 'how-it-works',
      title: 'How the Treatment Works — Step by Step',
      icon: <BookOpen className="w-5 h-5 text-blue-600" />,
      content: (
        <div className="space-y-4 text-gray-700 leading-relaxed">
          {[
            {
              step: '1',
              title: 'Wound Preparation',
              desc: 'Your wound is carefully cleaned with sterile saline, and any non-viable (dead) tissue that would slow healing is gently removed. This is called debridement and is a critical first step.',
            },
            {
              step: '2',
              title: 'Foam Dressing Application',
              desc: 'A specialised foam (polyurethane or polyvinyl alcohol) is precisely cut to fit your wound cavity. This foam acts as the interface between the machine and your wound.',
            },
            {
              step: '3',
              title: 'Sealing the Wound',
              desc: 'A clear adhesive film (Opsite or similar) is applied over the foam and surrounding skin to create an airtight seal. A small suction port is attached through the film.',
            },
            {
              step: '4',
              title: 'Connecting the Machine',
              desc: 'A tube connects the port to the NPWT machine. The machine is then set to deliver negative pressure at the level prescribed by your surgeon — usually 80–125 mmHg continuously or with alternating cycles.',
            },
            {
              step: '5',
              title: 'Dressing Changes',
              desc: 'Your wound will require dressing changes every 3–7 days depending on your wound type and healing progress. Each change is performed under strict sterile technique by your healthcare team.',
            },
            {
              step: '6',
              title: 'Monitoring and Progress',
              desc: 'At each visit, your surgeon or wound care nurse will document wound dimensions, granulation tissue percentage, exudate characteristics, and take photographs to track your healing objectively.',
            },
          ].map(item => (
            <div key={item.step} className="flex gap-4">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                {item.step}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                <p className="text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'what-to-expect',
      title: 'What to Expect During Treatment',
      icon: <Info className="w-5 h-5 text-amber-600" />,
      content: (
        <div className="space-y-3 text-gray-700 leading-relaxed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">Normal Experiences</h4>
              <ul className="space-y-1 text-sm text-green-700">
                <li>• Mild pulling or tugging sensation when machine is active</li>
                <li>• Gentle hissing or motor sound from the machine</li>
                <li>• Slight discomfort during dressing changes (analgesia will be offered)</li>
                <li>• Gradual decrease in wound size with each visit</li>
                <li>• Pink, moist appearance of healthy granulation tissue</li>
                <li>• Darkening of the foam as fluid is removed</li>
                <li>• Canister fills with wound fluid — this is expected and normal</li>
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">Report Immediately</h4>
              <ul className="space-y-1 text-sm text-red-700">
                <li>• Bright red bleeding from the wound</li>
                <li>• Sudden severe pain or worsening pain</li>
                <li>• Foul odour not present before</li>
                <li>• Fever above 38.5°C (101.3°F)</li>
                <li>• Machine alarm that cannot be reset</li>
                <li>• Dressing seal breaking or lifting</li>
                <li>• Wound appears to be enlarging</li>
                <li>• Canister filling very rapidly</li>
              </ul>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Important: Duration of Treatment
            </h4>
            <p className="text-sm text-amber-700">
              The duration of NPWT varies significantly depending on your wound type, size, depth, and 
              individual healing response. Most patients require 2–8 weeks of therapy. Diabetic ulcers 
              and large traumatic wounds may require longer periods. Your surgeon will reassess at every 
              dressing change and will advise when NPWT can be safely discontinued.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'home-care',
      title: 'Living with NPWT — Home Care Instructions',
      icon: <Home className="w-5 h-5 text-teal-600" />,
      content: (
        <div className="space-y-3 text-gray-700 leading-relaxed">
          <p>
            If you are discharged home with an NPWT machine, the following instructions are essential 
            for your safety and the success of your treatment:
          </p>
          <div className="space-y-4">
            {[
              {
                title: 'Machine Care',
                items: [
                  'Keep the machine charged — plug in overnight like a mobile phone',
                  'Carry the portable machine in its bag when moving around',
                  'Do not submerge the machine in water under any circumstances',
                  'Do not attempt to open or repair the machine yourself',
                  'Empty the canister as instructed — typically when ¾ full',
                ],
              },
              {
                title: 'Dressing Care',
                items: [
                  'Do not remove or tamper with the dressing between scheduled changes',
                  'If the seal lifts partially, press it back firmly and inform your nurse',
                  'Protect the dressing area from excessive moisture (shower with waterproof cover)',
                  'Avoid putting pressure directly on the dressing',
                  'Do not apply lotions or powders around the dressing edges',
                ],
              },
              {
                title: 'Activity & Nutrition',
                items: [
                  'Move gently — sudden movements can break the seal or dislodge tubing',
                  'Maintain good nutrition: protein-rich diet (chicken, fish, eggs, beans) supports healing',
                  'Stay well-hydrated — drink at least 8 cups of water daily',
                  'If diabetic, maintain strict blood glucose control (target: 5–10 mmol/L)',
                  'Stop smoking completely — nicotine severely impairs wound healing',
                  'Elevate the affected limb when resting to reduce swelling',
                ],
              },
              {
                title: 'Appointments',
                items: [
                  'Never miss a scheduled dressing change appointment',
                  'Arrive 30 minutes early to allow for analgesia (pain relief) before the change',
                  'Bring any written questions you have for the wound care team',
                  'Inform the team of any changes in wound appearance or your general health',
                ],
              },
            ].map(section => (
              <div key={section.title} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">{section.title}</h4>
                <ul className="space-y-1">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-teal-500 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'risks-benefits',
      title: 'Benefits, Risks & Alternatives',
      icon: <Shield className="w-5 h-5 text-indigo-600" />,
      content: (
        <div className="space-y-4 text-gray-700">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-800 mb-2">Proven Benefits of NPWT</h4>
            <ul className="space-y-1 text-sm text-indigo-700 list-disc list-inside">
              <li>Reduces wound area by up to 50% faster than conventional dressings</li>
              <li>Significantly lower infection rates compared to open wound management</li>
              <li>Reduces the need for more complex reconstructive procedures</li>
              <li>Decreases hospital length of stay in most patient groups</li>
              <li>Reduces the frequency of dressing changes (less disruption, less pain)</li>
              <li>Optimises wound bed for skin grafting or flap surgery</li>
              <li>Strong evidence base — recommended by NICE, WOCN, and WHO wound care guidelines</li>
            </ul>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">Possible Risks & Complications</h4>
            <p className="text-xs text-yellow-700 mb-2">
              These are uncommon but you have a right to be fully informed:
            </p>
            <ul className="space-y-1 text-sm text-yellow-700 list-disc list-inside">
              <li>Pain or discomfort during dressing changes (managed with analgesia)</li>
              <li>Skin maceration or irritation around dressing edges</li>
              <li>Bleeding from fragile wound granulation tissue (rare)</li>
              <li>Wound infection if sterile technique is not maintained</li>
              <li>Retained foam fragments if dressing count is not checked (prevented by strict protocols)</li>
              <li>Fistula formation in wounds adjacent to bowel (contraindicated in such cases)</li>
              <li>Machine malfunction — backup protocols are in place</li>
            </ul>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">Alternative Treatments</h4>
            <p className="text-sm text-gray-600 mb-2">
              Your surgeon has considered alternatives, which may include:
            </p>
            <ul className="space-y-1 text-sm text-gray-600 list-disc list-inside">
              <li>Advanced moist wound dressings (alginate, hydrogel, silver-impregnated)</li>
              <li>Frequent conventional dressing changes</li>
              <li>Surgical debridement and wound closure</li>
              <li>Skin grafting or local/free flap reconstruction</li>
              <li>Hyperbaric oxygen therapy (where available)</li>
            </ul>
            <p className="text-sm text-gray-500 mt-2 italic">
              NPWT has been recommended as the most appropriate option for your specific wound at this time.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'faq',
      title: 'Frequently Asked Questions',
      icon: <HelpCircle className="w-5 h-5 text-gray-600" />,
      content: (
        <div className="space-y-3">
          {[
            {
              q: 'Will NPWT hurt?',
              a: 'Some patients experience mild discomfort or a pulling sensation when the machine is running, particularly in the first few days. Dressing changes can be uncomfortable — we routinely offer pain relief (oral analgesics or entonox) 30–45 minutes beforehand. Please always tell your nurse if you are in pain.',
            },
            {
              q: 'Can I shower or bathe with NPWT?',
              a: 'You can shower briefly using a waterproof protective cover over the dressing. Never submerge the dressing or machine in water. Sponge bathing away from the wound is often easier and safer.',
            },
            {
              q: 'Can I sleep normally?',
              a: 'Yes. Position yourself comfortably — avoid lying directly on the dressing. The machine is quiet enough for sleep in most cases. Keep the tubing accessible so it does not become kinked or disconnected during sleep.',
            },
            {
              q: 'Will the therapy leave a scar?',
              a: 'NPWT itself does not cause scarring — it promotes healing. The wound itself will scar as part of the natural healing process. Once healed, your surgeon or a specialist nurse will provide guidance on scar management (silicone sheets, massage, sun protection).',
            },
            {
              q: 'What happens if the machine alarm goes off?',
              a: 'First, check that all tubing connections are secure and that the dressing seal is intact. Most alarms resolve with these simple checks. If the alarm persists, contact the ward or our wound care helpline immediately. Do not attempt to fix the machine yourself.',
            },
            {
              q: 'Can I travel while on NPWT?',
              a: 'Short-distance travel is generally fine. For air travel or long journeys, always consult your surgeon first. The machine runs on battery for several hours and comes with a car adaptor. Documentation letters for airport security can be provided.',
            },
            {
              q: 'How will I know the treatment is working?',
              a: 'Signs of progress include: the wound becoming smaller and shallower, the appearance of healthy pink/red granulation tissue filling the wound bed, reduced exudate production, and improvement in surrounding skin colour and warmth. Your wound team will document and share these measurements with you.',
            },
          ].map((item, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-3 font-medium text-gray-800 text-sm">
                Q: {item.q}
              </div>
              <div className="p-3 text-sm text-gray-600 leading-relaxed">
                A: {item.a}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'contact',
      title: 'Emergency Contacts & Follow-Up',
      icon: <Phone className="w-5 h-5 text-green-600" />,
      content: (
        <div className="space-y-3 text-gray-700">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> If you experience any of the following, go to the Emergency Department immediately:
            </h4>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>Active bleeding from the wound that does not stop with gentle pressure</li>
              <li>High fever (&gt;38.5°C), rigors (shaking), or feeling very unwell</li>
              <li>Sudden severe pain in or around the wound</li>
              <li>Signs of wound deterioration — smell, spreading redness, pus</li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2">Contact Your Wound Care Team For:</h4>
            <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
              <li>Dressing seal problems that you cannot resolve</li>
              <li>Persistent machine alarms</li>
              <li>Questions about your medication or wound care at home</li>
              <li>Scheduling or rescheduling dressing changes</li>
              <li>Any concerns about your wound appearance or healing progress</li>
            </ul>
          </div>
          <p className="text-xs text-gray-500 italic">
            Emergency and clinic contact numbers are on your discharge summary and appointment card.
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* View Switcher */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setActiveView('education')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            activeView === 'education'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <BookOpen size={16} />
          Patient Education
        </button>
        <button
          onClick={() => setActiveView('consent')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            activeView === 'consent'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <PenLine size={16} />
          Consent Form
        </button>
      </div>

      {/* Print Button */}
      <button
        onClick={handlePrint}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-purple-300 text-purple-700 rounded-xl hover:bg-purple-50 transition-colors text-sm font-medium"
      >
        <Printer size={16} />
        Print / Save as PDF
      </button>

      {/* ── EDUCATION VIEW ── */}
      <AnimatePresence mode="wait">
        {activeView === 'education' && (
          <motion.div
            key="education"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-3 print:block"
            ref={printRef}
            id="npwt-education-print"
          >
            {/* Print Header */}
            <div className="hidden print:block mb-6 pb-4 border-b-2">
              <h1 className="text-2xl font-bold text-gray-900">NPWT Patient Education Guide</h1>
              <p className="text-gray-600">AstroHEALTH — Negative Pressure Wound Therapy Programme</p>
              {patient && (
                <p className="text-gray-600 mt-1">
                  Patient: <strong>{patient.firstName} {patient.lastName}</strong> &nbsp;|&nbsp;
                  Date: {format(sessionDate || new Date(), 'PPP')}
                </p>
              )}
            </div>

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl p-4 sm:p-6 print:bg-purple-50 print:text-purple-900">
              <div className="flex items-start gap-4">
                <Wind className="w-8 h-8 flex-shrink-0 mt-1" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold mb-1">
                    Your Guide to Negative Pressure Wound Therapy
                  </h2>
                  <p className="text-purple-100 print:text-purple-700 text-sm leading-relaxed">
                    This guide has been prepared by your plastic surgery and wound care team to help you 
                    understand your treatment fully. We encourage you to read it carefully and to bring 
                    any questions to your next appointment. Your understanding and active participation 
                    are essential to the success of your healing journey.
                  </p>
                  {performedBy && (
                    <p className="text-purple-200 print:text-purple-600 text-xs mt-2">
                      Prepared by: {performedBy}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Accordion Sections */}
            <div className="space-y-2">
              {educationSections.map(section => (
                <div
                  key={section.id}
                  className="border border-gray-200 rounded-xl overflow-hidden print:border-gray-300 print:mb-4"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 text-left print:hidden"
                  >
                    <div className="flex items-center gap-3">
                      {section.icon}
                      <span className="font-semibold text-gray-900">{section.title}</span>
                    </div>
                    {expandedSections.includes(section.id)
                      ? <ChevronUp className="w-5 h-5 text-gray-400" />
                      : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>

                  {/* Always visible when printing */}
                  <div className="hidden print:block p-4 border-t border-gray-200">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      {section.icon} {section.title}
                    </h3>
                    {section.content}
                  </div>

                  <AnimatePresence>
                    {expandedSections.includes(section.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden print:hidden"
                      >
                        <div className="p-4 border-t border-gray-100">
                          {section.content}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Surgeon Signature Block */}
            <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
              <p className="text-sm text-gray-600">
                <strong>Clinical Disclaimer:</strong> This educational material has been developed in 
                accordance with evidence-based wound care guidelines including recommendations from the 
                World Union of Wound Healing Societies (WUWHS), National Institute for Health and Care 
                Excellence (NICE), and the Wound, Ostomy and Continence Nurses Society (WOCN). The 
                information provided is general in nature. Your surgeon will tailor all aspects of your 
                care to your individual circumstances.
              </p>
            </div>
          </motion.div>
        )}

        {/* ── CONSENT VIEW ── */}
        {activeView === 'consent' && (
          <motion.div
            key="consent"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
            id="npwt-consent-print"
          >
            {/* Print Header */}
            <div className="hidden print:block mb-6 pb-4 border-b-2">
              <h1 className="text-2xl font-bold text-gray-900">NPWT Informed Consent Form</h1>
              <p className="text-gray-600">AstroHEALTH Surgical & Wound Care Services</p>
            </div>

            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 flex-shrink-0" />
                <div>
                  <h2 className="font-bold text-lg">Informed Consent for NPWT</h2>
                  <p className="text-indigo-100 text-sm">
                    Please read each statement carefully and check the box to confirm your understanding.
                  </p>
                </div>
              </div>
            </div>

            {/* Patient Details */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Patient / Guardian Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Full name as on ID"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={consentDate}
                    onChange={e => setConsentDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Guardian / Next of Kin (if applicable)
                  </label>
                  <input
                    type="text"
                    value={guardianName}
                    onChange={e => setGuardianName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Full name and relationship"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">
                    Witness Name
                  </label>
                  <input
                    type="text"
                    value={witnessName}
                    onChange={e => setWitnessName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    placeholder="Healthcare professional witness"
                  />
                </div>
              </div>
            </div>

            {/* Consent Checklist */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="font-semibold text-gray-900">Declaration & Consent</h3>
              <p className="text-sm text-gray-600">
                I, the undersigned patient (or authorised guardian/proxy), confirm the following:
              </p>
              <div className="space-y-3">
                {consentItems.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      consentChecked[item.id]
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!consentChecked[item.id]}
                      onChange={e =>
                        setConsentChecked(prev => ({ ...prev, [item.id]: e.target.checked }))
                      }
                      className="mt-0.5 w-4 h-4 text-green-600 rounded"
                    />
                    <span className="text-sm text-gray-700 leading-relaxed">{item.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Signature Block */}
            <div className="border border-gray-200 rounded-xl p-4 space-y-4">
              <h3 className="font-semibold text-gray-900">Signature</h3>

              {/* Printed signature area */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border-b-2 border-gray-900 pb-1">
                  <p className="text-xs text-gray-500 mb-6">Patient / Guardian Signature</p>
                  <p className="text-xs text-gray-500">{patientName || '___________________________'}</p>
                </div>
                <div className="border-b-2 border-gray-900 pb-1">
                  <p className="text-xs text-gray-500 mb-6">Clinician Signature</p>
                  <p className="text-xs text-gray-500">{performedBy || '___________________________'}</p>
                </div>
                <div className="border-b-2 border-gray-900 pb-1">
                  <p className="text-xs text-gray-500 mb-6">Witness Signature</p>
                  <p className="text-xs text-gray-500">{witnessName || '___________________________'}</p>
                </div>
              </div>

              <p className="text-xs text-gray-400">
                Date: {consentDate || '_______________'} &nbsp;|&nbsp; Time: _______________
              </p>

              {/* Digital confirmation */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                consentSigned ? 'bg-green-50 border-green-400' : 'border-indigo-300 hover:border-indigo-400'
              }`}>
                <input
                  type="checkbox"
                  checked={consentSigned}
                  onChange={e => setConsentSigned(e.target.checked)}
                  className="mt-0.5 w-5 h-5 text-green-600 rounded"
                />
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    Digital Confirmation (In-Clinic)
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    By checking this box in the presence of the clinical team, the patient/guardian confirms 
                    that all items above have been read, understood, and agreed to. This digital record 
                    supplements (and does not replace) a signed paper copy held in the medical file.
                  </p>
                </div>
              </label>

              {consentSigned && allConsentChecked && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-3 bg-green-50 border border-green-300 rounded-xl"
                >
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm text-green-700 font-medium">
                    Consent complete. All declarations confirmed and digitally acknowledged on{' '}
                    {format(new Date(), 'PPP \'at\' p')}.
                  </p>
                </motion.div>
              )}

              {consentSigned && !allConsentChecked && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-300 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Please check all consent items above before confirming.
                  </p>
                </div>
              )}
            </div>

            {/* Legal Footer */}
            <div className="text-xs text-gray-400 leading-relaxed p-3 bg-gray-50 rounded-xl border border-gray-200">
              <strong>Legal Notice:</strong> This consent form documents the patient's informed agreement to 
              undergo Negative Pressure Wound Therapy. It does not constitute a guarantee of treatment 
              outcome. A signed paper copy must be retained in the patient's permanent medical record in 
              accordance with national health records management regulations. This form was generated by 
              AstroHEALTH Clinical Management System.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print styles injected inline for simplicity */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #npwt-education-print, #npwt-education-print * { visibility: visible !important; }
          #npwt-consent-print, #npwt-consent-print * { visibility: visible !important; }
          #npwt-education-print { position: absolute; left: 0; top: 0; width: 100%; }
          #npwt-consent-print { position: absolute; left: 0; top: 0; width: 100%; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          button { display: none !important; }
        }
      `}</style>
    </div>
  );
}
