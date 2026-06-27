import { z } from 'npm:zod@3.22.4';

/**
 * AI API client wrapper prioritizing OpenRouter with fallback support
 */

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface AICallOptions {
  model?: 'openrouter' | 'groq';
  temperature?: number;
  max_tokens?: number;
}

export class AIClient {
  private groqApiKey: string;
  private openrouterApiKey: string;

  constructor() {
    this.groqApiKey = Deno.env.get('GROQ_API_KEY') || '';
    this.openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY') || '';
  }

  /**
   * Call AI API with JSON response format
   * Always enforces JSON mode to ensure structured output
   */
  async callWithJson<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.Schema<T>,
    options: AICallOptions = {}
  ): Promise<T> {
    const { model = 'openrouter', temperature = 0.7, max_tokens = 4000 } = options;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      if (model === 'openrouter') {
        return await this.callOpenRouter(messages, schema, temperature, max_tokens);
      } else {
        return await this.callGroq(messages, schema, temperature, max_tokens);
      }
    } catch (error: any) {
      console.error(`${model} API failed:`, error);
      throw error;
    }
  }

  private async callGroq<T>(
    messages: AIMessage[],
    schema: z.Schema<T>,
    temperature: number,
    maxTokens: number
  ): Promise<T> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorData}`);
    }

    const data = (await response.json()) as AIResponse;
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Groq API');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`Invalid JSON from Groq: ${content.substring(0, 200)}`);
    }

    return schema.parse(parsed);
  }

  private async callOpenRouter<T>(
    messages: AIMessage[],
    schema: z.Schema<T>,
    temperature: number,
    maxTokens: number
  ): Promise<T> {
    const baseModels = [
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'poolside/laguna-m.1:free',
      'nvidia/nemotron-3-super-120b-a12b:free',
      'openai/gpt-oss-120b:free',
      'google/gemma-4-31b-it:free',
      'liquid/lfm-2.5-1.2b-thinking:free',
      'meta-llama/llama-3.3-70b-instruct:free',
    ];

    // Alternate requests by shuffling the array, but ONLY attempt up to 3 models per invocation
    // to prevent exceeding the edge function WORKER_RESOURCE_LIMIT
    const models = [...baseModels].sort(() => Math.random() - 0.5).slice(0, 3);

    let lastError: any = null;

    for (const model of models) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.openrouterApiKey}`,
            'Content-Type': 'application/json',
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
          lastError = new Error(`OpenRouter API error: ${response.status} - ${errorData}`);
          
          if (response.status === 429) {
            console.warn(`Rate limited on ${model}. Trying next model...`);
          }
          continue; // Try next model
        }

        const data = (await response.json()) as AIResponse;
        const content = data.choices[0]?.message?.content;

        if (!content) {
          lastError = new Error('Empty response from OpenRouter API');
          continue; // Try next model
        }

        let parsed: unknown;
        try {
          // Find the first { and the last } to extract only the JSON object
          const startIndex = content.indexOf('{');
          const endIndex = content.lastIndexOf('}');
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            const jsonStr = content.substring(startIndex, endIndex + 1);
            parsed = JSON.parse(jsonStr);
          } else {
            parsed = JSON.parse(content);
          }
        } catch {
          lastError = new Error(`Invalid JSON from OpenRouter: ${content.substring(0, 200)}`);
          continue; // Try next model
        }

        return schema.parse(parsed); // Success!
      } catch (err: any) {
        // Fallback: If Zod fails and parsed has a single root key, try unwrapping it
        if (err.name === 'ZodError' && typeof parsed === 'object' && parsed !== null) {
          const keys = Object.keys(parsed);
          if (keys.length === 1) {
            try {
              return schema.parse((parsed as any)[keys[0]]);
            } catch (innerErr) {
              lastError = innerErr;
              continue;
            }
          }
        }
        
        lastError = err;
        // Continue to next model on network error
      }
    }

  throw lastError || new Error('All OpenRouter fallback models failed');
}

  /**
   * Simple text completion (no JSON required)
   */
  async callText(
    systemPrompt: string,
    userPrompt: string,
    options: AICallOptions = {}
  ): Promise<string> {
    const { model = 'openrouter', temperature = 0.7, max_tokens = 4000 } = options;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      if (model === 'openrouter') {
        const models = [
          'meta-llama/llama-3.2-3b-instruct:free',
          'google/gemma-4-31b-it:free',
          'openai/gpt-oss-20b:free',
          'nvidia/nemotron-3-nano-30b-a3b:free',
          'liquid/lfm-2.5-1.2b-thinking:free',
        ];
        let lastError: any = null;

        for (const apiModel of models) {
          try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.openrouterApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: apiModel,
                messages,
                temperature,
                max_tokens,
              }),
            });

            if (!response.ok) {
              lastError = new Error(`OpenRouter API error: ${response.status}`);
              continue; // Try next model
            }

            const data = (await response.json()) as AIResponse;
            const content = data.choices[0]?.message?.content;
            if (content) return content;
          } catch (err) {
            lastError = err;
          }
        }
        throw lastError || new Error('All OpenRouter fallback models failed');
      } else {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages,
            temperature,
            max_tokens,
          }),
        });

        if (!response.ok) {
          throw new Error(`Groq API error: ${response.status}`);
        }

        const data = (await response.json()) as AIResponse;
        return data.choices[0]?.message?.content || '';
      }
    } catch (error: any) {
      console.error(`${model} text API failed:`, error);
      throw error;
    }
  }
}

export const aiClient = new AIClient();
