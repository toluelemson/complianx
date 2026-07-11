import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { CompanyContextService } from '../../company/company-context.service';
import { SubmitProjectForReviewUseCase } from '../application/submit-project-for-review.use-case';
import { StartProjectReviewUseCase } from '../application/start-project-review.use-case';
import { RequestProjectChangesUseCase } from '../application/request-project-changes.use-case';
import { ResubmitProjectUseCase } from '../application/resubmit-project.use-case';
import { ApproveProjectUseCase } from '../application/approve-project.use-case';
import { ArchiveProjectUseCase } from '../application/archive-project.use-case';
import { CompleteSectionUseCase } from '../application/complete-section.use-case';
import { SubmitSectionForReviewUseCase } from '../application/submit-section-for-review.use-case';
import { RequestSectionChangesUseCase } from '../application/request-section-changes.use-case';
import { ApproveSectionUseCase } from '../application/approve-section.use-case';
import { WorkflowQueryService } from '../application/workflow-query.service';
import { ProjectWorkflowActionDto } from './dto/project-workflow-action.dto';
import { SectionWorkflowActionDto } from './dto/section-workflow-action.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class WorkflowController {
  constructor(
    private readonly companyContext: CompanyContextService,
    private readonly submitProject: SubmitProjectForReviewUseCase,
    private readonly startProjectReview: StartProjectReviewUseCase,
    private readonly requestProjectChanges: RequestProjectChangesUseCase,
    private readonly resubmitProject: ResubmitProjectUseCase,
    private readonly approveProject: ApproveProjectUseCase,
    private readonly archiveProject: ArchiveProjectUseCase,
    private readonly completeSection: CompleteSectionUseCase,
    private readonly submitSection: SubmitSectionForReviewUseCase,
    private readonly requestSectionChanges: RequestSectionChangesUseCase,
    private readonly approveSection: ApproveSectionUseCase,
    private readonly queries: WorkflowQueryService,
  ) {}

  private resolveCompanyId(req: any) {
    return this.companyContext.resolveCompany(
      req.user,
      (req.headers?.['x-company-id'] as string | undefined) ?? undefined,
    ).companyId;
  }

  @Post('projects/:projectId/workflow/submit')
  submit(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Body() dto: ProjectWorkflowActionDto,
  ) {
    return this.submitProject.execute({
      projectId,
      actorId: req.user.userId,
      expectedVersion: dto.expectedVersion,
      reviewerId: dto.reviewerId,
      approverId: dto.approverId,
      note: dto.note,
    });
  }

  @Post('projects/:projectId/workflow/start-review')
  startReview(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Body() dto: ProjectWorkflowActionDto,
  ) {
    return this.startProjectReview.execute({
      projectId,
      actorId: req.user.userId,
      expectedVersion: dto.expectedVersion,
      note: dto.note,
    });
  }

  @Post('projects/:projectId/workflow/request-changes')
  requestChanges(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Body() dto: ProjectWorkflowActionDto,
  ) {
    return this.requestProjectChanges.execute({
      projectId,
      actorId: req.user.userId,
      expectedVersion: dto.expectedVersion,
      note: dto.note ?? '',
    });
  }

  @Post('projects/:projectId/workflow/resubmit')
  resubmit(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Body() dto: ProjectWorkflowActionDto,
  ) {
    return this.resubmitProject.execute({
      projectId,
      actorId: req.user.userId,
      expectedVersion: dto.expectedVersion,
      note: dto.note,
    });
  }

  @Post('projects/:projectId/workflow/approve')
  approve(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Body() dto: ProjectWorkflowActionDto,
  ) {
    return this.approveProject.execute({
      projectId,
      actorId: req.user.userId,
      expectedVersion: dto.expectedVersion,
      note: dto.note,
      signature: dto.signature,
    });
  }

  @Post('projects/:projectId/workflow/archive')
  archive(
    @Param('projectId') projectId: string,
    @Request() req: any,
    @Body() dto: ProjectWorkflowActionDto,
  ) {
    return this.archiveProject.execute({
      projectId,
      actorId: req.user.userId,
      expectedVersion: dto.expectedVersion,
      note: dto.note,
    });
  }

  @Get('projects/:projectId/workflow')
  getProjectWorkflow(@Param('projectId') projectId: string, @Request() req: any) {
    return this.queries.getProjectWorkflow(projectId, req.user.userId);
  }

  @Get('projects/:projectId/workflow/history')
  getProjectHistory(@Param('projectId') projectId: string, @Request() req: any) {
    return this.queries.getProjectHistory(projectId, req.user.userId);
  }

  @Get('projects/:projectId/workflow/readiness')
  getProjectReadiness(@Param('projectId') projectId: string, @Request() req: any) {
    return this.queries.getProjectReadiness(projectId, req.user.userId);
  }

  @Post('sections/:sectionId/workflow/complete')
  complete(
    @Param('sectionId') sectionId: string,
    @Request() req: any,
    @Body() dto: SectionWorkflowActionDto,
  ) {
    return this.completeSection.execute({
      sectionId,
      actorId: req.user.userId,
      note: dto.note,
    });
  }

  @Post('sections/:sectionId/workflow/start-review')
  startSectionReview(
    @Param('sectionId') sectionId: string,
    @Request() req: any,
    @Body() dto: SectionWorkflowActionDto,
  ) {
    return this.submitSection.execute({
      sectionId,
      actorId: req.user.userId,
      note: dto.note,
    });
  }

  @Post('sections/:sectionId/workflow/request-changes')
  requestSectionChangesAction(
    @Param('sectionId') sectionId: string,
    @Request() req: any,
    @Body() dto: SectionWorkflowActionDto,
  ) {
    return this.requestSectionChanges.execute({
      sectionId,
      actorId: req.user.userId,
      note: dto.note ?? '',
    });
  }

  @Post('sections/:sectionId/workflow/approve')
  approveSectionAction(
    @Param('sectionId') sectionId: string,
    @Request() req: any,
    @Body() dto: SectionWorkflowActionDto,
  ) {
    return this.approveSection.execute({
      sectionId,
      actorId: req.user.userId,
      note: dto.note,
      signature: dto.signature,
    });
  }

  @Get('sections/:sectionId/workflow')
  getSectionWorkflow(@Param('sectionId') sectionId: string, @Request() req: any) {
    return this.queries.getSectionWorkflow(sectionId, req.user.userId);
  }

  @Get('sections/:sectionId/workflow/history')
  getSectionHistory(@Param('sectionId') sectionId: string, @Request() req: any) {
    return this.queries.getSectionHistory(sectionId, req.user.userId);
  }

  @Get('reviews/assigned-to-me')
  assignedToMe(@Request() req: any) {
    const companyId = this.resolveCompanyId(req);
    return this.queries.getAssignedReviews(req.user.userId, companyId);
  }
}
