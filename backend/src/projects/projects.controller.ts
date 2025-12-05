import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { CloneProjectDto } from './dto/clone-project.dto';
import { UpdateProjectStatusDto } from './dto/update-status.dto';
import { RequestReviewDto } from './dto/request-review.dto';
import { CompanyContextService } from '../company/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: any) {
    const requested =
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined;
    return this.companyContext.resolveCompany(req.user, requested).companyId;
  }

  @Get()
  list(@Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.listForUser(req.user.userId, companyId);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateProjectDto) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.createForUser(req.user.userId, companyId, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.getProjectForUser(
      id,
      req.user.userId,
      companyId,
    );
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @Request() req, @Body() dto: CloneProjectDto) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.cloneProject(
      id,
      req.user.userId,
      companyId,
      dto.name,
    );
  }

  @Post(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.updateStatus(
      id,
      req.user.userId,
      companyId,
      dto.status,
      dto.note,
      dto.signature,
    );
  }

  @Get(':id/reviewers')
  listReviewers(@Param('id') id: string, @Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.listReviewers(id, req.user.userId, companyId);
  }

  @Post(':id/request-review')
  requestReview(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: RequestReviewDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.projectsService.requestReview(
      id,
      req.user.userId,
      companyId,
      dto.reviewerId,
      dto.message,
      dto.approverId,
    );
  }
}
