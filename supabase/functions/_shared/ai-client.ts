import { z } from 'npm:zod@3.22.4';

/**
 * AI API client wrapper — primary: Qwen Cloud / DashScope (qwen-omni-turbo), fallback: OpenRouter
 * API keys:
 *   DASHSCOPE_API_KEY (https://www.alibabacloud.com/help/en/model-studio/get-api-key)
 *   OPENROUTER_API_KEY (https://openrouter.ai/keys)
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
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AICallOptions {
  model?: 'qwen' | 'openrouter';
  temperature?: number;
  max_tokens?: number;
}

const QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
// Text model — qwen-omni-turbo is multimodal and unreliable for strict JSON extraction.
const QWEN_MODEL = 'qwen-flash-character';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const OPENROUTER_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemini-2.0-flash-lite-preview-02-05:free',
];

export class AIClient {
  private openrouterApiKey: string;
  private dashscopeApiKey: string;

  constructor() {
    this.openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY') || '';
    this.dashscopeApiKey = Deno.env.get('DASHSCOPE_API_KEY') || '';
  }

  /**
   * Call AI API with JSON response format.
   * Always enforces JSON mode to ensure structured output.
   * Fallback chain: Qwen → OpenRouter
   */
  async callWithJson<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.Schema<T>,
    options: AICallOptions = {}
  ): Promise<T> {
    const { model = 'qwen', temperature = 0.7, max_tokens = 4096 } = options;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      if (model === 'openrouter') {
        try {
          return await this.callOpenRouter(messages, schema, temperature, max_tokens);
        } catch (orError: any) {
          console.warn('OpenRouter API failed, falling back to Qwen:', orError.message);
          return await this.callQwen(messages, schema, temperature, max_tokens);
        }
      } else {
        try {
          return await this.callQwen(messages, schema, temperature, max_tokens);
        } catch (qwenError: any) {
          console.warn('Qwen API failed, falling back to OpenRouter:', qwenError);
          return await this.callOpenRouter(messages, schema, temperature, max_tokens);
        }
      }
    } catch (error: any) {
      console.error(`All AI providers failed:`, error);
      throw error;
    }
  }

  private async callQwen<T>(
    messages: AIMessage[],
    schema: z.Schema<T>,
    temperature: number,
    maxTokens: number
  ): Promise<T> {
    let lastError: any = null;

    try {
      const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.dashscopeApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: QWEN_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        lastError = new Error(`Qwen API error: ${response.status} - ${errorData}`);
        throw lastError;
      }

      const data = (await response.json()) as AIResponse;
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Qwen API');
      }

      let parsed: unknown;
      try {
        // Extract JSON object robustly in case of surrounding text
        const startIndex = content.indexOf('{');
        const endIndex = content.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          parsed = JSON.parse(content.substring(startIndex, endIndex + 1));
        } else {
          parsed = JSON.parse(content);
        }
      } catch {
        throw new Error(`Invalid JSON from Qwen: ${content.substring(0, 200)}`);
      }

      try {
        return schema.parse(parsed);
      } catch (err: any) {
        // If Zod fails and parsed has a single root key, try unwrapping it
        if (err.name === 'ZodError' && typeof parsed === 'object' && parsed !== null) {
          const keys = Object.keys(parsed as object);
          if (keys.length === 1) {
            return schema.parse((parsed as any)[keys[0]]);
          }
        }
        throw err;
      }
    } catch (err: any) {
      lastError = err;
    }

    throw lastError || new Error('Qwen API call failed');
  }

  private async callOpenRouter<T>(
    messages: AIMessage[],
    schema: z.Schema<T>,
    temperature: number,
    maxTokens: number
  ): Promise<T> {
    const models = [...OPENROUTER_MODELS].sort(() => Math.random() - 0.5).slice(0, 3);
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
          if (response.status === 429) {
            console.warn(`Rate limited on ${model}, trying next model...`);
          }
          continue;
        }

        const data = (await response.json()) as AIResponse;
        const content = data.choices[0]?.message?.content;

        if (!content) {
          lastError = new Error(`Empty response from OpenRouter model ${model}`);
          continue;
        }

        let parsed: unknown;
        try {
          const startIndex = content.indexOf('{');
          const endIndex = content.lastIndexOf('}');
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            parsed = JSON.parse(content.substring(startIndex, endIndex + 1));
          } else {
            parsed = JSON.parse(content);
          }
        } catch {
          lastError = new Error(`Invalid JSON from OpenRouter (${model}): ${content.substring(0, 200)}`);
          continue;
        }

        try {
          return schema.parse(parsed);
        } catch (err: unknown) {
          if (
            err instanceof z.ZodError &&
            typeof parsed === 'object' &&
            parsed !== null
          ) {
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

    throw lastError || new Error('All OpenRouter models failed');
  }

  /**
   * Simple text completion (no JSON required)
   * Fallback chain: Qwen → OpenRouter
   */
  async callText(
    systemPrompt: string,
    userPrompt: string,
    options: AICallOptions = {}
  ): Promise<string> {
    const { model = 'qwen', temperature = 0.7, max_tokens = 4096 } = options;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      if (model === 'openrouter') {
        try {
          return await this.callOpenRouterText(messages, temperature, max_tokens);
        } catch (orError: any) {
          console.warn('OpenRouter text API failed, falling back to Qwen:', orError.message);
          return await this.callQwenText(messages, temperature, max_tokens);
        }
      } else {
        try {
          return await this.callQwenText(messages, temperature, max_tokens);
        } catch (qwenError: any) {
          console.warn('Qwen text API failed, falling back to OpenRouter:', qwenError.message);
          return await this.callOpenRouterText(messages, temperature, max_tokens);
        }
      }
    } catch (error: any) {
      console.error(`All AI text providers failed:`, error);
      throw error;
    }
  }

  private async callQwenText(
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const response = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.dashscopeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Qwen API error: ${response.status} - ${errorData}`);
    }

    const data = (await response.json()) as AIResponse;
    return data.choices[0]?.message?.content || '';
  }

  private async callOpenRouterText(
    messages: AIMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://interviewready.app',
        'X-Title': 'Interview Ready',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODELS[0],
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
    }

    const data = (await response.json()) as AIResponse;
    return data.choices[0]?.message?.content || '';
  }
}

export const aiClient = new AIClient();
