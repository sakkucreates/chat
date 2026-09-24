import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  code: string;
  role: 'admin' | 'user';
  avatar: string; // Emoji or image URL
  status: 'online' | 'offline';
  lastSeen: string;
  createdAt: string;
  notes?: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  image?: string;
  createdAt: string;
  read: boolean;
}

export interface DatabaseSchema {
  users: User[];
  messages: Message[];
  adminCode: string;
}

// Default initial state
const INITIAL_DATA: DatabaseSchema = {
  adminCode: process.env.ADMIN_CODE || 'ADMIN123',
  users: [
    {
      id: 'admin_root',
      name: 'Admin / Support',
      code: process.env.ADMIN_CODE || 'ADMIN123',
      role: 'admin',
      avatar: '🛡️',
      status: 'online',
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      notes: 'System Administrator Account'
    },
    {
      id: 'user_demo1',
      name: 'Alex Johnson',
      code: '1001',
      role: 'user',
      avatar: '👨‍💻',
      status: 'online',
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      notes: 'Sample Demo Account 1'
    },
    {
      id: 'user_demo2',
      name: 'Sarah Connor',
      code: '2002',
      role: 'user',
      avatar: '👩‍💼',
      status: 'offline',
      lastSeen: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      createdAt: new Date().toISOString(),
      notes: 'Sample Demo Account 2'
    }
  ],
  messages: [
    {
      id: 'msg_init_1',
      senderId: 'admin_root',
      receiverId: 'user_demo1',
      text: 'Welcome to ChatPass! Your account has been created by the Admin.',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      read: true
    },
    {
      id: 'msg_init_2',
      senderId: 'user_demo1',
      receiverId: 'admin_root',
      text: 'Thanks! This chat setup is super easy to use without login.',
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      read: true
    },
    {
      id: 'msg_init_3',
      senderId: 'user_demo1',
      receiverId: 'user_demo2',
      text: 'Hey Sarah, are you online?',
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      read: false
    }
  ]
};

// Global memory cache for serverless invocation lifecycle persistence
let memoryStore: DatabaseSchema | null = null;

// Determine DB File path (support Vercel /tmp or local project directory)
function getDbFilePath(): string {
  if (process.env.VERCEL) {
    return path.join('/tmp', 'chat_db.json');
  }
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      // Fallback to tmp
      return path.join('/tmp', 'chat_db.json');
    }
  }
  return path.join(dataDir, 'db.json');
}

export async function getDb(): Promise<DatabaseSchema> {
  if (memoryStore) {
    return memoryStore;
  }

  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      memoryStore = JSON.parse(fileData);
      return memoryStore!;
    }
  } catch (error) {
    console.warn('Could not read DB file, using initial data fallback:', error);
  }

  memoryStore = JSON.parse(JSON.stringify(INITIAL_DATA));
  saveDb(memoryStore!);
  return memoryStore!;
}

export async function saveDb(data: DatabaseSchema): Promise<void> {
  memoryStore = data;
  const filePath = getDbFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Could not write DB file to disk:', error);
  }
}

// User Helpers
export async function findUserByCode(code: string): Promise<User | null> {
  const db = await getDb();
  const trimmed = code.trim().toUpperCase();
  const user = db.users.find(u => u.code.trim().toUpperCase() === trimmed);
  return user || null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getDb();
  return db.users.find(u => u.id === id) || null;
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  return db.users;
}

export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'status' | 'lastSeen'>): Promise<User> {
  const db = await getDb();
  const newUser: User = {
    ...userData,
    id: 'usr_' + Math.random().toString(36).substring(2, 9),
    status: 'offline',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);
  await saveDb(db);
  return newUser;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const db = await getDb();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return null;

  db.users[index] = { ...db.users[index], ...updates };
  await saveDb(db);
  return db.users[index];
}

export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDb();
  const initialLength = db.users.length;
  db.users = db.users.filter(u => u.id !== id);
  // Also clean up messages involving this user
  db.messages = db.messages.filter(m => m.senderId !== id && m.receiverId !== id);
  await saveDb(db);
  return db.users.length < initialLength;
}

// Message Helpers
export async function getConversationMessages(user1Id: string, user2Id: string): Promise<Message[]> {
  const db = await getDb();
  return db.messages.filter(
    m => (m.senderId === user1Id && m.receiverId === user2Id) || (m.senderId === user2Id && m.receiverId === user1Id)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function createMessage(msgData: Omit<Message, 'id' | 'createdAt' | 'read'>): Promise<Message> {
  const db = await getDb();
  const newMsg: Message = {
    ...msgData,
    id: 'msg_' + Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    read: false
  };
  db.messages.push(newMsg);
  await saveDb(db);
  return newMsg;
}

export async function markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
  const db = await getDb();
  let updated = false;
  db.messages.forEach(m => {
    if (m.senderId === senderId && m.receiverId === receiverId && !m.read) {
      m.read = true;
      updated = true;
    }
  });
  if (updated) {
    await saveDb(db);
  }
}
