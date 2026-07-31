import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import prisma from 'app/db.server'
import { sendAppointmentEmails } from 'app/services/email.server.resend'

// 验证 Shopify Proxy 请求
function verifyProxyRequest(request: Request): boolean {
  const url = new URL(request.url)
  const signature = url.searchParams.get('signature')
  const timestamp = url.searchParams.get('timestamp')

  // 在生产环境中，应该验证 signature
  // 这里简化处理，实际应该使用 SHOPIFY_API_SECRET 验证
  if (!signature || !timestamp) {
    console.warn('Missing signature or timestamp in proxy request')
  }

  return true
}

// 添加 CORS 和 Proxy 响应头
function addProxyHeaders(headers: Headers) {
  headers.set('Content-Type', 'application/json')
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With')
  return headers
}

// GET - 查询预约列表
export async function loader({ request }: LoaderFunctionArgs) {
  if (!verifyProxyRequest(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
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

    const appointmentsWithProducts = appointments.map(apt => ({
      ...apt,
      products: apt.products ? JSON.parse(apt.products) : [],
    }))

    const headers = new Headers()
    addProxyHeaders(headers)

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
    const headers = new Headers()
    addProxyHeaders(headers)
    return Response.json({ error: '查询失败' }, { status: 500, headers })
  }
}

// POST - 创建预约
export async function action({ request }: ActionFunctionArgs) {
  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    const headers = new Headers()
    addProxyHeaders(headers)
    return new Response(null, { status: 204, headers })
  }

  if (request.method !== 'POST') {
    const headers = new Headers()
    addProxyHeaders(headers)
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers })
  }

  if (!verifyProxyRequest(request)) {
    const headers = new Headers()
    addProxyHeaders(headers)
    return Response.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  try {
    const body = await request.json()

    // 验证必填字段
    const required = ['customerName', 'customerEmail', 'dealerEmail', 'serviceType', 'appointmentDate']
    const missing = required.filter(f => !body[f])
    if (missing.length > 0) {
      const headers = new Headers()
      addProxyHeaders(headers)
      return Response.json({ error: `缺少字段: ${missing.join(', ')}` }, { status: 400, headers })
    }

    // 保存预约
    const appointment = await prisma.appointment.create({
      data: {
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone || null,
        dealerEmail: body.dealerEmail,
        storeName: body.storeName || null,
        storeAddress: body.storeAddress || null,
        // storeLat: body.storeLat != null ? Number(body.storeLat) : null,
        // storeLng: body.storeLng != null ? Number(body.storeLng) : null,
        serviceType: body.serviceType,
        appointmentDate: new Date(body.appointmentDate),
        // duration: parseInt(body.duration),
        notes: body.notes || null,
        products: body.products ? JSON.stringify(body.products) : null,
        status: 'pending',
      },
    })

    // 异步发送邮件
    sendAppointmentEmails(appointment).catch(console.error)

    const headers = new Headers()
    addProxyHeaders(headers)

    return Response.json({
      success: true,
      message: '预约创建成功',
      appointment: {
        ...appointment,
        products: appointment.products ? JSON.parse(appointment.products) : [],
      },
    }, { status: 201, headers })

  } catch (error) {
    console.error('创建预约失败:', error)
    const headers = new Headers()
    addProxyHeaders(headers)
    return Response.json({ error: '服务器错误' }, { status: 500, headers })
  }
}
