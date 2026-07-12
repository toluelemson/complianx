import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { CompanyModule } from '../organizations/company.module';
import { EmailService } from '../../platform/email/email.service';
import { WorkflowController } from './presentation/workflow.controller';
import { WorkflowPolicyService } from './domain/workflow-policy.service';
import { PrismaWorkflowRepository } from './infrastructure/prisma-workflow.repository';
import { PROJECT_WORKFLOW_REPOSITORY } from './infrastructure/project-workflow.repository';
import { SECTION_WORKFLOW_REPOSITORY } from './infrastructure/section-workflow.repository';
import { WorkflowContextService } from './application/workflow-context.service';
import { BlockingCommentChecker } from './application/blocking-comment-checker';
import { WorkflowSideEffectsService } from './application/workflow-side-effects.service';
import { ProjectReadinessService } from './application/project-readiness.service';
import { SubmitProjectForReviewUseCase } from './application/submit-project-for-review.use-case';
import { StartProjectReviewUseCase } from './application/start-project-review.use-case';
import { RequestProjectChangesUseCase } from './application/request-project-changes.use-case';
import { ResubmitProjectUseCase } from './application/resubmit-project.use-case';
import { ApproveProjectUseCase } from './application/approve-project.use-case';
import { ArchiveProjectUseCase } from './application/archive-project.use-case';
import { CompleteSectionUseCase } from './application/complete-section.use-case';
import { SubmitSectionForReviewUseCase } from './application/submit-section-for-review.use-case';
import { RequestSectionChangesUseCase } from './application/request-section-changes.use-case';
import { ApproveSectionUseCase } from './application/approve-section.use-case';
import { WorkflowQueryService } from './application/workflow-query.service';
import { ReopenProjectAfterSectionEditUseCase } from './application/reopen-project-after-section-edit.use-case';

@Module({
  imports: [NotificationsModule, CompanyModule],
  controllers: [WorkflowController],
  providers: [
    WorkflowPolicyService,
    PrismaWorkflowRepository,
    {
      provide: PROJECT_WORKFLOW_REPOSITORY,
      useExisting: PrismaWorkflowRepository,
    },
    {
      provide: SECTION_WORKFLOW_REPOSITORY,
      useExisting: PrismaWorkflowRepository,
    },
    WorkflowContextService,
    BlockingCommentChecker,
    EmailService,
    WorkflowSideEffectsService,
    ProjectReadinessService,
    SubmitProjectForReviewUseCase,
    StartProjectReviewUseCase,
    RequestProjectChangesUseCase,
    ResubmitProjectUseCase,
    ApproveProjectUseCase,
    ArchiveProjectUseCase,
    CompleteSectionUseCase,
    SubmitSectionForReviewUseCase,
    RequestSectionChangesUseCase,
    ApproveSectionUseCase,
    WorkflowQueryService,
    ReopenProjectAfterSectionEditUseCase,
  ],
  exports: [
    SubmitProjectForReviewUseCase,
    StartProjectReviewUseCase,
    RequestProjectChangesUseCase,
    ResubmitProjectUseCase,
    ApproveProjectUseCase,
    ArchiveProjectUseCase,
    CompleteSectionUseCase,
    SubmitSectionForReviewUseCase,
    RequestSectionChangesUseCase,
    ApproveSectionUseCase,
    WorkflowQueryService,
    ReopenProjectAfterSectionEditUseCase,
  ],
})
export class ReviewApprovalModule {}
