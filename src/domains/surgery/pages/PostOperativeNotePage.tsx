/**
 * Post-Operative Note Page
 * 
 * A comprehensive page for creating and viewing post-operative notes
 * following WHO Surgical Safety Checklist standards.
 */

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Download,
  Share2,
  ArrowLeft,
  User,
  Scissors,
  Pill,
  Activity,
  Heart,
  BookOpen,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { db } from '../../../database';
import { useAuth } from '../../../contexts/AuthContext';
import { downloadPostOpNotePDF, sharePostOpNoteViaWhatsApp } from '../../../utils/postOpNotePdfGenerator';
import { markPdfGenerated, markSharedViaWhatsApp, markEducationDelivered } from '../../../services/postOperativeNoteService';

export default function PostOperativeNotePage() {
  const { surgeryId } = useParams<{ surgeryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'education' | 'specimens'>('summary');
  
  // Check user role for access control
  const canEdit = user?.role === 'surgeon';
  const canView = user?.role === 'surgeon' || user?.role === 'nurse';

  // Fetch surgery
  const surgery = useLiveQuery(async () => {
    if (!surgeryId) return null;
    return db.surgeries.get(surgeryId);
  }, [surgeryId]);

  // Fetch post-op note for this surgery
  const postOpNote = useLiveQuery(async () => {
    if (!surgeryId) return null;
    const notes = await db.postOperativeNotes
      .where('surgeryId')
      .equals(surgeryId)
      .toArray();
    return notes[0] || null;
  }, [surgeryId]);

  // Fetch patient
  const patient = useLiveQuery(async () => {
    if (!surgery?.patientId) return null;
    return db.patients.get(surgery.patientId);
  }, [surgery?.patientId]);

  // Fetch hospital
  const hospital = useLiveQuery(async () => {
    if (!surgery?.hospitalId) return null;
    return db.hospitals.get(surgery.hospitalId);
  }, [surgery?.hospitalId]);

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!postOpNote || !patient || !hospital) {
      toast.error('Missing required data');
      return;
    }

    setIsDownloading(true);
    try {
      await downloadPostOpNotePDF(postOpNote, patient, hospital);
      await markPdfGenerated(postOpNote.id);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle WhatsApp share
  const handleShareWhatsApp = async () => {
    if (!postOpNote || !patient || !hospital) {
      toast.error('Missing required data');
      return;
    }

    setIsSharing(true);
    try {
      await sharePostOpNoteViaWhatsApp(postOpNote, patient, hospital, patient.phone);
      await markSharedViaWhatsApp(postOpNote.id);
      toast.success('PDF ready for sharing');
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to prepare for sharing');
    } finally {
      setIsSharing(false);
    }
  };

  // Handle marking education as delivered
  const handleMarkEducationDelivered = async () => {
    if (!postOpNote || !user) return;
    
    try {
      await markEducationDelivered(postOpNote.id, user.id);
      toast.success('Patient education marked as delivered');
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  if (!surgery || !postOpNote) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {!surgery ? 'Surgery not found' : 'Post-operative note not yet created'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-primary hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-20">
      {/* Nurse View-Only Notice */}
      {!canEdit && canView && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">View-Only Access</h3>
              <p className="text-sm text-blue-700 mt-1">
                You are viewing this post-operative note in read-only mode. 
                Only surgeons can create or edit post-operative notes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Post-Operative Note
            </h1>
            <p className="text-sm text-gray-500">
              {postOpNote.procedureName} • {format(new Date(postOpNote.procedureDate), 'dd MMM yyyy')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
          >
            <Download size={18} />
            {isDownloading ? 'Generating...' : 'Download PDF'}
          </button>
          <button
            onClick={handleShareWhatsApp}
            disabled={isSharing}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
          >
            <Share2 size={18} />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Patient Info Card */}
      {patient && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h3>
              <p className="text-sm text-gray-500">
                {patient.hospitalNumber} • {patient.gender === 'male' ? 'Male' : 'Female'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{patient.phone}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* WHO Checklist Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
      >
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          WHO Surgical Safety Checklist
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Sign In', completed: postOpNote.signInCompleted },
            { label: 'Time Out', completed: postOpNote.timeOutCompleted },
            { label: 'Sign Out', completed: postOpNote.signOutCompleted },
          ].map((check) => (
            <div
              key={check.label}
              className={`p-3 rounded-lg text-center ${
                check.completed
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div className={`text-lg ${check.completed ? 'text-green-600' : 'text-red-600'}`}>
                {check.completed ? '✓' : '✗'}
              </div>
              <p className={`text-sm font-medium ${check.completed ? 'text-green-700' : 'text-red-700'}`}>
                {check.label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'summary', label: 'Summary', icon: FileText },
          { id: 'education', label: 'Patient Education', icon: BookOpen },
          { id: 'specimens', label: 'Specimens & Labs', icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {/* Surgical Team */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              Surgical Team
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Surgeon</p>
                <p className="font-medium">{postOpNote.surgeon}</p>
              </div>
              {postOpNote.assistant && (
                <div>
                  <p className="text-sm text-gray-500">Assistant</p>
                  <p className="font-medium">{postOpNote.assistant}</p>
                </div>
              )}
              {postOpNote.anaesthetist && (
                <div>
                  <p className="text-sm text-gray-500">Anaesthetist</p>
                  <p className="font-medium">{postOpNote.anaesthetist}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Anaesthesia Type</p>
                <p className="font-medium capitalize">{postOpNote.anaesthesiaType}</p>
              </div>
            </div>
          </motion.div>

          {/* Operative Details */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              Operative Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Pre-op Diagnosis</p>
                <p className="font-medium">{postOpNote.preOperativeDiagnosis}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Post-op Diagnosis</p>
                <p className="font-medium">{postOpNote.postOperativeDiagnosis}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Procedure Performed</p>
                <p className="font-medium">{postOpNote.procedurePerformed}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Findings</p>
                <p className="font-medium">{postOpNote.findings}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Blood Loss</p>
                  <p className="font-medium">{postOpNote.bloodLoss} mL</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{postOpNote.duration} minutes</p>
                </div>
              </div>
              {postOpNote.complications.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-sm font-medium text-red-700">Complications</p>
                  <ul className="mt-1 text-sm text-red-600">
                    {postOpNote.complications.map((c, i) => (
                      <li key={i}>• {c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>

          {/* Post-Op Orders */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Pill className="w-5 h-5 text-purple-500" />
              Post-Operative Orders
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Vital Signs</p>
                <p className="font-medium">{postOpNote.vitalSignsFrequency}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Position</p>
                <p className="font-medium">{postOpNote.position}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Diet</p>
                <p className="font-medium">{postOpNote.dietInstructions}</p>
              </div>
              {postOpNote.ivFluids && (
                <div>
                  <p className="text-sm text-gray-500">IV Fluids</p>
                  <p className="font-medium">{postOpNote.ivFluids}</p>
                </div>
              )}
              {postOpNote.medications.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Medications</p>
                  <div className="space-y-2">
                    {postOpNote.medications.map((med, i) => (
                      <div key={i} className="p-2 bg-purple-50 rounded-lg text-sm">
                        <span className="font-medium">{med.name}</span>
                        <span className="text-gray-600">
                          {' '}{med.dose} {med.route} {med.frequency} × {med.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'education' && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Patient Education
              </h3>
              {!postOpNote.educationDelivered ? (
                <button
                  onClick={handleMarkEducationDelivered}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary-dark"
                >
                  <CheckCircle size={16} />
                  Mark as Delivered
                </button>
              ) : (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle size={16} />
                  Delivered on {postOpNote.educationDeliveredAt && format(new Date(postOpNote.educationDeliveredAt), 'dd MMM yyyy')}
                </span>
              )}
            </div>

            {postOpNote.patientEducation && (
              <div className="space-y-4">
                {/* Recovery Timeline */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Recovery Timeline</h4>
                  <p className="text-sm text-blue-800">{postOpNote.patientEducation.recoveryTimeline}</p>
                  <p className="text-sm text-blue-600 mt-2">
                    Expected recovery: <strong>{postOpNote.patientEducation.expectedRecoveryDays} days</strong>
                  </p>
                </div>

                {/* Ambulation */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Getting Moving</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-medium text-gray-500 w-24">Day 0:</span>
                      <span>{postOpNote.patientEducation.ambulation.day0}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-gray-500 w-24">Day 1:</span>
                      <span>{postOpNote.patientEducation.ambulation.day1}</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-gray-500 w-24">Week 1:</span>
                      <span>{postOpNote.patientEducation.ambulation.week1}</span>
                    </li>
                  </ul>
                </div>

                {/* Wound Care Warning Signs */}
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Warning Signs - Seek Help If:
                  </h4>
                  <ul className="space-y-1 text-sm text-red-700">
                    {postOpNote.patientEducation.woundCare.signsOfInfection.map((sign, i) => (
                      <li key={i}>• {sign}</li>
                    ))}
                  </ul>
                </div>

                {/* Emergency Contact */}
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h4 className="font-medium text-yellow-900 mb-2">📞 Emergency Contact</h4>
                  <p className="text-sm text-yellow-800">{postOpNote.patientEducation.emergencyContact}</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {activeTab === 'specimens' && (
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
          >
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Specimens Collected
            </h3>

            {postOpNote.specimens.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No specimens collected</p>
            ) : (
              <div className="space-y-3">
                {postOpNote.specimens.map((specimen, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium capitalize">{specimen.type}</span>
                      {specimen.labRequestGenerated ? (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                          Lab Request Generated
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{specimen.description}</p>
                    <p className="text-xs text-gray-500 mt-1">Site: {specimen.site}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Lab Requests */}
          {postOpNote.labRequests.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
            >
              <h3 className="font-semibold text-gray-900 mb-3">Lab Requests</h3>
              <div className="space-y-3">
                {postOpNote.labRequests.map((req, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{req.testName}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        req.status === 'completed' 
                          ? 'bg-green-100 text-green-700'
                          : req.status === 'processing'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Requested: {format(new Date(req.requestedAt), 'dd MMM yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
