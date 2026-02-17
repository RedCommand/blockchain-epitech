import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tokenized Assets",
  description: "Manage Real World Assets on-chain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <div className="navbar bg-base-100">
            <div className="flex-1">
              <a className="btn btn-ghost text-xl">RWA Platform</a>
            </div>
            <div className="flex-none">
              <ul className="menu menu-horizontal px-1">
                <li><Link href="/">Portfolio</Link></li>
                <li><Link href="/trade">Trade</Link></li>
                <li><Link href="/admin">Admin</Link></li>
              </ul>
              <ConnectButton />
            </div>
          </div>
          <main className="container mx-auto p-4">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
