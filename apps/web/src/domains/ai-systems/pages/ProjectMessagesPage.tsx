import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import type {
  ProjectDetail,
  SectionWithMeta,
} from '@complianx/contracts/ai-systems';
import {
  addSectionComment,
  getProject,
  getProjectSections,
  setCommentResolution,
} from '../api';

export default function ProjectMessagesPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { token, initializing, activeCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const projectQuery = useQuery<ProjectDetail>({
    queryKey: ['project', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProject(projectId),
  });
  const sectionsQuery = useQuery<SectionWithMeta[]>({
    queryKey: ['sections', projectId, activeCompanyId],
    enabled: Boolean(token && projectId && activeCompanyId),
    queryFn: () => getProjectSections(projectId),
  });
  const messages = (sectionsQuery.data ?? []).flatMap((section) =>
    (section.comments ?? []).map((comment) => ({
      ...comment,
      sectionName: section.name,
      sectionId: section.id,
    })),
  );
  const selectedSection =
    sectionsQuery.data?.find((section) => section.id === selectedSectionId) ??
    sectionsQuery.data?.[0];
  const openMessages = messages.filter((message) => !message.resolvedAt);
  const resolvedMessages = messages.filter((message) => message.resolvedAt);
  const commentMutation = useMutation({
    mutationFn: () => {
      const section = selectedSection;
      if (!section)
        throw new Error('Create a project section before posting a message');
      return addSectionComment(projectId, {
        sectionId: section.id,
        body: body.trim(),
      });
    },
    onSuccess: () => {
      setBody('');
      void queryClient.invalidateQueries({ queryKey: ['sections', projectId] });
      toast.success('Message posted');
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Unable to post message',
      ),
  });
  const resolutionMutation = useMutation({
    mutationFn: (input: {
      sectionId: string;
      commentId: string;
      resolved: boolean;
    }) =>
      setCommentResolution(
        projectId,
        input.sectionId,
        input.commentId,
        input.resolved,
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['sections', projectId] }),
  });
  if (!initializing && !token) return <Navigate to="/login" replace />;
  return (
    <AppShell title="Project messages" projectId={projectId}>
      <div className="hz-console-content space-y-6">
        <div>
          <Link
            to={`/projects/${projectId}/overview`}
            className="text-sm text-slate-500 hover:text-sky-600"
          >
            ← Project overview
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Messages
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Questions, decisions, and review notes for{' '}
            {projectQuery.data?.name ?? 'this project'}.
          </p>
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (body.trim()) commentMutation.mutate();
          }}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          {!sectionsQuery.data?.length ? (
            <p
              role="status"
              className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              Save a documentation section before starting a discussion.{' '}
              <Link
                to={`/projects/${projectId}/compliance-workspace`}
                className="font-semibold underline"
              >
                Open the workspace
              </Link>
              .
            </p>
          ) : null}
          <textarea
            aria-label="Message"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            placeholder="Ask a question or leave a note…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          {selectedSection ? (
            <details className="mt-3 text-sm text-slate-600">
              <summary className="cursor-pointer">
                Posting to {selectedSection.name.replaceAll('_', ' ')}
              </summary>
              <label className="mt-2 block max-w-lg">
                <span className="sr-only">Discussion area</span>
                <select
                  value={selectedSection.id}
                  onChange={(event) => setSelectedSectionId(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {(sectionsQuery.data ?? []).map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </details>
          ) : null}
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={
                !body.trim() ||
                commentMutation.isPending ||
                !sectionsQuery.data?.length
              }
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {commentMutation.isPending ? 'Posting…' : 'Post message'}
            </button>
          </div>
        </form>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Conversation</h2>
          <div className="mt-4 space-y-3">
            {openMessages.map((message) => (
              <article
                key={message.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex justify-between gap-3">
                  <p className="text-slate-700">{message.body}</p>
                  <button
                    type="button"
                    onClick={() =>
                      resolutionMutation.mutate({
                        sectionId: message.sectionId,
                        commentId: message.id,
                        resolved: !message.resolvedAt,
                      })
                    }
                    className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Resolve
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  {message.author?.email ?? 'Unknown'} · {message.sectionName} ·{' '}
                  {new Date(message.createdAt).toLocaleString()}
                </p>
              </article>
            ))}
            {resolvedMessages.length ? (
              <details className="rounded-xl border border-slate-200 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-600">
                  Show {resolvedMessages.length} resolved message
                  {resolvedMessages.length === 1 ? '' : 's'}
                </summary>
                <div className="mt-3 space-y-3">
                  {resolvedMessages.map((message) => (
                    <article
                      key={message.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4"
                    >
                      <div className="flex justify-between gap-3">
                        <p className="text-slate-500 line-through">
                          {message.body}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            resolutionMutation.mutate({
                              sectionId: message.sectionId,
                              commentId: message.id,
                              resolved: false,
                            })
                          }
                          className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-900"
                        >
                          Reopen
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        {message.author?.email ?? 'Unknown'} ·{' '}
                        {message.sectionName} ·{' '}
                        {new Date(message.createdAt).toLocaleString()}
                      </p>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}
            {!messages.length ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No messages yet.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
