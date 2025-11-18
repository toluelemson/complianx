import { mergeSections } from './utils';

describe('mergeSections', () => {
  it('merges sections into a composite object keyed by name', () => {
    const sections = [
      {
        name: 'overview',
        content: { text: 'a' },
        artifacts: [
          {
            id: '1',
            originalName: 'policy.pdf',
            description: 'Policy',
            createdAt: new Date('2024-01-01'),
            status: 'APPROVED',
            version: 2,
            checksum: 'abc123',
            citationKey: 'OVERVIEW-A02',
            reviewComment: 'Looks good',
            reviewedAt: new Date('2024-01-02'),
          },
        ],
      },
      { name: 'risks', content: { score: 'high' } },
    ] as any;
    expect(mergeSections(sections)).toEqual({
      overview: {
        text: 'a',
        _artifacts: [
          {
            id: '1',
            citation: 'OVERVIEW-A02',
            name: 'policy.pdf',
            description: 'Policy',
            uploadedAt: new Date('2024-01-01'),
            status: 'APPROVED',
            version: 2,
            checksum: 'abc123',
            reviewComment: 'Looks good',
            reviewedAt: new Date('2024-01-02'),
          },
        ],
      },
      risks: { score: 'high' },
    });
  });
});
