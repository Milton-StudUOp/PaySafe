import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import React from "react";
import { Inter } from "next/font/google";

import type { Metadata, Viewport } from "next";
import "./globals.css";

// Modern professional font
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

// Comprehensive SEO Metadata
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://paysafe.co.mz"),
  title: {
    default: "PaySafe System | Sistema de Pagamentos",
    template: "%s | PaySafe System"
  },
  description: "Sistema integrado de gestão de pagamentos e transações para mercados municipais. Gerencie comerciantes, agentes, transações e relatórios de forma segura e eficiente.",
  keywords: [
    "pagamentos",
    "transações",
    "mercados municipais",
    "gestão financeira",
    "POS",
    "Moçambique",
    "M-Pesa",
    "e-Mola",
    "fintech"
  ],
  authors: [{ name: "PaySafe Team" }],
  creator: "PaySafe",
  publisher: "PaySafe Moçambique",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "pt_MZ",
    url: "https://paysafe.co.mz",
    siteName: "PaySafe System",
    title: "PaySafe System | Sistema de Pagamentos",
    description: "Sistema integrado de gestão de pagamentos e transações para mercados municipais em Moçambique.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PaySafe System",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PaySafe System",
    description: "Sistema de gestão de pagamentos para mercados municipais",
    images: ["/og-image.png"],
  },
  applicationName: "PaySafe System",
  category: "Finance",
};

// Viewport configuration
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#10b981" },
    { media: "(prefers-color-scheme: dark)", color: "#059669" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* PWA Meta */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="PaySafe" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#10b981" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
