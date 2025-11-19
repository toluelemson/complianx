import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ArtifactsService } from './artifacts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ReviewArtifactDto } from './dto/review-artifact.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Get('projects/:projectId/sections/:sectionId/artifacts')
  list(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Request() req,
  ) {
    return this.artifactsService.list(projectId, sectionId, req.user.userId);
  }

  @Post('projects/:projectId/sections/:sectionId/artifacts')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  upload(
    @Param('projectId') projectId: string,
    @Param('sectionId') sectionId: string,
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body('description') description?: string,
    @Body('purpose') purpose?: 'DATASET' | 'MODEL' | 'GENERIC',
  ) {
    return this.artifactsService.upload(
      projectId,
      sectionId,
      req.user.userId,
      file,
      description,
      purpose,
    );
  }

  @Delete('artifacts/:artifactId')
  remove(@Param('artifactId') artifactId: string, @Request() req) {
    return this.artifactsService.remove(artifactId, req.user.userId);
  }

  @Get('artifacts/:artifactId/download')
  download(@Param('artifactId') artifactId: string, @Request() req) {
    return this.artifactsService.download(artifactId, req.user.userId);
  }

  @Patch('artifacts/:artifactId/review')
  review(
    @Param('artifactId') artifactId: string,
    @Body() dto: ReviewArtifactDto,
    @Request() req,
  ) {
    return this.artifactsService.review(
      artifactId,
      req.user.userId,
      dto.status,
      dto.comment,
    );
  }
}
