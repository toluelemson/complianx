import { Injectable } from '@nestjs/common';
import { WorkflowReadinessCheck } from '../domain/workflow.types';

@Injectable()
export class BlockingCommentChecker {
  async checkProject(_projectId: string): Promise<WorkflowReadinessCheck> {
    return {
      key: 'blocking_comments_resolved',
      passed: true,
      message:
        'Blocking comment metadata is not modeled yet; legacy comments do not block approval in this adapter.',
    };
  }
}
