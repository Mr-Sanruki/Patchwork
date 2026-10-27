import React, { useState, useEffect, useRef } from 'react';
import { PipelineLog } from '../types';
import { Terminal, ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

interface LogDrawerProps {
  logs: PipelineLog[];
}

export const LogDrawer: React.FC<LogDrawerProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-md border-t border-surface-border">
      {/* Toggle Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between cursor-pointer hover:bg-surface-light/40 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          <span className="text-xs font-semibold text-gray-200">Execution Logs</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-surface-lighter text-gray-400 font-mono">
            {logs.length} events
          </span>
          {logs.length > 0 && (
            <span className="text-xs text-gray-500 font-mono hidden sm:inline truncate max-w-md">
              &mdash; {logs[logs.length - 1].message}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 text-gray-400 text-xs">
          <span>{isOpen ? 'Collapse' : 'Expand'}</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Logs Panel */}
      {isOpen && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 h-64 overflow-y-auto font-mono text-xs border-t border-surface-border bg-[#070b12]">
          {logs.length === 0 ? (
            <div className="text-gray-500 text-center py-8">Waiting for pipeline events...</div>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => {
                let badgeClass = 'text-brand-400 bg-brand-500/10 border-brand-500/30';
                if (log.level === 'warn') badgeClass = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
                if (log.level === 'error') badgeClass = 'text-red-400 bg-red-500/10 border-red-500/30';

                const time = new Date(log.timestamp).toLocaleTimeString();

                return (
                  <div key={log.id} className="flex items-start space-x-2 hover:bg-surface-light/20 py-0.5 px-1 rounded">
                    <span className="text-gray-600 select-none text-[11px]">{time}</span>
                    <span className={`text-[10px] uppercase font-bold px-1 rounded border ${badgeClass}`}>
                      {log.stage || 'SYS'}
                    </span>
                    <span className="text-gray-300 break-all">{log.message}</span>
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
