import { NextResponse } from 'next/server';

export function GET() {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  return NextResponse.redirect(new URL('/api/auth/signin', base));
}