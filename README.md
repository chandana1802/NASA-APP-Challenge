# FIELD SHIFT – Adapting Farms with NASA Data

**Tagline:** *Turning Earth Observations into Climate-Resilient Farming Decisions.*

Field Shift is an explainable, NASA-data-powered crop rotation decision-support platform built for the 2026 NASA challenge, initially focused on **Karnataka, India** and architected to scale across additional states and regions.

---

## Current Milestone: Stage 1 – Frontend Foundation & Prepared Architecture

Implemented in Stage 1:
- **Public Landing Page, About Field Shift, and NASA Data Sources Matrix**
- **Authentication & Role Routing UI** (Farmer, Researcher, Admin, Registration, Password Reset, and Stage 1 Demo Workspaces)
- **Separate Farmer Workspace** (English & Kannada `ಕನ್ನಡ` toggle, 7 overview metrics, Irrigation Advisory, Risk Alerts, Profile)
- **Separate Researcher Workspace** (Multi-farm comparisons across Mandya/Dharwad/Tumakuru/Hassan, time-series filters, soil gap audit, model uncertainty registry, CSV export)
- **Admin Governance Console** (Researcher verification queue, crop database maintenance, NASA source & RLS status)
- **Interactive Karnataka Map** (Leaflet + OpenStreetMap, District/Taluk selection, GPS capture, manual coordinates, plot polygons, environmental layer legends & cloud-mask gap notices)
- **Local Soil Profile Module** (Explicit missing-field tracking, data source provenance, Soil Health Card PDF/JPG/PNG validation)
- **Farmer Priorities & Constraints Form** (Weighted 1–5 priority sliders + irrigation, labor, equipment, budget, and market constraints)
- **Interactive Crop Rotation Explorer (MCDA v1.0)** (Compares Strategy A Existing vs. Strategy B Nutrient-Cycling vs. Strategy C Climate-Resilient across 13 criteria with Recharts Radar/Bar visualizations, trade-offs, uncertainty notes, and Accept/Modify/Reject farmer controls)
- **15-Section Printable/Downloadable Reports & CSV Export**
- **Prepared Supabase PostgreSQL Schema & RLS Policies** (`supabase/migrations/001_initial_schema.sql`)

---

## Scientific & Ethical Guardrails
1. **No Fabricated Data:** All Stage 1 metrics are clearly labelled as *Demonstration Reference Data*. Cloud-masked ECOSTRESS months and missing laboratory soil nutrients remain `null` / `Unmeasured`.
2. **Spatial Resolution Honesty:** Coarse footprints (SMAP 9 km, GPM 0.1°, GRACE-FO ~300 km) are never presented as plot-level sensors or individual farm borewell levels.
3. **LST vs. Air Temperature:** ECOSTRESS Land Surface Temperature (skin temp) is explicitly separated from NASA POWER 2 m air temperature.
4. **No Untrained ML Claims:** Initial rotation comparison uses deterministic Multi-Criteria Decision Analysis (MCDA v1.0) rather than fabricated ML accuracy percentages.
5. **Local Agronomist Review:** Every report and rotation recommendation prompts review with the local Karnataka KVK / Raitha Samparka Kendra.

---

## Setup & Installation

### 1. Prerequisites
- Node.js 20+
- npm 10+

### 2. Install & Run Locally
```bash
npm install
cp .env.example .env
npm run dev
```
The application runs at `http://localhost:3000`.

### 3. Build & Typecheck
```bash
npm run lint
npm run build
```

---

## Environment Variables & Security

Copy `.env.example` to `.env`:

```env
# Browser-safe Supabase client values (protected by PostgreSQL RLS)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key

# Server-side only secrets (NEVER prefix with VITE_)
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
NASA_EARTHDATA_USERNAME=
NASA_EARTHDATA_PASSWORD=
ML_API_URL=
ML_API_SECRET=
```

---

## Staged Roadmap (Stages 2–7)
- **Stage 2 (Supabase Connection):** Apply `supabase/migrations/001_initial_schema.sql` in your Supabase project, enable Email Auth, and configure RLS + private storage buckets (`soil-reports`, `research-reports`, `farm-documents`).
- **Stage 3–4 (NASA Data Pipelines):** Connect server-side routes for NASA POWER, GPM IMERG, SMAP, MODIS, Landsat, ECOSTRESS (AppEEARS), GRACE-FO, and SRTM with caching, rate limiting, and coordinate validation.
- **Stage 5 (Python FastAPI ML Service on Replit):** Deploy `field-shift-ml` (`/health`, `/climate-risk`, `/crop-suitability`, `/rotation-evaluation`, `/model-information`) secured via Bearer `ML_API_SECRET`, plus server-side Gemini plain-language explanation proxy.
- **Stage 6–7 (Testing & Production Audit):** End-to-end RLS penetration testing, NASA data unit verification, and deployment.
