
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Customers',
};

export default function Page() {
  return <p>Customers Page</p>;
}