import React, { useState } from 'react';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { LiveJobPage } from './pages/LiveJobPage';
import { BenchmarksPage } from './pages/BenchmarksPage';
import { Job } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upgrade' | 'race' | 'benchmarks'>('upgrade');
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  const handleJobStarted = (job: Job) => {
    setActiveJob(job);
    setActiveTab('race');
  };

  const handleOpenJob = (job: Job) => {
    setActiveJob(job);
    setActiveTab('race');
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasActiveJob={Boolean(activeJob)}
      />

      <main className="flex-1">
        {activeTab === 'upgrade' && (
          <HomePage
            onJobStarted={handleJobStarted}
            onOpenJob={handleOpenJob}
          />
        )}

        {activeTab === 'race' && activeJob && (
          <LiveJobPage
            jobId={activeJob.id}
            onBack={() => setActiveTab('upgrade')}
          />
        )}

        {activeTab === 'benchmarks' && <BenchmarksPage />}
      </main>

      <footer className="border-t border-surface-border bg-surface/40 py-6 text-center text-xs text-gray-500">
        <p>
          Patchwork &bull; Built for the Nebius x NVIDIA Global AI Hackathon &bull; MIT Licensed
        </p>
      </footer>
    </div>
  );
};

export default App;
