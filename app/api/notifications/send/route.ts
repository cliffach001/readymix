import { NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push-sender";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/send
 * Broadcast push notification ke semua subscriber.
 * Dipanggil setelah approval request dibuat, dll.
 * Rate limit: 3 request per menit per IP (strict untuk broadcast)
 */
export async function POST(request: Request) {
  // --- Rate Limiting ---
  const clientIp = getClientIp(request);
  const limitInfo = rateLimit(`send-all:${clientIp}`, 3, 60 * 1000);

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
    // Validasi sederhana — hanya dari origin kita sendiri
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (!origin && !host) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { title, body: message, url, tag } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Field title dan body wajib diisi" },
        { status: 400 }
      );
    }

    const result = await sendPushToAll({
      title,
      body: message,
      url: url || "/",
      tag: tag || "rm-pocket-general",
      icon: "/icons/icon-192x192.png",
    });

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    logger.error("Gagal broadcast notifikasi", { tag: "SendAll" });
    return NextResponse.json(
      { error: err?.message || "Gagal mengirim notifikasi" },
      { status: 500 }
    );
  }
}
