import type { Meta, StoryObj } from '@storybook/react';
import { AppShell } from '../components/AppShell';
import { StoryProviders } from '../storybook/StoryProviders';
import api from '../api/client';

const meta: Meta<typeof AppShell> = {
  title: 'Layout/AppShell',
  component: AppShell,
};

export default meta;

type Story = StoryObj<typeof AppShell>;

const mockNotifications = [
  {
    id: 'n1',
    title: 'Reviewer assigned',
    body: 'Alex will review your project this week.',
    createdAt: new Date().toISOString(),
    readAt: null,
  },
  {
    id: 'n2',
    title: 'Document ready',
    body: 'The latest EU AI Act technical file is ready to download.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    readAt: null,
  },
];

function setupApiMocks() {
  api.get = async (url: string) => {
    if (url === '/notifications/count') {
      return { data: { count: mockNotifications.filter((n) => !n.readAt).length } };
    }
    if (url.startsWith('/notifications?')) {
      return { data: mockNotifications };
    }
    return { data: {} };
  };
  api.post = async (url: string) => {
    if (url.endsWith('/read-all')) {
      mockNotifications.forEach((n) => (n.readAt = new Date().toISOString()));
      return { data: { ok: true } };
    }
    if (url.includes('/read')) {
      const id = url.split('/')[2];
      const notification = mockNotifications.find((n) => n.id === id);
      if (notification) {
        notification.readAt = new Date().toISOString();
      }
      return { data: { ok: true } };
    }
    return { data: { ok: true } };
  };
}

export const DefaultShell: Story = {
  args: {
    title: 'Storybook Project',
    children: (
      <div className="space-y-4">
        <p className="text-slate-600">
          This shell mirrors the application layout with notification dropdowns, billing entry
          points, and workspace links.
        </p>
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          Place page content here.
        </div>
      </div>
    ),
  },
  render: (args) => {
    setupApiMocks();
    return (
      <StoryProviders>
        <AppShell {...args} />
      </StoryProviders>
    );
  },
};
