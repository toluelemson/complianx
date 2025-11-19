import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from '../components/Chip';

const meta: Meta<typeof Chip> = {
  title: 'Design System/Chip',
  component: Chip,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Chip>;

export const Variants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <Chip label="Ready" tone="default" />
      <Chip label="Approved" tone="success" />
      <Chip label="Attention" tone="warning" />
      <Chip label="Reject" tone="alert" />
    </div>
  ),
};
