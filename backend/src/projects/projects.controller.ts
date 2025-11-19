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

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  list(@Request() req) {
    return this.projectsService.listForUser(req.user.userId);
  }

  @Post()
  create(@Request() req, @Body() dto: CreateProjectDto) {
    return this.projectsService.createForUser(req.user.userId, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @Request() req) {
    return this.projectsService.getOwnedProject(id, req.user.userId);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @Request() req, @Body() dto: CloneProjectDto) {
    return this.projectsService.cloneProject(id, req.user.userId, dto.name);
  }

  @Post(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateProjectStatusDto,
  ) {
    return this.projectsService.updateStatus(
      id,
      req.user.userId,
      dto.status,
      dto.note,
      dto.signature,
    );
  }

  @Get(':id/reviewers')
  listReviewers(@Param('id') id: string, @Request() req) {
    return this.projectsService.listReviewers(id, req.user.userId);
  }

  @Post(':id/request-review')
  requestReview(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: RequestReviewDto,
  ) {
    return this.projectsService.requestReview(
      id,
      req.user.userId,
      dto.reviewerId,
      dto.message,
    );
  }
}
