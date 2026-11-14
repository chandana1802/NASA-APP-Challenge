import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Crosshair, Layers, MapPin, Plus, Calendar } from 'lucide-react';
import { DEMO_NASA_SERIES_BY_FARM, KARNATAKA_DISTRICTS, NASA_DATASETS } from '../data/karnatakaData';
import type { Farm } from '../types/fieldShift';

type EnvLayerKey =
  | 'rainfall'
  | 'soil_moisture'
  | 'vegetation_index'
  | 'land_surface_temp'
  | 'elevation'
  | 'environmental_risk';

interface KarnatakaMapProps {
  farms: Farm[];
  selectedFarmId: string;
  onSelectFarm: (farmId: string) => void;
  onAddFarm?: (farm: Omit<Farm, 'id' | 'createdAt'>) => void;
  allowAddFarm?: boolean;
}

const LAYER_META: Record<
  EnvLayerKey,
  {
    label: string;
    dataset: string;
    resolution: string;
    unit: string;
    legend: string;
    note: string;
  }
> = {
  rainfall: {
    label: 'Rainfall',
    dataset: 'NASA GPM IMERG Final Run',
    resolution: '0.1° (~10 km)',
    unit: 'mm / month',
    legend: 'Low (<30 mm) · Moderate (30–100 mm) · Heavy (>100 mm)',
    note: 'Point-sampled demonstration reference on OpenStreetMap base. Live gridded raster tiles connect in Stage 3.',
  },
  soil_moisture: {
    label: 'Soil Moisture',
    dataset: 'NASA SMAP L3/L4',
    resolution: '9 km grid',
    unit: 'm³/m³',
    legend: 'Dry (<0.18) · Adequate (0.18–0.30) · High (>0.30)',
    note: '9 km satellite footprint reflects regional surface moisture, not plot-level tensiometer readings.',
  },
  vegetation_index: {
    label: 'Vegetation Index',
    dataset: 'NASA MODIS MOD13Q1',
    resolution: '250 m',
    unit: 'NDVI (-0.2 to 1.0)',
    legend: 'Sparse (<0.30) · Developing (0.30–0.55) · Dense (>0.55)',
    note: 'NDVI reflects canopy greenness, not direct crop grain yield.',
  },
  land_surface_temp: {
    label: 'Land Surface Temp',
    dataset: 'NASA ECOSTRESS',
    resolution: '70 m',
    unit: '°C (skin temp)',
    legend: 'Cool (<30 °C) · Warm (30–37 °C) · Heat Stress (>37 °C)',
    note: 'ECOSTRESS measures land surface skin temperature. Cloud-masked months return Unavailable.',
  },
  elevation: {
    label: 'Elevation',
    dataset: 'NASA SRTM GL1',
    resolution: '30 m',
    unit: 'meters ASL',
    legend: '<500 m Lowland · 500–750 m Plateau · >750 m Upland',
    note: 'Static terrain elevation from Shuttle Radar Topography Mission.',
  },
  environmental_risk: {
    label: 'Environmental Risk',
    dataset: 'Combined Demo Indicator',
    resolution: 'Multi-scale',
    unit: 'Low / Moderate / High',
    legend: 'Low (Favorable) · Moderate (Watch) · High (Moisture/Heat Deficit)',
    note: 'Composite dry-spell and surface heat indicator derived from demonstration series.',
  },
};

export const KarnatakaMap: React.FC<KarnatakaMapProps> = ({
  farms,
  selectedFarmId,
  onSelectFarm,
  onAddFarm,
  allowAddFarm = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<EnvLayerKey>('soil_moisture');
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(10); // Nov latest
  const [showAddForm, setShowAddForm] = useState(false);

  // Add Farm Form state
  const [farmName, setFarmName] = useState('');
  const [district, setDistrict] = useState(KARNATAKA_DISTRICTS[0].name);
  const [taluk, setTaluk] = useState(KARNATAKA_DISTRICTS[0].taluks[0].name);
  const [latitude, setLatitude] = useState(String(KARNATAKA_DISTRICTS[0].taluks[0].latitude));
  const [longitude, setLongitude] = useState(String(KARNATAKA_DISTRICTS[0].taluks[0].longitude));
  const [area, setArea] = useState('3.5');
  const [areaUnit, setAreaUnit] = useState<'acres' | 'hectares'>('acres');
  const [shareResearch, setShareResearch] = useState(true);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const selectedDistrictObj = KARNATAKA_DISTRICTS.find((d) => d.name === district) ?? KARNATAKA_DISTRICTS[0];

  const handleDistrictChange = (newDist: string) => {
    setDistrict(newDist);
    const distObj = KARNATAKA_DISTRICTS.find((d) => d.name === newDist);
    if (distObj && distObj.taluks.length > 0) {
      setTaluk(distObj.taluks[0].name);
      setLatitude(String(distObj.taluks[0].latitude));
      setLongitude(String(distObj.taluks[0].longitude));
    }
  };

  const handleTalukChange = (newTaluk: string) => {
    setTaluk(newTaluk);
    const tObj = selectedDistrictObj.taluks.find((t) => t.name === newTaluk);
    if (tObj) {
      setLatitude(String(tObj.latitude));
      setLongitude(String(tObj.longitude));
    }
  };

  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Browser geolocation unavailable; enter coordinates manually or click map.');
      return;
    }
    setGpsStatus('Requesting device GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(5));
        setLongitude(pos.coords.longitude.toFixed(5));
        setGpsStatus(`Captured GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
      },
      () => {
        setGpsStatus('Location permission denied or unavailable. Click the map or enter coordinates manually.');
      },
      { timeout: 6000 }
    );
  };

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) ?? farms[0];
  const sampleSeries = DEMO_NASA_SERIES_BY_FARM[selectedFarm?.id] ?? DEMO_NASA_SERIES_BY_FARM['farm-mandya-1'];
  const activePoint = sampleSeries[selectedMonthIdx] ?? sampleSeries[sampleSeries.length - 1];

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [14.2, 76.1],
      zoom: 7,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = group;

    map.on('click', (e: L.LeafletMouseEvent) => {
      setLatitude(e.latlng.lat.toFixed(5));
      setLongitude(e.latlng.lng.toFixed(5));
      setGpsStatus(`Map point picked: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Update markers, boundaries, and environmental indicator circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    farms.forEach((farm) => {
      const isSelected = farm.id === selectedFarmId;
      const series = DEMO_NASA_SERIES_BY_FARM[farm.id] ?? DEMO_NASA_SERIES_BY_FARM['farm-mandya-1'];
      const pt = series[selectedMonthIdx] ?? series[series.length - 1];

      let layerValueText = '';
      let circleColor = '#2D6A4F';

      if (activeLayer === 'rainfall') {
        layerValueText = pt.rainfallMm !== null ? `${pt.rainfallMm} mm` : 'Unavailable';
        circleColor = (pt.rainfallMm ?? 0) > 100 ? '#1D4ED8' : (pt.rainfallMm ?? 0) > 30 ? '#0284C7' : '#D97706';
      } else if (activeLayer === 'soil_moisture') {
        layerValueText = pt.smapSoilMoistureM3M3 !== null ? `${pt.smapSoilMoistureM3M3} m³/m³` : 'Unavailable';
        circleColor = (pt.smapSoilMoistureM3M3 ?? 0) < 0.18 ? '#DC2626' : (pt.smapSoilMoistureM3M3 ?? 0) < 0.28 ? '#D97706' : '#16A34A';
      } else if (activeLayer === 'vegetation_index') {
        layerValueText = pt.modisNdvi !== null ? `NDVI ${pt.modisNdvi.toFixed(2)}` : 'Unavailable';
        circleColor = (pt.modisNdvi ?? 0) > 0.55 ? '#15803D' : (pt.modisNdvi ?? 0) > 0.35 ? '#65A30D' : '#CA8A04';
      } else if (activeLayer === 'land_surface_temp') {
        layerValueText = pt.ecostressLstC !== null ? `${pt.ecostressLstC} °C LST` : 'Cloud-masked (Unavailable)';
        circleColor = pt.ecostressLstC === null ? '#64748B' : pt.ecostressLstC > 37 ? '#DC2626' : '#EA580C';
      } else if (activeLayer === 'elevation') {
        layerValueText = `${farm.elevationM} m ASL`;
        circleColor = farm.elevationM > 750 ? '#6B4F35' : '#854D0E';
      } else {
        const highRisk = (pt.smapSoilMoistureM3M3 ?? 0.3) < 0.18 || (pt.rainfallMm ?? 50) < 25;
        layerValueText = highRisk ? 'High Dry-Spell Watch' : 'Moderate / Nominal';
        circleColor = highRisk ? '#DC2626' : '#2D6A4F';
      }

      // Regional environmental footprint indicator circle
      L.circle([farm.latitude, farm.longitude], {
        radius: isSelected ? 14000 : 9000,
        color: circleColor,
        weight: isSelected ? 2 : 1,
        fillColor: circleColor,
        fillOpacity: isSelected ? 0.22 : 0.12,
      }).addTo(group);

      // Farm polygon boundary if available
      if (farm.boundaryCoords && farm.boundaryCoords.length > 2) {
        L.polygon(farm.boundaryCoords, {
          color: '#1B4332',
          weight: 2,
          fillColor: '#40916C',
          fillOpacity: 0.3,
        }).addTo(group);
      }

      // Farm marker pin
      const marker = L.circleMarker([farm.latitude, farm.longitude], {
        radius: isSelected ? 9 : 7,
        color: '#FFFFFF',
        weight: 2,
        fillColor: isSelected ? '#1B4332' : '#40916C',
        fillOpacity: 1,
      }).addTo(group);

      marker.bindPopup(
        `<div style="min-width:190px;font-family:Plus Jakarta Sans,sans-serif">
          <div style="font-weight:700;color:#1B4332;font-size:13px">${farm.farmName}</div>
          <div style="font-size:12px;color:#4B5563;margin-top:2px">${farm.taluk}, ${farm.district} (${farm.area} ${farm.areaUnit})</div>
          <div style="font-size:12px;margin-top:6px;padding-top:6px;border-top:1px solid #E5E7EB">
            <strong>${LAYER_META[activeLayer].label}:</strong> ${layerValueText}<br/>
            <span style="color:#6B7280;font-size:11px">Date: ${pt.dateISO} (Demo Ref)</span>
          </div>
        </div>`
      );

      marker.on('click', () => {
        onSelectFarm(farm.id);
      });
    });

    if (selectedFarm) {
      map.panTo([selectedFarm.latitude, selectedFarm.longitude], { animate: true });
    }
  }, [farms, selectedFarmId, activeLayer, selectedMonthIdx, selectedFarm, onSelectFarm]);

  const handleAddFarmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    const areaNum = Number(area);

    if (!farmName.trim() || farmName.trim().length < 3) {
      setFormError('Please enter a farm name (at least 3 characters).');
      return;
    }
    if (Number.isNaN(latNum) || latNum < 11.4 || latNum > 18.6) {
      setFormError('Latitude should fall within Karnataka bounds (11.4° to 18.6° N).');
      return;
    }
    if (Number.isNaN(lonNum) || lonNum < 74.0 || lonNum > 78.6) {
      setFormError('Longitude should fall within Karnataka bounds (74.0° to 78.6° E).');
      return;
    }
    if (Number.isNaN(areaNum) || areaNum <= 0 || areaNum > 5000) {
      setFormError('Please enter a valid farm area greater than 0.');
      return;
    }

    const talukObj = selectedDistrictObj.taluks.find((t) => t.name === taluk);

    onAddFarm?.({
      farmName: farmName.trim(),
      state: 'Karnataka',
      district,
      taluk,
      latitude: latNum,
      longitude: lonNum,
      area: areaNum,
      areaUnit,
      agroClimaticZone: selectedDistrictObj.agroClimaticZone,
      elevationM: talukObj?.elevationM ?? 650,
      shareAnonymizedForResearch: shareResearch,
    });

    setFarmName('');
    setShowAddForm(false);
  };

  const layerInfo = LAYER_META[activeLayer];
  const datasetSpec = NASA_DATASETS.find((d) =>
    activeLayer === 'rainfall'
      ? d.id === 'GPM'
      : activeLayer === 'soil_moisture'
      ? d.id === 'SMAP'
      : activeLayer === 'vegetation_index'
      ? d.id === 'MODIS'
      : activeLayer === 'land_surface_temp'
      ? d.id === 'ECOSTRESS'
      : d.id === 'SRTM'
  );

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white border border-[#E2DDD3] rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1B4332]">
            <Layers className="w-4 h-4" />
            <span>Environmental Layer</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(LAYER_META) as EnvLayerKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveLayer(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  activeLayer === key
                    ? 'bg-[#1B4332] text-white border-[#1B4332]'
                    : 'bg-[#F6F4EF] text-[#374151] border-[#E2DDD3] hover:bg-[#EAE5DA]'
                }`}
              >
                {LAYER_META[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-[#4B5563]">
            <Calendar className="w-3.5 h-3.5 text-[#2D6A4F]" />
            <span>Observation Month</span>
            <select
              value={selectedMonthIdx}
              onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}
              className="bg-[#F6F4EF] border border-[#D4CEC3] rounded-lg px-2.5 py-1.5 text-xs text-[#1A241E] focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
            >
              {sampleSeries.map((pt, idx) => (
                <option key={pt.dateISO} value={idx}>
                  {pt.month} 2026 ({pt.dateISO})
                </option>
              ))}
            </select>
          </label>

          {allowAddFarm && onAddFarm && (
            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#2D6A4F] text-white hover:bg-[#1B4332] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Close Add Farm' : 'Add Farm Location'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Farm Drawer */}
      {showAddForm && allowAddFarm && onAddFarm && (
        <form
          onSubmit={handleAddFarmSubmit}
          className="bg-white border border-[#C9D6CE] rounded-xl p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[#EFECE6] pb-3">
            <div>
              <h3 className="text-base font-semibold text-[#1B4332]">Register New Karnataka Farm</h3>
              <p className="text-xs text-[#526058]">
                Select district & taluk, capture GPS, or click directly on the OpenStreetMap below to set coordinates.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCaptureGps}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F]/5 whitespace-nowrap shrink-0"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Use Device GPS</span>
            </button>
          </div>

          {gpsStatus && (
            <p className="text-xs text-[#2D6A4F] bg-[#EDF5F0] border border-[#C5DEC9] rounded-lg px-3 py-2">
              {gpsStatus}
            </p>
          )}
          {formError && (
            <p className="text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3 py-2">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Farm Name *</label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g., Maddur North Plot"
                className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Karnataka District *</label>
              <select
                value={district}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              >
                {KARNATAKA_DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Taluk *</label>
              <select
                value={taluk}
                onChange={(e) => handleTalukChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
              >
                {selectedDistrictObj.taluks.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Latitude (°N) *</label>
              <input
                type="number"
                step="0.00001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#374151] mb-1">Longitude (°E) *</label>
              <input
                type="number"
                step="0.00001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Area *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Unit</label>
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value as 'acres' | 'hectares')}
                  className="w-full px-3 py-2 text-sm border border-[#D4CEC3] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#2D6A4F]"
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <label className="inline-flex items-center gap-2 text-xs text-[#4B5563]">
              <input
                type="checkbox"
                checked={shareResearch}
                onChange={(e) => setShareResearch(e.target.checked)}
                className="rounded border-[#D4CEC3] text-[#2D6A4F] focus:ring-[#2D6A4F]"
              />
              <span>Allow anonymized soil & rotation data for authorized Karnataka agricultural research</span>
            </label>

            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#1B4332] text-white hover:bg-[#143326] transition-colors whitespace-nowrap shrink-0"
            >
              Save Farm to Workspace
            </button>
          </div>
        </form>
      )}

      {/* Map + Selected Farm Sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-[#E2DDD3] rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-[#EFECE6] flex flex-wrap items-center justify-between gap-2 text-xs text-[#4B5563]">
            <span>
              Interactive Karnataka Map (OpenStreetMap) · {farms.length} Farm Plots Shown
            </span>
            <span className="font-mono tabular-nums">
              Active Layer: {layerInfo.dataset} ({layerInfo.resolution})
            </span>
          </div>
          <div ref={mapContainerRef} className="w-full h-[420px] bg-[#E8ECE9]" />
          <div className="px-4 py-3 bg-[#FAF9F6] border-t border-[#EFECE6] text-xs space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-[#1B4332]">
                Legend ({layerInfo.unit}): {layerInfo.legend}
              </span>
              <span className="text-[#6B7280]">{activePoint.dateISO}</span>
            </div>
            <p className="text-[#526058]">
              {layerInfo.note} {datasetSpec ? `Limitation: ${datasetSpec.limitations}` : ''}
            </p>
            {activeLayer === 'land_surface_temp' && activePoint.ecostressLstC === null && (
              <p className="text-[#9A3412] font-medium">
                Unavailable Observation Notice: ECOSTRESS Land Surface Temperature for {activePoint.month} 2026 is cloud-masked. No synthetic thermal values are generated.
              </p>
            )}
          </div>
        </div>

        {/* Registered Farms List & Active Selection */}
        <div className="bg-white border border-[#E2DDD3] rounded-xl p-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1B4332]">Registered Farms</h3>
              <span className="text-xs text-[#6B7280] tabular-nums">{farms.length} plots</span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {farms.map((farm) => {
                const isSelected = farm.id === selectedFarmId;
                return (
                  <button
                    key={farm.id}
                    type="button"
                    onClick={() => onSelectFarm(farm.id)}
                    className={`w-full text-left p-3.5 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-[#EDF5F0] border-[#2D6A4F]'
                        : 'bg-[#FAF9F6] border-[#E2DDD3] hover:bg-[#F3EFE6]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-[#1A241E]">{farm.farmName}</span>
                      <span className="text-xs font-mono tabular-nums text-[#2D6A4F] shrink-0">
                        {farm.area} {farm.areaUnit}
                      </span>
                    </div>
                    <div className="text-xs text-[#526058] mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span>
                        {farm.taluk}, {farm.district} · {farm.agroClimaticZone}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums text-[#6B7280] mt-1">
                      {farm.latitude.toFixed(4)}° N, {farm.longitude.toFixed(4)}° E · SRTM {farm.elevationM} m
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedFarm && (
            <div className="pt-3 border-t border-[#EFECE6] text-xs space-y-1.5">
              <div className="font-semibold text-[#1B4332]">Selected Farm Spatial Context</div>
              <div className="text-[#4B5563]">
                District: {selectedFarm.district} ({selectedFarm.taluk} Taluk)
              </div>
              <div className="text-[#4B5563]">
                Boundary Polygon: {selectedFarm.boundaryCoords ? 'Defined (4-vertex plot)' : 'Point coordinate only'}
              </div>
              <div className="text-[#6B7280]">
                Research Sharing: {selectedFarm.shareAnonymizedForResearch ? 'Enabled (Anonymized)' : 'Private Only'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
