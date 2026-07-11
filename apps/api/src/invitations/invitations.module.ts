import { Module } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../notifications/email.service';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [PrismaModule, CompanyModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, EmailService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
