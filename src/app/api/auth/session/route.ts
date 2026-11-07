import { NextResponse } from 'next/server';
import { parseCookies, verifySessionToken, verifyCsrf } from '@/lib/auth';
import { getUserById, findUserByCode } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    if (!verifyCsrf(request)) {
      return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
    }

    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookies(cookieHeader);
    const token = cookies['lumachat_session'];

    if (!token) {
      return NextResponse.json({ success: false, user: null });
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, user: null });
    }

    const user = (await getUserById(payload.userId)) || (await findUserByCode(payload.code));
    if (!user) {
      return NextResponse.json({ success: false, user: null });
    }

    return NextResponse.json({
      success: true,
      user
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (err: any) {
    console.error('Session verification error:', err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
