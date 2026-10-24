const GTAG_ID: string | undefined = import.meta.env.VITE_GTAG_ID;

/** Analytics only runs in production builds that were given an id (the Pages workflow passes one). */
export const ANALYTICS_ENABLED = import.meta.env.PROD && Boolean(GTAG_ID);

type Gtag = (...args: unknown[]) => void;

export function startAnalytics(): void {
  if (!ANALYTICS_ENABLED || !GTAG_ID) return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GTAG_ID)}`;
  document.head.appendChild(script);
  const layer: unknown[] = ((window as unknown as { dataLayer?: unknown[] }).dataLayer ??= []);
  // gtag.js reads the arguments object itself, not an array copy, so this must stay a function.
  const gtag: Gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    layer.push(arguments);
  };
  gtag('js', new Date());
  gtag('config', GTAG_ID);
}
