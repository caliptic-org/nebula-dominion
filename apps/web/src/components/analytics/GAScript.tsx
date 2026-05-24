/**
 * Google Analytics 4 — script loader.
 *
 * Injects gtag bootstrap as Next.js <Script /> with strategy="afterInteractive"
 * so it never blocks first paint. `NEXT_PUBLIC_GA_ID` (G-XXXXXXX) is read at
 * build time; when missing, the component renders nothing.
 *
 * IMPORTANT: inline body uses `dangerouslySetInnerHTML` rather than passing
 * the script source as children. Next.js's <Script /> with children appears
 * to mangle multi-line template literals when injecting via React's script
 * appendChild path, producing "missing ) after argument list" SyntaxErrors.
 * dangerouslySetInnerHTML side-steps that by writing raw HTML.
 */

import Script from 'next/script';

/** GA4 Measurement IDs follow the format `G-XXXXXXXXXX` (G-prefix + 10 chars).
 *  Older properties may use `UA-`. Anything outside that shape is treated as
 *  unconfigured — protects against placeholder/comment text accidentally
 *  landing in the .env value. */
const GA_ID_PATTERN = /^(G-[A-Z0-9]{6,12}|UA-\d+-\d+)$/;

export function GAScript() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId || !GA_ID_PATTERN.test(gaId)) return null;

  const init = `window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${gaId}', { send_page_view: false, anonymize_ip: true });`;

  return (
    <>
      <Script
        id="ga-loader"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="ga-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: init }}
      />
    </>
  );
}
