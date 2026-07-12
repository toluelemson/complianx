import type { Readable } from 'stream';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

export interface FileStorage {
  ensure(bucket: string): Promise<void>;
  resolve(bucket: string, fileName: string): string;
  exists(bucket: string, fileName: string): boolean;
  write(bucket: string, fileName: string, content: Buffer): Promise<void>;
  remove(bucket: string, fileName: string): Promise<void>;
  createReadStream(bucket: string, fileName: string): Readable;
}
