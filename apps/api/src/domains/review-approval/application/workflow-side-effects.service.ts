import { Injectable } from '@nestjs/common';
import { NotificationsService } from '../../../notifications/notifications.service';
import {
  ProjectWorkflowAggregate,
  SectionWorkflowAggregate,
} from '../domain/workflow.types';
import {
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from '../domain/workflow-status';

@Injectable()
export class WorkflowSideEffectsService {
  constructor(private readonly notifications: NotificationsService) {}

  async onProjectTransition(params: {
    project: ProjectWorkflowAggregate;
    toStatus: ProjectWorkflowStatus;
    actorId: string;
    note?: string;
  }) {
    const { project, toStatus, actorId, note } = params;
    const companyId = project.companyId ?? undefined;
    if (
      (toStatus === ProjectWorkflowStatus.CHANGES_REQUESTED ||
        toStatus === ProjectWorkflowStatus.APPROVED) &&
      project.ownerId !== actorId
    ) {
      await this.notifications.create({
        userId: project.ownerId,
        title:
          toStatus === ProjectWorkflowStatus.APPROVED
            ? `Project approved: ${project.name}`
            : `Changes requested: ${project.name}`,
        body:
          note?.trim() ||
          (toStatus === ProjectWorkflowStatus.APPROVED
            ? 'A reviewer approved your project.'
            : 'A reviewer requested changes.'),
        type: 'review',
        meta: { projectId: project.id, companyId },
      });
    }

    if (
      toStatus === ProjectWorkflowStatus.READY_FOR_REVIEW &&
      project.reviewerId &&
      project.reviewerId !== actorId
    ) {
      await this.notifications.create({
        userId: project.reviewerId,
        title: `Review requested: ${project.name}`,
        body: note?.trim() || 'A project requires your review.',
        type: 'review',
        meta: { projectId: project.id, companyId },
      });
    }
  }

  async onSectionTransition(params: {
    section: SectionWorkflowAggregate;
    toStatus: SectionWorkflowStatus;
    actorId: string;
    note?: string;
  }) {
    const { section, toStatus, actorId, note } = params;
    if (
      (toStatus === SectionWorkflowStatus.APPROVED ||
        toStatus === SectionWorkflowStatus.CHANGES_REQUESTED) &&
      section.project.ownerId !== actorId
    ) {
      await this.notifications.create({
        userId: section.project.ownerId,
        title:
          toStatus === SectionWorkflowStatus.APPROVED
            ? `Section approved: ${section.name}`
            : `Changes requested: ${section.name}`,
        body:
          note?.trim() ||
          (toStatus === SectionWorkflowStatus.APPROVED
            ? 'A reviewer approved a section.'
            : 'A reviewer requested changes.'),
        type: 'review',
        meta: { projectId: section.projectId, sectionId: section.id },
      });
    }
  }
}
