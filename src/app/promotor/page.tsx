import type { Metadata } from 'next';
import { PromotorInbox } from '@/components/promotor/PromotorInbox';

export const metadata: Metadata = {
  title: 'Promotor — Rider Studio',
  robots: { index: false, follow: false },
};

export default function PromotorPage() {
  return <PromotorInbox />;
}
