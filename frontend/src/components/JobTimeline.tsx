import React from 'react';
import { CheckCircle2, Circle, Clock, AlertTriangle, Loader2 } from 'lucide-react';
import { JobStatus } from '../types';

interface JobTimelineProps {
  status: JobStatus;
}

const STAGES = [
  { key: 'baseline', label: '1. Baseline', stages: ['cloning', 'baselining'] },
  { key: 'break', label: '2. Upgrade & Break', stages: ['breaking'] },
  { key: 'research', label: '3. Tavily Docs', stages: ['researching'] },
  { key: 'triage', label: '4. Nemotron Nano', stages: ['triaging'] },
  { key: 'candidates', label: '5. Super Candidates', stages: ['generating_candidates', 'repairing'] },
  { key: 'testing', label: '6. Sandbox Race', stages: ['testing_candidates', 'selecting'] },
  { key: 'review', label: '7. Ultra Review & PR', stages: ['reviewing', 'completed'] },
];

export const JobTimeline: React.FC<JobTimelineProps> = ({ status }) => {
  const getStageState = (stageKeys: string[]) => {
    const stageIndex = STAGES.findIndex((s) => s.stages.includes(status));
    const thisIndex = STAGES.findIndex((s) => s.stages === stageKeys);

    if (status === 'completed') return 'completed';
    if (status === 'failed' && thisIndex === stageIndex) return 'failed';

    if (thisIndex < stageIndex) return 'completed';
    if (thisIndex === stageIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full bg-surface/80 rounded-2xl p-4 border border-surface-border backdrop-blur-sm">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STAGES.map((stage) => {
          const state = getStageState(stage.stages);

          let borderClass = 'border-surface-border text-gray-500 bg-surface/30';
          let icon = <Circle className="w-4 h-4 text-gray-600" />;

          if (state === 'completed') {
            borderClass = 'border-success/30 text-success bg-success/5';
            icon = <CheckCircle2 className="w-4 h-4 text-success" />;
          } else if (state === 'active') {
            borderClass = 'border-brand-500 text-brand-400 bg-brand-500/10 shadow-lg shadow-brand-500/10';
            icon = <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />;
          } else if (state === 'failed') {
            borderClass = 'border-danger/30 text-danger bg-danger/10';
            icon = <AlertTriangle className="w-4 h-4 text-danger" />;
          }

          return (
            <div
              key={stage.key}
              className={`flex items-center space-x-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${borderClass}`}
            >
              <div className="flex-shrink-0">{icon}</div>
              <span className="truncate">{stage.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
