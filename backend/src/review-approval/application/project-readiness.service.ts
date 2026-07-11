import { Injectable } from '@nestjs/common';
import { BlockingCommentChecker } from './blocking-comment-checker';
import {
  IncompleteAssessmentError,
  MissingEvidenceError,
} from '../domain/workflow-errors';
import {
  ProjectWorkflowAggregate,
  WorkflowReadinessResult,
} from '../domain/workflow.types';
import { SectionWorkflowStatus } from '../domain/workflow-status';

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
        key: 'required_sections_complete',
        passed:
          project.sections.length > 0 &&
          project.sections.every((section) =>
            [
              SectionWorkflowStatus.COMPLETE,
              SectionWorkflowStatus.IN_REVIEW,
              SectionWorkflowStatus.APPROVED,
            ].includes(section.workflowStatus),
          ),
        message:
          project.sections.length > 0 &&
          project.sections.every((section) =>
            [
              SectionWorkflowStatus.COMPLETE,
              SectionWorkflowStatus.IN_REVIEW,
              SectionWorkflowStatus.APPROVED,
            ].includes(section.workflowStatus),
          )
            ? 'All required sections are complete'
            : 'Every section must be complete before submission',
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
            (section) => section.workflowStatus === SectionWorkflowStatus.APPROVED,
          ),
        message:
          project.sections.length > 0 &&
          project.sections.every(
            (section) => section.workflowStatus === SectionWorkflowStatus.APPROVED,
          )
            ? 'All required sections are approved'
            : 'All required sections must be approved',
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
    if (failing?.key === 'required_sections_approved') {
      throw new MissingEvidenceError(failing.message);
    }
    if (failing) {
      throw new IncompleteAssessmentError(failing.message);
    }
  }
}
