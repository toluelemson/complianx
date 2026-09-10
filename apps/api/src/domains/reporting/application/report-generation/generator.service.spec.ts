import { GeneratorService } from './generator.service';

describe('GeneratorService document lifecycle', () => {
  const prisma = {
    section: { findMany: jest.fn() },
    aiSystemObligation: { findMany: jest.fn() },
    document: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const projects = { assertOwnership: jest.fn() };
  const llm = { generate: jest.fn() };
  const documents = {};
  const pdf = { htmlToPdf: jest.fn() };
  const monetization = {
    reserveDocumentsForProject: jest.fn(),
    commitDocumentReservation: jest.fn(),
    releaseDocumentReservation: jest.fn(),
  };
  const readiness = { assess: jest.fn() };
  const composition = { mergeSections: jest.fn(), renderHtml: jest.fn() };
  const storage = {
    ensure: jest.fn(),
    resolve: jest.fn(),
    remove: jest.fn(),
  };
  const service = new GeneratorService(
    prisma as never,
    projects as never,
    llm as never,
    documents as never,
    pdf as never,
    monetization as never,
    readiness as never,
    composition as never,
    storage as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.section.findMany.mockResolvedValue([
      {
        name: 'system_overview',
        updatedAt: new Date(),
        content: {},
        artifacts: [],
      },
    ]);
    prisma.aiSystemObligation.findMany.mockResolvedValue([]);
    prisma.document.findFirst.mockResolvedValue(null);
    prisma.document.findUnique.mockResolvedValue(null);
    prisma.document.create.mockResolvedValue({
      id: 'doc-1',
      type: 'model_card',
      url: 'file.pdf',
    });
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    readiness.assess.mockReturnValue({
      status: 'ready',
      score: 100,
      summary: 'Ready',
      missingCriticalFields: [],
      weakSections: [],
    });
    composition.mergeSections.mockReturnValue({});
    composition.renderHtml.mockReturnValue('<html />');
    pdf.htmlToPdf.mockResolvedValue(undefined);
    storage.resolve.mockReturnValue('/tmp/file.pdf');
    storage.remove.mockResolvedValue(undefined);
    monetization.reserveDocumentsForProject.mockResolvedValue({
      id: 'reservation-1',
      companyId: 'company-1',
      month: '2026-09',
      amount: 1,
      status: 'ACTIVE',
    });
    llm.generate.mockResolvedValue('generated');
  });

  it('commits one reservation for a successful document', async () => {
    const result = await service.generate('project-1', 'user-1', [
      'model_card',
    ]);
    expect(result).toHaveLength(1);
    expect(monetization.commitDocumentReservation).toHaveBeenCalledTimes(1);
    expect(monetization.releaseDocumentReservation).not.toHaveBeenCalled();
  });

  it.each([
    [
      'LLM failure',
      () => llm.generate.mockRejectedValue(new Error('llm failed')),
    ],
    [
      'PDF failure',
      () => pdf.htmlToPdf.mockRejectedValue(new Error('pdf failed')),
    ],
    [
      'record failure',
      () => prisma.$transaction.mockRejectedValue(new Error('db failed')),
    ],
  ])('releases quota and cleans the file after %s', async (_label, arrange) => {
    arrange();
    await expect(
      service.generate('project-1', 'user-1', ['model_card']),
    ).rejects.toThrow();
    expect(monetization.releaseDocumentReservation).toHaveBeenCalledTimes(1);
    if (_label !== 'LLM failure')
      expect(storage.remove).toHaveBeenCalledWith(
        'documents',
        expect.any(String),
      );
  });

  it('preserves the original error when cleanup fails', async () => {
    const original = new Error('record failed');
    prisma.$transaction.mockRejectedValue(original);
    storage.remove.mockRejectedValue(new Error('cleanup failed'));
    await expect(
      service.generate('project-1', 'user-1', ['model_card']),
    ).rejects.toBe(original);
  });

  it('charges only completed documents during partial failure', async () => {
    llm.generate
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(new Error('second failed'));
    await expect(
      service.generate('project-1', 'user-1', [
        'model_card',
        'risk_assessment',
      ]),
    ).rejects.toThrow('second failed');
    expect(monetization.commitDocumentReservation).toHaveBeenCalledTimes(1);
    expect(monetization.releaseDocumentReservation).toHaveBeenCalledTimes(1);
  });

  it('does not regenerate or reserve when an operation already has a document', async () => {
    prisma.document.findUnique.mockResolvedValue({
      id: 'existing',
      type: 'model_card',
      url: 'existing.pdf',
    });
    const result = await service.generate(
      'project-1',
      'user-1',
      ['model_card'],
      'operation-1',
    );
    expect(result).toEqual([
      { id: 'existing', type: 'model_card', url: 'existing.pdf' },
    ]);
    expect(monetization.reserveDocumentsForProject).not.toHaveBeenCalled();
    expect(llm.generate).not.toHaveBeenCalled();
  });
});
