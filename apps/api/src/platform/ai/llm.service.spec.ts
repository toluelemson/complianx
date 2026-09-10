import { ConfigService } from '@nestjs/config';
import { LlmService } from './llm.service';
import axios from 'axios';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LlmService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('posts prompts to configured endpoint and returns content', async () => {
    const post = jest.fn().mockResolvedValue({
      data: { choices: [{ message: { content: 'generated text' } }] },
    });
    mockedAxios.create.mockReturnValue({ post } as any);

    const config = new ConfigService({
      LLM_BASE_URL: 'https://llm.local',
      LLM_API_KEY: 'key',
      LLM_MODEL: 'mock-model',
    });
    const service = new LlmService(config);

    const response = await service.generate('model_card', { foo: 'bar' });

    expect(response).toEqual('generated text');
    expect(post).toHaveBeenCalledWith(
      '/v1/chat/completions',
      expect.anything(),
    );
  });

  it('returns fallback text when the provider rejects credentials', async () => {
    const post = jest.fn().mockRejectedValue({ response: { status: 401 } });
    mockedAxios.create.mockReturnValue({ post } as any);

    const config = new ConfigService({
      LLM_BASE_URL: 'https://llm.local',
      LLM_API_KEY: 'invalid-key',
    });
    const service = new LlmService(config);

    await expect(
      service.generate('model_card', { foo: 'bar' }),
    ).resolves.toContain('temporarily unavailable');
  });
});
