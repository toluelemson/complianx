import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { EmailService } from '../notifications/email.service';
import { Role } from '@prisma/client';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private async resolveRoleForNewMember(
    companyId: string,
    requestedRole: Role | 'USER' | 'ADMIN' = 'USER',
  ): Promise<Role> {
    const memberCount = await this.prisma.userCompany.count({
      where: { companyId },
    });
    if (memberCount === 0) {
      return 'ADMIN';
    }
    return (requestedRole as Role) ?? 'USER';
  }

  private ensureAdmin(
    user: { role?: string; companies?: { companyId: string; role?: string }[] },
    companyId: string,
  ) {
    const membership = (user.companies ?? []).find(
      (entry) => entry.companyId === companyId,
    );
    const membershipRole = membership?.role;
    const isGlobalAdmin = user.role === 'ADMIN' || user.role === 'COMPANY_ADMIN';
    const isCompanyAdmin =
      membershipRole === 'ADMIN' || membershipRole === 'COMPANY_ADMIN';
    if (!isGlobalAdmin && !isCompanyAdmin) {
      throw new ForbiddenException('Admin privileges required');
    }
  }

  async createInvitation(
    user: {
      userId: string;
      role?: string;
      companies?: { companyId: string; role?: string }[];
    },
    email: string,
    companyId: string,
  ) {
    this.ensureAdmin(user, companyId);
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { companies: true },
    });
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
    // Auto-attach existing users to the company to avoid a stalled invite flow
    if (existingUser) {
      const membership = await this.prisma.userCompany.findUnique({
        where: { userId_companyId: { userId: existingUser.id, companyId } },
      });
      if (!membership) {
        const roleToAssign = await this.resolveRoleForNewMember(companyId, 'USER');
        await this.prisma.userCompany.create({
          data: { userId: existingUser.id, companyId, role: roleToAssign },
        });
        if (roleToAssign === 'ADMIN' && existingUser.role !== 'ADMIN') {
          await this.prisma.user.update({
            where: { id: existingUser.id },
            data: { role: 'ADMIN' },
          });
        }
      }
    }
    const invitation = await (this.prisma as any).invitation.create({
      data: {
        email: normalizedEmail,
        token,
        companyId,
        invitedById: user.userId,
        expiresAt,
        acceptedAt: existingUser ? new Date() : null,
      },
    });
    if (existingUser) {
      await this.emailService.sendCustomEmail(
        normalizedEmail,
        'You were added to a company on NeuralDocx',
        'An admin added you to their workspace. Log in to access the company.',
      );
    } else {
      await this.emailService.sendInvitation(normalizedEmail, token);
    }
    return invitation;
  }

  async listInvitations(
    user: {
      role?: string;
      companies?: { companyId: string; role?: string }[];
    },
    companyId: string,
  ) {
    this.ensureAdmin(user, companyId);
    return (this.prisma as any).invitation.findMany({
      where: {
        companyId,
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

  async acceptInvitationForUser(
    token: string,
    userId: string,
    userEmail: string,
  ) {
    const invitation = await this.getInvitationByToken(token);
    if (
      invitation.email &&
      invitation.email.toLowerCase() !== (userEmail || '').toLowerCase()
    ) {
      throw new ForbiddenException('Invitation email mismatch');
    }
    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId: invitation.companyId } },
    });
    if (!membership) {
      const roleToAssign = await this.resolveRoleForNewMember(
        invitation.companyId,
        'USER',
      );
      await this.prisma.userCompany.create({
        data: { userId, companyId: invitation.companyId, role: roleToAssign },
      });
      if (roleToAssign === 'ADMIN') {
        await this.prisma.user.update({
          where: { id: userId },
          data: { role: 'ADMIN' },
        });
      }
    }
    await (this.prisma as any).invitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });
    return { companyId: invitation.companyId };
  }

  async markAccepted(token: string) {
    return (this.prisma as any).invitation.update({
      where: { token },
      data: { acceptedAt: new Date() },
    });
  }
}
