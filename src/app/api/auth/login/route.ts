import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { db } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { handleError } from '@/lib/api-response';

// 问题 40: 内存级登录限速保护
const loginAttempts = new Map<string, { count: number, resetAt: number }>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const attempt = loginAttempts.get(ip);

    if (attempt && attempt.resetAt > now) {
      if (attempt.count >= 5) {
        return NextResponse.json({ error: '登录尝试过多，请 5 分钟后再试' }, { status: 429 });
      }
      attempt.count++;
    } else {
      loginAttempts.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    }

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

    // 问题 43: 记录登录时间，用于后续校验 JWT 签发时间（强制单次登录机制）
    await db.query(
      `UPDATE users SET last_active_at = NOW(), last_login_at = NOW() WHERE id = $1`, 
      [user.id]
    );

    const token = signToken(user.id);
    
    // 登录成功，重置该 IP 的计数
    loginAttempts.delete(ip);

    return NextResponse.json({ token, user: { id: user.id, account } });
  } catch (error) {
    return handleError(error);
  }
}
