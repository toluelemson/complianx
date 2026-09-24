import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { ReviewApprovalPanel } from './ReviewApprovalPanel';

describe('ReviewApprovalPanel', () => {
  const baseProps = {
    trackableSteps: [
      {
        stepId: 'system_overview',
        title: 'System Overview',
        missing: 0,
        status: 'DRAFT',
      },
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
    render(<ReviewApprovalPanel {...baseProps} projectStatusLabel="DRAFT" />);

    expect(screen.getByText('System Overview')).toBeInTheDocument();
    expect(screen.getByText('Send for review')).toBeDisabled();
    expect(
      screen.getByText('Add approver or review note (optional)'),
    ).toBeInTheDocument();
    expect(screen.getByText('Before you ask for review')).toBeInTheDocument();
    expect(
      screen.getByText(/Assign a reviewer in the owner panel/),
    ).toBeInTheDocument();
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
    expect(
      screen.queryByRole('button', { name: 'Approve project' }),
    ).not.toBeInTheDocument();
  });

  it('explains when the assigned reviewer must start the review', () => {
    render(
      <ReviewApprovalPanel
        {...baseProps}
        projectStatusLabel="READY_FOR_REVIEW"
        reviewerId="reviewer-1"
        canStartReview={false}
        sendForReviewDisabled
      />,
    );

    expect(
      screen.getByText('The assigned reviewer needs to sign in and start this review.'),
    ).toBeInTheDocument();
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

    expect(
      screen.getByRole('button', { name: 'Resubmit project' }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: 'Request changes' }),
    ).not.toBeInTheDocument();
  });

  it('shows a decision step instead of a stale review blocker during review', () => {
    render(
      <ReviewApprovalPanel
        {...baseProps}
        projectStatusLabel="IN_REVIEW"
        reviewerId="reviewer-1"
        canApprove
        canRequestChanges
        trackableSteps={[
          {
            stepId: 'system_overview',
            title: 'System Overview',
            missing: 0,
            status: 'APPROVED',
          },
        ]}
      />,
    );

    expect(screen.queryByText('Before you ask for review')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'All sections are approved. Record the final project decision.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve project' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Request changes' })).toBeEnabled();
    screen.getAllByRole('combobox').forEach((field) =>
      expect(field).toBeDisabled(),
    );
  });

  it('blocks final approval until every section is approved', () => {
    render(
      <ReviewApprovalPanel
        {...baseProps}
        projectStatusLabel="IN_REVIEW"
        reviewerId="reviewer-1"
        canApprove
        canRequestChanges
      />,
    );

    expect(
      screen.getByText('0/1 sections approved. Approve the remaining 1 before approving the project.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve project' })).toBeDisabled();
    expect(screen.getByText('Needs approval')).toBeInTheDocument();
  });
});
