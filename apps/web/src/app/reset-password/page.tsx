import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Yeni Şifre',
};

export default function ResetPasswordPage() {
  // useSearchParams must be wrapped in Suspense at the page level so the
  // build doesn't fail with "useSearchParams() should be wrapped" during
  // static rendering.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
