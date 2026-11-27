export type RequirementMetadataValue = {
  key?: string;
  catalogueId?: string;
  legalReference?: string | null;
  aiActArticle?: string | null;
  trustworthinessPrinciple?: string | null;
  architectureElements?: unknown;
  verificationMethod?: string | null;
};

export function RequirementMetadata({
  requirement,
  className = '',
}: {
  requirement: RequirementMetadataValue;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-slate-500">
        {requirement.catalogueId ??
          requirement.key ??
          'Catalogue ID unavailable'}{' '}
        ·{' '}
        {requirement.aiActArticle ??
          requirement.legalReference ??
          'AI Act article not specified'}
      </p>
      <dl className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-slate-700">
            Trustworthiness principle
          </dt>
          <dd>{formatPrinciple(requirement.trustworthinessPrinciple)}</dd>
        </div>
        <div>
          <dt className="font-semibold text-slate-700">Verification method</dt>
          <dd>{requirement.verificationMethod ?? 'Not specified'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="font-semibold text-slate-700">
            Architecture elements
          </dt>
          <dd>
            {formatArchitectureElements(requirement.architectureElements)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function formatPrinciple(value?: string | null) {
  return value
    ? value
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : 'Not specified';
}

function formatArchitectureElements(value: unknown) {
  return Array.isArray(value) && value.length
    ? value
        .filter((item): item is string => typeof item === 'string')
        .join(' · ')
    : 'Not specified';
}
