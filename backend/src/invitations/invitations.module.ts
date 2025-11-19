import { Module } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from '../notifications/email.service';

@Module({
  imports: [PrismaModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, EmailService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
