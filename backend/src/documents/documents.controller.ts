import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('projects/:projectId/documents')
  list(@Param('projectId') projectId: string, @Request() req) {
    return this.documentsService.list(projectId, req.user.userId);
  }

  @Get('documents/:id/download')
  download(@Param('id') id: string, @Request() req) {
    return this.documentsService.getDocumentForDownload(id, req.user.userId);
  }

  @Get('projects/:projectId/documents.zip')
  zip(@Param('projectId') projectId: string, @Request() req) {
    return this.documentsService.zipDocuments(projectId, req.user.userId);
  }
}
