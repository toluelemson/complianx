import { Module } from '@nestjs/common';
import { TrustService } from './application/trust/trust.service';
import { TrustController } from './presentation/controllers/trust.controller';
import { PrismaModule } from '../../platform/database/prisma.module';
import { ProjectsModule } from '../../projects/projects.module';
import { MonetizationService } from '../../monetization/monetization.service';
import { CompanyModule } from '../../company/company.module';

@Module({
  imports: [PrismaModule, ProjectsModule, CompanyModule],
  providers: [TrustService, MonetizationService],
  controllers: [TrustController],
  exports: [TrustService],
})
export class TrustModule {}
