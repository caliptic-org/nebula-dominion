import type { Metadata } from 'next';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Şifremi Unuttum',
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
