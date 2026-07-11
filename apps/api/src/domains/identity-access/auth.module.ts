import { Module } from '@nestjs/common';
import { AuthService } from './application/auth/auth.service';
import { AuthController } from './presentation/controllers/auth.controller';
import { UsersModule } from './users.module';
import { InvitationsModule } from '../../invitations/invitations.module';
import { EmailService } from '../../platform/email/email.service';
import { JwtPlatformModule } from '../../platform/auth/jwt-platform.module';

@Module({
  imports: [UsersModule, InvitationsModule, JwtPlatformModule],
  providers: [AuthService, EmailService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
