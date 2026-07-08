import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/unsubscribe
 * Menghapus subscription push notification dari Supabase
 * Rate limit: 10 request per menit per IP
 */
export async function POST(request: Request) {
  // --- Rate Limiting ---
  const clientIp = getClientIp(request);
  const limitInfo = rateLimit(`unsubscribe:${clientIp}`, 10, 60 * 1000);

  if (!limitInfo.success) {
    return NextResponse.json(
      {
        error: "Terlalu banyak permintaan, coba lagi nanti",
        limit: limitInfo.limit,
        remaining: limitInfo.remaining,
        resetAt: limitInfo.resetAt,
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint tidak ditemukan" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    const { error } = await (supabase
      .from("push_subscriptions") as any)
      .delete()
      .eq("endpoint", endpoint);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    logger.error("Gagal unsubscribe notifikasi", { tag: "Unsubscribe" });
    return NextResponse.json(
      { error: err?.message || "Gagal menghapus subscription" },
      { status: 500 }
    );
  }
}
