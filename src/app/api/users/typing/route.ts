import { NextResponse } from 'next/server';
import { setTypingStatus } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId, targetId, isTyping } = await request.json();

    if (!userId || !targetId) {
      return NextResponse.json({ error: 'userId and targetId are required' }, { status: 400 });
    }

    await setTypingStatus(userId, targetId, Boolean(isTyping));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating typing status:', error);
    return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 });
  }
}
