import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompanyContextService } from '../company/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: any) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Get('projects/:projectId/documents')
  list(@Param('projectId') projectId: string, @Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.documentsService.list(projectId, req.user.userId, companyId);
  }

  @Get('documents/:id/download')
  download(@Param('id') id: string, @Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.documentsService.getDocumentForDownload(
      id,
      req.user.userId,
      companyId,
    );
  }

  @Get('projects/:projectId/documents.zip')
  zip(@Param('projectId') projectId: string, @Request() req) {
    const companyId = this.resolveCompanyId(req);
    return this.documentsService.zipDocuments(
      projectId,
      req.user.userId,
      companyId,
    );
  }
}
