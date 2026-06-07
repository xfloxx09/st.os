import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: "STALKER.OS — On-Chain Intelligence Terminal",
  description:
    "Browser-based Ethereum token forensics terminal. Paste a contract address. Stalk the holders.",
  openGraph: {
    title: "STALKER.OS",
    description: "On-chain intelligence terminal for Ethereum tokens",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${ibmPlexMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
