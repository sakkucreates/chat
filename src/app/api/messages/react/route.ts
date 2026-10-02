import { NextResponse } from 'next/server';
import { addReactionToMessage } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { messageId, userId, emoji } = await request.json();

    if (!messageId || !userId || !emoji) {
      return NextResponse.json({ error: 'messageId, userId and emoji are required' }, { status: 400 });
    }

    const updated = await addReactionToMessage(messageId, userId, emoji);

    if (!updated) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: updated });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
  }
}
