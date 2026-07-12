import { Module } from '@nestjs/common';
import { PrismaModule } from '../../platform/database/prisma.module';
import { AnalyticsService } from './application/analytics/analytics.service';
import { AnalyticsController } from './presentation/controllers/analytics.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
