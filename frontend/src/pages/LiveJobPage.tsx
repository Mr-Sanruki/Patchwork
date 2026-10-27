import React, { useState, useEffect } from 'react';
import { Job, Candidate, TavilySource, PipelineLog, SseEvent } from '../types';
import { getJob, subscribeToJobEvents, approveJob } from '../services/api';
import { JobTimeline } from '../components/JobTimeline';
import { ModelTierBadges } from '../components/ModelTierBadges';
import { RaceBoard } from '../components/RaceBoard';
import { DiffViewer } from '../components/DiffViewer';
import { TavilySourcesPanel } from '../components/TavilySourcesPanel';
import { LogDrawer } from '../components/LogDrawer';
import { PRPreviewModal } from '../components/PRPreviewModal';
import { ArrowLeft, RefreshCw, GitPullRequest, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface LiveJobPageProps {
  jobId: string;
  onBack: () => void;
}

export const LiveJobPage: React.FC<LiveJobPageProps> = ({ jobId, onBack }) => {
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sources, setSources] = useState<TavilySource[]>([]);
  const [logs, setLogs] = useState<PipelineLog[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | undefined>();
  const [isPRModalOpen, setIsPRModalOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [prResult, setPrResult] = useState<{ success: boolean; prUrl?: string; message: string } | null>(null);

  useEffect(() => {
    // 1. Initial fetch
    loadJobDetails();

    // 2. Subscribe to live Server-Sent Events (SSE)
    const unsubscribe = subscribeToJobEvents(jobId, (event: SseEvent) => {
      handleLiveEvent(event);
    });

    return () => {
      unsubscribe();
    };
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      const data = await getJob(jobId);
      setJob(data.job);
      setCandidates(data.candidates);
      setSources(data.sources);
      setLogs(data.logs);

      if (data.job.winningCandidateId) {
        setSelectedCandidateId(data.job.winningCandidateId);
      } else if (data.candidates.length > 0) {
        setSelectedCandidateId(data.candidates[0].id);
      }
    } catch (err) {
      console.error('Failed to load job details', err);
    }
  };

  const handleLiveEvent = (event: SseEvent) => {
    switch (event.type) {
      case 'job:status':
        setJob((prev) => (prev ? { ...prev, status: event.data.status } : null));
        break;

      case 'job:log':
        setLogs((prev) => [...prev, event.data]);
        break;

      case 'candidate:created':
        setCandidates((prev) => {
          const exists = prev.some((c) => c.id === event.data.id);
          if (exists) return prev;
          return [...prev, event.data];
        });
        break;

      case 'candidate:update':
        setCandidates((prev) =>
          prev.map((c) => (c.id === event.data.id ? { ...c, ...event.data } : c))
        );
        break;

      case 'tavily:source':
        setSources((prev) => {
          const exists = prev.some((s) => s.id === event.data.id);
          if (exists) return prev;
          return [...prev, event.data];
        });
        break;

      case 'job:completed':
        setJob(event.data);
        if (event.data.winningCandidateId) {
          setSelectedCandidateId(event.data.winningCandidateId);
        }
        break;

      case 'job:failed':
        setJob((prev) => (prev ? { ...prev, status: 'failed', error: event.data.error } : null));
        break;
    }
  };

  const handleApprove = async () => {
    setIsPRModalOpen(true);
  };

  const handlePublishPR = async () => {
    if (!job) return;
    setIsApproving(true);
    try {
      const result = await approveJob(job.id);
      setPrResult(result);
    } catch (err) {
      setPrResult({
        success: false,
        message: (err as Error).message,
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-sm text-gray-400">Loading upgrade job workspace...</p>
      </div>
    );
  }

  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) ||
    candidates.find((c) => c.id === job.winningCandidateId) ||
    candidates[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-border">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-surface hover:bg-surface-lighter flex items-center justify-center text-gray-400 hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {job.packageName} {job.fromVersion} &rarr; {job.toVersion}
              </h1>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                  job.status === 'completed'
                    ? 'bg-success/15 text-success border-success/30'
                    : job.status === 'failed'
                    ? 'bg-danger/15 text-danger border-danger/30'
                    : 'bg-brand-500/15 text-brand-400 border-brand-500/30 animate-pulse'
                }`}
              >
                {job.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">{job.repoUrl}</p>
          </div>
        </div>

        {/* Action Button */}
        {job.status === 'completed' && (
          <button
            onClick={handleApprove}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-success to-emerald-600 hover:from-emerald-500 hover:to-success text-gray-950 font-bold text-xs flex items-center space-x-2 shadow-xl shadow-success/20 transition-all"
          >
            <GitPullRequest className="w-4 h-4" />
            <span>Review & Approve PR</span>
          </button>
        )}
      </div>

      {/* 1. Workflow Stage Timeline */}
      <JobTimeline status={job.status} />

      {/* 2. Model Tier Badges */}
      <ModelTierBadges currentStage={job.status} />

      {/* 3. Candidate Race Board */}
      <RaceBoard
        candidates={candidates}
        winningCandidateId={job.winningCandidateId}
        selectedCandidateId={selectedCandidateId}
        onSelectCandidate={(id) => setSelectedCandidateId(id)}
        currentRound={job.currentRound}
      />

      {/* 4. Unified Diff Viewer */}
      {selectedCandidate && (
        <DiffViewer
          job={job}
          candidate={selectedCandidate}
          onApprove={handleApprove}
          onReject={() => alert('Candidate patch marked for rejection. You can download the raw patch or trigger another round.')}
          isApproving={isApproving}
        />
      )}

      {/* 5. Tavily Sources Panel */}
      <TavilySourcesPanel sources={sources} />

      {/* 6. Live Log Drawer */}
      <LogDrawer logs={logs} />

      {/* 7. PR Modal */}
      <PRPreviewModal
        isOpen={isPRModalOpen}
        onClose={() => setIsPRModalOpen(false)}
        job={job}
        prResult={prResult}
        onPublish={handlePublishPR}
        isPublishing={isApproving}
      />
    </div>
  );
};
