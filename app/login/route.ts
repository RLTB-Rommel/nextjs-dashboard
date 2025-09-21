import { NextResponse } from 'next/server';

export function GET() {
  // In prod, NEXTAUTH_URL should be set; in dev we fall back to localhost
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  return NextResponse.redirect(new URL('/api/auth/signin', base));
}