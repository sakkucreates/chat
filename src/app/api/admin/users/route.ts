import { NextResponse } from 'next/server';
import { createUser, deleteUser, updateUser, getAllUsers, findUserByCode } from '@/lib/db';

// Simple passcode generator
function generatePasscode(length: number = 4): string {
  const chars = '1234567890';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, code, role, avatar, notes } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'User name is required' }, { status: 400 });
    }

    let finalCode = code ? code.trim() : generatePasscode(4);

    // Check code uniqueness
    const existing = await findUserByCode(finalCode);
    if (existing) {
      if (code) {
        return NextResponse.json({ error: 'This access code is already in use' }, { status: 400 });
      } else {
        finalCode = generatePasscode(6);
      }
    }

    const newUser = await createUser({
      name: name.trim(),
      code: finalCode,
      role: role || 'user',
      avatar: avatar || '👤',
      notes: notes || ''
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, code, avatar, notes, role } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (code) {
      const existing = await findUserByCode(code);
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Access code already in use by another user' }, { status: 400 });
      }
    }

    const updated = await updateUser(id, {
      ...(name && { name: name.trim() }),
      ...(code && { code: code.trim() }),
      ...(avatar && { avatar }),
      ...(notes !== undefined && { notes }),
      ...(role && { role })
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const success = await deleteUser(id);
    return NextResponse.json({ success });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
