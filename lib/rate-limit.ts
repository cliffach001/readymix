// ============================================================
// Rate Limiting — Membatasi jumlah request ke API endpoint
// Menggunakan in-memory store (simple, tanpa Redis)
// Untuk production dengan multiple instances, gunakan Redis
// ============================================================

interface RateLimitStore {
  count: number;
  resetAt: number;
}

// Store in-memory per IP/username
const store = new Map<string, RateLimitStore>();

// Bersihkan entry yang sudah expired setiap 10 menit
setInterval(() => {
  const now = Date.now();
  store.forEach((data, key) => {
    if (now > data.resetAt) {
      store.delete(key);
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, maxRequests: number = 10, windowMs: number = 60 * 1000): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    // Inisialisasi baru
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetAt,
    };
  }

  // Increment counter
  existing.count++;

  if (existing.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

// Untuk IP-based rate limiting (ktp client IP dari header)
export function getClientIp(req: Request): string {
  // Coba ambil dari header yang umum digunakan oleh proxy
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp;
  
  return "unknown";
}
