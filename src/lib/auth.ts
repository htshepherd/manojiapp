import jwt, { JwtPayload } from 'jsonwebtoken'; // typed
import { db } from './db';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

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

// 问题 18 & 问题 B: 内存缓存，缓解高并发下对 users 表的 SELECT 压力
// 问题 B：改用完整 token 的哈希作为 key，防止碰撞；增加容量上限防止内存泄漏
const authCache = new Map<string, { userId: string, expiry: number }>();
const MAX_CACHE_SIZE = 5000;

export async function requireAuth(req: NextRequest): Promise<string> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) throw { status: 401, message: '未登录' };

  // 1. 尝试从缓存获取
  const cacheKey = createHash('sha256').update(token).digest('hex');
  const cached = authCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return cached.userId;
  }

  let payload: JwtPayload; // typed
  try {
    payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    // JWT 过期或无效
    throw { status: 401, message: 'Token 已过期或无效' };
  }

  // 2. 查库校验用户状态与最后活动时间
  const result = await db.query(
    `SELECT id, last_active_at, last_login_at FROM users WHERE id = $1`,
    [payload.user_id]
  );
  if (!result.rows[0]) throw { status: 401, message: '用户不存在' };

  const user = result.rows[0];

  // 问题 43: 校验 Token 签发时间是否早于最后登录时间
  // JWT iat 单位是秒，last_login_at 转换为 Date
  if (user.last_login_at && payload.iat) {
    const lastLoginSec = Math.floor(new Date(user.last_login_at).getTime() / 1000);
    if (payload.iat < lastLoginSec) {
        throw { status: 401, message: '会话已失效，请重新登录' };
    }
  }

  const lastActive = new Date(user.last_active_at);
  const diffMs = Date.now() - lastActive.getTime();

  // 如果超过 30 天未活动，强制重新登录（滑动窗口上限）
  if (diffMs > 30 * 24 * 60 * 60 * 1000) {
    throw { status: 401, message: '会话已过期，请重新登录' };
  }

  // 3. 性能优化：last_active_at 写回节流，15 分钟内只写一次
  if (diffMs > 15 * 60 * 1000) {
    await db.query(
      `UPDATE users SET last_active_at = NOW() WHERE id = $1`,
      [payload.user_id]
    );
  }

  // 4. 更新缓存
  if (authCache.size >= MAX_CACHE_SIZE) {
    authCache.clear(); // 简单 LRU 策略：超出直接清空，平衡内存安全性
  }
  authCache.set(cacheKey, { 
    userId: payload.user_id, 
    expiry: Date.now() + 15 * 60 * 1000 
  });

  return payload.user_id;
}
