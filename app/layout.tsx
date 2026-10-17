import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Vivelune",
    template: "%s · Vivelune",
  },
  description:
    "Vivelune builds tools for learning and teaching. Lunora, our learning platform, is available now.",
  applicationName: "Vivelune",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#8b5cf6",
          colorBackground: "transparent",
          colorForeground: "#e5e5e5",
          colorMutedForeground: "#a3a3a3",
          colorInput: "rgba(255,255,255,0.04)",
          colorInputForeground: "#f5f5f5",
          colorNeutral: "#f5f5f5",
          borderRadius: "0.75rem",
          fontFamily: "var(--font-geist-sans)",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable}`}
        suppressHydrationWarning
      >
        <body className="min-h-screen bg-neutral-950 font-sans text-neutral-100 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}