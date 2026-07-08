import * as Sentry from "@sentry/nextjs";

// ============================================================
// Logger — Utilitas logging aman yang bekerja di browser & server
// Menyembunyikan log di production kecuali error penting
// ============================================================

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogOptions {
  /** TAG untuk memudahkan filter (contoh: [Supabase], [Push], dll) */
  tag?: string;
  /** Detail tambahan (tidak diprint di console tapi bisa dikirim ke error tracker) */
  extra?: Record<string, unknown>;
}

/** Kirim ke Sentry jika di production dan Sentry aktif */
function sendToSentry(level: LogLevel, message: string, options?: LogOptions) {
  // Hanya kirim ke Sentry di production dan untuk level error/warn
  if (process.env.NODE_ENV !== "production") return;
  if (level !== "error" && level !== "warn") return;

  try {
    Sentry.withScope((scope) => {
      scope.setTag("logger-tag", options?.tag ?? "unknown");
      if (options?.extra) {
        scope.setContext("extra", options.extra);
      }

      if (level === "error") {
        Sentry.captureException(new Error(message));
      } else {
        Sentry.captureMessage(message, "warning");
      }
    });
  } catch {
    // Fail silently jika Sentry belum siap atau gagal
    // (tidak perlu throw error saat logging)
  }
}

function log(level: LogLevel, message: string, options?: LogOptions) {
  const tag = options?.tag ? `[${options.tag}] ` : "";
  const fullMessage = `${tag}${message}`;

  // Di production, hanya log error dan warn
  const isDev = process.env.NODE_ENV === "development";
  const shouldLog = isDev || level === "error" || level === "warn";

  if (!shouldLog) return;

  switch (level) {
    case "debug":
      // eslint-disable-next-line no-console
      console.debug(fullMessage, options?.extra ?? "");
      break;
    case "info":
      // eslint-disable-next-line no-console
      console.info(fullMessage, options?.extra ?? "");
      break;
    case "warn":
      // eslint-disable-next-line no-console
      console.warn(fullMessage, options?.extra ?? "");
      break;
    case "error":
      // eslint-disable-next-line no-console
      console.error(fullMessage, options?.extra ?? "");
      break;
  }

  // Kirim ke Sentry di background (tidak block)
  sendToSentry(level, message, options);
}

export const logger = {
  debug: (message: string, options?: LogOptions) => log("debug", message, options),
  info: (message: string, options?: LogOptions) => log("info", message, options),
  warn: (message: string, options?: LogOptions) => log("warn", message, options),
  error: (message: string, options?: LogOptions) => log("error", message, options),
};

export default logger;
