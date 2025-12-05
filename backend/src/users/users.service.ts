import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User, UserCompany } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(
    email: string,
    passwordHash: string,
    companyId?: string,
    role?: Role,
  ): Promise<User> {
    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
        companyId,
        defaultCompanyId: companyId ?? undefined,
        role: role ?? undefined,
      },
    });
  }

  findByEmail(email: string): Promise<
    (User & { companies: (UserCompany & { company?: { id: string; name: string } })[] }) | null
  > {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        companies: {
          include: { company: { select: { id: true, name: true } } },
        },
        company: { select: { id: true, name: true } },
      },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  listByCompany(companyId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { companies: { some: { companyId } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listAdminsByCompany(companyId: string): Promise<User[]> {
    const memberships = await this.prisma.userCompany.findMany({
      where: { companyId, role: 'ADMIN' },
      include: { user: true },
    });
    return memberships.map((membership) => membership.user);
  }

  private sanitize(
    user: User & { companies?: (UserCompany & { company?: { id: string; name: string } })[] },
  ) {
    if (!user) {
      return null;
    }
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName ?? undefined,
        lastName: dto.lastName ?? undefined,
        jobTitle: dto.jobTitle ?? undefined,
        phone: dto.phone ?? undefined,
        timezone: dto.timezone ?? undefined,
      },
    });
    return this.sanitize(user);
  }

  async updateRole(params: {
    targetUserId: string;
    role: Role;
    companyId: string;
  }): Promise<User> {
    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: params.targetUserId, companyId: params.companyId } },
    });
    if (!membership) {
      throw new NotFoundException('User not part of this company');
    }
    if (
      membership.role === 'ADMIN' &&
      params.role !== 'ADMIN'
    ) {
      const adminCount = await this.prisma.userCompany.count({
        where: { companyId: params.companyId, role: 'ADMIN' },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException('Company must retain at least one admin');
      }
    }
    await this.prisma.userCompany.update({
      where: { userId_companyId: { userId: params.targetUserId, companyId: params.companyId } },
      data: { role: params.role },
    });
    return this.prisma.user.update({
      where: { id: params.targetUserId },
      data: { role: params.role },
    });
  }
}
