import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../components/Button';

const meta: Meta<typeof Button> = {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'radio', options: ['primary', 'secondary', 'ghost'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Primary action',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Secondary action',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Ghost link',
    variant: 'ghost',
  },
};
