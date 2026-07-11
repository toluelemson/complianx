import type { Meta, StoryObj } from '@storybook/react';
import { Typography } from '../components/Typography';

const meta: Meta<typeof Typography> = {
  title: 'Design System/Typography',
  component: Typography,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'radio', options: ['h1', 'h2', 'body', 'label'] },
  },
};

export default meta;

type Story = StoryObj<typeof Typography>;

export const Headings: Story = {
  args: {
    children: 'Interheading hierarchy',
    variant: 'h1',
  },
};

export const Body: Story = {
  args: {
    children: 'Body copy keeps the story consistent with our palette and spacing.',
    variant: 'body',
  },
};

export const Label: Story = {
  args: {
    children: 'Label text',
    variant: 'label',
  },
};
