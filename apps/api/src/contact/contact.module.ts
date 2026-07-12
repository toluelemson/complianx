import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { EmailService } from '../platform/email/email.service';

@Module({
  providers: [ContactService, EmailService],
  controllers: [ContactController],
})
export class ContactModule {}
