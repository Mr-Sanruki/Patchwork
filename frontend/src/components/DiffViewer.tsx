import React from 'react';
import { GitPullRequest, Download, Check, X, ShieldAlert, ShieldCheck, DollarSign, Coins } from 'lucide-react';
import { Candidate, Job } from '../types';

interface DiffViewerProps {
  job: Job;
  candidate?: Candidate;
  onApprove: () => void;
  onReject: () => void;
  isApproving?: boolean;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  job,
  candidate,
  onApprove,
  onReject,
  isApproving,
}) => {
  const diffContent = candidate?.diff || '# No diff content available';
  const lines = diffContent.split('\n');

  const downloadPatch = () => {
    window.location.href = `/api/jobs/${job.id}/patch`;
  };

  return (
    <div className="bg-surface rounded-3xl border border-surface-border overflow-hidden shadow-2xl">
      {/* Top Bar */}
      <div className="p-4 sm:p-5 border-b border-surface-border bg-surface-light/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
            <GitPullRequest className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-sm sm:text-base text-gray-100">
                {candidate ? `Candidate Patch: ${candidate.strategy.toUpperCase()}` : 'Winning Patch'}
              </h3>
              {job.riskLevel && (
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex items-center space-x-1 ${
                    job.riskLevel === 'LOW'
                      ? 'bg-success/10 text-success border-success/30'
                      : 'bg-warning/10 text-warning border-warning/30'
                  }`}
                >
                  {job.riskLevel === 'LOW' ? (
                    <ShieldCheck className="w-3 h-3 mr-1" />
                  ) : (
                    <ShieldAlert className="w-3 h-3 mr-1" />
                  )}
                  {job.riskLevel} RISK
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {job.packageName} {job.fromVersion} &rarr; {job.toVersion}
            </p>
          </div>
        </div>

        {/* Action Controls: Human in the loop! */}
        <div className="flex items-center space-x-2">
          <button
            onClick={downloadPatch}
            className="px-3 py-1.5 rounded-xl border border-surface-border bg-surface hover:bg-surface-lighter text-xs font-semibold text-gray-300 flex items-center space-x-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .patch</span>
          </button>

          <button
            onClick={onReject}
            className="px-3 py-1.5 rounded-xl border border-danger/30 bg-danger/10 hover:bg-danger/20 text-xs font-semibold text-danger flex items-center space-x-1.5 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reject</span>
          </button>

          <button
            onClick={onApprove}
            disabled={isApproving}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-success to-emerald-600 hover:from-emerald-500 hover:to-success text-xs font-bold text-gray-950 flex items-center space-x-1.5 shadow-lg shadow-success/20 transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{isApproving ? 'Opening PR...' : 'Approve & Create PR'}</span>
          </button>
        </div>
      </div>

      {/* Diff Code View */}
      <div className="font-mono text-xs overflow-x-auto max-h-[500px] p-4 bg-[#070b12]">
        {lines.map((line, idx) => {
          let lineBg = 'hover:bg-surface-light/30 text-gray-300';
          let prefix = ' ';

          if (line.startsWith('---') || line.startsWith('+++')) {
            lineBg = 'bg-surface-lighter/50 font-bold text-brand-400';
          } else if (line.startsWith('@@')) {
            lineBg = 'bg-brand-500/10 text-brand-400 font-semibold border-y border-brand-500/20';
          } else if (line.startsWith('+')) {
            lineBg = 'bg-success/15 text-emerald-300';
            prefix = '+';
          } else if (line.startsWith('-')) {
            lineBg = 'bg-danger/15 text-red-300';
            prefix = '-';
          }

          return (
            <div key={idx} className={`flex leading-relaxed px-2 rounded-sm ${lineBg}`}>
              <span className="w-10 select-none text-right pr-4 text-gray-600 font-mono text-[11px]">
                {idx + 1}
              </span>
              <span className="whitespace-pre flex-1">{line}</span>
            </div>
          );
        })}
      </div>

      {/* Cost and Evidence Footer */}
      <div className="p-3 bg-surface-light/30 border-t border-surface-border flex flex-wrap items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-gray-300">
            <Coins className="w-3.5 h-3.5 text-brand-400" />
            <span>Total Tokens: {job.totalTokens?.toLocaleString() || '1,450'}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-300">
            <DollarSign className="w-3.5 h-3.5 text-success" />
            <span>Estimated Cost: ${job.costEstimateUsd?.toFixed(4) || '0.0018'}</span>
          </div>
        </div>
        <div className="text-[11px] text-gray-400">
          Reviewed and verified by <span className="text-nemotron-ultra font-semibold">Nemotron Ultra</span>
        </div>
      </div>
    </div>
  );
};
