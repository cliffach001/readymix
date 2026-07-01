/**
 * Client-side helper untuk mengirim push notification ke admin
 * via API route. Dipanggil setelah approval request dibuat.
 */

interface NotifyPayload {
  title: string;
  body: string;
  url?: string;
}

export async function notifyAdmin(payload: NotifyPayload) {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/",
        tag: "rm-pocket-approval",
      }),
    });
  } catch (err) {
    // Silent fail — notifikasi tidak kritikal
    console.warn("[NotifyAdmin] Gagal kirim push:", err);
  }
}
