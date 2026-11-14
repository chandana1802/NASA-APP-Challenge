import React, { useState } from 'react';
import { Plus, Search, Sprout } from 'lucide-react';
import type { CropCharacteristic, SeasonName, SoilType } from '../types/fieldShift';

interface CropCatalogViewProps {
  crops: CropCharacteristic[];
  canEdit: boolean;
  onAddCrop?: (crop: CropCharacteristic) => void;
}

export const CropCatalogView: React.FC<CropCatalogViewProps> = ({
  crops,
  canEdit,
  onAddCrop,
}) => {
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<'All' | SeasonName>('All');
  const [nFixingOnly, setNFixingOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Add crop form
  const [cropName, setCropName] = useState('');
  const [scientificName, setScientificName] = useState('');
  const [kannadaName, setKannadaName] = useState('');
  const [duration, setDuration] = useState('90');
  const [waterReq, setWaterReq] = useState<CropCharacteristic['waterRequirement']>('Low');
  const [nFix, setNFix] = useState(false);
  const [pestNote, setPestNote] = useState('');

  const filtered = crops.filter((c) => {
    const matchesSearch =
      c.cropName.toLowerCase().includes(search.toLowerCase()) ||
      c.scientificName.toLowerCase().includes(search.toLowerCase()) ||
      c.kannadaName.toLowerCase().includes(search.toLowerCase());
    const matchesSeason = seasonFilter === 'All' || c.growingSeasons.includes(seasonFilter);
    const matchesN = !nFixingOnly || c.nitrogenFixing;
    return matchesSearch && matchesSeason && matchesN;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropName.trim() || !onAddCrop) return;
    const newCrop: CropCharacteristic = {
      id: cropName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      cropName: cropName.trim(),
      kannadaName: kannadaName.trim() || cropName.trim(),
      scientificName: scientificName.trim() || 'Species pending verification',
      growingSeasons: ['Kharif', 'Rabi'],
      growingDurationDays: Number(duration) || 90,
      waterRequirement: waterReq,
      waterNeedMmRange: waterReq === 'Low' ? '300–450 mm' : '500–700 mm',
      rootingDepth: 'Medium (30–60 cm)',
      nitrogenFixing: nFix,
      nitrogenContributionKgHa: nFix ? '+25 to 35 kg N/ha' : '0',
      nutrientRequirements: 'Standard NPK per local UAS package',
      soilSuitability: ['Red soil', 'Loamy soil'] as SoilType[],
      droughtTolerance: waterReq === 'Low' ? 'High' : 'Moderate',
      heatTolerance: 'Moderate',
      erosionProtection: 'Moderate',
      organicMatterContribution: 'Moderate',
      pestConsiderations: pestNote.trim() || 'Monitor per district KVK advisory.',
      marketSuitability: 'Local & Regional',
      foragePotential: 'Moderate',
      botanicalFamily: nFix ? 'Fabaceae' : 'Poaceae',
      referenceSource: 'Researcher / Admin Workspace Entry',
    };
    onAddCrop(newCrop);
    setCropName('');
    setScientificName('');
    setKannadaName('');
    setPestNote('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B4332] flex items-center gap-2">
            <Sprout className="w-4 h-4 text-[#2D6A4F]" />
            <span>Karnataka Validated Crop Characteristics Database</span>
          </h2>
          <p className="text-xs text-[#526058] mt-1">
            Agronomic reference values grounded in ICAR & UAS Bengaluru/Dharwad/Raichur crop packages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search crop or botanical name..."
              className="pl-8 pr-3 py-1.5 text-xs border border-[#D4CEC3] rounded-lg bg-[#FAF9F6] w-56 focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value as 'All' | SeasonName)}
            className="px-2.5 py-1.5 text-xs border border-[#D4CEC3] rounded-lg bg-[#FAF9F6]"
          >
            <option value="All">All Seasons</option>
            <option value="Kharif">Kharif</option>
            <option value="Rabi">Rabi</option>
            <option value="Summer">Summer</option>
          </select>

          <label className="inline-flex items-center gap-1.5 text-xs text-[#374151] px-2.5 py-1.5 border border-[#D4CEC3] rounded-lg bg-[#FAF9F6] cursor-pointer">
            <input
              type="checkbox"
              checked={nFixingOnly}
              onChange={(e) => setNFixingOnly(e.target.checked)}
              className="rounded text-[#2D6A4F]"
            />
            <span>N-Fixing Legumes</span>
          </label>

          {canEdit && onAddCrop && (
            <button
              type="button"
              onClick={() => setShowAddModal((p) => !p)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Validated Crop</span>
            </button>
          )}
        </div>
      </div>

      {showAddModal && canEdit && (
        <form onSubmit={handleAddSubmit} className="bg-white border border-[#C9D6CE] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#1B4332]">Add Crop Entry to Catalog</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <input
              required
              placeholder="Crop Name (e.g., Foxtail Millet)"
              value={cropName}
              onChange={(e) => setCropName(e.target.value)}
              className="px-3 py-2 border border-[#D4CEC3] rounded-lg"
            />
            <input
              placeholder="Kannada Name (e.g., ನವಣೆ)"
              value={kannadaName}
              onChange={(e) => setKannadaName(e.target.value)}
              className="px-3 py-2 border border-[#D4CEC3] rounded-lg"
            />
            <input
              placeholder="Scientific Name (e.g., Setaria italica)"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              className="px-3 py-2 border border-[#D4CEC3] rounded-lg"
            />
            <input
              type="number"
              min="40"
              max="365"
              placeholder="Duration (days)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="px-3 py-2 border border-[#D4CEC3] rounded-lg font-mono"
            />
            <select
              value={waterReq}
              onChange={(e) => setWaterReq(e.target.value as CropCharacteristic['waterRequirement'])}
              className="px-3 py-2 border border-[#D4CEC3] rounded-lg"
            >
              <option value="Low">Low Water Need</option>
              <option value="Moderate">Moderate Water Need</option>
              <option value="High">High Water Need</option>
              <option value="Very High">Very High Water Need</option>
            </select>
            <label className="inline-flex items-center gap-2 px-3 py-2 border border-[#D4CEC3] rounded-lg">
              <input type="checkbox" checked={nFix} onChange={(e) => setNFix(e.target.checked)} />
              <span>Nitrogen-Fixing</span>
            </label>
            <input
              placeholder="Pest & disease considerations"
              value={pestNote}
              onChange={(e) => setPestNote(e.target.value)}
              className="sm:col-span-2 px-3 py-2 border border-[#D4CEC3] rounded-lg"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#D4CEC3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#1B4332] text-white"
            >
              Save Crop
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#E2DDD3] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#FAF9F6] border-b border-[#E2DDD3] text-[#526058]">
              <tr>
                <th className="py-3 px-4">Crop & Scientific Name</th>
                <th className="py-3 px-3">Seasons</th>
                <th className="py-3 px-3 text-right">Duration</th>
                <th className="py-3 px-3">Water Need</th>
                <th className="py-3 px-3">Rooting</th>
                <th className="py-3 px-3">N-Fixation</th>
                <th className="py-3 px-3">Drought / Heat</th>
                <th className="py-3 px-3">Soil Suitability</th>
                <th className="py-3 px-4">Pest & Market Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFECE6]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-[#FAF9F6]">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#1A241E]">{c.cropName}</div>
                    <div className="text-[11px] text-[#526058]">
                      {c.kannadaName} · <em>{c.scientificName}</em>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[#374151]">{c.growingSeasons.join(', ')}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">{c.growingDurationDays} d</td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-[#1A241E]">{c.waterRequirement}</div>
                    <div className="text-[11px] text-[#6B7280]">{c.waterNeedMmRange}</div>
                  </td>
                  <td className="py-3 px-3 text-[#374151]">{c.rootingDepth}</td>
                  <td className="py-3 px-3">
                    <div className={c.nitrogenFixing ? 'font-semibold text-[#166534]' : 'text-[#6B7280]'}>
                      {c.nitrogenFixing ? 'Yes (Legume)' : 'No'}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">{c.nitrogenContributionKgHa}</div>
                  </td>
                  <td className="py-3 px-3 text-[#374151]">
                    Drought: {c.droughtTolerance}
                    <br />
                    Heat: {c.heatTolerance}
                  </td>
                  <td className="py-3 px-3 text-[#374151] max-w-[160px]">{c.soilSuitability.join(', ')}</td>
                  <td className="py-3 px-4 text-[#4B5563] max-w-[240px]">
                    <div>{c.pestConsiderations}</div>
                    <div className="text-[11px] text-[#2D6A4F] mt-1">
                      Market: {c.marketSuitability} · Forage: {c.foragePotential}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-[#6B7280]">
                    No crops match your current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
