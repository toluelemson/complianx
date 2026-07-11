import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PROJECT_WORKFLOW_REPOSITORY,
  ProjectWorkflowRepository,
} from '../infrastructure/project-workflow.repository';
import {
  SECTION_WORKFLOW_REPOSITORY,
  SectionWorkflowRepository,
} from '../infrastructure/section-workflow.repository';
import {
  ProjectWorkflowPermissionContext,
  SectionWorkflowPermissionContext,
} from '../domain/workflow.types';

@Injectable()
export class WorkflowContextService {
  constructor(
    @Inject(PROJECT_WORKFLOW_REPOSITORY)
    private readonly projects: ProjectWorkflowRepository,
    @Inject(SECTION_WORKFLOW_REPOSITORY)
    private readonly sections: SectionWorkflowRepository,
  ) {}

  async loadProjectContext(
    projectId: string,
    actorId: string,
  ): Promise<ProjectWorkflowPermissionContext> {
    const [actor, project] = await Promise.all([
      this.projects.findActor(actorId),
      this.projects.getProject(projectId),
    ]);
    if (!actor) {
      throw new NotFoundException('User not found');
    }
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    const membership = project.companyId
      ? await this.projects.findMembership(actorId, project.companyId)
      : null;
    return { actor, membership, project };
  }

  async loadSectionContext(
    sectionId: string,
    actorId: string,
  ): Promise<SectionWorkflowPermissionContext> {
    const [actor, section] = await Promise.all([
      this.sections.findActor(actorId),
      this.sections.getSection(sectionId),
    ]);
    if (!actor) {
      throw new NotFoundException('User not found');
    }
    if (!section) {
      throw new NotFoundException('Section not found');
    }
    const membership = section.project.companyId
      ? await this.sections.findMembership(actorId, section.project.companyId)
      : null;
    return { actor, membership, section };
  }
}
