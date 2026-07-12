import { Module } from '@nestjs/common';
import { FILE_STORAGE } from './file-storage.port';
import { LocalFileStorageService } from './local-file-storage.service';

@Module({
  providers: [
    LocalFileStorageService,
    { provide: FILE_STORAGE, useExisting: LocalFileStorageService },
  ],
  exports: [FILE_STORAGE],
})
export class FilesModule {}
