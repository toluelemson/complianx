import { Injectable } from '@nestjs/common';
import { BlockingCommentChecker } from './blocking-comment-checker';
import { IncompleteAssessmentError } from '../domain/workflow-errors';
import {
  ProjectWorkflowAggregate,
  WorkflowReadinessResult,
} from '../domain/workflow.types';
import { SectionWorkflowStatus } from '../domain/workflow-status';

export function sectionFieldsComplete(
  section: ProjectWorkflowAggregate['sections'][number],
) {
  const requiredBySection: Record<string, string[]> = {
    system_overview: ['purpose', 'intendedUsers', 'deploymentContext'],
    model_info: ['modelType', 'trainingData', 'metrics'],
    data_governance: ['dataSources', 'qualityChecks', 'privacy'],
    risk_assessment: ['risks', 'likelihood', 'impact'],
    human_oversight: ['roles', 'escalations'],
    monitoring: ['monitoringPlan', 'maintenance'],
  };
  const content = section.content;
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return false;
  }
  const values = content as Record<string, unknown>;
  const required = requiredBySection[section.name];
  return (
    (required ?? Object.keys(values)).length > 0 &&
    (required ?? Object.keys(values)).every((key) => {
      const value = values[key];
      return typeof value === 'string'
        ? value.trim().length > 0
        : value !== null && value !== undefined;
    })
  );
}

@Injectable()
export class ProjectReadinessService {
  constructor(private readonly blockingComments: BlockingCommentChecker) {}

  async getSubmissionReadiness(
    project: ProjectWorkflowAggregate,
  ): Promise<WorkflowReadinessResult> {
    const checks = [
      {
        key: 'reviewer_assigned',
        passed: Boolean(project.reviewerId),
        message: project.reviewerId
          ? 'Reviewer is assigned'
          : 'Reviewer must be assigned',
      },
      {
        key: 'required_fields_complete',
        passed:
          project.sections.length > 0 &&
          project.sections.every((section) => sectionFieldsComplete(section)),
        message:
          project.sections.length > 0 &&
          project.sections.every((section) => sectionFieldsComplete(section))
            ? 'All required fields are complete'
            : 'Every required field must be complete before submission',
      },
    ];
    const blocking = await this.blockingComments.checkProject(project.id);
    checks.push(blocking);
    return { ready: checks.every((check) => check.passed), checks };
  }

  async getApprovalReadiness(
    project: ProjectWorkflowAggregate,
  ): Promise<WorkflowReadinessResult> {
    const checks = [
      {
        key: 'approver_assigned',
        passed: Boolean(project.approverId),
        message: project.approverId
          ? 'Approver is assigned'
          : 'Approver must be assigned',
      },
      {
        key: 'required_sections_approved',
        passed:
          project.sections.length > 0 &&
          project.sections.every(
            (section) =>
              section.workflowStatus === SectionWorkflowStatus.APPROVED,
          ),
        message:
          project.sections.length > 0 &&
          project.sections.every(
            (section) =>
              section.workflowStatus === SectionWorkflowStatus.APPROVED,
          )
            ? 'All required sections are approved'
            : project.sections.length === 0
              ? 'At least one required section must exist and be approved before project approval'
              : 'All required sections must be approved before project approval',
      },
    ];
    const blocking = await this.blockingComments.checkProject(project.id);
    checks.push(blocking);
    return { ready: checks.every((check) => check.passed), checks };
  }

  async assertReadyForSubmission(project: ProjectWorkflowAggregate) {
    const readiness = await this.getSubmissionReadiness(project);
    const failing = readiness.checks.find((check) => !check.passed);
    if (failing) {
      throw new IncompleteAssessmentError(failing.message);
    }
  }

  async assertReadyForApproval(project: ProjectWorkflowAggregate) {
    const readiness = await this.getApprovalReadiness(project);
    const failing = readiness.checks.find((check) => !check.passed);
    if (failing) {
      throw new IncompleteAssessmentError(failing.message);
    }
  }
}
