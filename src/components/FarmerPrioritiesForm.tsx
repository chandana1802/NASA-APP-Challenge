import React, { useEffect, useState } from 'react';
import { CheckCircle2, SlidersHorizontal } from 'lucide-react';
import type { Farm, FarmerPriorities, SeasonName } from '../types/fieldShift';

interface FarmerPrioritiesFormProps {
  farm: Farm;
  priorities: FarmerPriorities;
  onSavePriorities: (updated: FarmerPriorities) => void;
}

const PRIORITY_FIELDS: Array<{
  key: keyof Omit<FarmerPriorities, 'farmId' | 'constraints'>;
  label: string;
  desc: string;
}> = [
  { key: 'waterConservation', label: 'Water Conservation', desc: 'Lower seasonal irrigation & dry-spell exposure' },
  { key: 'soilFertility', label: 'Improving Soil Fertility', desc: 'Nitrogen fixation & balanced nutrient replenishment' },
  { key: 'organicMatter', label: 'Increasing Organic Matter', desc: 'Crop residue return & biomass carbon building' },
  { key: 'erosionControl', label: 'Reducing Soil Erosion', desc: 'Canopy ground cover & root anchoring during monsoon' },
  { key: 'cropDiversity', label: 'Improving Crop Diversity', desc: 'Multi-family sequences across cereals, pulses & oilseeds' },
  { key: 'pestRiskReduction', label: 'Reducing Pest & Disease Risk', desc: 'Breaking continuous monoculture pest life cycles' },
  { key: 'farmIncome', label: 'Increasing Farm Income Stability', desc: 'Commercial demand & diversified seasonal harvest' },
  { key: 'forageProduction', label: 'Forage / Fodder Production', desc: 'Stalk & haulm yield for dairy livestock' },
  { key: 'climateResilience', label: 'Climate Resilience', desc: 'Heat & drought tolerance against anomalous seasons' },
  { key: 'marketSuitability', label: 'Local Market Suitability', desc: 'Alignment with APMC mandi, MSP, or FPO procurement' },
];

export const FarmerPrioritiesForm: React.FC<FarmerPrioritiesFormProps> = ({
  farm,
  priorities,
  onSavePriorities,
}) => {
  const [form, setForm] = useState<FarmerPriorities>(priorities);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setForm(priorities);
    setSavedNotice(false);
  }, [priorities]);

  const toggleSeason = (season: SeasonName) => {
    const current = form.constraints.preferredSeasons;
    const exists = current.includes(season);
    const next = exists
      ? current.length > 1
        ? current.filter((s) => s !== season)
        : current
      : [...current, season];
    setForm({
      ...form,
      constraints: {
        ...form.constraints,
        preferredSeasons: next,
      },
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSavePriorities(form);
    setSavedNotice(true);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#1B4332]">
            Farmer Priorities & Operational Constraints — {farm.farmName}
          </h2>
          <p className="text-xs text-[#526058] mt-1">
            Weight your goals from 1 (Low) to 5 (Critical). The Crop Rotation Explorer dynamically recalculates strategy scores from these weights.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-[#2D6A4F] font-medium">
          <SlidersHorizontal className="w-4 h-4" />
          <span>Multi-Criteria Weights</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {savedNotice && (
          <div className="text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-4 py-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Priorities saved. Open the Crop Rotation Explorer to inspect updated strategy rankings.</span>
          </div>
        )}

        <div className="bg-white border border-[#E2DDD3] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[#1B4332] mb-4">
            01. Rank Rotation Priorities (1 = Optional · 5 = Highest Priority)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {PRIORITY_FIELDS.map((item) => {
              const value = form[item.key];
              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-sm font-medium text-[#1A241E]">{item.label}</label>
                    <span className="text-xs font-mono tabular-nums font-semibold text-[#1B4332]">
                      {value} / 5
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={value}
                    onChange={(e) => setForm({ ...form, [item.key]: Number(e.target.value) })}
                    className="w-full accent-[#2D6A4F] cursor-pointer"
                  />
                  <p className="text-xs text-[#6B7280]">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-semibold text-[#1B4332]">
            02. Farm Operational Constraints & Crop Commitments
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">Available Irrigation</label>
              <select
                value={form.constraints.irrigationAvailable}
                onChange={(e) =>
                  setForm({
                    ...form,
                    constraints: {
                      ...form.constraints,
                      irrigationAvailable: e.target.value as FarmerPriorities['constraints']['irrigationAvailable'],
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white"
              >
                <option value="None (Rainfed)">None (Rainfed)</option>
                <option value="Supplemental Tank/Borewell">Supplemental Tank/Borewell</option>
                <option value="Full Canal/Drip">Full Canal/Drip</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">Farm Equipment Access</label>
              <select
                value={form.constraints.equipmentAccess}
                onChange={(e) =>
                  setForm({
                    ...form,
                    constraints: {
                      ...form.constraints,
                      equipmentAccess: e.target.value as FarmerPriorities['constraints']['equipmentAccess'],
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white"
              >
                <option value="Manual / Bullocks">Manual / Bullocks</option>
                <option value="Shared Tractor">Shared Tractor</option>
                <option value="Full Mechanization">Full Mechanization</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">Labor Availability</label>
              <select
                value={form.constraints.laborAvailability}
                onChange={(e) =>
                  setForm({
                    ...form,
                    constraints: {
                      ...form.constraints,
                      laborAvailability: e.target.value as FarmerPriorities['constraints']['laborAvailability'],
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white"
              >
                <option value="Limited">Limited</option>
                <option value="Moderate">Moderate</option>
                <option value="Adequate">Adequate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">Input Budget</label>
              <select
                value={form.constraints.budgetLevel}
                onChange={(e) =>
                  setForm({
                    ...form,
                    constraints: {
                      ...form.constraints,
                      budgetLevel: e.target.value as FarmerPriorities['constraints']['budgetLevel'],
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white"
              >
                <option value="Low Input">Low Input</option>
                <option value="Moderate">Moderate</option>
                <option value="Flexible">Flexible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">Market Access</label>
              <select
                value={form.constraints.marketAccess}
                onChange={(e) =>
                  setForm({
                    ...form,
                    constraints: {
                      ...form.constraints,
                      marketAccess: e.target.value as FarmerPriorities['constraints']['marketAccess'],
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white"
              >
                <option value="Local Weekly Shandy">Local Weekly Shandy</option>
                <option value="APMC Mandi (<25 km)">APMC Mandi (&lt;25 km)</option>
                <option value="Contract / FPO Channel">Contract / FPO Channel</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1.5">Preferred Growing Seasons</label>
              <div className="flex gap-2 pt-1">
                {(['Kharif', 'Rabi', 'Summer'] as SeasonName[]).map((s) => {
                  const active = form.constraints.preferredSeasons.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSeason(s)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        active
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-[#F6F4EF] text-[#374151] border-[#D4CEC3]'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">
              Existing Crop Commitments or Household Food/Fodder Needs
            </label>
            <input
              type="text"
              value={form.constraints.existingCommitments}
              onChange={(e) =>
                setForm({
                  ...form,
                  constraints: { ...form.constraints, existingCommitments: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] transition-colors whitespace-nowrap shrink-0"
            >
              Save Priorities & Recalculate
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
