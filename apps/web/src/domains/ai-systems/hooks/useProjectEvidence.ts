import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '@/platform/api/client';
import type {
  ArtifactStatus,
  SectionArtifactItem,
  SectionWithMeta,
} from '@complianx/contracts/ai-systems';
import { deleteArtifact, reviewArtifact, uploadArtifact } from '../api';

type EvidencePurpose = 'GENERIC' | 'DATASET' | 'MODEL';

export function useProjectEvidence(
  projectId: string,
  token: string | undefined,
  currentSection: SectionWithMeta | undefined,
  isOwner: boolean,
  canReviewEvidence: boolean,
  onSectionsChanged: () => void,
) {
  const artifactInputRef = useRef<HTMLInputElement | null>(null);
  const [artifactFile, setArtifactFile] = useState<File | null>(null);
  const [artifactDescription, setArtifactDescription] = useState('');
  const [artifactPurpose, setArtifactPurpose] =
    useState<EvidencePurpose>('GENERIC');
  const [artifactReviewDraft, setArtifactReviewDraft] = useState<
    Record<string, { status: ArtifactStatus; comment: string }>
  >({});
  const [reviewingArtifactId, setReviewingArtifactId] = useState<string | null>(
    null,
  );
  const [reviewExpanded, setReviewExpanded] = useState<Record<string, boolean>>(
    {},
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArtifactFile(null);
    setArtifactDescription('');
    setArtifactPurpose('GENERIC');
    if (artifactInputRef.current) artifactInputRef.current.value = '';
    const nextDraft: Record<
      string,
      { status: ArtifactStatus; comment: string }
    > = {};
    (currentSection?.artifacts ?? []).forEach(
      (artifact: SectionArtifactItem) => {
        nextDraft[artifact.id] = {
          status: artifact.status,
          comment: artifact.reviewComment ?? '',
        };
      },
    );
    setArtifactReviewDraft(nextDraft);
  }, [currentSection?.artifacts]);

  const uploadMutation = useMutation({
    mutationFn: (payload: {
      sectionId: string;
      file: File;
      description?: string;
      purpose?: EvidencePurpose;
    }) => uploadArtifact(projectId, payload),
    onSuccess: () => {
      onSectionsChanged();
      setArtifactFile(null);
      setArtifactDescription('');
      setArtifactPurpose('GENERIC');
      if (artifactInputRef.current) artifactInputRef.current.value = '';
      toast.success('Evidence uploaded');
    },
    onError: () => toast.error('Unable to upload evidence'),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteArtifact,
    onSuccess: () => {
      onSectionsChanged();
      toast.success('Evidence removed');
    },
    onError: () => toast.error('Unable to remove evidence'),
  });
  const reviewMutation = useMutation({
    mutationFn: reviewArtifact,
    onSuccess: () => {
      onSectionsChanged();
      toast.success('Evidence review updated');
    },
    onError: () => toast.error('Unable to update review'),
    onSettled: () => setReviewingArtifactId(null),
  });

  const handleArtifactFileChange = (event: ChangeEvent<HTMLInputElement>) =>
    setArtifactFile(event.target.files?.[0] ?? null);
  const handleArtifactDownload = async (artifact: SectionArtifactItem) => {
    try {
      if (!token) throw new Error('Not authenticated');
      const response = await fetch(
        `${api.defaults.baseURL}/artifacts/${artifact.id}/download`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!response.ok) throw new Error('Request failed');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = artifact.originalName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Unable to download evidence');
    }
  };
  const clearArtifactSelection = () => {
    setArtifactFile(null);
    if (artifactInputRef.current) artifactInputRef.current.value = '';
  };
  const handleArtifactUpload = () => {
    if (!isOwner)
      return void toast.error('Only the project owner can upload evidence');
    if (!currentSection)
      return void toast.error('Save this section before attaching evidence');
    if (!artifactFile) return void toast.error('Select a file to upload');
    uploadMutation.mutate({
      sectionId: currentSection.id,
      file: artifactFile,
      description: artifactDescription.trim() || undefined,
      purpose: artifactPurpose,
    });
  };
  const handleArtifactDelete = (artifactId: string) => {
    if (!isOwner)
      return void toast.error('Only the project owner can remove evidence');
    deleteMutation.mutate(artifactId);
  };
  const handleArtifactReviewStatusChange = (
    artifactId: string,
    status: ArtifactStatus,
  ) => {
    const artifact = currentSection?.artifacts?.find(
      (item) => item.id === artifactId,
    );
    setArtifactReviewDraft((prev) => ({
      ...prev,
      [artifactId]: {
        status,
        comment: prev[artifactId]?.comment ?? artifact?.reviewComment ?? '',
      },
    }));
  };
  const handleArtifactReviewCommentChange = (
    artifactId: string,
    comment: string,
  ) => {
    const artifact = currentSection?.artifacts?.find(
      (item) => item.id === artifactId,
    );
    setArtifactReviewDraft((prev) => ({
      ...prev,
      [artifactId]: {
        status: prev[artifactId]?.status ?? artifact?.status ?? 'PENDING',
        comment,
      },
    }));
  };
  const handleArtifactReviewSubmit = (artifactId: string) => {
    if (!canReviewEvidence)
      return void toast.error(
        'Only assigned reviewers or approvers can review evidence',
      );
    const draft = artifactReviewDraft[artifactId];
    if (!draft) return;
    setReviewingArtifactId(artifactId);
    reviewMutation.mutate({
      artifactId,
      status: draft.status,
      comment: draft.comment.trim() || undefined,
    });
  };

  return {
    artifactInputRef,
    artifactFile,
    artifactDescription,
    setArtifactDescription,
    artifactPurpose,
    setArtifactPurpose,
    artifactReviewDraft,
    reviewingArtifactId,
    reviewExpanded,
    setReviewExpanded,
    handleArtifactFileChange,
    clearArtifactSelection,
    handleArtifactUpload,
    handleArtifactDownload,
    handleArtifactDelete,
    handleArtifactReviewStatusChange,
    handleArtifactReviewCommentChange,
    handleArtifactReviewSubmit,
    artifactUploadMutation: uploadMutation,
    artifactDeleteMutation: deleteMutation,
    artifactReviewMutation: reviewMutation,
  };
}
