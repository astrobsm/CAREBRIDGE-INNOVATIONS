-- ============================================
-- SUBSTANCE USE ASSESSMENT MODULE
-- AstroHEALTH - Supabase PostgreSQL Migration
-- CSUD-DSM Decision Support System
-- ============================================

-- Drop existing tables if they exist (for clean re-run)
DROP TABLE IF EXISTS substance_use_clinical_summaries CASCADE;
DROP TABLE IF EXISTS substance_use_consents CASCADE;
DROP TABLE IF EXISTS detox_follow_ups CASCADE;
DROP TABLE IF EXISTS detox_monitoring_records CASCADE;
DROP TABLE IF EXISTS substance_use_assessments CASCADE;

-- ============================================
-- 1. Main Substance Use Assessments Table
-- ============================================
CREATE TABLE IF NOT EXISTS substance_use_assessments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    hospital_id TEXT NOT NULL,
    encounter_id TEXT,
    admission_id TEXT,
    
    -- Assessment Status
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'reviewed', 'archived')),
    assessment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assessed_by TEXT NOT NULL,
    assessed_by_name TEXT,
    reviewed_by TEXT,
    
    -- Primary Substance
    primary_substance TEXT NOT NULL,
    poly_substance_use BOOLEAN DEFAULT FALSE,
    
    -- Patient Context (JSONB fields)
    demographics JSONB NOT NULL DEFAULT '{}'::jsonb,
    social_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_detox_attempts INT DEFAULT 0,
    previous_detox_details TEXT,
    psychiatric_history JSONB NOT NULL DEFAULT '[]'::jsonb,
    psychiatric_history_notes TEXT,
    
    -- Substance Intake
    substances JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Addiction Severity
    addiction_severity_score JSONB DEFAULT NULL,
    
    -- Withdrawal Risk
    withdrawal_risk_prediction JSONB DEFAULT NULL,
    
    -- Pain Management
    pain_management_support JSONB DEFAULT NULL,
    
    -- Comorbidity Considerations
    relevant_comorbidities JSONB NOT NULL DEFAULT '[]'::jsonb,
    comorbidity_modifications JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Care Setting Decision
    care_setting_decision JSONB DEFAULT NULL,
    
    -- Clinical Override
    clinician_override JSONB DEFAULT NULL,
    
    -- Consent & Documentation
    consent JSONB DEFAULT NULL,
    patient_info_leaflet JSONB DEFAULT NULL,
    
    -- Exclusion Criteria Check
    exclusion_criteria_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Audit Trail
    audit_log JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Metadata
    clinical_summary TEXT,
    next_review_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    completed_by TEXT,
    synced_at TIMESTAMPTZ,
    local_id TEXT
);

-- ============================================
-- 2. Detox Monitoring Records Table
-- ============================================
CREATE TABLE IF NOT EXISTS detox_monitoring_records (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL REFERENCES substance_use_assessments(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL,
    
    -- Monitoring Data
    recorded_by TEXT NOT NULL,
    recorded_by_name TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Vital Signs
    vital_signs JSONB DEFAULT NULL,
    
    -- Withdrawal Scores
    withdrawal_scores JSONB DEFAULT NULL,
    
    -- Medications Administered
    medications_administered JSONB DEFAULT '[]'::jsonb,
    
    -- Clinical Notes
    clinical_notes TEXT,
    interventions TEXT,
    complications JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status TEXT DEFAULT 'recorded',
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- ============================================
-- 3. Detox Follow-Ups Table
-- ============================================
CREATE TABLE IF NOT EXISTS detox_follow_ups (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL REFERENCES substance_use_assessments(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL,
    
    -- Follow-Up Details
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'missed', 'cancelled', 'rescheduled')),
    scheduled_date DATE NOT NULL,
    actual_date DATE,
    
    -- Follow-Up Type
    follow_up_type TEXT NOT NULL DEFAULT 'routine' CHECK (follow_up_type IN ('routine', 'urgent', 'discharge', 'relapse_prevention')),
    
    -- Clinician
    scheduled_by TEXT NOT NULL,
    conducted_by TEXT,
    conducted_by_name TEXT,
    
    -- Assessment Data
    abstinence_status TEXT,
    relapse_triggers JSONB DEFAULT '[]'::jsonb,
    recovery_progress TEXT,
    medication_compliance TEXT,
    
    -- Clinical Notes
    notes TEXT,
    recommendations JSONB DEFAULT '[]'::jsonb,
    
    -- Next Steps
    next_follow_up_date DATE,
    referrals JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- ============================================
-- 4. Substance Use Consents Table
-- ============================================
CREATE TABLE IF NOT EXISTS substance_use_consents (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL REFERENCES substance_use_assessments(id) ON DELETE CASCADE,
    
    -- Consent Details
    consent_type TEXT NOT NULL DEFAULT 'treatment' CHECK (consent_type IN ('treatment', 'data_sharing', 'research', 'emergency_contact')),
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ,
    consent_withdrawn BOOLEAN DEFAULT FALSE,
    withdrawn_timestamp TIMESTAMPTZ,
    
    -- Patient Signature
    signature_data TEXT,
    witness_name TEXT,
    witness_signature TEXT,
    
    -- Consent Form Details
    form_version TEXT,
    form_language TEXT DEFAULT 'en',
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- ============================================
-- 5. Substance Use Clinical Summaries Table
-- ============================================
CREATE TABLE IF NOT EXISTS substance_use_clinical_summaries (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL REFERENCES substance_use_assessments(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL,
    
    -- Patient Info
    patient_name TEXT,
    hospital_name TEXT,
    assessment_date TIMESTAMPTZ,
    
    -- Summary Data
    addiction_score_summary JSONB DEFAULT NULL,
    risk_classification TEXT,
    recommended_pathway TEXT,
    key_findings JSONB DEFAULT '[]'::jsonb,
    recommended_interventions JSONB DEFAULT '[]'::jsonb,
    monitoring_checklist JSONB DEFAULT '[]'::jsonb,
    follow_up_schedule JSONB DEFAULT '[]'::jsonb,
    disclaimers JSONB DEFAULT '[]'::jsonb,
    
    -- Generation Info
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by TEXT NOT NULL,
    
    -- PDF
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    synced_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_substance_use_patient ON substance_use_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_substance_use_hospital ON substance_use_assessments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_substance_use_status ON substance_use_assessments(status);
CREATE INDEX IF NOT EXISTS idx_substance_use_primary_substance ON substance_use_assessments(primary_substance);
CREATE INDEX IF NOT EXISTS idx_substance_use_assessed_by ON substance_use_assessments(assessed_by);
CREATE INDEX IF NOT EXISTS idx_substance_use_assessment_date ON substance_use_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_substance_use_created_at ON substance_use_assessments(created_at);

CREATE INDEX IF NOT EXISTS idx_detox_monitoring_assessment ON detox_monitoring_records(assessment_id);
CREATE INDEX IF NOT EXISTS idx_detox_monitoring_patient ON detox_monitoring_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_detox_monitoring_recorded_at ON detox_monitoring_records(recorded_at);

CREATE INDEX IF NOT EXISTS idx_detox_follow_ups_assessment ON detox_follow_ups(assessment_id);
CREATE INDEX IF NOT EXISTS idx_detox_follow_ups_patient ON detox_follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_detox_follow_ups_status ON detox_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_detox_follow_ups_scheduled ON detox_follow_ups(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_substance_consents_assessment ON substance_use_consents(assessment_id);
CREATE INDEX IF NOT EXISTS idx_substance_summaries_assessment ON substance_use_clinical_summaries(assessment_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE substance_use_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE detox_monitoring_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE detox_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE substance_use_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE substance_use_clinical_summaries ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access (simplified policy)
CREATE POLICY "Allow all access to substance_use_assessments" ON substance_use_assessments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to detox_monitoring_records" ON detox_monitoring_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to detox_follow_ups" ON detox_follow_ups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to substance_use_consents" ON substance_use_consents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to substance_use_clinical_summaries" ON substance_use_clinical_summaries FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- TRIGGERS FOR updated_at
-- ============================================
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

DROP TRIGGER IF EXISTS trigger_detox_monitoring_updated_at ON detox_monitoring_records;
CREATE TRIGGER trigger_detox_monitoring_updated_at
    BEFORE UPDATE ON detox_monitoring_records
    FOR EACH ROW
    EXECUTE FUNCTION update_substance_use_updated_at();

DROP TRIGGER IF EXISTS trigger_detox_follow_ups_updated_at ON detox_follow_ups;
CREATE TRIGGER trigger_detox_follow_ups_updated_at
    BEFORE UPDATE ON detox_follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_substance_use_updated_at();

DROP TRIGGER IF EXISTS trigger_substance_consents_updated_at ON substance_use_consents;
CREATE TRIGGER trigger_substance_consents_updated_at
    BEFORE UPDATE ON substance_use_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_substance_use_updated_at();

DROP TRIGGER IF EXISTS trigger_substance_summaries_updated_at ON substance_use_clinical_summaries;
CREATE TRIGGER trigger_substance_summaries_updated_at
    BEFORE UPDATE ON substance_use_clinical_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_substance_use_updated_at();

-- ============================================
-- ENABLE REALTIME
-- ============================================
-- Run this manually in Supabase Dashboard if needed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE substance_use_assessments;
-- ALTER PUBLICATION supabase_realtime ADD TABLE detox_monitoring_records;
-- ALTER PUBLICATION supabase_realtime ADD TABLE detox_follow_ups;

-- ============================================
-- TABLE COMMENTS
-- ============================================
COMMENT ON TABLE substance_use_assessments IS 'CSUD-DSM Substance Use Disorder Assessment - Decision Support Only. Clinical responsibility rests with licensed clinician.';
COMMENT ON TABLE detox_monitoring_records IS 'Hourly/periodic monitoring records during detoxification';
COMMENT ON TABLE detox_follow_ups IS 'Follow-up appointments and relapse prevention tracking';
COMMENT ON TABLE substance_use_consents IS 'Patient consent records for treatment and data sharing';
COMMENT ON TABLE substance_use_clinical_summaries IS 'Generated clinical summary documents for PDF export';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Substance Use Assessment tables created successfully!' AS status;
