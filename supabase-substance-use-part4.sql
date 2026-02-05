-- Part 4: Create trigger and enable realtime
-- Run this after Part 3 succeeds

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

-- Enable realtime (optional - skip if it fails)
-- ALTER PUBLICATION supabase_realtime ADD TABLE substance_use_assessments;

-- Add comments
COMMENT ON TABLE substance_use_assessments IS 'CSUD-DSM - Decision Support Only';
