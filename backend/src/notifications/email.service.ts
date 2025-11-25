import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly fromAddress: string | undefined;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT
      ? parseInt(process.env.SMTP_PORT, 10)
      : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.fromAddress = process.env.SMTP_FROM ?? process.env.EMAIL_FROM;

    if (host && port && this.fromAddress) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
      });
      this.logger.log(`SMTP email service configured for host ${host}`);
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP settings missing; emails will be logged rather than sent.',
      );
    }
  }

  async sendInvitation(email: string, token: string) {
    const inviteLink = `${
      process.env.FRONTEND_URL ?? 'http://localhost:5173'
    }/signup?invitation=${token}`;
    const subject = 'You have been invited to NeuralDocx';
    const body = `You've been invited to join NeuralDocx. Click the link to get started:\n\n${inviteLink}\n\nIf you were not expecting this invitation, you can ignore this email.`;
    await this.sendEmail(email, subject, body);
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationLink = `${
      process.env.FRONTEND_URL ?? 'http://localhost:5173'
    }/verify-email?token=${token}`;
    const subject = 'Verify your NeuralDocx email';
    const body = `Please confirm your email address for NeuralDocx by clicking the link below:\n\n${verificationLink}\n\nIf you did not create an account, you can ignore this email.`;
    await this.sendEmail(email, subject, body);
  }

  async sendPasswordReset(email: string, token: string) {
    const resetLink = `${
      process.env.FRONTEND_URL ?? 'http://localhost:5173'
    }/reset-password?token=${token}`;
    const subject = 'Reset your NeuralDocx password';
    const body = `Click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request a reset, you can ignore this email.`;
    await this.sendEmail(email, subject, body);
  }

  async sendReminder(email: string, subject: string, body: string) {
    await this.sendEmail(email, subject, body);
  }

  private async sendEmail(to: string, subject: string, text: string) {
    if (!this.transporter || !this.fromAddress) {
      this.logger.log(`[Mock Email] To: ${to} | Subject: ${subject}\n${text}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        text,
      });
      this.logger.log(`Email sent to ${to} (${subject})`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error as any);
    }
  }
}
