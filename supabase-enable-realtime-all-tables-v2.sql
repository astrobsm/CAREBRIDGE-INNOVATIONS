-- =====================================================
-- SUPABASE: Enable Real-Time for ALL Synced Tables
-- Run this in Supabase SQL Editor to ensure all tables
-- have real-time enabled for cross-device sync
-- =====================================================

-- Core tables
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS users;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS hospitals;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS patients;

-- Clinical tables
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS vital_signs;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS clinical_encounters;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS surgeries;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS wounds;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS burn_assessments;

-- Lab & Pharmacy
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS lab_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS prescriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS investigations;

-- Nutrition
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS nutrition_assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS nutrition_plans;

-- Billing
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS invoices;

-- Admission & Ward
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS admissions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS admission_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS bed_assignments;

-- Treatment
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS treatment_plans;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS treatment_progress;

-- Ward Rounds & Assignments
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS ward_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS doctor_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS nurse_assignments;

-- Communication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS video_conferences;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS enhanced_video_conferences;

-- Discharge & Documentation
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS discharge_summaries;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS consumable_boms;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS histopathology_requests;

-- Blood Transfusion & MDT
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS blood_transfusions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS mdt_meetings;

-- Limb Salvage
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS limb_salvage_assessments;

-- Burn Care Monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS burn_monitoring_records;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS escharotomy_records;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS skin_graft_records;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS burn_care_plans;

-- Appointments
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS appointment_reminders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS appointment_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS clinic_sessions;

-- NPWT
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS npwt_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS npwt_notifications;

-- Medication Charts
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS medication_charts;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS nurse_patient_assignments;

-- Transfusion Orders
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS transfusion_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS transfusion_monitoring_charts;

-- Staff Assignments & Billing
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS staff_patient_assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS activity_billing_records;

-- Payroll
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS payroll_periods;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS staff_payroll_records;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS payslips;

-- Post-Operative Notes
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS post_operative_notes;

-- Preoperative Assessments
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS preoperative_assessments;

-- External Reviews
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS external_reviews;

-- Referrals
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS referrals;

-- Patient Education Records
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS patient_education_records;

-- Calculator Results
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS calculator_results;

-- User & Hospital Settings
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS user_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS hospital_settings;

-- Meeting Minutes
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS meeting_minutes;

-- Substance Use
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS substance_use_assessments;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS detox_monitoring_records;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS detox_follow_ups;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS substance_use_consents;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS substance_use_clinical_summaries;

-- Clinical Comments
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS clinical_comments;

-- Investigation Approval Logs
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS investigation_approval_logs;

-- Keloid Care Plans
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS keloid_care_plans;

-- Audit Logs
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS audit_logs;

SELECT 'Real-time enabled for all tables' AS status;
