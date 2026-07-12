import { Module } from '@nestjs/common';
import { AutoSaveService } from './application/auto-save/auto-save.service';
import { AutoSaveController } from './presentation/controllers/auto-save.controller';

@Module({
  providers: [AutoSaveService],
  controllers: [AutoSaveController],
  exports: [AutoSaveService],
})
export class AutoSaveModule {}
