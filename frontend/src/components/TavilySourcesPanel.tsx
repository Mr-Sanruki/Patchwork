import React from 'react';
import { TavilySource } from '../types';
import { ExternalLink, Sparkles, BookOpen } from 'lucide-react';

interface TavilySourcesPanelProps {
  sources: TavilySource[];
}

export const TavilySourcesPanel: React.FC<TavilySourcesPanelProps> = ({ sources }) => {
  return (
    <div className="bg-surface rounded-3xl p-5 border border-surface-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-tavily/10 border border-tavily/30 flex items-center justify-center text-tavily">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-gray-100 flex items-center space-x-2">
              <span>Authoritative Documentation & Migration Guides</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-tavily/20 text-tavily border border-tavily/30 font-semibold">
                Tavily Extract
              </span>
            </h3>
            <p className="text-[11px] text-gray-400">
              Live crawled changelogs and breaking change documentation
            </p>
          </div>
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="py-6 text-center text-gray-500 text-xs">
          Searching Tavily for release notes and migration guides...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sources.map((src) => {
            const scorePercent = src.score ? Math.round(src.score * 100) : 95;
            return (
              <a
                key={src.id}
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="group block p-3 rounded-2xl bg-surface-light/40 border border-surface-border hover:border-tavily/40 transition-all hover:bg-surface-light"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-gray-200 group-hover:text-tavily transition-colors line-clamp-1">
                    {src.title}
                  </span>
                  <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-tavily/15 text-tavily border border-tavily/30 font-semibold">
                      {scorePercent}% Match
                    </span>
                    <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-tavily" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                  {src.snippet}
                </p>
                <div className="text-[10px] text-gray-500 font-mono mt-1.5 truncate">
                  {src.url}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};
