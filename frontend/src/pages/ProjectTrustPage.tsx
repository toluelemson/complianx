import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../api/client';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../context/AuthContext';
import { STEP_CONFIG } from '../constants/steps';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

type SectionSummary = {
  id: string;
  name: string;
  updatedAt: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED';
};

type ArtifactPurpose = 'GENERIC' | 'DATASET' | 'MODEL';

const METRIC_STATUS_STYLES: Record<string, string> = {
  OK: 'bg-emerald-100 text-emerald-800',
  WARN: 'bg-amber-100 text-amber-700',
  ALERT: 'bg-rose-100 text-rose-700',
  'N/A': 'bg-slate-100 text-slate-600',
};

export default function ProjectTrustPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canApprove = user?.role === 'REVIEWER' || user?.role === 'ADMIN';

  const projectQuery = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`).then((res) => res.data),
    enabled: Boolean(projectId),
  });

  const sectionsQuery = useQuery<SectionSummary[]>({
    queryKey: ['sections', projectId],
    queryFn: () =>
      api.get(`/projects/${projectId}/sections`).then((res) => res.data),
    enabled: Boolean(projectId),
  });

  const trustMetricsQuery = useQuery({
    queryKey: ['trustMetrics', projectId],
    enabled: Boolean(projectId),
    queryFn: () =>
      api.get(`/projects/${projectId}/metrics`).then((res) => res.data),
  });

  const fairnessMetrics = useMemo(
    () =>
      (trustMetricsQuery.data ?? []).filter(
        (metric: any) => (metric.pillar || '').toLowerCase() === 'fairness',
      ),
    [trustMetricsQuery.data],
  );
  const robustnessMetrics = useMemo(
    () =>
      (trustMetricsQuery.data ?? []).filter(
        (metric: any) => (metric.pillar || '').toLowerCase() === 'robustness',
      ),
    [trustMetricsQuery.data],
  );
  const driftMetrics = useMemo(
    () =>
      (trustMetricsQuery.data ?? []).filter((metric: any) => {
        const pillar = (metric.pillar || '').toLowerCase();
        const name = (metric.name || '').toLowerCase();
        return (
          pillar === 'drift' ||
          name.includes('psi') ||
          name.includes('kl') ||
          name.includes('calibration')
        );
      }),
    [trustMetricsQuery.data],
  );
  const animatedMetricCount = useAnimatedNumber(trustMetricsQuery.data?.length ?? 0, {
    duration: 800,
  });

  const [fairnessDataset, setFairnessDataset] = useState('Primary training set');
  const [fairnessModel, setFairnessModel] = useState('Core LLM');
  const [fairnessSampleValue, setFairnessSampleValue] = useState('0.05');
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRobustnessPanel, setShowRobustnessPanel] = useState(false);
  const [showDriftPanel, setShowDriftPanel] = useState(false);
  const [showCohortPanel, setShowCohortPanel] = useState(false);
  const datasetFileInputRef = useRef<HTMLInputElement | null>(null);
  const modelFileInputRef = useRef<HTMLInputElement | null>(null);
  const robustDatasetFileInputRef = useRef<HTMLInputElement | null>(null);
  const [robustDatasetFile, setRobustDatasetFile] = useState<File | null>(null);
  const [robustPredBase, setRobustPredBase] = useState('y_pred');
  const [robustPredPert, setRobustPredPert] = useState('y_pred_perturbed');
  const [robustScoreCol, setRobustScoreCol] = useState('y_score');
  const driftBaselineFileInputRef = useRef<HTMLInputElement | null>(null);
  const driftCurrentFileInputRef = useRef<HTMLInputElement | null>(null);
  const [driftBaselineFile, setDriftBaselineFile] = useState<File | null>(null);
  const [driftCurrentFile, setDriftCurrentFile] = useState<File | null>(null);
  const [driftColumnsText, setDriftColumnsText] = useState('');
  const [driftYTrueCol, setDriftYTrueCol] = useState('y_true');
  const [driftYScoreCol, setDriftYScoreCol] = useState('y_score');
  const cohortDatasetFileInputRef = useRef<HTMLInputElement | null>(null);
  const [cohortDatasetFile, setCohortDatasetFile] = useState<File | null>(null);
  const [cohortSensitiveCol, setCohortSensitiveCol] = useState('sensitive_attribute');
  const [cohortYTrueCol, setCohortYTrueCol] = useState('y_true');
  const [cohortYPredCol, setCohortYPredCol] = useState('y_pred');
  const [cohortAName, setCohortAName] = useState('Segment A');
  const [cohortAColumn, setCohortAColumn] = useState('group');
  const [cohortAValues, setCohortAValues] = useState('GroupA');
  const [cohortBName, setCohortBName] = useState('Segment B');
  const [cohortBColumn, setCohortBColumn] = useState('group');
  const [cohortBValues, setCohortBValues] = useState('GroupB');
  const [cohortResults, setCohortResults] = useState<any[] | null>(null);
  const [attachmentSectionId, setAttachmentSectionId] = useState<string>('');

  useEffect(() => {
    if (!attachmentSectionId && sectionsQuery.data?.length) {
      setAttachmentSectionId(sectionsQuery.data[0].id);
    }
  }, [attachmentSectionId, sectionsQuery.data]);

  useEffect(() => {
    if (trustMetricsQuery.data?.length) {
      setSelectedMetricId(trustMetricsQuery.data[0].id);
    }
  }, [trustMetricsQuery.data]);

  const createFairnessMetricMutation = useMutation({
    mutationFn: () =>
      api
        .post(`/projects/${projectId}/metrics`, {
          name: 'Fairness gap',
          pillar: 'Fairness',
          unit: 'gap %',
          targetMax: 0.05,
          datasetName: fairnessDataset,
          modelName: fairnessModel,
        })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustMetrics', projectId] });
      toast.success('Fairness metric created');
    },
    onError: () => {
      toast.error('Unable to create metric');
    },
  });

  const submitFairnessSampleMutation = useMutation({
    mutationFn: (value: number) =>
      api
        .post(
          `/metrics/${selectedMetricId}/samples`,
          {
            value,
            note: `Fairness gap recorded for ${fairnessDataset} @ ${fairnessModel}`,
          },
          { timeout: 10000 },
        )
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustMetrics', projectId] });
      toast.success('Fairness sample recorded');
    },
    onError: () => {
      toast.error('Failed to record sample');
    },
  });

  const analyzeFairnessMutation = useMutation({
    mutationFn: async (payload: {
      datasetArtifactId: string;
      modelArtifactId?: string;
    }) => {
      return api
        .post(`/trust/fairness/analyze`, {
          projectId,
          datasetArtifactId: payload.datasetArtifactId,
          modelArtifactId: payload.modelArtifactId,
        })
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustMetrics', projectId] });
      toast.success('Fairness analysis complete');
    },
    onError: () => {
      toast.error('Fairness analysis failed');
    },
  });

  const analyzeRobustnessMutation = useMutation({
    mutationFn: async (payload: {
      datasetArtifactId: string;
      columns: { y_pred_baseline?: string; y_pred_perturbed?: string; y_score?: string };
    }) => {
      return api
        .post(`/trust/robustness/analyze`, {
          projectId,
          datasetArtifactId: payload.datasetArtifactId,
          columns: payload.columns,
        })
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustMetrics', projectId] });
      toast.success('Robustness analysis complete');
    },
    onError: () => toast.error('Robustness analysis failed'),
  });

  const analyzeDriftMutation = useMutation({
    mutationFn: async (payload: {
      baselineArtifactId: string;
      currentArtifactId: string;
      columns?: string[];
      targets?: { y_true?: string; y_score?: string };
    }) => {
      return api
        .post(`/trust/drift/analyze`, {
          projectId,
          baselineArtifactId: payload.baselineArtifactId,
          currentArtifactId: payload.currentArtifactId,
          columns: payload.columns,
          targets: payload.targets,
        })
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustMetrics', projectId] });
      toast.success('Drift analysis complete');
    },
    onError: () => toast.error('Drift analysis failed'),
  });

  const analyzeCohortMutation = useMutation({
    mutationFn: async (payload: {
      datasetArtifactId: string;
      columns?: { sensitive_attribute?: string; y_true?: string; y_pred?: string };
      segments: Array<{ name: string; filter: { column: string; values: (string | number)[] } }>;
    }) => {
      return api
        .post(`/trust/fairness/segments`, {
          projectId,
          datasetArtifactId: payload.datasetArtifactId,
          columns: payload.columns,
          segments: payload.segments,
        })
        .then((res) => res.data);
    },
    onSuccess: (data) => {
      setCohortResults(data?.results ?? null);
      toast.success('Cohort analysis complete');
    },
    onError: () => toast.error('Cohort analysis failed'),
  });

  const deleteMetricMutation = useMutation({
    mutationFn: (metricId: string) =>
      api
        .delete(`/projects/${projectId}/metrics/${metricId}`)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustMetrics', projectId] });
      toast.success('Metric deleted');
    },
    onError: () => toast.error('Unable to delete metric'),
  });

  const deleteSampleMutation = useMutation({
    mutationFn: (sampleId: string) =>
      api.delete(`/samples/${sampleId}`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trustMetrics', projectId] });
      toast.success('Sample deleted');
    },
    onError: () => toast.error('Unable to delete sample'),
  });

  const uploadArtifact = async (
    file: File,
    description: string,
    purpose: ArtifactPurpose,
  ) => {
    if (!projectId) {
      throw new Error('Missing project');
    }
    if (!attachmentSectionId) {
      toast.error('Select a section to attach evidence');
      throw new Error('Missing section');
    }
    const fd = new FormData();
    fd.append('file', file);
    fd.append('description', description);
    fd.append('purpose', purpose);
    const response = await api.post(
      `/projects/${projectId}/sections/${attachmentSectionId}/artifacts`,
      fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  };

  const handleManualSampleSubmit = () => {
    if (!selectedMetricId) {
      toast.error('Create a metric first');
      return;
    }
    const numeric = Number(fairnessSampleValue);
    if (Number.isNaN(numeric)) {
      toast.error('Enter a numeric value');
      return;
    }
    submitFairnessSampleMutation.mutate(numeric);
  };

  const handleFairnessAnalysis = async () => {
    if (!datasetFile) {
      toast.error('Upload a dataset CSV');
      return;
    }
    try {
      const datasetArtifact = await uploadArtifact(
        datasetFile,
        `Dataset for ${fairnessDataset}`,
        'DATASET',
      );
      let modelArtifactId: string | undefined;
      if (modelFile) {
        const modelArtifact = await uploadArtifact(
          modelFile,
          `Model for ${fairnessModel}`,
          'MODEL',
        );
        modelArtifactId = modelArtifact.id;
      }
      analyzeFairnessMutation.mutate({
        datasetArtifactId: datasetArtifact.id,
        modelArtifactId,
      });
      setDatasetFile(null);
      setModelFile(null);
      if (datasetFileInputRef.current) {
        datasetFileInputRef.current.value = '';
      }
      if (modelFileInputRef.current) {
        modelFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to upload evidence for fairness analysis');
    }
  };

  const handleRobustnessAnalysis = async () => {
    if (!robustDatasetFile) {
      toast.error('Upload a dataset CSV');
      return;
    }
    try {
      const datasetArtifact = await uploadArtifact(
        robustDatasetFile,
        'Robustness dataset',
        'DATASET',
      );
      analyzeRobustnessMutation.mutate({
        datasetArtifactId: datasetArtifact.id,
        columns: {
          y_pred_baseline: robustPredBase || undefined,
          y_pred_perturbed: robustPredPert || undefined,
          y_score: robustScoreCol || undefined,
        },
      });
      setRobustDatasetFile(null);
      if (robustDatasetFileInputRef.current) {
        robustDatasetFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to upload dataset for robustness analysis');
    }
  };

  const handleDriftAnalysis = async () => {
    if (!driftBaselineFile || !driftCurrentFile) {
      toast.error('Upload both baseline and current CSVs');
      return;
    }
    try {
      const baselineArtifact = await uploadArtifact(
        driftBaselineFile,
        'Baseline dataset',
        'DATASET',
      );
      const currentArtifact = await uploadArtifact(
        driftCurrentFile,
        'Current dataset',
        'DATASET',
      );
      const cols = driftColumnsText
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      analyzeDriftMutation.mutate({
        baselineArtifactId: baselineArtifact.id,
        currentArtifactId: currentArtifact.id,
        columns: cols.length ? cols : undefined,
        targets: {
          y_true: driftYTrueCol || undefined,
          y_score: driftYScoreCol || undefined,
        },
      });
      setDriftBaselineFile(null);
      setDriftCurrentFile(null);
      if (driftBaselineFileInputRef.current) {
        driftBaselineFileInputRef.current.value = '';
      }
      if (driftCurrentFileInputRef.current) {
        driftCurrentFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to upload datasets for drift analysis');
    }
  };

  const handleCohortAnalysis = async () => {
    if (!cohortDatasetFile) {
      toast.error('Upload a dataset CSV');
      return;
    }
    try {
      const datasetArtifact = await uploadArtifact(
        cohortDatasetFile,
        'Cohort dataset',
        'DATASET',
      );
      const segments = [
        {
          name: cohortAName || 'Segment A',
          filter: {
            column: cohortAColumn || 'group',
            values: cohortAValues.split(',').map((value) => value.trim()).filter(Boolean),
          },
        },
        {
          name: cohortBName || 'Segment B',
          filter: {
            column: cohortBColumn || 'group',
            values: cohortBValues.split(',').map((value) => value.trim()).filter(Boolean),
          },
        },
      ];
      analyzeCohortMutation.mutate({
        datasetArtifactId: datasetArtifact.id,
        columns: {
          sensitive_attribute: cohortSensitiveCol || undefined,
          y_true: cohortYTrueCol || undefined,
          y_pred: cohortYPredCol || undefined,
        },
        segments,
      });
      setCohortDatasetFile(null);
      if (cohortDatasetFileInputRef.current) {
        cohortDatasetFileInputRef.current.value = '';
      }
    } catch (error) {
      console.error(error);
      toast.error('Unable to upload dataset for cohort analysis');
    }
  };

  if (!projectId) {
    navigate('/dashboard');
    return null;
  }

  const sectionTitleMap = useMemo(() => {
    const map = new Map<string, string>();
    STEP_CONFIG.forEach((step) => map.set(step.id, step.title));
    return map;
  }, []);

  const attachmentSection = sectionsQuery.data?.find(
    (section) => section.id === attachmentSectionId,
  );

  return (
    <AppShell
      title={
        projectQuery.data?.name
          ? `${projectQuery.data.name} · Trust Monitoring`
          : 'Trust Monitoring'
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">
            Monitor fairness, robustness, and drift independently from document
            generation. Upload evidence to any saved section for traceability.
          </p>
          {attachmentSection ? (
            <p className="text-xs text-slate-400">
              Evidence will be attached to{' '}
              {sectionTitleMap.get(attachmentSection.name) ??
                attachmentSection.name}
              .
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/projects/${projectId}`}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Back to DocGen
          </Link>
          <button
            onClick={() => trustMetricsQuery.refetch()}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Refresh metrics
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Trust metrics
              </h3>
              <span className="text-xs text-slate-400">
                {animatedMetricCount} total
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {trustMetricsQuery.isLoading ? (
                <p className="text-sm text-slate-500">Loading metrics...</p>
              ) : trustMetricsQuery.data?.length ? (
                trustMetricsQuery.data.map((metric: any) => (
                  <MetricCard
                    key={metric.id}
                    metric={metric}
                    onDeleteMetric={() => deleteMetricMutation.mutate(metric.id)}
                    onDeleteSample={(sampleId) => deleteSampleMutation.mutate(sampleId)}
                    disableMetricActions={deleteMetricMutation.isPending}
                    disableSampleActions={deleteSampleMutation.isPending}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  No trust metrics yet. Create one to start tracking.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Fairness controls
              </h3>
              <button
                type="button"
                onClick={() => setShowAdvanced((value) => !value)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {showAdvanced ? 'Hide manual input' : 'Manual sample'}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Dataset name
                </label>
                <input
                  value={fairnessDataset}
                  onChange={(event) => setFairnessDataset(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="Dataset label"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Model name
                </label>
                <input
                  value={fairnessModel}
                  onChange={(event) => setFairnessModel(event.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  placeholder="Model label"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Dataset CSV
                </label>
                <input
                  ref={datasetFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) =>
                    setDatasetFile(event.target.files?.[0] ?? null)
                  }
                  className="mt-1 text-xs text-slate-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500">
                  Model artifact (optional)
                </label>
                <input
                  ref={modelFileInputRef}
                  type="file"
                  onChange={(event) =>
                    setModelFile(event.target.files?.[0] ?? null)
                  }
                  className="mt-1 text-xs text-slate-600"
                />
              </div>
            </div>
            {showAdvanced && (
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <div>
                  <label className="text-xs font-semibold text-slate-500">
                    Select metric
                  </label>
                  <select
                    value={selectedMetricId ?? ''}
                    onChange={(event) =>
                      setSelectedMetricId(
                        event.target.value ? event.target.value : null,
                      )
                    }
                    className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Select metric</option>
                    {trustMetricsQuery.data?.map((metric: any) => (
                      <option key={metric.id} value={metric.id}>
                        {metric.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={fairnessSampleValue}
                    onChange={(event) =>
                      setFairnessSampleValue(event.target.value)
                    }
                    className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="Manual fairness gap"
                  />
                  <button
                    type="button"
                    onClick={handleManualSampleSubmit}
                    disabled={
                      submitFairnessSampleMutation.isPending ||
                      !fairnessSampleValue
                    }
                    className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {submitFairnessSampleMutation.isPending
                      ? 'Saving...'
                      : 'Submit'}
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => createFairnessMetricMutation.mutate()}
                disabled={createFairnessMetricMutation.isPending}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {createFairnessMetricMutation.isPending
                  ? 'Creating...'
                  : 'Create metric'}
              </button>
              <button
                type="button"
                onClick={handleFairnessAnalysis}
                disabled={analyzeFairnessMutation.isPending}
                className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
              >
                {analyzeFairnessMutation.isPending
                  ? 'Analyzing...'
                  : 'Run fairness analysis'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = !showRobustnessPanel;
                  setShowRobustnessPanel(next);
                  if (next) {
                    setShowDriftPanel(false);
                    setShowCohortPanel(false);
                  }
                }}
                className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50"
              >
                {showRobustnessPanel ? 'Hide robustness' : 'Robustness analyzer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !showDriftPanel;
                  setShowDriftPanel(next);
                  if (next) {
                    setShowRobustnessPanel(false);
                    setShowCohortPanel(false);
                  }
                }}
                className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50"
              >
                {showDriftPanel ? 'Hide drift' : 'Drift analyzer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !showCohortPanel;
                  setShowCohortPanel(next);
                  if (next) {
                    setShowRobustnessPanel(false);
                    setShowDriftPanel(false);
                  }
                }}
                className="rounded-full border border-slate-200 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 hover:bg-slate-50"
              >
                {showCohortPanel ? 'Hide cohorts' : 'Cohort analyzer'}
              </button>
            </div>

            {showRobustnessPanel && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">
                      Dataset CSV
                    </label>
                    <input
                      ref={robustDatasetFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) =>
                        setRobustDatasetFile(event.target.files?.[0] ?? null)
                      }
                      className="mt-1 text-xs text-slate-600"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={robustPredBase}
                      onChange={(event) => setRobustPredBase(event.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="y_pred"
                    />
                    <input
                      value={robustPredPert}
                      onChange={(event) => setRobustPredPert(event.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="y_pred_perturbed"
                    />
                    <input
                      value={robustScoreCol}
                      onChange={(event) => setRobustScoreCol(event.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="y_score"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRobustnessAnalysis}
                  disabled={analyzeRobustnessMutation.isPending}
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  {analyzeRobustnessMutation.isPending
                    ? 'Analyzing...'
                    : 'Run robustness analysis'}
                </button>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">
                    Latest robustness metrics
                  </p>
                  {robustnessMetrics.length ? (
                    robustnessMetrics.map((metric: any) => {
                      const latestSample = metric.samples[0];
                      const animatedSampleValue = useAnimatedNumber(
                        latestSample?.value ?? 0,
                        { duration: 700, precision: 2 },
                      );
                      const sampleStatus = latestSample?.status ?? 'N/A';
                      const statusStyle =
                        METRIC_STATUS_STYLES[sampleStatus] ??
                        METRIC_STATUS_STYLES['N/A'];
                      return (
                        <div
                          key={metric.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {metric.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {latestSample
                                ? `Latest ${animatedSampleValue.toFixed(2)} (${latestSample.note ?? 'no note'})`
                                : 'No samples yet'}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}
                          >
                            {sampleStatus}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500">
                      No robustness metrics yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {showDriftPanel && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">
                      Baseline dataset
                    </label>
                    <input
                      ref={driftBaselineFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) =>
                        setDriftBaselineFile(event.target.files?.[0] ?? null)
                      }
                      className="mt-1 text-xs text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">
                      Current dataset
                    </label>
                    <input
                      ref={driftCurrentFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) =>
                        setDriftCurrentFile(event.target.files?.[0] ?? null)
                      }
                      className="mt-1 text-xs text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">
                      Numeric columns (optional)
                    </label>
                    <input
                      value={driftColumnsText}
                      onChange={(event) => setDriftColumnsText(event.target.value)}
                      className="mt-1 w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="feature1,feature2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={driftYTrueCol}
                      onChange={(event) => setDriftYTrueCol(event.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="y_true"
                    />
                    <input
                      value={driftYScoreCol}
                      onChange={(event) => setDriftYScoreCol(event.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="y_score"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDriftAnalysis}
                  disabled={analyzeDriftMutation.isPending}
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  {analyzeDriftMutation.isPending
                    ? 'Analyzing...'
                    : 'Run drift analysis'}
                </button>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-500">
                    Latest drift & calibration metrics
                  </p>
                  {driftMetrics.length ? (
                    driftMetrics.map((metric: any) => {
                      const latestSample = metric.samples[0];
                      const animatedSampleValue = useAnimatedNumber(
                        latestSample?.value ?? 0,
                        { duration: 700, precision: 2 },
                      );
                      const sampleStatus = latestSample?.status ?? 'N/A';
                      const statusStyle =
                        METRIC_STATUS_STYLES[sampleStatus] ??
                        METRIC_STATUS_STYLES['N/A'];
                      return (
                        <div
                          key={metric.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {metric.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {latestSample
                                ? `Latest ${animatedSampleValue.toFixed(2)} (${latestSample.note ?? 'no note'})`
                                : 'No samples yet'}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusStyle}`}
                          >
                            {sampleStatus}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-500">
                      No drift/calibration metrics yet.
                    </p>
                  )}
                </div>
              </div>
            )}

            {showCohortPanel && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">
                      Dataset CSV
                    </label>
                    <input
                      ref={cohortDatasetFileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(event) =>
                        setCohortDatasetFile(event.target.files?.[0] ?? null)
                      }
                      className="mt-1 text-xs text-slate-600"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      value={cohortSensitiveCol}
                      onChange={(event) =>
                        setCohortSensitiveCol(event.target.value)
                      }
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="sensitive_attribute"
                    />
                    <input
                      value={cohortYTrueCol}
                      onChange={(event) => setCohortYTrueCol(event.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="y_true"
                    />
                    <input
                      value={cohortYPredCol}
                      onChange={(event) => setCohortYPredCol(event.target.value)}
                      className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="y_pred"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Segment A
                    </p>
                    <input
                      value={cohortAName}
                      onChange={(event) => setCohortAName(event.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="Segment name"
                    />
                    <input
                      value={cohortAColumn}
                      onChange={(event) => setCohortAColumn(event.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="Filter column"
                    />
                    <input
                      value={cohortAValues}
                      onChange={(event) => setCohortAValues(event.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="ValueA,ValueB"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Segment B
                    </p>
                    <input
                      value={cohortBName}
                      onChange={(event) => setCohortBName(event.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="Segment name"
                    />
                    <input
                      value={cohortBColumn}
                      onChange={(event) => setCohortBColumn(event.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="Filter column"
                    />
                    <input
                      value={cohortBValues}
                      onChange={(event) => setCohortBValues(event.target.value)}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs"
                      placeholder="ValueA,ValueB"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCohortAnalysis}
                  disabled={analyzeCohortMutation.isPending}
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-60"
                >
                  {analyzeCohortMutation.isPending
                    ? 'Analyzing...'
                    : 'Run cohort analysis'}
                </button>
                {cohortResults && cohortResults.length ? (
                  <div className="overflow-auto">
                    <table className="w-full border-collapse text-xs">
                      <thead>
                        <tr>
                          <th className="border border-slate-200 px-2 py-1 text-left">
                            Segment
                          </th>
                          <th className="border border-slate-200 px-2 py-1 text-left">
                            Rows
                          </th>
                          <th className="border border-slate-200 px-2 py-1 text-left">
                            Fairness gap
                          </th>
                          <th className="border border-slate-200 px-2 py-1 text-left">
                            Disparate impact
                          </th>
                          <th className="border border-slate-200 px-2 py-1 text-left">
                            EO gap
                          </th>
                          <th className="border border-slate-200 px-2 py-1 text-left">
                            Equalized odds
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cohortResults.map((row: any, idx: number) => (
                          <tr key={idx}>
                            <td className="border border-slate-200 px-2 py-1">
                              {row.segment}
                            </td>
                            <td className="border border-slate-200 px-2 py-1">
                              {row.counts}
                            </td>
                            <td className="border border-slate-200 px-2 py-1">
                              {(row.fairnessGap ?? 0).toFixed(3)}
                            </td>
                            <td className="border border-slate-200 px-2 py-1">
                              {row.disparateImpact != null
                                ? row.disparateImpact.toFixed(3)
                                : '—'}
                            </td>
                            <td className="border border-slate-200 px-2 py-1">
                              {row.equalOpportunityGap != null
                                ? row.equalOpportunityGap.toFixed(3)
                                : '—'}
                            </td>
                            <td className="border border-slate-200 px-2 py-1">
                              {row.equalizedOddsGap != null
                                ? row.equalizedOddsGap.toFixed(3)
                                : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs uppercase tracking-wide text-slate-400">
              Project status
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {projectQuery.data?.status ?? '—'}
            </p>
            <p className="text-xs text-slate-500">
              Updated{' '}
              {projectQuery.data?.updatedAt
                ? new Date(projectQuery.data.updatedAt).toLocaleString(
                    undefined,
                    {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    },
                  )
                : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Evidence destination
              </p>
              <p className="text-xs text-slate-500">
                Choose where uploaded datasets and models should be saved for
                traceable trust analyses.
              </p>
            </div>
            <select
              value={attachmentSectionId}
              onChange={(event) => setAttachmentSectionId(event.target.value)}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              {sectionsQuery.data?.length ? (
                sectionsQuery.data.map((section) => (
                  <option key={section.id} value={section.id}>
                    {sectionTitleMap.get(section.name) ?? section.name} ·{' '}
                    {section.status}
                  </option>
                ))
              ) : (
                <option value="">No sections saved yet</option>
              )}
            </select>
            {!sectionsQuery.data?.length && (
              <p className="text-xs text-rose-500">
                Save at least one section from the DocGen workspace to store
                trust evidence.
              </p>
            )}
            {attachmentSection && (
              <p className="text-xs text-slate-500">
                Last updated{' '}
                {new Date(attachmentSection.updatedAt).toLocaleString(
                  undefined,
                  { dateStyle: 'medium', timeStyle: 'short' },
                )}
                .
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-900">
              Need approvals?
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Reviewers ({canApprove ? 'you have' : 'requires reviewer role'})
              can sign off on section status changes in the DocGen workspace.
            </p>
            <Link
              to={`/projects/${projectId}`}
              className="mt-3 inline-flex items-center justify-center rounded-md border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage documentation →
            </Link>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

type MetricCardProps = {
  metric: any;
  onDeleteMetric: () => void;
  onDeleteSample: (sampleId: string) => void;
  disableMetricActions: boolean;
  disableSampleActions: boolean;
};

function MetricCard({
  metric,
  onDeleteMetric,
  onDeleteSample,
  disableMetricActions,
  disableSampleActions,
}: MetricCardProps) {
  const latestSample = metric.samples?.[0];
  const sampleStatus = latestSample?.status ?? 'N/A';
  const statusStyle =
    METRIC_STATUS_STYLES[sampleStatus] ?? METRIC_STATUS_STYLES['N/A'];
  const animatedSampleValue = useAnimatedNumber(latestSample?.value ?? 0, {
    duration: 700,
    precision: 2,
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{metric.name}</p>
          <p className="text-xs text-slate-500">
            {metric.pillar} · {metric.unit} ·{' '}
            {metric.datasetName ?? 'Unnamed dataset'}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusStyle}`}
        >
          {sampleStatus}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {latestSample
          ? `Latest ${animatedSampleValue.toFixed(2)} (${latestSample.note ?? 'no note'})`
          : 'No samples yet. Add one below.'}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600">
        <button
          type="button"
          onClick={() => {
            if (latestSample && window.confirm('Delete the latest sample?')) {
              onDeleteSample(latestSample.id);
            }
          }}
          disabled={!latestSample || disableSampleActions}
          className="rounded border border-slate-200 px-2 py-0.5 hover:bg-slate-100 disabled:opacity-50"
        >
          Delete latest sample
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              window.confirm('Delete this metric and all associated samples?')
            ) {
              onDeleteMetric();
            }
          }}
          disabled={disableMetricActions}
          className="rounded border border-rose-200 px-2 py-0.5 text-rose-600 hover:bg-rose-50 disabled:opacity-60"
        >
          Delete metric
        </button>
      </div>
    </div>
  );
}
