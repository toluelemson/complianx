import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT secret not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    role?: string;
    companyId?: string;
    firstName?: string | null;
    lastName?: string | null;
    jobTitle?: string | null;
    phone?: string | null;
    timezone?: string | null;
  }) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      companyId: payload.companyId,
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      jobTitle: payload.jobTitle ?? null,
      phone: payload.phone ?? null,
      timezone: payload.timezone ?? null,
    };
  }
}
