import { NextResponse } from 'next/server';
import { findUserByCode, updateUser } from '@/lib/db';

export async function POST(request: Request) {
  try {
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

    return NextResponse.json({
      success: true,
      user: updatedUser || user,
      isAdmin: user.role === 'admin'
    });
  } catch (error) {
    console.error('Auth verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
