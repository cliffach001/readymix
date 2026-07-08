import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  // Define how likely traces are recorded (1.0 = 100%)
  tracesSampleRate: 0.1,
  // Only enable Sentry in production
  enabled: process.env.NODE_ENV === "production",
});
