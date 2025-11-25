import { Injectable } from '@nestjs/common';
import { ContactDto } from './dto/contact.dto';
import { EmailService } from '../notifications/email.service';

const SUPPORT_EMAIL =
  process.env.SALES_EMAIL ??
  process.env.SUPPORT_EMAIL ??
  process.env.EMAIL_FROM ??
  process.env.SMTP_FROM;

@Injectable()
export class ContactService {
  constructor(private readonly emailService: EmailService) {}

  async sendContactRequest(dto: ContactDto) {
    const recipient = SUPPORT_EMAIL ?? 'support@neuraldocx.com';
    const subject = `NeuralDocx demo request from ${dto.name}`;
    const body = `
Name: ${dto.name}
Email: ${dto.email}
Company: ${dto.company ?? '[not provided]'}

Message:
${dto.message}
`;
    await this.emailService.sendCustomEmail(recipient, subject, body);
    return { ok: true };
  }
}
