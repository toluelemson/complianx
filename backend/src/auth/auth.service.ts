import {
  BadRequestException,
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
import { EmailService } from '../notifications/email.service';
import { randomBytes } from 'crypto';

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly invitationsService: InvitationsService,
    private readonly emailService: EmailService,
  ) {}

  private sanitize(user: User) {
    const {
      passwordHash,
      emailVerificationToken,
      emailVerificationTokenExpiresAt,
      passwordResetToken,
      passwordResetTokenExpiresAt,
      ...rest
    } = user;
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
    const { companyId, invitationToken, createdCompany } =
      await this.resolveCompany(dto);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.usersService.create(
      dto.email,
      passwordHash,
      companyId,
      createdCompany ? 'ADMIN' : undefined,
    );
    await this.enqueueEmailVerification(user);
    if (invitationToken) {
      await this.invitationsService.markAccepted(invitationToken);
    }
    const token = await this.signToken(user);
    return { user: this.sanitize(user), token };
  }

  private async resolveCompany(
    dto: SignupDto,
  ): Promise<{ companyId: string; invitationToken?: string; createdCompany: boolean }> {
    if (dto.invitationToken) {
      const invitation = await this.invitationsService.getInvitationByToken(
        dto.invitationToken,
      );
      if (invitation.email && invitation.email.toLowerCase() !== dto.email.toLowerCase()) {
        throw new ConflictException(
          'Invitation email does not match signup email',
        );
      }
      return {
        companyId: invitation.companyId,
        invitationToken: invitation.token,
        createdCompany: false,
      };
    }
    if (dto.companyId) {
      const existing = await (this.prisma as any).company.findUnique({
        where: { id: dto.companyId },
      });
      if (!existing) {
        throw new NotFoundException('Company not found');
      }
      return { companyId: existing.id, createdCompany: false };
    }
    if (dto.companyName?.trim()) {
      const company = await (this.prisma as any).company.create({
        data: { name: dto.companyName.trim() },
      });
      return { companyId: company.id, createdCompany: true };
    }
    if (dto.accountType === 'organization') {
      throw new ConflictException(
        'Provide a company name to create one or a valid company id to join.',
      );
    }
    const localPart = dto.email.split('@')[0] || 'Personal';
    const company = await (this.prisma as any).company.create({
      data: {
        name: `${localPart}'s workspace`,
        billingEmail: dto.email,
      },
    });
    return {
      companyId: company.id,
      createdCompany: true,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified');
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

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: token },
    });
    if (!user) {
      throw new NotFoundException('Verification token is invalid');
    }
    if (
      !user.emailVerificationTokenExpiresAt ||
      user.emailVerificationTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Verification token expired');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });
    return { ok: true };
  }

  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.emailVerified) {
      return { ok: true };
    }
    await this.enqueueEmailVerification(user);
    return { ok: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { ok: true };
    }
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetTokenExpiresAt: expiresAt,
      },
    });
    await this.emailService.sendPasswordReset(user.email, token);
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetToken: token },
    });
    if (!user) {
      throw new NotFoundException('Reset token is invalid');
    }
    if (
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException('Reset token expired');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
        emailVerified: true,
      },
    });
    return { ok: true };
  }

  private generateToken() {
    return randomBytes(32).toString('hex');
  }

  private async enqueueEmailVerification(user: User) {
    const token = this.generateToken();
    const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationTokenExpiresAt: expiresAt,
        emailVerified: false,
      },
    });
    await this.emailService.sendVerificationEmail(user.email, token);
  }
}
