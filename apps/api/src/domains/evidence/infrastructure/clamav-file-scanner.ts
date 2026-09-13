import { Injectable, type OnModuleInit } from '@nestjs/common';
import { createConnection, type Socket } from 'node:net';
import type { EvidenceUpload } from '../application/artifacts/artifact.commands';
import {
  FileScannerUnavailableError,
  type FileScanner,
  type ScanResult,
} from '../application/artifacts/file-scanner';

export type ClamAvFileScannerOptions = {
  host: string;
  port: number;
  timeoutMs: number;
};

@Injectable()
export class ClamAvFileScanner implements FileScanner, OnModuleInit {
  constructor(private readonly options: ClamAvFileScannerOptions) {}

  async onModuleInit(): Promise<void> {
    const response = await this.command('zPING\0');
    if (response !== 'PONG') {
      throw new FileScannerUnavailableError(
        `Malware scanner health check returned an invalid response: ${response || 'empty response'}`,
      );
    }
  }

  scan(file: EvidenceUpload): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      let settled = false;
      let response = '';
      const socket = createConnection({
        host: this.options.host,
        port: this.options.port,
      });

      const fail = (message: string, cause?: unknown) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(new FileScannerUnavailableError(message, { cause }));
      };

      socket.setTimeout(this.options.timeoutMs);
      socket.once('timeout', () => fail('Malware scanner timed out'));
      socket.once('error', (error) =>
        fail('Malware scanner is unavailable', error),
      );
      socket.on('data', (chunk: Buffer) => {
        response += chunk.toString('utf8');
      });
      socket.once('connect', () => this.sendFile(socket, file.buffer));
      socket.once('end', () => {
        if (settled) return;
        settled = true;
        const normalized = response.replace(/\0/g, '').trim();
        if (/^stream: OK$/i.test(normalized)) {
          resolve({ safe: true });
          return;
        }
        const match = normalized.match(/^stream: (.+) FOUND$/i);
        if (match) {
          resolve({ safe: false, reason: `Malware detected: ${match[1]}` });
          return;
        }
        reject(
          new FileScannerUnavailableError(
            `Malware scanner returned an invalid response: ${normalized || 'empty response'}`,
          ),
        );
      });
    });
  }

  private sendFile(socket: Socket, buffer: Buffer) {
    socket.write(Buffer.from('zINSTREAM\0'));
    const chunkSize = 64 * 1024;
    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      const chunk = buffer.subarray(offset, offset + chunkSize);
      const length = Buffer.allocUnsafe(4);
      length.writeUInt32BE(chunk.length);
      socket.write(length);
      socket.write(chunk);
    }
    socket.end(Buffer.alloc(4));
  }

  private command(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let response = '';
      const socket = createConnection({
        host: this.options.host,
        port: this.options.port,
      });
      socket.setTimeout(this.options.timeoutMs);
      socket.once('connect', () => socket.end(command));
      socket.on('data', (chunk: Buffer) => {
        response += chunk.toString('utf8');
      });
      socket.once('end', () => resolve(response.replace(/\0/g, '').trim()));
      socket.once('timeout', () => {
        socket.destroy();
        reject(new FileScannerUnavailableError('Malware scanner timed out'));
      });
      socket.once('error', (error) =>
        reject(
          new FileScannerUnavailableError('Malware scanner is unavailable', {
            cause: error,
          }),
        ),
      );
    });
  }
}
