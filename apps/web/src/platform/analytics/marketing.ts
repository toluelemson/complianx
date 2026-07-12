type MarketingEventPayload = Record<string, string | number | boolean | null | undefined>;

type AnalyticsWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
  gtag?: (
    command: 'event',
    eventName: string,
    params?: Record<string, unknown>,
  ) => void;
};

export function trackMarketingEvent(
  eventName: string,
  payload: MarketingEventPayload = {},
) {
  if (typeof window === 'undefined') {
    return;
  }

  const analyticsWindow = window as AnalyticsWindow;

  analyticsWindow.dataLayer?.push({
    event: eventName,
    ...payload,
  });

  analyticsWindow.gtag?.('event', eventName, payload);

  window.dispatchEvent(
    new CustomEvent('marketing:track', {
      detail: { eventName, payload },
    }),
  );
}
