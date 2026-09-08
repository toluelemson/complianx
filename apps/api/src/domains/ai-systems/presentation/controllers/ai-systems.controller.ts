import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';
import { ProjectsService } from '../../application/projects/projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { CloneProjectDto } from '../dto/clone-project.dto';
import { ImportPublicResultDto } from '../dto/import-public-result.dto';
import { ImportPublicResultService } from '../../application/import-public-result.service';

@UseGuards(JwtAuthGuard)
@Controller('ai-systems')
export class AiSystemsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly companyContext: CompanyContextService,
    private readonly importPublicResult: ImportPublicResultService,
  ) {}

  private resolveCompanyId(req: AuthenticatedRequest) {
    const requested = req.headers?.['x-company-id'] as string | undefined;
    return this.companyContext.resolveCompany(req.user, requested).companyId;
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    return this.projectsService.listForUser(
      req.user.userId,
      this.resolveCompanyId(req),
    );
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateProjectDto) {
    return this.projectsService.createForUser(
      req.user.userId,
      this.resolveCompanyId(req),
      dto,
    );
  }

  @Post('import-public-result')
  importResult(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ImportPublicResultDto,
  ) {
    return this.importPublicResult.import(
      dto.publicResultId,
      req.user.userId,
      this.resolveCompanyId(req),
      dto.name,
    );
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.projectsService.getProjectForUser(
      id,
      req.user.userId,
      this.resolveCompanyId(req),
    );
  }

  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CloneProjectDto,
  ) {
    return this.projectsService.cloneProject(
      id,
      req.user.userId,
      this.resolveCompanyId(req),
      dto.name,
    );
  }
}
