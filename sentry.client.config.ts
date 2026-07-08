import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Change the sample rate to adjust the percentage of sessions that are recorded
  replaysSessionSampleRate: 0.1,
  // The sample rate for replay recordings that are created when an error occurs
  replaysOnErrorSampleRate: 1.0,

  // Define how likely traces are from frontend to backend (1.0 = 100%)
  tracesSampleRate: 0.1,

  // Only enable Sentry in production
  enabled: process.env.NODE_ENV === "production",
});
