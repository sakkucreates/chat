import { NextResponse } from 'next/server';
import { findUserByCode, updateUser } from '@/lib/db';
import { checkRateLimit, createSessionToken, getSessionCookieHeader, verifyCsrf } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    if (!verifyCsrf(request)) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }

    const forwarded = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const ip = forwarded.split(',')[0].trim();
    const rate = checkRateLimit(ip, 12, 60000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait a minute.' }, { status: 429 });
    }

    const { code } = await request.json();

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Access passcode is required' }, { status: 400 });
    }

    const user = await findUserByCode(code);

    if (!user) {
      return NextResponse.json({ error: 'Invalid access code. Please check with your administrator.' }, { status: 401 });
    }

    // Update status to online & update lastSeen
    const updatedUser = await updateUser(user.id, {
      status: 'online',
      lastSeen: new Date().toISOString()
    });

    const activeUser = updatedUser || user;

    // Generate signed HMAC-SHA256 session token
    const token = await createSessionToken({
      userId: activeUser.id,
      name: activeUser.name,
      code: activeUser.code,
      role: activeUser.role
    });

    const response = NextResponse.json({
      success: true,
      user: activeUser,
      isAdmin: activeUser.role === 'admin'
    });

    // Set HttpOnly, SameSite=Lax, Secure session cookie
    response.headers.append('Set-Cookie', getSessionCookieHeader(token));

    return response;
  } catch (error: any) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ error: error?.message || String(error) || 'Internal server error' }, { status: 500 });
  }
}
