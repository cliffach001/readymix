/**
 * Utility untuk Push Notification — client-side
 */

/** Dapatkan VAPID public key dari server */
async function getVapidPublicKey(): Promise<string> {
  const res = await fetch("/api/notifications/vapid-public-key");
  if (!res.ok) throw new Error("Gagal mendapatkan VAPID public key");
  const data = await res.json();
  return data.publicKey;
}

/** Minta permission notifikasi ke browser */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/** Subscribe ke push notification */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;

  const reg = await navigator.serviceWorker.ready;
  const publicKey = await getVapidPublicKey();

  let subscription = await reg.pushManager.getSubscription();

  if (!subscription) {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as string,
    });
  }

  return subscription;
}

/** Cek status subscription saat ini */
export async function getPushStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission | "unavailable";
  subscribed: boolean;
}> {
  const supported = "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;

  if (!supported) {
    return { supported: false, permission: "unavailable", subscribed: false };
  }

  const permission = Notification.permission;
  let subscribed = false;

  if (permission === "granted") {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      subscribed = !!sub;
    } catch {
      // SW mungkin belum ready
    }
  }

  return { supported, permission, subscribed };
}

// ──────────────────────────────────────────────
// Helper: konversi base64 key ke Uint8Array
// ──────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
