import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../platform/database/prisma.service';
import {
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from '../domain/workflow-status';
import {
  AssignedProjectReview,
  ProjectWorkflowHistoryEntry,
  ProjectWorkflowTransitionRequest,
  SectionWorkflowHistoryEntry,
  SectionWorkflowTransitionRequest,
  WorkflowActor,
  WorkflowMembership,
} from '../domain/workflow.types';
import { WorkflowVersionConflictError } from '../domain/workflow-errors';
import {
  IncompleteAssessmentError,
  ReviewerNotAssignedError,
} from '../domain/workflow-errors';
import { sectionFieldsComplete } from '../application/project-readiness.service';
import { ProjectWorkflowRepository } from './project-workflow.repository';
import { SectionWorkflowRepository } from './section-workflow.repository';

const WORKFLOW_NOTE_PREFIX = '[workflow:';

const projectWorkflowSelect = Prisma.validator<Prisma.ProjectSelect>()({
  id: true,
  name: true,
  companyId: true,
  ownerId: true,
  reviewerId: true,
  approverId: true,
  workflowStatus: true,
  workflowVersion: true,
  sections: {
    select: {
      id: true,
      name: true,
      content: true,
      workflowStatus: true,
    },
  },
});

const projectApprovalSnapshotSelect = Prisma.validator<Prisma.ProjectSelect>()({
  id: true,
  name: true,
  companyId: true,
  approverId: true,
  workflowStatus: true,
  approver: { select: { email: true } },
  sections: { select: { workflowStatus: true } },
});

const assignedReviewSelect = Prisma.validator<Prisma.ProjectSelect>()({
  id: true,
  name: true,
  ownerId: true,
  reviewerId: true,
  approverId: true,
  workflowStatus: true,
  workflowVersion: true,
  updatedAt: true,
});

const sectionWorkflowSelect = Prisma.validator<Prisma.SectionSelect>()({
  id: true,
  name: true,
  projectId: true,
  workflowStatus: true,
  project: {
    select: {
      id: true,
      name: true,
      companyId: true,
      ownerId: true,
      reviewerId: true,
      approverId: true,
      workflowStatus: true,
      workflowVersion: true,
    },
  },
});

type ProjectStatusEventRecord = Prisma.ProjectStatusEventGetPayload<{
  include: { actor: { select: { id: true; email: true } } };
}>;
type SectionStatusEventRecord = Prisma.SectionStatusEventGetPayload<{
  include: { actor: { select: { id: true; email: true } } };
}>;

function encodeWorkflowNote(status: string, note?: string) {
  return `${WORKFLOW_NOTE_PREFIX}${status}]${note ? ` ${note}` : ''}`;
}

function decodeWorkflowNote<TStatus extends string>(
  note: string | null,
  fallbackStatus: TStatus,
): { workflowStatus: TStatus; note?: string | null } {
  if (!note?.startsWith(WORKFLOW_NOTE_PREFIX)) {
    return { workflowStatus: fallbackStatus, note };
  }
  const end = note.indexOf(']');
  if (end === -1) {
    return { workflowStatus: fallbackStatus, note };
  }
  const workflowStatus = note.slice(
    WORKFLOW_NOTE_PREFIX.length,
    end,
  ) as TStatus;
  const decodedNote = note.slice(end + 1).trim();
  return { workflowStatus, note: decodedNote || null };
}

function toProjectWorkflowStatus(
  status: `${ProjectWorkflowStatus}`,
): ProjectWorkflowStatus {
  return status as ProjectWorkflowStatus;
}

function toSectionWorkflowStatus(
  status: `${SectionWorkflowStatus}`,
): SectionWorkflowStatus {
  return status as SectionWorkflowStatus;
}

@Injectable()
export class PrismaWorkflowRepository
  implements ProjectWorkflowRepository, SectionWorkflowRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async findActor(actorId: string): Promise<WorkflowActor | null> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, role: true, companyId: true },
    });
    return actor ?? null;
  }

  async findMembership(
    userId: string,
    companyId: string,
  ): Promise<WorkflowMembership | null> {
    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
      select: { companyId: true, role: true },
    });
    return membership
      ? { companyId: membership.companyId, role: membership.role }
      : null;
  }

  async getProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: projectWorkflowSelect,
    });
    if (!project) {
      return null;
    }
    return {
      ...project,
      workflowStatus: toProjectWorkflowStatus(project.workflowStatus),
      sections: project.sections.map((section) => ({
        ...section,
        workflowStatus: toSectionWorkflowStatus(section.workflowStatus),
      })),
    };
  }

  async listReviewerCandidates(companyId: string, actorId: string) {
    const memberships = await this.prisma.userCompany.findMany({
      where: {
        companyId,
        role: { in: ['REVIEWER', 'ADMIN'] as const },
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
    if (memberships.length > 0) {
      return memberships
        .map((entry) => ({
          id: entry.user.id,
          email: entry.user.email,
          role: entry.role,
        }))
        .sort((a, b) => a.email.localeCompare(b.email));
    }
    const selfMembership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: actorId, companyId } },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!selfMembership) {
      return [];
    }
    return [
      {
        id: selfMembership.user.id,
        email: selfMembership.user.email,
        role: selfMembership.role,
      },
    ];
  }

  async getProjectApprovalSnapshot(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: projectApprovalSnapshotSelect,
    });
    if (!project) {
      return null;
    }
    return {
      id: project.id,
      name: project.name,
      companyId: project.companyId ?? null,
      approverId: project.approverId ?? null,
      approverEmail: project.approver?.email ?? null,
      workflowStatus: toProjectWorkflowStatus(project.workflowStatus),
      allSectionsApproved:
        project.sections.length > 0 &&
        project.sections.every(
          (section) =>
            toSectionWorkflowStatus(section.workflowStatus) ===
            SectionWorkflowStatus.APPROVED,
        ),
    };
  }

  async transitionProject(request: ProjectWorkflowTransitionRequest) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.project.findUnique({
        where: { id: request.projectId },
        select: {
          workflowStatus: true,
          workflowVersion: true,
          reviewerId: true,
          sections: {
            select: {
              id: true,
              name: true,
              content: true,
              workflowStatus: true,
            },
          },
        },
      });
      if (!current) throw new NotFoundException('Project not found');
      if (
        toProjectWorkflowStatus(current.workflowStatus) !==
          ProjectWorkflowStatus.DRAFT ||
        (typeof request.expectedVersion === 'number' &&
          current.workflowVersion !== request.expectedVersion)
      )
        throw new WorkflowVersionConflictError();
      const reviewerId = request.reviewerId ?? current.reviewerId;
      if (!reviewerId) throw new ReviewerNotAssignedError();
      if (
        current.sections.length === 0 ||
        !current.sections.every((section) =>
          sectionFieldsComplete({
            ...section,
            workflowStatus: toSectionWorkflowStatus(section.workflowStatus),
          }),
        )
      )
        throw new IncompleteAssessmentError(
          'Every required field must be complete before submission',
        );

      const updateResult = await tx.project.updateMany({
        where: {
          id: request.projectId,
          ...(typeof request.expectedVersion === 'number'
            ? { workflowVersion: request.expectedVersion }
            : {}),
        },
        data: {
          workflowStatus: request.toStatus,
          workflowVersion: { increment: 1 },
          reviewerId,
          approverId: request.approverId ?? undefined,
        },
      });
      if (updateResult.count !== 1) {
        throw new WorkflowVersionConflictError();
      }
      await tx.projectStatusEvent.create({
        data: {
          projectId: request.projectId,
          status: request.toStatus,
          note: encodeWorkflowNote(request.toStatus, request.note),
          signature: request.signature?.trim(),
          actorId: request.actorId,
        },
      });
    });
  }

  async submitProjectForReview(request: ProjectWorkflowTransitionRequest) {
    await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.project.updateMany({
        where: {
          id: request.projectId,
          workflowStatus: ProjectWorkflowStatus.DRAFT,
          ...(typeof request.expectedVersion === 'number'
            ? { workflowVersion: request.expectedVersion }
            : {}),
        },
        data: {
          workflowStatus: ProjectWorkflowStatus.READY_FOR_REVIEW,
          workflowVersion: { increment: 1 },
          reviewerId: request.reviewerId ?? undefined,
          approverId: request.approverId ?? undefined,
        },
      });
      if (updateResult.count !== 1) throw new WorkflowVersionConflictError();

      const draftSections = await tx.section.findMany({
        where: {
          projectId: request.projectId,
          workflowStatus: SectionWorkflowStatus.DRAFT,
        },
        select: { id: true },
      });
      if (draftSections.length) {
        await tx.section.updateMany({
          where: { id: { in: draftSections.map((section) => section.id) } },
          data: { workflowStatus: SectionWorkflowStatus.COMPLETE },
        });
        await tx.sectionStatusEvent.createMany({
          data: draftSections.map((section) => ({
            sectionId: section.id,
            status: SectionWorkflowStatus.COMPLETE,
            note: encodeWorkflowNote(
              SectionWorkflowStatus.COMPLETE,
              request.note ?? 'Completed during project submission',
            ),
            actorId: request.actorId,
          })),
        });
      }
      await tx.projectStatusEvent.create({
        data: {
          projectId: request.projectId,
          status: ProjectWorkflowStatus.READY_FOR_REVIEW,
          note: encodeWorkflowNote(
            ProjectWorkflowStatus.READY_FOR_REVIEW,
            request.note,
          ),
          actorId: request.actorId,
        },
      });
    });
    const project = await this.getProject(request.projectId);
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async listProjectHistory(
    projectId: string,
  ): Promise<ProjectWorkflowHistoryEntry[]> {
    const events = await this.prisma.projectStatusEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, email: true } } },
    });
    return events.map((event: ProjectStatusEventRecord) => {
      const decoded = decodeWorkflowNote<ProjectWorkflowStatus>(
        event.note,
        toProjectWorkflowStatus(event.status),
      );
      return {
        id: event.id,
        createdAt: event.createdAt,
        actorId: event.actorId,
        actorEmail: event.actor?.email,
        workflowStatus: decoded.workflowStatus,
        note: decoded.note,
        signature: event.signature,
      };
    });
  }

  async listAssignedReviews(
    userId: string,
    companyId: string,
  ): Promise<AssignedProjectReview[]> {
    const projects = await this.prisma.project.findMany({
      where: {
        companyId,
        OR: [{ reviewerId: userId }, { approverId: userId }],
      },
      select: assignedReviewSelect,
      orderBy: { updatedAt: 'desc' },
    });
    return projects.map((project) => ({
      ...project,
      workflowStatus: toProjectWorkflowStatus(project.workflowStatus),
    }));
  }

  async getSection(sectionId: string) {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: sectionWorkflowSelect,
    });
    if (!section) {
      return null;
    }
    return {
      ...section,
      workflowStatus: toSectionWorkflowStatus(section.workflowStatus),
      project: {
        ...section.project,
        workflowStatus: toProjectWorkflowStatus(section.project.workflowStatus),
      },
    };
  }

  async transitionSection(request: SectionWorkflowTransitionRequest) {
    await this.prisma.$transaction(async (tx) => {
      const section = await tx.section.findUnique({
        where: { id: request.sectionId },
        select: { projectId: true },
      });
      if (!section) {
        throw new NotFoundException('Section not found');
      }
      await tx.section.update({
        where: { id: request.sectionId },
        data: {
          workflowStatus: request.toStatus,
        },
      });
      await tx.sectionStatusEvent.create({
        data: {
          sectionId: request.sectionId,
          status: request.toStatus,
          note: encodeWorkflowNote(request.toStatus, request.note),
          signature: request.signature?.trim(),
          actorId: request.actorId,
        },
      });
      if (request.toStatus === SectionWorkflowStatus.CHANGES_REQUESTED) {
        await tx.project.update({
          where: { id: section.projectId },
          data: {
            workflowStatus: ProjectWorkflowStatus.CHANGES_REQUESTED,
            workflowVersion: { increment: 1 },
          },
        });
        await tx.projectStatusEvent.create({
          data: {
            projectId: section.projectId,
            status: ProjectWorkflowStatus.CHANGES_REQUESTED,
            note: encodeWorkflowNote(
              ProjectWorkflowStatus.CHANGES_REQUESTED,
              request.note ?? 'Section changes requested',
            ),
            actorId: request.actorId,
          },
        });
      }
    });
  }

  async listSectionHistory(
    sectionId: string,
  ): Promise<SectionWorkflowHistoryEntry[]> {
    const events = await this.prisma.sectionStatusEvent.findMany({
      where: { sectionId },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, email: true } } },
    });
    return events.map((event: SectionStatusEventRecord) => {
      const decoded = decodeWorkflowNote<SectionWorkflowStatus>(
        event.note,
        toSectionWorkflowStatus(event.status),
      );
      return {
        id: event.id,
        createdAt: event.createdAt,
        actorId: event.actorId,
        actorEmail: event.actor?.email,
        workflowStatus: decoded.workflowStatus,
        note: decoded.note,
        signature: event.signature,
      };
    });
  }
}
