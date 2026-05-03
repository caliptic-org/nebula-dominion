'use server';

import { isValidEventSlug } from '@/lib/colorSanitizer';

/**
 * Server Action for joining an event.
 * Next.js Server Actions include built-in CSRF protection via the
 * Origin header check — no additional token needed.
 *
 * Pending CAL-192: wire to POST /api/events/:id/join with JWT auth header.
 */
export async function joinEventAction(formData: FormData): Promise<{ error?: string }> {
  const eventId = formData.get('eventId');

  if (!isValidEventSlug(eventId)) {
    return { error: 'Geçersiz etkinlik ID.' };
  }

  // TODO (CAL-192): replace with real API call
  // const res = await fetch(`${process.env.API_URL}/api/events/${eventId}/join`, {
  //   method: 'POST',
  //   headers: { Authorization: `Bearer ${await getServerSideJwt()}` },
  // });
  // if (!res.ok) return { error: await res.text() };

  return { error: 'Backend bağlantısı henüz hazır değil (CAL-192 beklemede).' };
}
