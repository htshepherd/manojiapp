import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const userId = await requireAuth(req);
    const result = await db.query(
      `SELECT id, account, last_active_at FROM users WHERE id = $1`, [userId]
    );
    return NextResponse.json({ user: result.rows[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.status || 500 });
  }
}
