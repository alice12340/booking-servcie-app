import { Resend } from 'resend'
import {
  appointmentConfirmUrl,
  appointmentRedeemUrl,
  getAppUrl,
  qrCodeImageUrl,
} from 'app/utils/app-url.server'

const resend = new Resend(process.env.RESEND_API_KEY)

function getLogoHtml() {
  const base = getAppUrl()
  return `<img src="${base}/AIMA_Logo.png" alt="AIMA" height="32" style="vertical-align: middle; margin-right: 10px; height: 32px; width: auto;" />`
}

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
 * Format products list for email display
 */
function formatProductsForEmail(products: any[]) {
  if (!products || products.length === 0) return { html: '', totalAmount: 0 }

  const itemsHtml = products
    .map((p: any) => {
      const name = p.name || p.productName || p.model || 'Product'
      const quantity = p.quantity || 1
      return quantity > 1 ? `${name} x ${quantity}` : name
    })
    .join(', ')

  return {
    html: `<span class="info-label">Model:</span> ${itemsHtml}`,
    totalAmount: 0,
  }
}

/**
 * Format date for email display
 */
function formatAppointmentDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Format store information for email
 */
function formatStoreInfo(appointment: any) {
  if (!appointment.storeName && !appointment.storeAddress) return ''

  const destination = appointment.storeAddress || appointment.storeName || ''

  const navUrl = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : ''

  const navButton = navUrl
    ? `<div style="margin-top: 16px;">
         <a href="${navUrl}" target="_blank" rel="noopener" style="display: inline-block; padding: 10px 20px; background-color: #212322; color: #ffffff; text-decoration: none; border-radius: 30px; font-size: 13px; font-weight: 500;">
           📍 Get Directions
         </a>
       </div>`
    : ''

  return `
    <div style="background-color: #f8f8f8; padding: 16px 20px; border-radius: 12px; margin: 16px 0; border-left: 3px solid #212322;">
      <h3 style="color: #212322; font-size: 15px; margin: 0 0 12px 0;">🏪 Store Information</h3>
      ${appointment.storeName ? `<div><span class="info-label">Store Name:</span>${appointment.storeName}</div>` : ''}
      ${appointment.storeAddress ? `<div><span class="info-label">Store Address:</span>${appointment.storeAddress}</div>` : ''}
      ${navButton}
    </div>
  `
}

/**
 * Send appointment confirmation emails to customer and dealer
 */
export async function sendAppointmentEmails(appointment: any) {
  const products = parseProducts(appointment.products)
  const { html: productsHtml } = formatProductsForEmail(products)

  const formattedDate = formatAppointmentDate(appointment.appointmentDate)
  const storeInfoHtml = formatStoreInfo(appointment)
  const logoHtml = getLogoHtml()

  const confirmUrl = appointmentConfirmUrl(appointment.id)
  const qrUrl = qrCodeImageUrl(confirmUrl, 200)

  // Customer Email HTML
  const customerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Appointment Confirmation</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          color: #333333;
          margin: 0;
          padding: 20px;
          background-color: #e8e8e8;
        }
        .container {
          max-width: 560px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #212322;
          padding: 28px 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          color: #ffffff !important;
        }
        .content {
          padding: 28px 24px;
          border: 1px solid #ddd;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          background-color: #fff;
        }
        .section {
          background-color: #f8f8f8;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 20px;
        }
        .section-title {
          color: #212322;
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e0e0e0;
        }
        .info-row {
          margin: 8px 0;
          font-size: 14px;
        }
        .info-label {
          color: #212322;
          font-weight: 600;
          display: inline-block;
          min-width: 100px;
        }
        .confirm-box {
          background-color: #f0f7f0;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin: 24px 0 16px;
        }
        .confirm-btn {
          display: inline-block;
          padding: 12px 28px;
          background-color: #212322;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 40px;
          font-weight: 600;
          font-size: 14px;
          margin: 12px 0 8px;
        }
        .footer {
          background-color: #fafafa;
          padding: 20px 24px;
          text-align: center;
          font-size: 11px;
          color: #999999;
          border-top: 1px solid #eeeeee;
        }
        .brand {
          color: #212322;
          font-weight: 600;
        }
        hr {
          border: none;
          border-top: 1px solid #e0e0e0;
          margin: 16px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${logoHtml} Appointment Confirmed</h1>
        </div>
        <div class="content">
          <p style="margin-top: 0; font-size: 15px;">Dear <strong style="color: #212322;">${appointment.customerName}</strong>,</p>
          <p style="font-size: 14px;">Thank you for choosing our service. Your appointment has been successfully booked.</p>

          <div class="section">
            <div class="section-title">📅 Appointment Details</div>
            <div class="info-row"><span class="info-label">ID:</span> ${appointment.id}</div>
            <div class="info-row"><span class="info-label">Service:</span> ${appointment.serviceType}</div>
            ${productsHtml ? `<div class="info-row">${productsHtml}</div>` : ''}
            <div class="info-row"><span class="info-label">Date & Time:</span> ${formattedDate}</div>
            ${appointment.notes ? `<div class="info-row"><span class="info-label">Notes:</span> ${appointment.notes.replace(/\n/g, '<br>')}</div>` : ''}
          </div>

          ${storeInfoHtml}

          <div class="confirm-box">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 500;">Show this QR code at the dealer store</p>
            <p style="margin: 0 0 12px 0; font-size: 12px; color: #666;">The dealer will scan it, then tap Confirm Arrival.</p>
            <img src="${qrUrl}" alt="Check-in QR Code" width="200" height="200" style="display: block; margin: 0 auto 12px; border: 1px solid #e0e0e0; border-radius: 8px;" />
            <a href="${confirmUrl}" class="confirm-btn">Open Check-in Page</a>
            <p style="margin: 12px 0 0 0; font-size: 11px; color: #888;">Status updates only after the dealer submits Confirm Arrival.</p>
          </div>

          <p style="font-size: 14px; margin-bottom: 8px;">We look forward to serving you.</p>
          <p style="font-size: 14px; margin-top: 8px;">
            Best regards,<br>
            <strong class="brand">AIMA Ebike Team</strong>
          </p>
        </div>
        <div class="footer">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} AIMA Ebile Team | All rights reserved</p>
          <p style="margin: 5px 0 0 0;">This is an automated message, please do not reply directly.</p>
        </div>
      </div>
    </body>
    </html>
  `

  // Dealer Email HTML
  const dealerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>New Appointment Notification</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.5;
          color: #333333;
          margin: 0;
          padding: 20px;
          background-color: #e8e8e8;
        }
        .container {
          max-width: 560px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #212322;
          padding: 28px 24px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
          color: #ffffff;
        }
        .content {
          padding: 28px 24px;
          border: 1px solid #ddd;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          background-color: #fff;
        }
        .section {
          background-color: #f8f8f8;
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 20px;
        }
        .section-title {
          color: #212322;
          font-size: 15px;
          font-weight: 600;
          margin: 0 0 12px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e0e0e0;
        }
        .info-row {
          margin: 8px 0;
          font-size: 14px;
        }
        .info-label {
          color: #212322;
          font-weight: 600;
          display: inline-block;
          min-width: 100px;
        }
        .badge {
          display: inline-block;
          background-color: #e8e8e8;
          color: #212322;
          padding: 2px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-family: monospace;
        }
        .footer {
          background-color: #fafafa;
          padding: 20px 24px;
          text-align: center;
          font-size: 11px;
          color: #999999;
          border-top: 1px solid #eeeeee;
        }
        .brand {
          color: #212322;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${logoHtml} New Appointment Request</h1>
        </div>
        <div class="content">
          <p style="margin-top: 0; font-size: 14px;">Hello,</p>
          <p style="font-size: 14px;">You have received a new appointment request. Please review and process it.</p>
          
          <div class="section">
            <div class="section-title">👤 Customer Information</div>
            <div class="info-row"><span class="info-label">Name:</span> ${appointment.customerName}</div>
            <div class="info-row"><span class="info-label">Email:</span> ${appointment.customerEmail}</div>
            <div class="info-row"><span class="info-label">Phone:</span> ${appointment.customerPhone || 'Not provided'}</div>
          </div>
          
          <div class="section">
            <div class="section-title">📅 Appointment Details</div>
            <div class="info-row"><span class="info-label">ID:</span> <span class="badge">${appointment.id}</span></div>
            <div class="info-row"><span class="info-label">Service:</span> ${appointment.serviceType}</div>
            ${productsHtml ? `<div class="info-row">${productsHtml}</div>` : ''}
            <div class="info-row"><span class="info-label">Date & Time:</span> ${formattedDate}</div>
            ${appointment.notes ? `<div class="info-row"><span class="info-label">Notes:</span> ${appointment.notes.replace(/\n/g, '<br>')}</div>` : ''}
          </div>
          
          ${
            appointment.storeName
              ? `
          <div class="section">
            <div class="section-title">🏪 Store</div>
            <div class="info-row"><span class="info-label">Store Name:</span> ${appointment.storeName}</div>
          </div>
          `
              : ''
          }
          <div class="section" style="text-align: center;">
            <div class="section-title">Dealer Check-in</div>
            <p style="font-size: 13px; margin-bottom: 12px;">Scan the customer's QR or open this link, then tap Confirm Arrival.</p>
            <a href="${confirmUrl}" style="display: inline-block; padding: 10px 20px; background: #212322; color: #fff; text-decoration: none; border-radius: 30px; font-size: 13px;">Open Check-in Page</a>
          </div>
        </div>
        <div class="footer">
          <p style="margin: 0;">This is an automated message from <span class="brand">AIMA Ebike Team.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const results = { customer: false, dealer: false }

  // Send to customer
  try {
    const customerResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: appointment.customerEmail,
      subject: `Appointment Confirmation - ${appointment.serviceType}`,
      html: customerHtml,
    })

    if (!customerResult.error) {
      results.customer = true
      console.log(`Customer email sent successfully: ${appointment.customerEmail}`)
    } else {
      console.error(`Failed to send customer email: ${customerResult.error.message}`)
    }
  } catch (error) {
    console.error('Error sending customer email:', error)
  }

  // Send to dealer
  try {
    const dealerResult = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: appointment.dealerEmail,
      subject: `New Appointment - ${appointment.customerName} - ${appointment.serviceType}`,
      html: dealerHtml,
    })

    if (!dealerResult.error) {
      results.dealer = true
      console.log(`Dealer email sent successfully: ${appointment.dealerEmail}`)
    } else {
      console.error(`Failed to send dealer email: ${dealerResult.error.message}`)
    }
  } catch (error) {
    console.error('Error sending dealer email:', error)
  }

  return results
}

/**
 * Placeholder Starbucks voucher follow-up after Test Ride completed
 */
export async function sendTestRideVoucherEmail(appointment: any) {
  const redeemUrl = appointmentRedeemUrl(appointment.id)
  const logoHtml = getLogoHtml()
  const formattedDate = formatAppointmentDate(appointment.appointmentDate)

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Test Ride Complete — Voucher</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #e8e8e8; padding: 20px; color: #333;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden;">
        <div style="background: #212322; padding: 28px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 22px; color: #fff;">${logoHtml} Test Ride Complete</h1>
        </div>
        <div style="padding: 28px 24px;">
          <p style="font-size: 15px;">Dear <strong>${appointment.customerName}</strong>,</p>
          <p style="font-size: 14px;">Thank you for completing your Test Ride${appointment.storeName ? ` at ${appointment.storeName}` : ''}. We hope you enjoyed the experience.</p>
          <p style="font-size: 14px;">Appointment: <strong>${formattedDate}</strong></p>
          <div style="margin: 24px 0; padding: 20px; border: 2px dashed #00704a; border-radius: 12px; background: #f3faf6; text-align: center;">
            <h2 style="margin: 0 0 8px; color: #00704a; font-size: 18px;">Starbucks Voucher</h2>
            <p style="margin: 0 0 16px; font-size: 13px; color: #555;">Placeholder — real voucher codes will be added soon. Tap below to claim/redeem and record your redemption.</p>
            <a href="${redeemUrl}" style="display: inline-block; padding: 12px 28px; background: #00704a; color: #fff; text-decoration: none; border-radius: 40px; font-weight: 600; font-size: 14px;">Claim / Redeem Voucher</a>
          </div>
          <p style="font-size: 14px;">Best regards,<br><strong>AIMA Ebike Team</strong></p>
        </div>
      </div>
    </body>
    </html>
  `

  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: appointment.customerEmail,
      subject: 'Thanks for your Test Ride — Starbucks Voucher Inside',
      html,
    })

    if (result.error) {
      console.error(`Failed to send voucher email: ${result.error.message}`)
      return { success: false, error: result.error }
    }

    console.log(`Voucher email sent: ${appointment.customerEmail}`)
    return { success: true, data: result.data }
  } catch (error) {
    console.error('Error sending voucher email:', error)
    return { success: false, error }
  }
}

/**
 * Send simple plain text email
 */
export async function sendSimpleEmail(to: string, subject: string, text: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to,
      subject,
      text,
    })

    if (error) {
      console.error('Email sending failed:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Email sending error:', error)
    return { success: false, error }
  }
}
