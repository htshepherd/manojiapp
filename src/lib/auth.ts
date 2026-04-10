import jwt from 'jsonwebtoken';
import { db } from './db';
import { NextRequest } from 'next/server';

export function signToken(userId: string): string {
  return jwt.sign({ user_id: userId }, process.env.JWT_SECRET!, {
    expiresIn: `${process.env.JWT_EXPIRES_DAYS}d`
  });
}

export async function requireAuth(req: NextRequest): Promise<string> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw { status: 401, message: '未登录' };

  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    throw { status: 401, message: 'Token 无效或已过期' };
  }

  const result = await db.query(
    `SELECT last_active_at FROM users WHERE id = $1`,
    [payload.user_id]
  );
  if (!result.rows[0]) throw { status: 401, message: '用户不存在' };

  const lastActive = new Date(result.rows[0].last_active_at);
  const diffDays = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 30) throw { status: 401, message: 'Token 已过期，请重新登录' };

  await db.query(
    `UPDATE users SET last_active_at = NOW() WHERE id = $1`,
    [payload.user_id]
  );

  return payload.user_id;
}
