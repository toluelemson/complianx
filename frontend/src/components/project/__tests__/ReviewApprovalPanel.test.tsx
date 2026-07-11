import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { ReviewApprovalPanel } from '../ReviewApprovalPanel';

describe('ReviewApprovalPanel', () => {
  const baseProps = {
    trackableSteps: [
      { stepId: 'system_overview', title: 'System Overview', missing: 0, status: 'DRAFT' },
    ],
    onSendForReview: () => {},
    onApprove: () => {},
    onRequestChanges: () => {},
    reviewerId: null,
    approverId: null,
    onReviewerChange: () => {},
    onApproverChange: () => {},
    reviewMessage: '',
    setReviewMessage: () => {},
    reviewers: [],
    availableReviewers: [],
    canAssignSelf: false,
  };

  it('renders trackable steps and controls', () => {
    render(
      <ReviewApprovalPanel
        {...baseProps}
        projectStatusLabel="DRAFT"
      />,
    );

    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Send for review')).toBeDisabled();
  });

  it('renders start review action for ready workflow state', () => {
    render(
      <ReviewApprovalPanel
        {...baseProps}
        projectStatusLabel="READY_FOR_REVIEW"
        reviewerId="reviewer-1"
        sendForReviewLabel="Start review"
      />,
    );

    expect(screen.getByRole('button', { name: 'Start review' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Approve project' })).toBeDisabled();
  });

  it('renders resubmit action for changes requested state', () => {
    render(
      <ReviewApprovalPanel
        {...baseProps}
        projectStatusLabel="CHANGES_REQUESTED"
        reviewerId="reviewer-1"
        sendForReviewLabel="Resubmit project"
        canSendForReview
        sendForReviewDisabled={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Resubmit project' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeDisabled();
  });
});
