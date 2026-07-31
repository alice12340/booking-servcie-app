import type { LoaderFunctionArgs } from 'react-router'
import prisma from 'app/db.server'
import { addCorsHeaders, corsPreflightResponse } from 'app/utils/cors.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = request.headers.get('Origin')

  // 处理 OPTIONS 预检请求
  if (request.method === 'OPTIONS') {
    return corsPreflightResponse(origin)
  }

  const url = new URL(request.url)
  const locationId = url.searchParams.get('locationId')
  const dateString = url.searchParams.get('date')

  const headers = new Headers()
  addCorsHeaders(headers, origin)

  if (!locationId || !dateString) {
    return Response.json(
      { success: false, error: 'locationId and date are required' },
      { status: 400, headers }
    )
  }

  // 北京时间 UTC+8
  const BEIJING_OFFSET = 8
  
  // 将前端传来的日期（北京时间）转换为 UTC 时间范围用于查询
  const dayStartUTC = new Date(`${dateString}T00:00:00`)
  dayStartUTC.setHours(dayStartUTC.getHours() - BEIJING_OFFSET)
  
  const dayEndUTC = new Date(`${dateString}T23:59:59`)
  dayEndUTC.setHours(dayEndUTC.getHours() - BEIJING_OFFSET)

  const appointments = await prisma.appointment.findMany({
    where: {
      storeId: locationId,
      appointmentDate: { gte: dayStartUTC, lte: dayEndUTC },
      status: { not: 'cancelled' },
    },
    select: { appointmentDate: true },
  })

  // 将数据库中的时间转换为北京时间，并格式化为 12小时制 AM/PM
  const bookedSlots = appointments.map(apt => {
    // 数据库存储的是 UTC 时间，需要转换为北京时间
    const beijingTime = new Date(apt.appointmentDate.getTime() + BEIJING_OFFSET * 60 * 60 * 1000)
    
    // 格式化为 12小时制带 AM/PM
    let hours = beijingTime.getUTCHours()
    const minutes = beijingTime.getUTCMinutes()
    const ampm = hours >= 12 ? 'PM' : 'AM'
    
    // 转换为 12小时制
    hours = hours % 12
    hours = hours ? hours : 12 // 0 点显示为 12
    
    // 格式分钟为两位数
    const minutesStr = minutes.toString().padStart(2, '0')
    
    return `${hours}:${minutesStr} ${ampm}`
  })

  return Response.json({ success: true, bookedSlots }, { headers })
}