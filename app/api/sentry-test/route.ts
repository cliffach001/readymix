import { NextResponse } from "next/server";

/**
 * GET /api/sentry-test
 * Test endpoint untuk verifikasi Sentry Error Tracking.
 * Akan melemparkan error jika ?error=true
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shouldThrow = searchParams.get("error") === "true";

  if (shouldThrow) {
    throw new Error("🔴 [TEST] Sentry Error — Ini hanya test untuk verifikasi tracking");
  }

  return NextResponse.json({
    ok: true,
    sentry: "active",
    env: process.env.NODE_ENV,
    tip: "Untuk test error, kunjungi /api/sentry-test?error=true",
  });
}
