import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Check, Info, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { CROP_CATALOG } from '../data/karnatakaData';
import { compareRotationStrategies } from '../services/rotationEngine';
import type {
  Farm,
  FarmDecisionState,
  FarmerPriorities,
  RotationSequenceStep,
  RotationStrategyResult,
  SoilProfile,
} from '../types/fieldShift';

interface RotationExplorerProps {
  farm: Farm;
  soilProfile: SoilProfile;
  priorities: FarmerPriorities;
  existingSequence: RotationSequenceStep[];
  onChangeExistingSequence: (next: RotationSequenceStep[]) => void;
  onUpdatePriorityQuick: (key: 'waterConservation' | 'soilFertility' | 'climateResilience' | 'farmIncome', val: number) => void;
  decisionState: FarmDecisionState;
  onSaveDecision: (decision: FarmDecisionState, strategy?: RotationStrategyResult) => void;
}

export const RotationExplorer: React.FC<RotationExplorerProps> = ({
  farm,
  soilProfile,
  priorities,
  existingSequence,
  onChangeExistingSequence,
  onUpdatePriorityQuick,
  decisionState,
  onSaveDecision,
}) => {
  const [selectedStrategyInspect, setSelectedStrategyInspect] = useState<'strategy_a' | 'strategy_b' | 'strategy_c'>('strategy_b');
  const [farmerNoteInput, setFarmerNoteInput] = useState(decisionState.farmerNote ?? '');

  const strategies = useMemo(
    () => compareRotationStrategies(farm, soilProfile, priorities, existingSequence),
    [farm, soilProfile, priorities, existingSequence]
  );

  const handleCropChange = (idx: number, cropId: string) => {
    const crop = CROP_CATALOG.find((c) => c.id === cropId);
    if (!crop) return;
    const next = existingSequence.map((step, i) =>
      i === idx
        ? {
            ...step,
            cropId: crop.id,
            cropName: crop.cropName,
            kannadaName: crop.kannadaName,
            purposeNote: 'User-entered baseline crop',
          }
        : step
    );
    onChangeExistingSequence(next);
  };

  const radarData = [
    {
      criterion: 'Water Efficiency',
      A: strategies[0].scores.waterEfficiency,
      B: strategies[1].scores.waterEfficiency,
      C: strategies[2].scores.waterEfficiency,
    },
    {
      criterion: 'Nutrient Cycling',
      A: strategies[0].scores.nutrientCycling,
      B: strategies[1].scores.nutrientCycling,
      C: strategies[2].scores.nutrientCycling,
    },
    {
      criterion: 'Nitrogen Fixation',
      A: strategies[0].scores.nitrogenContribution,
      B: strategies[1].scores.nitrogenContribution,
      C: strategies[2].scores.nitrogenContribution,
    },
    {
      criterion: 'Erosion Control',
      A: strategies[0].scores.erosionReduction,
      B: strategies[1].scores.erosionReduction,
      C: strategies[2].scores.erosionReduction,
    },
    {
      criterion: 'Pest Disruption',
      A: strategies[0].scores.pestCycleDisruption,
      B: strategies[1].scores.pestCycleDisruption,
      C: strategies[2].scores.pestCycleDisruption,
    },
    {
      criterion: 'Drought Resilience',
      A: strategies[0].scores.droughtResilience,
      B: strategies[1].scores.droughtResilience,
      C: strategies[2].scores.droughtResilience,
    },
  ];

  const barData = [
    { metric: 'Water Eff.', A: strategies[0].scores.waterEfficiency, B: strategies[1].scores.waterEfficiency, C: strategies[2].scores.waterEfficiency },
    { metric: 'Organic Matter', A: strategies[0].scores.organicMatter, B: strategies[1].scores.organicMatter, C: strategies[2].scores.organicMatter },
    { metric: 'Root Diversity', A: strategies[0].scores.rootingDiversity, B: strategies[1].scores.rootingDiversity, C: strategies[2].scores.rootingDiversity },
    { metric: 'Heat Resilience', A: strategies[0].scores.heatResilience, B: strategies[1].scores.heatResilience, C: strategies[2].scores.heatResilience },
    { metric: 'Market Fit', A: strategies[0].scores.marketSuitability, B: strategies[1].scores.marketSuitability, C: strategies[2].scores.marketSuitability },
    { metric: 'Priority Match', A: strategies[0].scores.priorityAlignment, B: strategies[1].scores.priorityAlignment, C: strategies[2].scores.priorityAlignment },
  ];

  const activeInspect = strategies.find((s) => s.id === selectedStrategyInspect) ?? strategies[1];

  return (
    <div className="space-y-6">
      {/* Top Configuration Strip: Baseline Strategy A + Quick Priority Tuning */}
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-5 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-[#EFECE6] pb-4">
          <div>
            <h2 className="text-lg font-semibold text-[#1B4332]">
              Explainable Crop Rotation Explorer — {farm.farmName}
            </h2>
            <p className="text-xs text-[#526058] mt-1">
              Edit your baseline rotation (Strategy A) or adjust priority weights to compare trade-offs across Nutrient-Cycling and Climate-Resilient strategies.
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums text-[#4B5563]">
            MCDA Engine v1.0 · Confidence: {strategies[0].confidenceLevel}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Edit Baseline Strategy A */}
          <div className="xl:col-span-7 space-y-3">
            <div className="text-xs font-semibold text-[#1B4332]">
              Configure Strategy A (Your Existing Baseline Crop Sequence)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {existingSequence.map((step, idx) => (
                <div key={step.season} className="bg-[#FAF9F6] border border-[#E2DDD3] rounded-lg p-3">
                  <div className="text-[11px] font-mono text-[#6B4F35] mb-1">
                    Year {step.year} · {step.season}
                  </div>
                  <select
                    value={step.cropId}
                    onChange={(e) => handleCropChange(idx, e.target.value)}
                    className="w-full text-sm font-medium text-[#1A241E] bg-white border border-[#D4CEC3] rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                  >
                    {CROP_CATALOG.map((crop) => (
                      <option key={crop.id} value={crop.id}>
                        {crop.cropName}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Priority Sliders */}
          <div className="xl:col-span-5 space-y-3">
            <div className="text-xs font-semibold text-[#1B4332]">
              Live Priority Recalculation (1–5)
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 bg-[#FAF9F6] border border-[#E2DDD3] rounded-lg p-3">
              {(
                [
                  { key: 'waterConservation', label: 'Water Saving' },
                  { key: 'soilFertility', label: 'Soil Fertility' },
                  { key: 'climateResilience', label: 'Climate Resilience' },
                  { key: 'farmIncome', label: 'Income Stability' },
                ] as const
              ).map((p) => (
                <div key={p.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#374151]">{p.label}</span>
                    <span className="font-mono tabular-nums font-semibold text-[#1B4332]">
                      {priorities[p.key]}/5
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={priorities[p.key]}
                    onChange={(e) => onUpdatePriorityQuick(p.key, Number(e.target.value))}
                    className="w-full accent-[#2D6A4F]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3-Strategy Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {strategies.map((strat) => {
          const isInspected = strat.id === selectedStrategyInspect;
          return (
            <div
              key={strat.id}
              className={`bg-white rounded-xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                isInspected ? 'border-[#1B4332] ring-1 ring-[#1B4332]' : 'border-[#E2DDD3]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-[#1B4332]">{strat.label}</h3>
                    <p className="text-xs text-[#526058] mt-0.5">{strat.subtitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-display font-bold tabular-nums text-[#1B4332]">
                      {strat.overallWeightedScore}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">Priority Index / 100</div>
                  </div>
                </div>

                {/* Seasonal Sequence */}
                <div className="divide-y divide-[#EFECE6] border border-[#EFECE6] rounded-lg bg-[#FAF9F6]">
                  {strat.sequence.map((step) => (
                    <div key={`${strat.id}-${step.season}`} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                      <span className="font-mono text-[#6B4F35] shrink-0">{step.season}</span>
                      <div className="text-right">
                        <div className="font-semibold text-[#1A241E]">{step.cropName}</div>
                        <div className="text-[11px] text-[#526058]">{step.purposeNote}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Benefits & Disadvantages */}
                <div className="space-y-2 text-xs">
                  <div>
                    <div className="font-semibold text-[#166534] mb-1">Potential Benefits</div>
                    <ul className="space-y-1 text-[#374151] list-disc pl-4">
                      {strat.potentialBenefits.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="font-semibold text-[#9A3412] mb-1">Trade-offs & Possible Disadvantages</div>
                    <ul className="space-y-1 text-[#4B5563] list-disc pl-4">
                      {strat.possibleDisadvantages.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStrategyInspect(strat.id)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  isInspected
                    ? 'bg-[#1B4332] text-white'
                    : 'bg-[#F6F4EF] text-[#1B4332] border border-[#D4CEC3] hover:bg-[#EAE5DA]'
                }`}
              >
                {isInspected ? 'Inspecting Evidence & Uncertainty' : 'Inspect Evidence & Assumptions'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Comparative Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1B4332]">
              Multi-Criteria Agronomic Trade-Off Profile
            </h3>
            <span className="text-xs text-[#6B7280]">Normalized 0–100 Index</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#E2DDD3" />
                <PolarAngleAxis dataKey="criterion" tick={{ fontSize: 11, fill: '#374151' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="Strategy A (Existing)" dataKey="A" stroke="#6B4F35" fill="#6B4F35" fillOpacity={0.18} />
                <Radar name="Strategy B (Nutrient)" dataKey="B" stroke="#2D6A4F" fill="#2D6A4F" fillOpacity={0.22} />
                <Radar name="Strategy C (Climate)" dataKey="C" stroke="#0284C7" fill="#0284C7" fillOpacity={0.18} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD3] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1B4332]">
              Resilience, Soil Health & Market Comparison
            </h3>
            <span className="text-xs text-[#6B7280]">Weighted to Farmer Priorities</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE6" />
                <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#374151' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="A" name="Strategy A (Existing)" fill="#8C6D4F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="B" name="Strategy B (Nutrient)" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="C" name="Strategy C (Climate)" fill="#0284C7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Explainability, Supporting Evidence, Missing Info & Farmer Decision */}
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#EFECE6] pb-3">
          <div>
            <h3 className="text-base font-semibold text-[#1B4332]">
              Scientific Transparency & Validation — {activeInspect.label}
            </h3>
            <p className="text-xs text-[#526058]">
              Confidence Rating: {activeInspect.confidenceLevel} · No strategy is automatically guaranteed without local verification.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-3">
            <div>
              <div className="font-semibold text-[#1B4332] mb-1 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Supporting NASA Observations (Demo Reference)</span>
              </div>
              <ul className="space-y-1 text-[#374151] list-disc pl-4">
                {activeInspect.supportingNasaObservations.map((obs, idx) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-semibold text-[#1B4332] mb-1">Local Soil Information Used</div>
              <ul className="space-y-1 text-[#374151] list-disc pl-4">
                {activeInspect.soilInfoUsed.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="font-semibold text-[#9A3412] mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Missing Information & Uncertainty</span>
              </div>
              <ul className="space-y-1 text-[#4B5563] list-disc pl-4">
                {activeInspect.missingInformation.map((m, idx) => (
                  <li key={idx}>{m}</li>
                ))}
              </ul>
              <p className="text-[#526058] mt-2">{activeInspect.uncertaintyNote}</p>
            </div>

            <div>
              <div className="font-semibold text-[#1B4332] mb-1">Assumptions & Local Expert Requirement</div>
              <ul className="space-y-1 text-[#374151] list-disc pl-4">
                {activeInspect.assumptions.map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
              <p className="mt-2 font-medium text-[#1B4332] bg-[#EDF5F0] border border-[#C5DEC9] rounded-lg px-3 py-2">
                {activeInspect.expertValidationRequired}
              </p>
            </div>
          </div>
        </div>

        {/* Farmer Decision Control (Accept / Modify / Reject) */}
        <div className="pt-4 border-t border-[#EFECE6] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1 space-y-1">
            <label className="block text-xs font-semibold text-[#1B4332]">
              Farmer Decision & Field Note (Saved for Expert Review)
            </label>
            <input
              type="text"
              value={farmerNoteInput}
              onChange={(e) => setFarmerNoteInput(e.target.value)}
              placeholder="Optional note: e.g., Will consult Maddur RSK on seed availability for Green Gram..."
              className="w-full px-3 py-2 text-xs border border-[#D4CEC3] rounded-lg bg-[#FAF9F6]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() =>
                onSaveDecision(
                  {
                    decision: 'accepted',
                    selectedStrategyId: activeInspect.id,
                    farmerNote: farmerNoteInput,
                  },
                  activeInspect
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Shortlist {activeInspect.id === 'strategy_a' ? 'Strategy A' : activeInspect.id === 'strategy_b' ? 'Strategy B' : 'Strategy C'}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onSaveDecision(
                  {
                    decision: 'modified',
                    selectedStrategyId: activeInspect.id,
                    farmerNote: farmerNoteInput,
                  },
                  activeInspect
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#D4CEC3] bg-white text-[#374151] hover:bg-[#F6F4EF]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Mark Needs Modification</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onSaveDecision(
                  {
                    decision: 'rejected',
                    selectedStrategyId: activeInspect.id,
                    farmerNote: farmerNoteInput,
                  },
                  activeInspect
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] hover:bg-[#FEE2E2]"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject Suggestion</span>
            </button>
          </div>
        </div>

        {decisionState.decision !== 'pending' && (
          <div className="text-xs text-[#1B4332] bg-[#EDF5F0] border border-[#C5DEC9] rounded-lg px-3.5 py-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>
              Recorded Decision: <strong>{decisionState.decision.toUpperCase()}</strong>
              {decisionState.selectedStrategyId ? ` (${decisionState.selectedStrategyId.replace('_', ' ')})` : ''}
              {decisionState.farmerNote ? ` — "${decisionState.farmerNote}"` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
