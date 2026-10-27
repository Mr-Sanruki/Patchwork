export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

// Approximate Nebius Token Factory pricing per million tokens (USD)
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Nano tier (e.g. 4B - 8B)
  'nvidia/nemotron-mini-4b-instruct': { inputPerMillion: 0.10, outputPerMillion: 0.10 },
  'meta-llama/Meta-Llama-3.1-8B-Instruct': { inputPerMillion: 0.15, outputPerMillion: 0.15 },
  'nano': { inputPerMillion: 0.15, outputPerMillion: 0.15 },

  // Super tier (70B Nemotron)
  'nvidia/Llama-3.1-Nemotron-70B-Instruct-HF': { inputPerMillion: 0.60, outputPerMillion: 0.80 },
  'meta-llama/Meta-Llama-3.1-70B-Instruct': { inputPerMillion: 0.70, outputPerMillion: 0.90 },
  'super': { inputPerMillion: 0.60, outputPerMillion: 0.80 },

  // Ultra tier (340B or large reasoning models)
  'nvidia/nemotron-4-340b-instruct': { inputPerMillion: 2.00, outputPerMillion: 6.00 },
  'ultra': { inputPerMillion: 1.50, outputPerMillion: 3.00 },
};

export function estimateCostUsd(modelId: string, promptTokens: number, completionTokens: number): number {
  let pricing = MODEL_PRICING[modelId];

  if (!pricing) {
    // Check if model contains indicators
    const lower = modelId.toLowerCase();
    if (lower.includes('mini') || lower.includes('8b') || lower.includes('4b')) {
      pricing = MODEL_PRICING['nano'];
    } else if (lower.includes('340b') || lower.includes('ultra') || lower.includes('405b')) {
      pricing = MODEL_PRICING['ultra'];
    } else {
      // Default to 70B super tier
      pricing = MODEL_PRICING['super'];
    }
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPerMillion;

  return Number((inputCost + outputCost).toFixed(6));
}
