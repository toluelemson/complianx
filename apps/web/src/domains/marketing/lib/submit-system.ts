export type SubmitSystemSource =
  | 'hero'
  | 'navbar'
  | 'site_header'
  | 'cta_section'
  | 'trial_modal_video'
  | 'trial_modal_exit'
  | 'trial_modal_scroll'
  | 'pricing_starter'
  | 'pricing_professional'
  | 'pricing_enterprise'
  | 'pricing_saas'
  | 'done_for_you'
  | 'checker_skip'
  | 'checker_result';

export type SubmitSystemPackageInterest =
  | 'starter'
  | 'professional'
  | 'enterprise'
  | 'not_sure';

type BuildSubmitSystemHrefOptions = {
  packageInterest?: SubmitSystemPackageInterest;
  source: SubmitSystemSource;
};

export function buildSubmitSystemHref({
  packageInterest,
  source,
}: BuildSubmitSystemHrefOptions) {
  const params = new URLSearchParams({ source });

  if (packageInterest) {
    params.set('package', packageInterest);
  }

  return `/submit-system?${params.toString()}`;
}

export function buildPlanSignupHref(plan: 'pro' | 'enterprise') {
  return `/signup?plan=${plan}`;
}
