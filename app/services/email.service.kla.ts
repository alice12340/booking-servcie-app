// email.service.ts - Klaviyo 版本

const KLAVIYO_API_KEY = process.env.KLAVIYO_PRIVATE_API_KEY
const KLAVIYO_REVISION = "2024-02-15"

/**
 * Parse products data - supports string, array, or JSON string formats
 */
function parseProducts(products: any) {
  if (!products) return []
  
  if (Array.isArray(products)) return products
  
  if (typeof products === 'string') {
    try {
      const parsed = JSON.parse(products)
      if (Array.isArray(parsed)) return parsed
      if (typeof parsed === 'string') {
        return [{ name: parsed, quantity: 1 }]
      }
      if (typeof parsed === 'object') {
        return [parsed]
      }
      return []
    } catch {
      return [{ name: products, quantity: 1 }]
    }
  }
  
  if (typeof products === 'object') {
    return [products]
  }
  
  return []
}

/**
 * Format products list for Klaviyo event properties
 */
function formatProductsForKlaviyo(products: any[]) {
  if (!products || products.length === 0) return ''
  
  const productNames = products.map((p: any) => {
    const name = p.name || p.productName || p.model || 'Product'
    const quantity = p.quantity || 1
    return quantity > 1 ? `${name} x ${quantity}` : name
  })
  
  return productNames.join(', ')
}

/**
 * Send event to Klaviyo to trigger email flows
 */
async function sendKlaviyoEvent(eventName: string, profileEmail: string, properties: Record<string, any>) {
  // 1. 创建/更新 Profile（可选，Klaviyo 会在收到事件时自动创建）
  try {
    await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        'revision': KLAVIYO_REVISION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email: profileEmail,
          },
        },
      }),
    })
  } catch (err) {
    // Profile 创建失败不影响事件发送
    console.error('Profile creation error:', err)
  }

  // 2. 发送 Event
  const payload = {
    data: {
      type: "event",
      attributes: {
        properties: properties,
        profile: {
          data: {
            type: "profile",
            attributes: {
        email: profileEmail,
        properties: {
          // 添加这两个字段
          email_consent: 'subscribed',
          sms_consent: 'subscribed'
        }
      }
            // 添加唯一标识
            // id: `customer_${properties.id || Date.now()}`
          }
        },
        metric: {
          data: {
            type: "metric",
            attributes: {
              name: eventName
            }
          }
        }
      }
    }
  };

  console.log('Sending to Klaviyo:', JSON.stringify(payload, null, 2))

  const response = await fetch('https://a.klaviyo.com/api/events/', {
    method: 'POST',
    headers: {
      'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
      'revision': KLAVIYO_REVISION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  // ⚠️ 关键修改：处理响应
  if (!response.ok) {
    // 错误时才有错误文本
    const errorText = await response.text()
    console.error(`Klaviyo event failed (${response.status}):`, errorText)
    return { success: false, error: errorText, status: response.status }
  }

  // ✅ 成功时 Klaviyo 返回 202 Accepted，且响应体为空
  // 所以不要尝试解析 JSON，直接返回成功
  console.log(`Klaviyo event sent successfully: ${eventName} -> ${profileEmail}`)
  return { success: true, status: response.status }
}
/**
 * Send appointment notifications via Klaviyo
 * 
 * 需要在 Klaviyo 后台创建两个 Flow：
 * 1. "Appointment Confirmation" - 触发条件：Metric = Appointment_Booked_Customer
 * 2. "New Appointment Notification" - 触发条件：Metric = Appointment_Booked_Dealer
 */
export async function sendAppointmentEmails(appointment: any) {
  // Parse product data
  const products = parseProducts(appointment.products)
  const productDisplay = formatProductsForKlaviyo(products)
  
  const formattedDate = new Date(appointment.appointmentDate).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  // 公共属性
  const baseProperties = {
    id: appointment.id,
    customerName: appointment.customerName,
    customerPhone: appointment.customerPhone || '',
    serviceType: appointment.serviceType,
    products: productDisplay,
    appointmentDate: appointment.appointmentDate,
    formattedDate: formattedDate,
    notes: appointment.notes || '',
    storeName: appointment.storeName || '',
    storeAddress: appointment.storeAddress || '',
    // storeLat: appointment.storeLat || '',
    // storeLng: appointment.storeLng || '',
    confirmUrl: `${process.env.APP_URL}/api/appointments/confirm/${appointment.id}`,
  }

  const results = { customer: false, dealer: false }

  // 发送给客户 - 触发确认邮件
  try {
    const customerResult = await sendKlaviyoEvent(
      'Appointment_Booked_Customer',
      appointment.customerEmail,
      {
        ...baseProperties,
        recipientType: 'customer',
      }
    )
    results.customer = customerResult.success
  } catch (error) {
    console.error('Error sending customer event:', error)
  }

  // 发送给经销商 - 触发通知邮件
  if (appointment.dealerEmail) {
    try {
      const dealerResult = await sendKlaviyoEvent(
        'Appointment_Booked_Dealer',
        appointment.dealerEmail,
        {
          ...baseProperties,
          recipientType: 'dealer',
          customerEmail: appointment.customerEmail,
        }
      )
      results.dealer = dealerResult.success
    } catch (error) {
      console.error('Error sending dealer event:', error)
    }
  }

  return results
}

/**
 * 可选：如果还需要简单文本邮件功能，保留 Resend 或改用 Klaviyo
 * 但 Klaviyo 不太适合纯文本邮件，建议保留 Resend 做这个
 */
export async function sendSimpleEmail(to: string, subject: string, text: string) {
  // 方案1：继续用 Resend（推荐）
  // 方案2：用 Klaviyo 发（需要提前配置模板）
  console.warn('sendSimpleEmail not implemented for Klaviyo, use Resend instead')
  return { success: false, error: 'Not implemented' }
}