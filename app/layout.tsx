import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Prompt } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "GovCarBooking",
  description: "ระบบบริหารการใช้รถราชการ สำนักงานเขตจอมทอง",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="light">
      <body
        className={`
          bg-[var(--background)]
          text-[var(--foreground)]
          ${prompt.variable}
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
        `}
      >
        {children}
      </body>
    </html>
  );
}
