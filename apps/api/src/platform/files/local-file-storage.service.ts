import { Injectable } from '@nestjs/common';
import { createReadStream, existsSync, promises as fs } from 'fs';
import { join } from 'path';
import type { FileStorage } from './file-storage.port';

@Injectable()
export class LocalFileStorageService implements FileStorage {
  private readonly root =
    process.env.STORAGE_ROOT?.trim() || join(process.cwd(), 'storage');

  async ensure(bucket: string) {
    await fs.mkdir(join(this.root, bucket), { recursive: true });
  }

  resolve(bucket: string, fileName: string) {
    return join(this.root, bucket, fileName);
  }

  exists(bucket: string, fileName: string) {
    return existsSync(this.resolve(bucket, fileName));
  }

  async write(bucket: string, fileName: string, content: Buffer) {
    await this.ensure(bucket);
    await fs.writeFile(this.resolve(bucket, fileName), content);
  }

  async remove(bucket: string, fileName: string) {
    await fs.unlink(this.resolve(bucket, fileName));
  }

  createReadStream(bucket: string, fileName: string) {
    return createReadStream(this.resolve(bucket, fileName));
  }
}
