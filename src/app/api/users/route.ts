import { NextResponse } from 'next/server';
import { getAllUsers, updateUser, getDb, isMessageRead, getKvReadReceipts, Message } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

    const users = await getAllUsers(activeUserId || undefined);
    const db = await getDb();
    const receipts = await getKvReadReceipts().catch(() => ({}));

    // Map users with last message info & unread counts relative to activeUserId
    const { decryptText } = await import('@/lib/crypto');
    const usersWithStats = await Promise.all(users.map(async user => {
      let unreadCount = 0;
      let lastMessage: Message | null = null;
      let unreadMessages: Message[] = [];

      if (activeUserId) {
        // Find all non-deleted messages in conversation
        const conversationMsgs = db.messages.filter(
          m => ((m.senderId === user.id && m.receiverId === activeUserId) ||
               (m.senderId === activeUserId && m.receiverId === user.id)) &&
               (!m.deletedFor || !m.deletedFor.includes(activeUserId))
        ).sort((a, b) => {
          const tA = new Date(a.createdAt).getTime();
          const tB = new Date(b.createdAt).getTime();
          if (tA !== tB) return tA - tB;
          return (a.id || '').localeCompare(b.id || '');
        });

        if (conversationMsgs.length > 0) {
          const rawLast = conversationMsgs[conversationMsgs.length - 1];
          if (rawLast.text && rawLast.text.startsWith('ENC:')) {
            const decrypted = await decryptText(rawLast.text, rawLast.senderId, rawLast.receiverId);
            lastMessage = { ...rawLast, text: decrypted || '' };
          } else {
            lastMessage = rawLast;
          }
        }

        // Unread messages sent FROM this contact TO activeUserId
        if (activeContactId && user.id === activeContactId) {
          unreadCount = 0;
          unreadMessages = [];
        } else {
          const rawUnreads = db.messages.filter(
            m => m.senderId === user.id &&
                 m.receiverId === activeUserId &&
                 !isMessageRead(m, receipts) &&
                 (!m.deletedFor || !m.deletedFor.includes(activeUserId))
          ).sort((a, b) => {
            const tA = new Date(a.createdAt).getTime();
            const tB = new Date(b.createdAt).getTime();
            if (tA !== tB) return tA - tB;
            return (a.id || '').localeCompare(b.id || '');
          });

          unreadCount = rawUnreads.length;
          unreadMessages = await Promise.all(rawUnreads.map(async (m) => {
            if (m.text && m.text.startsWith('ENC:')) {
              const decrypted = await decryptText(m.text, m.senderId, m.receiverId);
              return { ...m, text: decrypted || '' };
            }
            return m;
          }));
        }
      }

      return {
        ...user,
        unreadCount,
        lastMessage,
        unreadMessages
      };
    }));

    return NextResponse.json({ users: usersWithStats }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
