import React, { useState, useEffect } from 'react';
import { Job } from '../types';
import { createJob, listJobs } from '../services/api';
import { Play, Sparkles, Layers, Shield, Terminal, ArrowRight, CheckCircle2, Cpu } from 'lucide-react';

interface HomePageProps {
  onJobStarted: (job: Job) => void;
  onOpenJob: (job: Job) => void;
}

const DEMO_FIXTURES = [
  {
    name: 'Chalk 4 ➔ 5 (Pure ESM Migration)',
    repoUrl: 'demo-repos/chalk-fixture',
    packageName: 'chalk',
    fromVersion: '4.1.2',
    toVersion: '5.3.0',
    description: 'Bumps chalk to pure ESM; converts require() to import and fixes test suite.',
  },
  {
    name: 'Node-Fetch 2 ➔ 3 (CommonJS to ESM)',
    repoUrl: 'demo-repos/node-fetch-fixture',
    packageName: 'node-fetch',
    fromVersion: '2.6.7',
    toVersion: '3.3.2',
    description: 'Switches node-fetch from CommonJS to ESM and updates buffer responses.',
  },
  {
    name: 'Express 4 ➔ 5 (Async Handlers & Del)',
    repoUrl: 'demo-repos/express-fixture',
    packageName: 'express',
    fromVersion: '4.18.2',
    toVersion: '5.0.0',
    description: 'Migrates Express app to 5.0 with updated route wildcards and error handlers.',
  },
  {
    name: 'Commander 8 ➔ 12 (.opts() Accessor)',
    repoUrl: 'demo-repos/commander-fixture',
    packageName: 'commander',
    fromVersion: '8.0.0',
    toVersion: '12.0.0',
    description: 'Updates CLI options parsing to modern program.opts() pattern.',
  },
  {
    name: 'ESLint 8 ➔ 9 (Flat Config)',
    repoUrl: 'demo-repos/eslint-fixture',
    packageName: 'eslint',
    fromVersion: '8.57.0',
    toVersion: '9.0.0',
    description: 'Converts legacy .eslintrc configuration to modern eslint.config.js flat config.',
  },
];

export const HomePage: React.FC<HomePageProps> = ({ onJobStarted, onOpenJob }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [packageName, setPackageName] = useState('');
  const [fromVersion, setFromVersion] = useState('');
  const [toVersion, setToVersion] = useState('');
  const [runnerType, setRunnerType] = useState<'docker' | 'nebius'>('docker');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);

  useEffect(() => {
    loadRecentJobs();
  }, []);

  const loadRecentJobs = async () => {
    try {
      const jobs = await listJobs();
      setRecentJobs(jobs);
    } catch {
      // Ignore if offline
    }
  };

  const selectDemo = (fixture: typeof DEMO_FIXTURES[0]) => {
    setRepoUrl(fixture.repoUrl);
    setPackageName(fixture.packageName);
    setFromVersion(fixture.fromVersion);
    setToVersion(fixture.toVersion);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl || !packageName || !fromVersion || !toVersion) {
      setError('Please fill in all upgrade fields.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const job = await createJob({
        repoUrl,
        packageName,
        fromVersion,
        toVersion,
        runnerType,
      });
      onJobStarted(job);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-xs font-semibold text-brand-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Nebius x NVIDIA Global AI Hackathon Entry</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Dependency upgrades that{' '}
          <span className="bg-gradient-to-r from-brand-400 via-nemotron-super to-nemotron-nano bg-clip-text text-transparent">
            fix themselves
          </span>
          , and prove it.
        </h1>
        <p className="text-base sm:text-lg text-gray-400 leading-relaxed">
          Patchwork bumps breaking dependencies, crawls official migration guides via Tavily,
          synthesizes parallel candidate patches with NVIDIA Nemotron, runs each in an isolated sandbox,
          and delivers a verified Pull Request.
        </p>
      </div>

      {/* Main Upgrade Card */}
      <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-surface-border shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          {/* Demo Repos Dropdown */}
          <div className="p-4 rounded-2xl bg-surface-light/50 border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <span className="text-xl">🚀</span>
              <div>
                <div className="text-xs font-bold text-gray-200">Try a pre-configured demo repository:</div>
                <div className="text-[11px] text-gray-400">Deterministic fixtures tested on hackathon benchmarks</div>
              </div>
            </div>
            <select
              onChange={(e) => {
                const match = DEMO_FIXTURES.find((f) => f.name === e.target.value);
                if (match) selectDemo(match);
              }}
              defaultValue=""
              className="bg-surface border border-surface-border rounded-xl px-3 py-2 text-xs font-medium text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="" disabled>Select a demo scenario...</option>
              {DEMO_FIXTURES.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger font-medium">
              {error}
            </div>
          )}

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                GitHub Repository URL or Local Fixture Path
              </label>
              <input
                type="text"
                placeholder="https://github.com/org/repo or demo-repos/chalk-fixture"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-light border border-surface-border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Package Name
              </label>
              <input
                type="text"
                placeholder="e.g. chalk, node-fetch, express"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-light border border-surface-border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  From Version
                </label>
                <input
                  type="text"
                  placeholder="4.1.2"
                  value={fromVersion}
                  onChange={(e) => setFromVersion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-light border border-surface-border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  To Version
                </label>
                <input
                  type="text"
                  placeholder="5.3.0"
                  value={toVersion}
                  onChange={(e) => setToVersion(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-light border border-surface-border text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Sandbox Runner Selection */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold text-gray-300">Sandbox Isolation:</span>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setRunnerType('docker')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    runnerType === 'docker'
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-surface-light text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Local Docker (Default)
                </button>
                <button
                  type="button"
                  onClick={() => setRunnerType('nebius')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    runnerType === 'nebius'
                      ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                      : 'bg-surface-light text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Nebius Serverless Jobs
                </button>
              </div>
            </div>

            {/* Launch Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-nemotron-super hover:from-brand-500 hover:to-nemotron-super text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-brand-500/25 transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isSubmitting ? 'Launching Autonomous Upgrade...' : 'Run Autonomous Upgrade'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">
            Recent Upgrade Jobs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentJobs.slice(0, 6).map((j) => (
              <div
                key={j.id}
                onClick={() => onOpenJob(j)}
                className="p-4 rounded-2xl bg-surface border border-surface-border hover:border-brand-500/40 cursor-pointer transition-all hover:translate-y-[-1px]"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-gray-100 font-mono">
                    {j.packageName} {j.fromVersion} &rarr; {j.toVersion}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      j.status === 'completed'
                        ? 'bg-success/15 text-success'
                        : j.status === 'failed'
                        ? 'bg-danger/15 text-danger'
                        : 'bg-brand-500/15 text-brand-400'
                    }`}
                  >
                    {j.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 truncate mb-2">{j.repoUrl}</p>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>{new Date(j.createdAt).toLocaleDateString()}</span>
                  <span className="flex items-center space-x-1 text-brand-400 font-medium">
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
