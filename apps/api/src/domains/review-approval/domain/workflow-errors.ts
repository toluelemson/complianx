import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

export class InvalidWorkflowTransitionError extends BadRequestException {
  constructor(fromStatus: string, toStatus: string) {
    super(`Invalid workflow transition from ${fromStatus} to ${toStatus}`);
  }
}

export class UnauthorizedWorkflowActionError extends ForbiddenException {
  constructor(action: string) {
    super(`Not allowed to perform workflow action: ${action}`);
  }
}

export class ReviewerNotAssignedError extends BadRequestException {
  constructor() {
    super('Reviewer must be assigned before this workflow action');
  }
}

export class ApproverNotAssignedError extends BadRequestException {
  constructor() {
    super('Approver must be assigned before this workflow action');
  }
}

export class IncompleteAssessmentError extends BadRequestException {
  constructor(message = 'Assessment is not ready for this workflow action') {
    super(message);
  }
}

export class BlockingCommentsOpenError extends BadRequestException {
  constructor(message = 'Blocking comments must be resolved first') {
    super(message);
  }
}

export class MissingEvidenceError extends BadRequestException {
  constructor(message = 'Required evidence is missing') {
    super(message);
  }
}

export class WorkflowVersionConflictError extends ConflictException {
  constructor() {
    super('Workflow version conflict');
  }
}
