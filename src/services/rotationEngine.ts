import { CROP_CATALOG, DEMO_NASA_SERIES_BY_FARM } from '../data/karnatakaData';
import type {
  CropCharacteristic,
  Farm,
  FarmerPriorities,
  RotationSequenceStep,
  RotationStrategyResult,
  SoilProfile,
  StrategyScoreBreakdown,
} from '../types/fieldShift';

const ratingToNumeric = (val: 'Low' | 'Moderate' | 'High' | 'Very High'): number => {
  switch (val) {
    case 'Low':
      return 30;
    case 'Moderate':
      return 62;
    case 'High':
      return 88;
    case 'Very High':
      return 98;
  }
};

const waterReqToEfficiencyScore = (val: 'Low' | 'Moderate' | 'High' | 'Very High'): number => {
  switch (val) {
    case 'Low':
      return 92;
    case 'Moderate':
      return 66;
    case 'High':
      return 38;
    case 'Very High':
      return 18;
  }
};

function getCropById(id: string): CropCharacteristic {
  return CROP_CATALOG.find((c) => c.id === id) ?? CROP_CATALOG[0];
}

export function getDefaultExistingSequence(farm: Farm, soil: SoilProfile): RotationSequenceStep[] {
  if (farm.district === 'Mandya' || soil.waterAvailability === 'Canal / reliable irrigation') {
    return [
      { year: 1, season: 'Kharif', cropId: 'paddy', cropName: 'Paddy (Rice)', kannadaName: 'ಭತ್ತ (Bhatta)', purposeNote: 'Baseline staple flooded paddy' },
      { year: 1, season: 'Rabi', cropId: 'paddy', cropName: 'Paddy (Rice)', kannadaName: 'ಭತ್ತ (Bhatta)', purposeNote: 'Repeated cereal monoculture' },
      { year: 1, season: 'Summer', cropId: 'maize', cropName: 'Maize', kannadaName: 'ಮೆಕ್ಕೆಜೋಳ (Mekkejola)', purposeNote: 'High-input summer cereal' },
    ];
  }
  if (soil.soilType === 'Black soil') {
    return [
      { year: 1, season: 'Kharif', cropId: 'maize', cropName: 'Maize', kannadaName: 'ಮೆಕ್ಕೆಜೋಳ (Mekkejola)', purposeNote: 'Baseline Kharif cereal' },
      { year: 1, season: 'Rabi', cropId: 'sorghum', cropName: 'Sorghum (Jowar)', kannadaName: 'ಜೋಳ (Jola)', purposeNote: 'Rabi residual moisture cereal' },
      { year: 1, season: 'Summer', cropId: 'sunflower', cropName: 'Sunflower', kannadaName: 'ಸೂರ್ಯಕಾಂತಿ (Suryakanthi)', purposeNote: 'Summer oilseed' },
    ];
  }
  return [
    { year: 1, season: 'Kharif', cropId: 'ragi', cropName: 'Ragi (Finger Millet)', kannadaName: 'ರಾಗಿ (Ragi)', purposeNote: 'Baseline rainfed staple' },
    { year: 1, season: 'Rabi', cropId: 'maize', cropName: 'Maize', kannadaName: 'ಮೆಕ್ಕೆಜೋಳ (Mekkejola)', purposeNote: 'Continuous cereal family' },
    { year: 1, season: 'Summer', cropId: 'groundnut', cropName: 'Groundnut', kannadaName: 'ಶೇಂಗಾ / ನೆಲಗಡಲೆ (Shenga)', purposeNote: 'Irrigated summer plot' },
  ];
}

export function buildAlternativeNutrientSequence(
  farm: Farm,
  soil: SoilProfile,
  existing: RotationSequenceStep[]
): RotationSequenceStep[] {
  const firstCrop = getCropById(existing[0]?.cropId || 'ragi');
  const isBlackSoil = soil.soilType === 'Black soil' || soil.soilType === 'Clay soil';

  const kharifCrop =
    firstCrop.id === 'paddy' && soil.waterAvailability === 'Canal / reliable irrigation'
      ? getCropById('paddy')
      : isBlackSoil
      ? getCropById('soybean')
      : getCropById('ragi');

  const rabiCrop = isBlackSoil ? getCropById('black_gram') : getCropById('cowpea');
  const summerCrop =
    farm.district === 'Mandya' || soil.waterAvailability !== 'Rainfed only'
      ? getCropById('green_gram')
      : getCropById('horse_gram');

  return [
    {
      year: 1,
      season: 'Kharif',
      cropId: kharifCrop.id,
      cropName: kharifCrop.cropName,
      kannadaName: kharifCrop.kannadaName,
      purposeNote: kharifCrop.nitrogenFixing
        ? 'Atmospheric N fixation + broadleaf canopy'
        : 'Primary staple cereal matched to soil',
    },
    {
      year: 1,
      season: 'Rabi',
      cropId: rabiCrop.id,
      cropName: rabiCrop.cropName,
      kannadaName: rabiCrop.kannadaName,
      purposeNote: 'Legume nitrogen fixation & cereal pest-cycle break',
    },
    {
      year: 1,
      season: 'Summer',
      cropId: summerCrop.id,
      cropName: summerCrop.cropName,
      kannadaName: summerCrop.kannadaName,
      purposeNote: 'Short-duration pulse for organic matter & soil cover',
    },
  ];
}

export function buildClimateResilientSequence(
  farm: Farm,
  soil: SoilProfile
): RotationSequenceStep[] {
  const isBlackSoil = soil.soilType === 'Black soil';
  const kharifCrop = isBlackSoil ? getCropById('red_gram') : getCropById('ragi');
  const rabiCrop = isBlackSoil ? getCropById('sorghum') : getCropById('horse_gram');
  const summerCrop = isBlackSoil ? getCropById('sunflower') : getCropById('green_gram');

  return [
    {
      year: 1,
      season: 'Kharif',
      cropId: kharifCrop.id,
      cropName: kharifCrop.cropName,
      kannadaName: kharifCrop.kannadaName,
      purposeNote:
        farm.district === 'Mandya'
          ? 'Replaces high-water Kharif paddy with drought-hardy millet/legume'
          : 'High drought tolerance & deep/fibrous root anchoring',
    },
    {
      year: 1,
      season: 'Rabi',
      cropId: rabiCrop.id,
      cropName: rabiCrop.cropName,
      kannadaName: rabiCrop.kannadaName,
      purposeNote: 'Thrives on residual soil moisture with strong erosion cover',
    },
    {
      year: 1,
      season: 'Summer',
      cropId: summerCrop.id,
      cropName: summerCrop.cropName,
      kannadaName: summerCrop.kannadaName,
      purposeNote: 'Low water footprint & deep scavenging / catch-crop resilience',
    },
  ];
}

function evaluateSequence(
  sequence: RotationSequenceStep[],
  soil: SoilProfile,
  priorities: FarmerPriorities
): StrategyScoreBreakdown {
  const crops = sequence.map((s) => getCropById(s.cropId));
  const avg = (fn: (c: CropCharacteristic) => number) =>
    Math.round(crops.reduce((acc, c) => acc + fn(c), 0) / crops.length);

  const uniqueFamilies = new Set(crops.map((c) => c.botanicalFamily)).size;
  const uniqueCrops = new Set(crops.map((c) => c.id)).size;
  const uniqueRoots = new Set(crops.map((c) => c.rootingDepth)).size;
  const legumeCount = crops.filter((c) => c.nitrogenFixing).length;

  const waterEfficiency = avg((c) => waterReqToEfficiencyScore(c.waterRequirement));
  const nitrogenContribution = Math.min(96, 20 + legumeCount * 36);
  const nutrientCycling = Math.min(95, Math.round(uniqueFamilies * 24 + legumeCount * 15 + uniqueRoots * 10));
  const soilCoverPotential = avg((c) => ratingToNumeric(c.erosionProtection));
  const erosionReduction = avg((c) => ratingToNumeric(c.erosionProtection));
  const organicMatter = avg((c) => ratingToNumeric(c.organicMatterContribution));
  const rootingDiversity = Math.min(95, 30 + uniqueRoots * 22);
  const pestCycleDisruption = Math.min(96, 25 + (uniqueCrops - 1) * 20 + (uniqueFamilies - 1) * 18);

  const seasonMatches = sequence.filter((step) => {
    const crop = getCropById(step.cropId);
    return crop.growingSeasons.includes(step.season);
  }).length;
  const soilMatches = crops.filter((c) => c.soilSuitability.includes(soil.soilType)).length;
  const seasonCompatibility = Math.round(((seasonMatches + soilMatches) / (sequence.length * 2)) * 100);

  const droughtResilience = avg((c) => ratingToNumeric(c.droughtTolerance));
  const heatResilience = avg((c) => ratingToNumeric(c.heatTolerance));
  const marketSuitability = Math.round(
    crops.reduce((acc, c) => {
      if (c.marketSuitability === 'High Commercial Demand') return acc + 88;
      if (c.marketSuitability === 'MSP & Staple Market') return acc + 82;
      return acc + 65;
    }, 0) / crops.length
  );

  // Weighted alignment with Farmer Priorities
  const weightSum =
    priorities.waterConservation +
    priorities.soilFertility +
    priorities.organicMatter +
    priorities.erosionControl +
    priorities.cropDiversity +
    priorities.pestRiskReduction +
    priorities.farmIncome +
    priorities.climateResilience +
    priorities.marketSuitability;

  const weightedRaw =
    waterEfficiency * priorities.waterConservation +
    nutrientCycling * priorities.soilFertility +
    organicMatter * priorities.organicMatter +
    erosionReduction * priorities.erosionControl +
    pestCycleDisruption * priorities.cropDiversity +
    pestCycleDisruption * priorities.pestRiskReduction +
    marketSuitability * priorities.farmIncome +
    ((droughtResilience + heatResilience) / 2) * priorities.climateResilience +
    marketSuitability * priorities.marketSuitability;

  const priorityAlignment = Math.round(weightedRaw / Math.max(1, weightSum));

  return {
    waterEfficiency,
    nutrientCycling,
    nitrogenContribution,
    soilCoverPotential,
    erosionReduction,
    organicMatter,
    rootingDiversity,
    pestCycleDisruption,
    seasonCompatibility,
    droughtResilience,
    heatResilience,
    marketSuitability,
    priorityAlignment,
  };
}

export function compareRotationStrategies(
  farm: Farm,
  soil: SoilProfile,
  priorities: FarmerPriorities,
  existingSequence: RotationSequenceStep[]
): RotationStrategyResult[] {
  const series = DEMO_NASA_SERIES_BY_FARM[farm.id] ?? DEMO_NASA_SERIES_BY_FARM['farm-mandya-1'];
  const latest = series[series.length - 1];
  const avgRainfall = series.reduce((a, b) => a + (b.rainfallMm ?? 0), 0);
  const histRainfall = series.reduce((a, b) => a + b.historicalRainfallAvgMm, 0);
  const rainfallVariancePct = Math.round(((avgRainfall - histRainfall) / histRainfall) * 100);

  const missingInfo: string[] = [];
  if (soil.nitrogenKgHa === null) missingInfo.push('Measured laboratory soil Nitrogen (N) is missing');
  if (soil.phosphorusKgHa === null) missingInfo.push('Measured laboratory soil Phosphorus (P) is missing');
  if (soil.organicCarbonPct === null) missingInfo.push('Soil Organic Carbon (%) is missing');
  if (!soil.soilTestDate) missingInfo.push('Recent laboratory soil test date not recorded');
  if (series.some((p) => p.qualityFlag === 'Cloud-Masked Gap')) {
    missingInfo.push('ECOSTRESS thermal observations contain monsoon cloud-masked gaps (June–July)');
  }

  const confidenceLevel: 'Low' | 'Moderate' | 'Moderate-High' =
    missingInfo.length >= 3 ? 'Low' : missingInfo.length >= 1 ? 'Moderate' : 'Moderate-High';

  const altSequence = buildAlternativeNutrientSequence(farm, soil, existingSequence);
  const resSequence = buildClimateResilientSequence(farm, soil);

  const buildResult = (
    id: 'strategy_a' | 'strategy_b' | 'strategy_c',
    label: string,
    subtitle: string,
    sequence: RotationSequenceStep[],
    benefits: string[],
    disadvantages: string[],
    assumptions: string[]
  ): RotationStrategyResult => {
    const scores = evaluateSequence(sequence, soil, priorities);
    const overallWeightedScore = scores.priorityAlignment;

    return {
      id,
      label,
      subtitle,
      sequence,
      scores,
      overallWeightedScore,
      potentialBenefits: benefits,
      possibleDisadvantages: disadvantages,
      supportingNasaObservations: [
        `NASA GPM IMERG: Seasonal cumulative rainfall ${avgRainfall} mm (${rainfallVariancePct}% vs ${histRainfall} mm reference).`,
        `NASA SMAP (9 km): Latest surface soil moisture ${latest.smapSoilMoistureM3M3 ?? 'Unavailable'} m³/m³ on ${latest.dateISO}.`,
        `NASA POWER: Latest mean air temperature ${latest.powerAirTempC}°C; ECOSTRESS LST ${latest.ecostressLstC ?? 'Cloud-masked'}°C.`,
        `NASA GRACE-FO (Regional): ${latest.graceWaterAnomalyCm} cm regional water-storage anomaly.`,
      ],
      soilInfoUsed: [
        `Soil Type: ${soil.soilType} (${soil.soilTexture}), Source: ${soil.source}`,
        `pH: ${soil.ph ?? 'Not measured'}, Organic Carbon: ${soil.organicCarbonPct !== null ? soil.organicCarbonPct + '%' : 'Missing'}`,
        `Water Availability: ${soil.waterAvailability} (${soil.irrigationType})`,
      ],
      assumptions,
      missingInformation:
        missingInfo.length > 0 ? missingInfo : ['No critical soil profile gaps; site micro-topography still requires field check.'],
      confidenceLevel,
      uncertaintyNote:
        'Evaluation uses transparent multi-criteria agronomic rules (MCDA v1.0) combined with demonstration NASA reference data. Actual field outcomes depend on sowing dates, cultivar choice, pest pressure, and monsoon distribution.',
      expertValidationRequired: `Confirm sowing window, seed variety, and local market linkages with ${farm.district} KVK / Raitha Samparka Kendra before implementing changes.`,
    };
  };

  const existingCrops = existingSequence.map((s) => getCropById(s.cropId));
  const existingHasContinuousCereal = existingCrops.every((c) => c.botanicalFamily === 'Poaceae');
  const existingHasVeryHighWater = existingCrops.some((c) => c.waterRequirement === 'Very High');

  const strategyA = buildResult(
    'strategy_a',
    'Strategy A — Existing Rotation (Baseline)',
    'Your current seasonal crop sequence used as the baseline reference',
    existingSequence,
    [
      'Matches existing farm equipment, labor familiarity, and established buyer relationships.',
      existingCrops.some((c) => c.marketSuitability === 'MSP & Staple Market')
        ? 'Provides predictable staple grain / MSP procurement channel.'
        : 'Maintains familiar cash-crop marketing structure.',
    ],
    [
      existingHasVeryHighWater
        ? 'High water demand increases vulnerability if canal releases delay or rainfall remains below average.'
        : 'May miss nitrogen-fixation opportunities if legumes are absent.',
      existingHasContinuousCereal
        ? 'Continuous Poaceae (cereal) sequence increases soil-borne pest carryover and depletes topsoil nitrogen.'
        : 'Limited rooting-depth diversity across seasons.',
    ],
    [
      'Assumes current irrigation reliability and input prices remain unchanged.',
      'Does not account for multi-year pest buildup unless explicitly monitored in the field.',
    ]
  );

  const strategyB = buildResult(
    'strategy_b',
    'Strategy B — Alternative Nutrient-Cycling Rotation',
    'Introduces nitrogen-fixing legumes & multi-family diversification',
    altSequence,
    [
      'Integrates Fabaceae legumes (e.g., Green Gram / Black Gram / Cowpea) contributing ~25–45 kg residual N/ha.',
      'Breaks continuous cereal pest and disease cycles through botanical family rotation.',
      'Improves organic residue return and surface cover between main cropping windows.',
    ],
    [
      'Requires timely legume seed inoculation (Rhizobium) and pod-borer scouting.',
      'Short-duration summer pulses may face lower gross revenue per acre than commercial cash crops if local mandi prices dip.',
    ],
    [
      `Assumes ${soil.soilType} drainage is adequate during Kharif/Rabi legume establishment.`,
      'Residual nitrogen benefit varies significantly with moisture and Rhizobium nodulation success.',
    ]
  );

  const strategyC = buildResult(
    'strategy_c',
    'Strategy C — Climate-Resilient Rotation',
    'Prioritizes drought-hardy, low-water, deep-rooting, and erosion-protective crops',
    resSequence,
    [
      'Significantly lowers seasonal irrigation requirement by pairing millets/sorghum with drought-tolerant pulses.',
      'Deep-rooting and dense-canopy crops improve soil anchoring on sloped or crust-prone Karnataka soils.',
      'Better buffered against SMAP moisture deficits and GRACE-FO regional water-storage stress.',
    ],
    [
      'Transitioning away from high-water commercial staples (e.g., Paddy/Sugarcane) requires market-channel adjustment and fodder/grain storage planning.',
      'May yield lower short-term cash income during abundant monsoon years compared to intensive irrigated crops.',
    ],
    [
      'Assumes farmer is willing to adjust at least one season toward drought-resilient millets or oilseeds.',
      'Assumes local APMC / FPO demand exists for millets and pulses in ' + farm.district + ' district.',
    ]
  );

  return [strategyA, strategyB, strategyC];
}
