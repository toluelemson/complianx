import { Module } from '@nestjs/common';
import { AutoSaveService } from './auto-save.service';
import { AutoSaveController } from './auto-save.controller';

@Module({
  providers: [AutoSaveService],
  controllers: [AutoSaveController],
  exports: [AutoSaveService],
})
export class AutoSaveModule {}
