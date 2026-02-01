-- ============================================
-- MySQL Direct Migration: Add Missing Columns
-- Run each statement one by one
-- ============================================

-- TREATMENT_PLANS - Add missing columns
ALTER TABLE treatment_plans ADD COLUMN procedures JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN title VARCHAR(255) NULL;
ALTER TABLE treatment_plans ADD COLUMN description TEXT NULL;
ALTER TABLE treatment_plans ADD COLUMN clinical_goals JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN orders JSON NULL;
ALTER TABLE treatment_plans ADD COLUMN frequency VARCHAR(100) NULL;
ALTER TABLE treatment_plans ADD COLUMN phase VARCHAR(100) NULL;
ALTER TABLE treatment_plans ADD COLUMN related_entity_id VARCHAR(36) NULL;
ALTER TABLE treatment_plans ADD COLUMN related_entity_type VARCHAR(50) NULL;
ALTER TABLE treatment_plans ADD COLUMN expected_end_date DATE NULL;
ALTER TABLE treatment_plans ADD COLUMN actual_end_date DATE NULL;

-- LIMB_SALVAGE_ASSESSMENTS - Add missing columns
ALTER TABLE limb_salvage_assessments ADD COLUMN assessed_by_name VARCHAR(255) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN encounter_id VARCHAR(36) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN admission_id VARCHAR(36) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN patient_age INT NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN patient_gender VARCHAR(20) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN affected_side VARCHAR(20) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN wagner_grade JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN texas_classification JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN wifi_classification JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN sinbad_score JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN wound_location VARCHAR(255) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN wound_size JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN wound_shape VARCHAR(50) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN wound_duration INT NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN wounds JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN previous_debridement BOOLEAN DEFAULT FALSE;
ALTER TABLE limb_salvage_assessments ADD COLUMN debridement_count INT NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN wound_photos JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN doppler_findings JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN angiogram_performed BOOLEAN DEFAULT FALSE;
ALTER TABLE limb_salvage_assessments ADD COLUMN angiogram_findings TEXT NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN previous_revascularization BOOLEAN DEFAULT FALSE;
ALTER TABLE limb_salvage_assessments ADD COLUMN revascularization_details TEXT NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN monofilament_test BOOLEAN NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN vibration_sense BOOLEAN NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN ankle_reflexes VARCHAR(50) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN neuropathy_symptoms JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN osteomyelitis JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN sepsis JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN renal_status JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN comorbidities JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN albumin DECIMAL(5,2) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN prealbumin DECIMAL(5,2) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN bmi DECIMAL(5,2) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN must_score INT NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN limb_salvage_score JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN recommended_management VARCHAR(100) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN recommended_amputation_level VARCHAR(100) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN recommendations JSON NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN treatment_plan TEXT NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN follow_up_date DATE NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN progress_notes TEXT NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN actual_outcome VARCHAR(100) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN actual_amputation_level VARCHAR(100) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN outcome_date DATE NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
ALTER TABLE limb_salvage_assessments ADD COLUMN reviewed_by VARCHAR(36) NULL;
ALTER TABLE limb_salvage_assessments ADD COLUMN reviewed_at TIMESTAMP NULL;

-- VIDEO_CONFERENCES - Add indexes
CREATE INDEX idx_video_conferences_hospital_id ON video_conferences(hospital_id);
CREATE INDEX idx_video_conferences_scheduled_start ON video_conferences(scheduled_start);
CREATE INDEX idx_video_conferences_status ON video_conferences(status);
CREATE INDEX idx_video_conferences_created_at ON video_conferences(created_at);

-- Verify
SELECT 'Done! Columns added.' as status;
