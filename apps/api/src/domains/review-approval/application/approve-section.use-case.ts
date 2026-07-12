import { Inject, Injectable } from '@nestjs/common';
import { WorkflowContextService } from './workflow-context.service';
import { WorkflowPolicyService } from '../domain/workflow-policy.service';
import { WorkflowSideEffectsService } from './workflow-side-effects.service';
import { SectionWorkflowStatus } from '../domain/workflow-status';
import { IncompleteAssessmentError } from '../domain/workflow-errors';
import {
  SECTION_WORKFLOW_REPOSITORY,
  SectionWorkflowRepository,
} from '../infrastructure/section-workflow.repository';

@Injectable()
export class ApproveSectionUseCase {
  constructor(
    private readonly context: WorkflowContextService,
    private readonly policy: WorkflowPolicyService,
    private readonly sideEffects: WorkflowSideEffectsService,
    @Inject(SECTION_WORKFLOW_REPOSITORY)
    private readonly sections: SectionWorkflowRepository,
  ) {}

  async execute(params: {
    sectionId: string;
    actorId: string;
    note?: string;
    signature?: string;
  }) {
    if (!params.signature?.trim()) {
      throw new IncompleteAssessmentError('Signature is required to approve');
    }
    const context = await this.context.loadSectionContext(
      params.sectionId,
      params.actorId,
    );
    this.policy.assertSectionPermission('APPROVE', context);
    this.policy.assertSectionTransition(
      context.section.workflowStatus,
      SectionWorkflowStatus.APPROVED,
    );
    await this.sections.transitionSection({
      sectionId: params.sectionId,
      actorId: params.actorId,
      toStatus: SectionWorkflowStatus.APPROVED,
      note: params.note,
      signature: params.signature,
    });
    await this.sideEffects.onSectionTransition({
      section: context.section,
      toStatus: SectionWorkflowStatus.APPROVED,
      actorId: params.actorId,
      note: params.note,
    });
    return this.sections.getSection(params.sectionId);
  }
}
