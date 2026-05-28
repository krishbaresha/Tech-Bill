import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GROK_API_KEY') ?? '';
    if (!this.apiKey) {
      this.logger.warn('GROK_API_KEY not configured — AI features disabled');
    }
  }

  async generateInsights(context: {
    totalSalesToday: number;
    totalRevenue: number;
    lowStockCount: number;
    totalReturnsToday: number;
    topProduct?: string;
  }): Promise<string> {
    if (!this.apiKey) return 'AI insights unavailable — GROK_API_KEY not set.';

    const prompt = `You are a smart business assistant for an electronics retail shop in Pakistan.
Based on today's data, give 2-3 short, actionable business insights in plain English.
Keep each insight to one sentence. Be specific and practical.

Today's data:
- Sales today: ${context.totalSalesToday}
- Revenue today: Rs ${context.totalRevenue.toLocaleString()}
- Low stock products: ${context.lowStockCount}
- Returns today: ${context.totalReturnsToday}
${context.topProduct ? `- Best selling product: ${context.topProduct}` : ''}

Give insights as a bullet list. No preamble, no headings.`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      this.logger.error(`Groq API error: ${res.status} ${res.statusText}`);
      return 'AI insights temporarily unavailable.';
    }

    const data = (await res.json()) as {
      choices: { message: { content: string } }[];
    };
    return data.choices[0]?.message?.content?.trim() || 'No insights available.';
  }
}
