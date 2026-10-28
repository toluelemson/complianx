import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { SectionsService } from '../../application/sections/sections.service';
import { CreateSectionDto } from '../dto/sections/create-section.dto';
import { UpdateSectionDto } from '../dto/sections/update-section.dto';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import { CreateCommentDto } from '../dto/sections/create-comment.dto';
import { SuggestSectionDto } from '../dto/sections/suggest-section.dto';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/sections')
export class SectionsController {
  constructor(
    private readonly sectionsService: SectionsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Get()
  list(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.sectionsService.list(projectId, req.user.userId, companyId);
  }

  @Post()
  save(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateSectionDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.sectionsService.save(
      projectId,
      req.user.userId,
      companyId,
      dto,
    );
  }

  @Put(':sectionId')
  update(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateSectionDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.sectionsService.update(
      projectId,
      sectionId,
      req.user.userId,
      companyId,
      dto,
    );
  }

  @Get(':sectionId/comments')
  listComments(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.sectionsService.listComments(
      projectId,
      sectionId,
      req.user.userId,
      companyId,
    );
  }

  @Post(':sectionId/comments')
  addComment(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCommentDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.sectionsService.addComment(
      projectId,
      sectionId,
      req.user.userId,
      companyId,
      dto,
    );
  }

  @Patch(':sectionId/comments/:commentId/resolution')
  resolveComment(
    @Param('projectId') projectId: string,
    @Param('commentId') commentId: string,
    @Req() req: AuthenticatedRequest,
    @Body('resolved') resolved: boolean,
  ) {
    return this.sectionsService.setCommentResolved(
      projectId,
      commentId,
      req.user.userId,
      this.resolveCompanyId(req),
      resolved !== false,
    );
  }

  @Post(':sectionId/suggest')
  suggest(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionName: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: SuggestSectionDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.sectionsService.suggest(
      projectId,
      sectionName,
      req.user.userId,
      companyId,
      dto,
    );
  }
}
