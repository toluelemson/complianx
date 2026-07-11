import { Inject, Injectable, NotFoundException } from '@nestjs/common';
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
    await this.context.loadProjectContext(projectId, actorId);
    const project = await this.projects.getProject(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async getProjectHistory(projectId: string, actorId: string) {
    await this.context.loadProjectContext(projectId, actorId);
    return this.projects.listProjectHistory(projectId);
  }

  async getProjectReadiness(projectId: string, actorId: string) {
    const context = await this.context.loadProjectContext(projectId, actorId);
    return this.readiness.getApprovalReadiness(context.project);
  }

  async getSectionWorkflow(sectionId: string, actorId: string) {
    await this.context.loadSectionContext(sectionId, actorId);
    const section = await this.sections.getSection(sectionId);
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    return section;
  }

  async getSectionHistory(sectionId: string, actorId: string) {
    await this.context.loadSectionContext(sectionId, actorId);
    return this.sections.listSectionHistory(sectionId);
  }

  async getAssignedReviews(actorId: string, companyId: string) {
    return this.projects.listAssignedReviews(actorId, companyId);
  }
}
