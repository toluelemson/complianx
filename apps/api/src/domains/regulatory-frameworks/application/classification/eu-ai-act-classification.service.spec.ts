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

  it('handles the Annex I route, Art. 6(3) exception, and GPAI involvement', () => {
    const annexI = service.evaluateAnswers([
      { questionKey: 'is_ai_system', normalizedJson: true },
      { questionKey: 'used_in_eu', normalizedJson: true },
      { questionKey: 'annex_i_safety_component', normalizedJson: true },
      { questionKey: 'gpai_involvement', normalizedJson: true },
    ]);
    expect(annexI.high_risk).toBe(true);
    expect(annexI.gpai).toBe(true);
    expect(annexI.legal_references).toEqual(
      expect.arrayContaining(['annex-i', 'art-51', 'art-53']),
    );
    expect(annexI.legal_references).not.toContain('annex-iii');

    const exception = service.evaluateAnswers([
      { questionKey: 'is_ai_system', normalizedJson: true },
      { questionKey: 'used_in_eu', normalizedJson: true },
      { questionKey: 'high_risk_contexts', normalizedJson: ['employment'] },
      { questionKey: 'art_6_3_exception', normalizedJson: true },
    ]);
    expect(exception.high_risk).toBe(false);
    expect(exception.article_6_3_exception).toBe(true);
  });
});
