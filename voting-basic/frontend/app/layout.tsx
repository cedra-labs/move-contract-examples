import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/contexts/WalletContext";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WeDecide - Decentralized Basic Community Governance",
  description: "Vote on Basic community proposals on the Cedra blockchain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WalletProvider>
          {children}
        </WalletProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '0.75rem',
              color: 'rgb(248, 250, 252)',
              padding: '1rem',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 15px rgba(6, 182, 212, 0.08)',
            },
            success: {
              iconTheme: {
                primary: 'rgb(16, 185, 129)',
                secondary: 'rgba(17, 24, 39, 0.95)',
              },
            },
            error: {
              iconTheme: {
                primary: 'rgb(239, 68, 68)',
                secondary: 'rgba(17, 24, 39, 0.95)',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
