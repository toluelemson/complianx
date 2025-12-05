import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SectionsService } from './sections.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SuggestSectionDto } from './dto/suggest-section.dto';
import { UpdateSectionStatusDto } from './dto/update-section-status.dto';
import { CompanyContextService } from '../company/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/sections')
export class SectionsController {
  constructor(
    private readonly sectionsService: SectionsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: any) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Get()
  list(@Param('projectId') projectId: string, @Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.sectionsService.list(projectId, req.user.userId, companyId);
  }

  @Post()
  save(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body() dto: CreateSectionDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.sectionsService.save(projectId, req.user.userId, companyId, dto);
  }

  @Put(':sectionId')
  update(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Request() req,
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
    @Request() req,
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
    @Request() req,
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

  @Post(':sectionId/suggest')
  suggest(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionName: string,
    @Request() req,
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

  @Post(':sectionId/status')
  updateStatus(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Request() req,
    @Body() dto: UpdateSectionStatusDto,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.sectionsService.updateStatus(
      projectId,
      sectionId,
      req.user.userId,
      companyId,
      dto,
    );
  }
}
