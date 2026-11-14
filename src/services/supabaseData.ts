import { getSupabaseClient } from '../lib/supabase';
import { KARNATAKA_DISTRICTS } from '../data/karnatakaData';
import type {
  CropCharacteristic,
  Farm,
  FarmDecisionState,
  FarmerPriorities,
  LanguageCode,
  RotationStrategyResult,
  SoilDataSource,
  SoilProfile,
  SoilType,
  UserRole,
  UserSession,
} from '../types/fieldShift';

const SOURCE_TO_DB: Record<SoilDataSource, string> = {
  'Laboratory soil test': 'laboratory_soil_test',
  'Farmer-entered information': 'farmer_entered',
  'Government or research database': 'government_research_db',
  'Model-derived estimate': 'model_derived_estimate',
};

const DB_TO_SOURCE: Record<string, SoilDataSource> = {
  laboratory_soil_test: 'Laboratory soil test',
  farmer_entered: 'Farmer-entered information',
  government_research_db: 'Government or research database',
  model_derived_estimate: 'Model-derived estimate',
};

export function isSchemaMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; status?: number };
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    e.status === 404 ||
    Boolean(e.message && (e.message.includes('does not exist') || e.message.includes('Could not find the table')))
  );
}

export async function checkSupabaseSchemaReady(): Promise<{
  connected: boolean;
  schemaReady: boolean;
  message?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { connected: false, schemaReady: false, message: 'Supabase credentials not configured.' };
  }
  const { error } = await supabase.from('crop_catalog').select('id').limit(1);
  if (error) {
    if (isSchemaMissingError(error)) {
      return {
        connected: true,
        schemaReady: false,
        message: 'Connected to Supabase, but tables from supabase/migrations/001_initial_schema.sql are not created yet.',
      };
    }
    return { connected: true, schemaReady: true };
  }
  return { connected: true, schemaReady: true };
}

export interface AuthActionResult {
  session?: UserSession;
  needsEmailConfirmation?: boolean;
  schemaMissing?: boolean;
  error?: string;
}

export async function signUpWithSupabase(input: {
  fullName: string;
  email: string;
  password: string;
  requestedRole: UserRole;
  phone?: string;
  district: string;
  state: string;
  preferredLanguage: LanguageCode;
}): Promise<AuthActionResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: 'Supabase client is not configured.' };
  }

  const safeRequestedRole: UserRole = input.requestedRole === 'researcher' ? 'researcher' : 'farmer';

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        requested_role: safeRequestedRole,
        phone: input.phone ?? '',
        district: input.district,
        state: input.state,
        preferred_language: input.preferredLanguage,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.user) {
    return { error: 'Registration did not return a user record.' };
  }

  // If Supabase auto-confirmed (session returned), also ensure profile row is synced cleanly
  if (data.session) {
    const { error: profileErr } = await supabase.from('profiles').upsert(
      {
        id: data.user.id,
        full_name: input.fullName,
        role: safeRequestedRole,
        phone: input.phone || null,
        district: input.district,
        state: input.state,
        preferred_language: input.preferredLanguage,
      },
      { onConflict: 'id' }
    );

    const schemaMissing = isSchemaMissingError(profileErr);

    return {
      schemaMissing,
      session: {
        id: data.user.id,
        fullName: input.fullName,
        email: data.user.email ?? input.email,
        role: safeRequestedRole,
        phone: input.phone,
        district: input.district,
        state: input.state,
        preferredLanguage: input.preferredLanguage,
        isDemoSession: false,
      },
    };
  }

  return {
    needsEmailConfirmation: true,
  };
}

export async function signInWithSupabase(
  email: string,
  password: string
): Promise<AuthActionResult> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { error: 'Supabase client is not configured.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: 'Sign in succeeded without user data.' };
  }

  return loadSessionProfile(data.user.id, data.user.email ?? email, data.user.user_metadata);
}

export async function loadSessionProfile(
  userId: string,
  email: string,
  metadata?: Record<string, unknown>
): Promise<AuthActionResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase client is not configured.' };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error && isSchemaMissingError(error)) {
    return {
      schemaMissing: true,
      session: {
        id: userId,
        fullName: String(metadata?.full_name || email.split('@')[0]),
        email,
        role: (metadata?.requested_role === 'researcher' ? 'researcher' : 'farmer') as UserRole,
        phone: metadata?.phone ? String(metadata.phone) : undefined,
        district: String(metadata?.district || 'Mandya'),
        state: String(metadata?.state || 'Karnataka'),
        preferredLanguage: metadata?.preferred_language === 'kn' ? 'kn' : 'en',
        isDemoSession: false,
      },
    };
  }

  if (!profile) {
    // Attempt creating profile from auth metadata if trigger wasn't run yet
    const fallbackFullName = String(metadata?.full_name || email.split('@')[0]);
    const fallbackRole: UserRole = metadata?.requested_role === 'researcher' ? 'researcher' : 'farmer';
    const fallbackDistrict = String(metadata?.district || 'Mandya');
    const fallbackState = String(metadata?.state || 'Karnataka');
    const fallbackLang: LanguageCode = metadata?.preferred_language === 'kn' ? 'kn' : 'en';

    await supabase.from('profiles').insert({
      id: userId,
      full_name: fallbackFullName,
      role: fallbackRole,
      phone: metadata?.phone ? String(metadata.phone) : null,
      district: fallbackDistrict,
      state: fallbackState,
      preferred_language: fallbackLang,
      research_verified: false,
    });

    return {
      session: {
        id: userId,
        fullName: fallbackFullName,
        email,
        role: fallbackRole,
        phone: metadata?.phone ? String(metadata.phone) : undefined,
        district: fallbackDistrict,
        state: fallbackState,
        preferredLanguage: fallbackLang,
        isDemoSession: false,
      },
    };
  }

  return {
    session: {
      id: profile.id,
      fullName: profile.full_name,
      email,
      role: profile.role as UserRole,
      phone: profile.phone ?? undefined,
      district: profile.district ?? 'Mandya',
      state: profile.state ?? 'Karnataka',
      preferredLanguage: (profile.preferred_language === 'kn' ? 'kn' : 'en') as LanguageCode,
      isDemoSession: false,
    },
  };
}

export async function resetPasswordInSupabase(email: string): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase client is not configured.' };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  return error ? { error: error.message } : {};
}

export async function signOutFromSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function updateLanguageInSupabase(userId: string, lang: LanguageCode): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  await supabase.from('profiles').update({ preferred_language: lang }).eq('id', userId);
}

export async function fetchUserWorkspaceData(userId: string): Promise<{
  farms: Farm[];
  soilProfiles: Record<string, SoilProfile>;
  prioritiesMap: Record<string, FarmerPriorities>;
  decisions: Record<string, FarmDecisionState>;
  schemaMissing?: boolean;
  error?: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { farms: [], soilProfiles: {}, prioritiesMap: {}, decisions: {} };
  }

  const { data: farmRows, error: farmErr } = await supabase
    .from('farms')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (farmErr) {
    return {
      farms: [],
      soilProfiles: {},
      prioritiesMap: {},
      decisions: {},
      schemaMissing: isSchemaMissingError(farmErr),
      error: farmErr.message,
    };
  }

  const farms: Farm[] = (farmRows ?? []).map((row) => {
    const distObj = KARNATAKA_DISTRICTS.find((d) => d.name === row.district);
    return {
      id: row.id,
      farmName: row.farm_name,
      state: row.state,
      district: row.district,
      taluk: row.taluk,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      area: Number(row.area),
      areaUnit: row.area_unit === 'hectares' ? 'hectares' : 'acres',
      agroClimaticZone: row.agro_climatic_zone || distObj?.agroClimaticZone || 'Karnataka Zone',
      elevationM: row.elevation_m ?? 650,
      boundaryCoords: Array.isArray(row.boundary_geojson) ? row.boundary_geojson : undefined,
      shareAnonymizedForResearch: Boolean(row.share_anonymized_for_research),
      createdAt: String(row.created_at).slice(0, 10),
    };
  });

  if (farms.length === 0) {
    return { farms: [], soilProfiles: {}, prioritiesMap: {}, decisions: {} };
  }

  const farmIds = farms.map((f) => f.id);

  const [{ data: soilRows }, { data: priorityRows }, { data: scenarioRows }] = await Promise.all([
    supabase.from('soil_profiles').select('*').in('farm_id', farmIds),
    supabase.from('farmer_priorities').select('*').in('farm_id', farmIds),
    supabase
      .from('rotation_scenarios')
      .select('*')
      .in('farm_id', farmIds)
      .order('created_at', { ascending: false }),
  ]);

  const soilProfiles: Record<string, SoilProfile> = {};
  (soilRows ?? []).forEach((s) => {
    soilProfiles[s.farm_id] = {
      farmId: s.farm_id,
      soilType: (s.soil_type as SoilType) || 'Red soil',
      ph: s.ph !== null ? Number(s.ph) : null,
      nitrogenKgHa: s.nitrogen !== null ? Number(s.nitrogen) : null,
      phosphorusKgHa: s.phosphorus !== null ? Number(s.phosphorus) : null,
      potassiumKgHa: s.potassium !== null ? Number(s.potassium) : null,
      organicCarbonPct: s.organic_carbon !== null ? Number(s.organic_carbon) : null,
      soilTexture: s.soil_texture || 'Pending texture entry',
      soilDepthCm: s.soil_depth_cm !== null ? Number(s.soil_depth_cm) : null,
      waterAvailability:
        (s.water_availability as SoilProfile['waterAvailability']) || 'Rainfed only',
      irrigationType: s.irrigation_type || 'Rainfed',
      soilTestDate: s.tested_at ?? null,
      source: DB_TO_SOURCE[s.source] ?? 'Farmer-entered information',
      uploadedReportName: s.report_storage_path ? String(s.report_storage_path).split('/').pop() : undefined,
      notes: s.notes || '',
    };
  });

  const prioritiesMap: Record<string, FarmerPriorities> = {};
  (priorityRows ?? []).forEach((p) => {
    const c = (p.other_constraints ?? {}) as Partial<FarmerPriorities['constraints']>;
    prioritiesMap[p.farm_id] = {
      farmId: p.farm_id,
      waterConservation: p.water_conservation,
      soilFertility: p.soil_fertility,
      organicMatter: p.organic_matter,
      erosionControl: p.erosion_control,
      cropDiversity: p.crop_diversity,
      pestRiskReduction: p.pest_risk_reduction,
      farmIncome: p.income,
      forageProduction: p.forage_production,
      climateResilience: p.climate_resilience,
      marketSuitability: p.market_suitability,
      constraints: {
        irrigationAvailable: c.irrigationAvailable ?? 'None (Rainfed)',
        equipmentAccess: c.equipmentAccess ?? 'Shared Tractor',
        laborAvailability: c.laborAvailability ?? 'Moderate',
        budgetLevel: c.budgetLevel ?? 'Moderate',
        marketAccess: c.marketAccess ?? 'APMC Mandi (<25 km)',
        preferredSeasons: Array.isArray(c.preferredSeasons) ? c.preferredSeasons : ['Kharif', 'Rabi'],
        existingCommitments: c.existingCommitments ?? '',
      },
    };
  });

  const decisions: Record<string, FarmDecisionState> = {};
  (scenarioRows ?? []).forEach((r) => {
    if (!decisions[r.farm_id] && r.farmer_decision) {
      decisions[r.farm_id] = {
        decision: r.farmer_decision,
        selectedStrategyId:
          r.scenario_type === 'existing'
            ? 'strategy_a'
            : r.scenario_type === 'alternative_nutrient'
            ? 'strategy_b'
            : 'strategy_c',
        farmerNote: r.farmer_note ?? undefined,
      };
    }
  });

  return { farms, soilProfiles, prioritiesMap, decisions };
}

export async function createFarmInSupabase(
  userId: string,
  farmInput: Omit<Farm, 'id' | 'createdAt'>,
  initialSoil: Omit<SoilProfile, 'farmId'>,
  initialPriorities: Omit<FarmerPriorities, 'farmId'>
): Promise<{ farm?: Farm; error?: string; schemaMissing?: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase not configured.' };

  const { data, error } = await supabase
    .from('farms')
    .insert({
      user_id: userId,
      farm_name: farmInput.farmName,
      state: farmInput.state,
      district: farmInput.district,
      taluk: farmInput.taluk,
      latitude: farmInput.latitude,
      longitude: farmInput.longitude,
      area: farmInput.area,
      area_unit: farmInput.areaUnit,
      agro_climatic_zone: farmInput.agroClimaticZone,
      elevation_m: farmInput.elevationM,
      boundary_geojson: farmInput.boundaryCoords ?? null,
      share_anonymized_for_research: farmInput.shareAnonymizedForResearch,
    })
    .select('*')
    .single();

  if (error || !data) {
    return {
      error: error?.message ?? 'Could not save farm.',
      schemaMissing: isSchemaMissingError(error),
    };
  }

  // Create initial linked soil_profile and farmer_priorities rows
  await Promise.all([
    upsertSoilProfileInSupabase(userId, { ...initialSoil, farmId: data.id }),
    upsertPrioritiesInSupabase({ ...initialPriorities, farmId: data.id }),
  ]);

  return {
    farm: {
      id: data.id,
      farmName: data.farm_name,
      state: data.state,
      district: data.district,
      taluk: data.taluk,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      area: Number(data.area),
      areaUnit: data.area_unit === 'hectares' ? 'hectares' : 'acres',
      agroClimaticZone: data.agro_climatic_zone || farmInput.agroClimaticZone,
      elevationM: data.elevation_m ?? farmInput.elevationM,
      boundaryCoords: farmInput.boundaryCoords,
      shareAnonymizedForResearch: Boolean(data.share_anonymized_for_research),
      createdAt: String(data.created_at).slice(0, 10),
    },
  };
}

export async function upsertSoilProfileInSupabase(
  userId: string,
  profile: SoilProfile,
  reportFile?: File
): Promise<{ storagePath?: string; error?: string; schemaMissing?: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase not configured.' };

  let storagePath: string | null = profile.uploadedReportName
    ? `${userId}/${profile.farmId}/${profile.uploadedReportName}`
    : null;

  if (reportFile) {
    const cleanName = reportFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${userId}/${profile.farmId}/${Date.now()}_${cleanName}`;
    const { error: uploadErr } = await supabase.storage
      .from('soil-reports')
      .upload(path, reportFile, { upsert: true });
    if (!uploadErr) {
      storagePath = path;
    }
  }

  const { error } = await supabase.from('soil_profiles').upsert(
    {
      farm_id: profile.farmId,
      soil_type: profile.soilType,
      ph: profile.ph,
      nitrogen: profile.nitrogenKgHa,
      phosphorus: profile.phosphorusKgHa,
      potassium: profile.potassiumKgHa,
      organic_carbon: profile.organicCarbonPct,
      soil_texture: profile.soilTexture,
      soil_depth_cm: profile.soilDepthCm,
      water_availability: profile.waterAvailability,
      irrigation_type: profile.irrigationType,
      source: SOURCE_TO_DB[profile.source] ?? 'farmer_entered',
      report_storage_path: storagePath,
      notes: profile.notes,
      tested_at: profile.soilTestDate,
    },
    { onConflict: 'farm_id' }
  );

  if (error) {
    return { error: error.message, schemaMissing: isSchemaMissingError(error) };
  }
  return { storagePath: storagePath ?? undefined };
}

export async function upsertPrioritiesInSupabase(
  priorities: FarmerPriorities
): Promise<{ error?: string; schemaMissing?: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase not configured.' };

  const { error } = await supabase.from('farmer_priorities').upsert(
    {
      farm_id: priorities.farmId,
      water_conservation: priorities.waterConservation,
      soil_fertility: priorities.soilFertility,
      organic_matter: priorities.organicMatter,
      erosion_control: priorities.erosionControl,
      crop_diversity: priorities.cropDiversity,
      pest_risk_reduction: priorities.pestRiskReduction,
      income: priorities.farmIncome,
      forage_production: priorities.forageProduction,
      climate_resilience: priorities.climateResilience,
      market_suitability: priorities.marketSuitability,
      other_constraints: priorities.constraints,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'farm_id' }
  );

  if (error) {
    return { error: error.message, schemaMissing: isSchemaMissingError(error) };
  }
  return {};
}

export async function saveRotationDecisionInSupabase(
  farmId: string,
  strategy: RotationStrategyResult,
  decision: FarmDecisionState
): Promise<{ error?: string; schemaMissing?: boolean }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase not configured.' };

  const scenarioType =
    strategy.id === 'strategy_a'
      ? 'existing'
      : strategy.id === 'strategy_b'
      ? 'alternative_nutrient'
      : 'climate_resilient';

  const { error } = await supabase.from('rotation_scenarios').insert({
    farm_id: farmId,
    scenario_name: strategy.label,
    scenario_type: scenarioType,
    explanation: strategy.potentialBenefits.join(' '),
    evaluation_results: {
      sequence: strategy.sequence,
      scores: strategy.scores,
      overallWeightedScore: strategy.overallWeightedScore,
      confidenceLevel: strategy.confidenceLevel,
    },
    limitations: strategy.uncertaintyNote,
    farmer_decision: decision.decision,
    farmer_note: decision.farmerNote ?? null,
  });

  if (error) {
    return { error: error.message, schemaMissing: isSchemaMissingError(error) };
  }
  return {};
}

export async function fetchConsentedResearchFarms(): Promise<Farm[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('farms')
    .select('*')
    .eq('share_anonymized_for_research', true)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    farmName: row.farm_name,
    state: row.state,
    district: row.district,
    taluk: row.taluk,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    area: Number(row.area),
    areaUnit: row.area_unit === 'hectares' ? 'hectares' : 'acres',
    agroClimaticZone: row.agro_climatic_zone || 'Karnataka Zone',
    elevationM: row.elevation_m ?? 650,
    shareAnonymizedForResearch: true,
    createdAt: String(row.created_at).slice(0, 10),
  }));
}

export async function createCropInSupabase(
  crop: CropCharacteristic
): Promise<{ error?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) return { error: 'Supabase not configured.' };

  const { error } = await supabase.from('crop_catalog').upsert(
    {
      crop_name: crop.cropName,
      kannada_name: crop.kannadaName,
      scientific_name: crop.scientificName,
      growing_season: crop.growingSeasons,
      growing_duration_days: crop.growingDurationDays,
      water_requirement: crop.waterRequirement,
      rooting_depth: crop.rootingDepth,
      nitrogen_fixing: crop.nitrogenFixing,
      nutrient_requirements: crop.nutrientRequirements,
      soil_suitability: crop.soilSuitability,
      drought_tolerance: crop.droughtTolerance,
      heat_tolerance: crop.heatTolerance,
      erosion_protection: crop.erosionProtection,
      organic_matter_contribution: crop.organicMatterContribution,
      pest_considerations: crop.pestConsiderations,
      market_suitability: crop.marketSuitability,
      forage_potential: crop.foragePotential,
      reference_source: crop.referenceSource,
    },
    { onConflict: 'crop_name' }
  );

  return error ? { error: error.message } : {};
}
