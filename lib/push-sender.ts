/**
 * Server-side utility untuk mengirim push notification
 * via Web Push Protocol (VAPID).
 *
 * Penggunaan:
 *   import { sendPushToAll, sendPushToUser } from "@/lib/push-sender";
 *
 *   await sendPushToAll({
 *     title: "Laporan Baru",
 *     body: "Laporan mingguan telah diinput",
 *     url: "/laporan-mingguan",
 *   });
 */

import webpush from "web-push";
import { getSupabase } from "@/lib/supabase";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@rm-pkm.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

/**
 * Kirim push notification ke semua subscription
 */
export async function sendPushToAll(payload: PushPayload) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[PushSender] VAPID keys not configured");
    return { sent: 0, failed: 0 };
  }

  const supabase = getSupabase();
  const { data: subscriptions, error } = await (supabase
    .from("push_subscriptions") as any)
    .select("endpoint, p256dh, auth");

  if (error || !subscriptions?.length) {
    console.warn("[PushSender] No subscriptions found");
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      // Jika subscription expired/invalid, hapus dari DB
      if (err.statusCode === 410 || err.statusCode === 404) {
        await (supabase
          .from("push_subscriptions") as any)
          .delete()
          .eq("endpoint", sub.endpoint);
      }
      failed++;
    }
  }

  return { sent, failed };
}

/**
 * Kirim push notification ke user-agent tertentu (misal dari header)
 * Implementasi bisa diperluas dengan menyimpan user_id di tabel subscription
 */
export async function sendPushToUser(
  userAgent: string,
  payload: PushPayload
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("[PushSender] VAPID keys not configured");
    return { sent: 0, failed: 0 };
  }

  const supabase = getSupabase();
  const { data: subscriptions, error } = await (supabase
    .from("push_subscriptions") as any)
    .select("endpoint, p256dh, auth")
    .eq("user_agent", userAgent);

  if (error || !subscriptions?.length) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await (supabase
          .from("push_subscriptions") as any)
          .delete()
          .eq("endpoint", sub.endpoint);
      }
      failed++;
    }
  }

  return { sent, failed };
}
