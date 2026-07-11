import { Module } from '@nestjs/common';
import { InvitationsService } from './application/invitations/invitations.service';
import { InvitationsController } from './presentation/controllers/invitations.controller';
import { PrismaModule } from '../../platform/database/prisma.module';
import { EmailService } from '../../platform/email/email.service';
import { CompanyModule } from './company.module';

@Module({
  imports: [PrismaModule, CompanyModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, EmailService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
