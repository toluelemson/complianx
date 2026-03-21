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
        return `You are a Senior AI Governance & Regulatory Compliance Consultant at a Big 4 firm (e.g., Deloitte, PwC, EY).

You specialize in EU AI Act compliance, risk classification, and audit-ready documentation for regulated industries (FinTech, Healthcare, SaaS).

Your task is to produce a HIGH-END, EXECUTIVE-LEVEL AI COMPLIANCE REPORT that could be submitted to regulators, internal audit teams, or board-level stakeholders.

STRICT QUALITY REQUIREMENTS:

- Write in a formal, precise, and authoritative consulting tone
- Avoid generic AI explanations or filler content
- Every section must deliver clear business and regulatory value
- Use structured formatting (tables, bullet points, labeled sections)
- Reference EU AI Act obligations where relevant (without over-citing)
- Ensure the report is logically consistent and audit-defensible
- Keep language concise, confident, and professional
- Do NOT sound like an AI; sound like a human expert
- Base the report strictly on the provided JSON
- If information is missing, state "Not provided" instead of inventing facts

INPUT PROJECT DATA JSON:
${json}

When preparing the report, infer the following fields from the JSON where possible:
- AI System Name
- Company
- Industry
- AI Use Case
- Input Data
- Output/Decision
- Geography: European Union
- Date: use today's date if none is provided in the JSON

GENERATE THE REPORT USING THIS STRUCTURE:

# 1. COVER PAGE

AI SYSTEM COMPLIANCE REPORT - EU AI ACT
Company: [derive from JSON or "Not provided"]
AI System: [derive from JSON or "Not provided"]
Date: [today or value from JSON]
Version: 1.0

# 2. EXECUTIVE SUMMARY

Provide a sharp, executive-level summary of no more than approximately 200 words.

Include:
- Purpose of the AI system
- EU AI Act risk classification (Low / High / Prohibited)
- Compliance status (Compliant / Partially Compliant / Non-Compliant)
- Top 3 to 4 critical compliance gaps
- Business implication (regulatory, operational, reputational)

End with a clear executive statement on urgency.

# 3. SCOPE AND METHODOLOGY

Briefly describe:
- Scope of assessment (what was reviewed)
- Methodology (documentation review, risk mapping, regulatory alignment)
- Limitations (if any assumptions were made)

# 4. AI SYSTEM OVERVIEW

Provide structured clarity:
- Objective of the system
- Core functionality
- Input data sources
- Output decisions
- Affected stakeholders (customers, employees, etc.)

Then summarize in a table:

| Component | Description |
|----------|------------|
| Inputs | |
| Processing | |
| Outputs | |
| Stakeholders | |

# 5. EU AI ACT RISK CLASSIFICATION

## 5.1 Classification Table

| Category | Assessment |
|----------|-----------|
| Risk Level | |
| Use Case Category | |
| Potential Harm | |
| Regulatory Mapping | |

## 5.2 Justification

Provide a clear justification referencing relevant EU AI Act logic (for example high-risk use cases such as credit scoring or hiring) where supported by the data.

# 6. COMPLIANCE ASSESSMENT AGAINST EU AI ACT

Create a structured evaluation:

| Requirement | Status (Compliant / Partial / Non-Compliant) | Observations | Relevant EU AI Act Area |
|------------|----------------------------------------------|-------------|--------------------------|

Include:
- Risk Management System
- Data Governance & Data Quality
- Technical Documentation
- Transparency & Provision of Information
- Human Oversight
- Accuracy, Robustness & Cybersecurity

# 7. KEY RISKS AND GAPS

Identify and explain the most critical risks.

For each risk include:
- Risk description
- Potential impact (legal, financial, reputational)
- Severity (High / Medium / Low)

# 8. RECOMMENDATIONS

Divide into:

## 8.1 Immediate Actions (0-30 days)
- Concrete, practical fixes

## 8.2 Mid-Term Actions (1-3 months)
- Process and documentation improvements

## 8.3 Strategic Actions (3-12 months)
- Governance, monitoring, and long-term compliance setup

# 9. GOVERNANCE & CONTROL CONSIDERATIONS

Outline:
- Suggested ownership (e.g., Risk, Compliance, Engineering)
- Monitoring approach
- Documentation lifecycle
- Audit readiness considerations

# 10. CONCLUSION

Provide a strong closing covering:
- Overall compliance maturity level
- Urgency level
- Recommended next step

Make it sound decisive and professional.

# 11. APPENDIX

Include:
- Reference to EU AI Act (high-level, not a legal text dump)
- Definitions of key terms (if needed)

FORMATTING RULES:

- Use markdown headings (#, ##)
- Use tables for structured data
- Keep paragraphs short (2-4 lines max)
- Use bullet points for clarity
- Maintain consistent terminology throughout

FINAL CHECK BEFORE OUTPUT:

- Does this read like a EUR10K consulting deliverable?
- Is the logic consistent and defensible?
- Are risks clearly articulated?
- Is it ready to be exported as a professional PDF?

Now generate the full report.`;
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
