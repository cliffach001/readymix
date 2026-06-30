#!/usr/bin/env node
/**
 * Import CSV ke tabel input_data di Supabase
 *
 * Cara pakai: node scripts/import-csv.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { parse } from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// === CONFIG ===
const CSV_PATH = path.resolve("/Users/nurirvansyah/Documents/NUR IRVANSYAH/Github/input_data_rmx_pkm.csv");
const SUPABASE_URL = "https://civdbreugfuerqoayqsi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpdmRicmV1Z2Z1ZXJxb2F5cXNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyMDEyNTEsImV4cCI6MjA5Nzc3NzI1MX0.qzIB0fWAqYIhVy2Wz7MT-pu9hX0dKCxvjkw20Nf88H0";

// === HELPERS ===

/** Normalize Indonesian number string to float
 *  Format Indonesia: "." = thousand separator, "," = decimal separator
 *  Contoh: "1.420.000" → 1420000, "50,00" → 50.00
 */
function normalizeNumber(str) {
  if (!str || str.trim() === "") return 0;
  let s = str.trim();

  // Hapus semua spasi
  s = s.replace(/\s+/g, "");

  // Jika ada angka dengan format ribuan (titik sebagai pemisah ribuan):
  // 1. Hapus semua titik (pemisah ribuan)
  // 2. Ganti koma dengan titik (desimal)
  // Contoh: "1.420.000" → "1420000", "50,00" → "50.00"
  s = s.replace(/\./g, "");   // hapus semua titik (pemisah ribuan)
  s = s.replace(",", ".");    // ganti koma dengan titik desimal

  const val = parseFloat(s);
  return isNaN(val) ? 0 : val;
}

/** Convert date from YY/MM/DD to YYYY-MM-DD */
function normalizeDate(dateStr) {
  if (!dateStr) return "";
  const trimmed = dateStr.trim();
  // Already YYYY-MM-DD?
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // YY/MM/DD format
  const parts = trimmed.split("/");
  if (parts.length === 3) {
    const yy = parseInt(parts[0]);
    const mm = parts[1].padStart(2, "0");
    const dd = parts[2].padStart(2, "0");
    const yyyy = yy < 100 ? 2000 + yy : yy;
    return `${yyyy}-${mm}-${dd}`;
  }

  // DD/MM/YY format
  const partsRev = trimmed.split("-");
  if (partsRev.length === 3 && partsRev[2].length === 2) {
    const dd = partsRev[0].padStart(2, "0");
    const mm = partsRev[1].padStart(2, "0");
    const yy = parseInt(partsRev[2]);
    const yyyy = 2000 + yy;
    return `${yyyy}-${mm}-${dd}`;
  }

  return trimmed;
}

/** Normalize timestamptz: fix out-of-range timezone offsets by clamping to +00 */
function normalizeCreatedAt(str) {
  if (!str) return null;
  const trimmed = str.trim();
  // Replace any timezone offset beyond +/-15 (PostgreSQL max) with +00
  return trimmed.replace(/[+-](\d{2})(?::\d{2})?$/, (match, hours) => {
    const h = parseInt(hours, 10);
    return h > 15 ? "+00" : match;
  });
}

// === MAIN ===

async function main() {
  console.log("📂 Reading CSV file...");
  const csvContent = fs.readFileSync(CSV_PATH, "utf-8");
  const lines = csvContent.split("\n").filter(line => line.trim());

  const header = lines[0].split(";");
  console.log("📋 Header:", header);
  console.log(`📊 Total rows (excl header): ${lines.length - 1}`);

  // Parse rows
  const records = [];
  let parseErrors = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    // Skip empty rows or rows without an ID
    if (!cols[0] || cols[0].trim() === "" || cols[0].trim() === "﻿") {
      continue;
    }
    if (cols.length < 11) {
      parseErrors.push(`Row ${i + 1}: incomplete (${cols.length} cols)`);
      continue;
    }

    const record = {
      id: cols[0]?.trim(),
      plant_code: cols[1]?.trim(),
      tanggal: normalizeDate(cols[2]?.trim()),
      nama_pelanggan: cols[3]?.trim(),
      uraian_pekerjaan: cols[4]?.trim(),
      type: cols[5]?.trim(),
      volume: normalizeNumber(cols[6]),
      harga_satuan: normalizeNumber(cols[7]),
      jumlah_harga: normalizeNumber(cols[8]),
      sewa_cp: normalizeNumber(cols[9]),
      total_harga: normalizeNumber(cols[10]),
      created_at: normalizeCreatedAt(cols[12]) || null,
      keterangan: cols[11]?.trim().replace(/\r$/, "") || null,
    };

    // Validate tanggal
    if (!record.tanggal || isNaN(new Date(record.tanggal).getTime())) {
      parseErrors.push(`Row ${i + 1}: invalid date "${cols[2]}"`);
    }

    records.push(record);
  }

  if (parseErrors.length > 0) {
    console.log(`\n⚠️  Parse warnings (${parseErrors.length}):`);
    parseErrors.slice(0, 10).forEach(e => console.log(`  ${e}`));
    if (parseErrors.length > 10) {
      console.log(`  ... and ${parseErrors.length - 10} more`);
    }
  }

  console.log(`\n✅ Parsed ${records.length} records`);

  // === UPSERT TO SUPABASE ===
  console.log("\n🔌 Connecting to Supabase...");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Check if table is accessible
  const { count, error: checkError } = await supabase
    .from("input_data")
    .select("*", { count: "exact", head: true });

  if (checkError) {
    console.error("❌ Connection error:", checkError.message);
    process.exit(1);
  }

  console.log(`📦 Existing records in input_data: ${count}`);

  // === HAPUS SEMUA DATA LAMA ===
  if (count > 0) {
    console.log(`\n🗑️  Menghapus ${count} records lama...`);
    const { error: deleteError } = await supabase
      .from("input_data")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // hapus semua

    if (deleteError) {
      console.error("❌ Gagal menghapus data:", deleteError.message);
      process.exit(1);
    }
    console.log("✅ Data lama berhasil dihapus");
  }

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let success = 0;
  let errors = 0;

  console.log(`\n⏳ Importing ${records.length} records in batches of ${BATCH_SIZE}...`);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(records.length / BATCH_SIZE);

    process.stdout.write(`  Batch ${batchNum}/${totalBatches}... `);

    const { error: upsertError } = await supabase
      .from("input_data")
      .upsert(batch, {
        onConflict: "id",
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error(`❌ ${upsertError.message}`);
      errors += batch.length;
      // Try individual inserts for this batch
      console.log(`  ↳ Retrying individually...`);
      for (const record of batch) {
        const { error } = await supabase
          .from("input_data")
          .upsert(record, { onConflict: "id" });
        if (error) {
          console.error(`    ❌ ${record.id.slice(0, 8)}...: ${error.message}`);
          errors++;
        } else {
          success++;
        }
      }
      process.stdout.write(`  Done (${success} OK, ${errors} errors so far)\n`);
    } else {
      success += batch.length;
      process.stdout.write(`✅\n`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n═══════════════════════════════════`);
  console.log(`📊 Import complete!`);
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ❌ Errors:  ${errors}`);
  console.log(`  📝 Total:   ${records.length}`);
  console.log(`═══════════════════════════════════`);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
