-- Part 3: Create RLS policies
-- Run this after Part 2 succeeds

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
