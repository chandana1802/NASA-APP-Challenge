import React, { useState } from 'react';
import {
  AlertTriangle,
  Compass,
  Droplets,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Satellite,
  SlidersHorizontal,
  User,
  X,
} from 'lucide-react';
import { KarnatakaMap } from '../components/KarnatakaMap';
import { SoilProfileForm } from '../components/SoilProfileForm';
import { FarmerPrioritiesForm } from '../components/FarmerPrioritiesForm';
import { RotationExplorer } from '../components/RotationExplorer';
import { NasaEnvironmentalView } from '../components/NasaEnvironmentalView';
import { ReportsAndAlerts } from '../components/ReportsAndAlerts';
import { SupabaseSetupBanner } from '../components/SupabaseSetupBanner';
import {
  DEMO_ALERTS,
  DEMO_NASA_SERIES_BY_FARM,
  INITIAL_PRIORITIES,
  UI_TRANSLATIONS,
} from '../data/karnatakaData';
import type {
  Farm,
  FarmDecisionState,
  FarmerPriorities,
  LanguageCode,
  RotationSequenceStep,
  RotationStrategyResult,
  SoilProfile,
  UserSession,
} from '../types/fieldShift';

type FarmerTab =
  | 'overview'
  | 'farms'
  | 'soil'
  | 'nasa'
  | 'rotation'
  | 'priorities'
  | 'alerts'
  | 'reports'
  | 'profile';

interface FarmerWorkspaceProps {
  session: UserSession;
  farms: Farm[];
  selectedFarmId: string;
  onSelectFarm: (id: string) => void;
  onAddFarm: (farm: Omit<Farm, 'id' | 'createdAt'>) => void;
  soilProfiles: Record<string, SoilProfile>;
  onSaveSoilProfile: (profile: SoilProfile, reportFile?: File) => void;
  prioritiesMap: Record<string, FarmerPriorities>;
  onSavePriorities: (p: FarmerPriorities) => void;
  existingRotations: Record<string, RotationSequenceStep[]>;
  onChangeExistingRotation: (farmId: string, seq: RotationSequenceStep[]) => void;
  decisions: Record<string, FarmDecisionState>;
  onSaveDecision: (farmId: string, dec: FarmDecisionState, strategy?: RotationStrategyResult) => void;
  onToggleLanguage: (lang: LanguageCode) => void;
  onLogout: () => void;
  onSwitchWorkspace?: (role: 'farmer' | 'researcher' | 'admin') => void;
  schemaMissing?: boolean;
  onVerifySchema?: () => Promise<void>;
  syncNotice?: string | null;
}

export const FarmerWorkspace: React.FC<FarmerWorkspaceProps> = ({
  session,
  farms,
  selectedFarmId,
  onSelectFarm,
  onAddFarm,
  soilProfiles,
  onSaveSoilProfile,
  prioritiesMap,
  onSavePriorities,
  existingRotations,
  onChangeExistingRotation,
  decisions,
  onSaveDecision,
  onToggleLanguage,
  onLogout,
  onSwitchWorkspace,
  schemaMissing,
  onVerifySchema,
  syncNotice,
}) => {
  const [activeTab, setActiveTab] = useState<FarmerTab>(farms.length === 0 ? 'farms' : 'overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const lang = session.preferredLanguage;
  const t = UI_TRANSLATIONS[lang];

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) ?? farms[0];
  const soil = selectedFarm ? soilProfiles[selectedFarm.id] : undefined;
  const priorities = selectedFarm
    ? prioritiesMap[selectedFarm.id] ?? { ...INITIAL_PRIORITIES['farm-mandya-1'], farmId: selectedFarm.id }
    : INITIAL_PRIORITIES['farm-mandya-1'];
  const existingSequence = selectedFarm ? existingRotations[selectedFarm.id] : undefined;
  const decision = selectedFarm ? decisions[selectedFarm.id] ?? { decision: 'pending' } : { decision: 'pending' as const };

  const series = selectedFarm
    ? DEMO_NASA_SERIES_BY_FARM[selectedFarm.id] ?? DEMO_NASA_SERIES_BY_FARM['farm-mandya-1']
    : DEMO_NASA_SERIES_BY_FARM['farm-mandya-1'];
  const latest = series[series.length - 1];
  const recentRainSum = series.slice(-3).reduce((acc, p) => acc + (p.rainfallMm ?? 0), 0);

  const farmRisk =
    (latest.smapSoilMoistureM3M3 ?? 0.25) < 0.18
      ? { label: 'Moisture Deficit Watch', tone: 'text-[#991B1B]' }
      : (latest.graceWaterAnomalyCm ?? 0) < -3
      ? { label: 'Moderate Regional Stress', tone: 'text-[#B45309]' }
      : { label: 'Nominal Seasonal Window', tone: 'text-[#166534]' };

  const navItems: Array<{ id: FarmerTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: t.overview, icon: LayoutDashboard },
    { id: 'farms', label: t.myFarms, icon: MapPin },
    { id: 'soil', label: t.soilProfile, icon: FlaskConical },
    { id: 'nasa', label: t.nasaEnvData, icon: Satellite },
    { id: 'rotation', label: t.rotationExplorer, icon: Compass },
    { id: 'priorities', label: t.farmerPriorities, icon: SlidersHorizontal },
    { id: 'alerts', label: t.alerts, icon: AlertTriangle },
    { id: 'reports', label: t.reports, icon: FileText },
    { id: 'profile', label: t.profile, icon: User },
  ];

  const handleQuickPriorityUpdate = (
    key: 'waterConservation' | 'soilFertility' | 'climateResilience' | 'farmIncome',
    val: number
  ) => {
    onSavePriorities({
      ...priorities,
      [key]: val,
    });
  };

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
              <div className="text-[11px] text-[#526058]">
                {session.isDemoSession ? 'Farmer Demo Workspace' : 'Farmer Workspace (Supabase)'}
              </div>
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
                  onClick={() => onSwitchWorkspace('researcher')}
                  className="flex-1 py-1.5 px-2 rounded border border-[#D4CEC3] bg-[#FAF9F6] text-[11px] font-medium text-[#1B4332] hover:bg-[#EAE5DA] cursor-pointer"
                >
                  Researcher
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
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-[#D4CEC3] text-[#374151] hover:bg-[#FEF2F2] hover:text-[#991B1B] transition-colors cursor-pointer"
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
                {t.dashboardTitle}
              </h1>
              <div className="text-[11px] text-[#526058]">
                {session.isDemoSession ? t.demoDataBadge : 'Connected to Supabase Database'} · {session.fullName}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {farms.length > 0 && selectedFarm && (
              <select
                value={selectedFarm.id}
                onChange={(e) => onSelectFarm(e.target.value)}
                aria-label="Select active farm"
                className="px-3 py-1.5 text-xs font-medium border border-[#D4CEC3] rounded-lg bg-[#FAF9F6] text-[#1A241E]"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.farmName} ({f.district})
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center p-0.5 bg-[#F6F4EF] border border-[#D4CEC3] rounded-lg text-xs">
              <button
                type="button"
                onClick={() => onToggleLanguage('en')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                  lang === 'en' ? 'bg-white text-[#1B4332] shadow-xs' : 'text-[#526058]'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onToggleLanguage('kn')}
                className={`px-2.5 py-1 rounded-md font-medium cursor-pointer ${
                  lang === 'kn' ? 'bg-white text-[#1B4332] shadow-xs' : 'text-[#526058]'
                }`}
              >
                ಕನ್ನಡ
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6">
          {schemaMissing && onVerifySchema && <SupabaseSetupBanner onVerify={onVerifySchema} />}

          {syncNotice && (
            <div className="text-xs bg-[#EDF5F0] border border-[#C5DEC9] text-[#1B4332] rounded-lg px-4 py-2.5">
              {syncNotice}
            </div>
          )}

          {farms.length === 0 && activeTab !== 'farms' && activeTab !== 'profile' && (
            <div className="bg-white border border-[#C9D6CE] rounded-xl p-8 text-center space-y-4">
              <MapPin className="w-8 h-8 text-[#2D6A4F] mx-auto" />
              <div className="space-y-1 max-w-md mx-auto">
                <h2 className="text-lg font-display font-bold text-[#1B4332]">
                  Welcome, {session.fullName}! Register Your First Farm
                </h2>
                <p className="text-xs text-[#526058]">
                  Your account is saved in Supabase. Add your first Karnataka farm location to store soil profiles, priorities, and rotation strategies in your database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('farms')}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Farm on Karnataka Map</span>
              </button>
            </div>
          )}

          {activeTab === 'overview' && selectedFarm && soil && existingSequence && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#E2DDD3] rounded-xl p-4">
                  <div className="text-xs text-[#526058]">{t.registeredFarms}</div>
                  <div className="text-2xl font-display font-bold tabular-nums text-[#1B4332] mt-1">
                    {farms.length} Plots
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-1">Across Karnataka agro-climatic zones</div>
                </div>

                <div className="bg-white border border-[#E2DDD3] rounded-xl p-4">
                  <div className="text-xs text-[#526058]">{t.selectedFarm}</div>
                  <div className="text-base font-display font-bold text-[#1B4332] mt-1 truncate">
                    {selectedFarm.farmName}
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-1">
                    {selectedFarm.taluk}, {selectedFarm.district} · {selectedFarm.area} {selectedFarm.areaUnit}
                  </div>
                </div>

                <div className="bg-white border border-[#E2DDD3] rounded-xl p-4">
                  <div className="text-xs text-[#526058]">{t.airTemp}</div>
                  <div className="text-2xl font-display font-bold tabular-nums text-[#1A241E] mt-1">
                    {latest.powerAirTempC} °C
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-1">
                    Demo Ref · {latest.dateISO} (2 m air temp)
                  </div>
                </div>

                <div className="bg-white border border-[#E2DDD3] rounded-xl p-4">
                  <div className="text-xs text-[#526058]">{t.recentRainfall}</div>
                  <div className="text-2xl font-display font-bold tabular-nums text-[#1A241E] mt-1">
                    {recentRainSum} mm
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-1">
                    Sep–Nov 3-mo cumulative (GPM 0.1° Demo)
                  </div>
                </div>

                <div className="bg-white border border-[#E2DDD3] rounded-xl p-4">
                  <div className="text-xs text-[#526058]">{t.soilMoisture}</div>
                  <div className="text-2xl font-display font-bold tabular-nums text-[#1A241E] mt-1">
                    {latest.smapSoilMoistureM3M3 ?? 'N/A'} m³/m³
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-1">
                    9 km regional footprint (not field sensor)
                  </div>
                </div>

                <div className="bg-white border border-[#E2DDD3] rounded-xl p-4">
                  <div className="text-xs text-[#526058]">{t.vegetationHealth}</div>
                  <div className="text-2xl font-display font-bold tabular-nums text-[#166534] mt-1">
                    {latest.modisNdvi !== null ? latest.modisNdvi.toFixed(2) : 'N/A'} NDVI
                  </div>
                  <div className="text-[11px] text-[#6B7280] mt-1">
                    MODIS 250 m canopy greenness index
                  </div>
                </div>

                <div className="bg-white border border-[#E2DDD3] rounded-xl p-4 sm:col-span-2">
                  <div className="text-xs text-[#526058]">{t.riskStatus}</div>
                  <div className={`text-lg font-display font-bold mt-1 ${farmRisk.tone}`}>
                    {farmRisk.label}
                  </div>
                  <div className="text-xs text-[#4B5563] mt-1">
                    Soil: {soil.soilType} ({soil.waterAvailability}) · Latest GRACE Regional Anomaly: {latest.graceWaterAnomalyCm} cm
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-[#1B4332]">
                      Explore Crop Rotation Strategies for {selectedFarm.farmName}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab('rotation')}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] cursor-pointer"
                    >
                      Open Rotation Explorer
                    </button>
                  </div>
                  <p className="text-sm text-[#4B5563] leading-relaxed">
                    Compare your current crop sequence ({existingSequence.map((s) => s.cropName).join(' → ')}) against a nitrogen-fixing Alternative rotation and a low-water Climate-Resilient rotation calibrated to {selectedFarm.district} conditions.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('soil')}
                      className="text-left p-3.5 rounded-lg border border-[#E2DDD3] bg-[#FAF9F6] hover:bg-[#EFECE6] cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-[#1B4332]">Update Soil Profile</div>
                      <div className="text-[11px] text-[#526058] mt-1">
                        {soil.nitrogenKgHa === null ? 'Nitrogen lab test missing' : `pH ${soil.ph ?? '—'} · ${soil.soilType}`}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('priorities')}
                      className="text-left p-3.5 rounded-lg border border-[#E2DDD3] bg-[#FAF9F6] hover:bg-[#EFECE6] cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-[#1B4332]">Adjust Priorities</div>
                      <div className="text-[11px] text-[#526058] mt-1">
                        Water {priorities.waterConservation}/5 · Fertility {priorities.soilFertility}/5
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('farms')}
                      className="text-left p-3.5 rounded-lg border border-[#E2DDD3] bg-[#FAF9F6] hover:bg-[#EFECE6] cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-[#1B4332]">Karnataka Farm Map</div>
                      <div className="text-[11px] text-[#526058] mt-1">
                        Inspect layers & plot boundaries
                      </div>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#1B4332]">
                    <Droplets className="w-4 h-4 text-[#0284C7]" />
                    <span>Irrigation & Moisture Advisory</span>
                  </div>
                  <p className="text-xs text-[#374151] leading-relaxed">
                    Based on demonstration SMAP moisture ({latest.smapSoilMoistureM3M3} m³/m³) and {soil.waterAvailability.toLowerCase()} status, prioritize moisture-conserving residue cover before Rabi sowing.
                    {latest.ecostressLstC !== null &&
                      ` Latest ECOSTRESS skin temperature is ${latest.ecostressLstC} °C (ET ${latest.ecostressEtMmDay} mm/day).`}
                  </p>
                  <div className="border-t border-[#EFECE6] pt-3 space-y-2">
                    <div className="text-xs font-semibold text-[#9A3412]">Latest Regional Alert</div>
                    <div className="text-xs text-[#4B5563]">
                      {(DEMO_ALERTS.find((a) => a.farmId === selectedFarm.id) ?? DEMO_ALERTS[0]).title}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('alerts')}
                      className="text-xs font-semibold text-[#1B4332] hover:underline cursor-pointer"
                    >
                      View All Advisories & Uncertainty →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-[#EDF5F0] border border-[#C5DEC9] rounded-xl p-4 text-xs text-[#1B4332]">
                {t.localExpertReminder}
              </div>
            </>
          )}

          {activeTab === 'farms' && (
            <KarnatakaMap
              farms={farms}
              selectedFarmId={selectedFarm?.id ?? ''}
              onSelectFarm={onSelectFarm}
              onAddFarm={onAddFarm}
              allowAddFarm={true}
            />
          )}

          {activeTab === 'soil' && selectedFarm && soil && (
            <SoilProfileForm
              farm={selectedFarm}
              soilProfile={soil}
              onSaveSoilProfile={onSaveSoilProfile}
            />
          )}

          {activeTab === 'nasa' && selectedFarm && <NasaEnvironmentalView farm={selectedFarm} />}

          {activeTab === 'rotation' && selectedFarm && soil && existingSequence && (
            <RotationExplorer
              farm={selectedFarm}
              soilProfile={soil}
              priorities={priorities}
              existingSequence={existingSequence}
              onChangeExistingSequence={(seq) => onChangeExistingRotation(selectedFarm.id, seq)}
              onUpdatePriorityQuick={handleQuickPriorityUpdate}
              decisionState={decision}
              onSaveDecision={(dec, strat) => onSaveDecision(selectedFarm.id, dec, strat)}
            />
          )}

          {activeTab === 'priorities' && selectedFarm && (
            <FarmerPrioritiesForm
              farm={selectedFarm}
              priorities={priorities}
              onSavePriorities={onSavePriorities}
            />
          )}

          {activeTab === 'alerts' && selectedFarm && soil && existingSequence && (
            <ReportsAndAlerts
              mode="alerts"
              farm={selectedFarm}
              soilProfile={soil}
              priorities={priorities}
              existingSequence={existingSequence}
            />
          )}

          {activeTab === 'reports' && selectedFarm && soil && existingSequence && (
            <ReportsAndAlerts
              mode="reports"
              farm={selectedFarm}
              soilProfile={soil}
              priorities={priorities}
              existingSequence={existingSequence}
            />
          )}

          {activeTab === 'profile' && (
            <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 max-w-2xl space-y-4">
              <h2 className="text-lg font-semibold text-[#1B4332]">Farmer Account Profile</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-[#6B7280]">Full Name</div>
                  <div className="font-medium mt-0.5">{session.fullName}</div>
                </div>
                <div>
                  <div className="text-xs text-[#6B7280]">Email</div>
                  <div className="font-medium mt-0.5">{session.email}</div>
                </div>
                <div>
                  <div className="text-xs text-[#6B7280]">Role</div>
                  <div className="font-medium mt-0.5 capitalize">{session.role}</div>
                </div>
                <div>
                  <div className="text-xs text-[#6B7280]">Region</div>
                  <div className="font-medium mt-0.5">
                    {session.district}, {session.state}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#6B7280]">Preferred Language</div>
                  <div className="font-medium mt-0.5">
                    {lang === 'kn' ? 'ಕನ್ನಡ (Kannada)' : 'English'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#6B7280]">Persistence Mode</div>
                  <div className="font-medium mt-0.5">
                    {session.isDemoSession ? 'Local Preview (Unsaved)' : 'Supabase PostgreSQL'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
