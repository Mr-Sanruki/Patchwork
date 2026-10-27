import { env } from '../../config/env.js';
import { TavilySource } from '../../types/index.js';

export interface TavilySearchResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
  rawContent?: string;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResultItem[];
}

export interface TavilyExtractResponse {
  results: Array<{
    url: string;
    raw_content: string;
  }>;
  failed_results?: Array<{
    url: string;
    error: string;
  }>;
}

export interface MigrationResearchResult {
  sources: Omit<TavilySource, 'id' | 'jobId' | 'createdAt'>[];
  summaryExcerpt: string;
  isLive: boolean;
}

export class TavilyClient {
  private apiKey: string;
  private baseUrl = 'https://api.tavily.com';

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? env.TAVILY_API_KEY;
  }

  get isConfigured(): boolean {
    return Boolean(
      this.apiKey &&
      this.apiKey.trim() !== '' &&
      !this.apiKey.includes('your_tavily')
    );
  }

  /**
   * Search via Tavily Search API.
   */
  async search(
    query: string,
    options: {
      searchDepth?: 'basic' | 'advanced';
      includeDomains?: string[];
      maxResults?: number;
    } = {}
  ): Promise<TavilySearchResultItem[]> {
    if (!this.isConfigured) {
      return this.getFallbackSearchResults(query);
    }

    try {
      const res = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          query,
          search_depth: options.searchDepth ?? 'advanced',
          include_domains: options.includeDomains,
          max_results: options.maxResults ?? 5,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`⚠️ Tavily Search returned ${res.status}: ${errorText}. Using fallback.`);
        return this.getFallbackSearchResults(query);
      }

      const data = (await res.json()) as TavilySearchResponse;
      return (data.results || []).map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      }));
    } catch (err) {
      console.warn('⚠️ Tavily Search failed with network error, using fallback:', err);
      return this.getFallbackSearchResults(query);
    }
  }

  /**
   * Extract deep page content via Tavily Extract API.
   */
  async extract(urls: string[]): Promise<Record<string, string>> {
    if (!this.isConfigured || urls.length === 0) {
      return {};
    }

    try {
      const res = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          urls: urls.slice(0, 3), // limit to top 3 for speed and tokens
        }),
      });

      if (!res.ok) {
        return {};
      }

      const data = (await res.json()) as TavilyExtractResponse;
      const extracted: Record<string, string> = {};
      for (const item of data.results || []) {
        if (item.url && item.raw_content) {
          extracted[item.url] = item.raw_content.slice(0, 4000); // Trim to 4000 chars
        }
      }
      return extracted;
    } catch (err) {
      console.warn('⚠️ Tavily Extract failed:', err);
      return {};
    }
  }

  /**
   * Execute end-to-end research step for a package upgrade.
   * Discovers migration guides, release notes, and breaking changes.
   */
  async researchMigration(
    packageName: string,
    fromVersion: string,
    toVersion: string
  ): Promise<MigrationResearchResult> {
    const isLive = this.isConfigured;
    const query = `${packageName} migration guide ${fromVersion} to ${toVersion} breaking changes changelog`;

    // 1. Search Tavily for official documentation
    const searchResults = await this.search(query, {
      searchDepth: 'advanced',
      includeDomains: ['github.com', 'npmjs.com', 'nodejs.org', 'eslint.org', 'expressjs.com'],
      maxResults: 4,
    });

    // 2. Extract deep content from the top URL if available
    let deepContent = '';
    const topGithubUrl = searchResults.find((r) => r.url.includes('github.com'))?.url;
    if (topGithubUrl && this.isConfigured) {
      const extracted = await this.extract([topGithubUrl]);
      if (extracted[topGithubUrl]) {
        deepContent = extracted[topGithubUrl];
      }
    }

    // 3. Format sources
    const sources = searchResults.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      score: r.score ?? 0.9,
    }));

    // 4. Build compact markdown excerpt for Nemotron triage
    const summaryExcerpt = [
      `### Official Migration Notes for ${packageName} (${fromVersion} -> ${toVersion})`,
      deepContent ? `#### Extracted Changelog Details:\n${deepContent.slice(0, 1500)}` : '',
      `#### Key Excerpts from Search:`,
      ...searchResults.slice(0, 3).map((s) => `- **${s.title}** (${s.url}):\n  ${s.content}`),
    ]
      .filter(Boolean)
      .join('\n\n');

    return {
      sources,
      summaryExcerpt,
      isLive,
    };
  }

  /**
   * Curated high-fidelity fallback documentation for reproducible benchmarks and offline hackathon testing.
   */
  private getFallbackSearchResults(query: string): TavilySearchResultItem[] {
    const lower = query.toLowerCase();

    if (lower.includes('chalk')) {
      return [
        {
          title: 'Chalk v5.0.0 Release Notes & ESM Migration',
          url: 'https://github.com/chalk/chalk/releases/tag/v5.0.0',
          content: 'Chalk 5 is pure ESM. You cannot require() it. Use import or dynamic import(). Node.js 12.20+ required. Removed .keyword(), .rgb(), .hsl() methods; use standard color functions.',
          score: 0.98,
        },
        {
          title: 'Sindre Sorhus - Pure ESM Package Guide',
          url: 'https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c',
          content: 'How to migrate a project to ESM when dependencies like chalk, node-fetch become ESM-only: add "type": "module" in package.json, update import paths to include extensions, replace require with import.',
          score: 0.94,
        },
      ];
    }

    if (lower.includes('node-fetch')) {
      return [
        {
          title: 'node-fetch v3.0.0 - Pure ESM Migration Guide',
          url: 'https://github.com/node-fetch/node-fetch/releases/tag/v3.0.0',
          content: 'node-fetch v3 is an ESM-only module - you are not able to import it with require(). If you cannot switch to ESM, please keep using node-fetch v2.x. response.buffer() replaced by response.arrayBuffer().',
          score: 0.97,
        },
        {
          title: 'Migrating node-fetch 2 to 3',
          url: 'https://github.com/node-fetch/node-fetch/blob/main/docs/v3-UPGRADE-GUIDE.md',
          content: 'Upgrade Guide: node-fetch 3.x drops CommonJS support. Must use import fetch from "node-fetch". Headers and Request objects conform to standard Fetch API.',
          score: 0.95,
        },
      ];
    }

    if (lower.includes('express')) {
      return [
        {
          title: 'Express 5.0 Migration Guide',
          url: 'https://expressjs.com/en/guide/migrating-5.html',
          content: 'Express 5.0 changes: rejected promises in route handlers and middleware are now automatically caught and forwarded to error handlers. app.del() removed in favor of app.delete(). res.redirect() url required.',
          score: 0.99,
        },
        {
          title: 'Express v5 Release Notes',
          url: 'https://github.com/expressjs/express/blob/master/History.md',
          content: 'Breaking changes in 5.0: path-to-regexp 0.1.7 -> modern syntax. Wildcard route syntax changes (* instead of /*). req.param() helper method removed; use req.params, req.body, or req.query directly.',
          score: 0.96,
        },
      ];
    }

    if (lower.includes('commander')) {
      return [
        {
          title: 'Commander.js Changelog and Migration',
          url: 'https://github.com/tj/commander.js/blob/master/CHANGELOG.md',
          content: 'Breaking changes: program.opts() must be called to retrieve parsed options instead of accessing properties directly on program object (e.g. program.opts().port instead of program.port).',
          score: 0.97,
        },
      ];
    }

    if (lower.includes('eslint')) {
      return [
        {
          title: 'ESLint v9 Migration Guide (Flat Config)',
          url: 'https://eslint.org/docs/latest/use/migrate-to-9.0.0',
          content: 'ESLint 9 default is Flat Config (eslint.config.js) replacing .eslintrc.* legacy format. FlatCompat helper can wrap legacy plugins. Formatter APIs updated.',
          score: 0.99,
        },
      ];
    }

    return [
      {
        title: `Official Upgrade Guide for ${query.slice(0, 30)}`,
        url: 'https://github.com/topics/migration-guide',
        content: 'Changelog and breaking change documentation for package upgrade. Review API signatures, peer dependencies, and runtime constraints.',
        score: 0.85,
      },
    ];
  }
}
