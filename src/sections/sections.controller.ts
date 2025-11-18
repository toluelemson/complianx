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

@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  list(@Param('projectId') projectId: string, @Request() req) {
    return this.sectionsService.list(projectId, req.user.userId);
  }

  @Post()
  save(
    @Param('projectId') projectId: string,
    @Request() req,
    @Body() dto: CreateSectionDto,
  ) {
    return this.sectionsService.save(projectId, req.user.userId, dto);
  }

  @Put(':sectionId')
  update(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Request() req,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionsService.update(
      projectId,
      sectionId,
      req.user.userId,
      dto,
    );
  }

  @Get(':sectionId/comments')
  listComments(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Request() req,
  ) {
    return this.sectionsService.listComments(
      projectId,
      sectionId,
      req.user.userId,
    );
  }

  @Post(':sectionId/comments')
  addComment(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Request() req,
    @Body() dto: CreateCommentDto,
  ) {
    return this.sectionsService.addComment(
      projectId,
      sectionId,
      req.user.userId,
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
    return this.sectionsService.suggest(
      projectId,
      sectionName,
      req.user.userId,
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
    return this.sectionsService.updateStatus(
      projectId,
      sectionId,
      req.user.userId,
      dto,
    );
  }
}
