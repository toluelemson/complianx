import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PROJECT_WORKFLOW_REPOSITORY,
  ProjectWorkflowRepository,
} from '../infrastructure/project-workflow.repository';
import {
  SECTION_WORKFLOW_REPOSITORY,
  SectionWorkflowRepository,
} from '../infrastructure/section-workflow.repository';
import { WorkflowContextService } from './workflow-context.service';
import { ProjectReadinessService } from './project-readiness.service';

type TenantReadContext = {
  actor: { id: string };
  membership: { companyId: string } | null;
  project: {
    companyId: string | null;
    ownerId: string;
    reviewerId: string | null;
    approverId: string | null;
  };
};

@Injectable()
export class WorkflowQueryService {
  constructor(
    @Inject(PROJECT_WORKFLOW_REPOSITORY)
    private readonly projects: ProjectWorkflowRepository,
    @Inject(SECTION_WORKFLOW_REPOSITORY)
    private readonly sections: SectionWorkflowRepository,
    private readonly context: WorkflowContextService,
    private readonly readiness: ProjectReadinessService,
  ) {}

  async getProjectWorkflow(projectId: string, actorId: string) {
    const context = await this.context.loadProjectContext(projectId, actorId);
    this.assertProjectReadAccess(context);
    const project = await this.projects.getProject(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async getProjectHistory(projectId: string, actorId: string) {
    const context = await this.context.loadProjectContext(projectId, actorId);
    this.assertProjectReadAccess(context);
    return this.projects.listProjectHistory(projectId);
  }

  async getProjectReadiness(projectId: string, actorId: string) {
    const context = await this.context.loadProjectContext(projectId, actorId);
    this.assertProjectReadAccess(context);
    return this.readiness.getApprovalReadiness(context.project);
  }

  async getSectionWorkflow(sectionId: string, actorId: string) {
    const context = await this.context.loadSectionContext(sectionId, actorId);
    this.assertSectionReadAccess(context);
    const section = await this.sections.getSection(sectionId);
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    return section;
  }

  async getSectionHistory(sectionId: string, actorId: string) {
    const context = await this.context.loadSectionContext(sectionId, actorId);
    this.assertSectionReadAccess(context);
    return this.sections.listSectionHistory(sectionId);
  }

  async getAssignedReviews(actorId: string, companyId: string) {
    return this.projects.listAssignedReviews(actorId, companyId);
  }

  async listProjectReviewers(projectId: string, actorId: string) {
    const context = await this.context.loadProjectContext(projectId, actorId);
    this.assertProjectReadAccess(context);
    if (context.project.ownerId !== actorId) {
      throw new ForbiddenException();
    }
    if (!context.project.companyId) {
      throw new NotFoundException('Project company not set');
    }
    return this.projects.listReviewerCandidates(
      context.project.companyId,
      actorId,
    );
  }

  private assertProjectReadAccess(context: TenantReadContext) {
    const assigned =
      context.project.ownerId === context.actor.id ||
      context.project.reviewerId === context.actor.id ||
      context.project.approverId === context.actor.id;
    const member =
      context.project.companyId !== null &&
      context.membership?.companyId === context.project.companyId;
    if (!assigned && !member) {
      throw new NotFoundException('Project not found');
    }
  }

  private assertSectionReadAccess(context: {
    actor: TenantReadContext['actor'];
    membership: TenantReadContext['membership'];
    section: { project: TenantReadContext['project'] };
  }) {
    const projectContext: TenantReadContext = {
      actor: context.actor,
      membership: context.membership,
      project: context.section.project,
    };
    this.assertProjectReadAccess(projectContext);
  }
}
