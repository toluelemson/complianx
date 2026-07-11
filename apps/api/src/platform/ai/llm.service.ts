import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

type GenerationMode =
  'technical' | 'model_card' | 'risk' | 'section_helper' | 'nist_rmf';

type TechnicalOverviewSection = {
  executiveSummary: string;
  scope: string[];
  methodology: string[];
  limitations: string[];
  objective: string;
  coreFunctionality: string;
  inputDataSources: string[];
  outputDecisions: string[];
  affectedStakeholders: string[];
  componentSummary: {
    inputs: string;
    processing: string;
    outputs: string;
    stakeholders: string;
  };
};

type TechnicalClassificationSection = {
  riskLevel: string;
  useCaseCategory: string;
  potentialHarm: string;
  regulatoryMapping: string;
  justification: string;
};

type TechnicalBulletSection = {
  items: string[];
};

type TechnicalClosingSection = {
  conclusion: string;
  appendices: string[];
};

type TechnicalDocumentationBundle = {
  dataGovernance: string[];
  modelDevelopment: string[];
  riskManagement: string[];
  humanOversight: string[];
  transparency: string[];
  technicalRobustness: string[];
  monitoring: string[];
  complianceAudit: string[];
  ethics: string[];
  conclusion: string;
  appendices: string[];
};

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
      this.logger.warn(
        'LLM configuration missing; suggestions will be skipped.',
      );
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
    try {
      if (mode === 'technical') {
        return await this.generateStructuredTechnicalReport(mergedContent);
      }
      const prompt = this.buildPrompt(mode, mergedContent);
      return await this.requestText(
        'You are an AI compliance expert that creates thorough yet concise documentation.',
        prompt,
      );
    } catch (error) {
      this.logger.error(`LLM generation failed for ${mode}`, error as any);
      throw error;
    }
  }

  async generateStructuredTechnicalReport(
    mergedContent: Record<string, any>,
  ): Promise<string> {
    const systemPrompt = this.technicalSystemPrompt();
    const [overview, classification, dataGovernance, modelDevelopment] =
      await Promise.all([
        this.requestJson<TechnicalOverviewSection>(
          systemPrompt,
          this.buildOverviewPrompt(mergedContent),
        ),
        this.requestJson<TechnicalClassificationSection>(
          systemPrompt,
          this.buildClassificationPrompt(mergedContent),
        ),
        this.requestJson<TechnicalBulletSection>(
          systemPrompt,
          this.buildSectionPrompt(
            mergedContent,
            'Data Governance',
            'Describe data sources, lineage, quality controls, privacy safeguards, retention, access controls, documentation evidence, and governance decisions relevant to EU AI Act compliance.',
          ),
        ),
        this.requestJson<TechnicalBulletSection>(
          systemPrompt,
          this.buildSectionPrompt(
            mergedContent,
            'Model Development',
            'Describe model design choices, training and validation workflow, feature engineering, performance evidence, versioning, release controls, testing discipline, and documentation artifacts that support an audit-ready technical file.',
          ),
        ),
      ]);

    const [
      riskManagement,
      humanOversight,
      transparency,
      technicalRobustness,
      monitoring,
      complianceAudit,
      ethics,
      closing,
    ] = await Promise.all([
      this.requestJson<TechnicalBulletSection>(
        systemPrompt,
        this.buildSectionPrompt(
          mergedContent,
          'Risk Management',
          'Describe identified risks, risk treatment measures, residual-risk considerations, escalation logic, review cadence, control ownership, and the evidence needed to show a functioning risk management system.',
        ),
      ),
      this.requestJson<TechnicalBulletSection>(
        systemPrompt,
        this.buildSectionPrompt(
          mergedContent,
          'Human Oversight',
          'Describe oversight checkpoints, human review triggers, override rights, escalation procedures, role ownership, operator guidance, and documentation that demonstrates meaningful human oversight.',
        ),
      ),
      this.requestJson<TechnicalBulletSection>(
        systemPrompt,
        this.buildSectionPrompt(
          mergedContent,
          'Transparency',
          'Describe disclosures, user-facing explanations, internal transparency records, model limitations communication, stakeholder information flows, and explainability practices relevant to the system.',
        ),
      ),
      this.requestJson<TechnicalBulletSection>(
        systemPrompt,
        this.buildSectionPrompt(
          mergedContent,
          'Technical Robustness',
          'Describe accuracy, robustness, resilience, fallback behavior, cybersecurity, failure handling, testing thresholds, and control evidence that support dependable operation.',
        ),
      ),
      this.requestJson<TechnicalBulletSection>(
        systemPrompt,
        this.buildSectionPrompt(
          mergedContent,
          'Monitoring',
          'Describe post-deployment monitoring, drift detection, incident management, periodic review, performance surveillance, retraining triggers, and recordkeeping required to keep the system under control.',
        ),
      ),
      this.requestJson<TechnicalBulletSection>(
        systemPrompt,
        this.buildSectionPrompt(
          mergedContent,
          'Compliance & Audit',
          'Describe technical documentation readiness, conformity-readiness steps, approval logs, audit trail expectations, control evidence, governance records, board or committee reporting, and regulatory support materials.',
        ),
      ),
      this.requestJson<TechnicalBulletSection>(
        systemPrompt,
        this.buildSectionPrompt(
          mergedContent,
          'Ethics',
          'Describe fairness considerations, stakeholder impact, bias assessment, proportionality, responsible-use expectations, challenge mechanisms, and governance decisions supporting ethical deployment.',
        ),
      ),
      this.requestJson<TechnicalClosingSection>(
        systemPrompt,
        this.buildClosingPrompt(mergedContent),
      ),
    ]);

    const documentation = {
      dataGovernance: dataGovernance.items,
      modelDevelopment: modelDevelopment.items,
      riskManagement: riskManagement.items,
      humanOversight: humanOversight.items,
      transparency: transparency.items,
      technicalRobustness: technicalRobustness.items,
      monitoring: monitoring.items,
      complianceAudit: complianceAudit.items,
      ethics: ethics.items,
      conclusion: closing.conclusion,
      appendices: closing.appendices,
    };

    return this.assembleTechnicalReportMarkdown(
      mergedContent,
      overview,
      classification,
      documentation,
    );
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

  private technicalSystemPrompt() {
    return 'You are a Senior AI Governance & Regulatory Compliance Consultant at a Big 4 firm. Follow an internal workflow of PLAN, ANALYZE, EXECUTE, REVIEW, REFINE, and FINAL OUTPUT, but return only the final structured output. Write like a human expert. Be specific, audit-defensible, and strictly grounded in the provided project JSON. The deliverable should feel like a substantial consulting-grade EU AI Act technical file rather than a short memo. If a fact is missing, return "Not provided" rather than inventing details.';
  }

  private buildOverviewPrompt(mergedContent: Record<string, any>) {
    return `Using only the JSON below, produce the first report sections as strict JSON.

Return exactly this shape:
{
  "executiveSummary": "max 200 words",
  "scope": ["..."],
  "methodology": ["..."],
  "limitations": ["..."],
  "objective": "...",
  "coreFunctionality": "...",
  "inputDataSources": ["..."],
  "outputDecisions": ["..."],
  "affectedStakeholders": ["..."],
  "componentSummary": {
    "inputs": "...",
    "processing": "...",
    "outputs": "...",
    "stakeholders": "..."
  }
}

Rules:
- Return valid JSON only
- No markdown
- The content should support a long-form technical report, not a one-page summary
- executiveSummary should be approximately 220-320 words
- Provide 5-8 items each for scope, methodology, and limitations where support exists
- inputDataSources, outputDecisions, and affectedStakeholders should each contain at least 4-8 specific items where support exists
- Keep each bullet business-focused and audit-ready
- Use "Not provided" for missing facts

PROJECT DATA JSON:
${JSON.stringify(mergedContent, null, 2)}`;
  }

  private buildClassificationPrompt(mergedContent: Record<string, any>) {
    return `Using only the JSON below, assess the EU AI Act risk position and return strict JSON.

Return exactly this shape:
{
  "riskLevel": "Low | High | Prohibited | Not provided",
  "useCaseCategory": "...",
  "potentialHarm": "...",
  "regulatoryMapping": "...",
  "justification": "short executive justification"
}

Rules:
- Return valid JSON only
- No markdown
- Use cautious language when information is incomplete
- justification should be a substantive 250-450 word regulatory rationale suitable for a consulting report
- make the classification useful for regulators, internal audit, and model risk reviewers
- Use "Not provided" if the data is insufficient

PROJECT DATA JSON:
${JSON.stringify(mergedContent, null, 2)}`;
  }

  private buildSectionPrompt(
    mergedContent: Record<string, any>,
    sectionTitle: string,
    focus: string,
  ) {
    return `Using only the structured input below, generate the "${sectionTitle}" section of a full EU AI Act technical documentation package as strict JSON.

Return exactly this shape:
{
  "items": ["..."]
}

Rules:
- Return valid JSON only
- No markdown
- This must support a substantial 30-40 page technical documentation package, not a short assessment
- Return 8-14 dense, audit-ready bullets where the data supports that level of detail
- Each bullet should typically be 20-60 words, concrete, and implementation-oriented
- Cover policy, process, controls, evidence, ownership, lifecycle, and audit-readiness where relevant
- Use "Not provided" where necessary
- Write in a formal consulting style suitable for regulators, internal audit, and board-level stakeholders
- Avoid generic AI explanations
- Focus specifically on: ${focus}

PROJECT DATA JSON:
${JSON.stringify(mergedContent, null, 2)}`;
  }

  private buildClosingPrompt(mergedContent: Record<string, any>) {
    return `Using only the structured input below, produce the conclusion and appendices for a full EU AI Act technical documentation package as strict JSON.

Return exactly this shape:
{
  "conclusion": "...",
  "appendices": ["..."]
}

Rules:
- Return valid JSON only
- No markdown
- conclusion should be a substantive 180-320 word close covering maturity, urgency, residual exposure, and recommended next action
- appendices should contain 10-16 concrete appendix entries or schedules where the data supports them
- Keep the content audit-ready and consulting-grade
- Use "Not provided" where necessary

PROJECT DATA JSON:
${JSON.stringify(mergedContent, null, 2)}`;
  }

  private async requestText(system: string, user: string): Promise<string> {
    const response = await this.client!.post('/v1/chat/completions', {
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return (
      response.data?.choices?.[0]?.message?.content ?? 'No content generated.'
    );
  }

  private async requestJson<T>(system: string, user: string): Promise<T> {
    const content = await this.requestText(system, user);
    return this.parseJsonResponse<T>(content);
  }

  private parseJsonResponse<T>(content: string): T {
    const cleaned = content.trim();
    const fencedMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonCandidate = fencedMatch?.[1]?.trim() ?? cleaned;
    try {
      return JSON.parse(jsonCandidate) as T;
    } catch (error) {
      this.logger.error('Failed to parse LLM JSON response', error as any);
      this.logger.error(`Raw LLM response: ${content}`);
      throw error;
    }
  }

  private assembleTechnicalReportMarkdown(
    mergedContent: Record<string, any>,
    overview: TechnicalOverviewSection,
    classification: TechnicalClassificationSection,
    documentation: TechnicalDocumentationBundle,
  ): string {
    const companyName = this.pickValue(
      mergedContent,
      [
        'company.name',
        'companyName',
        'company.name.value',
        'organization.name',
      ],
      'Not provided',
    );
    const systemName = this.pickValue(
      mergedContent,
      ['system_name', 'system.name', 'project.name', 'aiSystemName'],
      'Not provided',
    );
    const reportDate = new Date().toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const lines: string[] = [
      '# 1. Executive Summary',
      '',
      overview.executiveSummary || 'Not provided',
      '',
      '# 2. System Overview',
      '',
      `- **Company:** ${companyName}`,
      `- **AI System:** ${systemName}`,
      `- **Date:** ${reportDate}`,
      `- **Objective:** ${overview.objective || 'Not provided'}`,
      `- **Core Functionality:** ${overview.coreFunctionality || 'Not provided'}`,
      `- **Input Data Sources:** ${this.joinOrFallback(overview.inputDataSources)}`,
      `- **Output Decisions:** ${this.joinOrFallback(overview.outputDecisions)}`,
      `- **Affected Stakeholders:** ${this.joinOrFallback(overview.affectedStakeholders)}`,
      '',
      '| Component | Description |',
      '|----------|------------|',
      `| Inputs | ${overview.componentSummary?.inputs || 'Not provided'} |`,
      `| Processing | ${overview.componentSummary?.processing || 'Not provided'} |`,
      `| Outputs | ${overview.componentSummary?.outputs || 'Not provided'} |`,
      `| Stakeholders | ${overview.componentSummary?.stakeholders || 'Not provided'} |`,
      '',
      '## Scope of Assessment',
      ...this.toBullets(overview.scope),
      '',
      '## Methodology',
      ...this.toBullets(overview.methodology),
      '',
      '## Limitations',
      ...this.toBullets(overview.limitations),
      '',
      '# 3. AI Classification',
      '',
      '| Category | Assessment |',
      '|----------|-----------|',
      `| Risk Level | ${classification.riskLevel || 'Not provided'} |`,
      `| Use Case Category | ${classification.useCaseCategory || 'Not provided'} |`,
      `| Potential Harm | ${classification.potentialHarm || 'Not provided'} |`,
      `| Regulatory Mapping | ${classification.regulatoryMapping || 'Not provided'} |`,
      '',
      classification.justification || 'Not provided',
      '',
      '# 4. Data Governance',
      '',
      '## Governance Framework',
      '',
      ...this.buildDetailedSection(
        documentation.dataGovernance,
        'Governance Framework',
        'Data source controls, ownership, and documentation evidence relevant to EU AI Act expectations.',
      ),
      '# 5. Model Development',
      '',
      '## Development Lifecycle',
      '',
      ...this.buildDetailedSection(
        documentation.modelDevelopment,
        'Development Lifecycle',
        'Design, training, validation, release management, and supporting model-development evidence.',
      ),
      '# 6. Risk Management',
      '',
      '## Identified Risk Controls',
      '',
      ...this.buildDetailedSection(
        documentation.riskManagement,
        'Identified Risk Controls',
        'Risk identification, treatment measures, ownership, escalation, and residual-risk handling.',
      ),
      '# 7. Human Oversight',
      '',
      '## Oversight Design',
      '',
      ...this.buildDetailedSection(
        documentation.humanOversight,
        'Oversight Design',
        'Human review triggers, override authority, escalation logic, and operational oversight design.',
      ),
      '# 8. Transparency',
      '',
      '## Information Provided To Stakeholders',
      '',
      ...this.buildDetailedSection(
        documentation.transparency,
        'Information Provided To Stakeholders',
        'Disclosures, explainability measures, internal communication, and stakeholder-facing information practices.',
      ),
      '# 9. Technical Robustness',
      '',
      '## Reliability, Resilience, And Security',
      '',
      ...this.buildDetailedSection(
        documentation.technicalRobustness,
        'Reliability, Resilience, And Security',
        'Accuracy, robustness, cybersecurity, failure handling, and reliability assurance measures.',
      ),
      '# 10. Monitoring',
      '',
      '## Post-Deployment Monitoring',
      '',
      ...this.buildDetailedSection(
        documentation.monitoring,
        'Post-Deployment Monitoring',
        'Ongoing performance review, drift detection, incident handling, and control maintenance.',
      ),
      '# 11. Compliance & Audit',
      '',
      '## Control Evidence And Assurance',
      '',
      ...this.buildDetailedSection(
        documentation.complianceAudit,
        'Control Evidence And Assurance',
        'Technical file readiness, audit trail evidence, approval records, and compliance support material.',
      ),
      '# 12. Ethics',
      '',
      '## Ethical Use And Governance Considerations',
      '',
      ...this.buildDetailedSection(
        documentation.ethics,
        'Ethical Use And Governance Considerations',
        'Fairness, stakeholder impact, challenge mechanisms, and responsible-use governance considerations.',
      ),
      '',
      '# 13. Conclusion',
      '',
      documentation.conclusion || 'Not provided',
      '',
      '# Appendices',
      '',
      '## Supporting Schedules',
      '',
      ...this.toBullets(documentation.appendices),
    ];

    return lines.join('\n');
  }

  private pickValue(
    source: Record<string, any>,
    paths: string[],
    fallback: string,
  ) {
    for (const path of paths) {
      const value = path
        .split('.')
        .reduce<any>((acc, key) => acc?.[key], source);
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return fallback;
  }

  private joinOrFallback(values: string[] | undefined) {
    if (!Array.isArray(values) || values.length === 0) {
      return 'Not provided';
    }
    return values.join('; ');
  }

  private toBullets(values: string[] | undefined) {
    if (!Array.isArray(values) || values.length === 0) {
      return ['- Not provided'];
    }
    return values.map((value) => `- ${value || 'Not provided'}`);
  }

  private buildDetailedSection(
    values: string[] | undefined,
    summaryArea: string,
    summaryFocus: string,
  ) {
    const items =
      Array.isArray(values) && values.length > 0 ? values : ['Not provided'];
    const summaryRows = items.slice(0, 4).map((value, index) => {
      const normalized = (value || 'Not provided').replace(/\|/g, '\\|').trim();
      return `| ${index + 1} | ${summaryArea} | ${this.limitText(normalized, 140)} |`;
    });

    return [
      '| Ref | Focus Area | Summary Observation |',
      '|-----|------------|---------------------|',
      ...summaryRows,
      '',
      `**Section emphasis:** ${summaryFocus}`,
      '',
      '### Detailed Findings',
      '',
      ...items.map((value) => `- ${value || 'Not provided'}`),
      '',
    ];
  }

  private limitText(value: string, max: number) {
    if (value.length <= max) {
      return value;
    }
    return `${value.slice(0, max - 1).trimEnd()}...`;
  }
}
