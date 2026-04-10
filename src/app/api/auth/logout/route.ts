import { NextResponse } from 'next/server';

export async function POST() {
  // 无状态 JWT，前端清除 token 即可
  return NextResponse.json({ success: true });
}
