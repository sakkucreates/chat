import { NextResponse } from 'next/server';
import { getConversationMessages, createMessage, markMessagesAsRead } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const contactId = searchParams.get('contactId');

    if (!userId || !contactId) {
      return NextResponse.json({ error: 'userId and contactId are required' }, { status: 400 });
    }

    const messages = await getConversationMessages(userId, contactId);
    
    // Automatically mark received messages as read
    await markMessagesAsRead(contactId, userId);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { senderId, receiverId, text, image } = await request.json();

    if (!senderId || !receiverId) {
      return NextResponse.json({ error: 'senderId and receiverId are required' }, { status: 400 });
    }

    if (!text && !image) {
      return NextResponse.json({ error: 'Message content or image is required' }, { status: 400 });
    }

    const message = await createMessage({
      senderId,
      receiverId,
      text: text ? text.trim() : '',
      image: image || undefined
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
