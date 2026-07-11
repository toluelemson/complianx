import api from '../api/client';
import {
  notificationFeed,
  sampleMetrics,
  sampleProject,
  sampleSections,
} from './mocks';

let mocksApplied = false;

export function setupApiMocks() {
  if (mocksApplied) {
    return;
  }
  mocksApplied = true;

  const originalGet = api.get.bind(api);
  const originalPost = api.post.bind(api);

  api.get = (async (url: string, config?: any) => {
    if (url === '/notifications/count') {
      const unread = notificationFeed.filter((item) => !item.readAt).length;
      return { data: { count: unread } } as any;
    }

    if (url.startsWith('/notifications')) {
      return { data: notificationFeed };
    }

    if (url.startsWith('/projects/') && url.endsWith('/metrics')) {
      return { data: sampleMetrics };
    }

    if (url.startsWith('/projects/') && url.endsWith('/sections')) {
      return { data: Array.from(sampleSections.values()) };
    }

    if (url.startsWith('/projects/')) {
      return { data: sampleProject };
    }

    return (await originalGet(url, config)) as any;
  }) as typeof api.get;

  api.post = (async (url: string, data?: any, config?: any) => {
    if (url.endsWith('/read-all')) {
      notificationFeed.forEach((item) => {
        item.readAt = new Date().toISOString() as any;
      });
      return { data: { ok: true } } as any;
    }

    if (url.includes('/notifications/') && url.endsWith('/read')) {
      const parts = url.split('/');
      const id = parts[2];
      const notification = notificationFeed.find((item) => item.id === id);
      if (notification) {
        notification.readAt = new Date().toISOString() as any;
      }
      return { data: { ok: true } };
    }

    return (await originalPost(url, data, config)) as any;
  }) as typeof api.post;
}
