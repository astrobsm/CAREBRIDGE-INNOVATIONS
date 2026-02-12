-- =====================================================
-- SUPABASE: Enable Real-Time for ALL Synced Tables
-- Run this in Supabase SQL Editor to ensure all tables
-- have real-time enabled for cross-device sync
-- =====================================================
-- Uses SET TABLE to atomically replace the publication list
-- (avoids IF NOT EXISTS syntax unsupported in PG 14)
-- =====================================================

ALTER PUBLICATION supabase_realtime SET TABLE
  -- Core
  users,
  hospitals,
  patients,
  -- Clinical
  vital_signs,
  clinical_encounters,
  surgeries,
  wounds,
  burn_assessments,
  -- Lab & Pharmacy
  lab_requests,
  prescriptions,
  investigations,
  -- Nutrition
  nutrition_assessments,
  nutrition_plans,
  -- Billing
  invoices,
  -- Admission & Ward
  admissions,
  admission_notes,
  bed_assignments,
  -- Treatment
  treatment_plans,
  treatment_progress,
  -- Ward Rounds & Assignments
  ward_rounds,
  doctor_assignments,
  nurse_assignments,
  -- Communication
  chat_rooms,
  chat_messages,
  video_conferences,
  enhanced_video_conferences,
  -- Discharge & Documentation
  discharge_summaries,
  consumable_boms,
  histopathology_requests,
  -- Blood Transfusion & MDT
  blood_transfusions,
  mdt_meetings,
  -- Limb Salvage
  limb_salvage_assessments,
  -- Burn Care Monitoring
  burn_monitoring_records,
  escharotomy_records,
  skin_graft_records,
  burn_care_plans,
  -- Appointments
  appointments,
  appointment_reminders,
  appointment_slots,
  clinic_sessions,
  -- NPWT
  npwt_sessions,
  npwt_notifications,
  -- Medication Charts
  medication_charts,
  nurse_patient_assignments,
  -- Transfusion Orders
  transfusion_orders,
  transfusion_monitoring_charts,
  -- Staff Assignments & Billing
  staff_patient_assignments,
  activity_billing_records,
  -- Payroll
  payroll_periods,
  staff_payroll_records,
  payslips,
  -- Post-Operative Notes
  post_operative_notes,
  -- Preoperative Assessments
  preoperative_assessments,
  -- External Reviews
  external_reviews,
  -- Referrals
  referrals,
  -- Patient Education
  patient_education_records,
  -- Calculator Results
  calculator_results,
  -- Settings
  user_settings,
  hospital_settings,
  -- Meeting Minutes
  meeting_minutes,
  -- Substance Use
  substance_use_assessments,
  detox_monitoring_records,
  detox_follow_ups,
  substance_use_consents,
  substance_use_clinical_summaries,
  -- Clinical Comments
  clinical_comments,
  -- Investigation Approval Logs
  investigation_approval_logs,
  -- Keloid Care Plans
  keloid_care_plans,
  -- Audit Logs
  audit_logs;

SELECT 'Real-time enabled for all tables' AS status;
