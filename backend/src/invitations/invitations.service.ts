import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { EmailService } from '../notifications/email.service';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private ensureAdmin(user: { role?: string; companyId?: string }) {
    const isAdmin =
      user.role === 'ADMIN' || user.role === 'COMPANY_ADMIN';
    if (!isAdmin) {
      throw new ForbiddenException('Admin privileges required');
    }
    if (!user.companyId) {
      throw new ForbiddenException('User must belong to a company');
    }
  }

  async createInvitation(
    user: { userId: string; role?: string; companyId?: string },
    email: string,
  ) {
    this.ensureAdmin(user);
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
    const invitation = await (this.prisma as any).invitation.create({
      data: {
        email,
        token,
        companyId: user.companyId!,
        invitedById: user.userId,
        expiresAt,
      },
    });
    await this.emailService.sendInvitation(email, token);
    return invitation;
  }

  async listInvitations(user: { role?: string; companyId?: string }) {
    this.ensureAdmin(user);
    return (this.prisma as any).invitation.findMany({
      where: {
        companyId: user.companyId!,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvitationByToken(token: string) {
    const invitation = await (this.prisma as any).invitation.findUnique({
      where: { token },
      include: { company: true },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.expiresAt < new Date()
    ) {
      throw new NotFoundException('Invitation invalid or expired');
    }
    return invitation;
  }

  async markAccepted(token: string) {
    return (this.prisma as any).invitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });
  }
}
