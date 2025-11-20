import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
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
        role: role ?? undefined,
      },
    });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  listByCompany(companyId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
  }

  listAdminsByCompany(companyId: string): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { companyId, role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
    });
  }

  private sanitize(user: User) {
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
    const target = await this.prisma.user.findUnique({
      where: { id: params.targetUserId },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (target.companyId !== params.companyId) {
      throw new ForbiddenException('User belongs to another company');
    }
    return this.prisma.user.update({
      where: { id: params.targetUserId },
      data: { role: params.role },
    });
  }
}
