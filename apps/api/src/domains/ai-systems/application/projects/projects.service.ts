import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  DocumentItem,
  ProjectDetail,
  ProjectListItem as ProjectListItemContract,
  SectionArtifactItem,
  SectionComment,
  SectionWithMeta,
  StatusEvent,
} from '@complianx/contracts/ai-systems';
import { PrismaService } from '../../../../platform/database/prisma.service';
import type { CreateAiSystemCommand } from './project.commands';
import { Prisma, Project } from '@prisma/client';
import type {
  ProjectAccessOptions,
  ProjectAccessRole,
} from './project-access.types';

const projectDetailInclude = Prisma.validator<Prisma.ProjectInclude>()({
  reviewer: { select: { id: true, email: true, role: true } },
  approver: { select: { id: true, email: true, role: true } },
  sections: {
    include: {
      lastEditor: { select: { id: true, email: true } },
      comments: {
        include: { author: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      statusEvents: {
        include: { actor: { select: { id: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
      artifacts: {
        include: {
          uploadedBy: { select: { id: true, email: true } },
          reviewedBy: { select: { id: true, email: true } },
          previousArtifact: {
            select: {
              id: true,
              version: true,
              checksum: true,
              citationKey: true,
            },
          },
        },
        orderBy: { version: 'desc' },
      },
    },
  },
  documents: true,
  statusEvents: {
    include: { actor: { select: { id: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  },
  owner: { select: { id: true, email: true } },
});

const projectListInclude = Prisma.validator<Prisma.ProjectInclude>()({
  sections: {
    select: { id: true, name: true, updatedAt: true },
  },
  documents: {
    select: { id: true, type: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  },
});

const projectCloneInclude = Prisma.validator<Prisma.ProjectInclude>()({
  sections: true,
});

type ProjectListItem = Prisma.ProjectGetPayload<{
  include: typeof projectListInclude;
}>;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function asRecord(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function mapSectionComment(comment: {
  id: string;
  body: string;
  createdAt: Date;
  author?: { id: string; email: string } | null;
}): SectionComment {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    author: comment.author ?? undefined,
  };
}

function mapStatusEvent(event: {
  id: string;
  status: string;
  note?: string | null;
  signature?: string | null;
  createdAt: Date;
  actor?: { id: string; email: string } | null;
}): StatusEvent {
  return {
    id: event.id,
    status: event.status as StatusEvent['status'],
    note: event.note ?? undefined,
    signature: event.signature ?? undefined,
    createdAt: event.createdAt.toISOString(),
    actor: event.actor ?? undefined,
  };
}

function mapArtifact(artifact: {
  id: string;
  originalName: string;
  description?: string | null;
  createdAt: Date;
  size: number;
  mimeType: string;
  version: number;
  checksum: string;
  citationKey: string;
  status: string;
  reviewComment?: string | null;
  reviewedAt?: Date | null;
  uploadedBy?: { id: string; email: string } | null;
  reviewedBy?: { id: string; email: string } | null;
  previousArtifact?: {
    id: string;
    version: number;
    checksum: string;
    citationKey: string;
  } | null;
}): SectionArtifactItem {
  return {
    id: artifact.id,
    originalName: artifact.originalName,
    description: artifact.description ?? undefined,
    createdAt: artifact.createdAt.toISOString(),
    size: artifact.size,
    mimeType: artifact.mimeType,
    version: artifact.version,
    checksum: artifact.checksum,
    citationKey: artifact.citationKey,
    status: artifact.status as SectionArtifactItem['status'],
    reviewComment: artifact.reviewComment ?? undefined,
    reviewedAt: toIso(artifact.reviewedAt),
    uploadedBy: artifact.uploadedBy ?? undefined,
    reviewedBy: artifact.reviewedBy ?? undefined,
    previousArtifact: artifact.previousArtifact ?? undefined,
  };
}

function mapSection(section: {
  id: string;
  name: string;
  content: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  workflowStatus: string;
  lastEditor?: { id: string; email: string } | null;
  comments?: Array<{
    id: string;
    body: string;
    createdAt: Date;
    author?: { id: string; email: string } | null;
  }>;
  statusEvents?: Array<{
    id: string;
    status: string;
    note?: string | null;
    signature?: string | null;
    createdAt: Date;
    actor?: { id: string; email: string } | null;
  }>;
  artifacts?: Array<Parameters<typeof mapArtifact>[0]>;
}): SectionWithMeta {
  return {
    id: section.id,
    name: section.name,
    content: asRecord(section.content),
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString(),
    workflowStatus: section.workflowStatus as SectionWithMeta['workflowStatus'],
    lastEditor: section.lastEditor ?? undefined,
    comments: (section.comments ?? []).map(mapSectionComment),
    statusEvents: section.statusEvents?.map(mapStatusEvent),
    artifacts: section.artifacts?.map(mapArtifact),
  };
}

function mapDocument(document: {
  id: string;
  type: string;
  url: string;
  createdAt: Date;
}): DocumentItem {
  return {
    id: document.id,
    type: document.type,
    url: document.url,
    createdAt: document.createdAt.toISOString(),
  };
}

function mapProjectDetail(
  project: {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    companyId: string | null;
    workflowStatus: string;
    industry: string | null;
    riskLevel: string | null;
    reviewerId: string | null;
    approverId: string | null;
    workflowVersion: number;
    owner?: { id: string; email: string } | null;
    reviewer?: { id: string; email: string; role: string } | null;
    approver?: { id: string; email: string; role: string } | null;
    sections?: Array<Parameters<typeof mapSection>[0]>;
    documents?: Array<{ id: string; type: string; url: string; createdAt: Date }>;
    statusEvents?: Array<Parameters<typeof mapStatusEvent>[0]>;
  },
  viewerRole?: ProjectDetail['viewerRole'],
): ProjectDetail {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    companyId: project.companyId,
    workflowStatus: project.workflowStatus as ProjectDetail['workflowStatus'],
    industry: project.industry,
    riskLevel: project.riskLevel,
    reviewerId: project.reviewerId,
    approverId: project.approverId,
    workflowVersion: project.workflowVersion,
    owner: project.owner ?? undefined,
    reviewer: project.reviewer ?? undefined,
    approver: project.approver ?? undefined,
    sections: project.sections?.map(mapSection),
    documents: project.documents?.map(mapDocument),
    statusEvents: project.statusEvents?.map(mapStatusEvent),
    viewerRole,
  };
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveAccess(
    projectId: string,
    userId: string,
    companyId?: string,
    opts?: ProjectAccessOptions,
  ): Promise<{
    project: Project;
    accessRole: ProjectAccessRole;
    membershipRole?: string | null;
  }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (companyId && project.companyId && project.companyId !== companyId) {
      throw new ForbiddenException('Project belongs to a different workspace');
    }
    const membership = project.companyId
      ? await this.prisma.userCompany.findUnique({
          where: { userId_companyId: { userId, companyId: project.companyId } },
        })
      : null;
    const accessRole =
      project.ownerId === userId
        ? 'OWNER'
        : project.reviewerId === userId
          ? 'REVIEWER'
          : project.approverId === userId
            ? 'APPROVER'
            : null;
    const allowOwner = opts?.allowOwner ?? true;
    const allowReviewer = opts?.allowReviewer ?? false;
    const allowApprover = opts?.allowApprover ?? false;
    const allowCompanyMember = opts?.allowCompanyMember ?? false;

    if (accessRole === 'OWNER' && allowOwner) {
      if (project.companyId && !membership && companyId) {
        throw new ForbiddenException('Not a member of the workspace');
      }
      return { project, accessRole, membershipRole: membership?.role ?? null };
    }
    if (!membership || (companyId && membership.companyId !== companyId)) {
      throw new ForbiddenException('Not a member of the workspace');
    }
    if (allowCompanyMember) {
      return {
        project,
        accessRole: accessRole ?? 'MEMBER',
        membershipRole: membership.role,
      };
    }
    if (accessRole === 'REVIEWER' && allowReviewer) {
      return { project, accessRole, membershipRole: membership.role };
    }
    if (accessRole === 'APPROVER' && allowApprover) {
      return { project, accessRole, membershipRole: membership.role };
    }
    throw new ForbiddenException();
  }

  async listForUser(
    userId: string,
    companyId: string,
  ): Promise<ProjectListItemContract[]> {
    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this workspace');
    }
    const projects = await this.prisma.project.findMany({
      where: {
        companyId,
      },
      orderBy: { createdAt: 'desc' },
      include: projectListInclude,
    });
    return projects.map((project: ProjectListItem) => ({
      id: project.id,
      name: project.name,
      industry: project.industry,
      riskLevel: project.riskLevel,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      workflowStatus: project.workflowStatus,
      viewerRole:
        project.ownerId === userId
          ? 'OWNER'
          : project.reviewerId === userId
            ? 'REVIEWER'
            : project.approverId === userId
              ? 'APPROVER'
              : 'MEMBER',
      sections: project.sections.map((section) => ({
        id: section.id,
        name: section.name,
        updatedAt: section.updatedAt.toISOString(),
      })),
      documents: project.documents.map((document) => ({
        id: document.id,
        type: document.type,
        createdAt: document.createdAt.toISOString(),
      })),
    }));
  }

  createForUser(
    userId: string,
    companyId: string,
    dto: CreateAiSystemCommand,
  ): Promise<ProjectDetail> {
    return this.prisma.project
      .create({
      data: {
        ...dto,
        ownerId: userId,
        companyId,
      },
      })
      .then((project) => mapProjectDetail(project));
  }

  async getOwnedProject(
    projectId: string,
    userId: string,
    companyId?: string,
  ): Promise<ProjectDetail> {
    await this.resolveAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: false,
      allowApprover: false,
    });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: projectDetailInclude,
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return mapProjectDetail(project, 'OWNER');
  }

  async getProjectForUser(
    projectId: string,
    userId: string,
    companyId?: string,
  ): Promise<ProjectDetail> {
    const access = await this.resolveAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: true,
      allowApprover: true,
      allowCompanyMember: true,
    });
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: projectDetailInclude,
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return mapProjectDetail(project, access.accessRole);
  }

  async assertOwnership(
    projectId: string,
    userId: string,
    companyId?: string,
  ): Promise<Project> {
    const { project } = await this.resolveAccess(projectId, userId, companyId, {
      allowOwner: true,
      allowReviewer: false,
      allowApprover: false,
    });
    return project;
  }

  async assertAccess(
    projectId: string,
    userId: string,
    companyId?: string,
    opts?: ProjectAccessOptions,
  ) {
    return this.resolveAccess(projectId, userId, companyId, opts);
  }

  async cloneProject(
    projectId: string,
    userId: string,
    companyId: string,
    name?: string,
  ) {
    const source = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: projectCloneInclude,
    });
    if (!source) {
      throw new NotFoundException('Project not found');
    }
    if (source.ownerId !== userId || source.companyId !== companyId) {
      throw new ForbiddenException();
    }
    const cloneName = name?.trim() || `${source.name} Copy`;
    const newProject = await this.prisma.$transaction(async (tx) => {
      const created = await tx.project.create({
        data: {
          name: cloneName,
          industry: source.industry,
          riskLevel: source.riskLevel,
          ownerId: userId,
          companyId,
        },
      });
      if (source.sections.length) {
        await tx.section.createMany({
          data: source.sections.map((section) => ({
            name: section.name,
            content: section.content as Prisma.InputJsonValue,
            projectId: created.id,
          })),
        });
      }
      return created;
    });
    return this.getOwnedProject(newProject.id, userId);
  }
}
