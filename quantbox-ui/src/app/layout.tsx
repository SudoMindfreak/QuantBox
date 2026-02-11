import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "QuantBox | AI Strategy Engine",
  description: "Prompt-to-Trade: AI-powered algorithmic trading for Polymarket",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="font-sans antialiased bg-[#030303]">
        {children}
        <Toaster 
          richColors 
          position="bottom-right" 
          theme="dark" 
          closeButton
          expand={true}
        />
      </body>
    </html>
  );
}
