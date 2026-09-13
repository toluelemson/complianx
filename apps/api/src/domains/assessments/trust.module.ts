import { Module } from '@nestjs/common';
import { TrustService } from './application/trust/trust.service';
import { TrustController } from './presentation/controllers/trust.controller';
import { PrismaModule } from '../../platform/database/prisma.module';
import { AiSystemsModule } from '../ai-systems/ai-systems.module';
import { MonetizationService } from '../subscriptions/application/monetization.service';
import { CompanyModule } from '../organizations/company.module';
import { FilesModule } from '../../platform/files/files.module';

@Module({
  imports: [PrismaModule, AiSystemsModule, CompanyModule, FilesModule],
  providers: [TrustService, MonetizationService],
  controllers: [TrustController],
  exports: [TrustService],
})
export class TrustModule {}
