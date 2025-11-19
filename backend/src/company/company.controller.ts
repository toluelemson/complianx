import { Body, Controller, Get, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  me(@Request() req) {
    return this.companyService.getCompanyForUser(req.user.userId);
  }

  @Patch()
  rename(@Request() req, @Body('name') name: string) {
    return this.companyService.updateCompanyName(req.user.userId, name);
  }

  @Patch('members/:memberId/remove')
  removeMember(@Request() req, @Param('memberId') memberId: string) {
    return this.companyService.removeMember(req.user.userId, memberId);
  }
}
