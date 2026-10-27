import { env } from '../../config/env.js';
import { estimateCostUsd } from './pricing.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' | 'text' };
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    costUsd: number;
  };
}

export interface DiscoveredModels {
  nano: string;
  super: string;
  ultra: string;
  allModels: string[];
  isLive: boolean;
}

export class NebiusTokenFactoryClient {
  private apiKey: string;
  private baseUrl: string;
  private maxRetries: number;
  private cachedModels: DiscoveredModels | null = null;

  constructor(apiKey?: string, baseUrl?: string, maxRetries = 3) {
    this.apiKey = apiKey ?? env.NEBIUS_API_KEY;
    this.baseUrl = (baseUrl ?? env.NEBIUS_BASE_URL).replace(/\/$/, '');
    this.maxRetries = maxRetries;
  }

  get isConfigured(): boolean {
    return Boolean(
      this.apiKey &&
      this.apiKey.trim() !== '' &&
      !this.apiKey.includes('your_nebius_api_key_here')
    );
  }

  /**
   * Query GET /v1/models at runtime to discover active Nebius Token Factory models.
   */
  async listModels(): Promise<string[]> {
    if (!this.isConfigured) {
      return [
        env.NEMOTRON_NANO_MODEL,
        env.NEMOTRON_SUPER_MODEL,
        env.NEMOTRON_ULTRA_MODEL,
      ];
    }

    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to list models from Nebius Token Factory: ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as { data?: Array<{ id: string }> };
      if (Array.isArray(data.data)) {
        return data.data.map((m) => m.id);
      }
      return [];
    } catch (err) {
      console.warn('⚠️ Nebius Token Factory /models discovery failed, falling back to configured env models:', err);
      return [
        env.NEMOTRON_NANO_MODEL,
        env.NEMOTRON_SUPER_MODEL,
        env.NEMOTRON_ULTRA_MODEL,
      ];
    }
  }

  /**
   * Discover and map the 3 model tiers (Nano, Super, Ultra) dynamically.
   */
  async discoverModels(forceRefresh = false): Promise<DiscoveredModels> {
    if (this.cachedModels && !forceRefresh) {
      return this.cachedModels;
    }

    const allModels = await this.listModels();
    const isLive = this.isConfigured && allModels.length > 3;

    // Smart tier selection based on runtime listing or env configuration
    let nano = env.NEMOTRON_NANO_MODEL;
    let superModel = env.NEMOTRON_SUPER_MODEL;
    let ultra = env.NEMOTRON_ULTRA_MODEL;

    // Search for Nemotron candidates in returned models
    const nemotronModels = allModels.filter((m) => m.toLowerCase().includes('nemotron'));

    if (nemotronModels.length > 0) {
      // Find Nano: e.g. mini or 4b/8b
      const miniMatch = nemotronModels.find((m) => m.toLowerCase().includes('mini') || m.toLowerCase().includes('4b'));
      if (miniMatch) nano = miniMatch;

      // Find Super: 70b
      const superMatch = nemotronModels.find((m) => m.toLowerCase().includes('70b'));
      if (superMatch) superModel = superMatch;

      // Find Ultra: 340b or large instruction tuned
      const ultraMatch = nemotronModels.find((m) => m.toLowerCase().includes('340b') || m.toLowerCase().includes('reward') === false && m.toLowerCase().includes('70b'));
      if (ultraMatch) ultra = ultraMatch;
    }

    this.cachedModels = {
      nano,
      super: superModel,
      ultra,
      allModels,
      isLive,
    };

    return this.cachedModels;
  }

  /**
   * Execute chat completion with exponential backoff retries.
   */
  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
    if (!this.isConfigured) {
      return this.getSimulatedResponse(options);
    }

    let lastError: Error | null = null;
    let delay = 1000;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const payload: Record<string, unknown> = {
          model: options.model,
          messages: options.messages,
          temperature: options.temperature ?? 0.2,
        };

        if (options.max_tokens) {
          payload.max_tokens = options.max_tokens;
        }

        if (options.response_format) {
          payload.response_format = options.response_format;
        }

        const res = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.status === 429 || res.status >= 500) {
          const errorText = await res.text();
          console.warn(`[Nebius Token Factory] Attempt ${attempt} failed with ${res.status}: ${errorText}. Retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Nebius Token Factory error ${res.status}: ${errorText}`);
        }

        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };

        const content = data.choices?.[0]?.message?.content || '';
        const promptTokens = data.usage?.prompt_tokens || 100;
        const completionTokens = data.usage?.completion_tokens || 100;
        const totalTokens = data.usage?.total_tokens || promptTokens + completionTokens;
        const costUsd = estimateCostUsd(options.model, promptTokens, completionTokens);

        return {
          content,
          model: options.model,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens,
            costUsd,
          },
        };
      } catch (err) {
        lastError = err as Error;
        if (attempt === this.maxRetries) break;
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2;
      }
    }

    throw new Error(`Failed to complete chat with Nebius Token Factory after ${this.maxRetries} attempts: ${lastError?.message}`);
  }

  // --- Tier Routing Helpers ---

  /**
   * Tier 1: Nano for fast triage & breaking change analysis.
   */
  async triageWithNano(systemPrompt: string, userPrompt: string): Promise<ChatCompletionResult> {
    const models = await this.discoverModels();
    return this.chatCompletion({
      model: models.nano,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });
  }

  /**
   * Tier 2: Super for candidate patch generation & repair iterations.
   */
  async generateCandidateWithSuper(
    systemPrompt: string,
    userPrompt: string,
    temperature = 0.3
  ): Promise<ChatCompletionResult> {
    const models = await this.discoverModels();
    return this.chatCompletion({
      model: models.super,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
    });
  }

  /**
   * Tier 3: Ultra for final review, risk assessment, and PR description.
   */
  async reviewWithUltra(systemPrompt: string, userPrompt: string): Promise<ChatCompletionResult> {
    const models = await this.discoverModels();
    return this.chatCompletion({
      model: models.ultra,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    });
  }

  /**
   * Graceful fallback simulator when NEBIUS_API_KEY is not yet provided.
   * Ensures UI demos, test suites, and mock trials can run seamlessly without throwing fatal crashes.
   */
  private getSimulatedResponse(options: ChatCompletionOptions): ChatCompletionResult {
    const promptTokens = 250;
    const completionTokens = 350;
    const totalTokens = promptTokens + completionTokens;
    const costUsd = estimateCostUsd(options.model, promptTokens, completionTokens);

    let content = '';
    const userMessage = options.messages.find((m) => m.role === 'user')?.content || '';

    if (userMessage.includes('triage') || userMessage.includes('breaking changes') || options.response_format?.type === 'json_object') {
      content = JSON.stringify({
        summary: 'Detected breaking upgrade requiring migration.',
        affectedFiles: ['package.json', 'src/index.js'],
        breakingChanges: [
          'Package migrated from CommonJS to pure ESM',
          'Synchronous functions converted to async or signature updated',
        ],
        riskLevel: 'LOW',
      });
    } else if (userMessage.includes('unified diff') || userMessage.includes('candidate patch')) {
      content = `--- a/package.json
+++ b/package.json
@@ -10,3 +10,3 @@
   "type": "module"
 }
`;
    } else {
      content = `### Summary of Upgrade
Autonomous migration generated and verified through isolated sandbox execution.
- Breaking changes resolved
- Test suite passing cleanly
- Verified risk level: LOW
`;
    }

    return {
      content,
      model: options.model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        costUsd,
      },
    };
  }
}
