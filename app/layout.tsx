import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import PwaSetup from "@/components/PwaSetup";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Penjualan Ready Mix",
  description: "PT. Prima Karya Manunggal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "RM-Pocket",
    statusBarStyle: "default",
  },
  icons: {
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <meta name="theme-color" content="#F35b04" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512x512.png" />
      </head>
      <body className={inter.className}>
        <PwaSetup />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
