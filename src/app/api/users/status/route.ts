import { NextResponse } from 'next/server';
import { updateUser } from '@/lib/db';

export async function POST(request: Request) {
  try {
    let userId: string | null = null;
    let status: 'online' | 'offline' = 'offline';

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      userId = body.userId;
      status = body.status || 'offline';
    } else {
      const text = await request.text();
      try {
        const parsed = JSON.parse(text);
        userId = parsed.userId;
        status = parsed.status || 'offline';
      } catch {
        // Ignored
      }
    }

    if (userId) {
      await updateUser(userId, {
        status: status,
        lastSeen: status === 'offline' 
          ? new Date(Date.now() - 10000).toISOString() 
          : new Date().toISOString()
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
