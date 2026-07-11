import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  inferProjectWorkflowFromLegacyStatus,
  inferSectionWorkflowFromLegacyStatus,
  mapProjectWorkflowToLegacyStatus,
  mapSectionWorkflowToLegacyStatus,
} from '../domain/workflow-transition';
import {
  ProjectWorkflowStatus,
  SectionWorkflowStatus,
} from '../domain/workflow-status';
import {
  ProjectWorkflowHistoryEntry,
  ProjectWorkflowTransitionRequest,
  SectionWorkflowHistoryEntry,
  SectionWorkflowTransitionRequest,
  WorkflowActor,
  WorkflowMembership,
} from '../domain/workflow.types';
import { WorkflowVersionConflictError } from '../domain/workflow-errors';
import {
  ProjectWorkflowRepository,
} from './project-workflow.repository';
import { SectionWorkflowRepository } from './section-workflow.repository';

const WORKFLOW_NOTE_PREFIX = '[workflow:';

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
  const workflowStatus = note.slice(WORKFLOW_NOTE_PREFIX.length, end) as TStatus;
  const decodedNote = note.slice(end + 1).trim();
  return { workflowStatus, note: decodedNote || null };
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
    const project = await (this.prisma as any).project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        companyId: true,
        ownerId: true,
        reviewerId: true,
        approverId: true,
        status: true,
        workflowStatus: true,
        workflowVersion: true,
        sections: {
          select: {
            id: true,
            name: true,
            status: true,
            workflowStatus: true,
          },
        },
      },
    });
    return project ?? null;
  }

  async transitionProject(request: ProjectWorkflowTransitionRequest) {
    const legacyStatus = mapProjectWorkflowToLegacyStatus(request.toStatus);
    await this.prisma.$transaction(async (tx) => {
      const updateResult = await (tx as any).project.updateMany({
        where: {
          id: request.projectId,
          ...(typeof request.expectedVersion === 'number'
            ? { workflowVersion: request.expectedVersion }
            : {}),
        },
        data: {
          status: legacyStatus,
          workflowStatus: request.toStatus,
          workflowVersion: { increment: 1 },
          reviewerId: request.reviewerId ?? undefined,
          approverId: request.approverId ?? undefined,
        },
      });
      if (updateResult.count !== 1) {
        throw new WorkflowVersionConflictError();
      }
      await (tx as any).projectStatusEvent.create({
        data: {
          projectId: request.projectId,
          status: legacyStatus,
          note: encodeWorkflowNote(request.toStatus, request.note),
          signature: request.signature?.trim(),
          actorId: request.actorId,
        },
      });
    });
  }

  async listProjectHistory(projectId: string): Promise<ProjectWorkflowHistoryEntry[]> {
    const events = await (this.prisma as any).projectStatusEvent.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, email: true } } },
    });
    return events.map((event: any) => {
      const decoded = decodeWorkflowNote<ProjectWorkflowStatus>(
        event.note,
        inferProjectWorkflowFromLegacyStatus(event.status),
      );
      return {
        id: event.id,
        createdAt: event.createdAt,
        actorId: event.actorId,
        actorEmail: event.actor?.email,
        legacyStatus: event.status,
        workflowStatus: decoded.workflowStatus,
        note: decoded.note,
        signature: event.signature,
      };
    });
  }

  async listAssignedReviews(userId: string, companyId: string) {
    return (this.prisma as any).project.findMany({
      where: {
        companyId,
        OR: [{ reviewerId: userId }, { approverId: userId }],
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        reviewerId: true,
        approverId: true,
        workflowStatus: true,
        workflowVersion: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getSection(sectionId: string) {
    const section = await (this.prisma as any).section.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        name: true,
        projectId: true,
        status: true,
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
      },
    });
    return section ?? null;
  }

  async transitionSection(request: SectionWorkflowTransitionRequest) {
    const legacyStatus = mapSectionWorkflowToLegacyStatus(request.toStatus);
    await this.prisma.$transaction(async (tx) => {
      const section = await (tx as any).section.findUnique({
        where: { id: request.sectionId },
        select: { projectId: true },
      });
      if (!section) {
        throw new NotFoundException('Section not found');
      }
      await (tx as any).section.update({
        where: { id: request.sectionId },
        data: {
          status: legacyStatus,
          workflowStatus: request.toStatus,
        },
      });
      await (tx as any).sectionStatusEvent.create({
        data: {
          sectionId: request.sectionId,
          status: legacyStatus,
          note: encodeWorkflowNote(request.toStatus, request.note),
          signature: request.signature?.trim(),
          actorId: request.actorId,
        },
      });
      if (request.toStatus === SectionWorkflowStatus.CHANGES_REQUESTED) {
        await (tx as any).project.update({
          where: { id: section.projectId },
          data: {
            status: 'CHANGES_REQUESTED',
            workflowStatus: ProjectWorkflowStatus.CHANGES_REQUESTED,
            workflowVersion: { increment: 1 },
          },
        });
        await (tx as any).projectStatusEvent.create({
          data: {
            projectId: section.projectId,
            status: 'CHANGES_REQUESTED',
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

  async listSectionHistory(sectionId: string): Promise<SectionWorkflowHistoryEntry[]> {
    const events = await (this.prisma as any).sectionStatusEvent.findMany({
      where: { sectionId },
      orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, email: true } } },
    });
    return events.map((event: any) => {
      const decoded = decodeWorkflowNote<SectionWorkflowStatus>(
        event.note,
        inferSectionWorkflowFromLegacyStatus(event.status),
      );
      return {
        id: event.id,
        createdAt: event.createdAt,
        actorId: event.actorId,
        actorEmail: event.actor?.email,
        legacyStatus: event.status,
        workflowStatus: decoded.workflowStatus,
        note: decoded.note,
        signature: event.signature,
      };
    });
  }
}
