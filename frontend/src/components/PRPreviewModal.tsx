import React from 'react';
import { Job } from '../types';
import { X, GitPullRequest, ExternalLink, Download, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

interface PRPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  prResult?: { success: boolean; prUrl?: string; message: string } | null;
  onPublish: () => void;
  isPublishing?: boolean;
}

export const PRPreviewModal: React.FC<PRPreviewModalProps> = ({
  isOpen,
  onClose,
  job,
  prResult,
  onPublish,
  isPublishing,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface rounded-3xl border border-surface-border w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-surface-border flex items-center justify-between bg-surface-light/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-100">
                GitHub Pull Request Review
              </h3>
              <p className="text-xs text-gray-400">
                Generated and reviewed by <span className="text-nemotron-ultra font-semibold">NVIDIA Nemotron Ultra</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface hover:bg-surface-lighter flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Success Banner if already published */}
          {prResult?.success && (
            <div className="p-4 rounded-2xl bg-success/15 border border-success/30 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <div>
                  <div className="font-bold text-sm text-success">Pull Request Successfully Created!</div>
                  <div className="text-xs text-emerald-300">{prResult.message}</div>
                </div>
              </div>
              {prResult.prUrl && (
                <a
                  href={prResult.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-success text-gray-950 font-bold text-xs flex items-center space-x-1.5 shadow-md hover:bg-emerald-400 transition-colors"
                >
                  <span>Open on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* PR Title */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Pull Request Title
            </label>
            <div className="p-3 rounded-xl bg-surface-light border border-surface-border text-sm font-semibold text-gray-100 font-mono">
              {job.prTitle || `feat(deps): upgrade ${job.packageName} from ${job.fromVersion} to ${job.toVersion}`}
            </div>
          </div>

          {/* PR Body */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
              Pull Request Description & Verification Proof
            </label>
            <div className="p-4 rounded-xl bg-surface-light border border-surface-border text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {job.prBody || 'Review pending generation from Nemotron Ultra...'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-border bg-surface-light/40 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <ShieldCheck className="w-4 h-4 text-success" />
            <span>Human approval required &mdash; nothing auto-merges</span>
          </div>

          <div className="flex items-center space-x-3">
            <a
              href={`/api/jobs/${job.id}/patch`}
              className="px-3 py-2 rounded-xl border border-surface-border bg-surface hover:bg-surface-lighter text-xs font-semibold text-gray-300 flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .patch</span>
            </a>

            {!prResult?.success && (
              <button
                onClick={onPublish}
                disabled={isPublishing}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-xs font-bold text-white flex items-center space-x-1.5 shadow-lg shadow-brand-500/25 transition-all disabled:opacity-50"
              >
                <GitPullRequest className="w-4 h-4" />
                <span>{isPublishing ? 'Publishing PR...' : 'Publish to GitHub'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
