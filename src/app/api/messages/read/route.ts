import { NextResponse } from 'next/server';
import { markMessagesAsRead } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { senderId, receiverId } = await request.json();

    if (!senderId || !receiverId) {
      return NextResponse.json({ error: 'senderId and receiverId are required' }, { status: 400 });
    }

    await markMessagesAsRead(senderId, receiverId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 });
  }
}
