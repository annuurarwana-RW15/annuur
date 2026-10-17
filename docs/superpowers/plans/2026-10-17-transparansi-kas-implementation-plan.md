# Transparansi Kas Publik + Daftar Transaksi (A2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Naik transparansi ke jamaah dengan menambah daftar transaksi publik tanpa nama donatur, sambil tetap menampilkan agregat di halaman `/laporan-kas`.

**Architecture:** Modifikasi halaman `/laporan-kas` untuk menambahkan tab "Daftar Transaksi" di atas ringkasan agregat. Setiap baris transaksi menampilkan tanggal, jenis, kategori, nominal, keterangan, dan foto kwitansi (jika ada). Filter kategori & rentang tanggal. Grafik tren 6-12 bulan opsional di atas.

**Tech Stack:** Next.js App Router, Prisma ORM, Postgres, Tailwind CSS, DataTable komponen sudah ada (`PublicLaporanTable.tsx`), `recharts` atau SVG manual untuk grafik.

**Spec:** docs/superpowers/specs/2026-10-17-transparansi-kas-design.md

## Global Constraints
- Privacy: tidak ada nama donatur di UI publik; keterangan bebas (misal "Anonim").
- Hanya transaksi status `DIKONFIRMASI` yang muncul di daftar publik (bisa di-toggle).
- Foto kwitansi (`receiptImage`) dari admin muncul di Publik jika terisi.
- Agregat (masuk/keluar/saldo) tetap tampil di bagian atas halaman, tidak berubah.
- DataTable sudah ada; tambah kolom tanpa merusak struktur lama.

---
