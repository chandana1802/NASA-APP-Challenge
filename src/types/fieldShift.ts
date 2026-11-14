export type UserRole = 'farmer' | 'researcher' | 'admin';
export type LanguageCode = 'en' | 'kn';
export type SeasonName = 'Kharif' | 'Rabi' | 'Summer';

export type SoilType =
  | 'Red soil'
  | 'Black soil'
  | 'Alluvial soil'
  | 'Lateritic soil'
  | 'Sandy soil'
  | 'Clay soil'
  | 'Loamy soil';

export type SoilDataSource =
  | 'Laboratory soil test'
  | 'Farmer-entered information'
  | 'Government or research database'
  | 'Model-derived estimate';

export interface UserSession {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
  district: string;
  state: string;
  preferredLanguage: LanguageCode;
  isDemoSession: boolean;
}

export interface KarnatakaTaluk {
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number;
}

export interface KarnatakaDistrict {
  name: string;
  agroClimaticZone: string;
  dominantSoil: SoilType;
  annualRainfallMeanMm: number;
  taluks: KarnatakaTaluk[];
}

export interface Farm {
  id: string;
  farmName: string;
  state: string;
  district: string;
  taluk: string;
  latitude: number;
  longitude: number;
  area: number;
  areaUnit: 'acres' | 'hectares';
  agroClimaticZone: string;
  elevationM: number;
  boundaryCoords?: Array<[number, number]>;
  shareAnonymizedForResearch: boolean;
  createdAt: string;
}

export interface SoilProfile {
  farmId: string;
  soilType: SoilType;
  ph: number | null;
  nitrogenKgHa: number | null;
  phosphorusKgHa: number | null;
  potassiumKgHa: number | null;
  organicCarbonPct: number | null;
  soilTexture: string;
  soilDepthCm: number | null;
  waterAvailability: 'Rainfed only' | 'Limited borewell/tank' | 'Canal / reliable irrigation' | 'Drip / micro-irrigation';
  irrigationType: string;
  soilTestDate: string | null;
  source: SoilDataSource;
  uploadedReportName?: string;
  notes: string;
}

export interface CropCharacteristic {
  id: string;
  cropName: string;
  kannadaName: string;
  scientificName: string;
  growingSeasons: SeasonName[];
  growingDurationDays: number;
  waterRequirement: 'Low' | 'Moderate' | 'High' | 'Very High';
  waterNeedMmRange: string;
  rootingDepth: 'Shallow (15–30 cm)' | 'Medium (30–60 cm)' | 'Deep (60–120+ cm)';
  nitrogenFixing: boolean;
  nitrogenContributionKgHa: string;
  nutrientRequirements: string;
  soilSuitability: SoilType[];
  droughtTolerance: 'Low' | 'Moderate' | 'High';
  heatTolerance: 'Low' | 'Moderate' | 'High';
  erosionProtection: 'Low' | 'Moderate' | 'High';
  organicMatterContribution: 'Low' | 'Moderate' | 'High';
  pestConsiderations: string;
  marketSuitability: 'Local & Regional' | 'High Commercial Demand' | 'MSP & Staple Market' | 'Fodder & Local';
  foragePotential: 'Low' | 'Moderate' | 'High';
  botanicalFamily: 'Poaceae' | 'Fabaceae' | 'Asteraceae';
  referenceSource: string;
}

export interface FarmerPriorities {
  farmId: string;
  waterConservation: number;
  soilFertility: number;
  organicMatter: number;
  erosionControl: number;
  cropDiversity: number;
  pestRiskReduction: number;
  farmIncome: number;
  forageProduction: number;
  climateResilience: number;
  marketSuitability: number;
  constraints: {
    irrigationAvailable: 'None (Rainfed)' | 'Supplemental Tank/Borewell' | 'Full Canal/Drip';
    equipmentAccess: 'Manual / Bullocks' | 'Shared Tractor' | 'Full Mechanization';
    laborAvailability: 'Limited' | 'Moderate' | 'Adequate';
    budgetLevel: 'Low Input' | 'Moderate' | 'Flexible';
    marketAccess: 'Local Weekly Shandy' | 'APMC Mandi (<25 km)' | 'Contract / FPO Channel';
    preferredSeasons: SeasonName[];
    existingCommitments: string;
  };
}

export interface NasaDatasetSpec {
  id: 'SMAP' | 'GPM' | 'ECOSTRESS' | 'MODIS' | 'Landsat' | 'POWER' | 'GRACE' | 'SRTM';
  name: string;
  productName: string;
  measures: string;
  unit: string;
  spatialResolution: string;
  temporalResolution: string;
  authRequirement: string;
  officialSource: string;
  limitations: string;
  agriculturalUse: string;
}

export interface NasaObservationSeriesPoint {
  month: string;
  dateISO: string;
  rainfallMm: number | null;
  historicalRainfallAvgMm: number;
  smapSoilMoistureM3M3: number | null;
  modisNdvi: number | null;
  modisEvi: number | null;
  ecostressLstC: number | null;
  ecostressEtMmDay: number | null;
  powerAirTempC: number;
  powerHumidityPct: number;
  powerSolarMjM2: number;
  graceWaterAnomalyCm: number;
  qualityFlag: 'Valid (Demo Reference)' | 'Cloud-Masked Gap' | 'Coarse Grid Regional';
}

export interface EnvironmentalAlert {
  id: string;
  farmId: string;
  title: string;
  severity: 'Low' | 'Moderate' | 'High';
  observationDate: string;
  sourceDataset: string;
  affectedLocation: string;
  explanation: string;
  suggestedAction: string;
  uncertainty: string;
}

export interface RotationSequenceStep {
  year: 1 | 2;
  season: SeasonName;
  cropId: string;
  cropName: string;
  kannadaName: string;
  purposeNote: string;
}

export interface StrategyScoreBreakdown {
  waterEfficiency: number;
  nutrientCycling: number;
  nitrogenContribution: number;
  soilCoverPotential: number;
  erosionReduction: number;
  organicMatter: number;
  rootingDiversity: number;
  pestCycleDisruption: number;
  seasonCompatibility: number;
  droughtResilience: number;
  heatResilience: number;
  marketSuitability: number;
  priorityAlignment: number;
}

export interface RotationStrategyResult {
  id: 'strategy_a' | 'strategy_b' | 'strategy_c';
  label: string;
  subtitle: string;
  sequence: RotationSequenceStep[];
  scores: StrategyScoreBreakdown;
  overallWeightedScore: number;
  potentialBenefits: string[];
  possibleDisadvantages: string[];
  supportingNasaObservations: string[];
  soilInfoUsed: string[];
  assumptions: string[];
  missingInformation: string[];
  confidenceLevel: 'Low' | 'Moderate' | 'Moderate-High';
  uncertaintyNote: string;
  expertValidationRequired: string;
}

export interface FarmDecisionState {
  decision: 'pending' | 'accepted' | 'modified' | 'rejected';
  selectedStrategyId?: 'strategy_a' | 'strategy_b' | 'strategy_c';
  farmerNote?: string;
}
