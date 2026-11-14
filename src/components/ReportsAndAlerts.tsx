import React from 'react';
import { AlertTriangle, Download, FileSpreadsheet, FileText, Printer } from 'lucide-react';
import { DEMO_ALERTS, DEMO_NASA_SERIES_BY_FARM, NASA_DATASETS } from '../data/karnatakaData';
import { compareRotationStrategies } from '../services/rotationEngine';
import type {
  Farm,
  FarmerPriorities,
  RotationSequenceStep,
  SoilProfile,
} from '../types/fieldShift';

interface ReportsAndAlertsProps {
  mode: 'alerts' | 'reports';
  farm: Farm;
  soilProfile: SoilProfile;
  priorities: FarmerPriorities;
  existingSequence: RotationSequenceStep[];
}

export const ReportsAndAlerts: React.FC<ReportsAndAlertsProps> = ({
  mode,
  farm,
  soilProfile,
  priorities,
  existingSequence,
}) => {
  const farmAlerts = DEMO_ALERTS.filter(
    (a) => a.farmId === farm.id || a.affectedLocation.includes(farm.district)
  );
  const displayAlerts = farmAlerts.length > 0 ? farmAlerts : DEMO_ALERTS;

  const series = DEMO_NASA_SERIES_BY_FARM[farm.id] ?? DEMO_NASA_SERIES_BY_FARM['farm-mandya-1'];
  const strategies = compareRotationStrategies(farm, soilProfile, priorities, existingSequence);

  const handleDownloadCsv = () => {
    const headers = [
      'Farm Name',
      'District',
      'Taluk',
      'Month',
      'Date',
      'Rainfall_mm_GPM',
      'Ref_Rainfall_mm',
      'SMAP_SoilMoisture_m3m3',
      'MODIS_NDVI',
      'ECOSTRESS_LST_C',
      'POWER_AirTemp_C',
      'GRACE_WaterAnomaly_cm',
      'Quality_Flag',
    ];
    const rows = series.map((pt) => [
      `"${farm.farmName}"`,
      farm.district,
      farm.taluk,
      pt.month,
      pt.dateISO,
      pt.rainfallMm ?? 'UNAVAILABLE',
      pt.historicalRainfallAvgMm,
      pt.smapSoilMoistureM3M3 ?? 'UNAVAILABLE',
      pt.modisNdvi ?? 'UNAVAILABLE',
      pt.ecostressLstC ?? 'CLOUD_MASKED',
      pt.powerAirTempC,
      pt.graceWaterAnomalyCm,
      `"${pt.qualityFlag}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `field-shift-${farm.district.toLowerCase()}-nasa-rotation-dataset.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSummaryReport = () => {
    const reportLines = [
      'FIELD SHIFT – Adapting Farms with NASA Data',
      '========================================================================',
      `1. Farm Information: ${farm.farmName} (${farm.area} ${farm.areaUnit})`,
      `2. Location: ${farm.taluk} Taluk, ${farm.district} District, Karnataka (${farm.latitude}, ${farm.longitude})`,
      `3. Soil Profile: ${soilProfile.soilType} (${soilProfile.soilTexture}) | pH: ${soilProfile.ph ?? 'Missing'} | N: ${soilProfile.nitrogenKgHa ?? 'Missing'} | P: ${soilProfile.phosphorusKgHa ?? 'Missing'} | K: ${soilProfile.potassiumKgHa ?? 'Missing'} | OC: ${soilProfile.organicCarbonPct ?? 'Missing'}% | Provenance: ${soilProfile.source}`,
      `4. NASA Datasets Referenced (Demo Reference): ${NASA_DATASETS.map((d) => d.name).join(', ')}`,
      `5. Environmental Summary: Latest Air Temp ${series[series.length - 1].powerAirTempC} C | SMAP Soil Moisture ${series[series.length - 1].smapSoilMoistureM3M3} m3/m3 | MODIS NDVI ${series[series.length - 1].modisNdvi}`,
      '',
      '6-8. Crop Rotation Strategies Comparison:',
      ...strategies.map(
        (s) =>
          `   - ${s.label} [Priority Index: ${s.overallWeightedScore}/100]\n     Sequence: ${s.sequence.map((st) => `${st.season}: ${st.cropName}`).join(' -> ')}\n     Benefits: ${s.potentialBenefits.join(' ')}\n     Disadvantages: ${s.possibleDisadvantages.join(' ')}`
      ),
      '',
      `9-11. Soil Health, Water & Climate Risks: Confidence=${strategies[0].confidenceLevel}.`,
      `12. Farmer Priorities: Water=${priorities.waterConservation}/5, Soil Fertility=${priorities.soilFertility}/5, Climate Resilience=${priorities.climateResilience}/5, Income=${priorities.farmIncome}/5`,
      `13. Information Gaps: ${strategies[0].missingInformation.join('; ')}`,
      `14. Uncertainty: ${strategies[0].uncertaintyNote}`,
      `15. Local Expert Review Requirement: ${strategies[0].expertValidationRequired}`,
    ].join('\n');

    const blob = new Blob([reportLines], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `field-shift-advisory-report-${farm.district.toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (mode === 'alerts') {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-[#E2DDD3] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#1B4332]">
              Environmental Risk Alerts & Irrigation Advisories
            </h2>
            <p className="text-xs text-[#526058] mt-1">
              Alerts explain observed satellite anomalies and uncertainty. Field Shift never declares confirmed drought or disease without field verification.
            </p>
          </div>
          <span className="text-xs font-mono text-[#6B4F35]">
            {displayAlerts.length} active advisories
          </span>
        </div>

        <div className="space-y-4">
          {displayAlerts.map((alert) => {
            const severityStyle =
              alert.severity === 'High'
                ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                : alert.severity === 'Moderate'
                ? 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]'
                : 'bg-[#EDF5F0] text-[#166534] border-[#C5DEC9]';

            return (
              <div key={alert.id} className="bg-white border border-[#E2DDD3] rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0" />
                      <h3 className="text-base font-semibold text-[#1A241E]">{alert.title}</h3>
                    </div>
                    <div className="text-xs text-[#526058]">
                      {alert.affectedLocation} · Observed {alert.observationDate} · Source: {alert.sourceDataset}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${severityStyle}`}>
                    Severity: {alert.severity}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-[#EFECE6]">
                  <div>
                    <div className="font-semibold text-[#1B4332] mb-1">Observation & Context</div>
                    <p className="text-[#374151]">{alert.explanation}</p>
                  </div>
                  <div>
                    <div className="font-semibold text-[#1B4332] mb-1">Suggested Exploration</div>
                    <p className="text-[#374151]">{alert.suggestedAction}</p>
                  </div>
                  <div>
                    <div className="font-semibold text-[#9A3412] mb-1">Uncertainty & Scale Limit</div>
                    <p className="text-[#4B5563]">{alert.uncertainty}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Reports Mode
  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 no-print">
        <div>
          <h2 className="text-lg font-semibold text-[#1B4332]">
            Decision-Support Reports & Dataset Export
          </h2>
          <p className="text-xs text-[#526058] mt-1">
            Generate a complete 15-section agronomic summary for local KVK review, print to PDF, or export environmental data as CSV.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#D4CEC3] bg-[#FAF9F6] text-[#1B4332] hover:bg-[#EAE5DA] whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV Dataset</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadSummaryReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#D4CEC3] bg-[#FAF9F6] text-[#1B4332] hover:bg-[#EAE5DA] whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Summary (.txt)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* Printable 15-Point Report Preview */}
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-[#E2DDD3] pb-4">
          <div>
            <div className="text-xs font-mono text-[#2D6A4F]">FIELD SHIFT ADVISORY DOSSIER</div>
            <h3 className="text-xl font-bold text-[#1B4332] mt-1">
              Crop Rotation & Environmental Assessment Report
            </h3>
            <p className="text-xs text-[#526058] mt-1">
              Prepared for {farm.farmName} · {farm.taluk}, {farm.district}, Karnataka
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#4B5563]">
            <FileText className="w-4 h-4 text-[#2D6A4F]" />
            <span>Demonstration Reference · {new Date().toISOString().slice(0, 10)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2">
            <h4 className="font-semibold text-[#1B4332] text-sm">1–2. Farm & Spatial Profile</h4>
            <p>Farm Name: {farm.farmName}</p>
            <p>District / Taluk: {farm.district} / {farm.taluk} ({farm.agroClimaticZone})</p>
            <p className="font-mono tabular-nums">
              Coordinates: {farm.latitude.toFixed(4)}° N, {farm.longitude.toFixed(4)}° E · SRTM Elevation: {farm.elevationM} m
            </p>
            <p>Cultivated Area: {farm.area} {farm.areaUnit}</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-[#1B4332] text-sm">3. Local Soil Profile</h4>
            <p>Soil Type & Texture: {soilProfile.soilType} ({soilProfile.soilTexture})</p>
            <p>
              pH: {soilProfile.ph ?? 'Unmeasured'} · OC: {soilProfile.organicCarbonPct !== null ? `${soilProfile.organicCarbonPct}%` : 'Unmeasured'} · N/P/K:{' '}
              {soilProfile.nitrogenKgHa ?? '—'} / {soilProfile.phosphorusKgHa ?? '—'} / {soilProfile.potassiumKgHa ?? '—'} kg/ha
            </p>
            <p>Water Availability: {soilProfile.waterAvailability} ({soilProfile.irrigationType})</p>
            <p>Provenance: {soilProfile.source}</p>
          </div>
        </div>

        <div className="space-y-2 text-xs border-t border-[#EFECE6] pt-4">
          <h4 className="font-semibold text-[#1B4332] text-sm">4–5. NASA Datasets Referenced & Environmental Conditions</h4>
          <p className="text-[#374151]">
            Datasets: NASA SMAP (9 km), GPM IMERG (0.1°), ECOSTRESS (70 m), MODIS MOD13Q1 (250 m), Landsat 8/9 (30 m), NASA POWER (~50 km), GRACE-FO (~300 km regional), SRTM (30 m).
          </p>
          <p className="text-[#374151]">
            Latest Demo Snapshot ({series[series.length - 1].dateISO}): Air Temp {series[series.length - 1].powerAirTempC} °C, Surface Soil Moisture {series[series.length - 1].smapSoilMoistureM3M3} m³/m³, NDVI {series[series.length - 1].modisNdvi}, Regional GRACE Anomaly {series[series.length - 1].graceWaterAnomalyCm} cm.
          </p>
        </div>

        <div className="space-y-3 text-xs border-t border-[#EFECE6] pt-4">
          <h4 className="font-semibold text-[#1B4332] text-sm">6–11. Comparative Crop Rotation Strategies</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2DDD3] text-[#526058]">
                  <th className="py-2 pr-3">Strategy</th>
                  <th className="py-2 pr-3">Kharif → Rabi → Summer</th>
                  <th className="py-2 pr-3 text-right">Water Eff.</th>
                  <th className="py-2 pr-3 text-right">Nutrient Cyc.</th>
                  <th className="py-2 pr-3 text-right">Drought Res.</th>
                  <th className="py-2 text-right">Priority Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE6]">
                {strategies.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 pr-3 font-semibold text-[#1A241E]">{s.label}</td>
                    <td className="py-2.5 pr-3 text-[#374151]">
                      {s.sequence.map((st) => `${st.season}: ${st.cropName}`).join(' · ')}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{s.scores.waterEfficiency}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{s.scores.nutrientCycling}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{s.scores.droughtResilience}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-bold text-[#1B4332]">
                      {s.overallWeightedScore}/100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs border-t border-[#EFECE6] pt-4">
          <div className="space-y-1.5">
            <h4 className="font-semibold text-[#1B4332] text-sm">12–14. Priorities, Information Gaps & Uncertainty</h4>
            <p>
              Top Priorities: Water Conservation ({priorities.waterConservation}/5), Soil Fertility ({priorities.soilFertility}/5), Climate Resilience ({priorities.climateResilience}/5).
            </p>
            <p className="text-[#9A3412]">
              Gaps: {strategies[0].missingInformation.join(' · ')}
            </p>
            <p className="text-[#526058]">{strategies[0].uncertaintyNote}</p>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-semibold text-[#1B4332] text-sm">15. Mandatory Local Expert Review</h4>
            <p className="bg-[#EDF5F0] border border-[#C5DEC9] rounded-lg p-3 text-[#1B4332]">
              {strategies[0].expertValidationRequired} Field Shift provides transparent decision support and does not replace farmer experience or local agronomic extension guidance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
