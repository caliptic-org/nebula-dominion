import { redirect } from 'next/navigation';

export default function VipRedirect() {
  // VIP was consolidated into the Shop route under the redesign.
  redirect('/shop?tab=vip');
}
