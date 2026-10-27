import React from 'react';
import { Candidate } from '../types';
import { CheckCircle2, XCircle, Loader2, Clock, Code, Award, FileCode } from 'lucide-react';

interface CandidateCardProps {
  candidate: Candidate;
  isWinner: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  isWinner,
  isSelected,
  onSelect,
}) => {
  const getStatusBadge = () => {
    switch (candidate.status) {
      case 'passed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PASSED
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger/15 text-danger border border-danger/30">
            <XCircle className="w-3.5 h-3.5 mr-1" /> FAILED
          </span>
        );
      case 'testing':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-500/15 text-brand-400 border border-brand-500/30">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> SANDBOX RUNNING
          </span>
        );
      case 'generating':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> GENERATING
          </span>
        );
    }
  };

  const passRate =
    candidate.testCount > 0
      ? Math.round((candidate.passCount / candidate.testCount) * 100)
      : candidate.testPassed
      ? 100
      : 0;

  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer rounded-2xl p-4 border transition-all ${
        isSelected
          ? 'bg-surface-light border-brand-500 shadow-xl shadow-brand-500/10 ring-1 ring-brand-500'
          : isWinner
          ? 'bg-surface border-success/40 shadow-lg shadow-success/5'
          : 'bg-surface/80 border-surface-border hover:border-gray-600'
      }`}
    >
      {/* Winner Crown */}
      {isWinner && (
        <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-gray-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md flex items-center space-x-1">
          <Award className="w-3 h-3" />
          <span>WINNING PATCH</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="w-6 h-6 rounded-lg bg-surface-lighter flex items-center justify-center text-xs font-mono font-bold text-gray-300">
            {candidate.strategy[0].toUpperCase()}
          </span>
          <span className="font-bold text-sm text-gray-100 capitalize">
            {candidate.strategy} Strategy
          </span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Description */}
      <p className="text-xs text-gray-400 line-clamp-2 mb-3">
        {candidate.strategyDescription}
      </p>

      {/* Test Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[11px] font-medium mb-1">
          <span className="text-gray-400">Sandbox Tests</span>
          <span className={candidate.testPassed ? 'text-success font-semibold' : 'text-gray-300'}>
            {candidate.testCount > 0
              ? `${candidate.passCount} / ${candidate.testCount} passing (${passRate}%)`
              : candidate.status === 'passed'
              ? 'All Passed'
              : 'Waiting for tests'}
          </span>
        </div>
        <div className="w-full bg-surface-lighter h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              candidate.testPassed ? 'bg-success' : 'bg-brand-500'
            }`}
            style={{ width: `${passRate}%` }}
          />
        </div>
      </div>

      {/* Metrics Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-border text-[11px] text-gray-400">
        <div className="flex items-center space-x-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{candidate.durationMs ? `${candidate.durationMs}ms` : '--'}</span>
        </div>
        <div className="flex items-center space-x-1 font-mono text-[10px]">
          <FileCode className="w-3.5 h-3.5 text-gray-500" />
          <span>
            {candidate.diff ? `${candidate.diff.split('\n').length} diff lines` : 'Generating...'}
          </span>
        </div>
      </div>
    </div>
  );
};
