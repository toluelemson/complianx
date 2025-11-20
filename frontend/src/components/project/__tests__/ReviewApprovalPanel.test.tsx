import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { ReviewApprovalPanel } from '../ReviewApprovalPanel';

describe('ReviewApprovalPanel', () => {
  it('renders trackable steps and controls', () => {
    const trackableSteps = [
      { stepId: 'system_overview', title: 'System Overview', missing: 0, status: 'DRAFT' },
    ];
    render(
      <ReviewApprovalPanel
        trackableSteps={trackableSteps}
        projectStatusLabel="DRAFT"
        onSendForReview={() => {}}
        onApprove={() => {}}
        onRequestChanges={() => {}}
        reviewerId={null}
        approverId={null}
        onReviewerChange={() => {}}
        onApproverChange={() => {}}
        reviewMessage=""
        setReviewMessage={() => {}}
        reviewers={[]}
        availableReviewers={[]}
        canAssignSelf={false}
      />,
    );

    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Send for review')).toBeDisabled();
  });
});
