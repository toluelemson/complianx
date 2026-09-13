import { isAxiosError } from 'axios';

export interface PackageReadinessFailure {
  message: string;
  gaps: string[];
}

export interface PackageGapAction {
  label: string;
  to: string;
}

export function getPackageReadinessFailure(
  error: unknown,
): PackageReadinessFailure {
  if (isAxiosError<{ message?: string | string[]; gaps?: unknown }>(error)) {
    const response = error.response?.data;
    const messages = Array.isArray(response?.message)
      ? response.message
      : response?.message
        ? [response.message]
        : [];

    return {
      message: messages[0] ?? error.message ?? 'Unable to finalize package',
      gaps: Array.isArray(response?.gaps)
        ? response.gaps.filter((gap): gap is string => typeof gap === 'string')
        : [],
    };
  }

  return {
    message:
      error instanceof Error ? error.message : 'Unable to finalize package',
    gaps: [],
  };
}

export function getPackageGapAction(
  projectId: string,
  gap: string,
): PackageGapAction {
  const normalizedGap = gap.toLowerCase();

  if (normalizedGap.includes('classification')) {
    return {
      label: 'Review classification',
      to: `/projects/${projectId}/classification`,
    };
  }
  if (
    normalizedGap.includes('project approval') ||
    normalizedGap.includes('signed human approval')
  ) {
    return {
      label: 'Open approval',
      to: `/projects/${projectId}/review-approval`,
    };
  }
  if (
    normalizedGap.includes('obligation') ||
    normalizedGap.includes('requirement')
  ) {
    return {
      label: 'Open requirements',
      to: `/projects/${projectId}/requirements`,
    };
  }
  if (normalizedGap.includes('evidence')) {
    return {
      label: 'Manage evidence',
      to: `/projects/${projectId}/evidence`,
    };
  }
  if (normalizedGap.includes('document')) {
    return {
      label: 'Review documents',
      to: `/projects/${projectId}/compliance-package#package-documents`,
    };
  }
  if (normalizedGap.includes('finding')) {
    return {
      label: 'Open findings',
      to: `/projects/${projectId}/findings`,
    };
  }

  return {
    label: 'Review project',
    to: `/projects/${projectId}`,
  };
}
