// 共享的 CORS 处理工具

// 允许的来源列表
const allowedOrigins: (string | RegExp)[] = [
  // 本地开发
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://www.aimatech.us',
  // Shopify 商店
  /\.myshopify\.com$/,
  // 隧道（本地测试）
  /\.ngrok\.io$/,
  /\.trycloudflare\.com$/,
]

// 添加 CORS 头部，根据请求 Origin 决定是否允许
export function addCorsHeaders(headers: Headers, origin?: string | null) {
  let matchedOrigin = ''

  if (origin) {
    const isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        return pattern === origin
      }
      return pattern.test(origin)
    })
    if (isAllowed) matchedOrigin = origin
  }

  if (matchedOrigin) {
    headers.set('Access-Control-Allow-Origin', matchedOrigin)
    headers.set('Access-Control-Allow-Credentials', 'true')
  } else if (!origin || origin === 'null') {
    // 允许无 origin 的请求（如 Postman 测试）
    headers.set('Access-Control-Allow-Origin', '*')
  } else {
    // 不设置 Allow-Origin，让浏览器拒绝（更安全）
    console.warn(`CORS: Origin ${origin} not allowed`)
  }

  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With, Authorization')
  headers.set('Access-Control-Expose-Headers', 'Content-Length, X-Requested-With')
  headers.set('Access-Control-Max-Age', '86400')

  return headers
}

// 构造 OPTIONS 预检响应
export function corsPreflightResponse(origin?: string | null) {
  const headers = new Headers()
  addCorsHeaders(headers, origin)
  return new Response(null, { status: 204, headers })
}
