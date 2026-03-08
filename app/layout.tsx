import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "BScale AI",
  description: "AI-powered advertising optimization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        {/* Sync theme from localStorage before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              var t = localStorage.getItem('bscale_theme');
              if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
              else document.documentElement.removeAttribute('data-theme');
            } catch(e) {}
          })();
        ` }} />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
