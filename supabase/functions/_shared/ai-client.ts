import { z } from 'npm:zod@3.22.4';

/**
 * AI API Client Wrapper with Dynamic Model Rotation & Automatic Fallback.
 *
 * Rotates across cost-effective, high-throughput models to sustain user influx,
 * save on AI credit costs, distribute token/request rate limits (RPM/TPM),
 * and provide zero-downtime automatic failover.
 *
 * Supported Models:
 *   - qwen-flash-character
 *   - deepseek-v4-pro-0813
 *   - qwen3.7-plus
 *   - qwen3.7-flash
 *   - qwen3.5-flash
 *   - qwen3-rerank
 *   - qwen-plus-character
 *   - qwen-flash
 *
 * Fallback Provider: OpenRouter (free/low-cost tier rotation)
 */

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AICallOptions {
  model?: 'qwen' | 'openrouter' | string;
  temperature?: number;
  max_tokens?: number;
  preferredModel?: string;
  isFreePlan?: boolean;
}

const QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

/**
 * Primary Model Pool for cost-effective, high-volume rotation.
 * Flash models are prioritized to optimize speed and credit sustainability.
 */
const ROTATING_MODELS = [
  'qwen-flash-character',
  'qwen-flash',
  'qwen3.7-flash',
  'qwen3.5-flash',
  'qwen-plus-character',
  'qwen3.7-plus',
  'deepseek-v4-pro-0813',
  'qwen3-rerank',
];

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemini-2.0-pro-exp-02-05:free',
  'deepseek/deepseek-chat',
];

export class AIClient {
  private openrouterApiKey: string;
  private dashscopeApiKey: string;
  private static rotationCounter = 0;

  constructor() {
    this.openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY') || '';
    this.dashscopeApiKey = Deno.env.get('DASHSCOPE_API_KEY') || '';
  }

  /**
   * Get an ordered list of models for the current request, starting from the
   * next model in the round-robin sequence to evenly distribute traffic.
   */
  private getRotatedModelList(preferredModel?: string): string[] {
    if (preferredModel && ROTATING_MODELS.includes(preferredModel)) {
      const others = ROTATING_MODELS.filter(m => m !== preferredModel);
      return [preferredModel, ...others];
    }

    const startIndex = (AIClient.rotationCounter++) % ROTATING_MODELS.length;
    const rotated = [
      ...ROTATING_MODELS.slice(startIndex),
      ...ROTATING_MODELS.slice(0, startIndex),
    ];
    return rotated;
  }

  /**
   * Call AI API with JSON response format.
   * Rotates through models on DashScope; falls back to OpenRouter on failure.
   */
  async callWithJson<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.Schema<T>,
    options: AICallOptions = {}
  ): Promise<T> {
    const {
      model = 'qwen',
      temperature = 0.7,
      max_tokens = 4096,
      preferredModel,
    } = options;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    if (model === 'openrouter') {
      return await this.callOpenRouter(messages, schema, temperature, max_tokens);
    }

    try {
      return await this.callQwenWithRotation(messages, schema, temperature, max_tokens, preferredModel);
    } catch (qwenError: any) {
      console.warn('All Qwen rotating models failed, falling back to OpenRouter:', qwenError?.message);
      return await this.callOpenRouter(messages, schema, temperature, max_tokens);
    }
  }

  /**
   * Attempt Qwen models in rotated order until one succeeds or all fail.
   */
  private async callQwenWithRotation<T>(
    messages: AIMessage[],
    schema: z.Schema<T>,
    temperature: number,
    maxTokens: number,
    preferredModel?: string
  ): Promise<T> {
    const modelCandidates = this.getRotatedModelList(preferredModel);
    let lastError: any = null;

    for (const currentModel of modelCandidates) {
      try {
        const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.dashscopeApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: currentModel,
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.warn(`[AIClient] Model ${currentModel} returned ${response.status}: ${errorData.substring(0, 150)}`);

          // If rate limited or unavailable, try the next model in rotation
          if (response.status === 429 || response.status >= 500 || response.status === 404) {
            lastError = new Error(`Model ${currentModel} error (${response.status}): ${errorData}`);
            continue;
          }

          throw new Error(`Qwen API error on ${currentModel}: ${response.status} - ${errorData}`);
        }

        const data = (await response.json()) as AIResponse;
        const content = data.choices[0]?.message?.content;

        if (!content) {
          console.warn(`[AIClient] Empty response from ${currentModel}, rotating...`);
          lastError = new Error(`Empty response from ${currentModel}`);
          continue;
        }

        // Clean and parse JSON
        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        let parsed: unknown;
        try {
          const startIndex = cleanContent.indexOf('{');
          const endIndex = cleanContent.lastIndexOf('}');
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            parsed = JSON.parse(cleanContent.substring(startIndex, endIndex + 1));
          } else {
            parsed = JSON.parse(cleanContent);
          }
        } catch {
          console.warn(`[AIClient] Invalid JSON from ${currentModel}, rotating...`);
          lastError = new Error(`Invalid JSON from ${currentModel}`);
          continue;
        }

        try {
          return schema.parse(parsed);
        } catch (err: any) {
          if (err.name === 'ZodError' && typeof parsed === 'object' && parsed !== null) {
            const keys = Object.keys(parsed as object);
            if (keys.length === 1) {
              return schema.parse((parsed as any)[keys[0]]);
            }
          }
          console.warn(`[AIClient] Schema validation failed on ${currentModel}, rotating...`);
          lastError = err;
          continue;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AIClient] Exception with model ${currentModel}:`, err?.message);
      }
    }

    throw lastError || new Error('All rotating Qwen models failed');
  }

  /**
   * Fallback OpenRouter JSON caller
   */
  private async callOpenRouter<T>(
    messages: AIMessage[],
    schema: z.Schema<T>,
    temperature: number,
    maxTokens: number
  ): Promise<T> {
    const models = [...OPENROUTER_MODELS].sort(() => Math.random() - 0.5);
    let lastError: Error | null = null;

    for (const model of models) {
      try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://interviewready.app',
            'X-Title': 'Interview Ready',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          lastError = new Error(`OpenRouter API error (${model}): ${response.status} - ${errorData}`);
          continue;
        }

        const data = (await response.json()) as AIResponse;
        const content = data.choices[0]?.message?.content;

        if (!content) {
          lastError = new Error(`Empty response from OpenRouter model ${model}`);
          continue;
        }

        let cleanContent = content.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        let parsed: unknown;
        try {
          const startIndex = cleanContent.indexOf('{');
          const endIndex = cleanContent.lastIndexOf('}');
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            parsed = JSON.parse(cleanContent.substring(startIndex, endIndex + 1));
          } else {
            parsed = JSON.parse(cleanContent);
          }
        } catch {
          lastError = new Error(`Invalid JSON from OpenRouter (${model})`);
          continue;
        }

        try {
          return schema.parse(parsed);
        } catch (err: unknown) {
          if (err instanceof z.ZodError && typeof parsed === 'object' && parsed !== null) {
            const keys = Object.keys(parsed as object);
            if (keys.length === 1) {
              return schema.parse((parsed as Record<string, unknown>)[keys[0]]);
            }
          }
          lastError = err instanceof Error ? err : new Error(String(err));
          continue;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw lastError || new Error('All OpenRouter fallback models failed');
  }

  /**
   * Plain text completion with model rotation.
   */
  async callText(
    systemPrompt: string,
    userPrompt: string,
    options: AICallOptions = {}
  ): Promise<string> {
    const {
      model = 'qwen',
      temperature = 0.7,
      max_tokens = 4096,
      preferredModel,
    } = options;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    if (model === 'openrouter') {
      try {
        return await this.callOpenRouterText(messages, temperature, max_tokens);
      } catch {
        return await this.callQwenTextWithRotation(messages, temperature, max_tokens, preferredModel);
      }
    }

    try {
      return await this.callQwenTextWithRotation(messages, temperature, max_tokens, preferredModel);
    } catch (qwenError: any) {
      console.warn('All Qwen rotating text models failed, falling back to OpenRouter:', qwenError?.message);
      return await this.callOpenRouterText(messages, temperature, max_tokens);
    }
  }

  private async callQwenTextWithRotation(
    messages: AIMessage[],
    temperature: number,
    maxTokens: number,
    preferredModel?: string
  ): Promise<string> {
    const modelCandidates = this.getRotatedModelList(preferredModel);
    let lastError: any = null;

    for (const currentModel of modelCandidates) {
      try {
        const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.dashscopeApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: currentModel,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          if (response.status === 429 || response.status >= 500 || response.status === 404) {
            lastError = new Error(`Model ${currentModel} error (${response.status}): ${errorData}`);
            continue;
          }
          throw new Error(`Qwen API error on ${currentModel}: ${response.status} - ${errorData}`);
        }

        const data = (await response.json()) as AIResponse;
        const text = data.choices[0]?.message?.content || '';
        if (text) return text;
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('All rotating Qwen text models failed');
  }

  private async callOpenRouterText(
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const models = [...OPENROUTER_MODELS].sort(() => Math.random() - 0.5);
    let lastError: any = null;

    for (const model of models) {
      try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://interviewready.app',
            'X-Title': 'Interview Ready',
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          lastError = new Error(`OpenRouter API error (${model}): ${response.status} - ${errorData}`);
          continue;
        }

        const data = (await response.json()) as AIResponse;
        return data.choices[0]?.message?.content || '';
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('All OpenRouter text models failed');
  }
}

export const aiClient = new AIClient();
