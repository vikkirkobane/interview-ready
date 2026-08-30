import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Custom root HTML layout for Expo Router Web and PWA.
 * Optimized for Safari "Add to Home Screen" on iOS and PWA install on Android/Desktop.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* Primary Meta Tags */}
        <title>Interview Ready - AI-Powered Interview Coach & Career Suite</title>
        <meta
          name="description"
          content="Accelerate your career with AI-powered mock interviews, instant resume ATS tailoring, cover letter generation, and skill roadmaps."
        />

        {/* PWA & iOS Safari "Add to Home Screen" Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Interview Ready" />
        <meta name="application-name" content="Interview Ready" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1a3a5c" />
        <meta name="msapplication-navbutton-color" content="#1a3a5c" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="format-detection" content="telephone=no" />

        {/* PWA Manifest & App Icons */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon_padded.png" />

        {/* Google AdSense */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3023396295642660"
          crossOrigin="anonymous"
        />
        <meta name="google-adsense-account" content="ca-pub-3023396295642660" />

        {/* Reset web styles for native feel */}
        <ScrollViewStyleReset />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                background-color: #0a0f1d;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
                touch-action: manipulation;
                -webkit-touch-callout: none;
                -webkit-tap-highlight-color: transparent;
                overflow: hidden;
              }
              /* Support iOS Safe Areas */
              body {
                padding-top: env(safe-area-inset-top);
                padding-bottom: env(safe-area-inset-bottom);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
              }
              /* Modern, distinct scrollbars for web / desktop */
              * {
                scrollbar-width: thin !important;
                scrollbar-color: rgba(51, 119, 255, 0.45) rgba(255, 255, 255, 0.04);
              }
              ::-webkit-scrollbar {
                width: 8px !important;
                height: 8px !important;
                display: block !important;
              }
              ::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.04) !important;
                border-radius: 4px;
              }
              ::-webkit-scrollbar-thumb {
                background: rgba(51, 119, 255, 0.45) !important;
                border-radius: 4px;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: rgba(51, 119, 255, 0.8) !important;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
