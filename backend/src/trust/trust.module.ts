import { Module } from '@nestjs/common';
import { TrustService } from './trust.service';
import { TrustController } from './trust.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { MonetizationService } from '../monetization/monetization.service';

@Module({
  imports: [PrismaModule, ProjectsModule],
  providers: [TrustService, MonetizationService],
  controllers: [TrustController],
  exports: [TrustService],
})
export class TrustModule {}
