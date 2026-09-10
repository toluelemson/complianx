// AI systems domain route.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
import toast from 'react-hot-toast';
import { AppShell } from '@/app/layout/AppShell';
import { useAuth } from '@/app/providers/AuthContext';
import {
  addSectionComment,
  bulkTemplateAction,
  createProjectReminder,
  createTemplate,
  deleteTemplate,
  getGenerationReadiness,
  getPreliminaryClassification,
  getProject,
  getProjectDocuments,
  getProjectSections,
  listProjectReminders,
  listProjectObligations,
  linkObligationEvidence,
  listObligationEvidence,
  listProjectReviewers,
  updateProjectObligation,
  listTemplates,
  reviewClassification,
  saveProjectSection,
  setCommentResolution,
  sendSuggestionFeedback,
  suggestSection,
  updateProjectReminder,
  updateTemplate,
  unlinkObligationEvidence,
} from '@/domains/ai-systems/api';
import type {
  DocumentItem,
  ArtifactStatus,
  FormValues,
  GenerationReadiness,
  ProjectDetail,
  ProjectWorkflowStatus,
  ReminderItem,
  ReviewerItem,
  SectionComment,
  SectionArtifactItem,
  SectionWithMeta,
  SuggestionResponse,
  StatusEvent,
  TemplateItem,
} from '@complianx/contracts/ai-systems';
import {
  STEP_CONFIG,
  TRACKABLE_STEP_COUNT,
  type StepField,
} from '@/domains/ai-systems/constants/steps';
import {
  DOCUMENT_GENERATION_OPTIONS,
  DOCUMENT_LABELS,
} from '@/domains/ai-systems/constants/documents';
import { DocumentPreviewModal } from '@/domains/evidence/components/DocumentPreviewModal';
import TemplateLibraryModal from '@/domains/reports/components/TemplateLibraryModal';
import { ReviewApprovalPanel } from '@/domains/workflows/components/ReviewApprovalPanel';
import { WizardSidebar } from '../components/WizardSidebar';
import { ProjectPanel } from '../components/ProjectPanel';
import { useProjectAutosave } from '../hooks/useProjectAutosave';
import { useProjectWorkflow } from '../hooks/useProjectWorkflow';
import { useProjectEvidence } from '../hooks/useProjectEvidence';
import { useProjectDocuments } from '../hooks/useProjectDocuments';
import {
  canApproveProject as canApproveProjectForRole,
  canRequestProjectChanges as canRequestProjectChangesForRole,
  canStartProjectReview as canStartProjectReviewForRole,
  isValidApprovalSignature,
} from '../lib/project-page-logic';

const monetizationEnabled =
  import.meta.env.VITE_MONETIZATION_ENABLED !== 'false';

type RiskEntry = {
  description?: string;
  risk?: string;
  severity?: string;
  impact?: string;
  likelihood?: string;
};

type ApiErrorPayload = {
  message?: string | { message?: string };
};

function getApiErrorMessage(error: unknown) {
  const maybeError = error as { response?: { data?: ApiErrorPayload } } | null;
  const message = maybeError?.response?.data?.message;
  if (typeof message === 'string') {
    return message;
  }
  return message?.message;
}

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
  const { projectId: routeProjectId, sectionKey } = useParams<{
    projectId: string;
    sectionKey?: string;
  }>();
  const projectId = routeProjectId ?? '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeStepId, setActiveStepId] = useState(STEP_CONFIG[0].id);
  const { token, user, activeCompanyId, setActiveCompany } = useAuth();
  const location = useLocation();
  useEffect(() => {
    if (!routeProjectId) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, routeProjectId]);
  useEffect(() => {
    const routeStep: Record<string, string> = {
      overview: 'system_overview',
      'organization-profile': 'system_overview',
      'ai-system-profile': 'system_overview',
      classification: 'risk_assessment',
      requirements: 'review_generate',
      evidence: 'data_governance',
      documents: 'review_generate',
      messages: 'review_generate',
      'review-approval': 'review_generate',
    };
    const nextStep = sectionKey ? routeStep[sectionKey] : undefined;
    if (nextStep && STEP_CONFIG.some((step) => step.id === nextStep)) {
      setActiveStepId(nextStep);
    }
  }, [sectionKey]);
  useEffect(() => {
    const paramsCompanyId = new URLSearchParams(location.search).get(
      'companyId',
    );
    const hasMembership =
      !user?.companies?.length ||
      user?.companies?.some((company) => company.companyId === paramsCompanyId);
    if (
      paramsCompanyId &&
      paramsCompanyId !== activeCompanyId &&
      hasMembership
    ) {
      setActiveCompany(paramsCompanyId);
    }
  }, [location.search, activeCompanyId, setActiveCompany, user?.companies]);
  const activeStep = useMemo(
    () => STEP_CONFIG.find((step) => step.id === activeStepId)!,
    [activeStepId],
  );
  const isFormStep = activeStep.fields.length > 0;
  const projectQueryKey = ['project', projectId, activeCompanyId];
  const sectionsQueryKey = ['sections', projectId, activeCompanyId];
  const documentsQueryKey = ['documents', projectId, activeCompanyId];
  const remindersQueryKey = ['reminders', projectId, activeCompanyId];
  const reviewersQueryKey = ['projectReviewers', projectId, activeCompanyId];
  const wizardSectionRef = useRef<HTMLElement | null>(null);
  const sectionScrollInitiated = useRef(false);
  useEffect(() => {
    if (!sectionScrollInitiated.current) {
      sectionScrollInitiated.current = true;
      return;
    }
    wizardSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [activeStepId]);
  const scrollToSections = () => {
    sidebarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const projectQuery = useQuery<ProjectDetail>({
    queryKey: projectQueryKey,
    enabled: Boolean(projectId && activeCompanyId),
    queryFn: () => getProject(projectId),
  });

  const sectionsQuery = useQuery<SectionWithMeta[]>({
    queryKey: sectionsQueryKey,
    enabled: Boolean(projectId && activeCompanyId),
    queryFn: () => getProjectSections(projectId),
  });

  const documentsQuery = useQuery<DocumentItem[]>({
    queryKey: documentsQueryKey,
    enabled: Boolean(projectId && activeCompanyId),
    queryFn: () => getProjectDocuments(projectId),
  });
  const readinessQuery = useQuery<GenerationReadiness>({
    queryKey: ['generationReadiness', projectId, activeCompanyId],
    enabled: Boolean(
      projectId && activeCompanyId && projectQuery.data?.viewerRole === 'OWNER',
    ),
    queryFn: () => getGenerationReadiness(projectId),
  });
  const classificationQuery = useQuery({
    queryKey: ['preliminaryClassification', projectId, activeCompanyId],
    enabled: Boolean(projectId && activeCompanyId),
    queryFn: () => getPreliminaryClassification(projectId),
  });
  const classificationReviewMutation = useMutation({
    mutationFn: (payload: {
      status: 'REVIEWED' | 'OVERRIDDEN';
      overrideCategory?: string;
      reason?: string;
    }) =>
      reviewClassification(
        projectId,
        classificationQuery.data?.id ?? '',
        payload,
      ),
    onSuccess: () => {
      toast.success('Classification review saved');
      queryClient.invalidateQueries({
        queryKey: ['preliminaryClassification', projectId, activeCompanyId],
      });
    },
    onError: (error) =>
      toast.error(
        getApiErrorMessage(error) ?? 'Unable to save classification review',
      ),
  });
  const obligationsQuery = useQuery({
    queryKey: ['obligations', projectId, activeCompanyId],
    enabled: Boolean(projectId && activeCompanyId),
    queryFn: () => listProjectObligations(projectId),
  });
  const [obligationFilter, setObligationFilter] = useState('ALL');
  const obligationUpdateMutation = useMutation({
    mutationFn: (payload: { obligationId: string; field: string; value: string }) =>
      updateProjectObligation(projectId, payload.obligationId, {
        [payload.field]: payload.value,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['obligations', projectId] });
    },
    onError: () => toast.error('Unable to update requirement'),
  });
  const visibleObligations = (obligationsQuery.data ?? []).filter(
    (item) => obligationFilter === 'ALL' || item.status === obligationFilter,
  );
  const obligationEvidenceQueries = useQueries({
    queries: (obligationsQuery.data ?? []).map((item) => ({
      queryKey: ['obligationEvidence', projectId, item.id, activeCompanyId],
      enabled: Boolean(projectId && activeCompanyId),
      queryFn: () => listObligationEvidence(projectId, item.id),
    })),
  });
  const evidenceByObligation = useMemo(
    () =>
      new Map(
        (obligationsQuery.data ?? []).map((item, index) => [
          item.id,
          obligationEvidenceQueries[index]?.data ?? [],
        ]),
      ),
    [obligationsQuery.data, obligationEvidenceQueries],
  );
  const projectArtifacts = useMemo(
    () =>
      (sectionsQuery.data ?? []).flatMap((section) =>
        (section.artifacts ?? []).map((artifact) => ({
          ...artifact,
          sectionName: section.name,
        })),
      ),
    [sectionsQuery.data],
  );
  const evidenceLinkMutation = useMutation({
    mutationFn: (payload: {
      action: 'link' | 'unlink';
      obligationId: string;
      artifactId?: string;
      documentId?: string;
      linkId?: string;
    }) =>
      payload.action === 'link'
        ? linkObligationEvidence(projectId, payload.obligationId, {
            artifactId: payload.artifactId,
            documentId: payload.documentId,
          })
        : unlinkObligationEvidence(
            projectId,
            payload.obligationId,
            payload.linkId ?? '',
          ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['obligationEvidence', projectId],
      });
    },
    onError: () => toast.error('Unable to update requirement evidence'),
  });
  const documents = useProjectDocuments(
    projectId,
    token,
    projectQuery.data?.viewerRole === 'OWNER',
    monetizationEnabled,
    readinessQuery.data,
    () => queryClient.invalidateQueries({ queryKey: documentsQueryKey }),
  );
  const {
    planQuery,
    usageQuery,
    selectedDocumentTypes,
    selectionIsDefault,
    toggleDocumentType,
    resetDocumentSelections,
    docLimit,
    docsUsed,
    docsRemaining,
    isPaidPlan,
    generateMutation,
    handleGenerateClick,
    downloadingId,
    previewDoc,
    previewUrl,
    previewLoading,
    handleDownload,
    handlePreview,
    handleZipDownload,
    closePreview,
  } = documents;
  const templatesQuery = useQuery<TemplateItem[]>({
    queryKey: ['templates', activeStepId],
    enabled: Boolean(isFormStep),
    queryFn: () => listTemplates(activeStepId),
  });

  const remindersQuery = useQuery<ReminderItem[]>({
    queryKey: remindersQueryKey,
    enabled: Boolean(projectId && activeCompanyId),
    queryFn: () => listProjectReminders(projectId),
  });
  const viewerRole = projectQuery.data?.viewerRole ?? 'OWNER';
  const isOwner = viewerRole === 'OWNER';
  const isAdmin = user?.role === 'ADMIN';
  const isAssignedReviewer = viewerRole === 'REVIEWER';
  const isAssignedApprover = viewerRole === 'APPROVER';
  const canApproveProject = canApproveProjectForRole(viewerRole, user?.role);
  const canRequestProjectChanges = canRequestProjectChangesForRole(
    viewerRole,
    user?.role,
  );
  const canStartProjectReview = canStartProjectReviewForRole(
    viewerRole,
    user?.role,
  );
  const canReviewEvidence = isAssignedReviewer || isAssignedApprover || isAdmin;
  const canAssignSelf =
    isOwner && (user?.role === 'REVIEWER' || user?.role === 'ADMIN');
  const reviewersQuery = useQuery<ReviewerItem[]>({
    queryKey: reviewersQueryKey,
    queryFn: () => listProjectReviewers(projectId),
    enabled:
      Boolean(projectId && projectQuery.data?.companyId && activeCompanyId) &&
      isOwner,
  });
  const availableReviewers = useMemo(() => {
    const allowedRoles = new Set(['REVIEWER', 'ADMIN']);
    return (reviewersQuery.data ?? []).filter((reviewer) =>
      allowedRoles.has(reviewer.role),
    );
  }, [reviewersQuery.data]);
  const availableApprovers = useMemo(() => {
    const allowedRoles = new Set(['APPROVER', 'ADMIN']);
    return (reviewersQuery.data ?? []).filter((reviewer) =>
      allowedRoles.has(reviewer.role),
    );
  }, [reviewersQuery.data]);
  const sidebarRef = useRef<HTMLDivElement | null>(null);

  const { control, register, handleSubmit, reset, setValue } =
    useForm<FormValues>();
  const [commentBody, setCommentBody] = useState('');
  const commentResolutionMutation = useMutation({
    mutationFn: (payload: {
      sectionId: string;
      commentId: string;
      resolved: boolean;
    }) =>
      setCommentResolution(
        projectId,
        payload.sectionId,
        payload.commentId,
        payload.resolved,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
    },
    onError: () => toast.error('Unable to update comment status'),
  });
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
  const [pendingSuggestionField, setPendingSuggestionField] = useState<
    string | null
  >(null);
  const formValues = useWatch({ control }) as FormValues;
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
  const [templateName, setTemplateName] = useState('');
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [approvalSignature, setApprovalSignature] = useState('');
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const sectionByName = useMemo(() => {
    const map = new Map<string, SectionWithMeta>();
    (sectionsQuery.data ?? []).forEach((section) =>
      map.set(section.name, section),
    );
    return map;
  }, [sectionsQuery.data]);

  const currentSection = sectionByName.get(activeStepId);
  const evidence = useProjectEvidence(
    projectId,
    token,
    currentSection,
    isOwner,
    canReviewEvidence,
    () => queryClient.invalidateQueries({ queryKey: sectionsQueryKey }),
  );
  const {
    artifactInputRef,
    artifactFile,
    artifactDescription,
    setArtifactDescription,
    artifactPurpose,
    setArtifactPurpose,
    artifactSource,
    setArtifactSource,
    artifactExpiresAt,
    setArtifactExpiresAt,
    artifactExternalUrl,
    setArtifactExternalUrl,
    artifactProvenanceNote,
    setArtifactProvenanceNote,
    clearArtifactSelection,
    artifactReviewDraft,
    reviewingArtifactId,
    reviewExpanded,
    setReviewExpanded,
    handleArtifactFileChange,
    handleArtifactUpload,
    handleArtifactDownload,
    handleArtifactDelete,
    handleArtifactReviewStatusChange,
    handleArtifactReviewCommentChange,
    handleArtifactReviewSubmit,
    artifactUploadMutation,
    artifactDeleteMutation,
    artifactReviewMutation,
  } = evidence;
  const {
    autosaveStatus,
    lastSavedAt,
    autosaveRecovery,
    dismissRecovery,
    restoreRecovery,
    markSaved,
  } = useProjectAutosave(currentSection, formValues, isFormStep);
  useEffect(() => {
    if (projectQuery.data?.reviewerId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedReviewerId(projectQuery.data.reviewerId);
      return;
    }
    if (availableReviewers.length) {
      setSelectedReviewerId((prev) => prev ?? availableReviewers[0].id);
    }
  }, [availableReviewers, projectQuery.data?.reviewerId]);
  useEffect(() => {
    if (projectQuery.data?.approverId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedApproverId(projectQuery.data.approverId);
      return;
    }
    if (availableApprovers.length) {
      setSelectedApproverId((prev) => prev ?? availableApprovers[0].id);
    }
  }, [availableApprovers, projectQuery.data?.approverId]);

  useEffect(() => {
    if (currentSection && activeStep.fields.length) {
      reset(currentSection.content ?? {});
    } else if (activeStep.fields.length) {
      reset({});
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCommentBody('');
    setAiFieldSuggestions({});
    setAiSuggestion(null);
  }, [currentSection, activeStep, reset]);

  const saveMutation = useMutation({
    mutationFn: (payload: { stepId: string; values: FormValues }) =>
      saveProjectSection(projectId, {
        name: payload.stepId,
        content: payload.values,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
      toast.success('Section saved');
      markSaved();
    },
    onError: () => {
      toast.error('Unable to save section');
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: (payload: {
      templateId: string;
      updates: { name?: string; category?: string; shared?: boolean };
    }) => updateTemplate(payload.templateId, payload.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', activeStepId] });
      toast.success('Template updated');
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) => deleteTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', activeStepId] });
      toast.success('Template deleted');
    },
  });

  const bulkTemplateMutation = useMutation({
    mutationFn: (payload: { templateIds: string[]; action: string }) =>
      bulkTemplateAction({
        templateIds: payload.templateIds,
        action: payload.action as 'share' | 'unshare' | 'delete',
      }),
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

  const commentMutation = useMutation({
    mutationFn: (payload: { sectionId: string; body: string; mentions?: string[] }) =>
      addSectionComment(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sectionsQueryKey });
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
    setTemplateName(`${activeStep.title} template`);
    setTemplateDialogOpen(true);
  };

  const submitTemplate = (event: React.FormEvent) => {
    event.preventDefault();
    const name = templateName.trim();
    if (!name || !currentSection) {
      toast.error('Enter a template name');
      return;
    }
    saveTemplateMutation.mutate(
      {
        name,
        content: currentSection.content ?? {},
      },
      {
        onSuccess: () => {
          setTemplateDialogOpen(false);
          setTemplateName('');
        },
      },
    );
  };

  const handleApplyTemplate = (template: TemplateItem) => {
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
    const currentValue = formValues[fieldName];
    const currentText =
      typeof currentValue === 'string'
        ? currentValue
        : String(currentValue ?? '');
    const appended =
      currentText.trim().length > 0
        ? `${currentText}\n${suggestion}`
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
    }) => sendSuggestionFeedback(payload),
  });

  const suggestionMutation = useMutation<
    SuggestionResponse,
    unknown,
    {
      hint?: string;
      partialContent?: FormValues;
      targetField?: string;
    }
  >({
    mutationFn: (payload) => suggestSection(projectId, activeStepId, payload),
    onSuccess: (data) => {
      const fieldTarget = suggestionFieldRef.current;
      suggestionFieldRef.current = null;
      setPendingSuggestionField(null);
      const resolvedText = fieldTarget
        ? (data.structuredContent?.[fieldTarget] ?? data.suggestion)
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
      setPendingSuggestionField(null);
    },
  });

  const requestFieldSuggestion = (fieldName?: string) => {
    if (!currentSection) return;
    const targetField = fieldName ?? activeField ?? undefined;
    suggestionFieldRef.current = targetField ?? null;
    setPendingSuggestionField(targetField ?? null);
    const snapshot: FormValues = {
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

  const saveTemplateMutation = useMutation({
    mutationFn: (payload: { name: string; content: FormValues }) =>
      createTemplate({
        name: payload.name,
        sectionName: activeStepId,
        content: payload.content,
      }),
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
      createProjectReminder(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remindersQueryKey });
      toast.success('Reminder scheduled');
    },
    onError: () => {
      toast.error('Unable to schedule reminder');
    },
  });

  const updateReminderMutation = useMutation({
    mutationFn: (payload: { id: string; completed: boolean }) =>
      updateProjectReminder(projectId, payload.id, {
        completed: payload.completed,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: remindersQueryKey });
    },
  });

  const handleReminderSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isOwner) {
      toast.error('Only the project owner can create reminders');
      return;
    }
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

  const workflowStatus = (projectQuery.data?.workflowStatus ??
    'DRAFT') as ProjectWorkflowStatus;
  const workflowVersion = projectQuery.data?.workflowVersion;
  const sendProjectForReview = () => {
    workflow.sendForReview();
    setReviewMessage('');
  };

  const approveProject = () => {
    if (!canApproveProject || !isPaidPlan || workflowStatus !== 'IN_REVIEW') {
      workflow.approveWithSignature('');
      return;
    }
    setApprovalSignature('');
    setApprovalDialogOpen(true);
  };

  const submitApproval = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = approvalSignature.trim();
    if (!isValidApprovalSignature(trimmed)) {
      toast.error('Signature is required for approval');
      return;
    }
    workflow.approveWithSignature(trimmed);
    setApprovalDialogOpen(false);
    setApprovalSignature('');
  };

  const requestChanges = () => {
    workflow.requestChanges();
  };

  const completedSteps = new Set(
    sectionsQuery.data?.map((section) => section.name) ?? [],
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
        status: sectionByName.get(stepId)?.workflowStatus ?? 'DRAFT',
      })),
    [trackableStepIds, stepTitleMap, incompleteFieldsByStep, sectionByName],
  );
  const allFieldsComplete = [...incompleteFieldsByStep.values()].every(
    (fields) => fields.length === 0,
  );
  const workflow = useProjectWorkflow({
    projectId,
    status: workflowStatus,
    version: workflowVersion,
    isPaidPlan,
    isOwner,
    canStartReview: canStartProjectReview,
    canApprove: canApproveProject,
    canRequestChanges: canRequestProjectChanges,
    allFieldsComplete,
    reviewerId: selectedReviewerId,
    approverId: selectedApproverId,
    reviewMessage,
    onPaywall: () => window.dispatchEvent(new Event('paywall')),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: projectQueryKey }),
  });
  const PROJECT_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Draft',
    INFORMATION_REQUIRED: 'Information required',
    COLLECTING_EVIDENCE: 'Collecting evidence',
    READY_FOR_REVIEW: 'Ready for review',
    IN_REVIEW: 'In review',
    CHANGES_REQUESTED: 'Changes requested',
    RESUBMITTED: 'Resubmitted',
    APPROVED: 'Approved',
    MONITORING: 'Monitoring',
    ARCHIVED: 'Archived',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  };
  const projectStatusLabel = workflowStatus;
  const projectStatusDisplay =
    PROJECT_STATUS_LABELS[projectStatusLabel] ?? projectStatusLabel;
  const sendForReviewLabel =
    workflowStatus === 'CHANGES_REQUESTED'
      ? 'Resubmit project'
      : workflowStatus === 'READY_FOR_REVIEW' ||
          workflowStatus === 'RESUBMITTED'
        ? 'Start review'
        : 'Send for review';
  const sendForReviewDisabled =
    !isPaidPlan ||
    (workflowStatus === 'READY_FOR_REVIEW' || workflowStatus === 'RESUBMITTED'
      ? !canStartProjectReview
      : workflowStatus === 'CHANGES_REQUESTED'
        ? !isOwner || !allFieldsComplete || !selectedReviewerId
        : !isOwner ||
          workflowStatus === 'IN_REVIEW' ||
          workflowStatus === 'APPROVED' ||
          workflowStatus === 'MONITORING' ||
          workflowStatus === 'ARCHIVED' ||
          workflowStatus === 'REJECTED' ||
          workflowStatus === 'CANCELLED' ||
          !selectedReviewerId ||
          !allFieldsComplete);
  const disableAssignmentFields =
    workflowStatus === 'READY_FOR_REVIEW' ||
    workflowStatus === 'RESUBMITTED' ||
    workflowStatus === 'IN_REVIEW' ||
    workflowStatus === 'APPROVED' ||
    workflowStatus === 'MONITORING' ||
    workflowStatus === 'ARCHIVED' ||
    workflowStatus === 'REJECTED' ||
    workflowStatus === 'CANCELLED';
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
  const riskEntries: RiskEntry[] = Array.isArray(riskSection?.content?.entries)
    ? (riskSection.content.entries as RiskEntry[])
    : Array.isArray(riskSection?.content?.risks)
      ? (riskSection.content.risks as RiskEntry[])
      : [];
  const riskSummaryText =
    typeof riskSection?.content?.risks === 'string'
      ? riskSection?.content?.risks
      : riskEntries.length
        ? (riskEntries[0].description ?? JSON.stringify(riskEntries[0]))
        : 'Document key risks to strengthen readiness.';
  const severityLevels = ['Low', 'Medium', 'High'];
  const likelihoodLevels = ['Low', 'Medium', 'High'];
  const riskHeatmap = severityLevels.map((severity) =>
    likelihoodLevels.map((likelihood) => {
      const matches = riskEntries.filter((entry) => {
        const entrySeverity = (entry.severity || entry.impact || '')
          .toString()
          .toLowerCase();
        const entryLikelihood = (entry.likelihood || '')
          .toString()
          .toLowerCase();
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
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return docs[0];
  }, [documentsQuery.data]);

  const liveStatusText =
    autosaveStatus === 'saving' ? 'Live Syncing' : 'Live Editing';
  const formatSavedLabel = () => {
    if (autosaveStatus === 'saving') return 'Saving...';
    if (lastSavedAt) {
      return `Saved ${new Date(lastSavedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    }
    return 'No autosave yet';
  };
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
      <div className="hz-project-page">
        <div id="overview" className="hz-project-summary mb-6">
          <ProjectPanel>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-slate-600">
                System workspace
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${liveStatusDotClass}`}
                />
                {liveStatusText}
              </span>
              <span className="text-[11px] text-slate-400">
                {liveStatusTimestamp}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <span>ID: {projectQuery.data?.id ?? '—'}</span>
              <span>
                Organization:{' '}
                {projectQuery.data?.companyId ?? 'Personal workspace'}
              </span>
              <span>Framework: EU AI Act</span>
              <span>
                Status:{' '}
                {(projectQuery.data?.workflowStatus ?? 'DRAFT').replaceAll(
                  '_',
                  ' ',
                )}
              </span>
              <span>
                Due:{' '}
                {projectQuery.data?.dueDate
                  ? new Date(projectQuery.data.dueDate).toLocaleDateString()
                  : 'Not set'}
              </span>
              <span>{Math.round(completionRate)}% complete</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Documentation readiness
                </p>
                <p className="text-xl font-semibold text-slate-900">
                  {Math.round(completionRate)}%
                </p>
                <p className="text-xs text-slate-500">
                  {completedCount} / {TRACKABLE_STEP_COUNT} control areas
                  complete
                </p>
              </div>
              {classificationQuery.data ? (
                <div className="sm:col-span-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-amber-900">
                      Preliminary classification
                    </p>
                    <span className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-amber-800">
                      Human review required
                    </span>
                  </div>
                  <p
                    id="classification"
                    className="mt-1 text-sm text-amber-800"
                  >
                    {classificationQuery.data.category.replaceAll('_', ' ')} ·
                    pack{' '}
                    {classificationQuery.data.regulatoryContentVersion ?? '—'}
                  </p>
                  {classificationQuery.data.resultSnapshot?.missing_information
                    ?.length ? (
                    <p className="mt-1 text-xs text-amber-700">
                      Missing:{' '}
                      {classificationQuery.data.resultSnapshot.missing_information.join(
                        ', ',
                      )}
                    </p>
                  ) : null}
                  {classificationQuery.data.reviewStatus === 'PENDING' &&
                  (isAssignedReviewer || isAssignedApprover || isAdmin) ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={classificationReviewMutation.isPending}
                        onClick={() =>
                          classificationReviewMutation.mutate({
                            status: 'REVIEWED',
                          })
                        }
                        className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Mark reviewed
                      </button>
                      <button
                        type="button"
                        disabled={classificationReviewMutation.isPending}
                        onClick={() => {
                          const category = window.prompt(
                            'Override category (for example: high_risk)',
                          );
                          if (!category?.trim()) return;
                          const reason = window.prompt('Reason for override');
                          if (!reason?.trim()) return;
                          classificationReviewMutation.mutate({
                            status: 'OVERRIDDEN',
                            overrideCategory: category.trim(),
                            reason: reason.trim(),
                          });
                        }}
                        className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-60"
                      >
                        Override result
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {obligationsQuery.data?.length ? (
                <div
                  id="requirements"
                  className="sm:col-span-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Requirements
                      </p>
                      <span className="text-xs text-slate-500">
                        {obligationsQuery.data.length} mapped from the latest
                        classification
                      </span>
                    </div>
                    <select
                      aria-label="Filter requirements"
                      value={obligationFilter}
                      onChange={(event) =>
                        setObligationFilter(event.target.value)
                      }
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                    >
                      <option value="ALL">All statuses</option>
                      <option value="NOT_STARTED">Not started</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="READY_FOR_REVIEW">Ready for review</option>
                      <option value="SATISFIED">Satisfied</option>
                    </select>
                  </div>
                  <ul className="mt-3 grid gap-2 md:grid-cols-2">
                    {visibleObligations.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-lg border border-slate-100 px-3 py-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {item.obligation.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.obligation.legalReference ??
                                'EU AI Act pack reference'}{' '}
                              · {item.status.replaceAll('_', ' ').toLowerCase()}
                              {item.actions.length
                                ? ` · ${item.actions.length} action${item.actions.length === 1 ? '' : 's'}`
                                : ''}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              Owner: {item.owner?.email ?? 'Unassigned'}
                              {item.dueAt
                                ? ` · Due ${new Date(item.dueAt).toLocaleDateString()}`
                                : ''}
                            </p>
                            {isOwner || canReviewEvidence ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                <select
                                  aria-label={`Priority for ${item.obligation.title}`}
                                  value={item.priority}
                                  onChange={(event) =>
                                    obligationUpdateMutation.mutate({
                                      obligationId: item.id,
                                      field: 'priority',
                                      value: event.target.value,
                                    })
                                  }
                                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                                >
                                  <option value="LOW">Low priority</option>
                                  <option value="MEDIUM">Medium priority</option>
                                  <option value="HIGH">High priority</option>
                                  <option value="CRITICAL">Critical priority</option>
                                </select>
                                <select
                                  aria-label={`Approval state for ${item.obligation.title}`}
                                  value={item.approvalState}
                                  onChange={(event) =>
                                    obligationUpdateMutation.mutate({
                                      obligationId: item.id,
                                      field: 'approvalState',
                                      value: event.target.value,
                                    })
                                  }
                                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                                >
                                  <option value="DRAFT">Draft</option>
                                  <option value="READY_FOR_REVIEW">Ready for review</option>
                                  <option value="APPROVED">Approved</option>
                                  <option value="CHANGES_REQUESTED">Changes requested</option>
                                </select>
                                <select
                                  aria-label={`Owner for ${item.obligation.title}`}
                                  value={item.owner?.id ?? ''}
                                  onChange={(event) =>
                                    event.target.value
                                      ? obligationUpdateMutation.mutate({
                                          obligationId: item.id,
                                          field: 'ownerId',
                                          value: event.target.value,
                                        })
                                      : undefined
                                  }
                                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                                >
                                  <option value="">Unassigned</option>
                                  {availableReviewers.map((reviewer) => (
                                    <option key={reviewer.id} value={reviewer.id}>
                                      {reviewer.email}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="date"
                                  aria-label={`Due date for ${item.obligation.title}`}
                                  value={item.dueAt ? item.dueAt.slice(0, 10) : ''}
                                  onChange={(event) =>
                                    obligationUpdateMutation.mutate({
                                      obligationId: item.id,
                                      field: 'dueAt',
                                      value: event.target.value,
                                    })
                                  }
                                  className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                                />
                              </div>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-xs font-medium text-slate-400">
                            {evidenceByObligation.get(item.id)?.length ?? 0}{' '}
                            linked
                          </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {(evidenceByObligation.get(item.id) ?? []).map(
                            (link) => (
                              <div
                                key={link.id}
                                className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600"
                              >
                                <span className="truncate">
                                  {link.artifact?.originalName ??
                                    DOCUMENT_LABELS[link.document?.type ?? ''] ??
                                    'Linked document'}
                                  {link.artifact
                                    ? ` · v${link.artifact.version}`
                                    : ''}
                                </span>
                                {isOwner || canReviewEvidence ? (
                                  <button
                                    type="button"
                                    className="shrink-0 font-semibold text-slate-500 hover:text-rose-600"
                                    onClick={() =>
                                      evidenceLinkMutation.mutate({
                                        action: 'unlink',
                                        obligationId: item.id,
                                        linkId: link.id,
                                      })
                                    }
                                  >
                                    Remove
                                  </button>
                                ) : null}
                              </div>
                            ),
                          )}
                        </div>
                        {isOwner || canReviewEvidence ? (
                          <select
                            aria-label={`Link evidence to ${item.obligation.title}`}
                            value=""
                            onChange={(event) => {
                              const selected = event.target.value;
                              if (!selected) return;
                              evidenceLinkMutation.mutate({
                                action: 'link',
                                obligationId: item.id,
                                ...(selected.startsWith('doc:')
                                  ? { documentId: selected.slice(4) }
                                  : { artifactId: selected }),
                              });
                            }}
                            className="mt-2 w-full rounded-md border border-dashed border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-500"
                            disabled={evidenceLinkMutation.isPending}
                          >
                            <option value="">Link evidence…</option>
                            {projectArtifacts
                              .filter(
                                (artifact) =>
                                  !(evidenceByObligation.get(item.id) ?? []).some(
                                    (link) => link.artifact?.id === artifact.id,
                                  ),
                              )
                              .map((artifact) => (
                                <option key={artifact.id} value={artifact.id}>
                                  {artifact.originalName} · {artifact.sectionName}
                                </option>
                              ))}
                            {(projectQuery.data?.documents ?? []).map((document) => (
                              <option key={`doc:${document.id}`} value={`doc:${document.id}`}>
                                {DOCUMENT_LABELS[document.type] ?? document.type} · package
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {!visibleObligations.length ? (
                    <p className="mt-3 text-sm text-slate-500">
                      No requirements match this filter.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div id="organization-profile">
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  System owner
                </p>
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
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  Next action
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {remindersQuery.data?.[0]?.message ?? 'No reminders'}
                </p>
                <p className="text-xs text-slate-500">
                  {remindersQuery.data?.[0]?.dueAt
                    ? new Date(
                        remindersQuery.data[0].dueAt,
                      ).toLocaleDateString()
                    : 'Set a reminder'}
                </p>
              </div>
            </div>
          </ProjectPanel>
        </div>
        <div className="hz-project-workspace grid gap-8 lg:grid-cols-[280px_1fr]">
          <div ref={sidebarRef}>
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
          </div>

          <section
            id="ai-system-profile"
            ref={wizardSectionRef}
            className="hz-project-content space-y-6"
          >
            <div className="flex justify-end lg:hidden">
              <button
                type="button"
                onClick={scrollToSections}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5">
                  <path
                    d="M12 5.25V18.75M12 5.25l-4 4m4-4l4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Back to sections
              </button>
            </div>
            <ProjectPanel>
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
                    {new Date(autosaveRecovery.updatedAt).toLocaleString()}{' '}
                    detected.
                  </p>
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => {
                        const content = restoreRecovery();
                        if (content) reset(content);
                      }}
                      className="rounded-md bg-amber-600 px-3 py-1 text-white"
                    >
                      Restore
                    </button>
                    <button
                      onClick={dismissRecovery}
                      className="text-amber-700 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-slate-400">{formatSavedLabel()}</p>

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
                              (tpl) => tpl.id === event.target.value,
                            );
                            if (selected) {
                              handleApplyTemplate(selected);
                            }
                          }}
                          className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                        >
                          <option value="">Select...</option>
                          {templatesQuery.data.map((tpl) => (
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
                    className="mt-6"
                    onSubmit={handleSubmit((values) =>
                      saveMutation.mutate({ stepId: activeStepId, values }),
                    )}
                  >
                    <fieldset className="space-y-4" disabled={!isOwner}>
                      {activeStep.fields.map((field) => (
                        <div key={field.name}>
                          <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                            <label
                              className="flex-1"
                              htmlFor={`field-${field.name}`}
                            >
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
                                  onClick={() =>
                                    handleApplyFieldSuggestion(field.name)
                                  }
                                  className="text-sky-600 hover:text-sky-500"
                                >
                                  Apply
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAppendFieldSuggestion(field.name)
                                  }
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
                                    <span className="flex-1 truncate">
                                      {item}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleApplyHistorySuggestion(
                                          field.name,
                                          item,
                                        )
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
                            pendingSuggestionField === field.name && (
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
                          {saveMutation.isPending
                            ? 'Saving...'
                            : 'Save Section'}
                        </button>
                      </div>
                    </fieldset>
                  </form>
                  <div
                    id="evidence"
                    className="mt-8 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          Evidence attachments
                        </h4>
                        <p className="text-xs text-slate-500">
                          Upload supporting policies, evaluations, or reports
                          that justify this section’s answers.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {currentSection?.artifacts?.length ? (
                          <span className="text-xs font-semibold text-slate-400">
                            {currentSection.artifacts.length} file
                            {currentSection.artifacts.length === 1 ? '' : 's'}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setManageModalOpen(true)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                          Manage templates
                        </button>
                      </div>
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
                              disabled={!isOwner}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                isOwner && artifactInputRef.current?.click()
                              }
                              disabled={!isOwner}
                              className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <span className="truncate text-slate-700">
                                {artifactFile
                                  ? artifactFile.name
                                  : 'Select a file to attach'}
                              </span>
                              <span className="text-xs text-slate-400">
                                {artifactFile
                                  ? formatFileSize(artifactFile.size)
                                  : ''}
                              </span>
                            </button>
                          </div>
                          <details className="md:col-span-2">
                            <summary className="cursor-pointer rounded-md border border-dashed border-slate-200 px-3 py-2 text-sm text-slate-500">
                              Add file details
                            </summary>
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <input
                                type="text"
                                value={artifactDescription}
                                onChange={(event) =>
                                  setArtifactDescription(event.target.value)
                                }
                                placeholder="Optional description"
                                disabled={!isOwner}
                                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
                              />
                              <select
                                value={artifactPurpose}
                                onChange={(e) =>
                                  setArtifactPurpose(
                                    e.target.value as
                                      'GENERIC' | 'DATASET' | 'MODEL',
                                  )
                                }
                                disabled={!isOwner}
                                className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none disabled:bg-slate-50"
                                title="Purpose"
                              >
                                <option value="GENERIC">Generic</option>
                                <option value="DATASET">Dataset</option>
                                <option value="MODEL">Model</option>
                              </select>
                              <input
                                type="text"
                                value={artifactSource}
                                onChange={(event) => setArtifactSource(event.target.value)}
                                placeholder="Source or system of record"
                                disabled={!isOwner}
                                className="rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                              />
                              <input
                                type="date"
                                value={artifactExpiresAt}
                                onChange={(event) => setArtifactExpiresAt(event.target.value)}
                                aria-label="Evidence expiry date"
                                disabled={!isOwner}
                                className="rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                              />
                              <input
                                type="url"
                                value={artifactExternalUrl}
                                onChange={(event) => setArtifactExternalUrl(event.target.value)}
                                placeholder="External evidence link"
                                disabled={!isOwner}
                                className="rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 sm:col-span-2"
                              />
                              <textarea
                                value={artifactProvenanceNote}
                                onChange={(event) => setArtifactProvenanceNote(event.target.value)}
                                placeholder="Provenance note"
                                rows={2}
                                disabled={!isOwner}
                                className="rounded-md border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 sm:col-span-2"
                              />
                            </div>
                          </details>
                          <div className="flex items-center justify-end gap-2">
                            {artifactFile ? (
                              <button
                                type="button"
                                onClick={clearArtifactSelection}
                                disabled={!isOwner}
                                className="text-xs font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                              >
                                Clear
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={handleArtifactUpload}
                              disabled={
                                !isOwner ||
                                artifactUploadMutation.isPending ||
                                !artifactFile
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
                            currentSection.artifacts.map(
                              (artifact: SectionArtifactItem) => {
                                const hasNewerVersion =
                                  currentSection.artifacts?.some(
                                    (other: SectionArtifactItem) =>
                                      other.version > artifact.version,
                                  ) ?? false;
                                const reviewDraft =
                                  artifactReviewDraft[artifact.id];
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
                                            {artifact.source
                                              ? ` · Source: ${artifact.source}`
                                              : ''}
                                            {artifact.expiresAt
                                              ? ` · Expires ${new Date(artifact.expiresAt).toLocaleDateString()}`
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
                                            {
                                              artifactStatusLabels[
                                                artifact.status
                                              ]
                                            }
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
                                            {
                                              artifact.previousArtifact
                                                .citationKey
                                            }
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
                                          Reviewed by{' '}
                                          {artifact.reviewedBy.email}
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
                                        onClick={() =>
                                          handleArtifactDownload(artifact)
                                        }
                                        className="rounded-md border border-slate-200 px-3 py-1 text-slate-700 hover:border-slate-300 hover:text-slate-900"
                                      >
                                        Download
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleArtifactDelete(artifact.id)
                                        }
                                        disabled={
                                          !isOwner ||
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
                                          {reviewExpanded[artifact.id]
                                            ? 'Hide review'
                                            : 'Review'}
                                        </button>
                                      ) : null}
                                    </div>
                                    {canReviewEvidence &&
                                    reviewExpanded[artifact.id] ? (
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
                                              reviewDraft?.status ??
                                              artifact.status
                                            }
                                            onChange={(event) =>
                                              handleArtifactReviewStatusChange(
                                                artifact.id,
                                                event.target
                                                  .value as ArtifactStatus,
                                              )
                                            }
                                            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
                                          >
                                            <option value="PENDING">
                                              Pending
                                            </option>
                                            <option value="APPROVED">
                                              Approved
                                            </option>
                                            <option value="REJECTED">
                                              Rejected
                                            </option>
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
                                              handleArtifactReviewSubmit(
                                                artifact.id,
                                              )
                                            }
                                            disabled={
                                              artifactReviewMutation.isPending &&
                                              reviewingArtifactId ===
                                                artifact.id
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
                                  </div>
                                );
                              },
                            )
                          ) : (
                            <p className="text-sm text-slate-500">
                              No evidence uploaded yet. Add policies, risk logs,
                              or evaluation files to keep auditors aligned.
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
                    <div
                      id="messages"
                      className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900">
                          Discussion
                        </h4>
                        <span className="text-xs text-slate-500">
                          {currentSection.comments.length} comments
                        </span>
                      </div>
                      <details className="rounded-xl border border-dashed border-slate-200 px-3 py-2">
                        <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Status history
                        </summary>
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
                      </details>
                      <div className="mt-4 space-y-3">
                        {currentSection.comments.length ? (
                          currentSection.comments.map(
                            (comment: SectionComment) => (
                              <div
                                key={comment.id}
                                className={`rounded-xl border bg-white p-3 text-sm ${comment.resolvedAt ? 'border-emerald-200 opacity-75' : 'border-slate-200'}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <p className={`text-slate-700 ${comment.resolvedAt ? 'line-through' : ''}`}>
                                    {comment.body}
                                  </p>
                                  {isOwner || canReviewEvidence ? (
                                    <button
                                      type="button"
                                      className="shrink-0 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                                      onClick={() =>
                                        commentResolutionMutation.mutate({
                                          sectionId: currentSection.id,
                                          commentId: comment.id,
                                          resolved: !comment.resolvedAt,
                                        })
                                      }
                                    >
                                      {comment.resolvedAt ? 'Reopen' : 'Resolve'}
                                    </button>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">
                                  {comment.author?.email ?? 'Unknown'} ·{' '}
                                  {new Date(comment.createdAt).toLocaleString(
                                    undefined,
                                    {
                                      dateStyle: 'short',
                                      timeStyle: 'short',
                                    },
                                  )}
                                  {comment.resolvedAt ? ' · Resolved' : ''}
                                </p>
                              </div>
                            ),
                          )
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
                            mentions: Array.from(
                              commentBody.matchAll(/@([\w.+-]+@[\w.-]+)/g),
                            ).map((match) => match[1]),
                          });
                        }}
                      >
                        <textarea
                          value={commentBody}
                          onChange={(event) =>
                            setCommentBody(event.target.value)
                          }
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
                <div id="review-approval" className="mt-6 space-y-4">
                  <ReviewApprovalPanel
                    trackableSteps={trackableStepSummaries}
                    projectStatusLabel={projectStatusLabel}
                    projectStatusDisplay={projectStatusDisplay}
                    onSendForReview={sendProjectForReview}
                    sendForReviewLabel={sendForReviewLabel}
                    onApprove={approveProject}
                    onRequestChanges={requestChanges}
                    reviewerId={selectedReviewerId}
                    approverId={selectedApproverId}
                    onReviewerChange={(value) =>
                      setSelectedReviewerId(value || null)
                    }
                    onApproverChange={(value) =>
                      setSelectedApproverId(value || null)
                    }
                    reviewMessage={reviewMessage}
                    setReviewMessage={setReviewMessage}
                    reviewers={reviewersQuery.data ?? []}
                    availableReviewers={availableReviewers}
                    canAssignSelf={canAssignSelf}
                    canSendForReview={isOwner || canStartProjectReview}
                    sendForReviewDisabled={sendForReviewDisabled}
                    canApprove={canApproveProject && isPaidPlan}
                    canRequestChanges={canRequestProjectChanges && isPaidPlan}
                    disableAssignmentFields={disableAssignmentFields}
                    userId={user?.id}
                  />
                  <details className="rounded-2xl border border-slate-200 bg-white p-4" open>
                    <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                      Project audit history
                    </summary>
                    <div className="mt-3 space-y-2">
                      {projectQuery.data?.statusEvents?.length ? (
                        projectQuery.data.statusEvents.map((event) => (
                          <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                            <span>
                              <strong className="text-slate-800">{PROJECT_STATUS_LABELS[event.status] ?? event.status}</strong>
                              {event.actor?.email ? ` · ${event.actor.email}` : ''}
                              {event.note ? ` · ${event.note}` : ''}
                              {event.signature ? ` · Signed: ${event.signature}` : ''}
                            </span>
                            <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString()}</time>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No project status changes recorded yet.</p>
                      )}
                    </div>
                  </details>
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
                          Select which deliverables to create (
                          {selectedDocumentTypes.length}/
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
                            } ${!isOwner ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              disabled={!isOwner}
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
                  {readinessQuery.data ? (
                    <div
                      className={`rounded-2xl border p-4 ${
                        readinessQuery.data.status === 'ready'
                          ? 'border-emerald-200 bg-emerald-50'
                          : readinessQuery.data.status === 'partial'
                            ? 'border-amber-200 bg-amber-50'
                            : 'border-rose-200 bg-rose-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Documentation readiness: {readinessQuery.data.score}
                            %
                          </p>
                          <p className="mt-1 text-sm text-slate-700">
                            {readinessQuery.data.summary}
                          </p>
                        </div>
                        <span className="rounded-full border border-current/10 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                          {readinessQuery.data.status}
                        </span>
                      </div>
                      {readinessQuery.data.missingCriticalFields.length ? (
                        <p className="mt-3 text-xs text-slate-600">
                          Missing critical fields:{' '}
                          {readinessQuery.data.missingCriticalFields.join(', ')}
                        </p>
                      ) : null}
                      {readinessQuery.data.weakSections.length ? (
                        <p className="mt-2 text-xs text-slate-600">
                          Weak sections:{' '}
                          {readinessQuery.data.weakSections.join(', ')}
                        </p>
                      ) : null}
                      {readinessQuery.data.status === 'partial' ? (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                          Generation is allowed, but the output will be treated
                          as a draft with a readiness notice.
                        </p>
                      ) : null}
                      {readinessQuery.data.status === 'insufficient' ? (
                        <p className="mt-2 text-xs font-medium text-rose-700">
                          Full document generation is blocked until the missing
                          critical fields are filled in.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  <button
                    onClick={handleGenerateClick}
                    disabled={
                      !isOwner ||
                      generateMutation.isPending ||
                      !selectedDocumentTypes.length ||
                      readinessQuery.data?.status === 'insufficient'
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
                      {getApiErrorMessage(generateMutation.error) ??
                        'Unable to generate documents. Ensure each section has been saved and try again.'}
                    </p>
                  )}
                  {planQuery.data &&
                    usageQuery.data &&
                    docLimit !== Number.MAX_SAFE_INTEGER && (
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        Plan allowance: {docLimit} docs/month · Used {docsUsed}{' '}
                        · Remaining {docsRemaining}. Select that many or fewer
                        to generate.
                      </p>
                    )}
                </div>
              )}
            </ProjectPanel>

            <ProjectPanel>
              <div id="documents" className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">
                  Deliverables
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
                        documentsGrouping.versions.get(latest.id) ??
                        docs.length;
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
                              onClick={() =>
                                handleDownload(latest.id, latest.type)
                              }
                              disabled={downloadingId === latest.id}
                              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                            >
                              {downloadingId === latest.id
                                ? 'Downloading...'
                                : 'Download'}
                            </button>
                          </div>
                          {previous.length > 0 && (
                            <details className="mt-4 border-t border-slate-100 pt-4">
                              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Version history ({previous.length})
                              </summary>
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
                                        {new Date(
                                          doc.createdAt,
                                        ).toLocaleDateString()}{' '}
                                        {new Date(
                                          doc.createdAt,
                                        ).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                      <button
                                        onClick={() =>
                                          handleDownload(doc.id, doc.type)
                                        }
                                        className="text-sky-600 hover:text-sky-500"
                                      >
                                        Download
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            </details>
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
            </ProjectPanel>

            <details className="rounded-2xl border border-slate-200 bg-white px-6 py-4">
              <summary className="cursor-pointer text-lg font-semibold text-slate-900">
                Project intelligence
              </summary>
              <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <ProjectPanel>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Insights
                  </h3>
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
                            {new Date(latestDoc.createdAt).toLocaleString(
                              undefined,
                              {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              },
                            )}
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
                </ProjectPanel>

                <ProjectPanel>
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
                              {new Date(event.timestamp).toLocaleString(
                                undefined,
                                {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                },
                              )}
                              {event.meta ? ` · ${event.meta}` : ''}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No activity yet. Save a section or generate documents to
                        see timeline updates.
                      </p>
                    )}
                  </div>
                </ProjectPanel>
                <ProjectPanel>
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
                                      {cell.items
                                        .slice(0, 2)
                                        .map((item, idx) => (
                                          <li
                                            key={idx}
                                            className="rounded bg-rose-50 px-2 py-1 text-[11px] text-rose-700"
                                          >
                                            {item.description ||
                                              item.risk ||
                                              'Risk'}
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
                      Provide structured risk entries (severity & likelihood) to
                      see this visualization.
                    </p>
                  )}
                </ProjectPanel>
              </div>
            </details>

            <details className="rounded-2xl border border-slate-200 bg-white px-6 py-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                Reminders
              </summary>
              <ProjectPanel className="mt-4">
                <div className="flex items-center justify-end">
                  <button
                    onClick={() => remindersQuery.refetch()}
                    className="text-sm font-medium text-sky-600 hover:text-sky-500"
                  >
                    Refresh
                  </button>
                </div>
                <form
                  className="mt-4 grid gap-3 md:grid-cols-[2fr_1fr_auto]"
                  onSubmit={handleReminderSubmit}
                >
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
                    remindersQuery.data.map((reminder) => (
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
                            {new Date(reminder.dueAt).toLocaleString(
                              undefined,
                              {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              },
                            )}
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
                      No reminders yet. Schedule nudges to keep the project on
                      track.
                    </p>
                  )}
                </div>
              </ProjectPanel>
            </details>
          </section>
        </div>
        {templateDialogOpen && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setTemplateDialogOpen(false);
              }
            }}
          >
            <form
              onSubmit={submitTemplate}
              role="dialog"
              aria-modal="true"
              aria-labelledby="template-dialog-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h2
                id="template-dialog-title"
                className="text-lg font-semibold text-slate-900"
              >
                Save as template
              </h2>
              <label
                htmlFor="template-name"
                className="mt-4 block text-sm font-medium text-slate-700"
              >
                Template name
              </label>
              <input
                id="template-name"
                autoFocus
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateDialogOpen(false)}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveTemplateMutation.isPending}
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saveTemplateMutation.isPending
                    ? 'Saving...'
                    : 'Save template'}
                </button>
              </div>
            </form>
          </div>
        )}
        {approvalDialogOpen && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setApprovalDialogOpen(false);
              }
            }}
          >
            <form
              onSubmit={submitApproval}
              role="dialog"
              aria-modal="true"
              aria-labelledby="approval-dialog-title"
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            >
              <h2
                id="approval-dialog-title"
                className="text-lg font-semibold text-slate-900"
              >
                Approve project
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter your signature to record this approval.
              </p>
              <label
                htmlFor="approval-signature"
                className="mt-4 block text-sm font-medium text-slate-700"
              >
                Signature
              </label>
              <input
                id="approval-signature"
                autoFocus
                value={approvalSignature}
                onChange={(event) => setApprovalSignature(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setApprovalDialogOpen(false)}
                  className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={workflow.isPending}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {workflow.isPending ? 'Approving...' : 'Approve project'}
                </button>
              </div>
            </form>
          </div>
        )}
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
      </div>
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        title={
          previewDoc
            ? (DOCUMENT_LABELS[previewDoc.type] ?? 'Document preview')
            : 'Document preview'
        }
        url={previewUrl}
        isLoading={previewLoading}
        onClose={closePreview}
      />
    </AppShell>
  );
}
