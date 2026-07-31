import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import prisma from 'app/db.server'
import { sendAppointmentEmails } from 'app/services/email.server.resend'
// import { sendAppointmentEmails } from 'app/services/email.service.kla'

// 添加 CORS 头部（优化版）
function addCorsHeaders(headers: Headers, origin?: string | null) {
  // 允许的来源列表
  const allowedOrigins = [
    // 本地开发
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'https://www.aimatech.us',
    // Shopify 商店
    /\.myshopify\.com$/,
    // ngrok 隧道（本地测试）
    /\.ngrok\.io$/,
  ]
  
  let isAllowed = false
  let matchedOrigin = ''
  
  if (origin) {
    // 检查 origin 是否在允许列表中
    isAllowed = allowedOrigins.some(pattern => {
      if (typeof pattern === 'string') {
        if (pattern === origin) {
          matchedOrigin = origin
          return true
        }
        return false
      }
      if (pattern.test(origin)) {
        matchedOrigin = origin
        return true
      }
      return false
    })
  }
  
  // 设置 CORS 头
  if (isAllowed && matchedOrigin) {
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

// GET - 查询预约列表
export async function loader({ request }: LoaderFunctionArgs) {
  const origin = request.headers.get('Origin')
  
  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    const headers = new Headers()
    addCorsHeaders(headers, origin)
    return new Response(null, { status: 204, headers })
  }
  
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '10')
  const skip = (page - 1) * limit
  
  const where: any = {}
  
  const status = url.searchParams.get('status')
  if (status) where.status = status
  
  const customerEmail = url.searchParams.get('customerEmail')
  if (customerEmail) where.customerEmail = { contains: customerEmail }
  
  const dealerEmail = url.searchParams.get('dealerEmail')
  if (dealerEmail) where.dealerEmail = { contains: dealerEmail }
  
  const storeName = url.searchParams.get('storeName')
  if (storeName) where.storeName = { contains: storeName }

  const storeId = url.searchParams.get('storeId')
  if (storeId) where.storeId = storeId
  
  try {
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { appointmentDate: 'desc' },
      }),
      prisma.appointment.count({ where }),
    ])
    
    // 解析 products JSON（如果是字符串则解析，否则保持原样）
    const appointmentsWithProducts = appointments.map(apt => ({
      ...apt,
      products: apt.products ? (typeof apt.products === 'string' ? JSON.parse(apt.products) : apt.products) : [],
    }))

    const headers = new Headers()
    addCorsHeaders(headers, origin)

    return Response.json({
      success: true,
      data: appointmentsWithProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }, { headers })
  } catch (error) {
    console.error('GET Error:', error)
    const headers = new Headers()
    addCorsHeaders(headers, origin)
    return Response.json({ error: '查询失败' }, { status: 500, headers })
  }
}

// POST - 创建预约
export async function action({ request }: ActionFunctionArgs) {
  const origin = request.headers.get('Origin')
  
  // 添加请求日志（调试用）
  console.log('Request received:', {
    method: request.method,
    origin,
    url: request.url,
  })

  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request')
    const headers = new Headers()
    addCorsHeaders(headers, origin)
    return new Response(null, { status: 204, headers })
  }

  if (request.method !== 'POST') {
    const headers = new Headers()
    addCorsHeaders(headers, origin)
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers })
  }
  
  try {
    const body = await request.json()
    console.log('Request body:', body)
    
    // 验证必填字段
    const required = ['customerName', 'customerEmail', 'dealerEmail', 'serviceType', 'appointmentDate', 'duration']
    const missing = required.filter(f => !body[f])
    if (missing.length > 0) {
      const headers = new Headers()
      addCorsHeaders(headers, origin)
      return Response.json({ 
        success: false,
        error: `缺少字段: ${missing.join(', ')}` 
      }, { status: 400, headers })
    }
    
    // 直接保存 products，保持原始格式
    let productsToSave = body.products
    // 如果 products 是对象或数组，转换为 JSON 字符串存储
    if (typeof body.products === 'object' && body.products !== null) {
      productsToSave = JSON.stringify(body.products)
    }
    // 如果 products 是其他类型（字符串、数字等），直接保存为字符串
    else if (body.products !== undefined && body.products !== null) {
      productsToSave = String(body.products)
    }
    
   
    // 保存预约
    const appointment = await prisma.appointment.create({
      data: {
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone || null,
        dealerEmail: body.dealerEmail,
        storeId: body.storeId != null ? String(body.storeId) : null,
        storeName: body.storeName || null,
        storeAddress: body.storeAddress || null,
        // storeLat: body.storeLat != null ? Number(body.storeLat) : null,
        // storeLng: body.storeLng != null ? Number(body.storeLng) : null,
        serviceType: body.serviceType,
        appointmentDate: new Date(body.appointmentDate),
        duration: parseInt(body.duration),
        notes: body.notes,
        products: productsToSave, // 直接保存原始格式
        status: 'pending',
      },
    })
    
    console.log('Appointment created:', {
      id: appointment.id,
      storeName: appointment.storeName,
      products: appointment.products
    })
    
    // 异步发送邮件
    sendAppointmentEmails(appointment).catch(error => {
      console.error('Email sending failed:', error)
    })

    const headers = new Headers()
    addCorsHeaders(headers, origin)

    // 返回时保持 products 的原始格式
    let productsInResponse = appointment.products
    try {
      // 尝试解析为 JSON，如果成功则返回对象，否则返回原始字符串
      productsInResponse = JSON.parse(appointment.products)
    } catch {
      // 不是 JSON 格式，保持原样
      productsInResponse = appointment.products
    }

    return Response.json({
      success: true,
      message: '预约创建成功',
      appointment: {
        ...appointment,
        products: productsInResponse,
      },
    }, { status: 201, headers })

  } catch (error) {
    console.error('创建预约失败:', error)
    const headers = new Headers()
    addCorsHeaders(headers, origin)
    return Response.json({ 
      success: false,
      error: '服务器错误: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500, headers })
  }
}