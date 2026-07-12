import { Body, Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from '../../application/auth/auth.service';
import { SignupDto } from '../dto/auth/signup.dto';
import { LoginDto } from '../dto/auth/login.dto';
import { VerifyEmailDto } from '../dto/auth/verify-email.dto';
import { ResendVerificationDto } from '../dto/auth/resend-verification.dto';
import { RequestPasswordResetDto } from '../dto/auth/request-password-reset.dto';
import { ResetPasswordDto } from '../dto/auth/reset-password.dto';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto.email);
  }

  @Post('request-password-reset')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('accept-invitation')
  acceptInvitation(@Body('token') token: string, @Request() req) {
    return this.authService.acceptInvitation(token, req.user);
  }
}
