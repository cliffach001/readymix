import { NextResponse } from "next/server";
import { sendPushToUsername } from "@/lib/push-sender";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * POST /api/notifications/send-to-user
 * Kirim push notification ke username tertentu.
 * Dipanggil dari client setelah approve/reject approval request.
 * Rate limit: 5 request per menit per IP
 */
export async function POST(request: Request) {
  // --- Rate Limiting ---
  const clientIp = getClientIp(request);
  const limitInfo = rateLimit(`send-to-user:${clientIp}`, 5, 60 * 1000);

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
    const { username, title, body: message, url, tag } = body;

    if (!username || !title || !message) {
      return NextResponse.json(
        { error: "Field username, title, dan body wajib diisi" },
        { status: 400 }
      );
    }

    const result = await sendPushToUsername(username, {
      title,
      body: message,
      url: url || "/",
      tag: tag || "rm-pocket-approval",
      icon: "/icons/icon-192x192.png",
    });

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
    });
  } catch (err: any) {
    logger.error("Gagal kirim notifikasi ke user", { tag: "SendToUser" });
    return NextResponse.json(
      { error: err?.message || "Gagal mengirim notifikasi" },
      { status: 500 }
    );
  }
}
