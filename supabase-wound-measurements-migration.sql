-- ==========================================================
-- AstroHEALTH: Wound Measurement Records
-- Calibrated wound measurements with tissue analysis
-- ==========================================================

-- Table: wound_measurements
CREATE TABLE IF NOT EXISTS public.wound_measurements (
  id TEXT PRIMARY KEY,
  wound_id TEXT REFERENCES public.wounds(id) ON DELETE SET NULL,
  patient_id TEXT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  hospital_id TEXT REFERENCES public.hospitals(id) ON DELETE SET NULL,
  encounter_id TEXT REFERENCES public.clinical_encounters(id) ON DELETE SET NULL,

  -- Calibration
  calibration_method TEXT NOT NULL CHECK (calibration_method IN ('qr_marker','grid_sticker','ruler','coin','credit_card','custom','manual_points')),
  calibration_pixels_per_cm NUMERIC(8,2) NOT NULL,
  calibration_confidence NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Measurements (cm / cm²)
  length_cm NUMERIC(8,2) NOT NULL,
  width_cm NUMERIC(8,2) NOT NULL,
  area_cm2 NUMERIC(10,2) NOT NULL,
  perimeter_cm NUMERIC(8,2) NOT NULL,
  depth_cm NUMERIC(8,2),
  volume_cm3 NUMERIC(10,2),

  -- Tissue analysis
  granulation_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  slough_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  necrotic_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  epithelial_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  hypergranulation_percent NUMERIC(5,2) NOT NULL DEFAULT 0,

  -- Color / health
  dominant_color TEXT NOT NULL DEFAULT 'mixed' CHECK (dominant_color IN ('red','yellow','black','pink','mixed')),
  health_indicator TEXT NOT NULL DEFAULT 'healthy' CHECK (health_indicator IN ('healthy','concerning','critical')),

  -- Segmentation
  segmentation_method TEXT NOT NULL CHECK (segmentation_method IN ('ai_auto','ai_assisted','manual_trace')),
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  image_data_url TEXT,
  annotated_image_data_url TEXT,

  -- Meta
  measured_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wound_measurements_patient_id ON public.wound_measurements(patient_id);
CREATE INDEX IF NOT EXISTS idx_wound_measurements_wound_id ON public.wound_measurements(wound_id);
CREATE INDEX IF NOT EXISTS idx_wound_measurements_hospital_id ON public.wound_measurements(hospital_id);
CREATE INDEX IF NOT EXISTS idx_wound_measurements_created_at ON public.wound_measurements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wound_measurements_calibration ON public.wound_measurements(calibration_method);

-- RLS
ALTER TABLE public.wound_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wound measurements"
  ON public.wound_measurements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create wound measurements"
  ON public.wound_measurements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update wound measurements"
  ON public.wound_measurements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete wound measurements"
  ON public.wound_measurements FOR DELETE
  TO authenticated
  USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.wound_measurements;

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_wound_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wound_measurements_updated_at
  BEFORE UPDATE ON public.wound_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_wound_measurements_updated_at();
