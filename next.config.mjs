import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withSentryConfig(nextConfig, {
  // Sentry upload configuration (production only)
  org: process.env.SENTRY_ORG || "",
  project: process.env.SENTRY_PROJECT || "rm-pocket",
  authToken: process.env.SENTRY_AUTH_TOKEN || "",
  silent: true, // Mutes verbose logs during build
  hideSourceMaps: true, // Hide source maps from production build
  automaticVercelMonitors: true, // Auto-instrument Vercel Crons with Sentry
});
