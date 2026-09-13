import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AutoSaveService } from '../../application/auto-save/auto-save.service';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import { SaveSectionDto } from '../dto/save-section.dto';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('autosave')
export class AutoSaveController {
  constructor(private readonly autoSaveService: AutoSaveService, private readonly companyContext: CompanyContextService) {}

  private companyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(req.user, req.headers?.['x-company-id'] as string | undefined).companyId;
  }

  @Post('sections')
  saveSection(@Request() req: AuthenticatedRequest, @Body() dto: SaveSectionDto) {
    return this.autoSaveService.saveSection(req.user.userId, this.companyId(req), dto);
  }

  @Get('sections/:sectionId')
  getSection(@Param('sectionId') sectionId: string, @Request() req: AuthenticatedRequest) {
    return this.autoSaveService.getSectionAutosave(sectionId, req.user.userId, this.companyId(req));
  }

  @Delete('sections/:sectionId')
  deleteSection(@Param('sectionId') sectionId: string, @Request() req: AuthenticatedRequest) {
    return this.autoSaveService.deleteSectionAutosave(sectionId, req.user.userId, this.companyId(req));
  }
}
