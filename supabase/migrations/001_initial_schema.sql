-- ==============================================================================
-- FIELD SHIFT – Adapting Farms with NASA Data
-- Stage 2 PostgreSQL Schema, Auth Trigger, RLS Policies, Storage & Seed Data
-- Run this script once in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enumerated types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('farmer', 'researcher', 'admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE soil_data_source AS ENUM (
    'laboratory_soil_test',
    'farmer_entered',
    'government_research_db',
    'model_derived_estimate'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE scenario_kind AS ENUM ('existing', 'alternative_nutrient', 'climate_resilient');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. User Profiles (Role is managed server-side; users cannot self-escalate to admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'farmer',
  phone TEXT,
  district TEXT,
  state TEXT NOT NULL DEFAULT 'Karnataka',
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'kn')),
  research_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatically populate public.profiles when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_role TEXT;
  v_safe_role user_role;
BEGIN
  v_requested_role := COALESCE(NEW.raw_user_meta_data->>'requested_role', 'farmer');
  IF v_requested_role = 'researcher' THEN
    v_safe_role := 'researcher';
  ELSE
    v_safe_role := 'farmer';
  END IF;

  INSERT INTO public.profiles (
    id,
    full_name,
    role,
    phone,
    district,
    state,
    preferred_language,
    research_verified
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), split_part(NEW.email, '@', 1)),
    v_safe_role,
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'district', ''), 'Mandya'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'state', ''), 'Karnataka'),
    CASE WHEN NEW.raw_user_meta_data->>'preferred_language' = 'kn' THEN 'kn' ELSE 'en' END,
    FALSE
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    district = COALESCE(EXCLUDED.district, public.profiles.district),
    state = COALESCE(EXCLUDED.state, public.profiles.state),
    preferred_language = EXCLUDED.preferred_language,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Farms
CREATE TABLE IF NOT EXISTS public.farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Karnataka',
  district TEXT NOT NULL,
  taluk TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  boundary_geojson JSONB,
  area NUMERIC(10, 2) NOT NULL CHECK (area > 0),
  area_unit TEXT NOT NULL DEFAULT 'acres' CHECK (area_unit IN ('acres', 'hectares')),
  agro_climatic_zone TEXT,
  elevation_m INTEGER,
  share_anonymized_for_research BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farms_user_id ON public.farms(user_id);
CREATE INDEX IF NOT EXISTS idx_farms_district_taluk ON public.farms(district, taluk);

-- 3. Soil Profiles (1 latest active profile per farm for clean upsert, expandable to history)
CREATE TABLE IF NOT EXISTS public.soil_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  soil_type TEXT NOT NULL,
  ph NUMERIC(4, 2) CHECK (ph BETWEEN 3.0 AND 10.5),
  nitrogen NUMERIC(8, 2) CHECK (nitrogen >= 0),
  phosphorus NUMERIC(8, 2) CHECK (phosphorus >= 0),
  potassium NUMERIC(8, 2) CHECK (potassium >= 0),
  organic_carbon NUMERIC(5, 3) CHECK (organic_carbon >= 0),
  soil_texture TEXT,
  soil_depth_cm INTEGER CHECK (soil_depth_cm > 0),
  water_availability TEXT,
  irrigation_type TEXT,
  source soil_data_source NOT NULL DEFAULT 'farmer_entered',
  report_storage_path TEXT,
  notes TEXT,
  tested_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id)
);

CREATE INDEX IF NOT EXISTS idx_soil_profiles_farm_id ON public.soil_profiles(farm_id);

-- 4. Crop Catalog (Validated agronomic attributes for Karnataka & expandable regions)
CREATE TABLE IF NOT EXISTS public.crop_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_name TEXT NOT NULL UNIQUE,
  kannada_name TEXT,
  scientific_name TEXT,
  growing_season TEXT[] NOT NULL,
  growing_duration_days INTEGER NOT NULL CHECK (growing_duration_days > 0),
  water_requirement TEXT NOT NULL CHECK (water_requirement IN ('Low', 'Moderate', 'High', 'Very High')),
  rooting_depth TEXT NOT NULL,
  nitrogen_fixing BOOLEAN NOT NULL DEFAULT FALSE,
  nutrient_requirements TEXT NOT NULL,
  soil_suitability TEXT[] NOT NULL,
  drought_tolerance TEXT NOT NULL CHECK (drought_tolerance IN ('Low', 'Moderate', 'High')),
  heat_tolerance TEXT NOT NULL CHECK (heat_tolerance IN ('Low', 'Moderate', 'High')),
  erosion_protection TEXT NOT NULL CHECK (erosion_protection IN ('Low', 'Moderate', 'High')),
  organic_matter_contribution TEXT NOT NULL CHECK (organic_matter_contribution IN ('Low', 'Moderate', 'High')),
  pest_considerations TEXT NOT NULL,
  market_suitability TEXT NOT NULL,
  forage_potential TEXT NOT NULL,
  reference_source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Farmer Priorities & Constraints
CREATE TABLE IF NOT EXISTS public.farmer_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  water_conservation INTEGER NOT NULL DEFAULT 3 CHECK (water_conservation BETWEEN 1 AND 5),
  soil_fertility INTEGER NOT NULL DEFAULT 3 CHECK (soil_fertility BETWEEN 1 AND 5),
  organic_matter INTEGER NOT NULL DEFAULT 3 CHECK (organic_matter BETWEEN 1 AND 5),
  erosion_control INTEGER NOT NULL DEFAULT 3 CHECK (erosion_control BETWEEN 1 AND 5),
  crop_diversity INTEGER NOT NULL DEFAULT 3 CHECK (crop_diversity BETWEEN 1 AND 5),
  pest_risk_reduction INTEGER NOT NULL DEFAULT 3 CHECK (pest_risk_reduction BETWEEN 1 AND 5),
  income INTEGER NOT NULL DEFAULT 3 CHECK (income BETWEEN 1 AND 5),
  forage_production INTEGER NOT NULL DEFAULT 2 CHECK (forage_production BETWEEN 1 AND 5),
  climate_resilience INTEGER NOT NULL DEFAULT 4 CHECK (climate_resilience BETWEEN 1 AND 5),
  market_suitability INTEGER NOT NULL DEFAULT 3 CHECK (market_suitability BETWEEN 1 AND 5),
  other_constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id)
);

-- 6. NASA Observations (Preserves exact source metadata & spatial/temporal resolution)
CREATE TABLE IF NOT EXISTS public.nasa_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  dataset TEXT NOT NULL,
  parameter TEXT NOT NULL,
  value DOUBLE PRECISION,
  unit TEXT NOT NULL,
  observation_date DATE NOT NULL,
  spatial_resolution TEXT NOT NULL,
  temporal_resolution TEXT NOT NULL,
  source_url TEXT NOT NULL,
  quality_flag TEXT NOT NULL DEFAULT 'valid',
  retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nasa_obs_farm_dataset_date ON public.nasa_observations(farm_id, dataset, observation_date DESC);

-- 7. Rotation Scenarios
CREATE TABLE IF NOT EXISTS public.rotation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  scenario_type scenario_kind NOT NULL,
  explanation TEXT NOT NULL,
  evaluation_results JSONB NOT NULL,
  limitations TEXT NOT NULL,
  farmer_decision TEXT CHECK (farmer_decision IN ('pending', 'accepted', 'modified', 'rejected')) DEFAULT 'pending',
  farmer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Rotation Items
CREATE TABLE IF NOT EXISTS public.rotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.rotation_scenarios(id) ON DELETE CASCADE,
  crop_id UUID NOT NULL REFERENCES public.crop_catalog(id),
  season TEXT NOT NULL CHECK (season IN ('Kharif', 'Rabi', 'Summer')),
  year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 5),
  sequence_order INTEGER NOT NULL CHECK (sequence_order > 0)
);

-- 9. ML Predictions
CREATE TABLE IF NOT EXISTS public.ml_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  model_version TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  prediction_result JSONB NOT NULL,
  confidence_information JSONB NOT NULL,
  input_summary JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crop_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nasa_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ml_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND role IN ('farmer', 'researcher')
    AND research_verified = FALSE
  );

DROP POLICY IF EXISTS "profiles_update_own_safe" ON public.profiles;
CREATE POLICY "profiles_update_own_safe" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
    AND research_verified = (SELECT p.research_verified FROM public.profiles p WHERE p.id = auth.uid())
  );

-- Farms policies
DROP POLICY IF EXISTS "farms_farmer_all" ON public.farms;
CREATE POLICY "farms_farmer_all" ON public.farms
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "farms_researcher_read_consented" ON public.farms;
CREATE POLICY "farms_researcher_read_consented" ON public.farms
  FOR SELECT USING (
    share_anonymized_for_research = TRUE
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('researcher', 'admin') AND p.research_verified = TRUE
    )
  );

-- Soil Profiles policies
DROP POLICY IF EXISTS "soil_profiles_owner_all" ON public.soil_profiles;
CREATE POLICY "soil_profiles_owner_all" ON public.soil_profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid())
  );

-- Farmer Priorities policies
DROP POLICY IF EXISTS "priorities_owner_all" ON public.farmer_priorities;
CREATE POLICY "priorities_owner_all" ON public.farmer_priorities
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid())
  );

-- Crop Catalog policies
DROP POLICY IF EXISTS "crop_catalog_public_read" ON public.crop_catalog;
CREATE POLICY "crop_catalog_public_read" ON public.crop_catalog
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "crop_catalog_admin_write" ON public.crop_catalog;
CREATE POLICY "crop_catalog_admin_write" ON public.crop_catalog
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- NASA Observations, Rotation Scenarios, ML Predictions, Reports policies
DROP POLICY IF EXISTS "nasa_obs_owner_read" ON public.nasa_observations;
CREATE POLICY "nasa_obs_owner_read" ON public.nasa_observations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rotation_scenarios_owner_all" ON public.rotation_scenarios;
CREATE POLICY "rotation_scenarios_owner_all" ON public.rotation_scenarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "rotation_items_owner_all" ON public.rotation_items;
CREATE POLICY "rotation_items_owner_all" ON public.rotation_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.rotation_scenarios rs
      JOIN public.farms f ON f.id = rs.farm_id
      WHERE rs.id = scenario_id AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ml_predictions_owner_read" ON public.ml_predictions;
CREATE POLICY "ml_predictions_owner_read" ON public.ml_predictions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.farms f WHERE f.id = farm_id AND f.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "reports_owner_all" ON public.reports;
CREATE POLICY "reports_owner_all" ON public.reports
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- PRIVATE STORAGE BUCKETS & POLICIES
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('soil-reports', 'soil-reports', FALSE, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('research-reports', 'research-reports', FALSE, 10485760, ARRAY['application/pdf', 'text/csv']),
  ('farm-documents', 'farm-documents', FALSE, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "soil_reports_user_upload" ON storage.objects;
CREATE POLICY "soil_reports_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'soil-reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "soil_reports_user_read" ON storage.objects;
CREATE POLICY "soil_reports_user_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'soil-reports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ==============================================================================
-- SEED VALIDATED KARNATAKA CROP CATALOG
-- ==============================================================================
INSERT INTO public.crop_catalog (
  crop_name, kannada_name, scientific_name, growing_season, growing_duration_days,
  water_requirement, rooting_depth, nitrogen_fixing, nutrient_requirements,
  soil_suitability, drought_tolerance, heat_tolerance, erosion_protection,
  organic_matter_contribution, pest_considerations, market_suitability,
  forage_potential, reference_source
) VALUES
  ('Paddy (Rice)', 'ಭತ್ತ (Bhatta)', 'Oryza sativa', ARRAY['Kharif','Summer'], 130, 'Very High', 'Shallow (15–30 cm)', FALSE, 'High N (100–120 kg/ha), Moderate P & K', ARRAY['Clay soil','Alluvial soil','Loamy soil'], 'Low', 'Moderate', 'Moderate', 'Moderate', 'Continuous paddy favors stem borer, brown planthopper, and blast.', 'MSP & Staple Market', 'Moderate', 'ICAR-IIRR & UAS Bengaluru'),
  ('Ragi (Finger Millet)', 'ರಾಗಿ (Ragi)', 'Eleusine coracana', ARRAY['Kharif','Rabi'], 110, 'Low', 'Medium (30–60 cm)', FALSE, 'Low-Moderate N (50 kg/ha), P2O5 (40 kg/ha)', ARRAY['Red soil','Loamy soil','Lateritic soil','Sandy soil'], 'High', 'High', 'High', 'Moderate', 'Neck blast in humid spells; breaks cereal-paddy pest cycles.', 'MSP & Staple Market', 'High', 'ICAR-IIMR & UAS Bengaluru'),
  ('Maize', 'ಮೆಕ್ಕೆಜೋಳ (Mekkejola)', 'Zea mays', ARRAY['Kharif','Rabi','Summer'], 110, 'Moderate', 'Medium (30–60 cm)', FALSE, 'High N (120–150 kg/ha), High P & K, Zinc sensitive', ARRAY['Red soil','Black soil','Loamy soil','Alluvial soil'], 'Moderate', 'Moderate', 'Moderate', 'Moderate', 'Fall armyworm risk under monocropping; rotate with legumes.', 'High Commercial Demand', 'High', 'ICAR-IIMR'),
  ('Sugarcane', 'ಕಬ್ಬು (Kabbu)', 'Saccharum officinarum', ARRAY['Kharif','Rabi'], 330, 'Very High', 'Deep (60–120+ cm)', FALSE, 'Very High N (250 kg/ha), P & K', ARRAY['Alluvial soil','Black soil','Loamy soil','Red soil'], 'Low', 'High', 'High', 'High', 'Ratoon stunting, early shoot borer, white grub in continuous cane.', 'High Commercial Demand', 'Moderate', 'UAS Mandya & ICAR-SBI'),
  ('Groundnut', 'ಶೇಂಗಾ / ನೆಲಗಡಲೆ (Shenga)', 'Arachis hypogaea', ARRAY['Kharif','Summer'], 110, 'Low', 'Medium (30–60 cm)', TRUE, 'Low N starter, Moderate P, High Calcium & Sulphur', ARRAY['Red soil','Sandy soil','Loamy soil'], 'High', 'High', 'High', 'Moderate', 'Tikka leaf spot & collar rot if repeated without cereal break.', 'High Commercial Demand', 'High', 'ICAR-DGR & UAS Dharwad'),
  ('Green Gram (Moong)', 'ಹೆಸರು ಕಾಳು (Hesaru)', 'Vigna radiata', ARRAY['Kharif','Summer'], 68, 'Low', 'Shallow (15–30 cm)', TRUE, 'Low N (20 kg/ha starter), Moderate P', ARRAY['Red soil','Black soil','Loamy soil','Alluvial soil'], 'High', 'High', 'High', 'High', 'Yellow mosaic virus & pod borer; ideal short-duration catch crop.', 'High Commercial Demand', 'Moderate', 'ICAR-IIPR'),
  ('Black Gram (Urad)', 'ಉದ್ದಿನ ಕಾಳು (Uddina Kalu)', 'Vigna mungo', ARRAY['Kharif','Rabi'], 75, 'Low', 'Shallow (15–30 cm)', TRUE, 'Low N starter, Moderate P & Sulphur', ARRAY['Black soil','Loamy soil','Clay soil'], 'High', 'Moderate', 'High', 'High', 'Powdery mildew in late Rabi; breaks cereal disease cycles.', 'High Commercial Demand', 'Moderate', 'ICAR-IIPR & UAS Dharwad'),
  ('Red Gram (Pigeon Pea / Tur)', 'ತೊಗರಿ (Togari)', 'Cajanus cajan', ARRAY['Kharif'], 165, 'Low', 'Deep (60–120+ cm)', TRUE, 'Low N starter, Moderate P & Zinc', ARRAY['Red soil','Black soil','Loamy soil'], 'High', 'High', 'High', 'High', 'Pod borer & wilt; avoid continuous pigeon pea.', 'MSP & Staple Market', 'Moderate', 'UAS Kalaburagi & ICRISAT'),
  ('Horse Gram', 'ಹುರುಳಿ (Huruli)', 'Macrotyloma uniflorum', ARRAY['Rabi'], 95, 'Low', 'Medium (30–60 cm)', TRUE, 'Very Low (thrives on residual moisture)', ARRAY['Red soil','Lateritic soil','Sandy soil','Loamy soil'], 'High', 'High', 'High', 'High', 'Low pest pressure; strong dryland soil-cover legume.', 'Local & Regional', 'High', 'UAS Bengaluru'),
  ('Cowpea', 'ಅಲಸಂದೆ (Alasande)', 'Vigna unguiculata', ARRAY['Kharif','Rabi','Summer'], 75, 'Low', 'Medium (30–60 cm)', TRUE, 'Low N starter, Moderate P', ARRAY['Red soil','Sandy soil','Loamy soil','Lateritic soil'], 'High', 'High', 'High', 'High', 'Aphids & pod bugs; quick canopy shades out weeds.', 'Local & Regional', 'High', 'ICAR-IGFRI & UAS Bengaluru'),
  ('Soybean', 'ಸೋಯಾಬೀನ್ (Soyabean)', 'Glycine max', ARRAY['Kharif'], 100, 'Moderate', 'Medium (30–60 cm)', TRUE, 'Low N starter, Moderate-High P & Sulphur', ARRAY['Black soil','Loamy soil','Clay soil'], 'Moderate', 'Moderate', 'High', 'High', 'Soybean rust & defoliators; avoid waterlogged clays.', 'High Commercial Demand', 'Moderate', 'ICAR-IISR & UAS Dharwad'),
  ('Sunflower', 'ಸೂರ್ಯಕಾಂತಿ (Suryakanthi)', 'Helianthus annuus', ARRAY['Kharif','Rabi','Summer'], 95, 'Low', 'Deep (60–120+ cm)', FALSE, 'Moderate N & P, High Boron & Sulphur responsiveness', ARRAY['Black soil','Red soil','Loamy soil'], 'High', 'High', 'Moderate', 'Moderate', 'Head borer & necrosis virus; breaks grass/legume root diseases.', 'High Commercial Demand', 'Low', 'ICAR-IIOR & UAS Raichur'),
  ('Sorghum (Jowar)', 'ಜೋಳ (Jola)', 'Sorghum bicolor', ARRAY['Kharif','Rabi'], 110, 'Low', 'Deep (60–120+ cm)', FALSE, 'Moderate N (60–80 kg/ha), Moderate P', ARRAY['Black soil','Red soil','Loamy soil'], 'High', 'High', 'High', 'High', 'Shoot fly in late sowing; Rabi Jowar excels on black soil residual moisture.', 'MSP & Staple Market', 'High', 'ICAR-IIMR & UAS Dharwad')
ON CONFLICT (crop_name) DO NOTHING;
