import React, { useState } from 'react';
import { LogOut, Satellite, ShieldCheck, Sprout, Users } from 'lucide-react';
import { CropCatalogView } from '../components/CropCatalogView';
import { NASA_DATASETS } from '../data/karnatakaData';
import { SUPABASE_STAGE_STATUS } from '../lib/supabase';
import type { CropCharacteristic, UserSession } from '../types/fieldShift';

interface AdminWorkspaceProps {
  session: UserSession;
  crops: CropCharacteristic[];
  onAddCrop: (crop: CropCharacteristic) => void;
  onLogout: () => void;
  onSwitchWorkspace?: (role: 'farmer' | 'researcher' | 'admin') => void;
}

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  session,
  crops,
  onAddCrop,
  onLogout,
  onSwitchWorkspace,
}) => {
  const [tab, setTab] = useState<'users' | 'crops' | 'datasources' | 'security'>('users');
  const [users, setUsers] = useState([
    { id: 'u1', name: 'Basavaraj Gowda', role: 'farmer', district: 'Mandya', verified: true },
    { id: 'u2', name: 'Dr. Kavitha Rao', role: 'researcher', district: 'Dharwad', verified: true },
    { id: 'u3', name: 'Anand Kulkarni', role: 'researcher', district: 'Belagavi', verified: false },
  ]);

  const toggleVerify = (id: string) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, verified: !u.verified } : u)));
  };

  return (
    <div className="min-h-screen bg-[#F6F4EF]">
      <header className="bg-white border-b border-[#E2DDD3] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-display font-bold text-[#1B4332]">
            FIELD SHIFT — System & Agronomic Administration
          </h1>
          <div className="text-xs text-[#526058]">
            Signed in as {session.fullName} · Server-side role governance prepared for Stage 2 RLS
          </div>
        </div>
        <div className="flex items-center gap-2.5 text-xs">
          {session.isDemoSession && onSwitchWorkspace && (
            <>
              <button
                type="button"
                onClick={() => onSwitchWorkspace('farmer')}
                className="px-3 py-1.5 rounded-lg border border-[#D4CEC3] bg-[#FAF9F6] font-medium cursor-pointer"
              >
                Farmer View
              </button>
              <button
                type="button"
                onClick={() => onSwitchWorkspace('researcher')}
                className="px-3 py-1.5 rounded-lg border border-[#D4CEC3] bg-[#FAF9F6] font-medium cursor-pointer"
              >
                Researcher View
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] text-[#991B1B] font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'users', label: 'User & Researcher Verification', icon: Users },
            { id: 'crops', label: 'Crop Database Management', icon: Sprout },
            { id: 'datasources', label: 'NASA Data Source Readiness', icon: Satellite },
            { id: 'security', label: 'Security & RLS Architecture', icon: ShieldCheck },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as typeof tab)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                  tab === item.id
                    ? 'bg-[#1B4332] text-white border-[#1B4332]'
                    : 'bg-white text-[#374151] border-[#E2DDD3]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {tab === 'users' && (
          <div className="bg-white border border-[#E2DDD3] rounded-xl overflow-hidden">
            <div className="p-5 border-b border-[#EFECE6]">
              <h2 className="text-base font-semibold text-[#1B4332]">User & Researcher Verification Queue</h2>
              <p className="text-xs text-[#526058] mt-1">
                Researchers only gain access to anonymized consented farms once `profiles.research_verified = TRUE` is set server-side.
              </p>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] border-b border-[#E2DDD3] text-[#526058]">
                <tr>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">District</th>
                  <th className="py-3 px-3">Verification Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE6]">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 px-4 font-semibold">{u.name}</td>
                    <td className="py-3 px-3 capitalize">{u.role}</td>
                    <td className="py-3 px-3">{u.district}</td>
                    <td className="py-3 px-3">
                      <span className={u.verified ? 'text-[#166534] font-semibold' : 'text-[#9A3412] font-semibold'}>
                        {u.verified ? 'Verified' : 'Pending Review'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => toggleVerify(u.id)}
                        className="px-3 py-1 rounded border border-[#D4CEC3] hover:bg-[#FAF9F6] cursor-pointer"
                      >
                        {u.verified ? 'Revoke' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'crops' && <CropCatalogView crops={crops} canEdit={true} onAddCrop={onAddCrop} />}

        {tab === 'datasources' && (
          <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#1B4332]">NASA Data Integration Readiness (Stage 3 Pipeline)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {NASA_DATASETS.map((ds) => (
                <div key={ds.id} className="border border-[#E2DDD3] rounded-lg p-4 space-y-1">
                  <div className="flex justify-between font-semibold text-[#1B4332]">
                    <span>{ds.name}</span>
                    <span className="font-mono text-[#6B4F35]">Demo Reference Active</span>
                  </div>
                  <div className="text-[#4B5563]">Auth: {ds.authRequirement}</div>
                  <div className="text-[#6B7280]">Source: {ds.officialSource}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="bg-white border border-[#E2DDD3] rounded-xl p-6 space-y-3 text-xs">
            <h2 className="text-base font-semibold text-[#1B4332]">Supabase & API Secret Governance</h2>
            <p>Supabase Browser Config Status: {SUPABASE_STAGE_STATUS.configured ? 'Configured' : 'Awaiting .env values'}</p>
            <p>SQL Migration Prepared: <code className="font-mono">{SUPABASE_STAGE_STATUS.migrationFile}</code></p>
            <p>Private Buckets Prepared: {SUPABASE_STAGE_STATUS.preparedBuckets.join(', ')}</p>
            <p className="text-[#526058]">
              Gemini API Key, NASA Earthdata credentials, Supabase Service Role Key, and FastAPI ML secrets are strictly reserved for server-side environment variables and never bundled into browser code.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};
