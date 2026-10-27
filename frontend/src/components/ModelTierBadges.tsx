import React from 'react';
import { Cpu, Zap, Award } from 'lucide-react';

interface ModelTierBadgesProps {
  currentStage?: string;
  models?: {
    nano?: string;
    super?: string;
    ultra?: string;
  };
}

export const ModelTierBadges: React.FC<ModelTierBadgesProps> = ({ currentStage, models }) => {
  const isTriage = currentStage === 'triaging';
  const isSuper = currentStage === 'generating_candidates' || currentStage === 'repairing';
  const isUltra = currentStage === 'reviewing';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {/* Tier 1: Nano */}
      <div
        className={`p-3 rounded-xl border transition-all ${
          isTriage
            ? 'bg-nemotron-nano/15 border-nemotron-nano shadow-lg shadow-nemotron-nano/10 ring-1 ring-nemotron-nano'
            : 'bg-surface/60 border-surface-border'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-nemotron-nano" />
            <span className="text-xs font-bold text-gray-200">TIER 1: NANO</span>
          </div>
          {isTriage && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nemotron-nano opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-nemotron-nano"></span>
            </span>
          )}
        </div>
        <div className="text-xs font-semibold text-nemotron-nano">Fast Triage & API Mapping</div>
        <div className="text-[11px] text-gray-400 font-mono mt-1 truncate">
          {models?.nano || 'nvidia/nemotron-mini-4b-instruct'}
        </div>
      </div>

      {/* Tier 2: Super */}
      <div
        className={`p-3 rounded-xl border transition-all ${
          isSuper
            ? 'bg-nemotron-super/15 border-nemotron-super shadow-lg shadow-nemotron-super/10 ring-1 ring-nemotron-super'
            : 'bg-surface/60 border-surface-border'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-nemotron-super" />
            <span className="text-xs font-bold text-gray-200">TIER 2: SUPER</span>
          </div>
          {isSuper && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nemotron-super opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-nemotron-super"></span>
            </span>
          )}
        </div>
        <div className="text-xs font-semibold text-nemotron-super">Parallel Candidates & Repair</div>
        <div className="text-[11px] text-gray-400 font-mono mt-1 truncate">
          {models?.super || 'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF'}
        </div>
      </div>

      {/* Tier 3: Ultra */}
      <div
        className={`p-3 rounded-xl border transition-all ${
          isUltra
            ? 'bg-nemotron-ultra/15 border-nemotron-ultra shadow-lg shadow-nemotron-ultra/10 ring-1 ring-nemotron-ultra'
            : 'bg-surface/60 border-surface-border'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-2">
            <Award className="w-4 h-4 text-nemotron-ultra" />
            <span className="text-xs font-bold text-gray-200">TIER 3: ULTRA</span>
          </div>
          {isUltra && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-nemotron-ultra opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-nemotron-ultra"></span>
            </span>
          )}
        </div>
        <div className="text-xs font-semibold text-nemotron-ultra">PR Synthesis & Risk Review</div>
        <div className="text-[11px] text-gray-400 font-mono mt-1 truncate">
          {models?.ultra || 'nvidia/nemotron-4-340b-instruct'}
        </div>
      </div>
    </div>
  );
};
