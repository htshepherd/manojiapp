import { NextResponse } from 'next/server';

interface AppError {
  status?: number;
  message?: string;
}

/**
 * 统一 API 错误处理
 * 生产环境下对非预期错误进行脱敏，避免泄露数据库或系统细节
 */
export function handleError(err: unknown) { // typed
  const error = err as AppError; // typed
  const status = error.status || 500; // typed
  const isProd = process.env.NODE_ENV === 'production';

  // 已知的业务逻辑错误（401, 403, 404, 400）可以返回原始信息
  if (status < 500) {
    return NextResponse.json({ error: error.message || '请求错误' }, { status }); // typed
  }

  // 记录详细堆栈到服务器日志（外部不可见）
  console.error('[API ERROR]', err);

  // 生产环境隐藏 500 错误的系统细节
  const message = isProd ? '系统繁忙，请稍后重试' : `Internal Server Error: ${error.message || 'Unknown'}`; // typed
  
  return NextResponse.json({ error: message }, { status });
}

export function handleSuccess(data: unknown, status = 200) { // typed
  return NextResponse.json(data, { status });
}
