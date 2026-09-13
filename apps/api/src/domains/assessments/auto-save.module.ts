import { Module } from '@nestjs/common';
import { AutoSaveService } from './application/auto-save/auto-save.service';
import { AutoSaveController } from './presentation/controllers/auto-save.controller';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { CompanyModule } from '../organizations/company.module';

@Module({
  imports: [AiSystemsModule, CompanyModule],
  providers: [AutoSaveService],
  controllers: [AutoSaveController],
  exports: [AutoSaveService],
})
export class AutoSaveModule {}
