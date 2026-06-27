import type { Metadata } from "next";
import { Geist, Geist_Mono, Prompt, Sarabun } from "next/font/google";
import "./globals.css";
import "@fontsource/sarabun"; // For print layout

// ฟอนต์ Prompt (ราชการ)
const prompt = Prompt({
  subsets: ["thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
});

// ฟอนต์ Geist (สำหรับอังกฤษ)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL =
  process.env.PUBLIC_DOMAIN ||
  "https://govcarbooking-v2-suwimon-ths-projects.vercel.app";

export const metadata: Metadata = {
  title: "GovCarBooking — ระบบบริหารการใช้รถราชการ",
  description: "ระบบบริหารการใช้รถราชการ สำนักงานเขตจอมทอง",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "GovCarBooking — ระบบบริหารการใช้รถราชการ",
    description: "ระบบบริหารการใช้รถราชการ สำนักงานเขตจอมทอง",
    url: BASE_URL,
    siteName: "GovCarBooking",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GovCarBooking — ระบบบริหารการใช้รถราชการ สำนักงานเขตจอมทอง",
      },
    ],
    locale: "th_TH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GovCarBooking — ระบบบริหารการใช้รถราชการ",
    description: "ระบบบริหารการใช้รถราชการ สำนักงานเขตจอมทอง",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="light">
      <body
        className={`bg-[var(--background)] text-[var(--foreground)] ${prompt.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
