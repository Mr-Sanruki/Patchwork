import React from 'react';
import { Layers, Activity, BarChart3, Shield, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: 'upgrade' | 'race' | 'benchmarks';
  setActiveTab: (tab: 'upgrade' | 'race' | 'benchmarks') => void;
  hasActiveJob: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, hasActiveJob }) => {
  return (
    <header className="border-b border-surface-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('upgrade')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-nemotron-super flex items-center justify-center shadow-lg shadow-brand-500/20">
            <span className="text-xl">🧩</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                PATCHWORK
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded">
                AI HACKATHON
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Dependency upgrades that fix themselves, and prove it.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveTab('upgrade')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-2 transition-all ${
              activeTab === 'upgrade'
                ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-light'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Upgrade Engine</span>
          </button>

          {hasActiveJob && (
            <button
              onClick={() => setActiveTab('race')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-2 transition-all ${
                activeTab === 'race'
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-light'
              }`}
            >
              <Activity className="w-4 h-4 text-nemotron-nano animate-pulse" />
              <span>Live Race Board</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-2 transition-all ${
              activeTab === 'benchmarks'
                ? 'bg-brand-500/15 text-brand-400 border border-brand-500/30 shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-surface-light'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Benchmarks</span>
          </button>
        </nav>

        {/* Sponsor tech stack pill */}
        <div className="hidden lg:flex items-center space-x-2 text-xs">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-surface border border-surface-border text-gray-300">
            <span className="w-2 h-2 rounded-full bg-nemotron-super animate-pulse"></span>
            <span className="font-medium">NVIDIA Nemotron</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">Nebius Token Factory</span>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-surface border border-surface-border text-tavily">
            <Sparkles className="w-3 h-3" />
            <span className="font-medium">Tavily Extract</span>
          </div>
        </div>
      </div>
    </header>
  );
};
