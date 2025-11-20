import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

type GenerationMode =
  | 'technical'
  | 'model_card'
  | 'risk'
  | 'section_helper'
  | 'nist_rmf';

@Injectable()
export class LlmService {
  private readonly client: AxiosInstance | null;
  private readonly model: string;
  private readonly enabled: boolean;
  private readonly logger = new Logger(LlmService.name);

  constructor(configService: ConfigService) {
    const baseURL = configService.get<string>('LLM_BASE_URL');
    const apiKey = configService.get<string>('LLM_API_KEY');
    this.enabled = Boolean(baseURL && apiKey);
    if (!this.enabled) {
      this.logger.warn('LLM configuration missing; suggestions will be skipped.');
    }
    this.model = configService.get<string>('LLM_MODEL') ?? 'gpt-4o-mini';
    this.client = this.enabled
      ? axios.create({
          baseURL,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })
      : null;
  }

  async generate(
    mode: GenerationMode,
    mergedContent: Record<string, any>,
  ): Promise<string> {
    if (!this.enabled || !this.client) {
      this.logger.warn(`LLM disabled; returning fallback text for ${mode}`);
      return 'LLM suggestions are disabled in this environment.';
    }
    const prompt = this.buildPrompt(mode, mergedContent);
    try {
      const response = await this.client.post('/v1/chat/completions', {
        model: this.model,
        messages: [
          {
            role: 'system',
            content:
              'You are an AI compliance expert that creates thorough yet concise documentation.',
          },
          { role: 'user', content: prompt },
        ],
      });
      return (
        response.data?.choices?.[0]?.message?.content ?? 'No content generated.'
      );
    } catch (error) {
      this.logger.error(`LLM generation failed for ${mode}`, error as any);
      throw error;
    }
  }

  private buildPrompt(
    mode: GenerationMode,
    mergedContent: Record<string, any>,
  ): string {
    const json = JSON.stringify(mergedContent, null, 2);
    switch (mode) {
      case 'technical':
        return `Create an EU AI Act style technical documentation. Include sections for system description, model details, data governance, risks, human oversight, and monitoring. Base it strictly on the following JSON:\n${json}`;
      case 'model_card':
        return `Produce a model card in markdown with sections: Model Details, Intended Use, Limitations, Performance, and Ethical Considerations. Use the following system information:\n${json}`;
      case 'risk':
        return `Generate an AI risk assessment describing risks, severity, likelihood, and mitigations in markdown table form. Focus on the risk information contained here:\n${json}`;
      case 'nist_rmf':
        return `Create a NIST AI Risk Management Framework (AI RMF) profile that covers the Govern, Map, Measure, and Manage functions. Capture key activities, recommended controls, metrics, and stakeholders for each function in markdown sections. Ground all content in the AI system details within this JSON:\n${json}`;
      case 'section_helper':
        return `You are assisting with a specific section of an AI compliance form. Based on the following JSON that aggregates all known sections, produce:\n1. A short natural language suggestion summary.\n2. A machine-readable JSON object keyed by the target section field names with concise values ready to auto-populate a form.\nReturn your response as JSON with the shape { "summary": "...", "fields": { ... } }.\nData:\n${json}`;
      default:
        return `Generate an AI risk assessment describing risks, severity, likelihood, and mitigations in markdown table form. Focus on the risk information contained here:\n${json}`;
    }
  }
}
