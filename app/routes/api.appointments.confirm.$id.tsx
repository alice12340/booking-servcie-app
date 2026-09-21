import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import prisma from 'app/db.server'
import { sendTestRideVoucherEmail } from 'app/services/email.server.resend'

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'Booked'
    case 'confirmed':
    case 'arrived':
      return 'Arrived'
    case 'completed':
      return 'Test Ride Completed'
    case 'voucher_issued':
      return 'Voucher Issued'
    case 'voucher_redeemed':
      return 'Voucher Redeemed'
    default:
      return status
  }
}

function canArrive(status: string) {
  return status === 'pending'
}

function canComplete(status: string) {
  return status === 'arrived' || status === 'confirmed'
}

function pageShell(title: string, body: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      min-height: 100vh;
      background: #f0f0f0;
      padding: 20px;
      color: #333;
    }
    .card {
      max-width: 480px;
      margin: 0 auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .header {
      background: #212322;
      color: #fff;
      padding: 24px 20px;
      text-align: center;
    }
    .header h1 { font-size: 20px; font-weight: 600; }
    .content { padding: 24px 20px; }
    .badge {
      display: inline-block;
      background: #e8e8e8;
      color: #212322;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .row { margin: 10px 0; font-size: 14px; line-height: 1.5; }
    .label { font-weight: 600; color: #212322; display: inline-block; min-width: 110px; }
    .actions { margin-top: 24px; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 20px;
      border: none;
      border-radius: 40px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      background: #212322;
      color: #fff;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-secondary { background: #4b5563; margin-top: 10px; }
    .note { margin-top: 16px; font-size: 12px; color: #888; text-align: center; }
    .error { color: #b91c1c; margin-bottom: 12px; font-size: 14px; }
    .success { color: #15803d; margin-bottom: 12px; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    ${body}
  </div>
</body>
</html>`
}

function renderDealerPage(
  appointment: {
    id: string
    customerName: string
    customerEmail: string
    customerPhone: string | null
    serviceType: string
    storeName: string | null
    storeAddress: string | null
    appointmentDate: Date
    status: string
    arrivedAt: Date | null
    completedAt: Date | null
    products: string | null
    notes: string | null
  },
  options?: { message?: string; error?: string }
) {
  const showArrive = canArrive(appointment.status)
  const showComplete = canComplete(appointment.status)
  const done =
    appointment.status === 'completed' ||
    appointment.status === 'voucher_issued' ||
    appointment.status === 'voucher_redeemed'

  let actionHtml = ''
  if (showArrive) {
    actionHtml = `
      <form method="POST" class="actions">
        <input type="hidden" name="action" value="arrive" />
        <button type="submit" class="btn">Confirm Arrival</button>
      </form>
      <p class="note">Tap only when the customer has arrived at the store.</p>`
  } else if (showComplete) {
    actionHtml = `
      <form method="POST" class="actions">
        <input type="hidden" name="action" value="complete" />
        <button type="submit" class="btn">Mark Test Ride Completed</button>
      </form>
      <p class="note">This will email the customer a voucher follow-up.</p>`
  } else if (done) {
    actionHtml = `<p class="note">This appointment funnel step is complete. Status: ${statusLabel(appointment.status)}</p>`
  }

  return pageShell(
    'Dealer Check-in',
    `
    <div class="header"><h1>Dealer Check-in</h1></div>
    <div class="content">
      ${options?.error ? `<p class="error">${options.error}</p>` : ''}
      ${options?.message ? `<p class="success">${options.message}</p>` : ''}
      <div class="badge">${statusLabel(appointment.status)}</div>
      <div class="row"><span class="label">ID:</span> ${appointment.id}</div>
      <div class="row"><span class="label">Customer:</span> ${appointment.customerName}</div>
      <div class="row"><span class="label">Email:</span> ${appointment.customerEmail}</div>
      <div class="row"><span class="label">Phone:</span> ${appointment.customerPhone || '—'}</div>
      <div class="row"><span class="label">Service:</span> ${appointment.serviceType}</div>
      <div class="row"><span class="label">Products:</span> ${appointment.products || '—'}</div>
      <div class="row"><span class="label">Store:</span> ${appointment.storeName || '—'}</div>
      <div class="row"><span class="label">Address:</span> ${appointment.storeAddress || '—'}</div>
      <div class="row"><span class="label">Booked for:</span> ${formatDate(appointment.appointmentDate)}</div>
      <div class="row"><span class="label">Arrived:</span> ${formatDate(appointment.arrivedAt)}</div>
      <div class="row"><span class="label">Completed:</span> ${formatDate(appointment.completedAt)}</div>
      ${appointment.notes ? `<div class="row"><span class="label">Notes:</span> ${appointment.notes.replace(/\n/g, '<br>')}</div>` : ''}
      ${actionHtml}
    </div>`
  )
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params
  if (!id) {
    return htmlResponse(
      pageShell(
        'Invalid Request',
        `<div class="header"><h1>Invalid Request</h1></div><div class="content"><p>Appointment link is missing.</p></div>`
      ),
      400
    )
  }

  const appointment = await prisma.appointment.findUnique({ where: { id } })
  if (!appointment) {
    return htmlResponse(
      pageShell(
        'Not Found',
        `<div class="header"><h1>Not Found</h1></div><div class="content"><p>Appointment not found.</p></div>`
      ),
      404
    )
  }

  return htmlResponse(renderDealerPage(appointment))
}

export async function action({ params, request }: ActionFunctionArgs) {
  const { id } = params
  if (!id) {
    return htmlResponse(
      pageShell(
        'Invalid Request',
        `<div class="header"><h1>Invalid Request</h1></div><div class="content"><p>Appointment link is missing.</p></div>`
      ),
      400
    )
  }

  const form = await request.formData()
  const formAction = String(form.get('action') || '')

  const appointment = await prisma.appointment.findUnique({ where: { id } })
  if (!appointment) {
    return htmlResponse(
      pageShell(
        'Not Found',
        `<div class="header"><h1>Not Found</h1></div><div class="content"><p>Appointment not found.</p></div>`
      ),
      404
    )
  }

  if (formAction === 'arrive') {
    if (!canArrive(appointment.status)) {
      return htmlResponse(
        renderDealerPage(appointment, { error: 'Arrival can only be confirmed from Booked status.' })
      )
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'arrived',
        arrivedAt: new Date(),
      },
    })
    console.log(`Appointment ${id} marked arrived`)
    return htmlResponse(
      renderDealerPage(updated, { message: 'Arrival confirmed. You can mark the test ride completed next.' })
    )
  }

  if (formAction === 'complete') {
    if (!canComplete(appointment.status)) {
      return htmlResponse(
        renderDealerPage(appointment, { error: 'Test ride can only be completed after arrival.' })
      )
    }

    const now = new Date()
    let updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: now,
        // Legacy confirmed → ensure arrivedAt exists
        arrivedAt: appointment.arrivedAt || now,
      },
    })

    const emailResult = await sendTestRideVoucherEmail(updated)
    if (emailResult.success) {
      updated = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'voucher_issued',
          voucherIssuedAt: new Date(),
        },
      })
      console.log(`Appointment ${id} completed; voucher email issued`)
      return htmlResponse(
        renderDealerPage(updated, {
          message: 'Test ride completed. Voucher follow-up email sent to the customer.',
        })
      )
    }

    console.error(`Appointment ${id} completed but voucher email failed`, emailResult.error)
    return htmlResponse(
      renderDealerPage(updated, {
        message: 'Test ride completed.',
        error: 'Voucher email failed to send. Status left as completed — retry later or contact support.',
      })
    )
  }

  return htmlResponse(renderDealerPage(appointment, { error: 'Unknown action.' }), 400)
}
