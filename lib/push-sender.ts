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
import { logger } from "@/lib/logger";

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
    logger.warn("VAPID keys not configured", { tag: "PushSender" });
    return { sent: 0, failed: 0 };
  }

  const supabase = getSupabase();
  const { data: subscriptions, error } = await (supabase
    .from("push_subscriptions") as any)
    .select("endpoint, p256dh, auth");

  if (error || !subscriptions?.length) {
    logger.warn("No subscriptions found", { tag: "PushSender" });
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
 * Kirim push notification ke username tertentu
 */
export async function sendPushToUsername(
  username: string,
  payload: PushPayload
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    logger.warn("VAPID keys not configured", { tag: "PushSender" });
    return { sent: 0, failed: 0 };
  }

  const supabase = getSupabase();
  const { data: subscriptions, error } = await (supabase
    .from("push_subscriptions") as any)
    .select("endpoint, p256dh, auth")
    .eq("username", username);

  if (error || !subscriptions?.length) {
    logger.warn(`No subscriptions found for username: ${username}`, { tag: "PushSender" });
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
