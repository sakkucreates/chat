import { NextResponse } from 'next/server';
import { getClearSessionCookieHeader } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.headers.append('Set-Cookie', getClearSessionCookieHeader());
  return response;
}
