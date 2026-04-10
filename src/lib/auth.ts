import jwt from 'jsonwebtoken';
import { db } from './db';
import { NextRequest } from 'next/server';

// ─── 启动时校验关键环境变量 ────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error('[auth] 缺少必要环境变量：JWT_SECRET');
}
if (JWT_SECRET.length < 32) {
  throw new Error('[auth] JWT_SECRET 长度不足 32 位，存在安全风险，请检查配置');
}

export function signToken(userId: string): string {
  // 缩短 JWT 有效期至 7 天，配合数据库 last_active_at 实现滑动会话
  return jwt.sign({ user_id: userId }, JWT_SECRET, {
    expiresIn: '7d'
  });
}

export async function requireAuth(req: NextRequest): Promise<string> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw { status: 401, message: '未登录' };

  let payload: any;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err: any) {
    // JWT 过期或无效
    throw { status: 401, message: 'Token 已过期或无效' };
  }

  // 查库校验用户状态与最后活动时间（滑动同步）
  const result = await db.query(
    `SELECT last_active_at FROM users WHERE id = $1`,
    [payload.user_id]
  );
  if (!result.rows[0]) throw { status: 401, message: '用户不存在' };

  const lastActive = new Date(result.rows[0].last_active_at);
  const diffMs = Date.now() - lastActive.getTime();

  // 如果超过 30 天未活动，强制重新登录（滑动窗口上限）
  if (diffMs > 30 * 24 * 60 * 60 * 1000) {
    throw { status: 401, message: '会话已过期，请重新登录' };
  }

  // 性能优化：last_active_at 写回节流，15 分钟内只写一次
  if (diffMs > 15 * 60 * 1000) {
    await db.query(
      `UPDATE users SET last_active_at = NOW() WHERE id = $1`,
      [payload.user_id]
    );
  }

  return payload.user_id;
}
