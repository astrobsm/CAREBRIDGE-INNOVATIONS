-- Substance Use Disorder Assessment Migration for Supabase
-- CSUD-DSM Module - Comprehensive Substance Use Disorder Assessment & Detoxification Support Module
-- Created: 2026-02-04

-- Enable RLS
ALTER TABLE IF EXISTS substance_use_assessments ENABLE ROW LEVEL SECURITY;

-- Create the substance_use_assessments table
CREATE TABLE IF NOT EXISTS substance_use_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL,
    
    -- Status and Assessment Info
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'reviewed', 'archived')),
    assessed_by UUID NOT NULL REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Primary Substance
    primary_substance TEXT NOT NULL,
    
    -- Demographics (JSON)
    demographics JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Social Factors (JSON)
    social_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Legal Status
    legal_status JSONB DEFAULT NULL,
    
    -- Previous Detox Attempts (JSON Array)
    previous_detox_attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Psychiatric History (JSON)
    psychiatric_history JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Substances (JSON Array of SubstanceIntake)
    substances JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Addiction Severity Score (JSON)
    addiction_severity_score JSONB DEFAULT NULL,
    
    -- Withdrawal Risk Prediction (JSON)
    withdrawal_prediction JSONB DEFAULT NULL,
    
    -- Pain Management Support (JSON)
    pain_management JSONB DEFAULT NULL,
    
    -- Comorbidity Modifications (JSON Array)
    comorbidity_modifications JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Care Setting Decision (JSON)
    care_setting_decision JSONB DEFAULT NULL,
    
    -- Documentation
    consent_document JSONB DEFAULT NULL,
    patient_info_leaflet JSONB DEFAULT NULL,
    
    -- Monitoring Records (JSON Array)
    monitoring_records JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Follow-up Schedule (JSON Array)
    follow_up_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Exclusion Criteria (JSON)
    exclusion_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Audit Log (JSON Array)
    audit_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Clinical Summary
    clinical_summary TEXT,
    next_review_date TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES users(id),
    
    -- Sync tracking
    synced_at TIMESTAMPTZ,
    local_id TEXT
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_substance_use_patient ON substance_use_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_substance_use_hospital ON substance_use_assessments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_substance_use_status ON substance_use_assessments(status);
CREATE INDEX IF NOT EXISTS idx_substance_use_primary_substance ON substance_use_assessments(primary_substance);
CREATE INDEX IF NOT EXISTS idx_substance_use_assessed_by ON substance_use_assessments(assessed_by);
CREATE INDEX IF NOT EXISTS idx_substance_use_assessment_date ON substance_use_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_substance_use_created_at ON substance_use_assessments(created_at);

-- RLS Policies
CREATE POLICY "Users can view substance use assessments from their hospital"
    ON substance_use_assessments FOR SELECT
    USING (
        hospital_id IN (
            SELECT hospital_id FROM users WHERE id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'
        )
    );

CREATE POLICY "Users can create substance use assessments"
    ON substance_use_assessments FOR INSERT
    WITH CHECK (
        assessed_by = auth.uid()
        AND hospital_id IN (
            SELECT hospital_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own assessments or be reviewers"
    ON substance_use_assessments FOR UPDATE
    USING (
        assessed_by = auth.uid()
        OR reviewed_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'hospital_admin', 'consultant')
        )
    );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_substance_use_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_substance_use_updated_at ON substance_use_assessments;
CREATE TRIGGER trigger_substance_use_updated_at
    BEFORE UPDATE ON substance_use_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_substance_use_updated_at();

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE substance_use_assessments;

-- Comments for documentation
COMMENT ON TABLE substance_use_assessments IS 'Comprehensive Substance Use Disorder Assessment & Detoxification Support Module (CSUD-DSM) - Decision Support Only';
COMMENT ON COLUMN substance_use_assessments.status IS 'Assessment status: in_progress, completed, reviewed, archived';
COMMENT ON COLUMN substance_use_assessments.primary_substance IS 'Primary substance of concern';
COMMENT ON COLUMN substance_use_assessments.addiction_severity_score IS 'Composite addiction severity scoring (WHO-aligned)';
COMMENT ON COLUMN substance_use_assessments.withdrawal_prediction IS 'Predicted withdrawal timeline and symptoms';
COMMENT ON COLUMN substance_use_assessments.care_setting_decision IS 'Recommended care setting (inpatient/outpatient)';
COMMENT ON COLUMN substance_use_assessments.audit_log IS 'Audit trail for all clinical decisions and overrides';

-- =====================================================
-- DETOX MONITORING RECORDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS detox_monitoring_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES substance_use_assessments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Monitoring Data
    recorded_by UUID NOT NULL REFERENCES users(id),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Vital Signs
    vital_signs JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Withdrawal Assessment Scores (CIWA, COWS, etc.)
    withdrawal_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Symptoms
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Interventions
    interventions JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Notes
    clinical_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detox_monitoring_assessment ON detox_monitoring_records(assessment_id);
CREATE INDEX IF NOT EXISTS idx_detox_monitoring_patient ON detox_monitoring_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_detox_monitoring_recorded_at ON detox_monitoring_records(recorded_at);

ALTER TABLE detox_monitoring_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view detox monitoring from their hospital"
    ON detox_monitoring_records FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM patients WHERE registered_hospital_id IN (
                SELECT hospital_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create detox monitoring records"
    ON detox_monitoring_records FOR INSERT
    WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Users can update their own monitoring records"
    ON detox_monitoring_records FOR UPDATE
    USING (recorded_by = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE detox_monitoring_records;

-- =====================================================
-- DETOX FOLLOW-UPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS detox_follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES substance_use_assessments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Follow-up Status
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled', 'rescheduled')),
    
    -- Dates
    scheduled_date TIMESTAMPTZ NOT NULL,
    actual_date TIMESTAMPTZ,
    
    -- Follow-up Details
    follow_up_type TEXT NOT NULL DEFAULT 'routine',
    conducted_by UUID REFERENCES users(id),
    
    -- Outcome
    outcome JSONB DEFAULT NULL,
    clinical_notes TEXT,
    
    -- Rescheduling
    rescheduled_to TIMESTAMPTZ,
    rescheduled_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_detox_followup_assessment ON detox_follow_ups(assessment_id);
CREATE INDEX IF NOT EXISTS idx_detox_followup_patient ON detox_follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_detox_followup_status ON detox_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_detox_followup_scheduled ON detox_follow_ups(scheduled_date);

ALTER TABLE detox_follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view follow-ups from their hospital"
    ON detox_follow_ups FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM patients WHERE registered_hospital_id IN (
                SELECT hospital_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create follow-ups"
    ON detox_follow_ups FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update follow-ups"
    ON detox_follow_ups FOR UPDATE
    USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE detox_follow_ups;

-- =====================================================
-- SUBSTANCE USE CONSENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS substance_use_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES substance_use_assessments(id) ON DELETE CASCADE,
    
    -- Consent Information
    consent_type TEXT NOT NULL DEFAULT 'treatment',
    consent_given BOOLEAN NOT NULL DEFAULT false,
    consent_timestamp TIMESTAMPTZ,
    
    -- Witness
    witness_name TEXT,
    witness_id UUID REFERENCES users(id),
    
    -- Digital Signature
    patient_signature TEXT,
    witness_signature TEXT,
    
    -- Document
    consent_document_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_substance_consent_assessment ON substance_use_consents(assessment_id);

ALTER TABLE substance_use_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view consents"
    ON substance_use_consents FOR SELECT
    USING (true);

CREATE POLICY "Users can create consents"
    ON substance_use_consents FOR INSERT
    WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE substance_use_consents;

-- =====================================================
-- SUBSTANCE USE CLINICAL SUMMARIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS substance_use_clinical_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES substance_use_assessments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    
    -- Summary Content
    summary_type TEXT NOT NULL DEFAULT 'discharge',
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by UUID NOT NULL REFERENCES users(id),
    
    -- Summary Data
    summary_content JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Recommendations
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Follow-up Plan
    follow_up_plan JSONB DEFAULT NULL,
    
    -- PDF Document
    pdf_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_substance_summary_assessment ON substance_use_clinical_summaries(assessment_id);
CREATE INDEX IF NOT EXISTS idx_substance_summary_patient ON substance_use_clinical_summaries(patient_id);
CREATE INDEX IF NOT EXISTS idx_substance_summary_generated_at ON substance_use_clinical_summaries(generated_at);

ALTER TABLE substance_use_clinical_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view clinical summaries from their hospital"
    ON substance_use_clinical_summaries FOR SELECT
    USING (
        patient_id IN (
            SELECT id FROM patients WHERE registered_hospital_id IN (
                SELECT hospital_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create clinical summaries"
    ON substance_use_clinical_summaries FOR INSERT
    WITH CHECK (generated_by = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE substance_use_clinical_summaries;

-- =====================================================
-- MEETING MINUTES TABLE (if not exists)
-- =====================================================

CREATE TABLE IF NOT EXISTS meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conference_id UUID REFERENCES enhanced_video_conferences(id) ON DELETE SET NULL,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    host_id UUID NOT NULL REFERENCES users(id),
    
    -- Meeting Details
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'archived')),
    meeting_date TIMESTAMPTZ NOT NULL,
    meeting_type TEXT NOT NULL DEFAULT 'general',
    
    -- Content
    attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
    agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
    discussion_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
    action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Transcription
    transcription TEXT,
    transcription_status TEXT DEFAULT 'none',
    
    -- PDF
    pdf_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_minutes_hospital ON meeting_minutes(hospital_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_patient ON meeting_minutes(patient_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_date ON meeting_minutes(meeting_date);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_status ON meeting_minutes(status);

ALTER TABLE meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting minutes from their hospital"
    ON meeting_minutes FOR SELECT
    USING (
        hospital_id IN (
            SELECT hospital_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create meeting minutes"
    ON meeting_minutes FOR INSERT
    WITH CHECK (host_id = auth.uid());

CREATE POLICY "Hosts can update their meeting minutes"
    ON meeting_minutes FOR UPDATE
    USING (host_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE meeting_minutes;