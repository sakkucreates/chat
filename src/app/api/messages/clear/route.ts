import { NextResponse } from 'next/server';
import { clearConversationMessages } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { userId, contactId } = await request.json();

    if (!userId || !contactId) {
      return NextResponse.json({ error: 'userId and contactId are required' }, { status: 400 });
    }

    await clearConversationMessages(userId, contactId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing conversation messages:', error);
    return NextResponse.json({ error: 'Failed to clear messages' }, { status: 500 });
  }
}
