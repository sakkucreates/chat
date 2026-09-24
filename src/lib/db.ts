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

// Clean initial state (Only Admin account)
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
    }
  ],
  messages: []
};

// Global memory cache for serverless invocation lifecycle persistence
let memoryStore: DatabaseSchema | null = null;

// Environment credentials for Upstash Redis / Vercel KV REST API
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash / Vercel KV REST operations
async function getKvDb(): Promise<DatabaseSchema | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/chatpass_db`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: 'no-store'
    });
    const data = await res.json();
    if (data && data.result) {
      const parsed = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      return parsed;
    }
  } catch (err) {
    console.warn('Upstash KV read error:', err);
  }
  return null;
}

async function saveKvDb(data: DatabaseSchema): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const res = await fetch(`${KV_URL}/set/chatpass_db`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(JSON.stringify(data)),
      cache: 'no-store'
    });
    return res.ok;
  } catch (err) {
    console.warn('Upstash KV write error:', err);
    return false;
  }
}

// Determine DB File path for local disk fallback
function getDbFilePath(): string {
  if (process.env.VERCEL) {
    return path.join('/tmp', 'chat_db.json');
  }
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      return path.join('/tmp', 'chat_db.json');
    }
  }
  return path.join(dataDir, 'db.json');
}

export async function getDb(): Promise<DatabaseSchema> {
  // 1. Try Upstash / Vercel KV Cloud Store if configured
  if (KV_URL && KV_TOKEN) {
    const kvData = await getKvDb();
    if (kvData) {
      memoryStore = kvData;
      return kvData;
    }
  }

  // 2. Try memory cache
  if (memoryStore) {
    return memoryStore;
  }

  // 3. Try Local File / Tmp disk
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
  await saveDb(memoryStore!);
  return memoryStore!;
}

export async function saveDb(data: DatabaseSchema): Promise<void> {
  memoryStore = data;

  // Save to Upstash KV if configured
  if (KV_URL && KV_TOKEN) {
    await saveKvDb(data);
  }

  // Save to disk
  const filePath = getDbFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Could not write DB file to disk:', error);
  }
}

export async function resetDatabase(): Promise<DatabaseSchema> {
  memoryStore = JSON.parse(JSON.stringify(INITIAL_DATA));
  await saveDb(memoryStore!);
  return memoryStore!;
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
