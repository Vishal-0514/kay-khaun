import * as Sentry from '@sentry/react-native';

// Crash and error reports (Sentry). Off unless EXPO_PUBLIC_SENTRY_DSN is set,
// and never while developing. Reports carry the app version and what went
// wrong — no chat text, photos, location or account details.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
export const sentryOn = Boolean(dsn) && !__DEV__;

if (sentryOn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeBreadcrumb(crumb) {
      // Network breadcrumbs can carry URLs with search words; keep only the path.
      if (crumb.category === 'xhr' || crumb.category === 'fetch') {
        const url = String(crumb.data?.url ?? '');
        crumb.data = { ...crumb.data, url: url.split('?')[0] };
      }
      return crumb;
    },
  });
}

// Wraps the root screen so crashes are caught (does nothing when Sentry is off).
export const withSentry = (Component) => (sentryOn ? Sentry.wrap(Component) : Component);
