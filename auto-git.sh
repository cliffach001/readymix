#!/bin/bash
# ============================================================
# Auto commit + push ke GitHub
# Gunakan: bash auto-git.sh "pesan commit"
# Contoh:  bash auto-git.sh "update halaman plant"
# ============================================================

MSG="${1:-update $(date '+%Y-%m-%d %H:%M')}"

git add -A
git commit -m "$MSG"
# post-commit hook akan otomatis push
