import React, { useState } from 'react';
import { Check, Copy, Database, RefreshCw } from 'lucide-react';
import migrationSql from '../../supabase/migrations/001_initial_schema.sql?raw';

interface SupabaseSetupBannerProps {
  onVerify: () => Promise<void>;
}

export const SupabaseSetupBanner: React.FC<SupabaseSetupBannerProps> = ({ onVerify }) => {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(migrationSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleVerify = async () => {
    setChecking(true);
    await onVerify();
    setChecking(false);
  };

  return (
    <div className="bg-[#FFFBEB] border border-[#F59E0B] rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <Database className="w-5 h-5 text-[#B45309] shrink-0 mt-0.5" />
        <div className="text-xs text-[#78350F] space-y-1">
          <div className="font-semibold text-sm">
            Connected to Supabase Project — One-Time Database Table Setup Required
          </div>
          <p>
            Your Supabase project (<code className="font-mono">solqqrhauvnfcnvwojzw</code>) is connected for Authentication, but the PostgreSQL tables (`profiles`, `farms`, `soil_profiles`, `farmer_priorities`, `rotation_scenarios`) have not been created yet. Copy the SQL migration and run it once in your <strong>Supabase Dashboard → SQL Editor</strong>.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#92400E] text-white hover:bg-[#78350F] cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'SQL Copied!' : 'Copy SQL Schema'}</span>
        </button>
        <button
          type="button"
          onClick={handleVerify}
          disabled={checking}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#D97706] bg-white text-[#92400E] hover:bg-[#FEF3C7] cursor-pointer disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          <span>{checking ? 'Checking...' : 'Verify Tables Now'}</span>
        </button>
      </div>
    </div>
  );
};
