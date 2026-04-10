import { NextResponse } from 'next/server';

/**
 * 统一 API 错误处理
 * 生产环境下对非预期错误进行脱敏，避免泄露数据库或系统细节
 */
export function handleError(err: any) {
  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  // 已知的业务逻辑错误（401, 403, 404, 400）可以返回原始信息
  if (status < 500) {
    return NextResponse.json({ error: err.message || '请求错误' }, { status });
  }

  // 记录详细堆栈到服务器日志（外部不可见）
  console.error('[API ERROR]', err);

  // 生产环境隐藏 500 错误的系统细节
  const message = isProd ? '系统繁忙，请稍后重试' : `Internal Server Error: ${err.message}`;
  
  return NextResponse.json({ error: message }, { status });
}

export function handleSuccess(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
