import { z } from 'npm:zod@3.22.4';

/**
 * AI API client wrapper — primary: Qwen Cloud / DashScope (qwen-omni-turbo), fallback: Groq
 * API key: DASHSCOPE_API_KEY (https://www.alibabacloud.com/help/en/model-studio/get-api-key)
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
  model?: 'qwen' | 'groq';
  temperature?: number;
  max_tokens?: number;
}

const QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const QWEN_MODEL = 'qwen-omni-turbo';

export class AIClient {
  private groqApiKey: string;
  private dashscopeApiKey: string;

  constructor() {
    this.groqApiKey = Deno.env.get('GROQ_API_KEY') || '';
    this.dashscopeApiKey = Deno.env.get('DASHSCOPE_API_KEY') || '';
  }

  /**
   * Call AI API with JSON response format.
   * Always enforces JSON mode to ensure structured output.
   */
  async callWithJson<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: z.Schema<T>,
    options: AICallOptions = {}
  ): Promise<T> {
    const { model = 'qwen', temperature = 0.7, max_tokens = 4000 } = options;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      if (model === 'qwen') {
        return await this.callQwen(messages, schema, temperature, max_tokens);
      } else {
        return await this.callGroq(messages, schema, temperature, max_tokens);
      }
    } catch (error: any) {
      console.error(`${model} API failed:`, error);
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

  /**
   * Simple text completion (no JSON required)
   */
  async callText(
    systemPrompt: string,
    userPrompt: string,
    options: AICallOptions = {}
  ): Promise<string> {
    const { model = 'qwen', temperature = 0.7, max_tokens = 4000 } = options;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    try {
      if (model === 'qwen') {
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
            max_tokens,
          }),
        });

        if (!response.ok) {
          throw new Error(`Qwen API error: ${response.status}`);
        }

        const data = (await response.json()) as AIResponse;
        return data.choices[0]?.message?.content || '';
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
