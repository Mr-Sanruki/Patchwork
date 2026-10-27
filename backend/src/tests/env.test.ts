import { describe, it, expect } from 'vitest';
import { getSanitizedConfig } from '../config/env.js';

describe('Environment and Config', () => {
  it('returns sanitized configuration without exposing raw keys', () => {
    const config = getSanitizedConfig();

    expect(config).toBeDefined();
    expect(config.port).toBeTypeOf('number');
    expect(config.models.nano).toBeDefined();
    expect(config.models.super).toBeDefined();
    expect(config.models.ultra).toBeDefined();
    expect(config.integrations).toBeDefined();
    expect(config.integrations.hasNebiusApiKey).toBeTypeOf('boolean');
    expect(config.integrations.hasTavilyApiKey).toBeTypeOf('boolean');

    // Assure no API key string exists in sanitized config
    const serialized = JSON.stringify(config);
    expect(serialized).not.toContain('tvly-');
    expect(serialized).not.toContain('Bearer');
  });
});
