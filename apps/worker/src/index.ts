import { client } from '@aikirun/client';
import { inMemoryTimerPriorityQueue } from '@aikirun/memory';
import { database, server } from '@aikirun/server';
import { worker } from '@aikirun/worker';
import { serve } from 'srvx';
import {
  reportGenerationV1,
  type ReportGenerationInput,
} from './report-generation.workflow.js';

const databaseUrl = required('AIKI_DATABASE_URL');
const serviceToken = required('AIKI_SERVICE_TOKEN');
const port = integer('AIKI_PORT', 9850);
const host = process.env.AIKI_HOST?.trim() || '0.0.0.0';
const aikiServer = server({
  db: database({ provider: 'pg', url: databaseUrl }),
  timerPriorityQueue: inMemoryTimerPriorityQueue(),
});
const runtimeHandle = aikiServer.runtime.start();
const aikiClient = client({ handler: aikiServer.handler });
const workerHandle = worker({ workflows: [reportGenerationV1] }).start(
  aikiClient,
);

serve({
  hostname: host,
  port,
  fetch: async (request) => {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/health') {
      return Response.json({ status: 'ok' });
    }
    if (
      request.method === 'POST' &&
      url.pathname === '/jobs/report-generation'
    ) {
      if (request.headers.get('authorization') !== `Bearer ${serviceToken}`) {
        return new Response('Unauthorized', { status: 401 });
      }
      const input = (await request.json()) as ReportGenerationInput;
      if (!input.projectId || !input.userId || !input.operationId) {
        return new Response('Invalid report-generation request', {
          status: 400,
        });
      }
      const handle = await reportGenerationV1
        .with('reference.id', input.operationId)
        .start(aikiClient, input);
      return new Response(
        JSON.stringify({
          runId: handle.run.id,
          operationId: input.operationId,
        }),
        { status: 202, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('Not found', { status: 404 });
  },
});

async function shutdown() {
  await workerHandle.stop();
  await runtimeHandle.stop();
  process.exit(0);
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

function required(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function integer(key: string, fallback: number) {
  const value = Number(process.env[key] ?? fallback);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${key} must be a port number`);
  }
  return value;
}
