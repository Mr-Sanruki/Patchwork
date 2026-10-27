import { describe, it, expect } from 'vitest';
import { TavilyClient } from '../services/tavily/tavily-client.js';

describe('Tavily Search & Extract Service', () => {
  it('executes migration research and returns structured sources', async () => {
    const client = new TavilyClient();
    const result = await client.researchMigration('chalk', '4.1.2', '5.3.0');

    expect(result).toBeDefined();
    expect(result.sources.length).toBeGreaterThan(0);
    expect(result.summaryExcerpt).toContain('chalk');
    expect(result.summaryExcerpt.toLowerCase()).toContain('esm');

    const firstSource = result.sources[0];
    expect(firstSource.title).toBeDefined();
    expect(firstSource.url).toContain('http');
    expect(firstSource.snippet).toBeDefined();
    expect(firstSource.score).toBeGreaterThan(0.8);
  });

  it('provides tailored migration docs for node-fetch and express', async () => {
    const client = new TavilyClient();

    const nodeFetchResult = await client.researchMigration('node-fetch', '2.6.7', '3.3.2');
    expect(nodeFetchResult.summaryExcerpt.toLowerCase()).toContain('esm');

    const expressResult = await client.researchMigration('express', '4.18.2', '5.0.0');
    expect(expressResult.summaryExcerpt.toLowerCase()).toContain('express');
  });

  it('extract handles empty or invalid URLs gracefully', async () => {
    const client = new TavilyClient();
    const extracted = await client.extract([]);
    expect(extracted).toEqual({});
  });
});
