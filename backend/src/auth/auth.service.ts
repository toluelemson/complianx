import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationsService } from '../invitations/invitations.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly invitationsService: InvitationsService,
  ) {}

  private sanitize(user: User) {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  private async signToken(user: any) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      jobTitle: user.jobTitle ?? null,
      phone: user.phone ?? null,
      timezone: user.timezone ?? null,
    });
  }

  async signup(dto: SignupDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const { companyId, invitationToken } = await this.resolveCompany(dto);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const isNewCompany = !dto.companyId && !invitationToken;
    const user = await this.usersService.create(
      dto.email,
      passwordHash,
      companyId,
      isNewCompany ? 'ADMIN' : undefined,
    );
    if (invitationToken) {
      await this.invitationsService.markAccepted(invitationToken);
    }
    const token = await this.signToken(user);
    return { user: this.sanitize(user), token };
  }

  private async resolveCompany(dto: SignupDto) {
    if (dto.invitationToken) {
      const invitation = await this.invitationsService.getInvitationByToken(
        dto.invitationToken,
      );
      if (invitation.email && invitation.email.toLowerCase() !== dto.email.toLowerCase()) {
        throw new ConflictException(
          'Invitation email does not match signup email',
        );
      }
      return { companyId: invitation.companyId, invitationToken: invitation.token };
    }
    if (dto.companyId) {
      const existing = await (this.prisma as any).company.findUnique({
        where: { id: dto.companyId },
      });
      if (!existing) {
        throw new NotFoundException('Company not found');
      }
      return { companyId: existing.id };
    }
    if (dto.companyName?.trim()) {
      const company = await (this.prisma as any).company.create({
        data: { name: dto.companyName.trim() },
      });
      return { companyId: company.id };
    }
    throw new ConflictException(
      'Provide a company name to create one or a valid company id to join.',
    );
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    const token = await this.signToken(user);
    return { user: this.sanitize(user), token };
  }
}
