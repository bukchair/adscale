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
    <html lang="en" dir="ltr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        {/* Sync theme + detect browser language before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            try {
              // Theme
              var t = localStorage.getItem('bscale_theme');
              if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
              else document.documentElement.removeAttribute('data-theme');
              // Language: use saved preference, or detect from browser
              var saved = localStorage.getItem('bscale_lang');
              var supported = ['he','en','es','de','fr','pt','ru'];
              var lang = saved;
              if (!lang) {
                var nav = navigator.language || navigator.languages && navigator.languages[0] || 'en';
                var code = nav.split('-')[0].toLowerCase();
                lang = supported.indexOf(code) !== -1 ? code : 'en';
                localStorage.setItem('bscale_lang', lang);
              }
              document.documentElement.lang = lang;
              document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
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
