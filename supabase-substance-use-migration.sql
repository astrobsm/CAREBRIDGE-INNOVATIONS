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
