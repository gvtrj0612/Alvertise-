import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alvertise - Creative Ad Generation Studio",
  description:
    "Generate high-converting ad copy and visuals with a premium creative workflow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${spaceGrotesk.variable} ${spaceMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
