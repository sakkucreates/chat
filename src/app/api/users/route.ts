import { NextResponse } from 'next/server';
import { getAllUsers, updateUser, getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeUserId = searchParams.get('userId');
    const activeContactId = searchParams.get('activeContactId');

    if (activeUserId) {
      await updateUser(activeUserId, {
        status: 'online',
        lastSeen: new Date().toISOString()
      });
    }

    const users = await getAllUsers();
    const db = await getDb();

    // Map users with last message info & unread counts relative to activeUserId
    const usersWithStats = users.map(user => {
      let unreadCount = 0;
      let lastMessage = null;

      if (activeUserId) {
        // Find last message in conversation
        const conversationMsgs = db.messages.filter(
          m => (m.senderId === user.id && m.receiverId === activeUserId) ||
               (m.senderId === activeUserId && m.receiverId === user.id)
        ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (conversationMsgs.length > 0) {
          lastMessage = conversationMsgs[conversationMsgs.length - 1];
        }

        // Unread messages sent FROM this contact TO activeUserId
        // If this contact is currently open on screen (activeContactId === user.id), unread count is 0
        if (activeContactId && user.id === activeContactId) {
          unreadCount = 0;
        } else {
          unreadCount = db.messages.filter(
            m => m.senderId === user.id && m.receiverId === activeUserId && !m.read
          ).length;
        }
      }

      return {
        ...user,
        unreadCount,
        lastMessage
      };
    });

    return NextResponse.json({ users: usersWithStats });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
