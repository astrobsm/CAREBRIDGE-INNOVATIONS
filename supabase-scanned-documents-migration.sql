-- =====================================================
-- SUPABASE MIGRATION: Scanned Documents (OCR Document Scanner)
-- Run this in the Supabase SQL Editor.
--
-- Stores metadata, extracted fields, OCR text and the generated PDF for
-- documents scanned via the offline OCR scanner. The raw per-page images are
-- intentionally NOT synced (they are large and already embedded in the PDF);
-- they remain on the device that captured them.
-- =====================================================

CREATE TABLE IF NOT EXISTS scanned_documents (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE CASCADE,
  patient_name TEXT,
  hospital_id TEXT REFERENCES hospitals(id) ON DELETE SET NULL,
  ward_round_id TEXT,
  encounter_id TEXT,
  admission_id TEXT,
  document_type TEXT DEFAULT 'other' CHECK (document_type IN (
    'lab_result', 'radiology_report', 'operative_note', 'nursing_note',
    'consent_form', 'referral_letter', 'discharge_summary', 'ecg',
    'observation_chart', 'prescription', 'other'
  )),
  title TEXT,
  full_text TEXT,
  extracted_fields JSONB DEFAULT '[]'::jsonb,
  pdf_data_url TEXT,
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scanned_documents_patient ON scanned_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_hospital ON scanned_documents(hospital_id);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_ward_round ON scanned_documents(ward_round_id);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_type ON scanned_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_created_by ON scanned_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_scanned_documents_updated_at ON scanned_documents(updated_at);

-- Row Level Security
ALTER TABLE scanned_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scanned_documents_all" ON scanned_documents
  FOR ALL USING (true) WITH CHECK (true);

-- Real-time
ALTER PUBLICATION supabase_realtime ADD TABLE scanned_documents;

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_scanned_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scanned_documents_updated_at ON scanned_documents;
CREATE TRIGGER trg_scanned_documents_updated_at
  BEFORE UPDATE ON scanned_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_scanned_documents_updated_at();
