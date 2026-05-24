/**
 * Facebook (Meta) Pixel — script loader.
 *
 * `NEXT_PUBLIC_FB_PIXEL_ID` env'i ile init olur. Bulunamazsa hiçbir script
 * yüklenmez.
 *
 * IMPORTANT: same `dangerouslySetInnerHTML` pattern as GAScript — the FB
 * Pixel bootstrap IIFE has unbalanced `{ }` / `( )` from React's perspective
 * when passed as <Script> children, which throws "missing ) after argument
 * list" inside React's script-insert path. Raw HTML side-steps that.
 *
 * Pixel ID'yi Faz 6 (Facebook Instant Games) ve Faz 3 (Google Ads + FB Ads
 * paralel kampanya) için şimdiden yüklemek mantıklı — kullanıcı verileri
 * şu andan toplanmaya başlar, ileride remarketing için audience hazır olur.
 */

import Script from 'next/script';

/** Facebook Pixel IDs are always 15-16 digit numeric strings. Anything else
 *  (comment text accidentally pasted from .env.example, placeholder copy,
 *  empty string) is treated as "not configured" so we don't render a script
 *  body that contains apostrophes or spaces — those break the inline JS
 *  string literal and produce a "missing ) after argument list" SyntaxError
 *  during React's script-insert path. */
const PIXEL_ID_PATTERN = /^\d{6,20}$/;

export function FBPixel() {
  const pixelId = process.env.NEXT_PUBLIC_FB_PIXEL_ID;
  if (!pixelId || !PIXEL_ID_PATTERN.test(pixelId)) return null;

  const init = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`;

  return (
    <Script
      id="fb-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: init }}
    />
  );
}
