import React from 'react';
import { Candidate } from '../types';
import { CandidateCard } from './CandidateCard';
import { Activity, RefreshCw } from 'lucide-react';

interface RaceBoardProps {
  candidates: Candidate[];
  winningCandidateId?: string;
  selectedCandidateId?: string;
  onSelectCandidate: (id: string) => void;
  currentRound: number;
}

export const RaceBoard: React.FC<RaceBoardProps> = ({
  candidates,
  winningCandidateId,
  selectedCandidateId,
  onSelectCandidate,
  currentRound,
}) => {
  return (
    <div className="bg-surface/60 rounded-3xl p-5 border border-surface-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-brand-400" />
          <h2 className="text-base font-bold text-gray-100">
            Parallel Candidate Race Board
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-md bg-surface-lighter text-gray-300 font-mono">
            Round {currentRound}
          </span>
        </div>
        <div className="text-xs text-gray-400">
          Generated concurrently by <span className="text-nemotron-super font-semibold">Nemotron Super</span>
        </div>
      </div>

      {candidates.length === 0 ? (
        <div className="py-12 text-center text-gray-500 border border-dashed border-surface-border rounded-2xl">
          <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin text-gray-600" />
          <p className="text-sm">Generating 4 parallel candidate patches...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {candidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              isWinner={c.id === winningCandidateId}
              isSelected={c.id === selectedCandidateId}
              onSelect={() => onSelectCandidate(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
