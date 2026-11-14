import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, FileUp, FlaskConical } from 'lucide-react';
import type { Farm, SoilDataSource, SoilProfile, SoilType } from '../types/fieldShift';

interface SoilProfileFormProps {
  farm: Farm;
  soilProfile: SoilProfile;
  onSaveSoilProfile: (updated: SoilProfile, reportFile?: File) => void;
}

const SOIL_TYPES: SoilType[] = [
  'Red soil',
  'Black soil',
  'Alluvial soil',
  'Lateritic soil',
  'Sandy soil',
  'Clay soil',
  'Loamy soil',
];

const DATA_SOURCES: SoilDataSource[] = [
  'Laboratory soil test',
  'Farmer-entered information',
  'Government or research database',
  'Model-derived estimate',
];

export const SoilProfileForm: React.FC<SoilProfileFormProps> = ({
  farm,
  soilProfile,
  onSaveSoilProfile,
}) => {
  const [form, setForm] = useState<SoilProfile>(soilProfile);
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    setForm(soilProfile);
    setSelectedFile(undefined);
    setError(null);
    setSavedMsg(null);
  }, [soilProfile]);

  const missingMetrics = [
    form.ph === null ? 'Soil pH' : null,
    form.nitrogenKgHa === null ? 'Available Nitrogen (kg/ha)' : null,
    form.phosphorusKgHa === null ? 'Available Phosphorus (kg/ha)' : null,
    form.potassiumKgHa === null ? 'Available Potassium (kg/ha)' : null,
    form.organicCarbonPct === null ? 'Organic Carbon (%)' : null,
    !form.soilTestDate ? 'Laboratory Test Date' : null,
  ].filter(Boolean) as string[];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setFileError('Invalid file type. Only PDF, JPG, or PNG soil reports are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File exceeds 5 MB limit for private soil-reports bucket.');
      return;
    }

    setSelectedFile(file);
    setForm((prev) => ({
      ...prev,
      uploadedReportName: file.name,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMsg(null);

    if (form.ph !== null && (form.ph < 3.5 || form.ph > 10.0)) {
      setError('Soil pH must be between 3.5 and 10.0.');
      return;
    }
    if (form.organicCarbonPct !== null && (form.organicCarbonPct < 0 || form.organicCarbonPct > 10)) {
      setError('Organic Carbon (%) must be between 0 and 10%.');
      return;
    }
    if (!form.soilTexture.trim()) {
      setError('Please specify a soil texture description.');
      return;
    }

    onSaveSoilProfile(form, selectedFile);
    setSavedMsg(
      'Soil profile saved. Rotation comparisons and uncertainty flags have been updated.'
    );
  };

  const parseNullableNumber = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const num = Number(raw);
    return Number.isNaN(num) ? null : num;
  };

  return (
    <div className="space-y-6">
      {/* Header & Scientific Guardrail */}
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1B4332]">
            Local Soil Profile — {farm.farmName}
          </h2>
          <p className="text-xs text-[#526058] mt-1">
            {farm.taluk}, {farm.district} · Missing soil fields are kept explicitly blank and flagged in uncertainty rather than invented.
          </p>
        </div>
        <div className="text-xs font-medium text-[#6B4F35] bg-[#FAF6EE] border border-[#E6DBC7] rounded-lg px-3 py-2">
          Provenance: {form.source} {form.soilTestDate ? `· Tested ${form.soilTestDate}` : '· No test date recorded'}
        </div>
      </div>

      {/* Missing Data Notice */}
      {missingMetrics.length > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
          <div className="text-xs text-[#92400E] space-y-1">
            <div className="font-semibold">
              Soil Information Gaps Detected ({missingMetrics.length} fields unmeasured)
            </div>
            <p>
              Unrecorded fields: {missingMetrics.join(', ')}. Field Shift never substitutes missing laboratory tests as measured ground truth and lowers crop suitability confidence accordingly.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-6">
        {error && (
          <div className="text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5">
            {error}
          </div>
        )}
        {savedMsg && (
          <div className="text-xs text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3.5 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Soil Type *</label>
            <select
              value={form.soilType}
              onChange={(e) => setForm({ ...form, soilType: e.target.value as SoilType })}
              className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            >
              {SOIL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Data Source Provenance *</label>
            <select
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as SoilDataSource })}
              className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            >
              {DATA_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Soil Test Date</label>
            <input
              type="date"
              value={form.soilTestDate ?? ''}
              onChange={(e) => setForm({ ...form, soilTestDate: e.target.value || null })}
              className="w-full px-3 py-2 text-sm font-mono border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Soil pH (leave blank if unknown)</label>
            <input
              type="number"
              step="0.1"
              min="3.5"
              max="10.0"
              value={form.ph ?? ''}
              onChange={(e) => setForm({ ...form, ph: parseNullableNumber(e.target.value) })}
              placeholder="e.g. 6.8"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Nitrogen N (kg/ha)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={form.nitrogenKgHa ?? ''}
              onChange={(e) => setForm({ ...form, nitrogenKgHa: parseNullableNumber(e.target.value) })}
              placeholder="Unmeasured"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Phosphorus P (kg/ha)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={form.phosphorusKgHa ?? ''}
              onChange={(e) => setForm({ ...form, phosphorusKgHa: parseNullableNumber(e.target.value) })}
              placeholder="Unmeasured"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Potassium K (kg/ha)</label>
            <input
              type="number"
              step="1"
              min="0"
              value={form.potassiumKgHa ?? ''}
              onChange={(e) => setForm({ ...form, potassiumKgHa: parseNullableNumber(e.target.value) })}
              placeholder="Unmeasured"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Organic Carbon (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={form.organicCarbonPct ?? ''}
              onChange={(e) => setForm({ ...form, organicCarbonPct: parseNullableNumber(e.target.value) })}
              placeholder="e.g. 0.45"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Soil Texture *</label>
            <input
              type="text"
              value={form.soilTexture}
              onChange={(e) => setForm({ ...form, soilTexture: e.target.value })}
              placeholder="e.g., Sandy clay loam"
              className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Soil Depth (cm)</label>
            <input
              type="number"
              step="5"
              min="10"
              max="300"
              value={form.soilDepthCm ?? ''}
              onChange={(e) => setForm({ ...form, soilDepthCm: parseNullableNumber(e.target.value) })}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Water Availability *</label>
            <select
              value={form.waterAvailability}
              onChange={(e) =>
                setForm({
                  ...form,
                  waterAvailability: e.target.value as SoilProfile['waterAvailability'],
                })
              }
              className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            >
              <option value="Rainfed only">Rainfed only</option>
              <option value="Limited borewell/tank">Limited borewell/tank</option>
              <option value="Canal / reliable irrigation">Canal / reliable irrigation</option>
              <option value="Drip / micro-irrigation">Drip / micro-irrigation</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Irrigation Type</label>
            <input
              type="text"
              value={form.irrigationType}
              onChange={(e) => setForm({ ...form, irrigationType: e.target.value })}
              placeholder="e.g., Protective drip / Rainfed"
              className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
        </div>

        {/* File Upload (Supabase Storage soil-reports ready) */}
        <div className="border-t border-[#EFECE6] pt-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">
              Upload Laboratory Soil Health Card (PDF / JPG / PNG, max 5 MB)
            </label>
            <label className="flex items-center justify-between gap-3 px-4 py-3 border border-dashed border-[#B7C4BC] rounded-lg bg-[#FAF9F6] hover:bg-[#F3EFE6] cursor-pointer transition-colors">
              <div className="flex items-center gap-2.5 text-xs text-[#374151]">
                <FileUp className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                <span className="truncate max-w-[260px]">
                  {form.uploadedReportName || 'Select Soil Health Card file (staged for Supabase Storage)'}
                </span>
              </div>
              <span className="text-xs font-semibold text-[#1B4332] shrink-0">Browse</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>
            {fileError && <p className="text-xs text-[#991B1B] mt-1.5">{fileError}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#374151] mb-1.5">Field & Soil Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Document drainage, salinity patches, crusting, or previous organic amendments..."
              className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#EFECE6]">
          <div className="flex items-center gap-2 text-xs text-[#526058]">
            <FlaskConical className="w-4 h-4 text-[#2D6A4F]" />
            <span>Private bucket target: <code className="font-mono">soil-reports</code> (Stage 2 RLS signed URLs)</span>
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] transition-colors whitespace-nowrap shrink-0"
          >
            Save Soil Profile
          </button>
        </div>
      </form>
    </div>
  );
};
