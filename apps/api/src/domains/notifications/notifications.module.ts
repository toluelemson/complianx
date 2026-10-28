import { Module } from '@nestjs/common';
import { NotificationsService } from './application/notifications.service';
import { NotificationsController } from './presentation/notifications.controller';
import { EvidenceExpiryScheduler } from './application/evidence-expiry.scheduler';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [NotificationsService, EvidenceExpiryScheduler],
  exports: [NotificationsService],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
