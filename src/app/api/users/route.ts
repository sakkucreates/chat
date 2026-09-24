import { NextResponse } from 'next/server';
import { getAllUsers, updateUser, getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeUserId = searchParams.get('userId');

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
        // Calculate unread messages sent TO activeUserId FROM this user
        const conversationMsgs = db.messages.filter(
          m => (m.senderId === user.id && m.receiverId === activeUserId) ||
               (m.senderId === activeUserId && m.receiverId === user.id)
        ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (conversationMsgs.length > 0) {
          lastMessage = conversationMsgs[conversationMsgs.length - 1];
        }

        unreadCount = db.messages.filter(
          m => m.senderId === user.id && m.receiverId === activeUserId && !m.read
        ).length;
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
