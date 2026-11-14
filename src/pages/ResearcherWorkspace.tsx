import React, { useMemo, useState } from 'react';
import {
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
import {
  Activity,
  BarChart3,
  Compass,
  Database,
  Download,
  FileText,
  FlaskConical,
  LogOut,
  Menu,
  Satellite,
  Sprout,
  X,
} from 'lucide-react';
import { CropCatalogView } from '../components/CropCatalogView';
import { KarnatakaMap } from '../components/KarnatakaMap';
import { ReportsAndAlerts } from '../components/ReportsAndAlerts';
import { RotationExplorer } from '../components/RotationExplorer';
import { DEMO_NASA_SERIES_BY_FARM } from '../data/karnatakaData';
import type {
  CropCharacteristic,
  Farm,
  FarmDecisionState,
  FarmerPriorities,
  RotationSequenceStep,
  SoilProfile,
  UserSession,
} from '../types/fieldShift';

type ResearcherTab =
  | 'overview'
  | 'climate-satellite'
  | 'soil-comparison'
  | 'rotation-analysis'
  | 'crop-db'
  | 'model-eval'
  | 'dataset-explorer'
  | 'reports';

interface ResearcherWorkspaceProps {
  session: UserSession;
  farms: Farm[];
  soilProfiles: Record<string, SoilProfile>;
  prioritiesMap: Record<string, FarmerPriorities>;
  existingRotations: Record<string, RotationSequenceStep[]>;
  onChangeExistingRotation: (farmId: string, seq: RotationSequenceStep[]) => void;
  crops: CropCharacteristic[];
  onAddCrop: (crop: CropCharacteristic) => void;
  onLogout: () => void;
  onSwitchWorkspace?: (role: 'farmer' | 'researcher' | 'admin') => void;
}

export const ResearcherWorkspace: React.FC<ResearcherWorkspaceProps> = ({
  session,
  farms,
  soilProfiles,
  prioritiesMap,
  existingRotations,
  onChangeExistingRotation,
  crops,
  onAddCrop,
  onLogout,
  onSwitchWorkspace,
}) => {
  const [activeTab, setActiveTab] = useState<ResearcherTab>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filters
  const [districtFilter, setDistrictFilter] = useState<string>('All');
  const [selectedFarmId, setSelectedFarmId] = useState<string>(farms[0].id);
  const [datasetFilter, setDatasetFilter] = useState<'rainfall' | 'smap' | 'ndvi' | 'temp'>('rainfall');
  const [monthRange, setMonthRange] = useState<'full' | 'kharif' | 'rabi'>('full');
  const [localDecision, setLocalDecision] = useState<FarmDecisionState>({ decision: 'pending' });

  const consentedFarms = farms.filter((f) => f.shareAnonymizedForResearch);
  const visibleFarms =
    districtFilter === 'All'
      ? consentedFarms
      : consentedFarms.filter((f) => f.district === districtFilter);

  const activeFarm = farms.find((f) => f.id === selectedFarmId) ?? consentedFarms[0] ?? farms[0];
  const activeSoil = soilProfiles[activeFarm.id] ?? Object.values(soilProfiles)[0];
  const activePriorities = prioritiesMap[activeFarm.id] ?? Object.values(prioritiesMap)[0];
  const activeSequence = existingRotations[activeFarm.id] ?? Object.values(existingRotations)[0];

  // Multi-farm comparison dataset
  const multiFarmCompare = useMemo(() => {
    return consentedFarms.map((farm) => {
      const series = DEMO_NASA_SERIES_BY_FARM[farm.id] ?? DEMO_NASA_SERIES_BY_FARM['farm-mandya-1'];
      const totalRain = series.reduce((a, b) => a + (b.rainfallMm ?? 0), 0);
      const meanNdvi = Number(
        (series.reduce((a, b) => a + (b.modisNdvi ?? 0), 0) / series.length).toFixed(2)
      );
      const meanSmap = Number(
        (series.reduce((a, b) => a + (b.smapSoilMoistureM3M3 ?? 0), 0) / series.length).toFixed(2)
      );
      const latest = series[series.length - 1];
      return {
        farmName: farm.district + ' (' + farm.taluk + ')',
        totalRain,
        meanNdvi,
        meanSmap,
        graceCm: latest.graceWaterAnomalyCm,
      };
    });
  }, [consentedFarms]);

  // Filtered time-series comparison across farms
  const combinedSeries = useMemo(() => {
    const base = DEMO_NASA_SERIES_BY_FARM['farm-mandya-1'];
    const filteredBase =
      monthRange === 'kharif'
        ? base.slice(5, 10)
        : monthRange === 'rabi'
        ? base.slice(0, 4).concat(base.slice(9))
        : base;

    return filteredBase.map((pt) => {
      const mandya = DEMO_NASA_SERIES_BY_FARM['farm-mandya-1'].find((x) => x.month === pt.month);
      const dharwad = DEMO_NASA_SERIES_BY_FARM['farm-dharwad-2'].find((x) => x.month === pt.month);
      const tumakuru = DEMO_NASA_SERIES_BY_FARM['farm-tumakuru-3'].find((x) => x.month === pt.month);

      const pickVal = (p?: typeof pt) => {
        if (!p) return null;
        if (datasetFilter === 'rainfall') return p.rainfallMm;
        if (datasetFilter === 'smap') return p.smapSoilMoistureM3M3;
        if (datasetFilter === 'ndvi') return p.modisNdvi;
        return p.powerAirTempC;
      };

      return {
        month: pt.month,
        Mandya: pickVal(mandya),
        Dharwad: pickVal(dharwad),
        Tumakuru: pickVal(tumakuru),
      };
    });
  }, [datasetFilter, monthRange]);

  const handleExportAllResearchCsv = () => {
    const headers = [
      'Farm_ID',
      'District',
      'Taluk',
      'Month',
      'Date',
      'Rainfall_mm',
      'SMAP_Moisture_m3m3',
      'MODIS_NDVI',
      'ECOSTRESS_LST_C',
      'POWER_AirTemp_C',
      'Quality_Flag',
    ];
    const lines: string[] = [headers.join(',')];
    consentedFarms.forEach((f) => {
      const s = DEMO_NASA_SERIES_BY_FARM[f.id] ?? [];
      s.forEach((pt) => {
        lines.push(
          [
            f.id,
            f.district,
            f.taluk,
            pt.month,
            pt.dateISO,
            pt.rainfallMm ?? 'NULL',
            pt.smapSoilMoistureM3M3 ?? 'NULL',
            pt.modisNdvi ?? 'NULL',
            pt.ecostressLstC ?? 'CLOUD_MASKED',
            pt.powerAirTempC,
            `"${pt.qualityFlag}"`,
          ].join(',')
        );
      });
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'field-shift-karnataka-research-demo-dataset.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const navItems: Array<{ id: ResearcherTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Multi-Farm Comparison', icon: BarChart3 },
    { id: 'climate-satellite', label: 'NASA Time-Series Analysis', icon: Satellite },
    { id: 'soil-comparison', label: 'Soil Profile Comparison', icon: FlaskConical },
    { id: 'rotation-analysis', label: 'Rotation Scenario Analysis', icon: Compass },
    { id: 'crop-db', label: 'Crop Database', icon: Sprout },
    { id: 'model-eval', label: 'Model Validation & Uncertainty', icon: Activity },
    { id: 'dataset-explorer', label: 'Dataset Explorer & Export', icon: Database },
    { id: 'reports', label: 'Research Reports', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#F6F4EF] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#E2DDD3] flex flex-col justify-between transition-transform lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="px-5 py-4 border-b border-[#EFECE6] flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-base text-[#1B4332]">FIELD SHIFT</div>
              <div className="text-[11px] text-[#6B4F35]">Agricultural Research Workspace</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1 text-[#4B5563]"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    active ? 'bg-[#1B4332] text-white' : 'text-[#374151] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#EFECE6] space-y-3 text-xs">
          {session.isDemoSession && onSwitchWorkspace && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-[#6B7280]">Demo Role Switch</div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onSwitchWorkspace('farmer')}
                  className="flex-1 py-1.5 px-2 rounded border border-[#D4CEC3] bg-[#FAF9F6] text-[11px] font-medium text-[#1B4332] hover:bg-[#EAE5DA] cursor-pointer"
                >
                  Farmer
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchWorkspace('admin')}
                  className="flex-1 py-1.5 px-2 rounded border border-[#D4CEC3] bg-[#FAF9F6] text-[11px] font-medium text-[#374151] hover:bg-[#EAE5DA] cursor-pointer"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#D4CEC3] text-[#374151] hover:bg-[#FEF2F2] hover:text-[#991B1B] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#E2DDD3] px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg border border-[#D4CEC3]"
              aria-label="Open menu"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-base sm:text-lg font-display font-bold text-[#1B4332]">
                Karnataka Agro-Climatic Research Console
              </h1>
              <div className="text-[11px] text-[#526058]">
                Consented Anonymized Plots: {consentedFarms.length} of {farms.length} · Researcher: {session.fullName}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#D4CEC3] rounded-lg bg-[#FAF9F6]"
            >
              <option value="All">All Karnataka Districts</option>
              <option value="Mandya">Mandya</option>
              <option value="Dharwad">Dharwad</option>
              <option value="Tumakuru">Tumakuru</option>
            </select>

            <button
              type="button"
              onClick={handleExportAllResearchCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-[#1B4332] mb-1">
                    Cross-District Cumulative Rainfall (Demo GPM IMERG, Jan–Nov 2026)
                  </h2>
                  <p className="text-xs text-[#6B7280] mb-4">Only farms opted into anonymized research sharing appear.</p>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={multiFarmCompare}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                        <XAxis dataKey="farmName" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="totalRain" name="Cumulative Rain (mm)" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-[#1B4332] mb-1">
                    Regional Soil Moisture (SMAP) vs. Canopy Vigor (MODIS NDVI)
                  </h2>
                  <p className="text-xs text-[#6B7280] mb-4">Mean 2026 demonstration indices across consented plots</p>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={multiFarmCompare}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                        <XAxis dataKey="farmName" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 0.8]} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar dataKey="meanNdvi" name="Mean MODIS NDVI" fill="#15803D" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="meanSmap" name="Mean SMAP (m³/m³)" fill="#0284C7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <KarnatakaMap
                farms={visibleFarms}
                selectedFarmId={activeFarm.id}
                onSelectFarm={setSelectedFarmId}
                allowAddFarm={false}
              />
            </>
          )}

          {activeTab === 'climate-satellite' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E2DDD3] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-[#1B4332]">
                    Multi-District Historical Climate & Satellite Comparison
                  </h2>
                  <p className="text-xs text-[#526058]">
                    Compare Mandya (Zone 6), Dharwad (Zone 8), and Tumakuru (Zone 4) demonstration series.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <select
                    value={datasetFilter}
                    onChange={(e) => setDatasetFilter(e.target.value as typeof datasetFilter)}
                    className="px-3 py-1.5 border border-[#D4CEC3] rounded-lg bg-[#FAF9F6]"
                  >
                    <option value="rainfall">GPM IMERG Rainfall (mm)</option>
                    <option value="smap">SMAP Soil Moisture (m³/m³)</option>
                    <option value="ndvi">MODIS NDVI</option>
                    <option value="temp">NASA POWER Air Temp (°C)</option>
                  </select>

                  <select
                    value={monthRange}
                    onChange={(e) => setMonthRange(e.target.value as typeof monthRange)}
                    className="px-3 py-1.5 border border-[#D4CEC3] rounded-lg bg-[#FAF9F6]"
                  >
                    <option value="full">Jan – Nov 2026</option>
                    <option value="kharif">Kharif Window (Jun–Oct)</option>
                    <option value="rabi">Rabi / Dry Window</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-[#E2DDD3] rounded-xl p-6">
                <div className="h-[340px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={combinedSeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Mandya" stroke="#1B4332" strokeWidth={2.5} />
                      <Line type="monotone" dataKey="Dharwad" stroke="#0284C7" strokeWidth={2.5} />
                      <Line type="monotone" dataKey="Tumakuru" stroke="#D97706" strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'soil-comparison' && (
            <div className="bg-white border border-[#E2DDD3] rounded-xl overflow-hidden">
              <div className="p-5 border-b border-[#EFECE6]">
                <h2 className="text-base font-semibold text-[#1B4332]">
                  Consented Farm Soil Profile & Gap Audit
                </h2>
                <p className="text-xs text-[#526058] mt-1">
                  Missing laboratory nutrients remain explicitly marked as "Unmeasured" to prevent data fabrication.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#FAF9F6] border-b border-[#E2DDD3] text-[#526058]">
                    <tr>
                      <th className="py-3 px-4">District / Taluk</th>
                      <th className="py-3 px-3">Soil Type & Texture</th>
                      <th className="py-3 px-3 text-right">pH</th>
                      <th className="py-3 px-3 text-right">N (kg/ha)</th>
                      <th className="py-3 px-3 text-right">P (kg/ha)</th>
                      <th className="py-3 px-3 text-right">K (kg/ha)</th>
                      <th className="py-3 px-3 text-right">OC (%)</th>
                      <th className="py-3 px-4">Provenance & Test Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE6]">
                    {visibleFarms.map((f) => {
                      const sp = soilProfiles[f.id];
                      return (
                        <tr key={f.id}>
                          <td className="py-3 px-4 font-semibold text-[#1B4332]">
                            {f.district} · {f.taluk}
                          </td>
                          <td className="py-3 px-3">
                            {sp ? `${sp.soilType} (${sp.soilTexture})` : 'Pending soil profile'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">{sp?.ph ?? 'Unmeasured'}</td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {sp?.nitrogenKgHa ?? <span className="text-[#9A3412]">Unmeasured</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">
                            {sp?.phosphorusKgHa ?? <span className="text-[#9A3412]">Unmeasured</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">{sp?.potassiumKgHa ?? 'Unmeasured'}</td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums">{sp?.organicCarbonPct ?? 'Unmeasured'}</td>
                          <td className="py-3 px-4 text-[#4B5563]">
                            {sp ? `${sp.source}${sp.soilTestDate ? ` · ${sp.soilTestDate}` : ' · No lab date'}` : 'Not recorded'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'rotation-analysis' && (
            <div className="space-y-4">
              <div className="bg-white border border-[#E2DDD3] rounded-xl p-4 flex items-center justify-between gap-4">
                <span className="text-xs font-semibold text-[#1B4332]">Select Consented Plot for Scenario Simulation</span>
                <select
                  value={activeFarm.id}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-[#D4CEC3] rounded-lg bg-[#FAF9F6]"
                >
                  {consentedFarms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.district} — {f.farmName}
                    </option>
                  ))}
                </select>
              </div>
              <RotationExplorer
                farm={activeFarm}
                soilProfile={activeSoil}
                priorities={activePriorities}
                existingSequence={activeSequence}
                onChangeExistingSequence={(seq) => onChangeExistingRotation(activeFarm.id, seq)}
                onUpdatePriorityQuick={() => {}}
                decisionState={localDecision}
                onSaveDecision={setLocalDecision}
              />
            </div>
          )}

          {activeTab === 'crop-db' && (
            <CropCatalogView crops={crops} canEdit={true} onAddCrop={onAddCrop} />
          )}

          {activeTab === 'model-eval' && (
            <div className="space-y-6">
              <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-4">
                <h2 className="text-base font-semibold text-[#1B4332]">
                  Model Validation, Uncertainty & Reproducibility Registry
                </h2>
                <p className="text-xs text-[#4B5563] leading-relaxed">
                  Per Field Shift’s scientific protocol, untrained machine-learning models never display fabricated accuracy scores. Initial deployment uses transparent Multi-Criteria Decision Analysis (MCDA) and threshold climate indicators until verified Karnataka field trial labels are ingested in Stage 5.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="bg-[#FAF9F6] border border-[#E2DDD3] rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-[#1B4332]">Model 1: Climate Risk Assessment</div>
                    <div className="font-mono text-[11px] text-[#2D6A4F]">Version: rule-climate-v1.0</div>
                    <p className="text-[#374151]">
                      Evaluates rainfall anomaly, dry-spell persistence, SMAP surface moisture deficits, and POWER heat-stress days.
                    </p>
                    <div className="text-[#9A3412]">
                      Validation Status: Rule-based baseline (Awaiting IMD/KVK ground-truth drought labels for ML calibration).
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] border border-[#E2DDD3] rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-[#1B4332]">Model 2: Crop Suitability Engine</div>
                    <div className="font-mono text-[11px] text-[#2D6A4F]">Version: agron-suitability-v1.0</div>
                    <p className="text-[#374151]">
                      Checks soil type, pH, water availability, and seasonal calendar compatibility with explicit missing-value penalties.
                    </p>
                    <div className="text-[#9A3412]">
                      Validation Status: Expert-curated UAS/ICAR agronomic rules; confidence drops automatically when N/P/OC are unmeasured.
                    </div>
                  </div>

                  <div className="bg-[#FAF9F6] border border-[#E2DDD3] rounded-lg p-4 space-y-2">
                    <div className="font-semibold text-[#1B4332]">Model 3: Rotation MCDA Ranker</div>
                    <div className="font-mono text-[11px] text-[#2D6A4F]">Version: mcda-rotation-v1.0</div>
                    <p className="text-[#374151]">
                      Computes 13-criteria trade-offs weighted dynamically by individual farmer priorities.
                    </p>
                    <div className="text-[#9A3412]">
                      Validation Status: Deterministic transparent scoring; reproducible across identical farm/soil/priority inputs.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#E2DDD3] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-[#EFECE6] font-semibold text-sm text-[#1B4332]">
                  Recent Evaluation & Prediction Audit Log (Stage 1 Demo)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF9F6] border-b border-[#E2DDD3] text-[#526058]">
                      <tr>
                        <th className="py-2.5 px-4">Timestamp</th>
                        <th className="py-2.5 px-3">Plot</th>
                        <th className="py-2.5 px-3">Model & Version</th>
                        <th className="py-2.5 px-3">Confidence</th>
                        <th className="py-2.5 px-4">Key Uncertainty Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFECE6]">
                      <tr>
                        <td className="py-2.5 px-4 font-mono">2026-11-10 09:42 UTC</td>
                        <td className="py-2.5 px-3">Mandya · Maddur</td>
                        <td className="py-2.5 px-3 font-mono">mcda-rotation-v1.0</td>
                        <td className="py-2.5 px-3">Moderate</td>
                        <td className="py-2.5 px-4">June–July ECOSTRESS cloud-masked gaps</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 font-mono">2026-11-10 09:45 UTC</td>
                        <td className="py-2.5 px-3">Tumakuru · Sira</td>
                        <td className="py-2.5 px-3 font-mono">mcda-rotation-v1.0</td>
                        <td className="py-2.5 px-3 text-[#9A3412] font-semibold">Low</td>
                        <td className="py-2.5 px-4">Lab N, P & soil test date missing</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'dataset-explorer' && (
            <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#1B4332]">
                    Aligned Multi-Source Dataset Explorer
                  </h2>
                  <p className="text-xs text-[#526058]">
                    Previewing {activeFarm.farmName} ({activeFarm.district}) aligned monthly demonstration observations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportAllResearchCsv}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1B4332] text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Full Consented CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF9F6] border-b border-[#E2DDD3] text-[#526058]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3 text-right">GPM Rain (mm)</th>
                      <th className="py-2.5 px-3 text-right">SMAP (m³/m³)</th>
                      <th className="py-2.5 px-3 text-right">MODIS NDVI</th>
                      <th className="py-2.5 px-3 text-right">ECOSTRESS LST (°C)</th>
                      <th className="py-2.5 px-3 text-right">POWER Air (°C)</th>
                      <th className="py-2.5 px-3">Quality Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE6]">
                    {(DEMO_NASA_SERIES_BY_FARM[activeFarm.id] ?? []).map((pt) => (
                      <tr key={pt.dateISO}>
                        <td className="py-2 px-3 font-mono tabular-nums">{pt.dateISO}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{pt.rainfallMm ?? 'NULL'}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{pt.smapSoilMoistureM3M3 ?? 'NULL'}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{pt.modisNdvi ?? 'NULL'}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">
                          {pt.ecostressLstC ?? <span className="text-[#9A3412]">Cloud-Masked</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{pt.powerAirTempC}</td>
                        <td className="py-2 px-3 text-[#4B5563]">{pt.qualityFlag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <ReportsAndAlerts
              mode="reports"
              farm={activeFarm}
              soilProfile={activeSoil}
              priorities={activePriorities}
              existingSequence={activeSequence}
            />
          )}
        </main>
      </div>
    </div>
  );
};
