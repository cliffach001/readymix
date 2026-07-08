#!/bin/bash
# Script untuk membersihkan console.log/error/warn tanpa tag yang jelas

find app/ components/ lib/ hooks/ -type f \( -name "*.ts" -o -name "*.tsx" \) | while read f; do
  # Hanya proses file yang TIDEN punya eslint-disable untuk console
  if grep -q "eslint-disable-next-line no-console" "$f"; then
    continue
  fi

  # Ganti console.error(xxx) dengan // Log removed
  sed -i.bak -E 's/^[[:space:]]*console\.(error|warn|log|debug|info)\(.*\);?$/  \/\/ Log removed - use logger.ts instead/; /^\/\/ Log removed/d' "$f" 2>/dev/null || true
  rm -f "$f.bak" 2>/dev/null || true
  
done
echo "Done cleaning consoles"
