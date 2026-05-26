'use server';

import { cookies } from 'next/headers';
import { isValidEventSlug } from '@/lib/colorSanitizer';

/**
 * Server Action for joining an event.
 * Next.js Server Actions include built-in CSRF protection via the
 * Origin header check — no additional token needed.
 *
 * Note: this Server Action coexists with the inline fetch on
 * /events/[id]/page.tsx (line ~298) which already hits the same endpoint
 * from client-side using the localStorage-stored token.  This server-side
 * variant reads the JWT cookie when present so Server Components / forms
 * can submit without leaking the token to the network tab.
 */
export async function joinEventAction(formData: FormData): Promise<{ error?: string }> {
  const eventId = formData.get('eventId');

  if (!isValidEventSlug(eventId)) {
    return { error: 'Geçersiz etkinlik ID.' };
  }

  // Auth: prefer httpOnly cookie if the deployment sets it; otherwise the
  // client must use the client-side fetch in /events/[id]/page.tsx which
  // pulls the bearer from localStorage.  Server actions cannot read
  // localStorage by design.
  const cookieStore = await cookies();
  const token =
    cookieStore.get('accessToken')?.value ??
    cookieStore.get('access_token')?.value ??
    '';

  if (!token) {
    return { error: 'Oturum bulunamadı — sayfayı yenileyip tekrar dene.' };
  }

  const apiBase = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002';
  const url = `${apiBase.replace(/\/+$/, '')}/api/v1/events/${encodeURIComponent(String(eventId))}/join`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      let msg = `Etkinliğe katılım başarısız (HTTP ${res.status}).`;
      try {
        const data = (await res.json()) as { message?: string };
        if (data?.message) msg = data.message;
      } catch { /* ignore */ }
      return { error: msg };
    }

    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Bilinmeyen hata.' };
  }
}
