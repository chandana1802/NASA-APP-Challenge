import React from 'react';
import { ArrowLeft, Database, ShieldCheck } from 'lucide-react';
import { NASA_DATASETS } from '../data/karnatakaData';
import type { PublicRoute } from './LandingPage';

interface PublicInfoPagesProps {
  page: 'about' | 'nasa-sources';
  onNavigate: (route: PublicRoute) => void;
}

export const PublicInfoPages: React.FC<PublicInfoPagesProps> = ({ page, onNavigate }) => {
  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#1A241E]">
      <header className="bg-white border-b border-[#E2DDD3]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-6">
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#1B4332] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Field Shift</span>
          </button>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => onNavigate('about')}
              className={`cursor-pointer ${page === 'about' ? 'text-[#1B4332] underline' : 'text-[#526058]'}`}
            >
              About Field Shift
            </button>
            <button
              type="button"
              onClick={() => onNavigate('nasa-sources')}
              className={`cursor-pointer ${page === 'nasa-sources' ? 'text-[#1B4332] underline' : 'text-[#526058]'}`}
            >
              NASA Data Sources
            </button>
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="px-3.5 py-1.5 rounded-lg bg-[#1B4332] text-white cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        {page === 'about' ? (
          <>
            <div className="space-y-3 max-w-3xl">
              <div className="text-xs font-semibold text-[#2D6A4F]">2026 NASA Challenge Decision-Support Architecture</div>
              <h1 className="text-3xl font-display font-bold text-[#1B4332]">
                About Field Shift — Scientific & Ethical Guardrails
              </h1>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Field Shift is designed as an explainable, open-science agricultural decision-support tool starting in Karnataka, India. It assists farmers and researchers in evaluating multi-season crop rotations rather than replacing local agronomic judgment.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-[#1B4332]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Scientific Integrity Commitments</span>
                </div>
                <ul className="space-y-2 text-xs text-[#374151] list-disc pl-4">
                  <li>Never fabricate NASA measurements, laboratory soil tests, or untrained ML accuracy claims.</li>
                  <li>Explicitly separate satellite coarse footprints (e.g., SMAP 9 km, GRACE 300 km) from farm-level measurements.</li>
                  <li>Distinguish ECOSTRESS Land Surface Temperature from 2 m air temperature.</li>
                  <li>Preserve missing soil attributes and cloud-masked satellite gaps as transparent uncertainties.</li>
                </ul>
              </div>

              <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-[#6B4F35]">
                  <Database className="w-4 h-4" />
                  <span>Staged Engineering Roadmap</span>
                </div>
                <ul className="space-y-2 text-xs text-[#374151] list-disc pl-4">
                  <li><strong>Stage 1 (Active):</strong> Complete frontend workspace, Karnataka map, MCDA rotation engine, and Supabase SQL/RLS preparation.</li>
                  <li><strong>Stage 2:</strong> Live Supabase Auth, PostgreSQL persistence, and private Storage buckets.</li>
                  <li><strong>Stage 3–4:</strong> Server-side NASA POWER, GPM IMERG, SMAP, MODIS, Landsat, ECOSTRESS & GRACE pipelines.</li>
                  <li><strong>Stage 5–7:</strong> Replit FastAPI ML verification, Gemini explainability proxy, and security audit.</li>
                </ul>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3 max-w-3xl">
              <div className="text-xs font-semibold text-[#2D6A4F]">NASA Earthdata & Open Science Specifications</div>
              <h1 className="text-3xl font-display font-bold text-[#1B4332]">
                NASA Earth Observation Data Sources & Limitations
              </h1>
              <p className="text-sm text-[#4B5563] leading-relaxed">
                Every dataset integrated into Field Shift retains its exact spatial resolution, temporal cadence, units, and physical limitations so coarse regional products are never misrepresented as plot-level sensors.
              </p>
            </div>

            <div className="bg-white border border-[#E2DDD3] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#FAF9F6] border-b border-[#E2DDD3] text-[#526058]">
                    <tr>
                      <th className="py-3 px-4">Dataset & Product</th>
                      <th className="py-3 px-3">Parameter & Unit</th>
                      <th className="py-3 px-3">Spatial / Temporal</th>
                      <th className="py-3 px-3">Server Auth Method</th>
                      <th className="py-3 px-4">Scientific Limitation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFECE6]">
                    {NASA_DATASETS.map((ds) => (
                      <tr key={ds.id} className="align-top">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#1B4332]">{ds.name}</div>
                          <div className="text-[11px] font-mono text-[#526058]">{ds.productName}</div>
                        </td>
                        <td className="py-3 px-3 text-[#374151]">
                          <div>{ds.measures}</div>
                          <div className="text-[11px] font-mono text-[#6B7280] mt-0.5">Unit: {ds.unit}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[#1A241E]">
                          {ds.spatialResolution}
                          <br />
                          <span className="text-[#6B7280]">{ds.temporalResolution}</span>
                        </td>
                        <td className="py-3 px-3 text-[#374151]">{ds.authRequirement}</td>
                        <td className="py-3 px-4 text-[#9A3412] max-w-[260px]">{ds.limitations}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
