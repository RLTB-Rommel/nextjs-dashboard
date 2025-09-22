
import { Metadata } from 'next';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Customers',
};

export default function Page() {
  return <p>Customers Page</p>;
}