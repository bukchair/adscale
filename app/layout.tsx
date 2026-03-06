import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdScale AI",
  description: "AI-powered advertising optimization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body style={{ margin: 0, padding: 0, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
