import { useCallback, useEffect, useState } from 'react';
import {
  CROP_CATALOG,
  DEMO_FARMS,
  INITIAL_PRIORITIES,
  INITIAL_SOIL_PROFILES,
} from './data/karnatakaData';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import { getDefaultExistingSequence } from './services/rotationEngine';
import {
  checkSupabaseSchemaReady,
  createCropInSupabase,
  createFarmInSupabase,
  fetchConsentedResearchFarms,
  fetchUserWorkspaceData,
  loadSessionProfile,
  saveRotationDecisionInSupabase,
  signOutFromSupabase,
  updateLanguageInSupabase,
  upsertPrioritiesInSupabase,
  upsertSoilProfileInSupabase,
} from './services/supabaseData';
import { LandingPage, type PublicRoute } from './pages/LandingPage';
import { PublicInfoPages } from './pages/PublicInfoPages';
import { AuthPage } from './pages/AuthPage';
import { FarmerWorkspace } from './pages/FarmerWorkspace';
import { ResearcherWorkspace } from './pages/ResearcherWorkspace';
import { AdminWorkspace } from './pages/AdminWorkspace';
import type {
  CropCharacteristic,
  Farm,
  FarmDecisionState,
  FarmerPriorities,
  LanguageCode,
  RotationSequenceStep,
  RotationStrategyResult,
  SoilProfile,
  UserRole,
  UserSession,
} from './types/fieldShift';

export default function App() {
  const [publicRoute, setPublicRoute] = useState<PublicRoute>('landing');
  const [session, setSession] = useState<UserSession | null>(null);
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const [farms, setFarms] = useState<Farm[]>(DEMO_FARMS);
  const [selectedFarmId, setSelectedFarmId] = useState<string>(DEMO_FARMS[0].id);
  const [soilProfiles, setSoilProfiles] = useState<Record<string, SoilProfile>>(INITIAL_SOIL_PROFILES);
  const [prioritiesMap, setPrioritiesMap] = useState<Record<string, FarmerPriorities>>(INITIAL_PRIORITIES);
  const [crops, setCrops] = useState<CropCharacteristic[]>(CROP_CATALOG);

  const [existingRotations, setExistingRotations] = useState<Record<string, RotationSequenceStep[]>>(() => {
    const initial: Record<string, RotationSequenceStep[]> = {};
    DEMO_FARMS.forEach((f) => {
      initial[f.id] = getDefaultExistingSequence(f, INITIAL_SOIL_PROFILES[f.id]);
    });
    return initial;
  });

  const [decisions, setDecisions] = useState<Record<string, FarmDecisionState>>({});

  const showSyncToast = (msg: string) => {
    setSyncNotice(msg);
    setTimeout(() => {
      setSyncNotice((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const hydrateLiveSupabaseWorkspace = useCallback(async (activeSession: UserSession) => {
    if (activeSession.isDemoSession) return;

    const schemaCheck = await checkSupabaseSchemaReady();
    if (schemaCheck.connected && !schemaCheck.schemaReady) {
      setSchemaMissing(true);
      setFarms([]);
      return;
    }
    setSchemaMissing(false);

    if (activeSession.role === 'researcher') {
      const consented = await fetchConsentedResearchFarms();
      if (consented.length > 0) {
        setFarms(consented);
        setSelectedFarmId(consented[0].id);
      }
      return;
    }

    const loaded = await fetchUserWorkspaceData(activeSession.id);
    if (loaded.schemaMissing) {
      setSchemaMissing(true);
      setFarms([]);
      return;
    }

    setFarms(loaded.farms);
    setSoilProfiles(loaded.soilProfiles);
    setPrioritiesMap(loaded.prioritiesMap);
    setDecisions(loaded.decisions);

    const rotMap: Record<string, RotationSequenceStep[]> = {};
    loaded.farms.forEach((f) => {
      const sp = loaded.soilProfiles[f.id] ?? {
        farmId: f.id,
        soilType: 'Red soil',
        ph: null,
        nitrogenKgHa: null,
        phosphorusKgHa: null,
        potassiumKgHa: null,
        organicCarbonPct: null,
        soilTexture: 'Pending texture check',
        soilDepthCm: null,
        waterAvailability: 'Rainfed only',
        irrigationType: 'Rainfed',
        soilTestDate: null,
        source: 'Farmer-entered information',
        notes: '',
      };
      rotMap[f.id] = getDefaultExistingSequence(f, sp);
    });
    setExistingRotations(rotMap);
    if (loaded.farms.length > 0) {
      setSelectedFarmId(loaded.farms[0].id);
    }
  }, []);

  // Restore existing Supabase session and subscribe to auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const syncUser = async (user: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) return;
      const res = await loadSessionProfile(user.id, user.email ?? '', user.user_metadata);
      if (res.session) {
        setSession(res.session);
        if (res.schemaMissing) {
          setSchemaMissing(true);
          setFarms([]);
        } else {
          await hydrateLiveSupabaseWorkspace(res.session);
        }
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void syncUser(data.session.user);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, authSession) => {
      if (event === 'SIGNED_IN' && authSession?.user) {
        void syncUser(authSession.user);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [hydrateLiveSupabaseWorkspace]);

  const handleAuthenticated = async (newSession: UserSession, isMissingSchema?: boolean) => {
    if (newSession.isDemoSession) {
      setSchemaMissing(false);
      setFarms(DEMO_FARMS);
      setSelectedFarmId(DEMO_FARMS[0].id);
      setSoilProfiles(INITIAL_SOIL_PROFILES);
      setPrioritiesMap(INITIAL_PRIORITIES);
      setSession(newSession);
      return;
    }
    if (isMissingSchema) {
      setSchemaMissing(true);
      setFarms([]);
      setSession(newSession);
      return;
    }
    await hydrateLiveSupabaseWorkspace(newSession);
    setSession(newSession);
  };

  const handleVerifySchema = async () => {
    if (!session) return;
    await hydrateLiveSupabaseWorkspace(session);
    showSyncToast('Verified Supabase tables and synchronized workspace.');
  };

  const handleQuickDemoEnter = (role: 'farmer' | 'researcher') => {
    handleAuthenticated({
      id: `demo-${role}`,
      fullName:
        role === 'farmer'
          ? 'Basavaraj Gowda (Demo Preview)'
          : 'Dr. Kavitha Rao (Demo Preview)',
      email: `${role}.demo@fieldshift.org`,
      role,
      district: 'Mandya',
      state: 'Karnataka',
      preferredLanguage: 'en',
      isDemoSession: true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSwitchDemoRole = (role: UserRole) => {
    if (!session) return;
    setSession({
      ...session,
      role,
      fullName:
        role === 'farmer'
          ? 'Basavaraj Gowda (Demo Preview)'
          : role === 'researcher'
          ? 'Dr. Kavitha Rao (Demo Preview)'
          : 'KVK Admin Reviewer (Demo Preview)',
    });
  };

  const handleAddFarm = async (newFarmInput: Omit<Farm, 'id' | 'createdAt'>) => {
    const defaultSoilBase: Omit<SoilProfile, 'farmId'> = {
      soilType: 'Red soil',
      ph: null,
      nitrogenKgHa: null,
      phosphorusKgHa: null,
      potassiumKgHa: null,
      organicCarbonPct: null,
      soilTexture: 'Pending field texture check',
      soilDepthCm: null,
      waterAvailability: 'Rainfed only',
      irrigationType: 'Rainfed',
      soilTestDate: null,
      source: 'Farmer-entered information',
      notes: 'Newly registered farm; enter laboratory Soil Health Card values when available.',
    };
    const defaultPrioritiesBase: Omit<FarmerPriorities, 'farmId'> = {
      waterConservation: INITIAL_PRIORITIES['farm-mandya-1'].waterConservation,
      soilFertility: INITIAL_PRIORITIES['farm-mandya-1'].soilFertility,
      organicMatter: INITIAL_PRIORITIES['farm-mandya-1'].organicMatter,
      erosionControl: INITIAL_PRIORITIES['farm-mandya-1'].erosionControl,
      cropDiversity: INITIAL_PRIORITIES['farm-mandya-1'].cropDiversity,
      pestRiskReduction: INITIAL_PRIORITIES['farm-mandya-1'].pestRiskReduction,
      farmIncome: INITIAL_PRIORITIES['farm-mandya-1'].farmIncome,
      forageProduction: INITIAL_PRIORITIES['farm-mandya-1'].forageProduction,
      climateResilience: INITIAL_PRIORITIES['farm-mandya-1'].climateResilience,
      marketSuitability: INITIAL_PRIORITIES['farm-mandya-1'].marketSuitability,
      constraints: INITIAL_PRIORITIES['farm-mandya-1'].constraints,
    };

    if (session && !session.isDemoSession) {
      const res = await createFarmInSupabase(
        session.id,
        newFarmInput,
        defaultSoilBase,
        defaultPrioritiesBase
      );
      if (res.schemaMissing) {
        setSchemaMissing(true);
        return;
      }
      if (res.error || !res.farm) {
        showSyncToast(`Supabase save error: ${res.error}`);
        return;
      }
      const savedFarm = res.farm;
      const savedSoil: SoilProfile = { ...defaultSoilBase, farmId: savedFarm.id };
      const savedPriorities: FarmerPriorities = { ...defaultPrioritiesBase, farmId: savedFarm.id };
      setFarms((prev) => [...prev, savedFarm]);
      setSoilProfiles((prev) => ({ ...prev, [savedFarm.id]: savedSoil }));
      setPrioritiesMap((prev) => ({ ...prev, [savedFarm.id]: savedPriorities }));
      setExistingRotations((prev) => ({
        ...prev,
        [savedFarm.id]: getDefaultExistingSequence(savedFarm, savedSoil),
      }));
      setSelectedFarmId(savedFarm.id);
      showSyncToast(`Saved "${savedFarm.farmName}" to Supabase PostgreSQL.`);
      return;
    }

    const newId = `farm-custom-${Date.now()}`;
    const newFarm: Farm = {
      ...newFarmInput,
      id: newId,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const newSoil: SoilProfile = { ...defaultSoilBase, farmId: newId };
    const newPriorities: FarmerPriorities = { ...defaultPrioritiesBase, farmId: newId };
    setFarms((prev) => [...prev, newFarm]);
    setSoilProfiles((prev) => ({ ...prev, [newId]: newSoil }));
    setPrioritiesMap((prev) => ({ ...prev, [newId]: newPriorities }));
    setExistingRotations((prev) => ({
      ...prev,
      [newId]: getDefaultExistingSequence(newFarm, newSoil),
    }));
    setSelectedFarmId(newId);
  };

  const handleSaveSoilProfile = async (updated: SoilProfile, reportFile?: File) => {
    setSoilProfiles((prev) => ({ ...prev, [updated.farmId]: updated }));
    if (session && !session.isDemoSession) {
      const res = await upsertSoilProfileInSupabase(session.id, updated, reportFile);
      if (res.schemaMissing) {
        setSchemaMissing(true);
        return;
      }
      if (res.error) {
        showSyncToast(`Could not sync soil profile: ${res.error}`);
      } else {
        showSyncToast('Soil profile saved to Supabase database.');
      }
    }
  };

  const handleSavePriorities = async (updated: FarmerPriorities) => {
    setPrioritiesMap((prev) => ({ ...prev, [updated.farmId]: updated }));
    if (session && !session.isDemoSession) {
      const res = await upsertPrioritiesInSupabase(updated);
      if (res.schemaMissing) {
        setSchemaMissing(true);
        return;
      }
      if (res.error) {
        showSyncToast(`Could not sync priorities: ${res.error}`);
      } else {
        showSyncToast('Farmer priorities saved to Supabase database.');
      }
    }
  };

  const handleChangeExistingRotation = (farmId: string, seq: RotationSequenceStep[]) => {
    setExistingRotations((prev) => ({ ...prev, [farmId]: seq }));
  };

  const handleSaveDecision = async (
    farmId: string,
    dec: FarmDecisionState,
    strategy?: RotationStrategyResult
  ) => {
    setDecisions((prev) => ({ ...prev, [farmId]: dec }));
    if (session && !session.isDemoSession && strategy) {
      const res = await saveRotationDecisionInSupabase(farmId, strategy, dec);
      if (res.schemaMissing) {
        setSchemaMissing(true);
        return;
      }
      if (res.error) {
        showSyncToast(`Could not save rotation decision: ${res.error}`);
      } else {
        showSyncToast('Crop rotation evaluation & decision saved to Supabase.');
      }
    }
  };

  const handleAddCrop = async (crop: CropCharacteristic) => {
    setCrops((prev) => [crop, ...prev]);
    if (session && !session.isDemoSession) {
      await createCropInSupabase(crop);
    }
  };

  const handleToggleLanguage = async (lang: LanguageCode) => {
    if (!session) return;
    setSession({ ...session, preferredLanguage: lang });
    if (!session.isDemoSession) {
      await updateLanguageInSupabase(session.id, lang);
    }
  };

  const handleLogout = async () => {
    if (session && !session.isDemoSession) {
      await signOutFromSupabase();
    }
    setSession(null);
    setSchemaMissing(false);
    setFarms(DEMO_FARMS);
    setSelectedFarmId(DEMO_FARMS[0].id);
    setSoilProfiles(INITIAL_SOIL_PROFILES);
    setPrioritiesMap(INITIAL_PRIORITIES);
    setPublicRoute('landing');
  };

  if (session) {
    if (session.role === 'researcher') {
      return (
        <ResearcherWorkspace
          session={session}
          farms={farms.length > 0 ? farms : DEMO_FARMS}
          soilProfiles={Object.keys(soilProfiles).length > 0 ? soilProfiles : INITIAL_SOIL_PROFILES}
          prioritiesMap={Object.keys(prioritiesMap).length > 0 ? prioritiesMap : INITIAL_PRIORITIES}
          existingRotations={existingRotations}
          onChangeExistingRotation={handleChangeExistingRotation}
          crops={crops}
          onAddCrop={handleAddCrop}
          onLogout={handleLogout}
          onSwitchWorkspace={handleSwitchDemoRole}
        />
      );
    }

    if (session.role === 'admin') {
      return (
        <AdminWorkspace
          session={session}
          crops={crops}
          onAddCrop={handleAddCrop}
          onLogout={handleLogout}
          onSwitchWorkspace={handleSwitchDemoRole}
        />
      );
    }

    return (
      <FarmerWorkspace
        session={session}
        farms={farms}
        selectedFarmId={selectedFarmId}
        onSelectFarm={setSelectedFarmId}
        onAddFarm={handleAddFarm}
        soilProfiles={soilProfiles}
        onSaveSoilProfile={handleSaveSoilProfile}
        prioritiesMap={prioritiesMap}
        onSavePriorities={handleSavePriorities}
        existingRotations={existingRotations}
        onChangeExistingRotation={handleChangeExistingRotation}
        decisions={decisions}
        onSaveDecision={handleSaveDecision}
        onToggleLanguage={handleToggleLanguage}
        onLogout={handleLogout}
        onSwitchWorkspace={handleSwitchDemoRole}
        schemaMissing={schemaMissing}
        onVerifySchema={handleVerifySchema}
        syncNotice={syncNotice}
      />
    );
  }

  if (publicRoute === 'about' || publicRoute === 'nasa-sources') {
    return <PublicInfoPages page={publicRoute} onNavigate={setPublicRoute} />;
  }

  if (publicRoute === 'login' || publicRoute === 'register' || publicRoute === 'forgot-password') {
    return (
      <AuthPage
        mode={publicRoute}
        onNavigate={setPublicRoute}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <LandingPage
      onNavigate={setPublicRoute}
      onQuickDemoEnter={handleQuickDemoEnter}
    />
  );
}
