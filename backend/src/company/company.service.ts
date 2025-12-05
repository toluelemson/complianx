import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureMembership(userId: string, companyId: string) {
    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) {
      throw new NotFoundException('User is not assigned to this company');
    }
    return membership;
  }

  async getCompanyForUser(userId: string, companyId: string) {
    await this.ensureMembership(userId, companyId);
    const company = await this.prisma.company.findFirst({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    const members = await this.prisma.user.findMany({
      where: { companies: { some: { companyId } } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return { company, members };
  }

  async updateCompanyName(userId: string, companyId: string, name: string) {
    const membership = await this.ensureMembership(userId, companyId);
    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only company admins can rename company');
    }
    return this.prisma.company.update({
      where: { id: companyId },
      data: { name },
    });
  }

  async removeMember(userId: string, companyId: string, memberId: string) {
    const membership = await this.ensureMembership(userId, companyId);
    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException('Only company admins can remove members');
    }
    if (memberId === userId) {
      throw new ForbiddenException('Admin cannot remove themselves');
    }
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    await this.ensureMembership(memberId, companyId);
    const targetMembership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: memberId, companyId } },
    });
    if (targetMembership?.role === 'ADMIN') {
      const adminCount = await this.prisma.userCompany.count({
        where: { companyId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('Cannot remove the last admin in the company');
      }
    }
    await this.prisma.userCompany.delete({
      where: { userId_companyId: { userId: memberId, companyId } },
    });
    return this.prisma.user.update({
      where: { id: memberId },
      data: { companyId: null, defaultCompanyId: null, role: 'USER' },
    });
  }

  async leaveCompany(userId: string, companyId: string) {
    const membership = await this.ensureMembership(userId, companyId);
    if (membership.role === 'ADMIN') {
      const adminCount = await this.prisma.userCompany.count({
        where: { companyId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Assign another admin before leaving the company',
        );
      }
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { companyId: null, defaultCompanyId: null, role: 'USER' },
    });
    await this.prisma.userCompany.delete({
      where: { userId_companyId: { userId, companyId } },
    });
    return { ok: true };
  }

  async createCompanyForUser(userId: string, name?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const company = await this.prisma.company.create({
      data: {
        name: name?.trim() || `${user.email.split('@')[0] || 'Workspace'}'s workspace`,
        billingEmail: user.email,
      },
    });
    await this.prisma.userCompany.create({
      data: { userId, companyId: company.id, role: 'ADMIN' },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        defaultCompanyId: company.id,
        companyId: user.companyId ?? company.id,
      },
    });
    return { companyId: company.id, company };
  }
}
