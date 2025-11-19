import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async getCompanyForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: true,
      },
    });
    if (!user?.companyId) {
      throw new NotFoundException('User is not assigned to a company');
    }
    const members = await this.prisma.user.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    return { company: user.company, members };
  }

  async updateCompanyName(userId: string, name: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.companyId || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only company admins can rename company');
    }
    return this.prisma.company.update({
      where: { id: user.companyId },
      data: { name },
    });
  }

  async removeMember(userId: string, memberId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user?.companyId || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only company admins can remove members');
    }
    if (memberId === userId) {
      throw new ForbiddenException('Admin cannot remove themselves');
    }
    const member = await this.prisma.user.findUnique({
      where: { id: memberId },
    });
    if (!member || member.companyId !== user.companyId) {
      throw new NotFoundException('Member not part of this company');
    }
    return this.prisma.user.update({
      where: { id: memberId },
      data: { companyId: null, role: 'USER' },
    });
  }
}
