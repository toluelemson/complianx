import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../api/client';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import {
  STEP_CONFIG,
  TRACKABLE_STEP_COUNT,
  type StepField,
} from '../constants/steps';
import {
  DEFAULT_DOCUMENT_SELECTION,
  DOCUMENT_GENERATION_OPTIONS,
  DOCUMENT_LABELS,
} from '../constants/documents';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import TemplateLibraryModal from '../components/project/TemplateLibraryModal';
import { ReviewApprovalPanel } from '../components/project/ReviewApprovalPanel';
import { WizardSidebar } from '../components/project/WizardSidebar';

type SectionComment = {
  id: string;
  body: string;
  createdAt: string;
  author?: {
    id: string;
    email: string;
  };
};

type ArtifactStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

type SectionArtifactItem = {
  id: string;
  originalName: string;
  description?: string | null;
  createdAt: string;
  size: number;
  mimeType: string;
  version: number;
  checksum: string;
  citationKey: string;
  status: ArtifactStatus;
  reviewComment?: string | null;
  reviewedAt?: string | null;
  uploadedBy?: {
    id: string;
    email: string;
  };
  reviewedBy?: {
    id: string;
    email: string;
  } | null;
  previousArtifact?: {
    id: string;
    version: number;
    checksum: string;
    citationKey: string;
  } | null;
};

export type SectionWithMeta = {
  id: string;
  name: string;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastEditor?: {
    id: string;
    email: string;
  };
  comments: SectionComment[];
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
  statusEvents?: StatusEvent[];
  artifacts?: SectionArtifactItem[];
};

export type DocumentItem = {
  id: string;
  type: string;
  url: string;
  createdAt: string;
};

export type TrackableStepSummary = {
  stepId: string;
  title: string;
  missing: number;
  status: string;
};

function hasFieldValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }
  return true;
}

function formatFileSize(bytes?: number) {
  if (!bytes) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, exponent);
  return `${value.toFixed(value >= 10 || value === 0 ? 0 : 1)} ${
    units[exponent]
  }`;
}

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  if (!projectId) {
    navigate('/dashboard');
    return null;
  }
  const queryClient = useQueryClient();
  const [activeStepId, setActiveStepId] = useState(STEP_CONFIG[0].id);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ id: string; type: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const { token, user } = useAuth();
  const activeStep = useMemo(
    () => STEP_CONFIG.find((step) => step.id === activeStepId)!,
    [activeStepId],
  );
  const isFormStep = activeStep.fields.length > 0;
  const canApprove = user?.role === 'REVIEWER';
  const canReviewEvidence = canApprove;
  const canAssignSelf = user?.role === 'REVIEWER';

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((res) => res.data),
  });

  const sectionsQuery = useQuery<SectionWithMeta[]>({
    queryKey: ['sections', projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/sections`).then((res) => res.data),
  });

  const documentsQuery = useQuery<DocumentItem[]>({
    queryKey: ['documents', projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/documents`).then((res) => res.data),
  });
  const templatesQuery = useQuery({
    queryKey: ['templates', activeStepId],
    enabled: Boolean(isFormStep),
    queryFn: () =>
      api
        .get('/templates', {
          params: { sectionName: activeStepId },
        })
        .then((res) => res.data),
  });

  const remindersQuery = useQuery({
    queryKey: ['reminders', projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/reminders`).then((res) => res.data),
  });
  const reviewersQuery = useQuery({
    queryKey: ['projectReviewers', projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/reviewers`).then((res) => res.data),
    enabled: Boolean(projectId && projectQuery.data?.companyId),
  });
  const availableReviewers = useMemo(
    () => (reviewersQuery.data ?? []).filter((reviewer: any) => reviewer.role === 'REVIEWER'),
    [reviewersQuery.data],
  );

  const { register, handleSubmit, reset, setValue, watch } =
    useForm<Record<string, any>>();
  const [commentBody, setCommentBody] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiFieldSuggestions, setAiFieldSuggestions] = useState<
    Record<string, string>
  >({});
  const [aiFieldHistory, setAiFieldHistory] = useState<
    Record<string, string[]>
  >({});
  const [reminderForm, setReminderForm] = useState({
    message: '',
    dueAt: '',
  });
  const [activeField, setActiveField] = useState<string | null>(null);
  const suggestionFieldRef = useRef<string | null>(null);
  const autosaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const artifactInputRef = useRef<HTMLInputElement | null>(null);
  const formValues = watch();
  const [autosaveStatus, setAutosaveStatus] = useState<
    'idle' | 'saving' | 'saved'
  >('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [autosaveRecovery, setAutosaveRecovery] = useState<{
    content: Record<string, any>;
    updatedAt: string;
  } | null>(null);
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>(
    () => [...DEFAULT_DOCUMENT_SELECTION],
  );
  const [artifactFile, setArtifactFile] = useState<File | null>(null);
  const [artifactDescription, setArtifactDescription] = useState('');
  const [artifactPurpose, setArtifactPurpose] = useState<'GENERIC' | 'DATASET' | 'MODEL'>('GENERIC');
  const [artifactReviewDraft, setArtifactReviewDraft] = useState<
    Record<string, { status: ArtifactStatus; comment: string }>
  >({});
  const [reviewingArtifactId, setReviewingArtifactId] = useState<string | null>(
    null,
  );
  const [reviewExpanded, setReviewExpanded] = useState<Record<string, boolean>>({});
  const [selectedReviewerId, setSelectedReviewerId] = useState<string | null>(
    null,
  );
  const [selectedApproverId, setSelectedApproverId] = useState<string | null>(
    null,
  );
  const [reviewMessage, setReviewMessage] = useState('');
  const [manageModalOpen, setManageModalOpen] = useState(false);
  const [selectedTemplates, setSelectedTemplates] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkAction, setBulkAction] = useState<
    '' | 'share' | 'unshare' | 'delete'
  >('');
  const sectionByName = useMemo(() => {
    const map = new Map<string, any>();
    (sectionsQuery.data ?? []).forEach((section: any) =>
      map.set(section.name, section),
    );
    return map;
  }, [sectionsQuery.data]);

  const currentSection = sectionByName.get(activeStepId);
  useEffect(() => {
    if (availableReviewers.length) {
      setSelectedReviewerId((prev) => prev ?? availableReviewers[0].id);
    }
  }, [availableReviewers]);
  useEffect(() => {
    if (reviewersQuery.data?.length) {
      setSelectedApproverId((prev) => prev ?? reviewersQuery.data[0].id);
    }
  }, [reviewersQuery.data]);

  useEffect(() => {
    if (currentSection && activeStep.fields.length) {
      reset(currentSection.content ?? {});
      setLastSavedAt(currentSection.updatedAt ?? null);
      setAutosaveRecovery(null);
    } else if (activeStep.fields.length) {
      reset({});
      setLastSavedAt(null);
      setAutosaveRecovery(null);
    }
    setCommentBody('');
    setAiFieldSuggestions({});
    setAiSuggestion(null);
    if (artifactInputRef.current) {
      artifactInputRef.current.value = '';
    }
    setArtifactFile(null);
    setArtifactDescription('');
  }, [currentSection, activeStep, reset]);

  useEffect(() => {
    if (!currentSection?.artifacts?.length) {
      setArtifactReviewDraft({});
      return;
    }
    const nextDraft: Record<
      string,
      { status: ArtifactStatus; comment: string }
    > = {};
    currentSection.artifacts.forEach((artifact: SectionArtifactItem) => {
      nextDraft[artifact.id] = {
        status: artifact.status,
        comment: artifact.reviewComment ?? '',
      };
    });
    setArtifactReviewDraft(nextDraft);
  }, [currentSection?.artifacts]);

  const saveMutation = useMutation({
    mutationFn: (payload: { stepId: string; values: Record<string, any> }) =>
      api
        .post(`/projects/${projectId}/sections`, {
          name: payload.stepId,
          content: payload.values,
        })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', projectId] });
      toast.success('Section saved');
      setLastSavedAt(new Date().toISOString());
    },
    onError: () => {
      toast.error('Unable to save section');
    },
  });

  const generateMutation = useMutation({
    mutationFn: (payload: { documentTypes: string[] }) =>
      api
        .post(`/projects/${projectId}/generate`, payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', projectId] });
      toast.success('Compliance documents are being prepared');
    },
    onError: () => {
      toast.error('Failed to trigger document generation');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (payload: {
      templateId: string;
      updates: { name?: string; category?: string; shared?: boolean };
    }) =>
      api
        .patch(`/templates/${payload.templateId}`, payload.updates)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', activeStepId] });
      toast.success('Template updated');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      api.delete(`/templates/${templateId}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', activeStepId] });
      toast.success('Template deleted');
    },
  });

  const bulkTemplateMutation = useMutation({
    mutationFn: (payload: { templateIds: string[]; action: string }) =>
      api.post('/templates/bulk', payload).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', activeStepId] });
      toast.success('Bulk action applied');
      setSelectedTemplates(new Set());
      setBulkAction('');
    },
    onError: () => toast.error('Bulk action failed'),
  });

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const executeBulkAction = () => {
    if (!bulkAction) {
      toast.error('Choose a bulk action');
      return;
    }
    if (!selectedTemplates.size) {
      toast.error('Select at least one template');
      return;
    }
    bulkTemplateMutation.mutate({
      templateIds: Array.from(selectedTemplates),
      action: bulkAction,
    });
  };
  const artifactUploadMutation = useMutation({
    mutationFn: (payload: {
      sectionId: string;
      file: File;
      description?: string;
      purpose?: 'GENERIC' | 'DATASET' | 'MODEL';
    }) => {
      const formData = new FormData();
      formData.append('file', payload.file);
      if (payload.description) {
        formData.append('description', payload.description);
      }
      if (payload.purpose) {
        formData.append('purpose', payload.purpose);
      }
      return api
        .post(
          `/projects/${projectId}/sections/${payload.sectionId}/artifacts`,
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        )
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', projectId] });
      setArtifactFile(null);
      setArtifactDescription('');
      setArtifactPurpose('GENERIC');
      if (artifactInputRef.current) {
        artifactInputRef.current.value = '';
      }
      toast.success('Evidence uploaded');
    },
    onError: () => {
      toast.error('Unable to upload evidence');
    },
  });

  const artifactDeleteMutation = useMutation({
    mutationFn: (artifactId: string) =>
      api.delete(`/artifacts/${artifactId}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', projectId] });
      toast.success('Evidence removed');
    },
    onError: () => {
      toast.error('Unable to remove evidence');
    },
  });

  const artifactReviewMutation = useMutation({
    mutationFn: (payload: {
      artifactId: string;
      status: ArtifactStatus;
      comment?: string;
    }) =>
      api
        .patch(`/artifacts/${payload.artifactId}/review`, {
          status: payload.status,
          comment: payload.comment,
        })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', projectId] });
      toast.success('Evidence review updated');
    },
    onError: () => {
      toast.error('Unable to update review');
    },
    onSettled: () => {
      setReviewingArtifactId(null);
    },
  });

  const toggleDocumentType = (type: string) => {
    setSelectedDocumentTypes((prev) =>
      prev.includes(type)
        ? prev.filter((entry) => entry !== type)
        : (() => {
            const nextSet = new Set([...prev, type]);
            return DOCUMENT_GENERATION_OPTIONS.map(
              (option) => option.type,
            ).filter((optionType) => nextSet.has(optionType));
          })(),
    );
  };

  const resetDocumentSelections = () => {
    setSelectedDocumentTypes([...DEFAULT_DOCUMENT_SELECTION]);
  };

  const handleGenerateClick = () => {
    if (!selectedDocumentTypes.length) {
      toast.error('Select at least one framework before generating');
      return;
    }
    generateMutation.mutate({ documentTypes: selectedDocumentTypes });
  };

  const handleArtifactFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setArtifactFile(file ?? null);
  };

  const clearArtifactSelection = () => {
    setArtifactFile(null);
    if (artifactInputRef.current) {
      artifactInputRef.current.value = '';
    }
  };

  const handleArtifactUpload = () => {
    if (!currentSection) {
      toast.error('Save this section before attaching evidence');
      return;
    }
    if (!artifactFile) {
      toast.error('Select a file to upload');
      return;
    }
    artifactUploadMutation.mutate({
      sectionId: currentSection.id,
      file: artifactFile,
      description: artifactDescription.trim()
        ? artifactDescription.trim()
        : undefined,
      purpose: artifactPurpose,
    });
  };

  const fetchArtifactBlob = async (artifactId: string) => {
    if (!token) {
      throw new Error('Not authenticated');
    }
    const response = await fetch(
      `${api.defaults.baseURL}/artifacts/${artifactId}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return response.blob();
  };

  const handleArtifactDownload = async (artifact: SectionArtifactItem) => {
    try {
      const blob = await fetchArtifactBlob(artifact.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = artifact.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error('Unable to download evidence');
    }
  };

  const handleArtifactDelete = (artifactId: string) => {
    artifactDeleteMutation.mutate(artifactId);
  };

  const handleArtifactReviewStatusChange = (
    artifactId: string,
    status: ArtifactStatus,
  ) => {
    const fallbackComment =
      artifactReviewDraft[artifactId]?.comment ??
      currentSection?.artifacts?.find(
        (artifact: SectionArtifactItem) => artifact.id === artifactId,
      )?.reviewComment ??
      '';
    setArtifactReviewDraft((prev) => ({
      ...prev,
      [artifactId]: {
        status,
        comment: fallbackComment,
      },
    }));
  };

  const handleArtifactReviewCommentChange = (
    artifactId: string,
    comment: string,
  ) => {
    const fallbackStatus =
      artifactReviewDraft[artifactId]?.status ??
      currentSection?.artifacts?.find(
        (artifact: SectionArtifactItem) => artifact.id === artifactId,
      )?.status ??
      'PENDING';
    setArtifactReviewDraft((prev) => ({
      ...prev,
      [artifactId]: {
        status: fallbackStatus,
        comment,
      },
    }));
  };

  const handleArtifactReviewSubmit = (artifactId: string) => {
    const draft = artifactReviewDraft[artifactId];
    if (!draft) {
      return;
    }
    setReviewingArtifactId(artifactId);
    artifactReviewMutation.mutate({
      artifactId,
      status: draft.status,
      comment: draft.comment.trim() ? draft.comment.trim() : undefined,
    });
  };

  const handleCopyToClipboard = async (
    value: string,
    successMessage: string,
  ) => {
    if (!navigator?.clipboard) {
      toast.error('Clipboard unavailable');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successMessage);
    } catch {
      toast.error('Unable to copy value');
    }
  };

  const fetchDocumentBlob = async (docId: string) => {
    if (!token) {
      throw new Error('Not authenticated');
    }
    const response = await fetch(
      `${api.defaults.baseURL}/documents/${docId}/download`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return response.blob();
  };

  const handleDownload = async (docId: string, type: string) => {
    try {
      setDownloadingId(docId);
      const blob = await fetchDocumentBlob(docId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      console.error('Unable to download document', error);
      toast.error('Unable to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreview = async (doc: { id: string; type: string }) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setPreviewDoc(doc);
    setPreviewLoading(true);
    try {
      const blob = await fetchDocumentBlob(doc.id);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Preview error', error);
      toast.error('Unable to load preview');
      setPreviewDoc(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleZipDownload = async () => {
    try {
      const response = await fetch(
        `${api.defaults.baseURL}/projects/${projectId}/documents.zip`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error('zip-failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `project-${projectId}-documents.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('ZIP download started');
    } catch (error) {
      toast.error('Unable to download ZIP');
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewDoc(null);
    setPreviewUrl(null);
    setPreviewLoading(false);
  };

  const commentMutation = useMutation({
    mutationFn: (payload: { sectionId: string; body: string }) =>
      api
        .post(
          `/projects/${projectId}/sections/${payload.sectionId}/comments`,
          { body: payload.body },
        )
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections', projectId] });
      toast.success('Comment added');
      setCommentBody('');
    },
    onError: () => {
      toast.error('Unable to add comment');
    },
  });

  const handleSaveTemplate = () => {
    if (!currentSection) {
      toast.error('Save the section before creating a template');
      return;
    }
    const name =
      typeof window !== 'undefined'
        ? window.prompt('Name this template', `${activeStep.title} template`)
        : null;
    if (!name) {
      return;
    }
    saveTemplateMutation.mutate({
      name,
      content: currentSection.content ?? {},
    });
  };

  const handleApplyTemplate = (template: any) => {
    if (template?.content) {
      reset(template.content);
      toast.success('Template applied');
    }
  };

  const handleApplyFieldSuggestion = (fieldName: string) => {
    const suggestion = aiFieldSuggestions[fieldName];
    if (!suggestion) return;
    setValue(fieldName, suggestion, { shouldDirty: true });
    setAiFieldSuggestions({});
    setAiFieldHistory({});
    toast.success(`Applied suggestion for ${fieldName}`);
  };

  const handleAppendFieldSuggestion = (fieldName: string) => {
    const suggestion = aiFieldSuggestions[fieldName];
    if (!suggestion) return;
    const currentValue = watch(fieldName) ?? '';
    const appended =
      currentValue.trim().length > 0
        ? `${currentValue}\n${suggestion}`
        : suggestion;
    setValue(fieldName, appended, { shouldDirty: true });
    setAiFieldSuggestions({});
    setAiFieldHistory({});
    toast.success(`Appended suggestion for ${fieldName}`);
  };

  const feedbackMutation = useMutation({
    mutationFn: (payload: {
      projectId: string;
      sectionId: string;
      fieldName: string;
      suggestion: string;
      liked: boolean;
    }) => api.post('/suggestions/feedback', payload),
  });

  const suggestionMutation = useMutation({
    mutationFn: (payload: { hint?: string; partialContent?: Record<string, any>; targetField?: string }) =>
      api
        .post(
          `/projects/${projectId}/sections/${activeStepId}/suggest`,
          payload,
        )
        .then((res) => res.data),
    onSuccess: (data) => {
      const fieldTarget = suggestionFieldRef.current;
      suggestionFieldRef.current = null;
      const resolvedText = fieldTarget
        ? data.structuredContent?.[fieldTarget] ?? data.suggestion
        : data.suggestion;
      if (data.structuredContent) {
        setAiFieldSuggestions((prev) => ({
          ...prev,
          ...data.structuredContent,
        }));
      } else if (fieldTarget) {
        setAiFieldSuggestions((prev) => ({
          ...prev,
          [fieldTarget]: resolvedText,
        }));
      }
      if (fieldTarget) {
        setAiFieldHistory((prev) => {
          const next = { ...prev };
          const current = [resolvedText];
          if (prev[fieldTarget]) {
            current.push(...prev[fieldTarget]);
          }
          next[fieldTarget] = current.slice(0, 3);
          return next;
        });
        toast.success(`Suggestion updated for ${fieldTarget}`);
      } else {
        toast.success('Draft suggestion ready');
      }
      setAiSuggestion(resolvedText);
    },
    onError: () => {
      toast.error('Unable to generate suggestion');
      suggestionFieldRef.current = null;
    },
  });

  const autosaveMutation = useMutation({
    mutationFn: (payload: { sectionId: string; content: Record<string, any> }) =>
      api.post('/autosave/sections', payload).then((res) => res.data),
    onMutate: () => setAutosaveStatus('saving'),
    onSuccess: (data) => {
      setAutosaveStatus('saved');
      setLastSavedAt(data.updatedAt ?? new Date().toISOString());
      setTimeout(() => setAutosaveStatus('idle'), 2000);
    },
    onError: () => {
      setAutosaveStatus('idle');
      toast.error('Autosave failed');
    },
  });

  const requestFieldSuggestion = (fieldName?: string) => {
    if (!currentSection) return;
    const targetField = fieldName ?? activeField ?? undefined;
    suggestionFieldRef.current = targetField ?? null;
    const snapshot: Record<string, any> = {
      ...(currentSection.content ?? {}),
      ...(formValues ?? {}),
    };
    suggestionMutation.mutate({
      hint: targetField
        ? `Provide ideas for the field "${targetField}" in the ${activeStep.title} section. Current value: "${snapshot[targetField] ?? ''}"`
        : `Provide ideas for fields: ${activeStep.fields
            .map((field) => field.name)
            .join(', ')}.`,
      partialContent: snapshot,
      targetField,
    });
  };

  const handleApplyHistorySuggestion = (
    fieldName: string,
    suggestionText: string,
  ) => {
    setValue(fieldName, suggestionText, { shouldDirty: true });
    toast.success(`Applied previous suggestion for ${fieldName}`);
  };

  const handleSuggestionFeedback = (
    sectionId: string,
    fieldName: string,
    suggestionText: string,
    liked: boolean,
  ) => {
    feedbackMutation.mutate({
      projectId: projectId!,
      sectionId,
      fieldName,
      suggestion: suggestionText,
      liked,
    });
  };

  const formatSavedLabel = () => {
    if (autosaveStatus === 'saving') {
      return 'Saving...';
    }
    if (lastSavedAt) {
      return `Saved ${new Date(lastSavedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
    return 'No autosave yet';
  };

  useEffect(() => {
    if (!isFormStep || !currentSection) {
      return;
    }
    if (autosaveDebounceRef.current) {
      clearTimeout(autosaveDebounceRef.current);
    }
    autosaveDebounceRef.current = setTimeout(() => {
      autosaveMutation.mutate({
        sectionId: currentSection.id,
        content: formValues,
      });
    }, 1500);
    return () => {
      if (autosaveDebounceRef.current) {
        clearTimeout(autosaveDebounceRef.current);
      }
    };
  }, [formValues, currentSection, isFormStep]);

  useEffect(() => {
    if (!currentSection) {
      return;
    }
    api
      .get(`/autosave/sections/${currentSection.id}`)
      .then((res) => res.data)
      .then((autosave) => {
        if (
          autosave &&
          new Date(autosave.updatedAt).getTime() >
            new Date(currentSection.updatedAt ?? 0).getTime()
        ) {
          setAutosaveRecovery({
            content: autosave.content,
            updatedAt: autosave.updatedAt,
          });
        }
      })
      .catch(() => {});
  }, [currentSection?.id]);

  const saveTemplateMutation = useMutation({
    mutationFn: (payload: { name: string; content: Record<string, any> }) =>
      api
        .post('/templates', {
          name: payload.name,
          sectionName: activeStepId,
          content: payload.content,
        })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', activeStepId] });
      toast.success('Template saved');
    },
    onError: () => {
      toast.error('Unable to save template');
    },
  });

  const createReminderMutation = useMutation({
    mutationFn: (payload: { message: string; dueAt: string }) =>
      api
        .post(`/projects/${projectId}/reminders`, payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', projectId] });
      toast.success('Reminder scheduled');
    },
    onError: () => {
      toast.error('Unable to schedule reminder');
    },
  });

  const updateReminderMutation = useMutation({
    mutationFn: (payload: { id: string; completed: boolean }) =>
      api
        .patch(`/projects/${projectId}/reminders/${payload.id}`, {
          completed: payload.completed,
        })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', projectId] });
    },
  });

  const handleReminderSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!reminderForm.message || !reminderForm.dueAt) {
      toast.error('Provide reminder text and due date');
      return;
    }
    createReminderMutation.mutate(reminderForm, {
      onSuccess: () =>
        setReminderForm({
          message: '',
          dueAt: '',
        }),
    });
  };

  const projectStatusMutation = useMutation({
    mutationFn: (payload: {
      status: StatusEvent['status'];
      note?: string;
      signature?: string;
    }) =>
      api
        .post(`/projects/${projectId}/status`, payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Project status updated');
    },
    onError: () => toast.error('Unable to update project status'),
  });

  const requestReviewMutation = useMutation({
    mutationFn: (payload: {
      reviewerId: string;
      approverId?: string | null;
      message?: string;
    }) =>
      api
        .post(`/projects/${projectId}/request-review`, payload)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Review request sent');
      setReviewMessage('');
    },
    onError: () => toast.error('Unable to send review request'),
  });

  const sendProjectForReview = () => {
    if (!allFieldsComplete) {
      toast.error('Complete every required field before sending for review');
      return;
    }
    if (!selectedReviewerId) {
      toast.error('Select a reviewer for this request');
      return;
    }
    requestReviewMutation.mutate({
      reviewerId: selectedReviewerId,
      approverId: selectedApproverId ?? undefined,
      message: reviewMessage.trim() || undefined,
    });
  };

  const approveProject = () => {
    if (!canApprove) {
      toast.error('Only reviewers can approve');
      return;
    }
    if (projectStatusLabel !== 'IN_REVIEW') {
      toast.error('Project must be in review before approving');
      return;
    }
    const input =
      typeof window !== 'undefined'
        ? window.prompt('Enter signature to approve project')
        : undefined;
    const trimmed = input?.trim();
    if (!trimmed) {
      toast.error('Signature is required for approval');
      return;
    }
    projectStatusMutation.mutate({
      status: 'APPROVED',
      signature: trimmed,
    });
  };

  const requestChanges = () => {
    projectStatusMutation.mutate({ status: 'DRAFT' });
  };

  const completedSteps = new Set(
    sectionsQuery.data?.map((section: any) => section.name) ?? [],
  );
  const trackableStepIds = useMemo(
    () =>
      STEP_CONFIG.filter((step) => step.fields.length > 0).map(
        (step) => step.id,
      ),
    [],
  );
  const completedCount = trackableStepIds.filter((id) =>
    completedSteps.has(id),
  ).length;
  const completionRate = Math.round(
    (completedCount / TRACKABLE_STEP_COUNT) * 100 || 0,
  );
  const pendingSteps = trackableStepIds.filter((id) => !completedSteps.has(id));
  const stepTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    STEP_CONFIG.forEach((step) => map.set(step.id, step.title));
    return map;
  }, []);
  const incompleteFieldsByStep = useMemo(() => {
    const map = new Map<string, StepField[]>();
    STEP_CONFIG.forEach((step) => {
      if (!step.fields.length) {
        return;
      }
      const section = sectionByName.get(step.id);
      const content = section?.content ?? {};
      const missing = step.fields.filter(
        (field) => !hasFieldValue(content[field.name]),
      );
      map.set(step.id, missing);
    });
    return map;
  }, [sectionByName]);
  const trackableStepSummaries = useMemo(
    () =>
      trackableStepIds.map((stepId) => ({
        stepId,
        title: stepTitleMap.get(stepId) ?? stepId,
        missing: incompleteFieldsByStep.get(stepId)?.length ?? 0,
        status: sectionByName.get(stepId)?.status ?? 'DRAFT',
      })),
    [trackableStepIds, stepTitleMap, incompleteFieldsByStep, sectionByName],
  );
  const projectStatusLabel = projectQuery.data?.status ?? 'DRAFT';
  const allFieldsComplete = useMemo(
    () =>
      [...incompleteFieldsByStep.values()].every(
        (fields) => fields.length === 0,
      ),
    [incompleteFieldsByStep],
  );
  const selectionIsDefault = useMemo(() => {
    const selectedSet = new Set(selectedDocumentTypes);
    if (selectedSet.size !== DEFAULT_DOCUMENT_SELECTION.length) {
      return false;
    }
    return DEFAULT_DOCUMENT_SELECTION.every((type) =>
      selectedSet.has(type),
    );
  }, [selectedDocumentTypes]);
  const artifactStatusStyles: Record<ArtifactStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-rose-100 text-rose-800',
  };
  const artifactStatusLabels: Record<ArtifactStatus, string> = {
    PENDING: 'Pending review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };
  const documentsGrouping = useMemo(() => {
    const groups = new Map<string, DocumentItem[]>();
    (documentsQuery.data ?? []).forEach((doc) => {
      const next = groups.get(doc.type) ?? [];
      next.push(doc);
      groups.set(doc.type, next);
    });
    const versions = new Map<string, number>();
    groups.forEach((arr) => {
      arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      arr.forEach((doc, index) => {
        versions.set(doc.id, arr.length - index);
      });
    });
    return { groups, versions };
  }, [documentsQuery.data]);
  const timelineEvents = useMemo(() => {
    const events: {
      id: string;
      label: string;
      timestamp: string;
      meta?: string;
      type: 'section' | 'document';
    }[] = [];
    (sectionsQuery.data ?? []).forEach((section) => {
      events.push({
        id: section.id,
        label: `${stepTitleMap.get(section.name) ?? section.name} updated`,
        timestamp: section.updatedAt,
        meta: section.lastEditor?.email,
        type: 'section',
      });
    });
    (documentsQuery.data ?? []).forEach((doc) => {
      events.push({
        id: doc.id,
        label: `${DOCUMENT_LABELS[doc.type] ?? doc.type} generated`,
        timestamp: doc.createdAt,
        type: 'document',
      });
    });
    return events
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 6);
  }, [sectionsQuery.data, documentsQuery.data, stepTitleMap]);
  const riskSection = sectionByName.get('risk_assessment');
  const riskEntries: Array<any> = Array.isArray(
    riskSection?.content?.entries,
  )
    ? riskSection?.content?.entries
    : Array.isArray(riskSection?.content?.risks)
    ? riskSection?.content?.risks
    : [];
  const riskSummaryText =
    typeof riskSection?.content?.risks === 'string'
      ? riskSection?.content?.risks
      : riskEntries.length
      ? riskEntries[0].description ?? JSON.stringify(riskEntries[0])
      : 'Document key risks to strengthen readiness.';
  const severityLevels = ['Low', 'Medium', 'High'];
  const likelihoodLevels = ['Low', 'Medium', 'High'];
  const riskHeatmap = severityLevels.map((severity) =>
    likelihoodLevels.map((likelihood) => {
      const matches = riskEntries.filter((entry: any) => {
        const entrySeverity =
          (entry.severity || entry.impact || '').toString().toLowerCase();
        const entryLikelihood = (entry.likelihood || '').toString().toLowerCase();
        return (
          entrySeverity.includes(severity.toLowerCase()) &&
          entryLikelihood.includes(likelihood.toLowerCase())
        );
      });
      return {
        severity,
        likelihood,
        items: matches,
      };
    }),
  );
  const latestDoc = useMemo(() => {
    const docs = [...(documentsQuery.data ?? [])];
    docs.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return docs[0];
  }, [documentsQuery.data]);

  const liveStatusText =
    autosaveStatus === 'saving' ? 'Live Syncing' : 'Live Editing';
  const liveStatusDotClass =
    autosaveStatus === 'saving'
      ? 'bg-emerald-500 animate-pulse'
      : 'bg-emerald-400';
  const liveStatusTimestamp = lastSavedAt
    ? `Last save ${new Date(lastSavedAt).toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      })}`
    : 'Not saved yet';

  return (
    <AppShell title={projectQuery.data?.name ?? 'Project'}>
      <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">Project health</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
              <span className={`h-2.5 w-2.5 rounded-full ${liveStatusDotClass}`} />
              {liveStatusText}
            </span>
            <span className="text-[11px] text-slate-400">{liveStatusTimestamp}</span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Readiness</p>
              <p className="text-xl font-semibold text-slate-900">
                {Math.round(completionRate)}%
              </p>
              <p className="text-xs text-slate-500">
                {completedCount} / {TRACKABLE_STEP_COUNT} sections complete
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Primary contact</p>
              <p className="text-sm font-semibold text-slate-900">
                {projectQuery.data?.owner?.email ?? '—'}
              </p>
              <p className="text-xs text-slate-500">
                Created:{' '}
                {projectQuery.data?.createdAt
                  ? new Date(projectQuery.data.createdAt).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Next milestone</p>
              <p className="text-sm font-semibold text-slate-900">
                {remindersQuery.data?.[0]?.message ?? 'No reminders'}
              </p>
              <p className="text-xs text-slate-500">
                {remindersQuery.data?.[0]?.dueAt
                  ? new Date(remindersQuery.data[0].dueAt).toLocaleDateString()
                  : 'Set a reminder'}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Quick actions
          </p>
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              Continue documentation
              <span className="block text-xs font-normal text-slate-500">
                Jump back into the active step.
              </span>
            </button>
            <Link
              to={`/projects/${projectId}/trust`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              Open trust workspace
              <span className="block text-xs font-normal text-slate-500">
                Review metrics, fairness, and evidence.
              </span>
            </Link>
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById('documents-panel')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
              className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              Generate documentation
              <span className="block text-xs font-normal text-slate-500">
                Select frameworks and trigger exports.
              </span>
            </button>
          </div>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <WizardSidebar
          completionRate={completionRate}
          completedCount={completedCount}
          completedSteps={completedSteps}
          sectionByName={sectionByName}
          incompleteFieldsByStep={incompleteFieldsByStep}
          activeStepId={activeStepId}
          setActiveStepId={setActiveStepId}
          projectQuery={projectQuery}
        />


        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {activeStep.title}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeStep.description}
                </p>
              </div>
            </div>
            {autosaveRecovery && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                <p>
                  Unsaved edits from{' '}
                  {new Date(autosaveRecovery.updatedAt).toLocaleString()} detected.
                </p>
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => {
                      reset(autosaveRecovery.content);
                      setAutosaveRecovery(null);
                      setLastSavedAt(autosaveRecovery.updatedAt);
                    }}
                    className="rounded-md bg-amber-600 px-3 py-1 text-white"
                  >
                    Restore
                  </button>
                  <button
                    onClick={() => setAutosaveRecovery(null)}
                    className="text-amber-700 underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400">{formatSavedLabel()}</p>
            {currentSection?.updatedAt && (
              <p className="text-xs text-slate-400">
                Last saved{' '}
                {new Date(currentSection.updatedAt).toLocaleString(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                {currentSection.lastEditor?.email
                  ? ` · ${currentSection.lastEditor.email}`
                  : ''}
              </p>
            )}

            {activeStep.fields.length ? (
              <>
                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                  <button
                    type="button"
                    onClick={handleSaveTemplate}
                    className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    disabled={saveTemplateMutation.isPending}
                  >
                    Save as Template
                  </button>
                  {templatesQuery.data?.length ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        Apply template:
                      </span>
                      <select
                        onChange={(event) => {
                          const selected = templatesQuery.data.find(
                            (tpl: any) => tpl.id === event.target.value,
                          );
                          if (selected) {
                            handleApplyTemplate(selected);
                          }
                        }}
                        className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                      >
                        <option value="">Select...</option>
                        {templatesQuery.data.map((tpl: any) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
                {aiSuggestion && (
                  <div className="mt-4 rounded-xl border border-dashed border-sky-200 bg-sky-50/60 p-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">AI Draft</p>
                      <button
                        className="text-xs text-slate-500 hover:text-slate-700"
                        onClick={() => setAiSuggestion(null)}
                      >
                        Clear
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                      {aiSuggestion}
                    </p>
                  </div>
                )}
                <form
                  className="mt-6 space-y-4"
                  onSubmit={handleSubmit((values) =>
                    saveMutation.mutate({ stepId: activeStepId, values }),
                  )}
                >
                  {activeStep.fields.map((field) => (
                    <div key={field.name}>
                      <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                        <label className="flex-1" htmlFor={`field-${field.name}`}>
                          {field.label}
                        </label>
                        <button
                          type="button"
                          onClick={() => requestFieldSuggestion(field.name)}
                          disabled={
                            suggestionMutation.isPending || !currentSection
                          }
                          className="text-xs font-semibold text-sky-600 hover:text-sky-500 disabled:opacity-60"
                        >
                          Ask AI
                        </button>
                      </div>
                      {field.type === 'textarea' ? (
                        <textarea
                          id={`field-${field.name}`}
                          {...register(field.name)}
                          rows={4}
                          onFocus={() => setActiveField(field.name)}
                          onBlur={() => setActiveField(null)}
                          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        />
                      ) : (
                        <input
                          id={`field-${field.name}`}
                          {...register(field.name)}
                          onFocus={() => setActiveField(field.name)}
                          onBlur={() => setActiveField(null)}
                          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        />
                      )}
                      {aiFieldSuggestions[field.name] && (
                        <div className="mt-1 flex items-start justify-between rounded-md bg-sky-50 px-3 py-2 text-xs text-slate-600">
                          <span className="pr-2">
                            <span className="font-semibold text-slate-800">
                              AI Suggestion:
                            </span>{' '}
                            {aiFieldSuggestions[field.name]}
                          </span>
                            <div className="flex flex-col items-end gap-1 text-[11px] font-semibold">
                              <div className="flex gap-2 text-lg">
                              <button
                                type="button"
                                title="Helpful"
                                onClick={() =>
                                  currentSection &&
                                  handleSuggestionFeedback(
                                    currentSection.id,
                                    field.name,
                                    aiFieldSuggestions[field.name],
                                    true,
                                  )
                                }
                                className="text-emerald-500 hover:text-emerald-600"
                              >
                                👍
                              </button>
                              <button
                                type="button"
                                title="Not helpful"
                                onClick={() =>
                                  currentSection &&
                                  handleSuggestionFeedback(
                                    currentSection.id,
                                    field.name,
                                    aiFieldSuggestions[field.name],
                                    false,
                                  )
                                }
                                className="text-rose-500 hover:text-rose-600"
                              >
                                👎
                              </button>
                            </div>
                              <button
                                type="button"
                                onClick={() => handleApplyFieldSuggestion(field.name)}
                                className="text-sky-600 hover:text-sky-500"
                              >
                                Apply
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAppendFieldSuggestion(field.name)}
                                className="text-slate-600 hover:text-slate-800"
                              >
                                Append
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setAiFieldSuggestions((prev) => {
                                    const next = { ...prev };
                                  delete next[field.name];
                                  return next;
                                })
                              }
                              className="text-slate-400 hover:text-slate-600"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      )}
                      {aiFieldHistory[field.name]?.length ? (
                        <div className="mt-1 rounded-md border border-slate-100 bg-white px-3 py-2 text-[11px] text-slate-500">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Recent suggestions
                          </p>
                          <ul className="mt-1 space-y-1">
                            {aiFieldHistory[field.name].map((item, idx) => (
                              <li
                                key={`${field.name}-hist-${idx}`}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="flex-1 truncate">{item}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleApplyHistorySuggestion(field.name, item)
                                  }
                                  className="text-sky-600 hover:text-sky-500"
                                >
                                  Apply
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {suggestionMutation.isPending &&
                        suggestionFieldRef.current === field.name && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            AI drafting suggestion...
                          </p>
                        )}
                    </div>
                  ))}
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                    >
                      {saveMutation.isPending ? 'Saving...' : 'Save Section'}
                    </button>
                  </div>
                </form>
                <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">
                        Evidence attachments
                      </h4>
                      <p className="text-xs text-slate-500">
                        Upload supporting policies, evaluations, or reports that
                        justify this section’s answers.
                      </p>
                    </div>
                    {currentSection?.artifacts?.length ? (
                      <span className="text-xs font-semibold text-slate-400">
                        {currentSection.artifacts.length} file
                        {currentSection.artifacts.length === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </div>
                  {currentSection ? (
                    <>
                      <div className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
                        <div>
                          <input
                            ref={artifactInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleArtifactFileChange}
                          />
                          <button
                            type="button"
                            onClick={() => artifactInputRef.current?.click()}
                            className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-slate-300"
                          >
                            <span className="truncate text-slate-700">
                              {artifactFile
                                ? artifactFile.name
                                : 'Select a file to attach'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {artifactFile ? formatFileSize(artifactFile.size) : ''}
                            </span>
                          </button>
                        </div>
                        <input
                          type="text"
                          value={artifactDescription}
                          onChange={(event) =>
                            setArtifactDescription(event.target.value)
                          }
                          placeholder="Optional description"
                          className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        />
                        <select
                          value={artifactPurpose}
                          onChange={(e) => setArtifactPurpose(e.target.value as any)}
                          className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                          title="Purpose"
                        >
                          <option value="GENERIC">Generic</option>
                          <option value="DATASET">Dataset</option>
                          <option value="MODEL">Model</option>
                        </select>
                        <div className="flex items-center justify-end gap-2">
                          {artifactFile ? (
                            <button
                              type="button"
                              onClick={clearArtifactSelection}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                            >
                              Clear
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={handleArtifactUpload}
                            disabled={
                              artifactUploadMutation.isPending || !artifactFile
                            }
                            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                          >
                            {artifactUploadMutation.isPending
                              ? 'Uploading...'
                              : 'Upload evidence'}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {currentSection.artifacts?.length ? (
                          currentSection.artifacts.map((artifact: SectionArtifactItem) => {
                            const hasNewerVersion =
                              currentSection.artifacts?.some(
                                (other: SectionArtifactItem) =>
                                  other.version > artifact.version,
                              ) ?? false;
                            const reviewDraft = artifactReviewDraft[artifact.id];
                            return (
                              <div
                                key={artifact.id}
                                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="font-semibold text-slate-900">
                                        {artifact.originalName}
                                      </p>
                                      <p className="text-xs text-slate-500">
                                        {artifact.description
                                          ? `${artifact.description} · `
                                          : ''}
                                        {formatFileSize(artifact.size)} ·{' '}
                                        {new Date(
                                          artifact.createdAt,
                                        ).toLocaleString(undefined, {
                                          dateStyle: 'short',
                                          timeStyle: 'short',
                                        })}
                                        {artifact.uploadedBy?.email
                                          ? ` · ${artifact.uploadedBy.email}`
                                          : ''}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                                        v{artifact.version}
                                      </span>
                                      <span
                                        className={`rounded-full px-2 py-0.5 ${artifactStatusStyles[artifact.status]}`}
                                      >
                                        {artifactStatusLabels[artifact.status]}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span>
                                      Citation:
                                      <code className="ml-1 rounded bg-white px-1 py-0.5 text-[11px] text-slate-700">
                                        {artifact.citationKey}
                                      </code>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyToClipboard(
                                          artifact.citationKey,
                                          'Citation copied',
                                        )
                                      }
                                      className="text-[11px] font-semibold text-sky-600 hover:text-sky-500"
                                    >
                                      Copy citation
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                                    <span>
                                      Checksum:
                                      <code className="ml-1 rounded bg-white px-1 py-0.5 text-[11px] text-slate-700">
                                        {artifact.checksum}
                                      </code>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleCopyToClipboard(
                                          artifact.checksum,
                                          'Checksum copied',
                                        )
                                      }
                                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                                    >
                                      Copy checksum
                                    </button>
                                  </div>
                                  {artifact.previousArtifact ? (
                                    <p className="text-[11px] text-slate-500">
                                      Replaces{' '}
                                      <span className="font-medium">
                                        {artifact.previousArtifact.citationKey}
                                      </span>{' '}
                                      (checksum{' '}
                                      <code className="bg-white px-1 py-0.5 text-[10px] text-slate-700">
                                        {artifact.previousArtifact.checksum}
                                      </code>
                                      ).
                                    </p>
                                  ) : null}
                                  {artifact.reviewedBy?.email ? (
                                    <p className="text-[11px] text-slate-500">
                                      Reviewed by {artifact.reviewedBy.email}
                                      {artifact.reviewedAt
                                        ? ` on ${new Date(
                                            artifact.reviewedAt,
                                          ).toLocaleString(undefined, {
                                            dateStyle: 'short',
                                            timeStyle: 'short',
                                          })}`
                                        : ''}
                                      {artifact.reviewComment
                                        ? ` · “${artifact.reviewComment}”`
                                        : ''}
                                    </p>
                                  ) : (
                                    <p className="text-[11px] text-amber-600">
                                      Awaiting reviewer approval.
                                    </p>
                                  )}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                                  <button
                                    type="button"
                                    onClick={() => handleArtifactDownload(artifact)}
                                    className="rounded-md border border-slate-200 px-3 py-1 text-slate-700 hover:border-slate-300 hover:text-slate-900"
                                  >
                                    Download
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleArtifactDelete(artifact.id)}
                                    disabled={
                                      artifactDeleteMutation.isPending ||
                                      hasNewerVersion
                                    }
                                    title={
                                      hasNewerVersion
                                        ? 'Remove later versions before deleting this file'
                                        : undefined
                                    }
                                    className="rounded-md border border-rose-200 px-3 py-1 text-rose-600 hover:border-rose-300 hover:text-rose-700 disabled:opacity-50"
                                  >
                                    Remove
                                  </button>
                                  {canReviewEvidence ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReviewExpanded((prev) => ({
                                          ...prev,
                                          [artifact.id]: !prev[artifact.id],
                                        }))
                                      }
                                      className="rounded-md border border-slate-200 px-3 py-1 text-slate-700 hover:border-slate-300 hover:text-slate-900"
                                    >
                                      {reviewExpanded[artifact.id] ? 'Hide review' : 'Review'}
                                    </button>
                                  ) : null}
                                </div>
                                {canReviewEvidence && reviewExpanded[artifact.id] ? (
                                  <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                      <label
                                        htmlFor={`artifact-status-${artifact.id}`}
                                        className="font-semibold uppercase tracking-wide text-slate-400"
                                      >
                                        Review status
                                      </label>
                                      <select
                                        id={`artifact-status-${artifact.id}`}
                                        value={
                                          reviewDraft?.status ?? artifact.status
                                        }
                                        onChange={(event) =>
                                          handleArtifactReviewStatusChange(
                                            artifact.id,
                                            event.target.value as ArtifactStatus,
                                          )
                                        }
                                        className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                                      >
                                        <option value="PENDING">Pending</option>
                                        <option value="APPROVED">Approved</option>
                                        <option value="REJECTED">Rejected</option>
                                      </select>
                                    </div>
                                    <textarea
                                      value={reviewDraft?.comment ?? ''}
                                      onChange={(event) =>
                                        handleArtifactReviewCommentChange(
                                          artifact.id,
                                          event.target.value,
                                        )
                                      }
                                      rows={3}
                                      placeholder="Add reviewer notes or justification..."
                                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                                    />
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleArtifactReviewSubmit(artifact.id)
                                        }
                                        disabled={
                                          artifactReviewMutation.isPending &&
                                          reviewingArtifactId === artifact.id
                                        }
                                        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                                      >
                                        {artifactReviewMutation.isPending &&
                                        reviewingArtifactId === artifact.id
                                          ? 'Saving...'
                                          : 'Save Review'}
                                      </button>
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setManageModalOpen(true)}
                    className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Manage templates
                  </button>
                </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-slate-500">
                            No evidence uploaded yet. Add policies, risk logs, or
                            evaluation files to keep auditors aligned.
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      Save this section before attaching evidence.
                    </p>
                  )}
                </div>
                {currentSection ? (
                  <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Discussion
                      </h4>
                      <span className="text-xs text-slate-500">
                        {currentSection.comments.length} comments
                      </span>
                    </div>
                    <div className="mt-2 rounded-xl border border-dashed border-slate-200 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400">
                        Status history
                      </p>
                      <div className="mt-2 space-y-1">
                        {currentSection.statusEvents?.length ? (
                          currentSection.statusEvents
                            .slice(0, 3)
                            .map((event: StatusEvent) => (
                              <p
                                key={event.id}
                                className="text-[11px] text-slate-500"
                              >
                                <span className="font-semibold text-slate-700">
                                  {event.status.replace('_', ' ')}
                                </span>{' '}
                                ·{' '}
                                {new Date(event.createdAt).toLocaleString(
                                  undefined,
                                  {
                                    dateStyle: 'short',
                                    timeStyle: 'short',
                                  },
                                )}
                                {event.actor?.email
                                  ? ` · ${event.actor.email}`
                                  : ''}
                                {event.signature
                                  ? ` · Signed ${event.signature}`
                                  : ''}
                                {event.note ? ` – ${event.note}` : ''}
                              </p>
                            ))
                        ) : (
                          <p className="text-[11px] text-slate-400">
                            No status changes yet.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      {currentSection.comments.length ? (
                        currentSection.comments.map((comment: SectionComment) => (
                          <div
                            key={comment.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 text-sm"
                          >
                            <p className="text-slate-700">{comment.body}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                              {comment.author?.email ?? 'Unknown'} ·{' '}
                              {new Date(comment.createdAt).toLocaleString(
                                undefined,
                                {
                                  dateStyle: 'short',
                                  timeStyle: 'short',
                                },
                              )}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No comments yet. Share context with reviewers below.
                        </p>
                      )}
                    </div>
                    <form
                      className="mt-4 space-y-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                      if (!currentSection || !commentBody.trim()) return;
                      if (commentBody.trim().startsWith('/ai')) {
                        suggestionFieldRef.current = activeField;
                        suggestionMutation.mutate({
                          hint: commentBody.trim().slice(3).trim(),
                          partialContent: currentSection.content ?? {},
                          targetField: activeField ?? undefined,
                        });
                        setCommentBody('');
                        return;
                      }
                      commentMutation.mutate({
                        sectionId: currentSection.id,
                        body: commentBody.trim(),
                      });
                      }}
                    >
                      <textarea
                        value={commentBody}
                        onChange={(event) => setCommentBody(event.target.value)}
                      placeholder="Add a note or question... (type /ai to request suggestions)"
                      rows={3}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={
                            !commentBody.trim() || commentMutation.isPending
                          }
                          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          {commentMutation.isPending
                            ? 'Posting...'
                            : 'Post Comment'}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-sm text-slate-500">
                    Save this section to start a collaboration thread.
                  </div>
                )}
              </>
            ) : (
              <div className="mt-6 space-y-4">
                <ReviewApprovalPanel
                  trackableSteps={trackableStepSummaries}
                  projectStatusLabel={projectStatusLabel}
                  onSendForReview={sendProjectForReview}
                  onApprove={approveProject}
                  onRequestChanges={requestChanges}
                  reviewerId={selectedReviewerId}
                  approverId={selectedApproverId}
                  onReviewerChange={(value) => setSelectedReviewerId(value || null)}
                  onApproverChange={(value) => setSelectedApproverId(value || null)}
                  reviewMessage={reviewMessage}
                  setReviewMessage={setReviewMessage}
                  reviewers={reviewersQuery.data ?? []}
                  availableReviewers={availableReviewers}
                  canAssignSelf={canAssignSelf}
                  userId={user?.id}
                />
                <div
                  className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"
                  id="documents-panel"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Framework coverage
                      </p>
                      <p className="text-xs text-slate-500">
                        Select which deliverables to create ({selectedDocumentTypes.length}/
                        {DOCUMENT_GENERATION_OPTIONS.length} selected).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={resetDocumentSelections}
                      disabled={selectionIsDefault}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-40"
                    >
                      Reset to defaults
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {DOCUMENT_GENERATION_OPTIONS.map((option) => {
                      const isSelected = selectedDocumentTypes.includes(
                        option.type,
                      );
                      return (
                        <label
                          key={option.type}
                          className={`flex cursor-pointer flex-col rounded-xl border px-4 py-3 text-left transition ${
                            isSelected
                              ? 'border-sky-400 bg-white shadow-sm shadow-sky-100'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => toggleDocumentType(option.type)}
                          />
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {option.label}
                              </p>
                              {option.framework ? (
                                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-400">
                                  {option.framework}
                                </p>
                              ) : null}
                            </div>
                            <span
                              className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[0.65rem] font-semibold ${
                                isSelected
                                  ? 'border-sky-500 bg-sky-500 text-white'
                                  : 'border-slate-300 bg-slate-50 text-slate-400'
                              }`}
                            >
                              {isSelected ? '✓' : '•'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-slate-600">
                            {option.description}
                          </p>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={handleGenerateClick}
                  disabled={
                    generateMutation.isPending ||
                    !selectedDocumentTypes.length ||
                    projectStatusLabel !== 'APPROVED'
                  }
                  className="rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {generateMutation.isPending
                    ? 'Generating...'
                    : 'Generate Documentation'}
                </button>
                {generateMutation.isSuccess && (
                  <p className="text-sm text-emerald-600">
                    Generation in progress. Documents will appear below when
                    ready.
                  </p>
                )}
                {generateMutation.isError && (
                  <p className="text-sm text-rose-600">
                    Unable to generate documents. Ensure each section has been
                    saved and try again.
                  </p>
                )}
                {projectStatusLabel !== 'APPROVED' && (
                  <p className="mt-2 text-xs font-semibold text-amber-600">
                    Document generation is locked until project approval.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Compliance Documents
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleZipDownload}
                  className="text-sm font-medium text-slate-500 hover:text-slate-800"
                >
                  Download ZIP
                </button>
                <button
                  onClick={() => documentsQuery.refetch()}
                  className="text-sm font-medium text-sky-600 hover:text-sky-500"
                >
                  Refresh
                </button>
              </div>
            </div>
            {documentsQuery.data?.length ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {Array.from(documentsGrouping.groups.entries()).map(
                  ([type, docs]) => {
                    const latest = docs[0];
                    const previous = docs.slice(1, 3);
                    const version =
                      documentsGrouping.versions.get(latest.id) ?? docs.length;
                    return (
                      <div
                        key={type}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm uppercase tracking-wide text-slate-400">
                              {DOCUMENT_LABELS[type] ?? type}
                            </p>
                            <h4 className="text-xl font-semibold text-slate-900">
                              Version {version}
                            </h4>
                            <p className="text-xs text-slate-500">
                              Updated{' '}
                              {new Date(latest.createdAt).toLocaleString(
                                undefined,
                                {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                },
                              )}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {docs.length} total
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => handlePreview(latest)}
                            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownload(latest.id, latest.type)}
                            disabled={downloadingId === latest.id}
                            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            {downloadingId === latest.id
                              ? 'Downloading...'
                              : 'Download'}
                          </button>
                        </div>
                        {previous.length > 0 && (
                          <div className="mt-4 border-t border-slate-100 pt-4">
                            <p className="text-xs uppercase tracking-wide text-slate-400">
                              Version history
                            </p>
                            <ul className="mt-2 space-y-2 text-xs text-slate-500">
                              {previous.map((doc: DocumentItem) => {
                                const ver =
                                  documentsGrouping.versions.get(doc.id) ?? 1;
                                return (
                                  <li
                                    key={doc.id}
                                    className="flex items-center justify-between"
                                  >
                                    <span>
                                      v{ver} ·{' '}
                                      {new Date(doc.createdAt).toLocaleDateString()}{' '}
                                      {new Date(doc.createdAt).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <button
                                      onClick={() => handleDownload(doc.id, doc.type)}
                                      className="text-sky-600 hover:text-sky-500"
                                    >
                                      Download
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  },
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                {documentsQuery.isLoading
                  ? 'Fetching documents...'
                  : 'No documents yet. Generate them from the review step.'}
              </p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900">Insights</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Pending sections
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-slate-900">
                    {pendingSteps.length}
                  </p>
                  <p className="text-xs text-slate-500">
                    {pendingSteps.length
                      ? pendingSteps
                          .map((id) => stepTitleMap.get(id) ?? id)
                          .slice(0, 2)
                          .join(', ')
                      : 'All compliance questions captured'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Latest artifact
                  </p>
                  {latestDoc ? (
                    <>
                      <p className="mt-1 text-base font-semibold text-slate-900">
                        {DOCUMENT_LABELS[latestDoc.type] ?? latestDoc.type}
                      </p>
                      <p className="text-xs text-slate-500">
                        Generated{' '}
                        {new Date(latestDoc.createdAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-slate-500">
                      Generate documents to populate this summary.
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-rose-500">
                    Risk highlight
                  </p>
                  <p className="mt-1 text-sm text-rose-900">
                    {riskSummaryText}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Activity Timeline
              </h3>
              <div className="mt-4 space-y-4">
                {timelineEvents.length ? (
                  timelineEvents.map((event) => (
                    <div key={event.id} className="flex gap-3">
                      <div
                        className={`mt-1 h-3 w-3 rounded-full ${
                          event.type === 'section'
                            ? 'bg-sky-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {event.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(event.timestamp).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                          {event.meta ? ` · ${event.meta}` : ''}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">
                    No activity yet. Save a section or generate documents to see
                    timeline updates.
                  </p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-slate-900">
                Risk Heatmap
              </h3>
              {riskEntries.length ? (
                <div className="mt-4 overflow-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr>
                        <th className="border border-slate-200 px-2 py-1 text-left text-slate-500">
                          Severity \ Likelihood
                        </th>
                        {likelihoodLevels.map((level) => (
                          <th
                            key={level}
                            className="border border-slate-200 px-2 py-1 text-slate-600"
                          >
                            {level}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {riskHeatmap.map((row, rowIndex) => (
                        <tr key={severityLevels[rowIndex]}>
                          <td className="border border-slate-200 px-2 py-1 text-slate-600">
                            {severityLevels[rowIndex]}
                          </td>
                          {row.map((cell, colIndex) => (
                            <td
                              key={`${rowIndex}-${colIndex}`}
                              className="border border-slate-200 px-2 py-2 align-top"
                            >
                              {cell.items.length ? (
                                <ul className="space-y-1">
                                  {cell.items.slice(0, 2).map((item, idx) => (
                                    <li
                                      key={idx}
                                      className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700"
                                    >
                                      {item.description || item.risk || 'Risk'}
                                    </li>
                                  ))}
                                  {cell.items.length > 2 && (
                                    <li className="text-[10px] text-slate-400">
                                      +{cell.items.length - 2} more
                                    </li>
                                  )}
                                </ul>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  Provide structured risk entries (severity & likelihood) to see
                  this visualization.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Reminders
              </h3>
              <button
                onClick={() => remindersQuery.refetch()}
                className="text-sm font-medium text-sky-600 hover:text-sky-500"
              >
                Refresh
              </button>
            </div>
            <form className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]" onSubmit={handleReminderSubmit}>
              <input
                value={reminderForm.message}
                onChange={(event) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    message: event.target.value,
                  }))
                }
                placeholder="Follow up with legal..."
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <input
                type="datetime-local"
                value={reminderForm.dueAt}
                onChange={(event) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    dueAt: event.target.value,
                  }))
                }
                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="submit"
                disabled={createReminderMutation.isPending}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                Add
              </button>
            </form>
            <div className="mt-4 space-y-3">
              {remindersQuery.data?.length ? (
                remindersQuery.data.map((reminder: any) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          reminder.completed
                            ? 'text-slate-400 line-through'
                            : 'text-slate-900'
                        }`}
                      >
                        {reminder.message}
                      </p>
                      <p className="text-xs text-slate-500">
                        Due{' '}
                        {new Date(reminder.dueAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        updateReminderMutation.mutate({
                          id: reminder.id,
                          completed: !reminder.completed,
                        })
                      }
                      className="text-xs font-semibold text-sky-600 hover:text-sky-500"
                    >
                      {reminder.completed ? 'Reopen' : 'Mark done'}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No reminders yet. Schedule nudges to keep the project on track.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
      <TemplateLibraryModal
        open={manageModalOpen}
        onClose={() => setManageModalOpen(false)}
        templates={templatesQuery.data ?? []}
        selectedTemplates={selectedTemplates}
        toggleSelection={toggleTemplateSelection}
        bulkAction={bulkAction}
        setBulkAction={setBulkAction}
        executeBulkAction={executeBulkAction}
        updateTemplate={(payload) => updateTemplateMutation.mutate(payload)}
        deleteTemplate={(id) => deleteTemplateMutation.mutate(id)}
        userId={user?.id}
      />
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        title={
          previewDoc
            ? DOCUMENT_LABELS[previewDoc.type] ?? 'Document preview'
            : 'Document preview'
        }
        url={previewUrl}
        isLoading={previewLoading}
        onClose={closePreview}
      />
    </AppShell>
  );
}
type StatusEvent = {
  id: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
  note?: string;
  signature?: string;
  createdAt: string;
  actor?: {
    id: string;
    email: string;
  };
};
