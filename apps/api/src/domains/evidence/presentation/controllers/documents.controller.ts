import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { DocumentsService } from '../../application/documents/documents.service';
import { JwtAuthGuard } from '../../../../platform/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '../../../../platform/auth/authenticated-request.type';
import { CompanyContextService } from '../../../organizations/application/membership/company-context.service';

@UseGuards(JwtAuthGuard)
@Controller()
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly companyContext: CompanyContextService,
  ) {}

  private resolveCompanyId(req: AuthenticatedRequest) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Get('projects/:projectId/documents')
  list(
    @Param('projectId') projectId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const companyId = this.resolveCompanyId(req);
    return this.documentsService.list(projectId, req.user.userId, companyId);
  }

  @Get('documents/:id/download')
  download(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const companyId = this.resolveCompanyId(req);
    return this.documentsService.getDocumentForDownload(
      id,
      req.user.userId,
      companyId,
    );
  }

  @Get('projects/:projectId/documents.zip')
  zip(@Param('projectId') projectId: string, @Req() req: AuthenticatedRequest) {
    const companyId = this.resolveCompanyId(req);
    return this.documentsService.zipDocuments(
      projectId,
      req.user.userId,
      companyId,
    );
  }
}
