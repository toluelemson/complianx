import { createServer, type Server } from 'node:net';
import type { EvidenceUpload } from '../application/artifacts/artifact.commands';
import { FileScannerUnavailableError } from '../application/artifacts/file-scanner';
import { ClamAvFileScanner } from './clamav-file-scanner';

const upload: EvidenceUpload = {
  originalname: 'evidence.txt',
  mimetype: 'text/plain',
  size: 8,
  buffer: Buffer.from('evidence'),
};

describe('ClamAvFileScanner', () => {
  const servers: Server[] = [];

  afterEach(async () => {
    await Promise.all(
      servers
        .splice(0)
        .map(
          (server) =>
            new Promise<void>((resolve) => server.close(() => resolve())),
        ),
    );
  });

  async function scannerWithResponse(response: string) {
    const server = createServer((socket) => {
      socket.on('data', () => undefined);
      socket.on('end', () => socket.end(response));
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('Missing test server address');
    return new ClamAvFileScanner({
      host: '127.0.0.1',
      port: address.port,
      timeoutMs: 500,
    });
  }

  it('accepts a safe file', async () => {
    const scanner = await scannerWithResponse('stream: OK\0');
    await expect(scanner.scan(upload)).resolves.toEqual({ safe: true });
  });

  it('passes its startup health check when ClamAV responds', async () => {
    const scanner = await scannerWithResponse('PONG\0');
    await expect(scanner.onModuleInit()).resolves.toBeUndefined();
  });

  it('rejects a malicious file with the ClamAV signature name', async () => {
    const scanner = await scannerWithResponse(
      'stream: Eicar-Signature FOUND\0',
    );
    await expect(scanner.scan(upload)).resolves.toEqual({
      safe: false,
      reason: 'Malware detected: Eicar-Signature',
    });
  });

  it('fails closed when the scanner is unavailable', async () => {
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const address = probe.address();
    if (!address || typeof address === 'string')
      throw new Error('Missing test server address');
    const port = address.port;
    await new Promise<void>((resolve) => probe.close(() => resolve()));
    const scanner = new ClamAvFileScanner({
      host: '127.0.0.1',
      port,
      timeoutMs: 500,
    });

    await expect(scanner.scan(upload)).rejects.toBeInstanceOf(
      FileScannerUnavailableError,
    );
  });

  it('fails closed on a scanner protocol error', async () => {
    const scanner = await scannerWithResponse('stream: scan failed ERROR\0');
    await expect(scanner.scan(upload)).rejects.toThrow(
      'Malware scanner returned an invalid response',
    );
  });
});
