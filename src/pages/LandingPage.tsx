import React from 'react';
import {
  ArrowRight,
  Compass,
  Database,
  Layers,
  MapPin,
  Satellite,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { NASA_DATASETS } from '../data/karnatakaData';
import heroAerialImg from '../assets/images/hero_satellite_karnataka_1794637061546.jpg';
import rotationPatchworkImg from '../assets/images/crop_rotation_patchwork_1794637061574.jpg';
import farmerInspectionImg from '../assets/images/farmer_soil_inspection_1794637062489.jpg';

export type PublicRoute =
  | 'landing'
  | 'about'
  | 'nasa-sources'
  | 'login'
  | 'register'
  | 'forgot-password';

interface LandingPageProps {
  onNavigate: (route: PublicRoute) => void;
  onQuickDemoEnter: (role: 'farmer' | 'researcher') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigate,
  onQuickDemoEnter,
}) => {
  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1A241E]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-[#F6F4EF]/95 backdrop-blur-sm border-b border-[#E2DDD3]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="text-lg font-display font-bold tracking-tight text-[#1B4332] whitespace-nowrap shrink-0 cursor-pointer"
          >
            FIELD SHIFT
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#4B5563]">
            <a
              href="#problem-solution"
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0"
            >
              Solution
            </a>
            <a
              href="#nasa-integration"
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0"
            >
              NASA Data
            </a>
            <a
              href="#rotation-comparison"
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0"
            >
              Crop Rotation
            </a>
            <button
              type="button"
              onClick={() => onNavigate('nasa-sources')}
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Data Sources
            </button>
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className="hover:text-[#1B4332] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              About
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1B4332] rounded-lg hover:bg-[#143326] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="text-xs font-medium text-[#2D6A4F]">
                Adapting Farms with NASA Data · Karnataka Pilot Focus · 2026 NASA Challenge
              </div>
              <h1 className="text-4xl sm:text-5xl font-display font-bold tracking-tight text-[#1B4332] leading-[1.12] [text-wrap:balance]">
                Build Resilient Farms with the Power of NASA Earth Observations.
              </h1>
              <p className="text-base sm:text-lg text-[#3F4B44] leading-relaxed max-w-xl">
                Field Shift combines satellite observations, local soil information, crop characteristics and artificial intelligence to help farmers explore sustainable crop rotation strategies.
              </p>
              <p className="text-sm text-[#6B4F35] font-medium">
                Turning Earth Observations into Climate-Resilient Farming Decisions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onQuickDemoEnter('farmer')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#1B4332] rounded-lg hover:bg-[#143326] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Explore Field Shift</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#1B4332] bg-white border border-[#C9D6CE] rounded-lg hover:bg-[#EDF5F0] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Get Started</span>
              </button>
              <button
                type="button"
                onClick={() => onQuickDemoEnter('researcher')}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#6B4F35] bg-[#FAF6EE] border border-[#DFD5C3] rounded-lg hover:bg-[#F2EAD9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Researcher Access</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[320px] rounded-xl overflow-hidden border border-[#D4CEC3] bg-[#2D6A4F]/10 relative">
              <img
                src={heroAerialImg}
                alt="Aerial patchwork of irrigated and rainfed crop rotation fields in rural Karnataka, India"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5 text-white">
                <div className="text-xs font-mono text-white/80">
                  KARNATAKA AGRO-CLIMATIC DECISION SUPPORT · STAGE 1 FRONTEND
                </div>
                <div className="text-sm font-medium mt-1">
                  Multi-season crop rotation exploration grounded in SMAP, GPM IMERG, ECOSTRESS, MODIS, Landsat, POWER, GRACE-FO & SRTM
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Evidence Strip Below Hero */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
            <div className="text-xs text-[#526058]">NASA Datasets Architected</div>
            <div className="text-2xl font-display font-bold tabular-nums text-[#1B4332] mt-1">8 Missions</div>
            <div className="text-xs text-[#6B7280] mt-1">SMAP, GPM, ECOSTRESS, MODIS, Landsat, POWER, GRACE-FO, SRTM</div>
          </div>
          <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
            <div className="text-xs text-[#526058]">Rotation Evaluation</div>
            <div className="text-2xl font-display font-bold tabular-nums text-[#1B4332] mt-1">3 Strategies</div>
            <div className="text-xs text-[#6B7280] mt-1">Existing Baseline vs. Nutrient-Cycling vs. Climate-Resilient</div>
          </div>
          <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
            <div className="text-xs text-[#526058]">Validated Crop Catalog</div>
            <div className="text-2xl font-display font-bold tabular-nums text-[#1B4332] mt-1">13 Crops</div>
            <div className="text-xs text-[#6B7280] mt-1">Karnataka Kharif, Rabi & Summer staples, millets & pulses</div>
          </div>
          <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
            <div className="text-xs text-[#526058]">Languages Supported</div>
            <div className="text-2xl font-display font-bold text-[#1B4332] mt-1">EN / ಕನ್ನಡ</div>
            <div className="text-xs text-[#6B7280] mt-1">Bilingual farmer interface with local KVK review prompts</div>
          </div>
        </div>
      </section>

      {/* Problem & Solution Section */}
      <section id="problem-solution" className="bg-white border-y border-[#E2DDD3] py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <div className="rounded-xl overflow-hidden border border-[#E2DDD3] bg-[#F6F4EF] aspect-[4/3]">
              <img
                src={farmerInspectionImg}
                alt="Farmer and agricultural specialist inspecting soil moisture and seedlings in Karnataka"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="text-xs font-semibold text-[#6B4F35]">01. Agricultural Challenge & Decision-Support Solution</div>
              <h2 className="text-3xl font-display font-bold text-[#1B4332] mt-2 [text-wrap:balance]">
                Moving beyond generic weather alerts to explainable multi-season crop rotation.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-2">
                <h3 className="font-semibold text-[#9A3412]">The Agricultural Problem</h3>
                <p className="text-[#4B5563] leading-relaxed">
                  Across Karnataka’s dryland and irrigated basins, repeated cereal monocropping depletes organic carbon, compounds pest cycles, and leaves farms vulnerable to erratic monsoon onset and falling regional water tables.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-[#1B4332]">The Field Shift Solution</h3>
                <p className="text-[#4B5563] leading-relaxed">
                  Field Shift fuses multi-resolution NASA Earth observations with farmer-entered soil profiles and ranked farm priorities to evaluate concrete seasonal rotation trade-offs—including nitrogen fixation, water demand, and uncertainty.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NASA Earth Observation Integration */}
      <section id="nasa-integration" className="max-w-7xl mx-auto px-6 py-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-xs font-semibold text-[#2D6A4F]">02. Multi-Resolution Earth Observation Architecture</div>
            <h2 className="text-3xl font-display font-bold text-[#1B4332] mt-2">
              Eight NASA datasets integrated with explicit scale and limitation disclosures.
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('nasa-sources')}
            className="text-sm font-semibold text-[#1B4332] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            View Technical Dataset Matrix →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {NASA_DATASETS.map((ds) => (
            <div key={ds.id} className="bg-white border border-[#E2DDD3] rounded-xl p-5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[#1B4332]">{ds.name}</span>
                <span className="text-[11px] font-mono text-[#2D6A4F]">{ds.spatialResolution}</span>
              </div>
              <p className="text-xs text-[#374151] leading-relaxed">{ds.measures}</p>
              <div className="text-[11px] text-[#6B4F35] pt-2 border-t border-[#EFECE6]">
                Guardrail: {ds.limitations}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Crop Rotation Comparison Preview */}
      <section id="rotation-comparison" className="bg-white border-y border-[#E2DDD3] py-16">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="text-xs font-semibold text-[#2D6A4F]">03. Core Decision Engine</div>
            <h2 className="text-3xl font-display font-bold text-[#1B4332] [text-wrap:balance]">
              Compare Strategy A, B, and C side by side before choosing what to sow.
            </h2>
            <p className="text-sm text-[#4B5563] leading-relaxed">
              Field Shift never declares one single rotation universally "best." Instead, it contrasts your baseline sequence against a legume-enriched Nutrient-Cycling rotation and a low-water Climate-Resilient sequence across 13 agronomic criteria.
            </p>

            <div className="space-y-3 text-sm">
              <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E2DDD3]">
                <span className="font-semibold text-[#6B4F35]">Strategy A — Existing Rotation:</span>{' '}
                <span className="text-[#4B5563]">Baseline Kharif / Rabi / Summer sequence entered by the farmer.</span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#EDF5F0] border border-[#C5DEC9]">
                <span className="font-semibold text-[#1B4332]">Strategy B — Alternative Nutrient-Cycling:</span>{' '}
                <span className="text-[#374151]">Introduces Green Gram, Black Gram, or Cowpea for nitrogen fixation & pest break.</span>
              </div>
              <div className="p-3.5 rounded-lg bg-[#F0F7FA] border border-[#BAE6FD]">
                <span className="font-semibold text-[#0369A1]">Strategy C — Climate-Resilient Rotation:</span>{' '}
                <span className="text-[#374151]">Prioritizes Ragi, Sorghum, Horse Gram & deep-rooting cover against dry spells.</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-xl overflow-hidden border border-[#E2DDD3] aspect-[4/3]">
              <img
                src={rotationPatchworkImg}
                alt="Strip intercropping of finger millet ragi and groundnut legumes on red soil in Karnataka"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* AI/ML, Benefits & Workflow */}
      <section className="max-w-7xl mx-auto px-6 py-16 space-y-14">
        {/* AI & ML Transparency */}
        <div className="bg-[#1B4332] text-white rounded-2xl p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="text-xs font-mono text-[#A7F3D0]">04. TRANSPARENT AI & MACHINE LEARNING ARCHITECTURE</div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold [text-wrap:balance]">
              Scientific rules calculate the agronomy; AI translates it into plain language.
            </h2>
            <p className="text-sm text-white/85 leading-relaxed">
              Our modular FastAPI machine-learning service separates Climate Risk Assessment, Crop Suitability, and Multi-Criteria Rotation Evaluation from Gemini plain-language explanations—preserving model versions, data gaps, and uncertainty without inventing fake accuracy scores.
            </p>
          </div>
          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white/10 border border-white/15 rounded-xl p-4">
              <div className="font-semibold">Model 1: Climate Risk</div>
              <p className="text-white/75 mt-1">Dry-spell duration, heat stress (&gt;35 °C) & moisture anomaly tracking.</p>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl p-4">
              <div className="font-semibold">Model 2: Crop Suitability</div>
              <p className="text-white/75 mt-1">Matches soil pH, texture & water availability with uncertainty flags.</p>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl p-4">
              <div className="font-semibold">Model 3: Rotation MCDA</div>
              <p className="text-white/75 mt-1">Weighted multi-criteria scoring aligned to ranked farmer priorities.</p>
            </div>
            <div className="bg-white/10 border border-white/15 rounded-xl p-4">
              <div className="font-semibold">Gemini Explainability</div>
              <p className="text-white/75 mt-1">Server-side natural-language summaries in English and Kannada.</p>
            </div>
          </div>
        </div>

        {/* Farmer vs Researcher Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-[#E2DDD3] rounded-xl p-7 space-y-4">
            <div className="flex items-center gap-2.5 text-[#1B4332]">
              <Sprout className="w-5 h-5" />
              <h3 className="text-lg font-display font-bold">For Karnataka Farmers</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-[#374151] list-disc pl-5">
              <li>Simple seasonal overview of rainfall, soil moisture, and heat exposure without jargon.</li>
              <li>Interactive rotation explorer that respects your irrigation, labor, budget, and fodder needs.</li>
              <li>Bilingual English and Kannada interface with printable advisory dossiers for KVK discussions.</li>
              <li>Full control to accept, modify, or reject rotation recommendations.</li>
            </ul>
          </div>

          <div className="bg-white border border-[#E2DDD3] rounded-xl p-7 space-y-4">
            <div className="flex items-center gap-2.5 text-[#6B4F35]">
              <Database className="w-5 h-5" />
              <h3 className="text-lg font-display font-bold">For Agricultural Researchers</h3>
            </div>
            <ul className="space-y-2.5 text-sm text-[#374151] list-disc pl-5">
              <li>Multi-farm comparison across Mandya, Dharwad, Tumakuru, Hassan, and Belagavi belts.</li>
              <li>Multi-resolution time-series inspection with explicit cloud-mask gap preservation.</li>
              <li>Maintainable Karnataka crop characteristics catalog and CSV/report dataset downloads.</li>
              <li>Model validation, uncertainty auditing, and reproducible prediction logs.</li>
            </ul>
          </div>
        </div>

        {/* How Field Shift Works */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-[#1B4332]">05. How Field Shift Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                step: '01. Locate Farm',
                icon: MapPin,
                desc: 'Pin coordinates in your Karnataka district and taluk via GPS, map click, or manual entry.',
              },
              {
                step: '02. Add Soil & Goals',
                icon: Layers,
                desc: 'Enter Soil Health Card values with source provenance and rank your top farming priorities.',
              },
              {
                step: '03. Fuse NASA Data',
                icon: Satellite,
                desc: 'Review seasonal rainfall, SMAP moisture, NDVI, and thermal indicators with resolution context.',
              },
              {
                step: '04. Compare & Review',
                icon: Compass,
                desc: 'Explore Strategy A, B, and C trade-offs and export a report for local KVK agronomist review.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="bg-white border border-[#E2DDD3] rounded-xl p-5 space-y-2.5">
                  <Icon className="w-5 h-5 text-[#2D6A4F]" />
                  <h3 className="text-sm font-semibold text-[#1B4332]">{item.step}</h3>
                  <p className="text-xs text-[#4B5563] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-[#E2DDD3]">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6 text-xs text-[#526058]">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2 font-display font-bold text-sm text-[#1B4332]">
              <ShieldCheck className="w-4 h-4" />
              <span>FIELD SHIFT – Adapting Farms with NASA Data</span>
            </div>
            <p>
              NASA Earth Observation Attribution: Architecture prepared for NASA SMAP (NSIDC), GPM IMERG (GES DISC), ECOSTRESS & MODIS (LP DAAC), Landsat 8/9 (USGS/NASA), POWER (LaRC), GRACE-FO (PO.DAAC), and SRTM. Stage 1 uses clearly labelled demonstration reference series.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-medium text-[#1B4332]">
            <button type="button" onClick={() => onNavigate('about')} className="hover:underline cursor-pointer">
              About Field Shift
            </button>
            <button type="button" onClick={() => onNavigate('nasa-sources')} className="hover:underline cursor-pointer">
              NASA Data Sources
            </button>
            <button type="button" onClick={() => onNavigate('login')} className="hover:underline cursor-pointer">
              Login
            </button>
            <button type="button" onClick={() => onNavigate('register')} className="hover:underline cursor-pointer">
              Register
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
