import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { EmailService } from '../notifications/email.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, EmailService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
