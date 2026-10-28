import { EuAiActClassificationService } from './eu-ai-act-classification.service';

describe('EuAiActClassificationService', () => {
  const service = new EuAiActClassificationService({} as never);

  it('returns a preliminary result and identifies missing intake facts', () => {
    const result = service.evaluateAnswers([
      { questionKey: 'is_ai_system', normalizedJson: true },
      { questionKey: 'used_in_eu', normalizedJson: true },
      { questionKey: 'intended_use', normalizedJson: 'Recommendations' },
    ]);

    expect(result.preliminary).toBe(true);
    expect(result.human_review_required).toBe(true);
    expect(result.result_kind).toBe('minimal_risk');
    expect(result.missing_information).toEqual(
      expect.arrayContaining([
        "Identify the organization's operator role",
        'Describe who may be affected',
      ]),
    );
  });

  it('triggers prohibited and high-risk indicators deterministically', () => {
    const result = service.evaluateAnswers([
      { questionKey: 'is_ai_system', normalizedJson: true },
      { questionKey: 'used_in_eu', normalizedJson: true },
      { questionKey: 'entity_roles', normalizedJson: ['provider'] },
      {
        questionKey: 'prohibited_use_cases',
        normalizedJson: ['social_scoring'],
      },
      { questionKey: 'high_risk_contexts', normalizedJson: ['employment'] },
    ]);

    expect(result.prohibited).toBe(true);
    expect(result.high_risk).toBe(false);
    expect(result.result_kind).toBe('prohibited');
    expect(result.legal_references).toContain('art-5');
  });
});
