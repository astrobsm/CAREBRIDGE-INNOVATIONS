import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  FileText,
  CheckCircle,
  AlertTriangle,
  User,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Scroll,
  Clock,
  Fingerprint,
  Globe,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../database';
import { format } from 'date-fns';

const AGREEMENT_VERSION = '1.0';

export default function UserAgreementPage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isAgreed, setIsAgreed] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: '',
    platform: '',
    language: '',
    screenResolution: '',
    timezone: '',
  });

  // Capture device info on mount
  useEffect(() => {
    setDeviceInfo({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }, []);

  // Track scroll progress
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
      setScrollProgress(Math.min(progress, 100));
      
      // Check if scrolled to bottom (within 50px tolerance)
      if (scrollHeight - scrollTop - clientHeight < 50) {
        setHasScrolledToBottom(true);
      }
    }
  }, []);

  // Handle agreement acceptance
  const handleAcceptAgreement = async () => {
    if (!isAgreed) {
      toast.error('Please check the agreement checkbox');
      return;
    }
    setShowPasswordChange(true);
  };

  // Handle password change and final submission
  const handleFinalSubmit = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      toast.error('Password must contain at least one number');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      toast.error('Password must contain at least one special character');
      return;
    }

    setIsSubmitting(true);

    try {
      // Update user with agreement acceptance and new password
      await db.users.update(user!.id, {
        hasAcceptedAgreement: true,
        agreementAcceptedAt: new Date().toISOString(),
        agreementVersion: AGREEMENT_VERSION,
        agreementDeviceInfo: JSON.stringify(deviceInfo),
        password: newPassword, // In production, this should be hashed
        mustChangePassword: false,
        updatedAt: new Date().toISOString(),
      });

      // Refresh user context
      if (refreshUser) {
        await refreshUser();
      }

      toast.success('Agreement accepted and password updated successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving agreement:', error);
      toast.error('Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AstroHEALTH EMR</h1>
              <p className="text-sm text-gray-500">User Agreement & Professional Conduct Code</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl p-6 text-white mb-6"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Welcome, {user?.firstName} {user?.lastName}</h2>
              <p className="text-blue-100">
                Before you can access the platform, you must read and accept the User Agreement, 
                Professional Conduct Code & Medico-Legal Consent. Please scroll through the entire 
                document carefully.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Progress Indicator */}
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Reading Progress</span>
            <span className="text-sm text-gray-500">{Math.round(scrollProgress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className={`h-full transition-all duration-300 ${
                hasScrolledToBottom ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
          {!hasScrolledToBottom && (
            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
              <ChevronDown className="w-3 h-3 animate-bounce" />
              Please scroll to read the entire document
            </p>
          )}
          {hasScrolledToBottom && (
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              You have read the entire document
            </p>
          )}
        </div>

        {/* Agreement Document */}
        <div className="bg-white rounded-2xl shadow-lg border overflow-hidden mb-6">
          <div className="bg-gray-50 px-6 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scroll className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">User Agreement Document</span>
            </div>
            <span className="text-sm text-gray-500">Version {AGREEMENT_VERSION}</span>
          </div>
          
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="p-6 max-h-[500px] overflow-y-auto prose prose-sm max-w-none"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">AstroHEALTH EMR</h1>
              <h2 className="text-lg font-semibold text-gray-700">
                USER AGREEMENT, PROFESSIONAL CONDUCT CODE & MEDICO-LEGAL CONSENT
              </h2>
              <p className="text-gray-500 mt-2">
                Effective Date: {format(new Date(), 'MMMM d, yyyy')} | Version: {AGREEMENT_VERSION}
              </p>
            </div>

            <hr className="my-6" />

            <h3 className="text-lg font-bold text-gray-900 mt-6">1. PREAMBLE</h3>
            <p className="text-gray-700">
              AstroHEALTH EMR ("the Platform") is a professional electronic medical record, care coordination, 
              and service-tracking system designed to support safe, ethical, diligent, and patient-centred 
              surgical and peri-operative care across multiple hospitals and home-care environments.
            </p>
            <p className="text-gray-700">By accessing or using this Platform, you affirm your commitment to:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Professional integrity</li>
              <li>Respect for human dignity</li>
              <li>Clinical diligence</li>
              <li>Timely and responsible patient care</li>
              <li>Accurate documentation and transparency</li>
            </ul>
            <p className="font-semibold text-red-600">This Agreement is legally binding.</p>

            <h3 className="text-lg font-bold text-gray-900 mt-6">2. DEFINITIONS</h3>
            <ul className="list-disc pl-6 text-gray-700">
              <li><strong>Platform:</strong> AstroHEALTH EMR and all associated applications.</li>
              <li><strong>User:</strong> Any registered professional granted access.</li>
              <li><strong>Patient:</strong> Any individual whose data is accessed or recorded.</li>
              <li><strong>Services Rendered:</strong> Clinical, professional, or supportive services documented on the Platform.</li>
              <li><strong>Response Time:</strong> Time taken to acknowledge and act on assigned patient tasks.</li>
              <li><strong>Data:</strong> All patient, clinical, administrative, financial, and audit information.</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mt-6">3. ELIGIBILITY AND PROFESSIONAL STATUS</h3>
            <p className="text-gray-700">You confirm that:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>You are duly trained, qualified, and licensed (where applicable) to perform your professional role.</li>
              <li>You are registered with relevant regulatory bodies (e.g., MDCN, NMCN, PCN, MLSCN, etc., as applicable).</li>
              <li>You shall only perform duties within your scope of practice.</li>
              <li>Any misrepresentation of credentials constitutes gross misconduct.</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mt-6">4. MANDATORY ACCEPTANCE</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-4">
              <p className="text-amber-800 font-medium">
                You must accept this Agreement before first use of the Platform. Failure to accept will deny access.
              </p>
              <p className="text-amber-700 mt-2">
                By clicking "I AGREE", you confirm that you have read, understood, and accepted all terms.
              </p>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mt-6">5. PROFESSIONAL CONDUCT OBLIGATIONS</h3>
            <p className="text-gray-700">You agree to:</p>
            
            <h4 className="font-semibold text-gray-800 mt-4">5.1 Patient Care Standards</h4>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Act in the best interest of the patient at all times</li>
              <li>Provide care that is evidence-based, timely, and compassionate</li>
              <li>Escalate care promptly when limits of competence are reached</li>
              <li>Avoid negligence, abandonment, or delay</li>
            </ul>

            <h4 className="font-semibold text-gray-800 mt-4">5.2 Respect for Humanity</h4>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Treat all patients with dignity, regardless of age, gender, socioeconomic status, religion, or disability</li>
              <li>Avoid discriminatory, abusive, or degrading behaviour</li>
            </ul>

            <h4 className="font-semibold text-gray-800 mt-4">5.3 Honesty & Accuracy</h4>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Document truthfully and contemporaneously</li>
              <li>Never falsify records, timestamps, or service logs</li>
              <li>Never claim credit or payment for services not rendered</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mt-6">6. RESPONSE TIME & PERFORMANCE TRACKING</h3>
            <p className="text-gray-700">You acknowledge that:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>The Platform tracks task assignment, response time, and completion.</li>
              <li>Your professional performance metrics include:
                <ul className="list-circle pl-6">
                  <li>Timeliness of response</li>
                  <li>Quality of documentation</li>
                  <li>Completion of assigned duties</li>
                </ul>
              </li>
              <li>These metrics directly influence:
                <ul className="list-circle pl-6">
                  <li>Remuneration</li>
                  <li>Continued platform access</li>
                  <li>Professional standing</li>
                </ul>
              </li>
              <li>Deliberate delays or ignored patient requests may constitute misconduct.</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mt-6">7. REMUNERATION & SERVICE-BASED PAYMENTS</h3>
            <p className="text-gray-700">You agree that:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Payments are based solely on documented services rendered.</li>
              <li>Only services that are:
                <ul className="list-circle pl-6">
                  <li>Properly logged</li>
                  <li>Clinically justified</li>
                  <li>Time-stamped</li>
                </ul>
                are eligible for payment.
              </li>
              <li>Fraudulent claims lead to:
                <ul className="list-circle pl-6">
                  <li>Forfeiture of earnings</li>
                  <li>Suspension or termination</li>
                  <li>Possible legal or regulatory reporting</li>
                </ul>
              </li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mt-6">8. DATA PROTECTION & CONFIDENTIALITY</h3>
            <p className="text-gray-700">You undertake to:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Maintain strict confidentiality</li>
              <li>Access patient records only when directly involved in care</li>
              <li>Never disclose data without lawful authorization</li>
              <li>Protect login credentials at all times</li>
            </ul>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
              <p className="text-red-800 font-medium">
                Unauthorized access, sharing, or misuse of data is a serious legal offence.
              </p>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mt-6">9. CLINICAL DOCUMENTATION RESPONSIBILITIES</h3>
            <p className="text-gray-700">You must:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Complete assessments fully and accurately</li>
              <li>Upload images responsibly and ethically</li>
              <li>Ensure entries reflect actual clinical findings</li>
              <li>Use standardized protocols embedded in the Platform</li>
            </ul>
            <p className="text-red-600 font-medium">Incomplete or misleading documentation is unacceptable.</p>

            <h3 className="text-lg font-bold text-gray-900 mt-6">10. AI-ASSISTED FEATURES DISCLAIMER</h3>
            <p className="text-gray-700">You acknowledge that:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>AI tools are decision-support aids only</li>
              <li>Final clinical responsibility rests entirely with you</li>
              <li>You must apply professional judgment at all times</li>
              <li>Blind reliance on AI outputs is prohibited</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mt-6">11. AUDIT, REVIEW & INVESTIGATION</h3>
            <p className="text-gray-700">You consent to:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Routine clinical audits</li>
              <li>Performance reviews</li>
              <li>Investigations of complaints or adverse events</li>
              <li>Use of logs and timestamps as evidence</li>
            </ul>
            <p className="font-semibold text-gray-800">All records are legally admissible.</p>

            <h3 className="text-lg font-bold text-gray-900 mt-6">12. DISCIPLINARY ACTIONS</h3>
            <p className="text-gray-700">Violation of this Agreement may result in:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Warning</li>
              <li>Suspension</li>
              <li>Termination of access</li>
              <li>Financial penalties</li>
              <li>Reporting to regulatory bodies</li>
              <li>Civil or criminal proceedings where applicable</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mt-6">13. LIMITATION OF PLATFORM LIABILITY</h3>
            <p className="text-gray-700">AstroHEALTH EMR:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Is not a substitute for professional judgment</li>
              <li>Is not responsible for clinical negligence</li>
              <li>Does not override institutional policies or national laws</li>
            </ul>
            <p className="font-semibold text-gray-800">Each User remains personally accountable for professional actions.</p>

            <h3 className="text-lg font-bold text-gray-900 mt-6">14. MULTI-HOSPITAL & HOME-CARE USE</h3>
            <p className="text-gray-700">You acknowledge that:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Care may span multiple facilities</li>
              <li>Documentation must remain consistent and complete</li>
              <li>Home-care services require equal diligence and professionalism</li>
            </ul>

            <h3 className="text-lg font-bold text-gray-900 mt-6">15. TERMINATION OF ACCESS</h3>
            <p className="text-gray-700">Access may be terminated if:</p>
            <ul className="list-disc pl-6 text-gray-700">
              <li>Professional standards are breached</li>
              <li>Data is misused</li>
              <li>Services are fraudulently claimed</li>
              <li>Regulatory status lapses</li>
            </ul>
            <p className="font-semibold text-red-600">Termination does not erase legal responsibility.</p>

            <h3 className="text-lg font-bold text-gray-900 mt-6">16. GOVERNING LAW</h3>
            <p className="text-gray-700">
              This Agreement shall be governed by the laws of the Federal Republic of Nigeria, 
              without prejudice to international best practices.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 my-8">
              <h3 className="text-lg font-bold text-blue-900 mb-4">17. ACCEPTANCE STATEMENT (MANDATORY)</h3>
              <p className="text-blue-800 font-medium text-center text-lg">
                I CONFIRM THAT I HAVE READ, UNDERSTOOD, AND AGREED TO ABIDE BY ALL TERMS OF THIS 
                USER AGREEMENT, AND I ACCEPT FULL PROFESSIONAL AND LEGAL RESPONSIBILITY FOR MY USE 
                OF THE AstroHEALTH EMR PLATFORM.
              </p>
            </div>

            <div className="border-t-2 border-gray-300 pt-6 mt-8">
              <h3 className="text-lg font-bold text-gray-900">18. ELECTRONIC SIGNATURE</h3>
              <p className="text-gray-600 text-sm mt-2">
                By accepting below, you provide your electronic signature which has the same legal 
                validity as a handwritten signature.
              </p>
            </div>
          </div>
        </div>

        {/* Agreement Checkbox and Actions */}
        <AnimatePresence mode="wait">
          {!showPasswordChange ? (
            <motion.div
              key="agreement"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg border p-6"
            >
              {/* User Info Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Full Name</p>
                    <p className="font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Professional Role</p>
                    <p className="font-medium text-gray-900 capitalize">{user?.role?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Registration Number</p>
                    <p className="font-medium text-gray-900">{user?.licenseNumber || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Date & Time</p>
                    <p className="font-medium text-gray-900">{format(new Date(), 'PPpp')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 md:col-span-2">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Device / Platform</p>
                    <p className="font-medium text-gray-900 text-sm truncate">{deviceInfo.platform} | {deviceInfo.timezone}</p>
                  </div>
                </div>
              </div>

              {/* Agreement Checkbox */}
              <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                hasScrolledToBottom 
                  ? isAgreed 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-blue-300'
                  : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
              }`}>
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  disabled={!hasScrolledToBottom}
                  className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
                <div>
                  <p className="font-semibold text-gray-900">I AGREE AND ACCEPT</p>
                  <p className="text-sm text-gray-600 mt-1">
                    I confirm that I have read, understood, and agreed to abide by all terms of this 
                    User Agreement, and I accept full professional and legal responsibility for my 
                    use of the AstroHEALTH EMR Platform.
                  </p>
                </div>
              </label>

              {!hasScrolledToBottom && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Please scroll through and read the entire agreement before you can accept.
                  </p>
                </div>
              )}

              <button
                onClick={handleAcceptAgreement}
                disabled={!hasScrolledToBottom || !isAgreed}
                className={`w-full mt-6 py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all ${
                  hasScrolledToBottom && isAgreed
                    ? 'bg-gradient-to-r from-blue-600 to-emerald-600 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                Accept Agreement & Continue
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="password"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl shadow-lg border p-6"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Set Your New Password</h3>
                <p className="text-gray-500 mt-2">
                  For security purposes, please set a new password before accessing the platform.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input pr-10"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input pr-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
                  <ul className="space-y-1 text-sm">
                    <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                      {newPassword.length >= 8 ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border" />}
                      At least 8 characters
                    </li>
                    <li className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                      {/[A-Z]/.test(newPassword) ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border" />}
                      One uppercase letter
                    </li>
                    <li className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                      {/[a-z]/.test(newPassword) ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border" />}
                      One lowercase letter
                    </li>
                    <li className={`flex items-center gap-2 ${/[0-9]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                      {/[0-9]/.test(newPassword) ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border" />}
                      One number
                    </li>
                    <li className={`flex items-center gap-2 ${/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600' : 'text-gray-500'}`}>
                      {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border" />}
                      One special character
                    </li>
                    <li className={`flex items-center gap-2 ${newPassword === confirmPassword && confirmPassword.length > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      {newPassword === confirmPassword && confirmPassword.length > 0 ? <CheckCircle size={14} /> : <div className="w-3.5 h-3.5 rounded-full border" />}
                      Passwords match
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPasswordChange(false)}
                  className="flex-1 btn btn-secondary"
                >
                  Back
                </button>
                <button
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex-1 btn btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-5 h-5" />
                      Complete Setup
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} ASTROHEALTH Innovations. All rights reserved.</p>
          <p className="mt-1">
            By using this platform, you agree to our terms and accept responsibility for your professional actions.
          </p>
        </div>
      </div>
    </div>
  );
}
