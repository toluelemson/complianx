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
import { ProjectsService } from '../../application/projects/projects.service';
import { CreateProjectDto } from '../dto/create-project.dto';
import { CloneProjectDto } from '../dto/clone-project.dto';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: AuthenticatedRequest) {
    const requested =
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined;
    return this.companyContext.resolveCompany(req.user, requested).companyId;
  }

  @Get()
  list(@Req() req: AuthenticatedRequest) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.listForUser(req.user.userId, companyId);
  }

  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateProjectDto) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.createForUser(req.user.userId, companyId, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.getProjectForUser(
      id,
      req.user.userId,
      companyId,
    );
  }

  @Post(':id/clone')
  clone(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CloneProjectDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.cloneProject(
      id,
      req.user.userId,
      companyId,
      dto.name,
    );
  }
}
