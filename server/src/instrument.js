import 'dotenv/config';
import * as Sentry from '@sentry/node';

// Crash and error reports (Sentry). Loaded before anything else so it can see
// every request. Off unless SENTRY_DSN is set. Reports never include request
// bodies (chat text, photos), cookies or sign-in tokens.
export const sentryOn = Boolean(process.env.SENTRY_DSN);

if (sentryOn) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    release: process.env.RENDER_GIT_COMMIT || undefined,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
      }
      return event;
    },
  });
}

export { Sentry };
