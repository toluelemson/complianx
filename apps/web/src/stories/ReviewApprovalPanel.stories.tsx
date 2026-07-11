import type { Meta, StoryObj } from '@storybook/react';
import { ReviewApprovalPanel } from '../components/project/ReviewApprovalPanel';
import { StoryProviders } from '../storybook/StoryProviders';
import { sampleTrackableSteps } from '../storybook/mocks';

const meta: Meta<typeof ReviewApprovalPanel> = {
  title: 'Project/ReviewApprovalPanel',
  component: ReviewApprovalPanel,
};

export default meta;

type Story = StoryObj<typeof ReviewApprovalPanel>;

export const ReadyForReview: Story = {
  render: () => (
    <StoryProviders>
      <ReviewApprovalPanel
        trackableSteps={sampleTrackableSteps}
        projectStatusLabel="IN_REVIEW"
        onSendForReview={() => console.log('send for review')}
        onApprove={() => console.log('approve')}
        onRequestChanges={() => console.log('request changes')}
        reviewerId="reviewer-1"
        approverId="reviewer-2"
        onReviewerChange={(value) => console.log('reviewer', value)}
        onApproverChange={(value) => console.log('approver', value)}
        reviewMessage="Looks good overall—please confirm dataset lineage."
        setReviewMessage={() => undefined}
        reviewers={[
          { id: 'reviewer-1', email: 'reviewer@aic.com', role: 'REVIEWER' },
          { id: 'reviewer-2', email: 'approver@aic.com', role: 'ADMIN' },
        ]}
        availableReviewers={[
          { id: 'reviewer-1', email: 'reviewer@aic.com', role: 'REVIEWER' },
          { id: 'reviewer-3', email: 'new.reviewer@aic.com', role: 'REVIEWER' },
        ]}
        canAssignSelf
        userId="storybook-user"
      />
    </StoryProviders>
  ),
};
