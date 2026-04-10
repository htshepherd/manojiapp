import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { handleError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const { account, password } = await req.json();

    if (!account || !password) {
      return NextResponse.json({ error: '账号和密码不能为空' }, { status: 400 });
    }

    const result = await db.query(
      `SELECT id, password_hash FROM users WHERE account = $1`, [account]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '账号或密码错误' }, { status: 401 });
    }

    await db.query(
      `UPDATE users SET last_active_at = NOW() WHERE id = $1`, [user.id]
    );

    const token = signToken(user.id);
    return NextResponse.json({ token, user: { id: user.id, account } });
  } catch (error) {
    return handleError(error);
  }
}
