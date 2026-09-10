import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/platform/api/client';
import type {
  BillingPlan,
  BillingUsage,
  GenerationReadiness,
} from '@complianx/contracts/ai-systems';
import {
  DEFAULT_DOCUMENT_SELECTION,
  DOCUMENT_GENERATION_OPTIONS,
} from '../constants/documents';
import {
  generateProjectDocuments,
  getBillingPlan,
  getBillingUsage,
} from '../api';
import { selectDocumentTypesForCredits } from '../lib/project-page-logic';

type DocumentItem = { id: string; type: string };

export function useProjectDocuments(
  projectId: string,
  token: string | undefined,
  isOwner: boolean,
  monetizationEnabled: boolean,
  readiness?: GenerationReadiness,
  onDocumentsChanged?: () => void,
) {
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState<string[]>(
    () => [...DEFAULT_DOCUMENT_SELECTION],
  );
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRequestRef = useRef(0);
  const previewUrlRef = useRef<string | null>(null);
  const planQuery = useQuery<BillingPlan>({
    queryKey: ['billing', 'plan'],
    queryFn: getBillingPlan,
  });
  const usageQuery = useQuery<BillingUsage>({
    queryKey: ['billing', 'usage'],
    queryFn: getBillingUsage,
  });
  const docLimit = !monetizationEnabled
    ? Number.MAX_SAFE_INTEGER
    : (planQuery.data?.limits?.docs ?? Number.MAX_SAFE_INTEGER);
  const docsUsed = usageQuery.data?.docsGenerated ?? 0;
  const docsRemaining =
    docLimit === Number.MAX_SAFE_INTEGER
      ? Number.MAX_SAFE_INTEGER
      : Math.max(0, docLimit - docsUsed);
  const isPaidPlan =
    !monetizationEnabled || (planQuery.data?.plan ?? 'FREE') !== 'FREE';
  const generateMutation = useMutation({
    mutationFn: (documentTypes: string[]) =>
      generateProjectDocuments(projectId, { documentTypes }),
    onSuccess: () => {
      onDocumentsChanged?.();
      toast.success('Compliance documents are being prepared');
    },
    onError: () => toast.error('Failed to trigger document generation'),
  });

  useEffect(() => {
    if (
      !monetizationEnabled ||
      !planQuery.data ||
      !usageQuery.data ||
      docLimit === Number.MAX_SAFE_INTEGER ||
      docsRemaining <= 0
    )
      return;
    if (selectedDocumentTypes.length > docsRemaining) {
      const nextSelection = selectDocumentTypesForCredits(
        DOCUMENT_GENERATION_OPTIONS,
        docsRemaining,
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDocumentTypes(nextSelection);
      toast(
        `You can generate up to ${docsRemaining} document${docsRemaining === 1 ? '' : 's'} with your current plan this month.`,
      );
    }
  }, [
    docLimit,
    docsRemaining,
    monetizationEnabled,
    planQuery.data,
    selectedDocumentTypes.length,
    usageQuery.data,
  ]);

  const handleGenerateClick = () => {
    if (!isOwner)
      return void toast.error(
        'Only the project owner can generate documentation',
      );
    if (!selectedDocumentTypes.length)
      return void toast.error(
        'Select at least one framework before generating',
      );
    if (readiness?.status === 'insufficient')
      return void toast.error(
        'Add the missing project information before generating documentation.',
      );
    if (
      monetizationEnabled &&
      docLimit !== Number.MAX_SAFE_INTEGER &&
      docsRemaining <= 0
    ) {
      window.dispatchEvent(new Event('paywall'));
      return void toast.error(
        'You have reached your document limit. Upgrade to generate more.',
      );
    }
    if (
      monetizationEnabled &&
      docLimit !== Number.MAX_SAFE_INTEGER &&
      selectedDocumentTypes.length > docsRemaining
    ) {
      window.dispatchEvent(new Event('paywall'));
      return void toast.error(
        `You can generate ${docsRemaining || 0} more document${docsRemaining === 1 ? '' : 's'} this month. Upgrade for more.`,
      );
    }
    generateMutation.mutate(selectedDocumentTypes);
  };
  const fetchBlob = async (docId: string) => {
    if (!token) throw new Error('Not authenticated');
    const response = await fetch(
      `${api.defaults.baseURL}/documents/${docId}/download`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error('Unable to download document');
    return response.blob();
  };
  const handleDownload = async (docId: string, type: string) => {
    try {
      setDownloadingId(docId);
      const url = URL.createObjectURL(await fetchBlob(docId));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to download document',
      );
    } finally {
      setDownloadingId(null);
    }
  };
  const handlePreview = async (doc: DocumentItem) => {
    const requestId = ++previewRequestRef.current;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewDoc(doc);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const url = URL.createObjectURL(await fetchBlob(doc.id));
      if (requestId !== previewRequestRef.current)
        return void URL.revokeObjectURL(url);
      previewUrlRef.current = url;
      setPreviewUrl(url);
    } catch (error) {
      if (requestId === previewRequestRef.current) {
        toast.error(
          error instanceof Error ? error.message : 'Unable to load preview',
        );
        setPreviewDoc(null);
      }
    } finally {
      if (requestId === previewRequestRef.current) setPreviewLoading(false);
    }
  };
  const handleZipDownload = async () => {
    if (!token) return void toast.error('Not authenticated');
    try {
      const response = await fetch(
        `${api.defaults.baseURL}/projects/${projectId}/documents.zip`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error();
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `project-${projectId}-documents.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success('ZIP download started');
    } catch {
      toast.error('Unable to download ZIP');
    }
  };
  const closePreview = () => {
    previewRequestRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewDoc(null);
    setPreviewUrl(null);
    setPreviewLoading(false);
  };
  useEffect(
    () => () => {
      previewRequestRef.current += 1;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  const selectionIsDefault =
    DEFAULT_DOCUMENT_SELECTION.every((type) =>
      selectedDocumentTypes.includes(type),
    ) && selectedDocumentTypes.length === DEFAULT_DOCUMENT_SELECTION.length;
  return {
    planQuery,
    usageQuery,
    selectedDocumentTypes,
    selectionIsDefault,
    toggleDocumentType: (type: string) =>
      setSelectedDocumentTypes((prev) =>
        prev.includes(type)
          ? prev.filter((item) => item !== type)
          : DOCUMENT_GENERATION_OPTIONS.map((option) => option.type).filter(
              (item) => new Set([...prev, type]).has(item),
            ),
      ),
    resetDocumentSelections: () =>
      setSelectedDocumentTypes([...DEFAULT_DOCUMENT_SELECTION]),
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
  };
}
