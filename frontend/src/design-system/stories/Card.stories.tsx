import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

const meta: Meta<typeof Card> = {
  title: 'Design System/Card',
  component: Card,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Card>;

export const Standard: Story = {
  args: {
    title: 'Compliance snapshot',
    subtitle: 'Track key updates in a glance',
    footer: <Button variant="ghost">View all</Button>,
    children: (
      <p style={{ margin: 0, color: '#475569' }}>
        Each section accepts evidence uploads, review approvals, and trust
        comments so teams stay aligned.
      </p>
    ),
  },
};
