import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

interface UserRow {
  id: string;
  account: string;
  last_active_at: string;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const result = await db.query<UserRow>(
      `SELECT id, account, last_active_at FROM users WHERE id = $1`, [userId]
    );
    return NextResponse.json({ user: result.rows[0] });
  } catch (err: unknown) {
    const error = err as { message?: string; status?: number };
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
