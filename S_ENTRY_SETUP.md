# Sentry Error Tracking Setup

## Langkah 1: Buat Akun & Project di Sentry

1. Buka [sentry.io](https://sentry.io) dan login/signup
2. Create New Project → pilih **Next.js**
3. Catat nilai-nilai berikut:
   - **DSN** (Data Source Name) — biasanya format: `https://xxxx@xxxx.ingest.sentry.io/xxxx`
   - **Organization Slug** — dari URL, contoh: `my-org`
   - **Project Name** — contoh: `rm-pocket`

## Langkah 2: Generate Auth Token

1. Di Sentry dashboard, pergi ke **Settings → Account → API → Auth Tokens**
2. Click **Create New Token**
3. Scopes yang diperlukan: `org:read`, `project:read`, `project:releases`, `project:write`
4. Simpan token dengan aman (hanya ditampilkan sekali!)

## Langkah 3: Tambahkan Environment Variables

Tambahkan ke file `.env.local` di root project:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=rm-pocket
SENTRY_AUTH_TOKEN=sntrys_xxx_xxx  # Token dari langkah 2
```

**Untuk Production (Vercel / server):**
```bash
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=rm-pocket
SENTRY_AUTH_TOKEN=sntrys_xxx_xxx
```

## Langkah 4: Deploy

```bash
# Local development (Sentry tidak aktif di dev)
npm run dev

# Production build
npm run build
```

## Verifikasi

Sentry hanya aktif di production. Untuk test, deploy ke Vercel kemudian buka aplikasi.

Error pertama yang muncul akan terlihat di Sentry Dashboard → Issues.

---

## FAQ

**Q: Apakah Sentry membebankan biaya?**
A: Sentry punya [Free Tier](https://sentry.io/pricing/) — 5,000 error/events per bulan. Untuk aplikasi internal dengan traffic ringan, ini lebih dari cukup.

**Q: Apakah data user dikirim ke Sentry?**
A: Secara default, Sentry mengumpulkan stack trace dan error message. Tidak mengumpulkan form data atau PII (Personally Identifiable Information) kecuali di-configure. Review [Sentry Privacy Policy](https://sentry.io/privacy/) untuk detail.

**Q: Bagaimana cara menonaktifkan Sentry?**
A: Hapus atau kosongkan `NEXT_PUBLIC_SENTRY_DSN` dari environment variables.
