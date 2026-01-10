-- ============================================
-- CareBridge Enable Realtime for ALL Tables
-- ============================================
-- This migration enables real-time subscriptions for all
-- existing tables that were previously only using periodic sync.
-- Run this AFTER supabase-comprehensive-sync-migration.sql
-- ============================================

-- First, let's check what's already in the publication
-- Run: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ============================================
-- ENABLE REALTIME FOR EXISTING TABLES
-- ============================================
-- Note: If any of these fail with "already in publication", 
-- that's fine - it means real-time was already enabled

-- Core tables (should already be enabled)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'hospitals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE hospitals;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'patients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE patients;
  END IF;
END $$;

-- Clinical tables
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'vital_signs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE vital_signs;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'clinical_encounters'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE clinical_encounters;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'surgeries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE surgeries;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'wounds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wounds;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'burn_assessments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE burn_assessments;
  END IF;
END $$;

-- Lab & Pharmacy
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'lab_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE lab_requests;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'prescriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE prescriptions;
  END IF;
END $$;

-- Nutrition
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'nutrition_assessments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nutrition_assessments;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'nutrition_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nutrition_plans;
  END IF;
END $$;

-- Billing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE invoices;
  END IF;
END $$;

-- Admission & Ward
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admissions;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admission_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admission_notes;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bed_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bed_assignments;
  END IF;
END $$;

-- Treatment
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'treatment_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE treatment_plans;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'treatment_progress'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE treatment_progress;
  END IF;
END $$;

-- Ward Rounds & Assignments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'ward_rounds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ward_rounds;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'doctor_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE doctor_assignments;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'nurse_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nurse_assignments;
  END IF;
END $$;

-- Investigations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'investigations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE investigations;
  END IF;
END $$;

-- Communication
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'video_conferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE video_conferences;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'enhanced_video_conferences'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE enhanced_video_conferences;
  END IF;
END $$;

-- Discharge & Documentation
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'discharge_summaries'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE discharge_summaries;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'consumable_boms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE consumable_boms;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'histopathology_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE histopathology_requests;
  END IF;
END $$;

-- Blood Transfusion & MDT
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'blood_transfusions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE blood_transfusions;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'mdt_meetings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mdt_meetings;
  END IF;
END $$;

-- Limb Salvage
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'limb_salvage_assessments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE limb_salvage_assessments;
  END IF;
END $$;

-- Burn Care Monitoring
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'burn_monitoring_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE burn_monitoring_records;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'escharotomy_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE escharotomy_records;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'skin_graft_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE skin_graft_records;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'burn_care_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE burn_care_plans;
  END IF;
END $$;

-- Appointments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'appointment_reminders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointment_reminders;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'appointment_slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointment_slots;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'clinic_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE clinic_sessions;
  END IF;
END $$;

-- NPWT
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'npwt_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE npwt_sessions;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'npwt_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE npwt_notifications;
  END IF;
END $$;

-- Medication Charts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'medication_charts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE medication_charts;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'nurse_patient_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE nurse_patient_assignments;
  END IF;
END $$;

-- Transfusion
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'transfusion_orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transfusion_orders;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'transfusion_monitoring_charts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transfusion_monitoring_charts;
  END IF;
END $$;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify all tables have real-time enabled:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- All tables now have real-time enabled for instant cross-device sync
-- ============================================
