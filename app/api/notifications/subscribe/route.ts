import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/subscribe
 * Menyimpan subscription push notification ke Supabase
 * Rate limit: 10 request per menit per IP
 */
export async function POST(request: Request) {
  // --- Rate Limiting ---
  const clientIp = getClientIp(request);
  const limitInfo = rateLimit(`subscribe:${clientIp}`, 10, 60 * 1000);

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
    const { endpoint, keys, username } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: "Data subscription tidak lengkap" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const table = supabase.from("push_subscriptions") as any;

    // Cek apakah endpoint sudah terdaftar
    const { data: existing } = await table
      .select("id")
      .eq("endpoint", endpoint)
      .maybeSingle();

    if (existing) {
      // Update yang sudah ada
      const { error } = await table
        .update({
          p256dh: keys.p256dh,
          auth: keys.auth,
          username: username || null,
          user_agent: request.headers.get("user-agent") || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) throw error;
    } else {
      // Insert baru
      const { error } = await table
        .insert({
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          username: username || null,
          user_agent: request.headers.get("user-agent") || null,
        });

      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    logger.error("Gagal menyimpan subscription", { tag: "Subscribe" });
    return NextResponse.json(
      { error: err?.message || "Gagal menyimpan subscription" },
      { status: 500 }
    );
  }
}
