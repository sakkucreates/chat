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
  typingTo?: string;
  typingAt?: number;
  isTyping?: boolean;
  unreadCount?: number;
  lastMessage?: Message | null;
  unreadMessages?: Message[];
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  image?: string;
  video?: string;
  audio?: string;
  createdAt: string;
  read: boolean;
  reactions?: { emoji: string; userId: string }[];
  deletedFor?: string[];
}

export interface DatabaseSchema {
  users: User[];
  messages: Message[];
  adminCode: string;
}

// Seeded initial state with all project accounts
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
      id: 'usr_bita',
      name: 'Bita',
      code: '2021',
      role: 'user',
      avatar: '👩‍💼',
      status: 'offline',
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      notes: 'Bita Account'
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
      let parsed = typeof result === 'string' ? JSON.parse(result) : result;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {}
      }
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

// ATOMIC Redis List Read via LRANGE (reads all stored messages atomically with deduplication by unique ID)
async function getKvMessages(): Promise<Message[] | null> {
  const result = await executeKvCommand(['LRANGE', 'chatpass_messages', '0', '-1']);
  if (Array.isArray(result)) {
    try {
      const parsed = result
        .map((item: any) => {
          try {
            let p = typeof item === 'string' ? JSON.parse(item) : item;
            if (typeof p === 'string') {
              try { p = JSON.parse(p); } catch {}
            }
            return p;
          } catch {
            return null;
          }
        })
        .filter((m: any) => m && typeof m === 'object' && m.id && m.senderId && m.receiverId);

      // Deduplicate strictly by ID only (never drop messages with identical text or quick timestamps)
      const seenIds = new Set<string>();
      const uniqueMessages: Message[] = [];

      for (const m of parsed) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
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

// Separate KV key for read message IDs (guarantees accurate unread counts without timestamp race conditions)
let memoryReadReceipts: Record<string, boolean> = {};

export async function getKvReadReceipts(): Promise<Record<string, boolean>> {
  if (!KV_URL || !KV_TOKEN) return memoryReadReceipts;
  try {
    const res = await executeKvCommand(['GET', 'chatpass_read_receipts']);
    if (res) {
      let parsed = typeof res === 'string' ? JSON.parse(res) : res;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch {}
      }
      if (parsed && typeof parsed === 'object') {
        const cleaned: Record<string, boolean> = { ...memoryReadReceipts };
        // Accept boolean ID map, or ignore legacy timestamp strings
        for (const [k, v] of Object.entries(parsed)) {
          if (v === true || v === 'true' || v === 1) {
            cleaned[k] = true;
          }
        }
        return cleaned;
      }
    }
  } catch {}
  return memoryReadReceipts;
}

export async function setKvReadReceipts(messageIds: string[]): Promise<void> {
  if (!messageIds || messageIds.length === 0) return;
  for (const id of messageIds) {
    memoryReadReceipts[id] = true;
  }
  if (!KV_URL || !KV_TOKEN) return;
  try {
    const receipts = await getKvReadReceipts();
    for (const id of messageIds) {
      receipts[id] = true;
    }
    await executeKvCommand(['SET', 'chatpass_read_receipts', JSON.stringify(receipts)]);
  } catch (err) {
    console.warn('setKvReadReceipts error:', err);
  }
}

export function isMessageRead(m: Message, receipts?: Record<string, boolean>): boolean {
  if (m.read) return true;
  const map = receipts || memoryReadReceipts;
  return Boolean(map && map[m.id]);
}

// Global deleted message tracking (guarantees deleted messages stay deleted and active messages never disappear)
let memoryDeletedIds = new Set<string>();

export async function getDeletedMessageIds(): Promise<Set<string>> {
  if (KV_URL && KV_TOKEN) {
    try {
      const res = await executeKvCommand(['GET', 'chatpass_deleted_ids']);
      if (res) {
        let parsed = typeof res === 'string' ? JSON.parse(res) : res;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch {}
        }
        if (Array.isArray(parsed)) {
          parsed.forEach((id: string) => memoryDeletedIds.add(id));
        }
      }
    } catch {}
  }
  return memoryDeletedIds;
}

export async function recordDeletedMessageIds(ids: string[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  ids.forEach(id => memoryDeletedIds.add(id));
  if (KV_URL && KV_TOKEN) {
    try {
      await executeKvCommand(['SET', 'chatpass_deleted_ids', JSON.stringify(Array.from(memoryDeletedIds))]);
    } catch {}
  }
}

// Separate KV key for reactions — completely independent from message list operations
async function getKvReactions(): Promise<Record<string, { emoji: string; userId: string }[]>> {
  if (!KV_URL || !KV_TOKEN) return {};
  try {
    const result = await executeKvCommand(['GET', 'chatpass_reactions']);
    if (result) {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch {
    // ignore
  }
  return {};
}

async function saveKvReaction(
  messageId: string,
  reactions: { emoji: string; userId: string }[]
): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    // Read current reactions map, update just this message's reactions, write back
    const current = await getKvReactions();
    if (reactions.length === 0) {
      delete current[messageId];
    } else {
      current[messageId] = reactions;
    }
    const res = await executeKvCommand(['SET', 'chatpass_reactions', JSON.stringify(current)]);
    return res !== null;
  } catch (err) {
    console.warn('saveKvReaction error:', err);
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
  let cloudMessages: Message[] | null = null;
  let cloudUsers: User[] | null = null;

  if (KV_URL && KV_TOKEN) {
    try {
      cloudUsers = await getKvUsers().catch(() => null);
      cloudMessages = await getKvMessages().catch(() => null);
    } catch (kvErr) {
      console.warn('KV Store fetch error, falling back:', kvErr);
    }
  }

  // Read disk fallback file
  let diskData: DatabaseSchema | null = null;
  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      diskData = JSON.parse(fileData);
    }
  } catch {}

  // Merge users: prioritize cloudUsers -> diskData -> INITIAL_DATA
  let users: User[] = (Array.isArray(cloudUsers) && cloudUsers.length > 0)
    ? [...cloudUsers]
    : (diskData && Array.isArray(diskData.users) && diskData.users.length > 0)
    ? [...diskData.users]
    : [...INITIAL_DATA.users];

  // Filter out deleted Sakku / Saaku account
  users = users.filter(u => 
    u.id !== 'usr_sakku' && 
    u.name?.trim().toLowerCase() !== 'sakku' && 
    u.name?.trim().toLowerCase() !== 'saaku'
  );

  // Auto-merge seeded accounts if missing so all project accounts are always displayed
  let usersNeedSave = false;
  for (const seeded of INITIAL_DATA.users) {
    const exists = users.some(u => 
      u.id === seeded.id || 
      u.code?.trim().toUpperCase() === seeded.code.trim().toUpperCase() ||
      u.name?.trim().toLowerCase() === seeded.name.trim().toLowerCase()
    );
    if (!exists) {
      users.push(seeded);
      usersNeedSave = true;
    }
  }

  if (usersNeedSave && KV_URL && KV_TOKEN) {
    await saveKvUsers(users).catch(() => false);
  }

  // Merge messages: combine candidate sources without dropping any message
  const allRawMessages: Message[] = [];
  const seenIds = new Set<string>();
  const deleted = await getDeletedMessageIds().catch(() => new Set<string>());

  const candidateLists = [
    Array.isArray(cloudMessages) ? cloudMessages : [],
    (diskData && Array.isArray(diskData.messages)) ? diskData.messages : [],
    (memoryStore && Array.isArray(memoryStore.messages)) ? memoryStore.messages : []
  ];

  for (const list of candidateLists) {
    for (const m of list) {
      if (m && m.id && !seenIds.has(m.id) && !deleted.has(m.id)) {
        seenIds.add(m.id);
        allRawMessages.push(m);
      }
    }
  }

  // Strict sorting by createdAt timestamp, then by unique ID
  allRawMessages.sort((a, b) => {
    const timeDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (timeDiff !== 0) return timeDiff;
    return (a.id || '').localeCompare(b.id || '');
  });

  const receipts = await getKvReadReceipts().catch(() => ({}));
  const messages = allRawMessages.map(m => ({
    ...m,
    read: isMessageRead(m, receipts)
  }));

  const result: DatabaseSchema = {
    adminCode: INITIAL_DATA.adminCode,
    users,
    messages
  };

  memoryStore = result;
  return result;
}

// Atomically save users ONLY without touching or overwriting messages (prevents heartbeat race conditions)
export async function saveUsers(users: User[]): Promise<void> {
  if (memoryStore) {
    memoryStore.users = users;
  }

  if (KV_URL && KV_TOKEN) {
    await saveKvUsers(users).catch(() => false);
  }

  const filePath = getDbFilePath();
  try {
    let currentData: DatabaseSchema | null = null;
    if (fs.existsSync(filePath)) {
      try {
        const fileData = fs.readFileSync(filePath, 'utf-8');
        currentData = JSON.parse(fileData);
      } catch {}
    }
    if (!currentData) {
      currentData = { adminCode: INITIAL_DATA.adminCode, users, messages: [] };
    } else {
      currentData.users = users;
    }
    fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Could not write users to disk:', error);
  }
}

export async function saveDb(data: DatabaseSchema): Promise<void> {
  const deleted = await getDeletedMessageIds().catch(() => new Set<string>());

  // Merge messages: ensure no active message is dropped
  if (memoryStore && Array.isArray(memoryStore.messages)) {
    const seen = new Set(data.messages.map(m => m.id));
    for (const m of memoryStore.messages) {
      if (m && m.id && !seen.has(m.id) && !deleted.has(m.id)) {
        data.messages.push(m);
        seen.add(m.id);
      }
    }
  }
  memoryStore = data;

  if (KV_URL && KV_TOKEN) {
    await saveKvUsers(data.users).catch(() => false);
  }

  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      try {
        const fileData = fs.readFileSync(filePath, 'utf-8');
        const diskData = JSON.parse(fileData);
        if (diskData && Array.isArray(diskData.messages)) {
          const seen = new Set(data.messages.map(m => m.id));
          for (const m of diskData.messages) {
            if (m && m.id && !seen.has(m.id) && !deleted.has(m.id)) {
              data.messages.push(m);
              seen.add(m.id);
            }
          }
        }
      } catch {}
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.warn('Could not write DB file to disk:', error);
  }
}

export async function resetDatabase(): Promise<DatabaseSchema> {
  memoryStore = JSON.parse(JSON.stringify(INITIAL_DATA));
  memoryReadReceipts = {};

  if (KV_URL && KV_TOKEN) {
    await saveKvUsers(INITIAL_DATA.users).catch(() => false);
    await executeKvCommand(['DEL', 'chatpass_messages']).catch(() => null);
    await executeKvCommand(['DEL', 'chatpass_read_receipts']).catch(() => null);
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
    const raw = code ? code.trim() : '';
    if (!raw) return null;

    const normalized = raw.replace(/^@+/, '').toUpperCase();

    // 1. Try code match (with or without @ prefix, case-insensitive)
    let user = db.users.find(u => {
      if (!u || !u.code) return false;
      const uNorm = u.code.trim().replace(/^@+/, '').toUpperCase();
      return uNorm === normalized || u.code.trim().toUpperCase() === raw.toUpperCase();
    });

    // 2. Fallback: try user name match (case-insensitive)
    if (!user) {
      user = db.users.find(u => {
        if (!u || !u.name) return false;
        const nameNorm = u.name.trim().replace(/^@+/, '').toUpperCase();
        return nameNorm === normalized || u.name.trim().toUpperCase() === raw.toUpperCase();
      });
    }

    // 3. Fallback: check admin codes if not found yet
    if (!user && (normalized === 'ADMIN123' || normalized === 'ADMIN')) {
      user = db.users.find(u => u.role === 'admin') || db.users[0];
    }

    // 4. Fallback: check 2021 login code for chat
    if (!user && (normalized === '2021')) {
      user = db.users.find(u => u.code === '2021' || u.name?.toLowerCase() === 'bita') || INITIAL_DATA.users[1];
    }

    return user || null;
  } catch (err) {
    console.error('Error in findUserByCode:', err);
    const raw = code ? code.trim() : '';
    const normalized = raw.replace(/^@+/, '').toUpperCase();
    return INITIAL_DATA.users.find(u => 
      u.code.trim().replace(/^@+/, '').toUpperCase() === normalized ||
      u.name.trim().toUpperCase() === normalized
    ) || (normalized === '2021' ? INITIAL_DATA.users[1] : null);
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

export async function getAllUsers(forUserId?: string): Promise<User[]> {
  try {
    const db = await getDb();
    const rawUsers = db.users || INITIAL_DATA.users;
    const now = Date.now();

    // Dynamically calculate online/offline status based on lastSeen heartbeat (6-second threshold)
    return rawUsers.map((user) => {
      const lastSeenTime = user.lastSeen ? new Date(user.lastSeen).getTime() : 0;
      const isOnline = (now - lastSeenTime) < 6000;
      const isTyping = Boolean(
        forUserId &&
        user.typingTo === forUserId &&
        user.typingAt &&
        (now - user.typingAt) < 3500
      );
      return {
        ...user,
        status: isOnline ? 'online' : 'offline',
        isTyping
      };
    });
  } catch {
    return INITIAL_DATA.users;
  }
}

export async function setTypingStatus(userId: string, targetId: string, isTyping: boolean): Promise<void> {
  const db = await getDb();
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.typingTo = isTyping ? targetId : undefined;
    user.typingAt = isTyping ? Date.now() : undefined;
  }
}

export async function createUser(userData: Omit<User, 'id' | 'createdAt' | 'status' | 'lastSeen'>): Promise<User> {
  const db = await getDb();
  const cleanCode = userData.code 
    ? userData.code.trim().replace(/^@+/, '') 
    : Math.floor(1000 + Math.random() * 9000).toString();

  const newUser: User = {
    ...userData,
    code: cleanCode,
    id: 'usr_' + Math.random().toString(36).substring(2, 9),
    status: 'offline',
    lastSeen: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  if (!db.users.some(u => u.id === newUser.id)) {
    db.users.push(newUser);
  }
  await saveDb(db);
  return newUser;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  try {
    const db = await getDb();
    const index = db.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    db.users[index] = { ...db.users[index], ...updates };
    // Save only users so periodic heartbeats never touch or overwrite messages
    await saveUsers(db.users).catch(() => {});
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
export async function getConversationMessages(user1Id: string, user2Id: string, viewerId?: string): Promise<Message[]> {
  let allMessages: Message[] = [];
  if (KV_URL && KV_TOKEN) {
    const kvMsgs = await getKvMessages().catch(() => null);
    if (Array.isArray(kvMsgs) && kvMsgs.length > 0) {
      allMessages = kvMsgs;
    } else {
      // Fallback to getDb so we never return an empty array due to transient KV latency or failure
      const db = await getDb();
      allMessages = db.messages;
    }
  } else {
    const db = await getDb();
    allMessages = db.messages;
  }

  const deleted = await getDeletedMessageIds().catch(() => new Set<string>());
  let msgs = allMessages
    .filter(m => !deleted.has(m.id))
    .filter(m => (m.senderId === user1Id && m.receiverId === user2Id) || (m.senderId === user2Id && m.receiverId === user1Id))
    .sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      if (tA !== tB) return tA - tB;
      return (a.id || '').localeCompare(b.id || '');
    });

  if (viewerId) {
    msgs = msgs.filter(m => !m.deletedFor || !m.deletedFor.includes(viewerId));
  }

  // Auto-clean/decrypt any legacy encrypted messages
  try {
    const { decryptText } = await import('./crypto');
    msgs = await Promise.all(
      msgs.map(async (m) => {
        if (m.text && m.text.startsWith('ENC:')) {
          const decrypted = await decryptText(m.text, m.senderId, m.receiverId);
          return {
            ...m,
            text: decrypted || ''
          };
        }
        return m;
      })
    );
  } catch {
    // If decryption module cannot run in DB worker, safely fallback
  }

  // Attach read status from atomic read receipts
  const receipts = await getKvReadReceipts().catch(() => ({}));
  msgs = msgs.map(m => ({
    ...m,
    read: isMessageRead(m, receipts)
  }));

  // Merge reactions from separate KV store (avoids race condition with message polling)
  if (KV_URL && KV_TOKEN) {
    const kvReactions = await getKvReactions().catch(() => ({} as Record<string, { emoji: string; userId: string }[]>));
    return msgs.map(m => ({
      ...m,
      reactions: kvReactions[m.id] || m.reactions || []
    }));
  }
  return msgs;
}

// Atomic Message Creation (guarantees every message is saved without dropping consecutive messages)
export async function createMessage(msgData: Omit<Message, 'id' | 'createdAt' | 'read'>): Promise<Message> {
  const textTrim = (msgData.text || '').trim();
  const now = Date.now();

  const newMsg: Message = {
    ...msgData,
    text: textTrim,
    id: `msg_${now}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date(now).toISOString(),
    read: false
  };

  // Always append to memoryStore
  if (memoryStore && Array.isArray(memoryStore.messages)) {
    if (!memoryStore.messages.some(m => m.id === newMsg.id)) {
      memoryStore.messages.push(newMsg);
    }
  }

  // Always append to local disk file
  const filePath = getDbFilePath();
  try {
    let currentData: DatabaseSchema | null = null;
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      currentData = JSON.parse(fileData);
    }
    if (!currentData || !Array.isArray(currentData.messages)) {
      currentData = { adminCode: INITIAL_DATA.adminCode, users: INITIAL_DATA.users, messages: [] };
    }
    if (!currentData.messages.some((m: any) => m.id === newMsg.id)) {
      currentData.messages.push(newMsg);
      fs.writeFileSync(filePath, JSON.stringify(currentData, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('Could not write message to disk fallback:', err);
  }

  // Also push to Upstash KV Cloud Store if available
  if (KV_URL && KV_TOKEN) {
    await pushKvMessage(newMsg).catch(() => false);
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

// Mark messages as read using atomic message-ID receipts (never deletes or overwrites the message list!)
export async function markMessagesAsRead(senderId: string, receiverId: string): Promise<void> {
  const db = await getDb();
  const unreadTargetMsgs = db.messages.filter(
    m => m.senderId === senderId && m.receiverId === receiverId
  );
  const idsToMark = unreadTargetMsgs.map(m => m.id);

  if (idsToMark.length > 0) {
    await setKvReadReceipts(idsToMark);
    unreadTargetMsgs.forEach(m => { m.read = true; });
  }

  if (memoryStore && Array.isArray(memoryStore.messages)) {
    memoryStore.messages.forEach(m => {
      if (m.senderId === senderId && m.receiverId === receiverId) {
        m.read = true;
      }
    });
  }
}

export async function clearConversationMessages(user1Id: string, user2Id: string): Promise<boolean> {
  const db = await getDb();
  const targetMsgs = db.messages.filter(
    m => (m.senderId === user1Id && m.receiverId === user2Id) || (m.senderId === user2Id && m.receiverId === user1Id)
  );
  const targetIds = targetMsgs.map(m => m.id);
  await recordDeletedMessageIds(targetIds);

  db.messages = db.messages.filter(
    m => !((m.senderId === user1Id && m.receiverId === user2Id) || (m.senderId === user2Id && m.receiverId === user1Id))
  );

  if (memoryStore && Array.isArray(memoryStore.messages)) {
    memoryStore.messages = memoryStore.messages.filter(
      m => !((m.senderId === user1Id && m.receiverId === user2Id) || (m.senderId === user2Id && m.receiverId === user1Id))
    );
  }

  if (KV_URL && KV_TOKEN) {
    await saveKvMessages(db.messages).catch(() => false);
  }

  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const diskData = JSON.parse(fileData);
      if (diskData && Array.isArray(diskData.messages)) {
        diskData.messages = diskData.messages.filter(
          (m: any) => !((m.senderId === user1Id && m.receiverId === user2Id) || (m.senderId === user2Id && m.receiverId === user1Id))
        );
        fs.writeFileSync(filePath, JSON.stringify(diskData, null, 2), 'utf-8');
      }
    }
  } catch {}

  return true;
}

export async function deleteMessage(messageId: string): Promise<boolean> {
  await recordDeletedMessageIds([messageId]);

  const db = await getDb();
  const prevLen = db.messages.length;
  db.messages = db.messages.filter(m => m.id !== messageId);

  if (memoryStore && Array.isArray(memoryStore.messages)) {
    memoryStore.messages = memoryStore.messages.filter(m => m.id !== messageId);
  }

  if (KV_URL && KV_TOKEN) {
    await saveKvMessages(db.messages).catch(() => false);
    try {
      const kvReactions = await getKvReactions().catch(() => ({} as Record<string, { emoji: string; userId: string }[]>));
      if (kvReactions[messageId]) {
        delete kvReactions[messageId];
        await executeKvCommand(['SET', 'chatpass_reactions', JSON.stringify(kvReactions)]);
      }
    } catch {}
  }

  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const diskData = JSON.parse(fileData);
      if (diskData && Array.isArray(diskData.messages)) {
        diskData.messages = diskData.messages.filter((m: any) => m.id !== messageId);
        fs.writeFileSync(filePath, JSON.stringify(diskData, null, 2), 'utf-8');
      }
    }
  } catch {}

  return db.messages.length < prevLen;
}

export async function deleteMessageForMe(messageId: string, userId: string): Promise<boolean> {
  const db = await getDb();
  let found = false;
  db.messages.forEach(m => {
    if (m.id === messageId) {
      if (!m.deletedFor) m.deletedFor = [];
      if (!m.deletedFor.includes(userId)) {
        m.deletedFor.push(userId);
        found = true;
      }
    }
  });

  if (memoryStore && Array.isArray(memoryStore.messages)) {
    memoryStore.messages.forEach(m => {
      if (m.id === messageId) {
        if (!m.deletedFor) m.deletedFor = [];
        if (!m.deletedFor.includes(userId)) {
          m.deletedFor.push(userId);
          found = true;
        }
      }
    });
  }

  if (KV_URL && KV_TOKEN) {
    await saveKvMessages(db.messages).catch(() => false);
  }

  const filePath = getDbFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const diskData = JSON.parse(fileData);
      if (diskData && Array.isArray(diskData.messages)) {
        diskData.messages.forEach((m: any) => {
          if (m.id === messageId) {
            if (!m.deletedFor) m.deletedFor = [];
            if (!m.deletedFor.includes(userId)) m.deletedFor.push(userId);
          }
        });
        fs.writeFileSync(filePath, JSON.stringify(diskData, null, 2), 'utf-8');
      }
    }
  } catch {}

  return found;
}

// Add or toggle an emoji reaction on a message
// Reactions are stored in a SEPARATE KV key to avoid race conditions with message polling
export async function addReactionToMessage(
  messageId: string,
  userId: string,
  emoji: string
): Promise<Message | null> {
  // Step 1: Get current reactions for this message from the separate reactions store
  let reactions: { emoji: string; userId: string }[] = [];

  if (KV_URL && KV_TOKEN) {
    const kvReactions = await getKvReactions().catch(() => ({} as Record<string, { emoji: string; userId: string }[]>));
    reactions = kvReactions[messageId] ? [...kvReactions[messageId]] : [];
  } else {
    // Fallback: read from message in DB
    const db = await getDb();
    const msg = db.messages.find(m => m.id === messageId);
    if (!msg) return null;
    reactions = msg.reactions ? [...msg.reactions] : [];
  }

  // Step 2: Toggle / update the reaction
  const existingIndex = reactions.findIndex(r => r.userId === userId && r.emoji === emoji);
  if (existingIndex !== -1) {
    // Same emoji clicked again → remove it
    reactions.splice(existingIndex, 1);
  } else {
    // Replace any existing reaction from same user, or add new
    const sameUserIndex = reactions.findIndex(r => r.userId === userId);
    if (sameUserIndex !== -1) {
      reactions[sameUserIndex] = { emoji, userId };
    } else {
      reactions.push({ emoji, userId });
    }
  }

  // Step 3: Save ONLY to the separate reactions KV key (no touching message list at all)
  if (KV_URL && KV_TOKEN) {
    await saveKvReaction(messageId, reactions).catch(() => false);
  } else {
    // Fallback: update message in DB directly
    const db = await getDb();
    const index = db.messages.findIndex(m => m.id === messageId);
    if (index !== -1) {
      db.messages[index] = { ...db.messages[index], reactions };
      if (memoryStore && Array.isArray(memoryStore.messages)) {
        const memIdx = memoryStore.messages.findIndex(m => m.id === messageId);
        if (memIdx !== -1) {
          memoryStore.messages[memIdx] = { ...memoryStore.messages[memIdx], reactions };
        }
      }
      await saveDb(db).catch(() => {});
    }
  }

  // Return a synthetic message-like object for the API response
  return { id: messageId, reactions } as unknown as Message;
}
