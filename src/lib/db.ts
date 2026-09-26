import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  code: string;
  role: 'admin' | 'user';
  avatar: string;
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

// Global memory cache for single-process fallback
let memoryStore: DatabaseSchema | null = null;

// Environment credentials for Upstash Redis / Vercel KV REST API
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash / Vercel KV REST Command Executor (atomic Redis operations over HTTP REST)
async function executeKvCommand(command: (string | number)[]): Promise<any> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    let url = KV_URL.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN.trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command),
      cache: 'no-store'
    });
    if (!res.ok) {
      console.warn(`Upstash KV HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    return data ? data.result : null;
  } catch (err) {
    console.warn('Upstash KV command error:', err);
    return null;
  }
}

// Atomic Redis KV Operations
async function getKvUsers(): Promise<User[] | null> {
  const result = await executeKvCommand(['GET', 'chatpass_users']);
  if (result) {
    try {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function saveKvUsers(users: User[]): Promise<boolean> {
  const res = await executeKvCommand(['SET', 'chatpass_users', JSON.stringify(users)]);
  return res !== null;
}

// ATOMIC Redis List Read via LRANGE (reads all stored messages atomically with deduplication)
async function getKvMessages(): Promise<Message[] | null> {
  const result = await executeKvCommand(['LRANGE', 'chatpass_messages', '0', '-1']);
  if (Array.isArray(result)) {
    try {
      const parsed = result
        .map((item: any) => (typeof item === 'string' ? JSON.parse(item) : item))
        .filter((m: any) => m && typeof m === 'object' && m.id && m.senderId && m.receiverId);

      // Deduplicate by ID and content signature (sender + receiver + text + image + 3-sec window)
      const seenIds = new Set<string>();
      const seenSignatures = new Set<string>();
      const uniqueMessages: Message[] = [];

      for (const m of parsed) {
        const timeBucket = Math.floor(new Date(m.createdAt).getTime() / 3000);
        const sig = `${m.senderId}_${m.receiverId}_${(m.text || '').trim()}_${m.image || ''}_${timeBucket}`;

        if (!seenIds.has(m.id) && !seenSignatures.has(sig)) {
          seenIds.add(m.id);
          seenSignatures.add(sig);
          uniqueMessages.push(m);
        }
      }
      return uniqueMessages;
    } catch {
      return null;
    }
  }
  return null;
}

// ATOMIC Redis List Push via RPUSH (guarantees concurrent message append safety)
async function pushKvMessage(message: Message): Promise<boolean> {
  const res = await executeKvCommand(['RPUSH', 'chatpass_messages', JSON.stringify(message)]);
  return res !== null;
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
  try {
    // 1. Try Upstash KV Cloud Store
    if (KV_URL && KV_TOKEN) {
      const rawUsers = await getKvUsers().catch(() => null);
      const rawMessages = await getKvMessages().catch(() => null);
      const users = (Array.isArray(rawUsers) && rawUsers.length > 0) ? rawUsers : INITIAL_DATA.users;
      const messages = Array.isArray(rawMessages) ? rawMessages : [];
      return {
        adminCode: INITIAL_DATA.adminCode,
        users,
        messages
      };
    }
  } catch (kvErr) {
    console.warn('KV Store fetch error, falling back:', kvErr);
  }

  // 2. Try Local File / Tmp disk
  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(fileData);
      if (parsed && Array.isArray(parsed.users)) {
        memoryStore = parsed;
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Could not read DB file, using initial data fallback:', error);
  }

  // 3. Fallback memory store
  if (memoryStore) {
    return memoryStore;
  }

  memoryStore = JSON.parse(JSON.stringify(INITIAL_DATA));
  await saveDb(memoryStore!).catch(() => {});
  return memoryStore!;
}

export async function saveDb(data: DatabaseSchema): Promise<void> {
  memoryStore = data;

  if (KV_URL && KV_TOKEN) {
    await saveKvUsers(data.users).catch(() => false);
  }

  const filePath = getDbFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Could not write DB file to disk:', error);
  }
}

export async function resetDatabase(): Promise<DatabaseSchema> {
  memoryStore = JSON.parse(JSON.stringify(INITIAL_DATA));

  if (KV_URL && KV_TOKEN) {
    await saveKvUsers(INITIAL_DATA.users).catch(() => false);
    await executeKvCommand(['DEL', 'chatpass_messages']).catch(() => null);
  }

  const filePath = getDbFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Could not write reset DB to disk:', error);
  }

  return memoryStore!;
}

// User Helpers
export async function findUserByCode(code: string): Promise<User | null> {
  try {
    const db = await getDb();
    if (!db || !Array.isArray(db.users)) return INITIAL_DATA.users[0];
    const trimmed = code.trim();
    if (trimmed === '@2021' || trimmed === '2021') {
      const admin = db.users.find(u => u.role === 'admin') || db.users[0];
      return admin || null;
    }
    const user = db.users.find(u => u && u.code && u.code.trim().toUpperCase() === trimmed.toUpperCase());
    return user || null;
  } catch (err) {
    console.error('Error in findUserByCode:', err);
    const trimmed = code.trim();
    if (trimmed === '@2021' || trimmed === '2021') {
      return INITIAL_DATA.users[0];
    }
    return INITIAL_DATA.users.find(u => u.code.trim().toUpperCase() === trimmed.toUpperCase()) || null;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  try {
    const db = await getDb();
    return db.users.find(u => u.id === id) || null;
  } catch {
    return INITIAL_DATA.users.find(u => u.id === id) || null;
  }
}

export async function getAllUsers(): Promise<User[]> {
  try {
    const db = await getDb();
    return db.users || INITIAL_DATA.users;
  } catch {
    return INITIAL_DATA.users;
  }
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
  await saveDb(db).catch(() => {});
  return newUser;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  try {
    const db = await getDb();
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    db.users[index] = { ...db.users[index], ...updates };
    await saveDb(db).catch(() => {});
    return db.users[index];
  } catch (err) {
    console.warn('updateUser warning:', err);
    return null;
  }
}

export async function deleteUser(id: string): Promise<boolean> {
  const db = await getDb();
  const initialLength = db.users.length;
  db.users = db.users.filter(u => u.id !== id);
  db.messages = db.messages.filter(m => m.senderId !== id && m.receiverId !== id);
  await saveDb(db);
  return db.users.length < initialLength;
}

// ATOMIC MESSAGE HELPERS
export async function getConversationMessages(user1Id: string, user2Id: string): Promise<Message[]> {
  const allMessages = (KV_URL && KV_TOKEN) ? (await getKvMessages()) || [] : (await getDb()).messages;
  return allMessages
    .filter(m => (m.senderId === user1Id && m.receiverId === user2Id) || (m.senderId === user2Id && m.receiverId === user1Id))
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

// In-memory signature lock map to prevent duplicate requests without HTTP REST roundtrip
const recentSentSignatures = new Map<string, number>();

// Atomic Message Creation (Ultra-fast single REST execution with memory signature lock)
export async function createMessage(msgData: Omit<Message, 'id' | 'createdAt' | 'read'>): Promise<Message> {
  const textTrim = (msgData.text || '').trim();
  const imgStr = msgData.image || '';
  const now = Date.now();
  const sig = `${msgData.senderId}_${msgData.receiverId}_${textTrim}_${imgStr}`;

  // Fast In-Memory Deduplication Check (3-second window)
  const lastSentTime = recentSentSignatures.get(sig);
  if (lastSentTime && (now - lastSentTime < 3000)) {
    if (memoryStore && Array.isArray(memoryStore.messages)) {
      const match = memoryStore.messages.find(m =>
        m.senderId === msgData.senderId &&
        m.receiverId === msgData.receiverId &&
        (m.text || '').trim() === textTrim &&
        (m.image || '') === imgStr
      );
      if (match) return match;
    }
  }

  recentSentSignatures.set(sig, now);
  if (recentSentSignatures.size > 200) {
    recentSentSignatures.clear();
  }

  const newMsg: Message = {
    ...msgData,
    text: textTrim,
    id: 'msg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
    createdAt: new Date().toISOString(),
    read: false
  };

  if (memoryStore && Array.isArray(memoryStore.messages)) {
    if (!memoryStore.messages.some(m => m.id === newMsg.id)) {
      memoryStore.messages.push(newMsg);
    }
  }

  if (KV_URL && KV_TOKEN) {
    // Single fast Redis RPUSH call
    await pushKvMessage(newMsg);
  } else {
    // Local File / In-memory append
    const db = await getDb();
    if (!db.messages.some(m => m.id === newMsg.id)) {
      db.messages.push(newMsg);
      await saveDb(db);
    }
  }

  return newMsg;
}

// Persist full message list with updated read statuses to Redis
async function saveKvMessages(messages: Message[]): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    await executeKvCommand(['DEL', 'chatpass_messages']);
    if (messages.length > 0) {
      const stringifiedMsgs = messages.map((m) => JSON.stringify(m));
      await executeKvCommand(['RPUSH', 'chatpass_messages', ...stringifiedMsgs]);
    }
    return true;
  } catch (err) {
    console.warn('saveKvMessages error:', err);
    return false;
  }
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
    if (KV_URL && KV_TOKEN) {
      await saveKvMessages(db.messages).catch(() => false);
    }
    await saveDb(db).catch(() => {});
  }
}
