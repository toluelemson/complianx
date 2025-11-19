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

    const response = await service.generate('technical', { foo: 'bar' });

    expect(response).toEqual('generated text');
    expect(post).toHaveBeenCalledWith(
      '/v1/chat/completions',
      expect.anything(),
    );
  });
});
