export type SectionSummary = {
  id: string;
  name: string;
  updatedAt: string;
  workflowStatus:
    | 'DRAFT'
    | 'COMPLETE'
    | 'IN_REVIEW'
    | 'CHANGES_REQUESTED'
    | 'APPROVED';
};

export type TrustProjectDetail = {
  id: string;
  name: string;
  updatedAt: string;
  workflowStatus?: string;
  viewerRole?: 'OWNER' | 'REVIEWER' | 'APPROVER' | 'MEMBER';
};

export type TrustMetricSample = {
  id: string;
  value: number;
  status?: string | null;
  note?: string | null;
  timestamp?: string;
  createdAt?: string;
};

export type TrustMetric = {
  id: string;
  name: string;
  pillar?: string | null;
  unit?: string | null;
  datasetName?: string | null;
  modelName?: string | null;
  targetMin?: number | null;
  targetMax?: number | null;
  sectionId?: string | null;
  samples: TrustMetricSample[];
};

export type CohortResult = {
  segment: string;
  counts: number;
  fairnessGap?: number | null;
  disparateImpact?: number | null;
  equalOpportunityGap?: number | null;
  equalizedOddsGap?: number | null;
};

export type TrustCohortAnalysisResponse = {
  dataset: string;
  results: CohortResult[];
};
