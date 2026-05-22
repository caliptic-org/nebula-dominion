import { redirect } from 'next/navigation';

export default function StatsRedirect() {
  // Stats were folded into the Profile route under the redesign.
  redirect('/profile');
}
