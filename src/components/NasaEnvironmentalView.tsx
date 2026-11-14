import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, ChevronUp, Database, HelpCircle, Satellite } from 'lucide-react';
import { DEMO_NASA_SERIES_BY_FARM, NASA_DATASETS } from '../data/karnatakaData';
import type { Farm } from '../types/fieldShift';

interface NasaEnvironmentalViewProps {
  farm: Farm;
}

const EXPLAINABLE_CONCEPTS: Array<{
  term: string;
  plainSummary: string;
  dataset: string;
  whyItMatters: string;
  limitation: string;
}> = [
  {
    term: 'Soil Moisture Anomaly',
    plainSummary: 'Shows whether topsoil water is drier or wetter than normal for this time of year.',
    dataset: 'NASA SMAP (9 km)',
    whyItMatters: 'Low moisture at sowing reduces germination; signals need for drought-hardy crops or mulching.',
    limitation: 'SMAP averages a 9 km grid square, not your exact plot boundary.',
  },
  {
    term: 'Evapotranspiration (ET)',
    plainSummary: 'Combined water lost from soil evaporation and crop leaf transpiration.',
    dataset: 'NASA ECOSTRESS (70 m)',
    whyItMatters: 'High ET paired with low soil moisture indicates rising crop water stress.',
    limitation: 'Cloud cover blocks thermal satellites during peak monsoon weeks.',
  },
  {
    term: 'NDVI & EVI (Vegetation Indices)',
    plainSummary: 'Satellite measures of crop canopy greenness and leaf density.',
    dataset: 'NASA MODIS (250 m) / Landsat (30 m)',
    whyItMatters: 'Tracks crop establishment, mid-season vigor, or early dry-spell stress.',
    limitation: 'Greenness is NOT a direct measurement of grain yield or nutrient quality.',
  },
  {
    term: 'Rainfall Anomaly',
    plainSummary: 'Difference between observed seasonal rain and the long-term district average.',
    dataset: 'NASA GPM IMERG (0.1°)',
    whyItMatters: 'Persistent negative rainfall anomalies guide shifting from high-water paddy to millets or pulses.',
    limitation: 'Satellite precipitation can miss localized village rain bursts.',
  },
  {
    term: 'Land Surface Temp vs. Air Temp',
    plainSummary: 'ECOSTRESS measures hot ground/leaf skin temperature; POWER models 2 m air temperature.',
    dataset: 'ECOSTRESS (70 m) & NASA POWER (~50 km)',
    whyItMatters: 'Bare dry soil reaches 42–45 °C even when air temperature is 32 °C, stressing seedlings.',
    limitation: 'Never substitute land surface temperature directly for weather-station air temperature.',
  },
  {
    term: 'Regional Water Balance (GRACE)',
    plainSummary: 'Long-term changes in total basin water stored in soil, lakes, and deep aquifers.',
    dataset: 'NASA GRACE / GRACE-FO (~300 km)',
    whyItMatters: 'Shows multi-year regional aquifer depletion pressure when planning water-heavy crops.',
    limitation: 'Strictly regional context—NOT an individual farm borewell measurement.',
  },
  {
    term: 'Nitrogen Fixation & Organic Matter',
    plainSummary: 'Legumes (pulses) capture air nitrogen via root nodules and leave organic residue for the next crop.',
    dataset: 'ICAR / UAS Crop Catalog + Soil Profile',
    whyItMatters: 'Rotating cereals with pulses reduces urea dependency and improves water-holding humus.',
    limitation: 'Requires adequate soil phosphorus, pH balance, and Rhizobium nodulation.',
  },
  {
    term: 'Vegetation, Heat & Drought Risk',
    plainSummary: 'Combined indicators checking dry-spell length, canopy cooling, and temperature spikes above 35 °C.',
    dataset: 'POWER + SMAP + GPM Fusion',
    whyItMatters: 'Helps select heat-tolerant crops or cover crops before peak stress windows.',
    limitation: 'Indicators highlight potential exposure; confirm field symptoms locally.',
  },
];

export const NasaEnvironmentalView: React.FC<NasaEnvironmentalViewProps> = ({ farm }) => {
  const series = DEMO_NASA_SERIES_BY_FARM[farm.id] ?? DEMO_NASA_SERIES_BY_FARM['farm-mandya-1'];
  const [showScientificNotes, setShowScientificNotes] = useState(false);

  const totalRain = series.reduce((acc, p) => acc + (p.rainfallMm ?? 0), 0);
  const totalRef = series.reduce((acc, p) => acc + p.historicalRainfallAvgMm, 0);
  const pctDiff = Math.round(((totalRain - totalRef) / totalRef) * 100);
  const latest = series[series.length - 1];

  return (
    <div className="space-y-6">
      {/* Honest Data Banner */}
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1B4332]">
            <Satellite className="w-4 h-4" />
            <span>NASA Earth Observation Monitoring — {farm.farmName}</span>
          </div>
          <p className="text-xs text-[#526058] mt-1">
            Demonstration Reference Dataset ({farm.district}, {farm.taluk} · {farm.latitude.toFixed(3)}°N, {farm.longitude.toFixed(3)}°E). Live NASA POWER, GPM, SMAP & AppEEARS connectors activate in Stage 3.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowScientificNotes((p) => !p)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border border-[#D4CEC3] bg-[#FAF9F6] text-[#1B4332] hover:bg-[#F3EFE6] whitespace-nowrap shrink-0"
        >
          {showScientificNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showScientificNotes ? 'Hide Resolution & Fusion Rules' : 'Show Spatial Resolution & Fusion Rules'}</span>
        </button>
      </div>

      {/* Data Fusion & Spatial Discrepancy Disclosure */}
      {showScientificNotes && (
        <div className="bg-[#FAF9F6] border border-[#D4CEC3] rounded-xl p-5 space-y-3 text-xs">
          <div className="font-semibold text-[#1B4332] flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>Data Fusion & Multi-Resolution Guardrails</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {NASA_DATASETS.map((ds) => (
              <div key={ds.id} className="bg-white border border-[#E2DDD3] rounded-lg p-3 space-y-1">
                <div className="font-semibold text-[#1A241E]">{ds.name}</div>
                <div className="font-mono text-[11px] text-[#2D6A4F]">
                  {ds.spatialResolution} · {ds.temporalResolution}
                </div>
                <div className="text-[#4B5563]">{ds.measures}</div>
                <div className="text-[#9A3412] pt-1 border-t border-[#EFECE6]">
                  Limit: {ds.limitations}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plain-Language Farm-Specific Insight */}
      <div className="bg-[#EDF5F0] border border-[#C5DEC9] rounded-xl p-5 space-y-2">
        <div className="text-xs font-semibold text-[#1B4332]">
          Field Insight Summary (Plain-Language Explanation)
        </div>
        <p className="text-sm text-[#1A241E] leading-relaxed">
          Your selected field experienced <strong>{Math.abs(pctDiff)}% {pctDiff < 0 ? 'lower' : 'higher'} cumulative rainfall</strong> ({totalRain} mm vs. {totalRef} mm seasonal reference) between Jan and Nov 2026 in the demonstration NASA GPM IMERG series.
          {latest.smapSoilMoistureM3M3 !== null && latest.smapSoilMoistureM3M3 < 0.22
            ? ' Regional SMAP surface moisture is currently low (' + latest.smapSoilMoistureM3M3 + ' m³/m³). Consider exploring rotation strategies with lower water demand and drought-tolerant legumes.'
            : ' Regional SMAP surface moisture (' + (latest.smapSoilMoistureM3M3 ?? 'N/A') + ' m³/m³) supports moderate residual-moisture Rabi crops.'}{' '}
          Actual suitability depends on your local soil profile, irrigation availability, and KVK crop calendar.
        </p>
        <div className="text-[11px] text-[#526058]">
          Observation Period: Jan–Nov 2026 · Datasets: GPM IMERG (0.1°), SMAP (9 km), POWER (~50 km), MODIS (250 m) · Cloud gaps preserved as null.
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rainfall vs Historical */}
        <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#1B4332]">Rainfall vs. Historical Baseline (GPM IMERG)</h3>
              <p className="text-xs text-[#6B7280]">Unit: mm / month · Spatial Res: 0.1° (~10 km)</p>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="rainfallMm" name="Observed Demo (mm)" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="historicalRainfallAvgMm" name="Seasonal Avg (mm)" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* SMAP Soil Moisture & MODIS NDVI */}
        <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#1B4332]">Soil Moisture (SMAP) & Canopy Greenness (MODIS)</h3>
              <p className="text-xs text-[#6B7280]">SMAP m³/m³ (9 km) · MODIS NDVI & EVI (250 m)</p>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 0.9]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="modisNdvi" name="MODIS NDVI" stroke="#15803D" fill="#15803D" fillOpacity={0.14} />
                <Area type="monotone" dataKey="modisEvi" name="MODIS EVI" stroke="#65A30D" fill="#65A30D" fillOpacity={0.1} />
                <Area type="monotone" dataKey="smapSoilMoistureM3M3" name="SMAP Moisture (m³/m³)" stroke="#0284C7" fill="#0284C7" fillOpacity={0.16} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ECOSTRESS LST vs POWER Air Temp */}
        <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#1B4332]">Land Surface Temp (ECOSTRESS) vs. Air Temp (POWER)</h3>
              <p className="text-xs text-[#6B7280]">Gaps in June–July reflect monsoon cloud masking (null values preserved)</p>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[15, 50]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="ecostressLstC" name="ECOSTRESS Skin LST (°C)" stroke="#DC2626" strokeWidth={2} connectNulls={false} />
                <Line type="monotone" dataKey="powerAirTempC" name="POWER 2m Air Temp (°C)" stroke="#D97706" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRACE Regional Water Storage Anomaly */}
        <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#1B4332]">Regional Terrestrial Water Storage (GRACE-FO)</h3>
              <p className="text-xs text-[#6B7280]">Unit: cm equivalent water thickness · ~300 km regional scale (Not farm borewell)</p>
            </div>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Area type="monotone" dataKey="graceWaterAnomalyCm" name="GRACE Regional Anomaly (cm)" stroke="#6B4F35" fill="#6B4F35" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Explainable Scientific Concepts */}
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#2D6A4F]" />
          <h3 className="text-base font-semibold text-[#1B4332]">
            Explainable Farming Insights — Understanding Satellite & Soil Indicators
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {EXPLAINABLE_CONCEPTS.map((item) => (
            <div key={item.term} className="bg-[#FAF9F6] border border-[#E2DDD3] rounded-lg p-4 space-y-2 text-xs">
              <div className="font-semibold text-[#1B4332]">{item.term}</div>
              <div className="text-[11px] font-mono text-[#2D6A4F]">{item.dataset}</div>
              <p className="text-[#1A241E]">{item.plainSummary}</p>
              <p className="text-[#4B5563]">
                <strong>Why it matters:</strong> {item.whyItMatters}
              </p>
              <p className="text-[#9A3412] pt-1 border-t border-[#EFECE6]">
                <strong>Limitation:</strong> {item.limitation}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
